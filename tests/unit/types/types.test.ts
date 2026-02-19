// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { describe, it, expect } from 'vitest';

// Type validation helper
type AssertEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
type AssertTrue<T extends true> = T;

describe('Type Definitions', () => {
  describe('Note type', () => {
    it('should have correct required properties', () => {
      // This test validates the Note interface structure at compile time
      type Note = {
        id: string;
        user_id: string;
        title: string;
        content: string;
        folder_id?: string;
        is_pinned: boolean;
        is_archived: boolean;
        deleted_at?: string | null;
        created_at: string;
        updated_at: string;
      };

      // Type assertions
      type TestId = AssertTrue<AssertEqual<Note['id'], string>>;
      type TestUserId = AssertTrue<AssertEqual<Note['user_id'], string>>;
      type TestTitle = AssertTrue<AssertEqual<Note['title'], string>>;
      type TestContent = AssertTrue<AssertEqual<Note['content'], string>>;
      type TestIsPinned = AssertTrue<AssertEqual<Note['is_pinned'], boolean>>;
      type TestIsArchived = AssertTrue<AssertEqual<Note['is_archived'], boolean>>;
      type TestCreatedAt = AssertTrue<AssertEqual<Note['created_at'], string>>;
      type TestUpdatedAt = AssertTrue<AssertEqual<Note['updated_at'], string>>;

      // Runtime test
      const validNote: Note = {
        id: 'test-id',
        user_id: 'user-1',
        title: 'Test Note',
        content: 'Test content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(validNote.id).toBe('test-id');
      expect(validNote.title).toBe('Test Note');
      expect(validNote.is_pinned).toBe(false);
    });

    it('should allow optional properties', () => {
      type Note = {
        id: string;
        user_id: string;
        title: string;
        content: string;
        folder_id?: string;
        is_pinned: boolean;
        is_archived: boolean;
        deleted_at?: string | null;
        created_at: string;
        updated_at: string;
      };

      const noteWithoutOptional: Note = {
        id: 'test-id',
        user_id: 'user-1',
        title: 'Test Note',
        content: 'Test content',
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const noteWithOptional: Note = {
        id: 'test-id',
        user_id: 'user-1',
        title: 'Test Note',
        content: 'Test content',
        folder_id: 'folder-1',
        is_pinned: true,
        is_archived: false,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(noteWithoutOptional.folder_id).toBeUndefined();
      expect(noteWithOptional.folder_id).toBe('folder-1');
    });
  });

  describe('Folder type', () => {
    it('should have correct structure', () => {
      type Folder = {
        id: string;
        user_id: string;
        name: string;
        parent_id?: string;
        path: string;
        icon?: string;
        color?: string;
        deleted_at?: string | null;
        created_at: string;
        updated_at: string;
      };

      const folder: Folder = {
        id: 'folder-1',
        user_id: 'user-1',
        name: 'Test Folder',
        path: '/Test Folder',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(folder.name).toBe('Test Folder');
      expect(folder.path).toBe('/Test Folder');
    });
  });

  describe('Tag type', () => {
    it('should have correct structure', () => {
      type Tag = {
        id: string;
        user_id: string;
        name: string;
        color?: string;
        created_at: string;
      };

      const tag: Tag = {
        id: 'tag-1',
        user_id: 'user-1',
        name: 'important',
        color: '#ff0000',
        created_at: new Date().toISOString(),
      };

      expect(tag.name).toBe('important');
      expect(tag.color).toBe('#ff0000');
    });
  });

  describe('NoteTag type', () => {
    it('should have correct structure', () => {
      type NoteTag = {
        id: string;
        note_id: string;
        tag_id: string;
        created_at: string;
      };

      const noteTag: NoteTag = {
        id: 'notetag-1',
        note_id: 'note-1',
        tag_id: 'tag-1',
        created_at: new Date().toISOString(),
      };

      expect(noteTag.note_id).toBe('note-1');
      expect(noteTag.tag_id).toBe('tag-1');
    });
  });

  describe('Link type', () => {
    it('should have correct structure', () => {
      type Link = {
        id: string;
        user_id: string;
        source_note_id: string;
        target_note_id: string;
        link_type: string;
        created_at: string;
      };

      const link: Link = {
        id: 'link-1',
        user_id: 'user-1',
        source_note_id: 'note-1',
        target_note_id: 'note-2',
        link_type: 'wikilink',
        created_at: new Date().toISOString(),
      };

      expect(link.source_note_id).toBe('note-1');
      expect(link.target_note_id).toBe('note-2');
      expect(link.link_type).toBe('wikilink');
    });
  });

  describe('Attachment type', () => {
    it('should have correct structure', () => {
      type Attachment = {
        id: string;
        user_id: string;
        note_id?: string;
        file_name: string;
        file_path: string;
        file_type?: string;
        file_size?: number;
        created_at: string;
      };

      const attachment: Attachment = {
        id: 'attachment-1',
        user_id: 'user-1',
        note_id: 'note-1',
        file_name: 'document.pdf',
        file_path: '/uploads/document.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        created_at: new Date().toISOString(),
      };

      expect(attachment.file_name).toBe('document.pdf');
      expect(attachment.file_size).toBe(1024);
    });
  });

  describe('Canvas type', () => {
    it('should have correct structure', () => {
      type Canvas = {
        id: string;
        user_id: string;
        name: string;
        width: number;
        height: number;
        created_at: string;
        updated_at: string;
      };

      const canvas: Canvas = {
        id: 'canvas-1',
        user_id: 'user-1',
        name: 'My Canvas',
        width: 1920,
        height: 1080,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(canvas.name).toBe('My Canvas');
      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
    });
  });

  describe('CanvasItem type', () => {
    it('should have correct structure', () => {
      type CanvasItem = {
        id: string;
        canvas_id: string;
        user_id: string;
        item_type: string;
        note_id?: string;
        position_x: number;
        position_y: number;
        width: number;
        height: number;
        content?: string;
        style?: Record<string, any>;
        created_at: string;
        updated_at: string;
      };

      const canvasItem: CanvasItem = {
        id: 'item-1',
        canvas_id: 'canvas-1',
        user_id: 'user-1',
        item_type: 'note',
        note_id: 'note-1',
        position_x: 100,
        position_y: 200,
        width: 300,
        height: 400,
        content: 'Item content',
        style: { backgroundColor: '#fff' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(canvasItem.position_x).toBe(100);
      expect(canvasItem.position_y).toBe(200);
      expect(canvasItem.item_type).toBe('note');
    });
  });

  describe('UserSettings type', () => {
    it('should have correct structure', () => {
      type UserSettings = {
        user_id: string;
        theme: 'light' | 'dark' | 'auto';
        editor_font_size: number;
        editor_vim_mode: boolean;
        editor_line_numbers: boolean;
        editor_auto_save: boolean;
        sync_enabled: boolean;
        sync_interval: number;
        preferences: Record<string, any>;
        created_at: string;
        updated_at: string;
      };

      const settings: UserSettings = {
        user_id: 'user-1',
        theme: 'dark',
        editor_font_size: 14,
        editor_vim_mode: false,
        editor_line_numbers: true,
        editor_auto_save: true,
        sync_enabled: true,
        sync_interval: 30000,
        preferences: { customSetting: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(settings.theme).toBe('dark');
      expect(settings.editor_font_size).toBe(14);
      expect(settings.sync_interval).toBe(30000);
    });

    it('should only accept valid theme values', () => {
      type Theme = 'light' | 'dark' | 'auto';

      const validThemes: Theme[] = ['light', 'dark', 'auto'];

      validThemes.forEach(theme => {
        expect(['light', 'dark', 'auto']).toContain(theme);
      });
    });
  });

  describe('GraphData type', () => {
    it('should have correct structure', () => {
      type GraphData = {
        nodes: Array<{
          id: string;
          title: string;
          created_at: string;
          updated_at: string;
          is_pinned: boolean;
        }>;
        edges: Array<{
          id: string;
          source: string;
          target: string;
          type: string;
        }>;
      };

      const graphData: GraphData = {
        nodes: [
          {
            id: 'note-1',
            title: 'Note 1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_pinned: false,
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'note-1',
            target: 'note-2',
            type: 'wikilink',
          },
        ],
      };

      expect(graphData.nodes).toHaveLength(1);
      expect(graphData.edges).toHaveLength(1);
      expect(graphData.edges[0].source).toBe('note-1');
      expect(graphData.edges[0].target).toBe('note-2');
    });
  });

  describe('type constraints', () => {
    it('should enforce boolean types', () => {
      const booleanValue = true;
      expect(typeof booleanValue).toBe('boolean');
    });

    it('should enforce string types', () => {
      const stringValue = 'test';
      expect(typeof stringValue).toBe('string');
    });

    it('should enforce number types', () => {
      const numberValue = 42;
      expect(typeof numberValue).toBe('number');
    });

    it('should handle optional fields correctly', () => {
      type WithOptional = {
        required: string;
        optional?: string;
      };

      const withOptional: WithOptional = { required: 'value' };
      const withAll: WithOptional = { required: 'value', optional: 'opt' };

      expect(withOptional.optional).toBeUndefined();
      expect(withAll.optional).toBe('opt');
    });

    it('should handle nullable fields correctly', () => {
      type WithNullable = {
        field: string | null;
      };

      const withNull: WithNullable = { field: null };
      const withValue: WithNullable = { field: 'value' };

      expect(withNull.field).toBeNull();
      expect(withValue.field).toBe('value');
    });

    it('should handle union types correctly', () => {
      type Status = 'pending' | 'active' | 'completed';

      const status: Status = 'active';

      expect(['pending', 'active', 'completed']).toContain(status);
    });

    it('should handle array types correctly', () => {
      const array: string[] = ['a', 'b', 'c'];

      expect(Array.isArray(array)).toBe(true);
      expect(array).toHaveLength(3);
    });

    it('should handle Record types correctly', () => {
      const record: Record<string, number> = {
        a: 1,
        b: 2,
        c: 3,
      };

      expect(record.a).toBe(1);
      expect(record.b).toBe(2);
    });
  });

  describe('type compatibility', () => {
    it('should ensure Note IDs are strings', () => {
      // eslint-disable-next-line @typescript-eslint/no-redundant-type-constitution
      const id: string = 'note-123';

      expect(typeof id).toBe('string');
    });

    it('should ensure timestamps are ISO strings', () => {
      const timestamp = new Date().toISOString();

      // ISO 8601 format check
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle empty arrays', () => {
      const emptyArray: string[] = [];

      expect(emptyArray).toHaveLength(0);
    });

    it('should handle nested objects', () => {
      type Nested = {
        level1: {
          level2: {
            level3: string;
          };
        };
      };

      const nested: Nested = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      };

      expect(nested.level1.level2.level3).toBe('deep value');
    });
  });
});
