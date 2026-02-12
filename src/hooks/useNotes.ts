// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import localforage from 'localforage'
import { useState, useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { Note } from '@/types'

const NOTES_STORAGE_KEY = 'obsidian_pwa_notes'

function handleNoteRealtimePayload(
  payload: { eventType: string; new: any; old: any },
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>
) {
  if (payload.eventType === 'INSERT') {
    setNotes((prev) => [payload.new as Note, ...prev])
  } else if (payload.eventType === 'UPDATE') {
    setNotes((prev) =>
      prev.map((note) => (note.id === payload.new.id ? (payload.new as Note) : note))
    )
  } else if (payload.eventType === 'DELETE') {
    setNotes((prev) => prev.filter((note) => note.id !== payload.old.id))
  }
}

export function useNotes(userId?: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load notes from local storage first (offline support)
  useEffect(() => {
    const loadLocalNotes = async () => {
      try {
        const cachedNotes = await localforage.getItem<Note[]>(NOTES_STORAGE_KEY)
        if (cachedNotes) {
          setNotes(cachedNotes)
        }
      } catch (err) {
        console.error('Error loading cached notes:', err)
      }
    }
    loadLocalNotes()
  }, [])

  // Fetch notes from Supabase
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchNotes = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })

        if (error) {throw error}

        setNotes(data || [])
        // Cache to local storage
        await localforage.setItem(NOTES_STORAGE_KEY, data || [])
      } catch (err) {
        setError(err as Error)
        console.error('Error fetching notes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotes()

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
        (payload) => { handleNoteRealtimePayload(payload, setNotes) }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId])

  const createNote = async (title: string, content: string = '', folderId?: string) => {
    if (!userId) {return { data: null, error: new Error('User not authenticated') }}

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title,
          content,
          folder_id: folderId,
        })
        .select()
        .single()

      if (error) {throw error}
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single()

      if (error) {throw error}
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId)

      if (error) {throw error}
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
  }
}
