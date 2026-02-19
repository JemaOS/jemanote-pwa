// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { Note, Folder } from '@/types';

import Sidebar from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      delay: 300,
    },
  },
  decorators: [
    Story => (
      <div className="h-screen w-80">
        <ThemeProvider>
          <Story />
        </ThemeProvider>
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

const mockNotes: Note[] = [
  {
    id: 'note-1',
    user_id: 'user-123',
    title: 'Note importante',
    content: 'Contenu de la note',
    is_pinned: true,
    is_archived: false,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'note-2',
    user_id: 'user-123',
    title: 'Idées de projet',
    content: 'Liste des idées',
    is_pinned: false,
    is_archived: false,
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
  {
    id: 'note-3',
    user_id: 'user-123',
    title: 'Réunion équipe',
    content: 'Notes de réunion',
    is_pinned: false,
    is_archived: true,
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
];

const mockFolders: Folder[] = [
  {
    id: 'folder-1',
    user_id: 'user-123',
    name: 'Projets',
    path: '/Projets',
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
  },
  {
    id: 'folder-2',
    user_id: 'user-123',
    name: 'Personnel',
    path: '/Personnel',
    created_at: '2025-01-02T10:00:00Z',
    updated_at: '2025-01-02T10:00:00Z',
  },
];

const defaultProps = {
  side: 'left' as const,
  userId: 'user-123',
  activeNoteId: null as string | null,
  onNoteSelect: () => {},
  notes: mockNotes,
  folders: mockFolders,
  trashNotes: [],
  trashFolders: [],
  createNote: async () => {},
  updateNote: async () => {},
  deleteNote: async () => {},
  restoreNote: async () => {},
  permanentlyDeleteNote: async () => {},
  deleteFolder: async () => {},
  restoreFolder: async () => {},
  permanentlyDeleteFolder: async () => {},
  reloadFolders: async () => {},
};

export const Default: Story = {
  args: defaultProps,
};

export const WithActiveNote: Story = {
  args: {
    ...defaultProps,
    activeNoteId: 'note-1',
  },
};

export const RightSide: Story = {
  args: {
    ...defaultProps,
    side: 'right',
  },
};

export const Empty: Story = {
  args: {
    ...defaultProps,
    notes: [],
    folders: [],
  },
};

export const WithTrash: Story = {
  args: {
    ...defaultProps,
    trashNotes: [
      {
        id: 'trash-1',
        user_id: 'user-123',
        title: 'Note supprimée',
        content: 'Contenu supprimé',
        is_pinned: false,
        is_archived: false,
        deleted_at: '2025-01-10T10:00:00Z',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z',
      },
    ],
  },
};

export const ManyNotes: Story = {
  args: {
    ...defaultProps,
    notes: Array.from({ length: 20 }, (_, i) => ({
      id: `note-${i}`,
      user_id: 'user-123',
      title: `Note ${i + 1}`,
      content: `Contenu de la note ${i + 1}`,
      is_pinned: i < 3,
      is_archived: false,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    })),
  },
};
