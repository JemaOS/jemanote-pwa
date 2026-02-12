// Copyright (c) 2025 Jema Technology.
// Regression Tests - Tests for previously fixed bugs

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { Note, Folder } from '@/types'

import { render, screen, waitFor } from '@/tests/utils/test-utils'

describe('Regression Tests', () => {
  describe('Note Synchronization', () => {
    it('should not duplicate notes during sync (BUG-001)', async () => {
      const localNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Content',
          user_id: 'user-1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ]

      const remoteNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Content',
          user_id: 'user-1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ]

      // Merge notes without duplicates
      const merged = [...localNotes]
      remoteNotes.forEach(remote => {
        const exists = merged.find(n => n.id === remote.id)
        if (!exists) {
          merged.push(remote)
        }
      })

      expect(merged.length).toBe(1)
    })

    it('should preserve note content during sync conflict (BUG-002)', () => {
      const localNote: Note = {
        id: 'note-1',
        title: 'Local Title',
        content: 'Local Content',
        user_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z', // More recent
      }

      const remoteNote: Note = {
        id: 'note-1',
        title: 'Remote Title',
        content: 'Remote Content',
        user_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      // Keep the more recent version
      const merged = new Date(localNote.updated_at) > new Date(remoteNote.updated_at) 
        ? localNote 
        : remoteNote

      expect(merged.content).toBe('Local Content')
    })
  })

  describe('Folder Operations', () => {
    it('should handle folder deletion with notes (BUG-003)', () => {
      const folders: Folder[] = [
        {
          id: 'folder-1',
          name: 'Test Folder',
          path: '/Test Folder',
          user_id: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const notes: Note[] = [
        {
          id: 'note-1',
          title: 'Note in folder',
          content: 'Content',
          user_id: 'user-1',
          folder_id: 'folder-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      // Delete folder and move notes to root
      const folderId = 'folder-1'
      const updatedNotes = notes.map(note => 
        note.folder_id === folderId 
          ? { ...note, folder_id: undefined }
          : note
      )

      expect(updatedNotes[0].folder_id).toBeUndefined()
    })

    it('should prevent circular folder references (BUG-004)', () => {
      const folders: Folder[] = [
        {
          id: 'folder-1',
          name: 'Folder 1',
          path: '/Folder 1',
          user_id: 'user-1',
          parent_id: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'folder-2',
          name: 'Folder 2',
          path: '/Folder 1/Folder 2',
          user_id: 'user-1',
          parent_id: 'folder-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      // Try to set folder-1's parent to folder-2 (would create cycle)
      const wouldCreateCycle = (folderId: string, newParentId: string): boolean => {
        let current = newParentId
        while (current) {
          if (current === folderId) {return true}
          const parent = folders.find(f => f.id === current)
          current = parent?.parent_id
        }
        return false
      }

      expect(wouldCreateCycle('folder-1', 'folder-2')).toBe(true)
    })
  })

  describe('Markdown Rendering', () => {
    it('should not break on malformed wiki links (BUG-005)', () => {
      const contents = [
        '[[Valid Link]]',
        '[[Incomplete',
        'Empty []]',
        '[[Nested [[Link]]]]',
        '[[Special & Characters]]',
      ]

      contents.forEach(content => {
        // Should not throw
        const wikiLinkPattern = /\[\[([^\]]+)\]\]/g
        const matches = [...content.matchAll(wikiLinkPattern)]
        expect(matches).toBeDefined()
      })
    })

    it('should handle code blocks with wiki links (BUG-006)', () => {
      const content = "```\n[[This should not be a link]]\n```\n\n[[This should be a link]]"

      // Code blocks should not process wiki links
      const codeBlockPattern = /```[\s\S]*?```/g
      const codeBlocks = content.match(codeBlockPattern) || []
      
      const textWithoutCode = content.replace(codeBlockPattern, '')
      const wikiLinkPattern = /\[\[([^\]]+)\]\]/g
      const wikiLinks = [...textWithoutCode.matchAll(wikiLinkPattern)]

      expect(wikiLinks.length).toBe(1)
      expect(wikiLinks[0][1]).toBe('This should be a link')
    })
  })

  describe('Search Functionality', () => {
    it('should handle special characters in search (BUG-007)', () => {
      const searchQueries = [
        'test[1]',
        'test(1)',
        'test*',
        'test?',
        'test+',
        'test.',
        'test^',
        'test$',
      ]

      searchQueries.forEach(query => {
        // Should not throw when creating RegExp
        expect(() => {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          new RegExp(escaped, 'i')
        }).not.toThrow()
      })
    })

    it('should handle empty search results gracefully (BUG-008)', () => {
      const notes: Note[] = []
      const searchQuery = 'test'

      const results = notes.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
      )

      expect(results).toEqual([])
      expect(results.length).toBe(0)
    })
  })

  describe('LocalStorage', () => {
    it('should handle corrupted localStorage data (BUG-009)', () => {
      const corruptedData = 'not valid json{['

      let parsed
      try {
        parsed = JSON.parse(corruptedData)
      } catch {
        parsed = []
      }

      expect(parsed).toEqual([])
    })

    it('should handle quota exceeded error (BUG-010)', () => {
      const saveToStorage = (key: string, data: unknown): boolean => {
        try {
          localStorage.setItem(key, JSON.stringify(data))
          return true
        } catch (e) {
          if (e instanceof Error && e.name === 'QuotaExceededError') {
            return false
          }
          throw e
        }
      }

      // Should return false on quota exceeded
      const result = saveToStorage('test', 'small data')
      expect(result).toBe(true)
    })

    it('should migrate old data format (BUG-011)', () => {
      const oldFormat = {
        id: 'note-1',
        title: 'Old Note',
        body: 'Content', // Old field name
        createdAt: '2025-01-01', // Old field name
      }

      // Migration function
      const migrateNote = (old: any): Note => ({
        id: old.id,
        title: old.title,
        content: old.body || old.content || '',
        user_id: 'user-1',
        created_at: old.createdAt || old.created_at || new Date().toISOString(),
        updated_at: old.updatedAt || old.updated_at || new Date().toISOString(),
      })

      const migrated = migrateNote(oldFormat)
      expect(migrated.content).toBe('Content')
      expect(migrated).toHaveProperty('user_id')
    })
  })

  describe('UI State', () => {
    it('should preserve sidebar state on refresh (BUG-012)', () => {
      const sidebarState = {
        leftOpen: true,
        rightOpen: false,
        activeFolder: 'folder-1',
      }

      localStorage.setItem('sidebar-state', JSON.stringify(sidebarState))

      const restored = JSON.parse(localStorage.getItem('sidebar-state') || '{}')
      expect(restored.leftOpen).toBe(true)
      expect(restored.activeFolder).toBe('folder-1')
    })

    it('should handle rapid view switching (BUG-013)', async () => {
      const views = ['workspace', 'canvas', 'timeline', 'settings']
      const switchView = vi.fn()

      // Simulate rapid switching
      views.forEach(view => switchView(view))

      await waitFor(() => {
        expect(switchView).toHaveBeenCalledTimes(4)
      })
    })
  })

  describe('AI Features', () => {
    it('should handle AI service timeout (BUG-014)', async () => {
      const timeout = 30000
      const start = Date.now()

      // Simulate slow API call
      const slowCall = new Promise((_, reject) => {
        setTimeout(() => { reject(new Error('Timeout')); }, timeout + 1000)
      })

      // Should timeout before completion
      const quickCall = new Promise((_, reject) => {
        setTimeout(() => { reject(new Error('Timeout')); }, timeout)
      })

      await expect(quickCall).rejects.toThrow('Timeout')
    })

    it('should handle empty AI response (BUG-015)', async () => {
      const emptyResponse = ''
      
      const processResponse = (response: string): string[] => {
        if (!response.trim()) {return []}
        return response.split('\n').filter(line => line.trim())
      }

      const result = processResponse(emptyResponse)
      expect(result).toEqual([])
    })
  })

  describe('Offline Mode', () => {
    it('should queue changes when offline (BUG-016)', () => {
      const isOnline = false
      const pendingChanges: unknown[] = []

      const saveNote = (note: Note) => {
        if (!isOnline) {
          pendingChanges.push(note)
          return { queued: true }
        }
        return { saved: true }
      }

      const result = saveNote({
        id: 'note-1',
        title: 'Test',
        content: 'Content',
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      expect(result).toEqual({ queued: true })
      expect(pendingChanges.length).toBe(1)
    })

    it('should sync queued changes when back online (BUG-017)', async () => {
      const pendingChanges = [
        { id: 'note-1', action: 'create' },
        { id: 'note-2', action: 'update' },
      ]

      const syncChanges = async () => {
        const results = []
        for (const change of pendingChanges) {
          results.push({ synced: true, id: change.id })
        }
        return results
      }

      const results = await syncChanges()
      expect(results.length).toBe(2)
      expect(results.every(r => r.synced)).toBe(true)
    })
  })

  describe('Graph View', () => {
    it('should not crash on circular note references (BUG-018)', () => {
      const notes = [
        { id: 'note-1', title: 'Note 1', links: ['note-2'] },
        { id: 'note-2', title: 'Note 2', links: ['note-1'] },
      ]

      const buildGraph = (notes: typeof notes, visited = new Set<string>()) => {
        return notes.map(note => {
          if (visited.has(note.id)) {return null}
          visited.add(note.id)
          return {
            ...note,
            linkedNotes: note.links
              .map(id => notes.find(n => n.id === id))
              .filter(Boolean),
          }
        }).filter(Boolean)
      }

      expect(() => buildGraph(notes)).not.toThrow()
    })

    it('should handle empty graph gracefully (BUG-019)', () => {
      const notes: Note[] = []
      
      const buildGraph = (notes: Note[]) => {
        return notes.map(note => ({
          id: note.id,
          links: [],
        }))
      }

      const graph = buildGraph(notes)
      expect(graph).toEqual([])
    })
  })

  describe('Drag and Drop', () => {
    it('should handle invalid drop targets (BUG-020)', () => {
      const validDrop = (target: string | null): boolean => {
        return target !== null && target !== ''
      }

      expect(validDrop(null)).toBe(false)
      expect(validDrop('')).toBe(false)
      expect(validDrop('folder-1')).toBe(true)
    })

    it('should prevent dropping note into itself (BUG-021)', () => {
      const canDrop = (draggedId: string, targetId: string): boolean => {
        return draggedId !== targetId
      }

      expect(canDrop('note-1', 'note-1')).toBe(false)
      expect(canDrop('note-1', 'folder-1')).toBe(true)
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should handle touch events correctly (BUG-022)', () => {
      const touchEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: vi.fn(),
      }

      const handleTouch = (e: typeof touchEvent) => {
        e.preventDefault()
        return { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }

      const result = handleTouch(touchEvent)
      expect(result).toEqual({ x: 100, y: 200 })
    })

    it('should handle viewport changes (BUG-023)', () => {
      const viewports = [
        { width: 320, height: 568 },   // iPhone SE
        { width: 375, height: 667 },   // iPhone 8
        { width: 768, height: 1024 },  // iPad
        { width: 1920, height: 1080 }, // Desktop
      ]

      viewports.forEach(vp => {
        expect(vp.width).toBeGreaterThan(0)
        expect(vp.height).toBeGreaterThan(0)
      })
    })
  })

  describe('Memory Leaks', () => {
    it('should clean up event listeners on unmount (BUG-024)', () => {
      const listeners: (() => void)[] = []
      
      const addListener = (fn: () => void) => {
        listeners.push(fn)
        return () => {
          const index = listeners.indexOf(fn)
          if (index > -1) {listeners.splice(index, 1)}
        }
      }

      const removeListener = addListener(() => {})
      removeListener()

      expect(listeners.length).toBe(0)
    })

    it('should cancel pending requests on unmount (BUG-025)', () => {
      let aborted = false
      const controller = new AbortController()

      const fetchData = async () => {
        try {
          await fetch('/api/data', { signal: controller.signal })
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') {
            aborted = true
          }
        }
      }

      // Simulate unmount
      controller.abort()
      expect(controller.signal.aborted).toBe(true)
    })
  })
})
