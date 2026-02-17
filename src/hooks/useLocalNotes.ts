// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import React, { useState, useEffect } from 'react'

import { LocalStorage } from '@/lib/localStorage'
import { supabase } from '@/lib/supabase'
import { extractWikiLinks } from '@/lib/wikiLinks'
import { Note, Folder } from '@/types'

// Helper: find items that exist locally but not in cloud
function findLocalOnlyItems<T extends { id: string }>(localItems: T[], cloudItems: T[] | null): T[] {
  return localItems.filter(local => !cloudItems?.some(cloud => cloud.id === local.id))
}

// Helper functions extracted to reduce nesting depth
async function uploadLocalNotes(localOnlyNotes: Note[], userId: string) {
  for (const note of localOnlyNotes) {
    await supabase.from('notes').insert({
      ...note,
      user_id: userId,
    })
  }
}

async function uploadLocalFolders(localOnlyFolders: Folder[], userId: string) {
  for (const folder of localOnlyFolders) {
    await supabase.from('folders').insert({
      ...folder,
      user_id: userId,
    })
  }
}

// Helper: find items that exist in both local and cloud but have been modified locally (e.g., soft-deleted)
function findLocallyModifiedItems<T extends { id: string; updated_at: string }>(
  localItems: T[],
  cloudItems: T[] | null
): T[] {
  return localItems.filter(local => {
    const cloudItem = cloudItems?.find(cloud => cloud.id === local.id)
    if (!cloudItem) {return false}
    const localTime = new Date(local.updated_at).getTime()
    const cloudTime = new Date(cloudItem.updated_at).getTime()
    return localTime > cloudTime
  })
}

async function syncModifiedNotes(modifiedNotes: Note[], userId: string) {
  for (const note of modifiedNotes) {
    await supabase.from('notes').update(note).eq('id', note.id)
  }
}

async function syncModifiedFolders(modifiedFolders: Folder[], userId: string) {
  for (const folder of modifiedFolders) {
    await supabase.from('folders').update(folder).eq('id', folder.id)
  }
}

async function handleNoteRealtimeEvent(
  payload: { eventType: string; new: any; old: any },
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>
) {
  if (payload.eventType === 'INSERT') {
    const newNote = payload.new as Note
    setNotes((prev) => [newNote, ...prev])
    await LocalStorage.saveNote(newNote)
  } else if (payload.eventType === 'UPDATE') {
    const updatedNote = payload.new as Note
    setNotes((prev) =>
      prev.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    )
    await LocalStorage.saveNote(updatedNote)
  } else if (payload.eventType === 'DELETE') {
    const deletedId = payload.old.id
    setNotes((prev) => prev.filter((note) => note.id !== deletedId))
    await LocalStorage.deleteNote(deletedId)
  }
}

async function handleFolderRealtimeEvent(
  payload: { eventType: string; new: any; old: any },
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>
) {
  if (payload.eventType === 'INSERT') {
    const newFolder = payload.new as Folder
    setFolders((prev) => [newFolder, ...prev])
    await LocalStorage.saveFolder(newFolder)
  } else if (payload.eventType === 'UPDATE') {
    const updatedFolder = payload.new as Folder
    setFolders((prev) =>
      prev.map((folder) => (folder.id === updatedFolder.id ? updatedFolder : folder))
    )
    await LocalStorage.saveFolder(updatedFolder)
  } else if (payload.eventType === 'DELETE') {
    const deletedId = payload.old.id
    setFolders((prev) => prev.filter((folder) => folder.id !== deletedId))
    await LocalStorage.deleteFolder(deletedId)
  }
}

export function useLocalNotes(userId?: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(false)

  // Load notes and folders from local storage on mount
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        setLoading(true)
        const [localNotes, localFolders] = await Promise.all([
          LocalStorage.getNotes(),
          LocalStorage.getFolders()
        ])
        setNotes(localNotes)
        setFolders(localFolders)
      } catch (error) {
        console.error('Error loading local data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLocalData()
  }, [])

  // Sync with Supabase if user is logged in
  useEffect(() => {
    if (!userId || !syncEnabled) {return}

    const syncWithCloud = async () => {
      try {
        setSyncing(true)

        // Get cloud notes (without deleted_at filter - column may not exist)
        const { data: cloudNotes, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)

        if (error) {throw error}

        // Get cloud folders (without deleted_at filter - column may not exist)
        const { data: cloudFolders, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', userId)

        if (foldersError) {throw foldersError}

        // Merge local and cloud notes (cloud takes precedence for conflicts)
        const localNotes = await LocalStorage.getNotes()
        const mergedNotes = mergeNotes(localNotes, cloudNotes || [], userId)
        
        setNotes(mergedNotes)
        
        // Save all merged notes to local storage
        for (const note of mergedNotes) {
          await LocalStorage.saveNote(note)
        }
        
        // Upload local notes that don't exist in cloud
        const localOnlyNotes = findLocalOnlyItems(localNotes, cloudNotes)
        await uploadLocalNotes(localOnlyNotes, userId)

        // Sync locally modified notes (e.g., soft-deleted notes) to cloud
        const modifiedNotes = findLocallyModifiedItems(localNotes, cloudNotes)
        await syncModifiedNotes(modifiedNotes, userId)

        // Merge local and cloud folders (cloud takes precedence for conflicts)
        const localFolders = await LocalStorage.getFolders()
        const mergedFolders = mergeFolders(localFolders, cloudFolders || [], userId)

        setFolders(mergedFolders)

        // Save all merged folders to local storage
        for (const folder of mergedFolders) {
          await LocalStorage.saveFolder(folder)
        }

        // Upload local folders that don't exist in cloud
        const localOnlyFolders = findLocalOnlyItems(localFolders, cloudFolders)
        await uploadLocalFolders(localOnlyFolders, userId)

        // Sync locally modified folders (e.g., soft-deleted folders) to cloud
        const modifiedFolders = findLocallyModifiedItems(localFolders, cloudFolders)
        await syncModifiedFolders(modifiedFolders, userId)
      } catch (error) {
        console.error('Sync error:', error)
      } finally {
        setSyncing(false)
      }
    }

    syncWithCloud()

    // Subscribe to realtime changes for notes
    const notesChannel = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => { await handleNoteRealtimeEvent(payload, setNotes) }
      )
      .subscribe()

    // Subscribe to realtime changes for folders
    const foldersChannel = supabase
      .channel('folders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => { await handleFolderRealtimeEvent(payload, setFolders) }
      )
      .subscribe()

    return () => {
      notesChannel.unsubscribe()
      foldersChannel.unsubscribe()
    }
  }, [userId, syncEnabled])

  const createNote = async (title: string, content: string = '', folderId?: string) => {
    try {
      const newNote: Note = {
        id: crypto.randomUUID(),
        user_id: userId || 'local',
        title,
        content,
        folder_id: folderId,
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Save to local storage
      await LocalStorage.saveNote(newNote)
      setNotes((prev) => [newNote, ...prev])

      // Sync to cloud if user is logged in
      if (userId && syncEnabled) {
        await supabase.from('notes').insert(newNote)
      }

      return { data: newNote, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  const updateNote = async (noteId: string, updates: Partial<Note>): Promise<{ data: Note | null; error: Error | null }> => {
    const existingNote = notes.find((n) => n.id === noteId)
    if (!existingNote) {
      return { data: null, error: new Error('Note not found') }
    }

    const updatedNote = {
      ...existingNote,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // Update state IMMEDIATELY (synchronous) - this is what makes it feel instant
    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? updatedNote : note))
    )

    // INSTANT SAVE: Use synchronous localStorage save for immediate persistence
    // This ensures data survives even if browser closes immediately after typing
    LocalStorage.saveNoteSync(updatedNote)

    // Fire-and-forget: extract and update wiki links in background
    if (updates.content !== undefined) {
      const linkedTitles = extractWikiLinks(updatedNote.content)
      LocalStorage.updateLinksForNote(noteId, linkedTitles).catch((err) => {
        console.error('Error updating wiki links:', err)
      })
    }

    // Fire-and-forget: sync to cloud if user is logged in
    if (userId && syncEnabled) {
      supabase.from('notes').update(updates).eq('id', noteId).then(({ error }) => {
        if (error) {console.error('Error syncing note to cloud:', error)}
      })
    }

    return { data: updatedNote, error: null }
  }

  const deleteNote = async (noteId: string) => {
    try {
      const note = notes.find((n) => n.id === noteId)
      if (!note) {return { error: new Error('Note not found') }}

      const deletedAt = new Date().toISOString()
      const updates = { deleted_at: deletedAt, updated_at: deletedAt }
      const updatedNote = { ...note, ...updates }

      // Update in local storage (soft delete)
      await LocalStorage.saveNote(updatedNote)
      
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? updatedNote : n))
      )

      // Sync to cloud if user is logged in
      if (userId && syncEnabled) {
        await supabase.from('notes').update(updates).eq('id', noteId)
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const restoreNote = async (noteId: string) => {
    try {
      const note = notes.find((n) => n.id === noteId)
      if (!note) {return { error: new Error('Note not found') }}

      const updates = { deleted_at: null }
      const updatedNote = { ...note, ...updates, updated_at: new Date().toISOString() }

      // Update in local storage
      await LocalStorage.saveNote(updatedNote)
      
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? updatedNote : n))
      )

      // Sync to cloud if user is logged in
      if (userId && syncEnabled) {
        await supabase.from('notes').update(updates).eq('id', noteId)
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const permanentlyDeleteNote = async (noteId: string) => {
    try {
      // Delete from local storage
      await LocalStorage.deleteNote(noteId)
      setNotes((prev) => prev.filter((note) => note.id !== noteId))

      // Sync to cloud if user is logged in
      if (userId && syncEnabled) {
        await supabase.from('notes').delete().eq('id', noteId)
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Folder operations
  const deleteFolder = async (folderId: string) => {
    try {
      const folder = folders.find((f) => f.id === folderId)
      if (!folder) {return { error: new Error('Folder not found') }}

      const deletedAt = new Date().toISOString()
      const updates = { deleted_at: deletedAt, updated_at: deletedAt }
      
      // Soft delete the folder
      const updatedFolder: Folder = {
        ...folder,
        deleted_at: deletedAt,
        updated_at: deletedAt
      }
      await LocalStorage.saveFolder(updatedFolder)
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? updatedFolder : f))
      )

      // Sync folder deletion to cloud if user is logged in
      if (userId && syncEnabled) {
        await supabase.from('folders').update(updates).eq('id', folderId)
      }

      // Soft delete all notes in this folder
      const notesInFolder = notes.filter((n) => n.folder_id === folderId && !n.deleted_at)
      for (const note of notesInFolder) {
        const updatedNote = {
          ...note,
          deleted_at: deletedAt,
          updated_at: deletedAt
        }
        await LocalStorage.saveNote(updatedNote)
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? updatedNote : n))
        )

        // Sync note deletion to cloud if user is logged in
        if (userId && syncEnabled) {
          await supabase.from('notes').update(updates).eq('id', note.id)
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const restoreFolder = async (folderId: string) => {
    try {
      const folder = folders.find((f) => f.id === folderId)
      if (!folder) {return { error: new Error('Folder not found') }}

      const updatedAt = new Date().toISOString()
      
      // Restore the folder
      const updatedFolder: Folder = {
        ...folder,
        deleted_at: null,
        updated_at: updatedAt
      }
      await LocalStorage.saveFolder(updatedFolder)
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? updatedFolder : f))
      )

      // Restore all notes that were in this folder (notes with this folder_id that are deleted)
      const deletedNotesInFolder = notes.filter(
        (n) => n.folder_id === folderId && n.deleted_at
      )
      for (const note of deletedNotesInFolder) {
        const updatedNote = {
          ...note,
          deleted_at: null,
          updated_at: updatedAt
        }
        await LocalStorage.saveNote(updatedNote)
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? updatedNote : n))
        )
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const permanentlyDeleteFolder = async (folderId: string) => {
    try {
      // Permanently delete all notes in this folder first
      const notesInFolder = notes.filter((n) => n.folder_id === folderId)
      for (const note of notesInFolder) {
        await LocalStorage.deleteNote(note.id)

        // Sync note deletion to cloud if user is logged in
        if (userId && syncEnabled) {
          await supabase.from('notes').delete().eq('id', note.id)
        }
      }
      setNotes((prev) => prev.filter((n) => n.folder_id !== folderId))

      // Delete the folder
      await LocalStorage.deleteFolder(folderId)
      setFolders((prev) => prev.filter((f) => f.id !== folderId))

      // Sync folder deletion to cloud if user is logged in
      if (userId && syncEnabled) {
        await supabase.from('folders').delete().eq('id', folderId)
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const reloadFolders = async () => {
    try {
      const localFolders = await LocalStorage.getFolders()
      setFolders(localFolders)
    } catch (error) {
      console.error('Error reloading folders:', error)
    }
  }

  const enableSync = () => { setSyncEnabled(true); }
  const disableSync = () => { setSyncEnabled(false); }

  return {
    notes: notes.filter(n => !n.deleted_at),
    folders: folders.filter(f => !f.deleted_at),
    allNotes: notes, // Inclut les notes supprimées pour la synchronisation Canvas/Timeline
    allFolders: folders, // Inclut les dossiers supprimés
    loading,
    syncing,
    syncEnabled,
    createNote,
    updateNote,
    deleteNote,
    restoreNote,
    permanentlyDeleteNote,
    deleteFolder,
    restoreFolder,
    permanentlyDeleteFolder,
    reloadFolders,
    trashNotes: notes.filter(n => n.deleted_at),
    trashFolders: folders.filter(f => f.deleted_at),
    enableSync,
    disableSync,
  }
}

// Helper function to merge local and cloud notes
function mergeNotes(localNotes: Note[], cloudNotes: Note[], userId: string): Note[] {
  const merged = new Map<string, Note>()

  // Add all cloud notes to the map
  for (const cloudNote of cloudNotes) {
    merged.set(cloudNote.id, { ...cloudNote, user_id: userId })
  }

  // Merge with local notes, respecting timestamps and deletions
  for (const localNote of localNotes) {
    const cloudNote = merged.get(localNote.id)
    const localTime = new Date(localNote.updated_at).getTime()
    const cloudTime = cloudNote ? new Date(cloudNote.updated_at).getTime() : 0

    if (cloudNote && localTime <= cloudTime) {
      // Cloud is newer or same, keep cloud version (already in map)
      continue
    }
    // Local note doesn't exist in cloud or is newer - add it (includes deletions)
    merged.set(localNote.id, { ...localNote, user_id: userId })
  }

  // Convert map to array and sort by updated_at
  // Note: We include soft-deleted notes so cloud deletions are synced locally
  // The UI will filter them out using notes.filter(n => !n.deleted_at)
  return Array.from(merged.values())
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

// Helper function to merge local and cloud folders
function mergeFolders(localFolders: Folder[], cloudFolders: Folder[], userId: string): Folder[] {
  const merged = new Map<string, Folder>()

  // Add all cloud folders to the map
  for (const cloudFolder of cloudFolders) {
    merged.set(cloudFolder.id, { ...cloudFolder, user_id: userId })
  }

  // Merge with local folders, respecting timestamps and deletions
  for (const localFolder of localFolders) {
    const cloudFolder = merged.get(localFolder.id)
    const localTime = new Date(localFolder.updated_at).getTime()
    const cloudTime = cloudFolder ? new Date(cloudFolder.updated_at).getTime() : 0

    if (cloudFolder && localTime <= cloudTime) {
      // Cloud is newer or same, keep cloud version (already in map)
      continue
    }
    // Local folder doesn't exist in cloud or is newer - add it (includes deletions)
    merged.set(localFolder.id, { ...localFolder, user_id: userId })
  }

  // Convert map to array and sort by updated_at
  // Note: We include soft-deleted folders so cloud deletions are synced locally
  // The UI will filter them out using folders.filter(f => !f.deleted_at)
  return Array.from(merged.values())
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}
