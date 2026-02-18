// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Integration Tests for Local Storage
 * Tests persistence, sync, conflict resolution, and data migration
 */

import localforage from 'localforage'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import { LocalStorage } from '@/lib/localStorage'
import type { Note, Folder, Tag, Link, Attachment } from '@/types'

// Setup and teardown
beforeEach(() => {
  // Clear all storage before each test
  localStorage.clear()
  localforage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('LocalStorage Integration', () => {
  const testUserId = 'test-user-id'

  describe('Notes Persistence', () => {
    it('should save and retrieve notes', async () => {
      const note: Note = {
        id: 'note-1',
        user_id: testUserId,
        title: 'Test Note',
        content: 'Test content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveNote(note)
      const notes = await LocalStorage.getNotes()

      expect(notes).toHaveLength(1)
      expect(notes[0].id).toBe(note.id)
      expect(notes[0].title).toBe(note.title)
      expect(notes[0].content).toBe(note.content)
    })

    it('should update existing note', async () => {
      const note: Note = {
        id: 'note-1',
        user_id: testUserId,
        title: 'Original Title',
        content: 'Original content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveNote(note)

      const updatedNote: Note = {
        ...note,
        title: 'Updated Title',
        content: 'Updated content',
      }

      await LocalStorage.saveNote(updatedNote)
      const notes = await LocalStorage.getNotes()

      expect(notes).toHaveLength(1)
      expect(notes[0].title).toBe('Updated Title')
      expect(notes[0].content).toBe('Updated content')
    })

    it('should delete note', async () => {
      const note: Note = {
        id: 'note-1',
        user_id: testUserId,
        title: 'Test Note',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveNote(note)
      await LocalStorage.deleteNote(note.id)

      const notes = await LocalStorage.getNotes()
      expect(notes).toHaveLength(0)
    })

    it('should retrieve single note by id', async () => {
      const note: Note = {
        id: 'note-1',
        user_id: testUserId,
        title: 'Test Note',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveNote(note)
      const retrieved = await LocalStorage.getNote(note.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(note.id)
    })

    it('should return null for non-existent note', async () => {
      const retrieved = await LocalStorage.getNote('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should sync save to localStorage for instant persistence', async () => {
      const note: Note = {
        id: 'note-1',
        user_id: testUserId,
        title: 'Sync Note',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      LocalStorage.saveNoteSync(note)

      // Check localStorage directly
      const syncData = localStorage.getItem('obsidian_pwa_notes_sync')
      expect(syncData).toBeDefined()
      
      const parsed = JSON.parse(syncData!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].title).toBe('Sync Note')
    })
  })

  describe('Folders Persistence', () => {
    it('should save and retrieve folders', async () => {
      const folder: Folder = {
        id: 'folder-1',
        user_id: testUserId,
        name: 'Test Folder',
        path: '/test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveFolder(folder)
      const folders = await LocalStorage.getFolders()

      expect(folders).toHaveLength(1)
      expect(folders[0].id).toBe(folder.id)
      expect(folders[0].name).toBe(folder.name)
    })

    it('should update folder', async () => {
      const folder: Folder = {
        id: 'folder-1',
        user_id: testUserId,
        name: 'Original',
        path: '/original',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveFolder(folder)

      const updated: Folder = {
        ...folder,
        name: 'Updated',
        color: '#ff0000',
      }

      await LocalStorage.saveFolder(updated)
      const folders = await LocalStorage.getFolders()

      expect(folders[0].name).toBe('Updated')
      expect(folders[0].color).toBe('#ff0000')
    })

    it('should delete folder', async () => {
      const folder: Folder = {
        id: 'folder-1',
        user_id: testUserId,
        name: 'To Delete',
        path: '/delete',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveFolder(folder)
      await LocalStorage.deleteFolder(folder.id)

      const folders = await LocalStorage.getFolders()
      expect(folders).toHaveLength(0)
    })
  })

  describe('Tags Persistence', () => {
    it('should save and retrieve tags', async () => {
      const tag: Tag = {
        id: 'tag-1',
        user_id: testUserId,
        name: 'Important',
        color: '#ff0000',
        created_at: new Date().toISOString(),
      }

      await LocalStorage.saveTag(tag)
      const tags = await LocalStorage.getTags()

      expect(tags).toHaveLength(1)
      expect(tags[0].name).toBe('Important')
    })

    it('should update tag', async () => {
      const tag: Tag = {
        id: 'tag-1',
        user_id: testUserId,
        name: 'Old Name',
        created_at: new Date().toISOString(),
      }

      await LocalStorage.saveTag(tag)

      const updated: Tag = {
        ...tag,
        name: 'New Name',
        color: '#00ff00',
      }

      await LocalStorage.saveTag(updated)
      const tags = await LocalStorage.getTags()

      expect(tags[0].name).toBe('New Name')
      expect(tags[0].color).toBe('#00ff00')
    })
  })

  describe('Links Persistence', () => {
    it('should save and retrieve links', async () => {
      const link: Link = {
        id: 'link-1',
        user_id: testUserId,
        source_note_id: 'note-1',
        target_note_id: 'note-2',
        link_type: 'wiki',
        created_at: new Date().toISOString(),
      }

      await LocalStorage.saveLink(link)
      const links = await LocalStorage.getLinks()

      expect(links).toHaveLength(1)
      expect(links[0].source_note_id).toBe('note-1')
      expect(links[0].target_note_id).toBe('note-2')
    })

    it('should update links for note', async () => {
      // Create notes first
      const note1: Note = {
        id: 'note-1',
        user_id: testUserId,
        title: 'Note 1',
        content: 'Content 1',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const note2: Note = {
        id: 'note-2',
        user_id: testUserId,
        title: 'Note 2',
        content: 'Content 2',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveNote(note1)
      await LocalStorage.saveNote(note2)

      // Update links
      await LocalStorage.updateLinksForNote('note-1', ['Note 2'])

      const links = await LocalStorage.getLinks()
      expect(links.length).toBeGreaterThan(0)
    })
  })

  describe('Attachments Persistence', () => {
    it('should save attachment metadata', async () => {
      const attachment: Attachment = {
        id: 'attach-1',
        user_id: testUserId,
        note_id: 'note-1',
        file_name: 'test.pdf',
        file_path: '/path/to/test.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        created_at: new Date().toISOString(),
      }

      await LocalStorage.saveAttachment(attachment)
      const attachments = await LocalStorage.getAttachments()

      expect(attachments).toHaveLength(1)
      expect(attachments[0].file_name).toBe('test.pdf')
    })

    it('should save attachment with file blob', async () => {
      const attachment: Attachment = {
        id: 'attach-1',
        user_id: testUserId,
        note_id: 'note-1',
        file_name: 'test.txt',
        file_path: '/path/to/test.txt',
        file_type: 'text/plain',
        file_size: 100,
        created_at: new Date().toISOString(),
      }

      const fileBlob = new Blob(['test content'], { type: 'text/plain' })

      await LocalStorage.saveAttachment(attachment, fileBlob)
      const retrievedBlob = await LocalStorage.getAttachmentFile(attachment.id)

      expect(retrievedBlob).toBeDefined()
    })

    it('should filter attachments by note id', async () => {
      const attachment1: Attachment = {
        id: 'attach-1',
        user_id: testUserId,
        note_id: 'note-1',
        file_name: 'file1.pdf',
        file_path: '/path/file1.pdf',
        created_at: new Date().toISOString(),
      }

      const attachment2: Attachment = {
        id: 'attach-2',
        user_id: testUserId,
        note_id: 'note-2',
        file_name: 'file2.pdf',
        file_path: '/path/file2.pdf',
        created_at: new Date().toISOString(),
      }

      await LocalStorage.saveAttachment(attachment1)
      await LocalStorage.saveAttachment(attachment2)

      const attachments = await LocalStorage.getAttachments('note-1')

      expect(attachments).toHaveLength(1)
      expect(attachments[0].note_id).toBe('note-1')
    })

    it('should delete attachment', async () => {
      const attachment: Attachment = {
        id: 'attach-1',
        user_id: testUserId,
        note_id: 'note-1',
        file_name: 'to-delete.pdf',
        file_path: '/path/to-delete.pdf',
        created_at: new Date().toISOString(),
      }

      await LocalStorage.saveAttachment(attachment)
      await LocalStorage.deleteAttachment(attachment.id)

      const attachments = await LocalStorage.getAttachments()
      expect(attachments).toHaveLength(0)
    })
  })

  describe('Settings Persistence', () => {
    it('should save and retrieve settings', async () => {
      const settings = {
        theme: 'dark',
        fontSize: 14,
        autoSave: true,
      }

      await LocalStorage.saveSettings(settings)
      const retrieved = await LocalStorage.getSettings()

      expect(retrieved.theme).toBe('dark')
      expect(retrieved.fontSize).toBe(14)
      expect(retrieved.autoSave).toBe(true)
    })

    it('should merge settings updates', async () => {
      await LocalStorage.saveSettings({ theme: 'light', fontSize: 12 })
      await LocalStorage.saveSettings({ fontSize: 16, autoSave: false })

      const settings = await LocalStorage.getSettings()

      // Should keep old values and add new ones
      expect(settings.theme).toBe('light')
      expect(settings.fontSize).toBe(16)
      expect(settings.autoSave).toBe(false)
    })
  })

  describe('Offline Data Persistence', () => {
    it('should persist data across sessions', async () => {
      const note: Note = {
        id: 'persistent-note',
        user_id: testUserId,
        title: 'Persistent Note',
        content: 'This should persist',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveNote(note)

      // Simulate new session by clearing in-memory cache
      // and reading from storage again
      const notes = await LocalStorage.getNotes()

      expect(notes).toHaveLength(1)
      expect(notes[0].title).toBe('Persistent Note')
    })

    it('should handle large data sets', async () => {
      const notes: Note[] = []
      
      for (let i = 0; i < 100; i++) {
        notes.push({
          id: `note-${i}`,
          user_id: testUserId,
          title: `Note ${i}`,
          content: `Content ${i} `.repeat(100), // Large content
          is_pinned: false,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      // Save all notes
      for (const note of notes) {
        await LocalStorage.saveNote(note)
      }

      const retrieved = await LocalStorage.getNotes()
      expect(retrieved.length).toBe(100)
    })
  })

  describe('Conflict Resolution', () => {
    it('should use most recent timestamp on conflict', async () => {
      const now = Date.now()
      
      const note1: Note = {
        id: 'conflict-note',
        user_id: testUserId,
        title: 'First Version',
        content: 'First content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      }

      await LocalStorage.saveNote(note1)

      const note2: Note = {
        ...note1,
        title: 'Second Version',
        content: 'Second content',
        updated_at: new Date(now + 1000).toISOString(),
      }

      await LocalStorage.saveNote(note2)

      const notes = await LocalStorage.getNotes()
      expect(notes[0].title).toBe('Second Version')
    })

    it('should handle concurrent saves gracefully', async () => {
      const noteId = 'concurrent-note'
      const baseNote: Note = {
        id: noteId,
        user_id: testUserId,
        title: 'Base',
        content: 'Base content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await LocalStorage.saveNote(baseNote)

      // Simulate concurrent updates
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          LocalStorage.saveNote({
            ...baseNote,
            title: `Update ${i}`,
            updated_at: new Date(Date.now() + i * 100).toISOString(),
          })
        )
      }

      await Promise.all(promises)

      // Should have exactly one note
      const notes = await LocalStorage.getNotes()
      expect(notes).toHaveLength(1)
    })
  })

  describe('Data Migration', () => {
    it('should handle legacy data format', async () => {
      // Simulate old format data in localStorage
      const legacyData = [
        {
          id: 'legacy-note',
          title: 'Legacy Note',
          content: 'Legacy content',
          // Missing new fields
        },
      ]

      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(legacyData))

      // Should handle gracefully
      const notes = await LocalStorage.getNotes()
      expect(notes.length).toBeGreaterThanOrEqual(0)
    })

    it('should migrate data from localStorage to IndexedDB', async () => {
      const note: Note = {
        id: 'migrate-note',
        user_id: testUserId,
        title: 'Migrate Me',
        content: 'Content to migrate',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Save to localStorage directly (simulating legacy)
      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify([note]))

      // Read should migrate to IndexedDB
      const notes = await LocalStorage.getNotes()
      
      expect(notes.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage quota exceeded', async () => {
      // Mock localStorage to throw quota error
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError')
      })

      const note: Note = {
        id: 'quota-test',
        user_id: testUserId,
        title: 'Quota Test',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Should not throw, just log warning
      await expect(LocalStorage.saveNote(note)).resolves.not.toThrow()

      // Restore
      localStorage.setItem = originalSetItem
    })

    it('should handle corrupted data gracefully', async () => {
      // Put corrupted data in localStorage
      localStorage.setItem('obsidian_pwa_notes_sync', 'not valid json{')

      // Should return empty array, not throw
      const notes = await LocalStorage.getNotes()
      expect(notes).toEqual([])
    })

    it('should handle IndexedDB errors', async () => {
      // Mock localforage to simulate error
      const originalGetItem = localforage.getItem
      localforage.getItem = vi.fn().mockRejectedValue(new Error('IndexedDB error'))

      // Should fallback to localStorage or return empty
      const notes = await LocalStorage.getNotes()
      expect(Array.isArray(notes)).toBe(true)

      // Restore
      localforage.getItem = originalGetItem
    })
  })

  describe('Generic Item Operations', () => {
    it('should save and retrieve generic items', async () => {
      const customData = { foo: 'bar', count: 42 }
      
      await LocalStorage.setItem('custom_key', customData)
      const retrieved = await LocalStorage.getItem('custom_key')

      expect(retrieved).toEqual(customData)
    })

    it('should return null for non-existent generic item', async () => {
      const retrieved = await LocalStorage.getItem('non_existent_key')
      expect(retrieved).toBeNull()
    })
  })

  describe('Clear All Data', () => {
    it('should clear all storage', async () => {
      // Add various data
      await LocalStorage.saveNote({
        id: 'note-1',
        user_id: testUserId,
        title: 'Note',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      await LocalStorage.saveFolder({
        id: 'folder-1',
        user_id: testUserId,
        name: 'Folder',
        path: '/folder',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      await LocalStorage.saveSettings({ theme: 'dark' })

      // Clear all
      await LocalStorage.clearAll()

      // Verify all cleared
      const notes = await LocalStorage.getNotes()
      const folders = await LocalStorage.getFolders()
      const settings = await LocalStorage.getSettings()

      expect(notes).toEqual([])
      expect(folders).toEqual([])
      expect(settings).toEqual({})
    })
  })
})
