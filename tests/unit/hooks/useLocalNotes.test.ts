// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useLocalNotes } from '@/hooks/useLocalNotes'
import { LocalStorage } from '@/lib/localStorage'
import { supabase } from '@/lib/supabase'
import type { Note, Folder } from '@/types'

// Mock LocalStorage
vi.mock('@/lib/localStorage', () => ({
  LocalStorage: {
    getNotes: vi.fn(),
    getFolders: vi.fn(),
    saveNote: vi.fn(),
    saveNoteSync: vi.fn(),
    deleteNote: vi.fn(),
    saveFolder: vi.fn(),
    deleteFolder: vi.fn(),
    updateLinksForNote: vi.fn(),
  },
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  },
}))

// Mock wikiLinks
vi.mock('@/lib/wikiLinks', () => ({
  extractWikiLinks: vi.fn().mockReturnValue([]),
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-uuid-123'),
  },
})

describe('useLocalNotes', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      user_id: 'local',
      title: 'Local Note 1',
      content: 'Content 1',
      is_pinned: false,
      is_archived: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    },
    {
      id: 'note-2',
      user_id: 'local',
      title: 'Local Note 2',
      content: 'Content 2 with [[wiki link]]',
      folder_id: 'folder-1',
      is_pinned: true,
      is_archived: false,
      created_at: '2025-01-03T00:00:00Z',
      updated_at: '2025-01-04T00:00:00Z',
    },
  ]

  const mockFolders: Folder[] = [
    {
      id: 'folder-1',
      user_id: 'local',
      name: 'Test Folder',
      path: '/Test Folder',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
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
    then: vi.fn().mockImplementation((callback: any) => 
      Promise.resolve({ data: returnData, error }).then(callback)
    ),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(LocalStorage.getNotes).mockResolvedValue(mockNotes)
    vi.mocked(LocalStorage.getFolders).mockResolvedValue(mockFolders)
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial load', () => {
    it('should load notes and folders from local storage on mount', async () => {
      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(LocalStorage.getNotes).toHaveBeenCalled()
      expect(LocalStorage.getFolders).toHaveBeenCalled()
      expect(result.current.notes).toEqual(mockNotes)
      expect(result.current.folders).toEqual(mockFolders)
    })

    it('should filter out deleted notes and folders', async () => {
      const notesWithDeleted = [
        ...mockNotes,
        {
          id: 'note-deleted',
          user_id: 'local',
          title: 'Deleted Note',
          content: 'Deleted content',
          is_pinned: false,
          is_archived: false,
          deleted_at: '2025-01-05T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-05T00:00:00Z',
        },
      ]

      vi.mocked(LocalStorage.getNotes).mockResolvedValue(notesWithDeleted)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.notes).toHaveLength(2)
      expect(result.current.notes.find((n: Note) => n.id === 'note-deleted')).toBeUndefined()
      expect(result.current.trashNotes).toHaveLength(1)
      expect(result.current.trashNotes[0].id).toBe('note-deleted')
    })

    it('should handle errors when loading local data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(LocalStorage.getNotes).mockRejectedValue(new Error('Storage error'))
      vi.mocked(LocalStorage.getFolders).mockRejectedValue(new Error('Storage error'))

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(consoleSpy).toHaveBeenCalledWith('Error loading local data:', expect.any(Error))
      expect(result.current.notes).toEqual([])
      expect(result.current.folders).toEqual([])

      consoleSpy.mockRestore()
    })
  })

  describe('sync with cloud', () => {
    it('should not sync when userId is not provided', async () => {
      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should sync with cloud when userId and syncEnabled are set', async () => {
      const cloudNotes = [
        {
          id: 'cloud-note-1',
          user_id: 'user-123',
          title: 'Cloud Note',
          content: 'Cloud content',
          is_pinned: false,
          is_archived: false,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ]

      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(cloudNotes) as any)

      const { result } = renderHook(() => useLocalNotes('user-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Enable sync
      act(() => {
        result.current.enableSync()
      })

      await waitFor(() => {
        expect(result.current.syncing).toBe(true)
      })

      expect(supabase.from).toHaveBeenCalledWith('notes')
    })

    it('should merge local and cloud notes', async () => {
      const cloudNotes = [
        {
          id: 'cloud-note-1',
          user_id: 'user-123',
          title: 'Cloud Note',
          content: 'Cloud content',
          is_pinned: false,
          is_archived: false,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
      ]

      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder(cloudNotes) as any)

      const { result } = renderHook(() => useLocalNotes('user-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.enableSync()
      })

      await waitFor(() => {
        expect(LocalStorage.saveNote).toHaveBeenCalled()
      })
    })
  })

  describe('createNote', () => {
    it('should create a new note locally', async () => {
      vi.mocked(LocalStorage.saveNote).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.createNote('New Note', 'New content', 'folder-1')

      expect(response.error).toBeNull()
      expect(response.data).toMatchObject({
        id: 'mock-uuid-123',
        title: 'New Note',
        content: 'New content',
        folder_id: 'folder-1',
        user_id: 'local',
      })
      expect(LocalStorage.saveNote).toHaveBeenCalled()
    })

    it('should sync new note to cloud when user is logged in and sync enabled', async () => {
      vi.mocked(LocalStorage.saveNote).mockResolvedValue(undefined)
      vi.mocked(supabase.from).mockReturnValue(createMockQueryBuilder({}) as any)

      const { result } = renderHook(() => useLocalNotes('user-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.enableSync()
      })

      await result.current.createNote('New Note', 'New content')

      expect(supabase.from).toHaveBeenCalledWith('notes')
    })

    it('should handle errors when creating note', async () => {
      vi.mocked(LocalStorage.saveNote).mockRejectedValue(new Error('Storage full'))

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.createNote('New Note', 'New content')

      expect(response.error).toBeInstanceOf(Error)
    })
  })

  describe('updateNote', () => {
    it('should update note locally', async () => {
      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.updateNote('note-1', { title: 'Updated Title' })

      expect(response.error).toBeNull()
      expect(response.data?.title).toBe('Updated Title')
      expect(LocalStorage.saveNoteSync).toHaveBeenCalled()
    })

    it('should return error when note is not found', async () => {
      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.updateNote('non-existent-id', { title: 'Updated' })

      expect(response.error).toBeInstanceOf(Error)
      expect(response.error?.message).toBe('Note not found')
    })

    it('should extract wiki links when content is updated', async () => {
      const { extractWikiLinks } = await import('@/lib/wikiLinks')
      vi.mocked(extractWikiLinks).mockReturnValue(['wiki link'])
      
      // Mock updateLinksForNote to return a resolved promise
      vi.mocked(LocalStorage.updateLinksForNote).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await result.current.updateNote('note-2', { content: 'Updated with [[new link]]' })

      expect(extractWikiLinks).toHaveBeenCalled()
      expect(LocalStorage.updateLinksForNote).toHaveBeenCalledWith('note-2', ['wiki link'])
    })
  })

  describe('deleteNote', () => {
    it('should soft delete note', async () => {
      vi.mocked(LocalStorage.saveNote).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.deleteNote('note-1')

      expect(response.error).toBeNull()
      expect(LocalStorage.saveNote).toHaveBeenCalled()
      const savedNote = vi.mocked(LocalStorage.saveNote).mock.calls[0][0]
      expect(savedNote.deleted_at).toBeDefined()
    })

    it('should return error when note is not found', async () => {
      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.deleteNote('non-existent-id')

      expect(response.error).toBeInstanceOf(Error)
      expect(response.error?.message).toBe('Note not found')
    })
  })

  describe('restoreNote', () => {
    it('should restore a deleted note', async () => {
      const deletedNotes: Note[] = [
        {
          id: 'deleted-note',
          user_id: 'local',
          title: 'Deleted Note',
          content: 'Deleted content',
          is_pinned: false,
          is_archived: false,
          deleted_at: '2025-01-05T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-05T00:00:00Z',
        },
      ]

      vi.mocked(LocalStorage.getNotes).mockResolvedValue(deletedNotes)
      vi.mocked(LocalStorage.saveNote).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.restoreNote('deleted-note')

      expect(response.error).toBeNull()
      const savedNote = vi.mocked(LocalStorage.saveNote).mock.calls[0][0]
      expect(savedNote.deleted_at).toBeNull()
    })
  })

  describe('permanentlyDeleteNote', () => {
    it('should permanently delete a note', async () => {
      vi.mocked(LocalStorage.deleteNote).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.permanentlyDeleteNote('note-1')

      expect(response.error).toBeNull()
      expect(LocalStorage.deleteNote).toHaveBeenCalledWith('note-1')
    })
  })

  describe('folder operations', () => {
    it('should soft delete folder and its notes', async () => {
      vi.mocked(LocalStorage.saveFolder).mockResolvedValue(undefined)
      vi.mocked(LocalStorage.saveNote).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.deleteFolder('folder-1')

      expect(response.error).toBeNull()
      expect(LocalStorage.saveFolder).toHaveBeenCalled()
      expect(LocalStorage.saveNote).toHaveBeenCalled()
    })

    it('should restore folder and its notes', async () => {
      const deletedFolder: Folder = {
        id: 'folder-deleted',
        user_id: 'local',
        name: 'Deleted Folder',
        path: '/Deleted Folder',
        deleted_at: '2025-01-05T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z',
      }

      const notesInFolder: Note[] = [
        {
          id: 'note-in-folder',
          user_id: 'local',
          title: 'Note in Folder',
          content: 'Content',
          folder_id: 'folder-deleted',
          is_pinned: false,
          is_archived: false,
          deleted_at: '2025-01-05T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-05T00:00:00Z',
        },
      ]

      vi.mocked(LocalStorage.getFolders).mockResolvedValue([deletedFolder])
      vi.mocked(LocalStorage.getNotes).mockResolvedValue(notesInFolder)
      vi.mocked(LocalStorage.saveFolder).mockResolvedValue(undefined)
      vi.mocked(LocalStorage.saveNote).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.restoreFolder('folder-deleted')

      expect(response.error).toBeNull()
      expect(LocalStorage.saveFolder).toHaveBeenCalled()
      expect(LocalStorage.saveNote).toHaveBeenCalled()
    })

    it('should permanently delete folder and its notes', async () => {
      vi.mocked(LocalStorage.deleteNote).mockResolvedValue(undefined)
      vi.mocked(LocalStorage.deleteFolder).mockResolvedValue(undefined)

      const { result } = renderHook(() => useLocalNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const response = await result.current.permanentlyDeleteFolder('folder-1')

      expect(response.error).toBeNull()
      expect(LocalStorage.deleteNote).toHaveBeenCalledWith('note-2')
      expect(LocalStorage.deleteFolder).toHaveBeenCalledWith('folder-1')
    })
  })

  describe('sync controls', () => {
    it('should enable and disable sync', async () => {
      const { result } = renderHook(() => useLocalNotes('user-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.syncEnabled).toBe(false)

      act(() => {
        result.current.enableSync()
      })

      expect(result.current.syncEnabled).toBe(true)

      act(() => {
        result.current.disableSync()
      })

      expect(result.current.syncEnabled).toBe(false)
    })
  })

  describe('reloadFolders', () => {
    it('should reload folders from storage', async () => {
      const newFolders: Folder[] = [
        {
          id: 'new-folder',
          user_id: 'local',
          name: 'New Folder',
          path: '/New Folder',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ]

      // Reset mocks and set up sequential responses
      vi.mocked(LocalStorage.getFolders).mockReset()
      vi.mocked(LocalStorage.getFolders)
        .mockResolvedValueOnce(mockFolders)      // First call - initial load
        .mockResolvedValueOnce(newFolders)        // Second call - after reload

      const { result } = renderHook(() => useLocalNotes())

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Initial folders should be loaded
      expect(result.current.folders).toEqual(mockFolders)

      // Reload folders
      await act(async () => {
        await result.current.reloadFolders()
      })

      // After reload, folders should be updated
      await waitFor(() => {
        expect(result.current.folders).toEqual(newFolders)
      })
    })
  })
})
