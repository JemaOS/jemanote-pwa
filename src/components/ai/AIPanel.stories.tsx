// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Meta, StoryObj } from '@storybook/react'

import { ThemeProvider } from '@/contexts/ThemeContext'
import { Note } from '@/types'

import AIPanel from './AIPanel'

const meta: Meta<typeof AIPanel> = {
  title: 'AI/AIPanel',
  component: AIPanel,
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      delay: 300,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="h-screen w-96">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AIPanel>

const mockNote: Note = {
  id: 'note-1',
  user_id: 'user-123',
  title: 'Note de démonstration',
  content: `Ceci est une note de démonstration pour tester les fonctionnalités IA.

Elle contient plusieurs paragraphes avec des idées intéressantes sur différents sujets.

## Points clés

- Premier point important
- Deuxième point à retenir
- Troisième observation

## Conclusion

Cette note montre comment l'IA peut aider à résumer et analyser le contenu.`,
  is_pinned: false,
  is_archived: false,
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
}

const mockNotes: Note[] = [
  mockNote,
  {
    id: 'note-2',
    user_id: 'user-123',
    title: 'Deuxième note',
    content: 'Contenu de la deuxième note.',
    is_pinned: false,
    is_archived: false,
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
  {
    id: 'note-3',
    user_id: 'user-123',
    title: 'Troisième note',
    content: 'Contenu de la troisième note.',
    is_pinned: false,
    is_archived: false,
    created_at: '2025-01-13T10:00:00Z',
    updated_at: '2025-01-13T10:00:00Z',
  },
]

const defaultProps = {
  currentNote: mockNote,
  notes: mockNotes,
  onClose: () => {},
  onCreateNote: async () => {},
  onUpdateNoteTags: () => {},
  onUpdateNoteContent: () => {},
  onNavigateToNote: () => {},
}

export const Default: Story = {
  args: defaultProps,
}

export const NoCurrentNote: Story = {
  args: {
    ...defaultProps,
    currentNote: null,
  },
}

export const EmptyNotes: Story = {
  args: {
    ...defaultProps,
    notes: [],
  },
}

export const LongNote: Story = {
  args: {
    ...defaultProps,
    currentNote: {
      ...mockNote,
      content: Array.from({ length: 50 }, (_, i) => `Paragraphe ${i + 1} avec du contenu intéressant à analyser.`).join('\n\n'),
    },
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
      is_pinned: false,
      is_archived: false,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    })),
  },
}
