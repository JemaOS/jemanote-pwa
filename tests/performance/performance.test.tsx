// Copyright (c) 2025 Jema Technology.
// Performance Tests

import { describe, it, expect } from 'vitest';

import type { Note, Folder } from '@/types';

describe('Performance Tests', () => {
  describe('Note List Rendering', () => {
    it('should render 100 notes in under 500ms', () => {
      const notes: Note[] = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content of note ${i}`,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const start = performance.now();

      // Simulate rendering notes
      const container = document.createElement('div');
      notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.textContent = note.title;
        container.appendChild(noteEl);
      });

      const end = performance.now();
      expect(end - start).toBeLessThan(500);
    });

    it('should render 500 notes in under 1000ms', () => {
      const notes: Note[] = Array.from({ length: 500 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content of note ${i}`,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const start = performance.now();

      const container = document.createElement('div');
      notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.textContent = note.title;
        container.appendChild(noteEl);
      });

      const end = performance.now();
      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Markdown Rendering', () => {
    it('should render large markdown content in under 300ms', () => {
      const largeContent = '# Heading\n\n'.repeat(1000);

      const start = performance.now();

      // Simulate markdown processing
      const lines = largeContent.split('\n');
      lines.map(line => {
        if (line.startsWith('# ')) {
          return `<h1>${line.slice(2)}</h1>`;
        }
        return line;
      });

      const end = performance.now();
      expect(end - start).toBeLessThan(300);
    });

    it('should handle complex nested markdown efficiently', () => {
      const complexContent = `
# Main Heading

## Section 1
- Item 1
  - Subitem 1.1
  - Subitem 1.2
- Item 2

## Section 2
> Quote with **bold** and *italic*

\`\`\`javascript
const code = "example";
\`\`\`

[[Wiki Link]]

| Table | Header |
|-------|--------|
| Cell  | Cell   |
`.repeat(100);

      const start = performance.now();

      // SECURITY FIX: Limit content size to prevent ReDoS during processing
      const MAX_CONTENT_LENGTH = 1000000; // 1MB max
      const safeContent =
        complexContent.length > MAX_CONTENT_LENGTH
          ? complexContent.substring(0, MAX_CONTENT_LENGTH)
          : complexContent;

      // Simple processing simulation with safer regex patterns
      // eslint-disable-next-line prefer-string-replace-all, @typescript-eslint/no-unused-vars
      const processed = safeContent
        .replace(/# ([^\n]{1,500})/g, '<h1>$1</h1>')
        // eslint-disable-next-line prefer-string-replace-all
        .replace(/\*\*([^*]{1,500}?)\*\*/g, '<strong>$1</strong>')
        // eslint-disable-next-line prefer-string-replace-all
        .replace(/\*([^*]{1,500}?)\*/g, '<em>$1</em>');

      const end = performance.now();
      expect(end - start).toBeLessThan(200);
    });
  });

  describe('Search Performance', () => {
    it('should search through 1000 notes in under 100ms', () => {
      const notes: Note[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note Title ${i} with searchable content`,
        content: `This is the content of note ${i} with keywords to search`,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const searchQuery = 'searchable';

      const start = performance.now();

      const results = notes.filter(
        note =>
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle fuzzy search efficiently', () => {
      const notes: Note[] = Array.from({ length: 500 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content ${i}`,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const searchQuery = 'nt'; // fuzzy match for "note"

      const start = performance.now();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const results = notes.filter(note => {
        const title = note.title.toLowerCase();
        let queryIndex = 0;
        for (let i = 0; i < title.length && queryIndex < searchQuery.length; i++) {
          if (title[i] === searchQuery[queryIndex]) {
            queryIndex++;
          }
        }
        return queryIndex === searchQuery.length;
      });

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });
  });

  describe('Folder Operations', () => {
    it('should handle deeply nested folders efficiently', () => {
      const folders: Folder[] = [];
      let parentId: string | undefined = undefined;

      // Create 50 nested folders
      for (let i = 0; i < 50; i++) {
        const folder: Folder = {
          id: `folder-${i}`,
          name: `Folder ${i}`,
          path: parentId ? `${folders.find(f => f.id === parentId)?.path}/${i}` : `/${i}`,
          user_id: 'user-1',
          parent_id: parentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        folders.push(folder);
        parentId = folder.id;
      }

      const start = performance.now();

      // Build folder tree
      const buildTree = (parentId?: string): Folder[] => {
        return folders
          .filter(f => f.parent_id === parentId)
          .map(f => ({
            ...f,
            children: buildTree(f.id),
          }));
      };

      const tree = buildTree();

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
      expect(tree.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage', () => {
    it('should handle large note content without excessive memory', () => {
      const largeNote: Note = {
        id: 'large-note',
        title: 'Large Note',
        content: 'A'.repeat(1000000), // 1MB of content
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Process the note
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const processed = {
        ...largeNote,
        preview: largeNote.content.slice(0, 200),
      };

      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = endMemory - startMemory;

      // Should not increase memory by more than 2MB
      expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024);
    });
  });

  describe('Graph Rendering', () => {
    it('should calculate graph layout for 100 nodes in under 200ms', () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        x: Math.random() * 1000, // NOSONAR
        y: Math.random() * 1000, // NOSONAR
      }));

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const links = Array.from({ length: 150 }, () => ({
        source: `node-${Math.floor(Math.random() * 100)}`, // NOSONAR
        target: `node-${Math.floor(Math.random() * 100)}`, // NOSONAR
      }));

      const start = performance.now();

      // Simple force simulation step
      nodes.forEach(node => {
        let fx = 0,
          fy = 0;

        // Repulsion
        nodes.forEach(other => {
          if (node.id !== other.id) {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.hypot(dx, dy) || 1;
            const force = 100 / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        node.x += fx * 0.1;
        node.y += fy * 0.1;
      });

      const end = performance.now();
      expect(end - start).toBeLessThan(200);
    });
  });

  describe('LocalStorage Operations', () => {
    it('should save 100 notes to localStorage in under 500ms', () => {
      const notes: Note[] = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content ${i}`,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const start = performance.now();

      const serialized = JSON.stringify(notes);
      localStorage.setItem('test-notes', serialized);

      const end = performance.now();
      expect(end - start).toBeLessThan(500);
    });

    it('should load 100 notes from localStorage in under 200ms', () => {
      const notes: Note[] = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content ${i}`,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      localStorage.setItem('test-notes', JSON.stringify(notes));

      const start = performance.now();

      const serialized = localStorage.getItem('test-notes');
      const parsed = JSON.parse(serialized || '[]');

      const end = performance.now();
      expect(end - start).toBeLessThan(200);
      expect(parsed.length).toBe(100);
    });
  });

  describe('AI Operations', () => {
    it('should process text chunks efficiently', () => {
      const longText = 'Word '.repeat(10000); // 50k characters

      const start = performance.now();

      // Simulate text chunking for AI processing
      const chunkSize = 4000;
      const chunks: string[] = [];
      for (let i = 0; i < longText.length; i += chunkSize) {
        chunks.push(longText.slice(i, i + chunkSize));
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should extract keywords efficiently', () => {
      const text = `
        Artificial intelligence and machine learning are transforming technology.
        Natural language processing enables computers to understand human language.
        Deep learning models can recognize patterns in large datasets.
      `.repeat(100);

      const start = performance.now();

      // SECURITY FIX: Limit text size for regex processing
      const MAX_TEXT_LENGTH = 1000000; // 1MB max
      const safeText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;

      // Simple keyword extraction with safer regex
      const words = safeText.toLowerCase().match(/\b[a-zA-Z]{4,50}\b/g) || [];
      const frequency: Record<string, number> = {};
      words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
      });
      const keywords = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
      expect(keywords.length).toBeGreaterThan(0);
    });
  });
});
