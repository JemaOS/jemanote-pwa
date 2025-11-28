import { useState, useEffect } from 'react'
import { LocalStorage } from '@/lib/localStorage'
import { supabase } from '@/lib/supabase'
import { Note } from '@/types'
import { extractWikiLinks } from '@/lib/wikiLinks'

export function useLocalNotes(userId?: string | null) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncEnabled, setSyncEnabled] = useState(false)

  // Load notes from local storage on mount
  useEffect(() => {
    const loadLocalNotes = async () => {
      try {
        setLoading(true)
        const localNotes = await LocalStorage.getNotes()
        setNotes(localNotes)
      } catch (error) {
        console.error('Error loading local notes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLocalNotes()
  }, [])

  // Sync with Supabase if user is logged in
  useEffect(() => {
    if (!userId || !syncEnabled) return

    const syncWithCloud = async () => {
      try {
        setSyncing(true)
        
        // Get cloud notes
        const { data: cloudNotes, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)

        if (error) throw error

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
        
        for (const note of localOnlyNotes) {
          await supabase.from('notes').insert({
            ...note,
            user_id: userId,
          })
        }
      } catch (error) {
        console.error('Sync error:', error)
      } finally {
        setSyncing(false)
      }
    }

    syncWithCloud()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
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
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
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

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const existingNote = notes.find((n) => n.id === noteId)
      if (!existingNote) throw new Error('Note not found')

      const updatedNote = {
        ...existingNote,
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Save to local storage
      await LocalStorage.saveNote(updatedNote)
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? updatedNote : note))
      )

      // Extract and update wiki links
      if (updates.content !== undefined) {
        const linkedTitles = extractWikiLinks(updatedNote.content)
        await LocalStorage.updateLinksForNote(noteId, linkedTitles)
      }

      // Sync to cloud if user is logged in
      if (userId && syncEnabled) {
        await supabase.from('notes').update(updates).eq('id', noteId)
      }

      return { data: updatedNote, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      const note = notes.find((n) => n.id === noteId)
      if (!note) return { error: new Error('Note not found') }

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
      if (!note) return { error: new Error('Note not found') }

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

  const enableSync = () => setSyncEnabled(true)
  const disableSync = () => setSyncEnabled(false)

  return {
    notes: notes.filter(n => !n.deleted_at),
    loading,
    syncing,
    syncEnabled,
    createNote,
    updateNote,
    deleteNote,
    restoreNote,
    permanentlyDeleteNote,
    trashNotes: notes.filter(n => n.deleted_at),
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
