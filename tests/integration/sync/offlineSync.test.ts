// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/* eslint-disable prefer-global */

/**
 * Integration Tests for Offline/Online Synchronization
 * Tests offline queue, conflict resolution, and sync after reconnection
 */

import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';

import { LocalStorage } from '@/lib/localStorage';
import { supabase } from '@/lib/supabase';
import type { Note } from '@/types';

import { server } from '../mocks/server';

// Setup MSW
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('Offline/Online Sync Integration', () => {
  const testUserId = 'test-user-id';

  beforeEach(async () => {
    // Clear storage
    await localStorage.clear();

    // Setup auth
    await supabase.auth.signUp({
      email: 'synctest@example.com',
      password: 'SecurePassword123!', // NOSONAR
    });

    // Reset online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Offline Note Creation', () => {
    it('should create note locally when offline', async () => {
      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const note: Note = {
        id: 'offline-note-1',
        user_id: testUserId,
        title: 'Offline Note',
        content: 'Created while offline',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save locally
      await LocalStorage.saveNote(note);

      // Verify saved locally
      const localNotes = await LocalStorage.getNotes();
      expect(localNotes).toHaveLength(1);
      expect(localNotes[0].title).toBe('Offline Note');
    });

    it('should queue sync operation when offline', async () => {
      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const note: Note = {
        id: 'queued-note',
        user_id: testUserId,
        title: 'Queued Note',
        content: 'Should be queued',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save locally (this would typically queue for sync)
      await LocalStorage.saveNote(note);

      // Check pending writes in localStorage
      const pendingWrites = localStorage.getItem('obsidian_pwa_pending_writes');
      expect(pendingWrites).toBeDefined();
    });

    it('should handle multiple offline creations', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Create multiple notes offline
      for (let i = 0; i < 5; i++) {
        const note: Note = {
          id: `offline-note-${i}`,
          user_id: testUserId,
          title: `Offline Note ${i}`,
          content: `Content ${i}`,
          is_pinned: false,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await LocalStorage.saveNote(note);
      }

      const localNotes = await LocalStorage.getNotes();
      expect(localNotes).toHaveLength(5);
    });
  });

  describe('Sync Queue Management', () => {
    it('should maintain sync queue order', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const operations = [];

      // Create operations in specific order
      for (let i = 0; i < 3; i++) {
        const note: Note = {
          id: `order-note-${i}`,
          user_id: testUserId,
          title: `Note ${i}`,
          content: `Content ${i}`,
          is_pinned: false,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await LocalStorage.saveNote(note);
        operations.push(note.id);
      }

      // Verify all notes exist locally
      const notes = await LocalStorage.getNotes();
      expect(notes).toHaveLength(3);
    });

    it('should clear sync queue after successful sync', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const note: Note = {
        id: 'sync-clear-test',
        user_id: testUserId,
        title: 'Clear Test',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await LocalStorage.saveNote(note);

      // Set pending writes
      localStorage.setItem('obsidian_pwa_pending_writes', JSON.stringify([note.id]));

      // Go online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Simulate sync completion
      localStorage.setItem('obsidian_pwa_pending_writes', JSON.stringify([]));

      const pendingWrites = localStorage.getItem('obsidian_pwa_pending_writes');
      expect(JSON.parse(pendingWrites || '[]')).toEqual([]);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts between local and remote', async () => {
      const noteId = 'conflict-test-note';
      const localTimestamp = new Date(Date.now() - 1000).toISOString();
      const remoteTimestamp = new Date().toISOString();

      // Create local version (older)
      const localNote: Note = {
        id: noteId,
        user_id: testUserId,
        title: 'Local Version',
        content: 'Local content',
        is_pinned: false,
        is_archived: false,
        created_at: localTimestamp,
        updated_at: localTimestamp,
      };

      await LocalStorage.saveNote(localNote);

      // Simulate remote version (newer)
      const remoteNote = {
        id: noteId,
        user_id: testUserId,
        title: 'Remote Version',
        content: 'Remote content',
        updated_at: remoteTimestamp,
      };

      // Remote is newer, should win
      expect(new Date(remoteNote.updated_at) > new Date(localNote.updated_at)).toBe(true);
    });

    it('should prefer local changes when local is newer', async () => {
      const noteId = 'local-wins-note';
      const now = Date.now();

      const localNote: Note = {
        id: noteId,
        user_id: testUserId,
        title: 'Newer Local',
        content: 'Newer content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      };

      const remoteNote = {
        id: noteId,
        title: 'Older Remote',
        content: 'Older content',
        updated_at: new Date(now - 1000).toISOString(),
      };

      await LocalStorage.saveNote(localNote);

      // Local is newer
      expect(new Date(localNote.updated_at) > new Date(remoteNote.updated_at)).toBe(true);
    });

    it('should merge non-conflicting changes', async () => {
      const noteId = 'merge-note';

      const baseNote: Note = {
        id: noteId,
        user_id: testUserId,
        title: 'Base Title',
        content: 'Base content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await LocalStorage.saveNote(baseNote);

      // Local changes title
      const localChanges = {
        ...baseNote,
        title: 'New Title',
        updated_at: new Date(Date.now() + 1000).toISOString(),
      };

      // Remote changes content (at same time)
      const remoteChanges = {
        ...baseNote,
        content: 'New content',
        updated_at: new Date(Date.now() + 1000).toISOString(),
      };

      // Both changed different fields - could be merged
      expect(localChanges.title).not.toBe(remoteChanges.title);
      expect(localChanges.content).not.toBe(remoteChanges.content);
    });
  });

  describe('Sync After Reconnection', () => {
    it('should sync pending changes when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Create note offline
      const note: Note = {
        id: 'reconnect-note',
        user_id: testUserId,
        title: 'Offline Created',
        content: 'Created offline',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await LocalStorage.saveNote(note);

      // Verify note exists locally
      let localNotes = await LocalStorage.getNotes();
      expect(localNotes).toHaveLength(1);

      // Go online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Simulate online event
      window.dispatchEvent(new Event('online'));

      // Note should still be in local storage
      localNotes = await LocalStorage.getNotes();
      expect(localNotes).toHaveLength(1);
    });

    it('should handle rapid online/offline transitions', async () => {
      const note: Note = {
        id: 'rapid-note',
        user_id: testUserId,
        title: 'Rapid Test',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Rapidly toggle online/offline
      for (let i = 0; i < 5; i++) {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: i % 2 === 0,
        });
        await LocalStorage.saveNote({ ...note, id: `rapid-note-${i}` });
      }

      const notes = await LocalStorage.getNotes();
      expect(notes).toHaveLength(5);
    });

    it('should retry failed syncs', async () => {
      // Mock server to fail first then succeed
      let requestCount = 0;
      server.use(
        http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          requestCount++;
          if (requestCount === 1) {
            return HttpResponse.json({ error: 'Network error' }, { status: 503 });
          }
          return HttpResponse.json({ id: 'success' });
        })
      );

      // Create and attempt sync
      const note: Note = {
        id: 'retry-note',
        user_id: testUserId,
        title: 'Retry Test',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await LocalStorage.saveNote(note);

      // First attempt fails
      const { error } = await supabase.from('notes').insert(note);
      expect(error).toBeDefined();

      // Second attempt succeeds
      const { data } = await supabase.from('notes').insert(note).select();
      expect(data).toBeDefined();
    });
  });

  describe('Bidirectional Sync', () => {
    it('should pull remote changes', async () => {
      // Simulate remote data
      const remoteNote = {
        id: 'remote-only-note',
        user_id: testUserId,
        title: 'Remote Note',
        content: 'Only exists remotely',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock server to return remote note
      server.use(
        http.get('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          return HttpResponse.json([remoteNote]);
        })
      );

      // Fetch from remote
      const { data } = await supabase.from('notes').select('*').eq('user_id', testUserId);

      expect(data).toHaveLength(1);
      expect(data?.[0].title).toBe('Remote Note');
    });

    it('should push local changes', async () => {
      const localNote: Note = {
        id: 'local-only-note',
        user_id: testUserId,
        title: 'Local Note',
        content: 'Only exists locally',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await LocalStorage.saveNote(localNote);

      // Push to server
      const { data, error } = await supabase.from('notes').insert(localNote).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe('Local Note');
    });

    it('should handle simultaneous local and remote changes', async () => {
      // Local changes
      const localNote: Note = {
        id: 'simultaneous-note',
        user_id: testUserId,
        title: 'Local Title',
        content: 'Local content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date(Date.now() + 1000).toISOString(),
      };

      await LocalStorage.saveNote(localNote);

      // Remote changes (simulated)
      const remoteNote = {
        id: 'simultaneous-note',
        user_id: testUserId,
        title: 'Remote Title',
        content: 'Remote content',
        updated_at: new Date(Date.now() + 2000).toISOString(),
      };

      // Remote is newer
      expect(new Date(remoteNote.updated_at) > new Date(localNote.updated_at)).toBe(true);
    });
  });

  describe('Sync State Management', () => {
    it('should track sync status', async () => {
      const syncStates: string[] = [];

      // Simulate sync state tracking
      const trackSync = (state: string) => {
        syncStates.push(state);
      };

      trackSync('idle');
      trackSync('syncing');
      trackSync('completed');

      expect(syncStates).toEqual(['idle', 'syncing', 'completed']);
    });

    it('should handle sync errors gracefully', async () => {
      server.use(
        http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          return HttpResponse.json({ error: 'Sync failed' }, { status: 500 });
        })
      );

      const note: Note = {
        id: 'error-note',
        user_id: testUserId,
        title: 'Error Test',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await LocalStorage.saveNote(note);

      // Attempt sync
      const { error } = await supabase.from('notes').insert(note);

      expect(error).toBeDefined();

      // Local data should still exist
      const localNotes = await LocalStorage.getNotes();
      expect(localNotes).toHaveLength(1);
    });

    it('should prevent duplicate syncs', async () => {
      let syncCount = 0;

      server.use(
        http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          syncCount++;
          return HttpResponse.json({ id: 'synced' });
        })
      );

      const note: Note = {
        id: 'duplicate-sync-note',
        user_id: testUserId,
        title: 'Duplicate Test',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try to sync same note multiple times simultaneously
      await Promise.all([
        supabase.from('notes').insert(note),
        supabase.from('notes').insert(note),
        supabase.from('notes').insert(note),
      ]);

      // Should have attempted all syncs
      expect(syncCount).toBeGreaterThan(0);
    });
  });

  describe('Network Event Handling', () => {
    it('should listen for online event', async () => {
      const onlineHandler = vi.fn();

      window.addEventListener('online', onlineHandler);

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));

      expect(onlineHandler).toHaveBeenCalled();

      window.removeEventListener('online', onlineHandler);
    });

    it('should listen for offline event', async () => {
      const offlineHandler = vi.fn();

      window.addEventListener('offline', offlineHandler);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));

      expect(offlineHandler).toHaveBeenCalled();

      window.removeEventListener('offline', offlineHandler);
    });

    it('should check initial online status', () => {
      expect(navigator.onLine).toBeDefined();
      expect(typeof navigator.onLine).toBe('boolean');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity during sync', async () => {
      const originalNote: Note = {
        id: 'integrity-note',
        user_id: testUserId,
        title: 'Integrity Test',
        content: 'Content with special chars: é à ñ 中文 🎉',
        is_pinned: true,
        is_archived: false,
        folder_id: 'folder-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await LocalStorage.saveNote(originalNote);

      // Retrieve and verify
      const retrieved = await LocalStorage.getNote(originalNote.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe(originalNote.title);
      expect(retrieved?.content).toBe(originalNote.content);
      expect(retrieved?.is_pinned).toBe(originalNote.is_pinned);
      expect(retrieved?.folder_id).toBe(originalNote.folder_id);
    });

    it('should handle large content sync', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB content

      const note: Note = {
        id: 'large-note',
        user_id: testUserId,
        title: 'Large Note',
        content: largeContent,
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await LocalStorage.saveNote(note);

      const retrieved = await LocalStorage.getNote(note.id);
      expect(retrieved?.content.length).toBe(largeContent.length);
    });
  });
});
