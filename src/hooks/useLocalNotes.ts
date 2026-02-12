// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import React, { useState, useEffect } from 'react'

import { LocalStorage } from '@/lib/localStorage'
import { supabase } from '@/lib/supabase'
import { extractWikiLinks } from '@/lib/wikiLinks'
import { Note, Folder } from '@/types'

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
        
        // Get cloud notes
        const { data: cloudNotes, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)

        if (error) {throw error}

        // Get cloud folders
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
        const localOnlyNotes = localNotes.filter(
          (ln) => !cloudNotes?.some((cn) => cn.id === ln.id)
        )
        
        await uploadLocalNotes(localOnlyNotes, userId)

        // Merge local and cloud folders (cloud takes precedence for conflicts)
        const localFolders = await LocalStorage.getFolders()
        const mergedFolders = mergeFolders(localFolders, cloudFolders || [], userId)
        
        setFolders(mergedFolders)
        
        // Save all merged folders to local storage
        for (const folder of mergedFolders) {
          await LocalStorage.saveFolder(folder)
        }
        
        // Upload local folders that don't exist in cloud
        const localOnlyFolders = localFolders.filter(
          (lf) => !cloudFolders?.some((cf) => cf.id === lf.id)
        )
        
        await uploadLocalFolders(localOnlyFolders, userId)
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

      const updates = { deleted_at: new Date().toISOString() }
      const updatedNote = { ...note, ...updates, updated_at: new Date().toISOString() }

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
      }
      setNotes((prev) => prev.filter((n) => n.folder_id !== folderId))

      // Delete the folder
      await LocalStorage.deleteFolder(folderId)
      setFolders((prev) => prev.filter((f) => f.id !== folderId))

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
  const merged = [...cloudNotes]
  const cloudIds = new Set(cloudNotes.map((n) => n.id))

  // Add local notes that don't exist in cloud
  for (const localNote of localNotes) {
    if (!cloudIds.has(localNote.id)) {
      merged.push({ ...localNote, user_id: userId })
    }
  }

  return merged.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}

// Helper function to merge local and cloud folders
function mergeFolders(localFolders: Folder[], cloudFolders: Folder[], userId: string): Folder[] {
  const merged = [...cloudFolders]
  const cloudIds = new Set(cloudFolders.map((f) => f.id))

  // Add local folders that don't exist in cloud
  for (const localFolder of localFolders) {
    if (!cloudIds.has(localFolder.id)) {
      merged.push({ ...localFolder, user_id: userId })
    }
  }

  return merged.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}
