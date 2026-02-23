// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

export interface Note {
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
}

export interface Folder {
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
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface NoteTag {
  id: string;
  note_id: string;
  tag_id: string;
  created_at: string;
}

export interface Link {
  id: string;
  user_id: string;
  source_note_id: string;
  target_note_id: string;
  link_type: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  user_id: string;
  note_id?: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

export interface UserSettings {
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
}

export interface User {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export type ViewMode = 'workspace' | 'search' | 'settings' | 'timeline';
