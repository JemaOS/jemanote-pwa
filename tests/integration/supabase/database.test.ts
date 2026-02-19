// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Integration Tests for Supabase Database Operations
 * Tests CRUD operations and relations with the real Supabase client
 */

import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';

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

describe('Supabase Database Integration', () => {
  const testUserId = 'test-user-id';

  beforeEach(async () => {
    // Setup auth for database tests
    await supabase.auth.signUp({
      email: 'dbtest@example.com',
      password: 'SecurePassword123!', // NOSONAR
    });
  });

  describe('Notes CRUD', () => {
    it('should create a new note', async () => {
      const newNote = {
        user_id: testUserId,
        title: 'Test Note',
        content: 'This is a test note content',
        folder_id: null,
        is_pinned: false,
        is_archived: false,
      };

      const { data, error } = await supabase.from('notes').insert(newNote).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe(newNote.title);
      expect(data.content).toBe(newNote.content);
      expect(data.id).toBeDefined();
      expect(data.created_at).toBeDefined();
      expect(data.updated_at).toBeDefined();
    });

    it('should create multiple notes at once', async () => {
      const notes = [
        {
          user_id: testUserId,
          title: 'Note 1',
          content: 'Content 1',
          is_pinned: false,
          is_archived: false,
        },
        {
          user_id: testUserId,
          title: 'Note 2',
          content: 'Content 2',
          is_pinned: false,
          is_archived: false,
        },
        {
          user_id: testUserId,
          title: 'Note 3',
          content: 'Content 3',
          is_pinned: false,
          is_archived: false,
        },
      ];

      const { data, error } = await supabase.from('notes').insert(notes).select();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data).toHaveLength(3);
    });

    it('should read notes with user filter', async () => {
      // Create some notes first
      await supabase.from('notes').insert([
        {
          user_id: testUserId,
          title: 'Note A',
          content: 'Content A',
          is_pinned: false,
          is_archived: false,
        },
        {
          user_id: testUserId,
          title: 'Note B',
          content: 'Content B',
          is_pinned: false,
          is_archived: false,
        },
      ]);

      const { data, error } = await supabase.from('notes').select('*').eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThanOrEqual(2);
    });

    it('should read notes with ordering', async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', testUserId)
        .order('updated_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Verify ordering
      if (data && data.length > 1) {
        for (let i = 0; i < data.length - 1; i++) {
          const current = new Date(data[i].updated_at).getTime();
          const next = new Date(data[i + 1].updated_at).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });

    it('should update a note', async () => {
      // Create a note first
      const { data: created } = await supabase
        .from('notes')
        .insert({
          user_id: testUserId,
          title: 'Original Title',
          content: 'Original content',
          is_pinned: false,
          is_archived: false,
        })
        .select()
        .single();

      expect(created).toBeDefined();

      // Update the note
      const { data, error } = await supabase
        .from('notes')
        .update({ title: 'Updated Title', content: 'Updated content' })
        .eq('id', created.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe('Updated Title');
      expect(data.content).toBe('Updated content');
      expect(data.id).toBe(created.id);
    });

    it('should handle update for non-existent note', async () => {
      const { data, error } = await supabase
        .from('notes')
        .update({ title: 'New Title' })
        .eq('id', 'non-existent-id')
        .select();

      // Should not error, just return empty data
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should delete a note', async () => {
      // Create a note first
      const { data: created } = await supabase
        .from('notes')
        .insert({
          user_id: testUserId,
          title: 'Note to Delete',
          content: 'This note will be deleted',
          is_pinned: false,
          is_archived: false,
        })
        .select()
        .single();

      expect(created).toBeDefined();

      // Delete the note
      const { error } = await supabase.from('notes').delete().eq('id', created.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await supabase.from('notes').select('*').eq('id', created.id);

      expect(data).toEqual([]);
    });

    it('should soft delete a note (set deleted_at)', async () => {
      // Create a note
      const { data: created } = await supabase
        .from('notes')
        .insert({
          user_id: testUserId,
          title: 'Note to Soft Delete',
          content: 'Content',
          is_pinned: false,
          is_archived: false,
        })
        .select()
        .single();

      // Soft delete
      const { data, error } = await supabase
        .from('notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', created.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.deleted_at).toBeDefined();
      expect(data.deleted_at).not.toBeNull();
    });

    it('should filter notes by folder', async () => {
      const folderId = 'test-folder-id';

      await supabase.from('notes').insert([
        {
          user_id: testUserId,
          title: 'In Folder',
          content: 'Content',
          folder_id: folderId,
          is_pinned: false,
          is_archived: false,
        },
        {
          user_id: testUserId,
          title: 'No Folder',
          content: 'Content',
          folder_id: null,
          is_pinned: false,
          is_archived: false,
        },
      ]);

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', testUserId)
        .eq('folder_id', folderId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data?.forEach((note: Note) => {
        expect(note.folder_id).toBe(folderId);
      });
    });

    it('should filter pinned notes', async () => {
      await supabase.from('notes').insert([
        {
          user_id: testUserId,
          title: 'Pinned',
          content: 'Content',
          is_pinned: true,
          is_archived: false,
        },
        {
          user_id: testUserId,
          title: 'Not Pinned',
          content: 'Content',
          is_pinned: false,
          is_archived: false,
        },
      ]);

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', testUserId)
        .eq('is_pinned', true);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data?.forEach((note: Note) => {
        expect(note.is_pinned).toBe(true);
      });
    });

    it('should filter archived notes', async () => {
      await supabase.from('notes').insert([
        {
          user_id: testUserId,
          title: 'Archived',
          content: 'Content',
          is_pinned: false,
          is_archived: true,
        },
        {
          user_id: testUserId,
          title: 'Active',
          content: 'Content',
          is_pinned: false,
          is_archived: false,
        },
      ]);

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', testUserId)
        .eq('is_archived', true);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data?.forEach((note: Note) => {
        expect(note.is_archived).toBe(true);
      });
    });
  });

  describe('Folders CRUD', () => {
    it('should create a folder', async () => {
      const folder = {
        user_id: testUserId,
        name: 'Test Folder',
        path: '/test-folder',
      };

      const { data, error } = await supabase.from('folders').insert(folder).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(folder.name);
      expect(data.path).toBe(folder.path);
    });

    it('should create nested folders', async () => {
      // Create parent folder
      const { data: parent } = await supabase
        .from('folders')
        .insert({
          user_id: testUserId,
          name: 'Parent',
          path: '/parent',
        })
        .select()
        .single();

      // Create child folder
      const { data: child, error } = await supabase
        .from('folders')
        .insert({
          user_id: testUserId,
          name: 'Child',
          parent_id: parent.id,
          path: '/parent/child',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(child.parent_id).toBe(parent.id);
    });

    it('should read folders for user', async () => {
      await supabase.from('folders').insert([
        { user_id: testUserId, name: 'Folder 1', path: '/folder1' },
        { user_id: testUserId, name: 'Folder 2', path: '/folder2' },
      ]);

      const { data, error } = await supabase.from('folders').select('*').eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThanOrEqual(2);
    });

    it('should update folder', async () => {
      const { data: created } = await supabase
        .from('folders')
        .insert({
          user_id: testUserId,
          name: 'Old Name',
          path: '/old-name',
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('folders')
        .update({ name: 'New Name', color: '#ff0000' })
        .eq('id', created.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.name).toBe('New Name');
      expect(data.color).toBe('#ff0000');
    });

    it('should delete folder', async () => {
      const { data: created } = await supabase
        .from('folders')
        .insert({
          user_id: testUserId,
          name: 'To Delete',
          path: '/to-delete',
        })
        .select()
        .single();

      const { error } = await supabase.from('folders').delete().eq('id', created.id);

      expect(error).toBeNull();
    });
  });

  describe('Tags CRUD', () => {
    it('should create a tag', async () => {
      const tag = {
        user_id: testUserId,
        name: 'Important',
        color: '#ff0000',
      };

      const { data, error } = await supabase.from('tags').insert(tag).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(tag.name);
      expect(data.color).toBe(tag.color);
    });

    it('should read tags for user', async () => {
      await supabase.from('tags').insert([
        { user_id: testUserId, name: 'Work', color: '#0000ff' },
        { user_id: testUserId, name: 'Personal', color: '#00ff00' },
      ]);

      const { data, error } = await supabase.from('tags').select('*').eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThanOrEqual(2);
    });

    it('should update tag', async () => {
      const { data: created } = await supabase
        .from('tags')
        .insert({
          user_id: testUserId,
          name: 'Old Tag',
          color: '#000000',
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('tags')
        .update({ name: 'Updated Tag', color: '#ffffff' })
        .eq('id', created.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.name).toBe('Updated Tag');
      expect(data.color).toBe('#ffffff');
    });

    it('should delete tag', async () => {
      const { data: created } = await supabase
        .from('tags')
        .insert({
          user_id: testUserId,
          name: 'To Delete',
          color: '#000000',
        })
        .select()
        .single();

      const { error } = await supabase.from('tags').delete().eq('id', created.id);

      expect(error).toBeNull();
    });
  });

  describe('Links CRUD', () => {
    it('should create a link between notes', async () => {
      // Create two notes first
      const { data: note1 } = await supabase
        .from('notes')
        .insert({
          user_id: testUserId,
          title: 'Source Note',
          content: 'Content',
          is_pinned: false,
          is_archived: false,
        })
        .select()
        .single();

      const { data: note2 } = await supabase
        .from('notes')
        .insert({
          user_id: testUserId,
          title: 'Target Note',
          content: 'Content',
          is_pinned: false,
          is_archived: false,
        })
        .select()
        .single();

      // Create link
      const link = {
        user_id: testUserId,
        source_note_id: note1.id,
        target_note_id: note2.id,
        link_type: 'wiki',
      };

      const { data, error } = await supabase.from('links').insert(link).select().single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.source_note_id).toBe(note1.id);
      expect(data.target_note_id).toBe(note2.id);
    });

    it('should read links for a note', async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('source_note_id', 'test-note-id');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should delete link', async () => {
      const { data: created } = await supabase
        .from('links')
        .insert({
          user_id: testUserId,
          source_note_id: 'note-1',
          target_note_id: 'note-2',
          link_type: 'wiki',
        })
        .select()
        .single();

      const { error } = await supabase.from('links').delete().eq('id', created.id);

      expect(error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      server.use(
        http.get('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          return HttpResponse.error();
        })
      );

      const { data: _data, error } = await supabase.from('notes').select('*');

      expect(error).toBeDefined();
    });

    it('should handle server errors (500)', async () => {
      server.use(
        http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
        })
      );

      const { data: _data, error } = await supabase.from('notes').insert({
        user_id: testUserId,
        title: 'Test',
        content: 'Content',
        is_pinned: false,
        is_archived: false,
      });

      expect(error).toBeDefined();
    });

    it('should handle unauthorized access (401)', async () => {
      server.use(
        http.get('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          return HttpResponse.json(
            { error: 'Unauthorized', message: 'JWT expired' },
            { status: 401 }
          );
        })
      );

      const { data: _data, error } = await supabase.from('notes').select('*');

      expect(error).toBeDefined();
    });

    it('should handle not found (404)', async () => {
      server.use(
        http.patch('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          return HttpResponse.json(
            { error: 'Not found', message: 'Resource not found' },
            { status: 404 }
          );
        })
      );

      const { data: _data, error } = await supabase
        .from('notes')
        .update({ title: 'Updated' })
        .eq('id', 'non-existent')
        .select();

      expect(error).toBeDefined();
    });

    it('should handle validation errors (400)', async () => {
      server.use(
        http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async () => {
          return HttpResponse.json(
            { error: 'Bad request', message: 'Missing required field: title' },
            { status: 400 }
          );
        })
      );

      const { data: _data, error } = await supabase.from('notes').insert({
        user_id: testUserId,
        // Missing title
        content: 'Content',
      });

      expect(error).toBeDefined();
    });
  });

  describe('Complex Queries', () => {
    it('should fetch notes with their folder info', async () => {
      const { data, error } = await supabase
        .from('notes')
        .select(
          `
          *,
          folders (*)
        `
        )
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should fetch notes with their tags', async () => {
      const { data, error } = await supabase
        .from('notes')
        .select(
          `
          *,
          note_tags (
            tags (*)
          )
        `
        )
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should search notes by title', async () => {
      await supabase.from('notes').insert([
        {
          user_id: testUserId,
          title: 'JavaScript Tips',
          content: 'Content',
          is_pinned: false,
          is_archived: false,
        },
        {
          user_id: testUserId,
          title: 'TypeScript Guide',
          content: 'Content',
          is_pinned: false,
          is_archived: false,
        },
        {
          user_id: testUserId,
          title: 'Python Basics',
          content: 'Content',
          is_pinned: false,
          is_archived: false,
        },
      ]);

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', testUserId)
        .ilike('title', '%Script%');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data?.forEach((note: Note) => {
        expect(note.title.toLowerCase()).toContain('script');
      });
    });

    it('should paginate results', async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', testUserId)
        .range(0, 9); // First 10 items

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeLessThanOrEqual(10);
    });
  });
});
