import localforage from 'localforage'
import { Note, Folder, Tag, Link, Attachment } from '@/types'

// Configure localforage for better performance
localforage.config({
  name: 'ObsidianPWA',
  version: 1.0,
  storeName: 'notes_store',
  description: 'Local storage for Obsidian PWA notes',
})

const STORES = {
  NOTES: 'notes',
  FOLDERS: 'folders',
  TAGS: 'tags',
  LINKS: 'links',
  SETTINGS: 'settings',
  ATTACHMENTS: 'attachments',
  ATTACHMENT_FILES: 'attachment_files', // Store actual blobs here
}

export class LocalStorage {
  // Notes operations
  static async getNotes(): Promise<Note[]> {
    try {
      const notes = await localforage.getItem<Note[]>(STORES.NOTES)
      return notes || []
    } catch (error) {
      console.error('Error getting notes:', error)
      return []
    }
  }

  static async getNote(id: string): Promise<Note | null> {
    try {
      const notes = await this.getNotes()
      return notes.find((note) => note.id === id) || null
    } catch (error) {
      console.error('Error getting note:', error)
      return null
    }
  }

  static async saveNote(note: Note): Promise<void> {
    try {
      const notes = await this.getNotes()
      const index = notes.findIndex((n) => n.id === note.id)
      
      if (index >= 0) {
        notes[index] = { ...note, updated_at: new Date().toISOString() }
      } else {
        notes.push(note)
      }
      
      await localforage.setItem(STORES.NOTES, notes)
    } catch (error) {
      console.error('Error saving note:', error)
      throw error
    }
  }

  static async deleteNote(id: string): Promise<void> {
    try {
      const notes = await this.getNotes()
      const filtered = notes.filter((note) => note.id !== id)
      await localforage.setItem(STORES.NOTES, filtered)
    } catch (error) {
      console.error('Error deleting note:', error)
      throw error
    }
  }

  // Folders operations
  static async getFolders(): Promise<Folder[]> {
    try {
      const folders = await localforage.getItem<Folder[]>(STORES.FOLDERS)
      return folders || []
    } catch (error) {
      console.error('Error getting folders:', error)
      return []
    }
  }

  static async saveFolder(folder: Folder): Promise<void> {
    try {
      const folders = await this.getFolders()
      const index = folders.findIndex((f) => f.id === folder.id)
      
      if (index >= 0) {
        folders[index] = { ...folder, updated_at: new Date().toISOString() }
      } else {
        folders.push(folder)
      }
      
      await localforage.setItem(STORES.FOLDERS, folders)
    } catch (error) {
      console.error('Error saving folder:', error)
      throw error
    }
  }

  static async deleteFolder(id: string): Promise<void> {
    try {
      const folders = await this.getFolders()
      const filtered = folders.filter((f) => f.id !== id)
      await localforage.setItem(STORES.FOLDERS, filtered)
    } catch (error) {
      console.error('Error deleting folder:', error)
      throw error
    }
  }

  // Tags operations
  static async getTags(): Promise<Tag[]> {
    try {
      const tags = await localforage.getItem<Tag[]>(STORES.TAGS)
      return tags || []
    } catch (error) {
      console.error('Error getting tags:', error)
      return []
    }
  }

  static async saveTag(tag: Tag): Promise<void> {
    try {
      const tags = await this.getTags()
      const index = tags.findIndex((t) => t.id === tag.id)
      
      if (index >= 0) {
        tags[index] = tag
      } else {
        tags.push(tag)
      }
      
      await localforage.setItem(STORES.TAGS, tags)
    } catch (error) {
      console.error('Error saving tag:', error)
      throw error
    }
  }

  // Links operations
  static async getLinks(): Promise<Link[]> {
    try {
      const links = await localforage.getItem<Link[]>(STORES.LINKS)
      return links || []
    } catch (error) {
      console.error('Error getting links:', error)
      return []
    }
  }

  static async saveLink(link: Link): Promise<void> {
    try {
      const links = await this.getLinks()
      const index = links.findIndex((l) => l.id === link.id)
      
      if (index >= 0) {
        links[index] = link
      } else {
        links.push(link)
      }
      
      await localforage.setItem(STORES.LINKS, links)
    } catch (error) {
      console.error('Error saving link:', error)
      throw error
    }
  }

  static async updateLinksForNote(noteId: string, linkedNoteTitles: string[]): Promise<void> {
    try {
      const notes = await this.getNotes()
      const links = await this.getLinks()
      
      // Get the note to find user_id
      const note = notes.find((n) => n.id === noteId)
      if (!note) return
      
      // Remove old links from this note
      const filteredLinks = links.filter((l) => l.source_note_id !== noteId)
      
      // Create new links
      const newLinks: Link[] = []
      for (const title of linkedNoteTitles) {
        const targetNote = notes.find((n) => n.title === title)
        if (targetNote) {
          newLinks.push({
            id: crypto.randomUUID(),
            user_id: note.user_id,
            source_note_id: noteId,
            target_note_id: targetNote.id,
            link_type: 'wiki',
            created_at: new Date().toISOString(),
          })
        }
      }
      
      // Save updated links
      await localforage.setItem(STORES.LINKS, [...filteredLinks, ...newLinks])
    } catch (error) {
      console.error('Error updating links:', error)
      throw error
    }
  }

  // Settings operations
  static async getSettings(): Promise<any> {
    try {
      const settings = await localforage.getItem(STORES.SETTINGS)
      return settings || {}
    } catch (error) {
      console.error('Error getting settings:', error)
      return {}
    }
  }

  static async saveSettings(settings: any): Promise<void> {
    try {
      await localforage.setItem(STORES.SETTINGS, settings)
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  // Attachments operations
  static async getAttachments(noteId?: string): Promise<Attachment[]> {
    try {
      const attachments = await localforage.getItem<Attachment[]>(STORES.ATTACHMENTS) || []
      if (noteId) {
        return attachments.filter(a => a.note_id === noteId)
      }
      return attachments
    } catch (error) {
      console.error('Error getting attachments:', error)
      return []
    }
  }

  static async saveAttachment(attachment: Attachment, file?: Blob): Promise<void> {
    try {
      // Save metadata
      const attachments = await this.getAttachments()
      const index = attachments.findIndex(a => a.id === attachment.id)
      
      if (index >= 0) {
        attachments[index] = attachment
      } else {
        attachments.push(attachment)
      }
      await localforage.setItem(STORES.ATTACHMENTS, attachments)

      // Save file content if provided
      if (file) {
        await localforage.setItem(`${STORES.ATTACHMENT_FILES}_${attachment.id}`, file)
      }
    } catch (error) {
      console.error('Error saving attachment:', error)
      throw error
    }
  }

  static async getAttachmentFile(attachmentId: string): Promise<Blob | null> {
    try {
      return await localforage.getItem<Blob>(`${STORES.ATTACHMENT_FILES}_${attachmentId}`)
    } catch (error) {
      console.error('Error getting attachment file:', error)
      return null
    }
  }

  static async deleteAttachment(id: string): Promise<void> {
    try {
      const attachments = await this.getAttachments()
      const filtered = attachments.filter(a => a.id !== id)
      await localforage.setItem(STORES.ATTACHMENTS, filtered)
      await localforage.removeItem(`${STORES.ATTACHMENT_FILES}_${id}`)
    } catch (error) {
      console.error('Error deleting attachment:', error)
      throw error
    }
  }

  // Generic item operations
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await localforage.getItem<T>(key)
      return value
    } catch (error) {
      console.error(`Error getting item ${key}:`, error)
      return null
    }
  }

  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await localforage.setItem(key, value)
    } catch (error) {
      console.error(`Error setting item ${key}:`, error)
      throw error
    }
  }

  // Clear all data
  static async clearAll(): Promise<void> {
    try {
      await localforage.clear()
    } catch (error) {
      console.error('Error clearing storage:', error)
      throw error
    }
  }
}
