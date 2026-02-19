// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import localforage from 'localforage';

import { Note, Folder, Tag, Link, Attachment } from '@/types';

// Configure localforage for better performance
localforage.config({
  name: 'ObsidianPWA',
  version: 1,
  storeName: 'notes_store',
  description: 'Local storage for Obsidian PWA notes',
});

const STORES = {
  NOTES: 'notes',
  FOLDERS: 'folders',
  TAGS: 'tags',
  LINKS: 'links',
  SETTINGS: 'settings',
  ATTACHMENTS: 'attachments',
  ATTACHMENT_FILES: 'attachment_files', // Store actual blobs here
};

// Synchronous localStorage keys for instant persistence
const SYNC_KEYS = {
  NOTES: 'obsidian_pwa_notes_sync',
  PENDING_WRITES: 'obsidian_pwa_pending_writes',
};

// Helper: Synchronously save notes to localStorage (instant, survives browser close)
function syncSaveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(SYNC_KEYS.NOTES, JSON.stringify(notes));
  } catch (error) {
    // localStorage might be full or disabled, log but don't throw
    console.warn('Sync localStorage save failed:', error);
  }
}

// Helper: Synchronously read notes from localStorage
function syncGetNotes(): Note[] | null {
  try {
    const data = localStorage.getItem(SYNC_KEYS.NOTES);
    if (data) {
      return JSON.parse(data) as Note[];
    }
  } catch (error) {
    console.warn('Sync localStorage read failed:', error);
  }
  return null;
}

// Helper: Synchronously save a single note update (for instant persistence)
function syncSaveNote(note: Note): void {
  try {
    const notes = syncGetNotes() || [];
    const index = notes.findIndex(n => n.id === note.id);

    if (index >= 0) {
      notes[index] = note;
    } else {
      notes.push(note);
    }

    syncSaveNotes(notes);
  } catch (error) {
    console.warn('Sync localStorage note save failed:', error);
  }
}

// Helper: Synchronously delete a note from localStorage
function syncDeleteNote(noteId: string): void {
  try {
    const notes = syncGetNotes() || [];
    const filtered = notes.filter(n => n.id !== noteId);
    syncSaveNotes(filtered);
  } catch (error) {
    console.warn('Sync localStorage note delete failed:', error);
  }
}

export class LocalStorage {
  // Notes operations
  static async getNotes(): Promise<Note[]> {
    try {
      // First try to get from async IndexedDB (source of truth for large data)
      const notes = await localforage.getItem<Note[]>(STORES.NOTES);

      if (notes && notes.length > 0) {
        // Sync to localStorage for instant access next time
        syncSaveNotes(notes);
        return notes;
      }

      // Fallback: check synchronous localStorage (may have more recent data)
      const syncNotes = syncGetNotes();
      if (syncNotes && syncNotes.length > 0) {
        // Restore to IndexedDB in background
        localforage.setItem(STORES.NOTES, syncNotes).catch(console.error);
        return syncNotes;
      }

      return [];
    } catch (error) {
      console.error('Error getting notes:', error);
      // Fallback to sync localStorage on error
      return syncGetNotes() || [];
    }
  }

  static async getNote(id: string): Promise<Note | null> {
    try {
      const notes = await this.getNotes();
      return notes.find(note => note.id === id) || null;
    } catch (error) {
      console.error('Error getting note:', error);
      return null;
    }
  }

  // INSTANT SAVE: Synchronously saves to localStorage first, then async to IndexedDB
  static async saveNote(note: Note): Promise<void> {
    const noteWithTimestamp = { ...note, updated_at: new Date().toISOString() };

    // STEP 1: SYNCHRONOUS - Save to localStorage IMMEDIATELY (survives browser close)
    syncSaveNote(noteWithTimestamp);

    // STEP 2: ASYNC - Save to IndexedDB in background (handles large data better)
    try {
      const notes = (await localforage.getItem<Note[]>(STORES.NOTES)) || [];
      const index = notes.findIndex(n => n.id === note.id);

      if (index >= 0) {
        notes[index] = noteWithTimestamp;
      } else {
        notes.push(noteWithTimestamp);
      }

      await localforage.setItem(STORES.NOTES, notes);
    } catch (error) {
      console.error('Error saving note to IndexedDB:', error);
      // Don't throw - sync localStorage already has the data
    }
  }

  // SYNCHRONOUS ONLY: For truly instant saves that MUST complete before any navigation
  // This is a blocking call that writes to localStorage immediately
  static saveNoteSync(note: Note): void {
    const noteWithTimestamp = { ...note, updated_at: new Date().toISOString() };
    syncSaveNote(noteWithTimestamp);

    // Also trigger async IndexedDB save in background (fire-and-forget)
    this.saveNote(note).catch(console.error);
  }

  static async deleteNote(id: string): Promise<void> {
    // STEP 1: SYNCHRONOUS - Delete from localStorage IMMEDIATELY
    syncDeleteNote(id);

    // STEP 2: ASYNC - Delete from IndexedDB
    try {
      const notes = (await localforage.getItem<Note[]>(STORES.NOTES)) || [];
      const filtered = notes.filter(note => note.id !== id);
      await localforage.setItem(STORES.NOTES, filtered);
    } catch (error) {
      console.error('Error deleting note from IndexedDB:', error);
      // Don't throw - sync localStorage already updated
    }
  }

  // Folders operations
  static async getFolders(): Promise<Folder[]> {
    try {
      const folders = await localforage.getItem<Folder[]>(STORES.FOLDERS);
      return folders || [];
    } catch (error) {
      console.error('Error getting folders:', error);
      return [];
    }
  }

  static async saveFolder(folder: Folder): Promise<void> {
    try {
      const folders = await this.getFolders();
      const index = folders.findIndex(f => f.id === folder.id);

      if (index >= 0) {
        folders[index] = { ...folder, updated_at: new Date().toISOString() };
      } else {
        folders.push(folder);
      }

      await localforage.setItem(STORES.FOLDERS, folders);
    } catch (error) {
      console.error('Error saving folder:', error);
      throw error;
    }
  }

  static async deleteFolder(id: string): Promise<void> {
    try {
      const folders = await this.getFolders();
      const filtered = folders.filter(f => f.id !== id);
      await localforage.setItem(STORES.FOLDERS, filtered);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  // Tags operations
  static async getTags(): Promise<Tag[]> {
    try {
      const tags = await localforage.getItem<Tag[]>(STORES.TAGS);
      return tags || [];
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  static async saveTag(tag: Tag): Promise<void> {
    try {
      const tags = await this.getTags();
      const index = tags.findIndex(t => t.id === tag.id);

      if (index >= 0) {
        tags[index] = tag;
      } else {
        tags.push(tag);
      }

      await localforage.setItem(STORES.TAGS, tags);
    } catch (error) {
      console.error('Error saving tag:', error);
      throw error;
    }
  }

  // Links operations
  static async getLinks(): Promise<Link[]> {
    try {
      const links = await localforage.getItem<Link[]>(STORES.LINKS);
      return links || [];
    } catch (error) {
      console.error('Error getting links:', error);
      return [];
    }
  }

  static async saveLink(link: Link): Promise<void> {
    try {
      const links = await this.getLinks();
      const index = links.findIndex(l => l.id === link.id);

      if (index >= 0) {
        links[index] = link;
      } else {
        links.push(link);
      }

      await localforage.setItem(STORES.LINKS, links);
    } catch (error) {
      console.error('Error saving link:', error);
      throw error;
    }
  }

  static async updateLinksForNote(noteId: string, linkedNoteTitles: string[]): Promise<void> {
    try {
      const notes = await this.getNotes();
      const links = await this.getLinks();

      // Get the note to find user_id
      const note = notes.find(n => n.id === noteId);
      if (!note) {
        return;
      }

      // Remove old links from this note
      const filteredLinks = links.filter(l => l.source_note_id !== noteId);

      // Create new links
      const newLinks: Link[] = [];
      for (const title of linkedNoteTitles) {
        const targetNote = notes.find(n => n.title === title);
        if (targetNote) {
          newLinks.push({
            id: crypto.randomUUID(),
            user_id: note.user_id,
            source_note_id: noteId,
            target_note_id: targetNote.id,
            link_type: 'wiki',
            created_at: new Date().toISOString(),
          });
        }
      }

      // Save updated links
      await localforage.setItem(STORES.LINKS, [...filteredLinks, ...newLinks]);
    } catch (error) {
      console.error('Error updating links:', error);
      throw error;
    }
  }

  // Settings operations
  static async getSettings(): Promise<any> {
    try {
      const settings = await localforage.getItem(STORES.SETTINGS);
      return settings || {};
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  }

  static async saveSettings(settings: any): Promise<void> {
    try {
      // Merge with existing settings
      const existing = await this.getSettings();
      const merged = { ...existing, ...settings };
      await localforage.setItem(STORES.SETTINGS, merged);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Attachments operations
  static async getAttachments(noteId?: string): Promise<Attachment[]> {
    try {
      const attachments = (await localforage.getItem<Attachment[]>(STORES.ATTACHMENTS)) || [];
      if (noteId) {
        return attachments.filter(a => a.note_id === noteId);
      }
      return attachments;
    } catch (error) {
      console.error('Error getting attachments:', error);
      return [];
    }
  }

  static async saveAttachment(attachment: Attachment, file?: Blob): Promise<void> {
    try {
      // Save metadata
      const attachments = await this.getAttachments();
      const index = attachments.findIndex(a => a.id === attachment.id);

      if (index >= 0) {
        attachments[index] = attachment;
      } else {
        attachments.push(attachment);
      }
      await localforage.setItem(STORES.ATTACHMENTS, attachments);

      // Save file content if provided
      if (file) {
        await localforage.setItem(`${STORES.ATTACHMENT_FILES}_${attachment.id}`, file);
      }
    } catch (error) {
      console.error('Error saving attachment:', error);
      throw error;
    }
  }

  static async getAttachmentFile(attachmentId: string): Promise<Blob | null> {
    try {
      return await localforage.getItem<Blob>(`${STORES.ATTACHMENT_FILES}_${attachmentId}`);
    } catch (error) {
      console.error('Error getting attachment file:', error);
      return null;
    }
  }

  static async deleteAttachment(id: string): Promise<void> {
    try {
      const attachments = await this.getAttachments();
      const filtered = attachments.filter(a => a.id !== id);
      await localforage.setItem(STORES.ATTACHMENTS, filtered);
      await localforage.removeItem(`${STORES.ATTACHMENT_FILES}_${id}`);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }

  // Generic item operations
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await localforage.getItem<T>(key);
      return value;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await localforage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw error;
    }
  }

  // Clear all data
  static async clearAll(): Promise<void> {
    try {
      await localforage.clear();
      // Also clear sync localStorage
      try {
        localStorage.removeItem(SYNC_KEYS.NOTES);
        localStorage.removeItem(SYNC_KEYS.PENDING_WRITES);
      } catch (storageError) {
        // Ignore localStorage errors
        console.warn('LocalStorage clear error:', storageError);
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}
