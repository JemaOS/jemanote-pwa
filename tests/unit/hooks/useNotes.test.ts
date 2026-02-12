// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { renderHook, waitFor } from '@testing-library/react'
import localforage from 'localforage'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useNotes } from '@/hooks/useNotes'
import { supabase } from '@/lib/supabase'
import type { Note } from '@/types'


// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  },
}))

// Mock localforage
vi.mock('localforage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}))

describe('useNotes', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      user_id: 'user-1',
      title: 'Test Note 1',
      content: 'Content 1',
      is_pinned: true,
      is_archived: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    },
    {
      id: 'note-2',
      user_id: 'user-1',
      title: 'Test Note 2',
      content: 'Content 2',
      is_pinned: false,
      is_archived: false,
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-04T00:00:00Z',
    },
  ]

  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }

  const createMockQueryBuilder = (returnData: any = [], error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial load', () => {
    it('should load notes from local storage first', async () => {
      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder([]) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Notes should eventually be loaded from localStorage
      expect(localforage.getItem).toHaveBeenCalledWith('obsidian_pwa_notes')
    })

    it('should fetch notes from Supabase when userId is provided', async () => {
      vi.mocked(localforage.getItem).mockResolvedValue(null)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(mockNotes) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(supabase.from).toHaveBeenCalledWith('notes')
      expect(result.current.notes).toEqual(mockNotes)
    })

    it('should not fetch from Supabase when userId is not provided', async () => {
      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)

      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(supabase.from).not.toHaveBeenCalled()
      expect(result.current.notes).toEqual(mockNotes)
    })

    it('should cache fetched notes to local storage', async () => {
      vi.mocked(localforage.getItem).mockResolvedValue(null)
      vi.mocked(localforage.setItem).mockResolvedValue(undefined)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(mockNotes) as any)

      renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(localforage.setItem).toHaveBeenCalledWith('obsidian_pwa_notes', mockNotes)
      })
    })
  })

  describe('realtime updates', () => {
    it('should subscribe to realtime changes when userId is provided', async () => {
      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(mockNotes) as any)

      renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith('notes_changes')
        expect(mockChannel.on).toHaveBeenCalled()
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })
    })

    it('should unsubscribe from channel on unmount', async () => {
      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(mockNotes) as any)

      const { unmount } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      unmount()

      expect(mockChannel.unsubscribe).toHaveBeenCalled()
    })

    it('should add new note on INSERT event', async () => {
      let realtimeCallback: Function | null = null
      
      mockChannel.on.mockImplementation((event: string, filter: any, callback: Function) => {
        if (event === 'postgres_changes') {
          realtimeCallback = callback
        }
        return mockChannel
      })

      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(mockNotes) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(2)
      })

      const newNote = {
        id: 'note-3',
        user_id: 'user-1',
        title: 'New Note',
        content: 'New content',
        is_pinned: false,
        is_archived: false,
        created_at: '2025-01-05T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z',
      }

      realtimeCallback?.({
        eventType: 'INSERT',
        new: newNote,
      })

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(3)
        expect(result.current.notes[0]).toEqual(newNote)
      })
    })

    it('should update note on UPDATE event', async () => {
      let realtimeCallback: Function | null = null
      
      mockChannel.on.mockImplementation((event: string, filter: any, callback: Function) => {
        if (event === 'postgres_changes') {
          realtimeCallback = callback
        }
        return mockChannel
      })

      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(mockNotes) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(2)
      })

      const updatedNote = {
        ...mockNotes[0],
        title: 'Updated Title',
        content: 'Updated content',
      }

      realtimeCallback?.({
        eventType: 'UPDATE',
        new: updatedNote,
      })

      await waitFor(() => {
        const note = result.current.notes.find(n => n.id === 'note-1')
        expect(note?.title).toBe('Updated Title')
        expect(note?.content).toBe('Updated content')
      })
    })

    it('should remove note on DELETE event', async () => {
      let realtimeCallback: Function | null = null
      
      mockChannel.on.mockImplementation((event: string, filter: any, callback: Function) => {
        if (event === 'postgres_changes') {
          realtimeCallback = callback
        }
        return mockChannel
      })

      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(mockNotes) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(2)
      })

      realtimeCallback?.({
        eventType: 'DELETE',
        old: { id: 'note-1' },
      })

      await waitFor(() => {
        expect(result.current.notes).toHaveLength(1)
        expect(result.current.notes.find(n => n.id === 'note-1')).toBeUndefined()
      })
    })
  })

  describe('createNote', () => {
    it('should create a new note successfully', async () => {
      const newNote = mockNotes[0]
      vi.mocked(localforage.getItem).mockResolvedValue([])
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(newNote) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.createNote('Test Note', 'Test content', 'folder-1')

      expect(response.error).toBeNull()
      expect(response.data).toEqual(newNote)
    })

    it('should return error when user is not authenticated', async () => {
      vi.mocked(localforage.getItem).mockResolvedValue([])

      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.createNote('Test Note', 'Test content')

      expect(response.error).toBeInstanceOf(Error)
      expect(response.error?.message).toBe('User not authenticated')
      expect(response.data).toBeNull()
    })

    it('should return error when Supabase insert fails', async () => {
      const mockError = new Error('Database error')
      vi.mocked(localforage.getItem).mockResolvedValue([])
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(null, mockError) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.createNote('Test Note', 'Test content')

      expect(response.error).toBeInstanceOf(Error)
    })
  })

  describe('updateNote', () => {
    it('should update a note successfully', async () => {
      const updatedNote = { ...mockNotes[0], title: 'Updated Title' }
      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder([updatedNote]) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.updateNote('note-1', { title: 'Updated Title' })

      expect(response.error).toBeNull()
      expect(response.data).toEqual([updatedNote])
    })

    it('should return error when update fails', async () => {
      const mockError = new Error('Update failed')
      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(null, mockError) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.updateNote('note-1', { title: 'Updated Title' })

      expect(response.error).toBeInstanceOf(Error)
    })
  })

  describe('deleteNote', () => {
    it('should delete a note successfully', async () => {
      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder({}) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.deleteNote('note-1')

      expect(response.error).toBeNull()
    })

    it('should return error when delete fails', async () => {
      const mockError = new Error('Delete failed')
      vi.mocked(localforage.getItem).mockResolvedValue(mockNotes)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(null, mockError) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.deleteNote('note-1')

      expect(response.error).toBeInstanceOf(Error)
    })
  })

  describe('error handling', () => {
    it('should handle localforage errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(localforage.getItem).mockRejectedValue(new Error('Storage error'))
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder([]) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(consoleSpy).toHaveBeenCalledWith('Error loading cached notes:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should handle Supabase fetch errors', async () => {
      const mockError = new Error('Network error')
      vi.mocked(localforage.getItem).mockResolvedValue(null)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(null, mockError) as any)

      const { result } = renderHook(() => useNotes('user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })
})
