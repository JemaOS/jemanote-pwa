// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react'

import { ThemeProvider } from '@/contexts/ThemeContext'
import { Note, ViewMode } from '@/types'

import CommandPalette from './CommandPalette'

const meta: Meta<typeof CommandPalette> = {
  title: 'Command/CommandPalette',
  component: CommandPalette,
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      delay: 300,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CommandPalette>

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
    is_archived: false,
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
]

const defaultProps = {
  open: true,
  onClose: () => {},
  notes: mockNotes,
  currentView: 'workspace' as ViewMode,
  onViewChange: () => {},
  onNoteSelect: () => {},
  onCreateNote: () => {},
  onShowAuth: () => {},
  user: null,
  onSignOut: () => {},
}

export const Default: Story = {
  args: defaultProps,
}

export const WithUser: Story = {
  args: {
    ...defaultProps,
    user: {
      id: 'user-123',
      email: 'user@example.com',
    },
  },
}

export const WithSearch: Story = {
  args: {
    ...defaultProps,
  },
  play: async ({ canvasElement }) => {
    // Simuler la saisie dans la recherche
    const input = canvasElement.querySelector('input')
    if (input) {
      input.value = 'note'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  },
}

export const EmptyNotes: Story = {
  args: {
    ...defaultProps,
    notes: [],
  },
}

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
}

export const GraphView: Story = {
  args: {
    ...defaultProps,
    currentView: 'graph',
  },
}

export const SettingsView: Story = {
  args: {
    ...defaultProps,
    currentView: 'settings',
  },
}

export const Closed: Story = {
  args: {
    ...defaultProps,
    open: false,
  },
}
