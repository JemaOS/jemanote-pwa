// Copyright (c) 2025 Jema Technology.
// Tests for Sidebar component

import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import Sidebar from '@/components/layout/Sidebar'
import type { Note, Folder } from '@/types'

import { render, screen, waitFor } from '@/tests/utils/test-utils'

// Mock LocalStorage
vi.mock('@/lib/localStorage', () => ({
  LocalStorage: {
    getFolders: vi.fn().mockResolvedValue([]),
    saveFolder: vi.fn().mockResolvedValue(undefined),
    deleteFolder: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('Sidebar', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Note 1',
      content: 'Content 1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      folder_id: undefined,
    },
    {
      id: 'note-2',
      title: 'Note 2',
      content: 'Content 2',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      folder_id: 'folder-1',
    },
  ]

  const mockFolders: Folder[] = [
    {
      id: 'folder-1',
      name: 'Test Folder',
      path: '/Test Folder',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const defaultProps = {
    side: 'left' as const,
    userId: 'user-1',
    activeNoteId: null as string | null,
    onNoteSelect: vi.fn(),
    notes: mockNotes,
    folders: mockFolders,
    trashNotes: [],
    trashFolders: [],
    createNote: vi.fn().mockResolvedValue({ data: { id: 'new-note-id' } }),
    updateNote: vi.fn().mockResolvedValue(undefined),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    restoreNote: vi.fn().mockResolvedValue(undefined),
    permanentlyDeleteNote: vi.fn().mockResolvedValue(undefined),
    deleteFolder: vi.fn().mockResolvedValue(undefined),
    restoreFolder: vi.fn().mockResolvedValue(undefined),
    permanentlyDeleteFolder: vi.fn().mockResolvedValue(undefined),
    reloadFolders: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render sidebar with new note button', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Nouvelle note')).toBeInTheDocument()
    })

    it('should render folders section', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Dossiers')).toBeInTheDocument()
    })

    it('should render folder names', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Test Folder')).toBeInTheDocument()
    })

    it('should render note count for folders', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('1')).toBeInTheDocument() // Note count for folder
    })

    it('should render unfiled notes section', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Sans dossier')).toBeInTheDocument()
    })

    it('should render trash section', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Corbeille')).toBeInTheDocument()
    })
  })

  describe('Note Creation', () => {
    it('should create new note when clicking new note button', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      const newNoteButton = screen.getByText('Nouvelle note')
      await user.click(newNoteButton)

      await waitFor(() => {
        expect(defaultProps.createNote).toHaveBeenCalled()
      })
    })

    it('should select new note after creation', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      const newNoteButton = screen.getByText('Nouvelle note')
      await user.click(newNoteButton)

      await waitFor(() => {
        expect(defaultProps.onNoteSelect).toHaveBeenCalledWith('new-note-id')
      })
    })
  })

  describe('Folder Management', () => {
    it('should show folder creation input when clicking new folder', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      const newFolderButton = screen.getByText('Nouveau dossier')
      await user.click(newFolderButton)

      expect(screen.getByPlaceholderText('Nom du dossier...')).toBeInTheDocument()
    })

    it('should create folder on Enter key', async () => {
      const user = userEvent.setup()
      const { LocalStorage } = await import('@/lib/localStorage')

      render(<Sidebar {...defaultProps} />)

      const newFolderButton = screen.getByText('Nouveau dossier')
      await user.click(newFolderButton)

      const input = screen.getByPlaceholderText('Nom du dossier...')
      await user.type(input, 'New Folder')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(LocalStorage.saveFolder).toHaveBeenCalled()
      })
    })

    it('should cancel folder creation on Escape key', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      const newFolderButton = screen.getByText('Nouveau dossier')
      await user.click(newFolderButton)

      const input = screen.getByPlaceholderText('Nom du dossier...')
      await user.type(input, 'New Folder')
      await user.keyboard('{Escape}')

      expect(screen.queryByPlaceholderText('Nom du dossier...')).not.toBeInTheDocument()
    })

    it('should expand/collapse folder when clicking chevron', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      const folderName = screen.getByText('Test Folder')
      await user.click(folderName)

      // Folder should expand and show notes
      expect(screen.getByText('Note 2')).toBeInTheDocument()
    })

    it('should rename folder when clicking edit button', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      // First expand the folder
      const folderName = screen.getByText('Test Folder')
      await user.click(folderName)

      // Find and click edit button
      const editButton = screen.getByTitle('Renommer')
      await user.click(editButton)

      const input = screen.getByDisplayValue('Test Folder')
      await user.clear(input)
      await user.type(input, 'Renamed Folder')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Renamed Folder')).toBeInTheDocument()
      })
    })
  })

  describe('Note Selection', () => {
    it('should call onNoteSelect when clicking a note', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      // Expand unfiled notes
      const unfiledSection = screen.getByText('Sans dossier')
      await user.click(unfiledSection)

      const note = screen.getByText('Note 1')
      await user.click(note)

      expect(defaultProps.onNoteSelect).toHaveBeenCalledWith('note-1')
    })

    it('should highlight active note', () => {
      render(<Sidebar {...defaultProps} activeNoteId="note-1" />)
      const noteElement = screen.getByText('Note 1')
      expect(noteElement.closest('button')).toHaveClass('bg-primary-100')
    })
  })

  describe('Note Editing', () => {
    it('should start editing note title when clicking edit', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      // Expand unfiled notes
      const unfiledSection = screen.getByText('Sans dossier')
      await user.click(unfiledSection)

      // Find edit button and click
      const editButtons = screen.getAllByTitle('Renommer')
      await user.click(editButtons[0])

      const input = screen.getByDisplayValue('Note 1')
      expect(input).toBeInTheDocument()
    })

    it('should save note title on Enter', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      // Expand unfiled notes
      const unfiledSection = screen.getByText('Sans dossier')
      await user.click(unfiledSection)

      const editButtons = screen.getAllByTitle('Renommer')
      await user.click(editButtons[0])

      const input = screen.getByDisplayValue('Note 1')
      await user.clear(input)
      await user.type(input, 'Updated Note')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(defaultProps.updateNote).toHaveBeenCalledWith('note-1', { title: 'Updated Note' })
      })
    })
  })

  describe('Note Deletion', () => {
    it('should show confirmation before deleting note', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<Sidebar {...defaultProps} />)

      // Expand unfiled notes
      const unfiledSection = screen.getByText('Sans dossier')
      await user.click(unfiledSection)

      const deleteButtons = screen.getAllByTitle('Supprimer')
      await user.click(deleteButtons[0])

      expect(globalThis.confirm).toHaveBeenCalled()
    })

    it('should delete note after confirmation', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<Sidebar {...defaultProps} />)

      // Expand unfiled notes
      const unfiledSection = screen.getByText('Sans dossier')
      await user.click(unfiledSection)

      const deleteButtons = screen.getAllByTitle('Supprimer')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(defaultProps.deleteNote).toHaveBeenCalled()
      })
    })
  })

  describe('Trash Management', () => {
    it('should expand trash when clicking', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      const trashButton = screen.getByText('Corbeille')
      await user.click(trashButton)

      expect(screen.getByText('Corbeille vide')).toBeInTheDocument()
    })

    it('should show deleted items in trash', async () => {
      const user = userEvent.setup()
      const trashNotes = [{
        id: 'deleted-note',
        title: 'Deleted Note',
        content: 'Content',
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]

      render(<Sidebar {...defaultProps} trashNotes={trashNotes} />)

      const trashButton = screen.getByText('Corbeille')
      await user.click(trashButton)

      expect(screen.getByText('Deleted Note')).toBeInTheDocument()
    })

    it('should restore note from trash', async () => {
      const user = userEvent.setup()
      const trashNotes = [{
        id: 'deleted-note',
        title: 'Deleted Note',
        content: 'Content',
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]

      render(<Sidebar {...defaultProps} trashNotes={trashNotes} />)

      const trashButton = screen.getByText('Corbeille')
      await user.click(trashButton)

      const restoreButton = screen.getByTitle('Restaurer')
      await user.click(restoreButton)

      await waitFor(() => {
        expect(defaultProps.restoreNote).toHaveBeenCalledWith('deleted-note')
      })
    })
  })

  describe('Multi-select', () => {
    it('should toggle selection mode for folders', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      const selectButton = screen.getByTitle('Mode sélection')
      await user.click(selectButton)

      expect(screen.getByTitle('Quitter le mode sélection')).toBeInTheDocument()
    })

    it('should select/deselect folders in selection mode', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      // Enable selection mode
      const selectButton = screen.getByTitle('Mode sélection')
      await user.click(selectButton)

      // Find checkbox and click
      const checkbox = screen.getByRole('button', { name: '' })
      await user.click(checkbox)

      // Delete button should appear
      expect(screen.getByText('Supprimer (1)')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag start on note', async () => {
      const user = userEvent.setup()
      render(<Sidebar {...defaultProps} />)

      // Expand unfiled notes
      const unfiledSection = screen.getByText('Sans dossier')
      await user.click(unfiledSection)

      const note = screen.getByText('Note 1')
      await user.pointer([
        { keys: '[MouseLeft>]', target: note },
        { coords: { x: 100, y: 100 } },
      ])
    })
  })

  describe('Right Sidebar', () => {
    it('should render metadata panel for right sidebar', () => {
      render(<Sidebar {...defaultProps} side="right" />)
      expect(screen.getByText('Métadonnées')).toBeInTheDocument()
    })

    it('should show note ID in right sidebar', () => {
      render(<Sidebar {...defaultProps} side="right" activeNoteId="note-123" />)
      expect(screen.getByText('ID de la note')).toBeInTheDocument()
      expect(screen.getByText('note-123')).toBeInTheDocument()
    })

    it('should show empty state when no note selected in right sidebar', () => {
      render(<Sidebar {...defaultProps} side="right" activeNoteId={null} />)
      expect(screen.getByText('Sélectionnez une note pour voir les détails')).toBeInTheDocument()
    })
  })
})
