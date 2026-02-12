// Copyright (c) 2025 Jema Technology.
// Tests for AIPanel component

import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AIPanel from '@/components/ai/AIPanel'
import type { Note } from '@/types'

import { render, screen, waitFor } from '@/tests/utils/test-utils'

// Mock aiService
vi.mock('@/services/ai/mistralService', () => ({
  aiService: {
    summarize: vi.fn().mockResolvedValue('Generated summary'),
    saveSummaryToHistory: vi.fn().mockResolvedValue(undefined),
    getSummaryHistory: vi.fn().mockResolvedValue([]),
    generateTags: vi.fn().mockResolvedValue(['tag1', 'tag2', 'tag3']),
    generateIdeas: vi.fn().mockResolvedValue(['Idea 1', 'Idea 2', 'Idea 3']),
    synthesizeNotes: vi.fn().mockResolvedValue('Synthesized content'),
  },
}))

// Mock linkDetectionService
vi.mock('@/services/linkDetectionService', () => ({
  linkDetectionService: {
    detectLinks: vi.fn().mockResolvedValue([
      {
        targetNoteId: 'note-2',
        targetNoteTitle: 'Related Note',
        confidence: 85,
        reason: 'Similar keywords',
        keywords: ['keyword1', 'keyword2'],
      },
    ]),
  },
}))

describe('AIPanel', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Test Note 1',
      content: 'Content of note 1',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'note-2',
      title: 'Test Note 2',
      content: 'Content of note 2',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  const defaultProps = {
    currentNote: mockNotes[0],
    notes: mockNotes,
    onClose: vi.fn(),
    onCreateNote: vi.fn().mockResolvedValue(undefined),
    onUpdateNoteTags: vi.fn(),
    onUpdateNoteContent: vi.fn(),
    onNavigateToNote: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render panel header', () => {
      render(<AIPanel {...defaultProps} />)
      expect(screen.getByText('Assistant IA')).toBeInTheDocument()
    })

    it('should render close button', () => {
      render(<AIPanel {...defaultProps} />)
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument()
    })

    it('should render all tabs', () => {
      render(<AIPanel {...defaultProps} />)
      expect(screen.getByText('Résumés')).toBeInTheDocument()
      expect(screen.getByText('Tags')).toBeInTheDocument()
      expect(screen.getByText('Liens')).toBeInTheDocument()
      expect(screen.getByText('Idées')).toBeInTheDocument()
      expect(screen.getByText('Synthèse')).toBeInTheDocument()
    })

    it('should default to summary tab', () => {
      render(<AIPanel {...defaultProps} />)
      expect(screen.getByText('Type de résumé')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to tags tab', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)

      const tagsTab = screen.getByText('Tags')
      await user.click(tagsTab)

      expect(screen.getByText('Générer des tags')).toBeInTheDocument()
    })

    it('should switch to links tab', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)

      const linksTab = screen.getByText('Liens')
      await user.click(linksTab)

      expect(screen.getByText('Détecter les liens')).toBeInTheDocument()
    })

    it('should switch to brainstorm tab', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)

      const brainstormTab = screen.getByText('Idées')
      await user.click(brainstormTab)

      expect(screen.getByText('Sujet de brainstorming')).toBeInTheDocument()
    })

    it('should switch to synthesis tab', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)

      const synthesisTab = screen.getByText('Synthèse')
      await user.click(synthesisTab)

      expect(screen.getByText('Sélectionner les notes')).toBeInTheDocument()
    })
  })

  describe('Summary Tab', () => {
    it('should have summary type selector', () => {
      render(<AIPanel {...defaultProps} />)
      expect(screen.getByText('Type de résumé')).toBeInTheDocument()
    })

    it('should have generate summary button', () => {
      render(<AIPanel {...defaultProps} />)
      expect(screen.getByText('Générer un résumé')).toBeInTheDocument()
    })

    it('should generate summary on button click', async () => {
      const user = userEvent.setup()
      const { aiService } = await import('@/services/ai/mistralService')

      render(<AIPanel {...defaultProps} />)

      const generateButton = screen.getByText('Générer un résumé')
      await user.click(generateButton)

      await waitFor(() => {
        expect(aiService.summarize).toHaveBeenCalledWith(
          defaultProps.currentNote?.content,
          'detailed'
        )
      })
    })

    it('should display generated summary', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)

      const generateButton = screen.getByText('Générer un résumé')
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Generated summary')).toBeInTheDocument()
      })
    })

    it('should create note from summary', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)

      await user.click(screen.getByText('Générer un résumé'))
      await waitFor(() => {
        expect(screen.getByText('Créer une note')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Créer une note'))

      await waitFor(() => {
        expect(defaultProps.onCreateNote).toHaveBeenCalledWith(
          'Résumé - Test Note 1',
          'Generated summary'
        )
      })
    })

    it('should change summary type', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'short')

      expect(select).toHaveValue('short')
    })
  })

  describe('Tags Tab', () => {
    it('should generate tags', async () => {
      const user = userEvent.setup()
      const { aiService } = await import('@/services/ai/mistralService')

      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Tags'))

      const generateButton = screen.getByText('Générer des tags')
      await user.click(generateButton)

      await waitFor(() => {
        expect(aiService.generateTags).toHaveBeenCalledWith(
          defaultProps.currentNote?.content,
          8
        )
      })
    })

    it('should display suggested tags', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Tags'))

      await user.click(screen.getByText('Générer des tags'))

      await waitFor(() => {
        expect(screen.getByText('#tag1')).toBeInTheDocument()
        expect(screen.getByText('#tag2')).toBeInTheDocument()
        expect(screen.getByText('#tag3')).toBeInTheDocument()
      })
    })

    it('should apply tags to note', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Tags'))

      await user.click(screen.getByText('Générer des tags'))
      await waitFor(() => {
        expect(screen.getByText('Appliquer les tags')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Appliquer les tags'))

      expect(defaultProps.onUpdateNoteTags).toHaveBeenCalled()
    })
  })

  describe('Links Tab', () => {
    it('should detect links', async () => {
      const user = userEvent.setup()
      const { linkDetectionService } = await import('@/services/linkDetectionService')

      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Liens'))

      const detectButton = screen.getByText('Détecter les liens')
      await user.click(detectButton)

      await waitFor(() => {
        expect(linkDetectionService.detectLinks).toHaveBeenCalledWith(
          defaultProps.currentNote,
          defaultProps.notes
        )
      })
    })

    it('should display link suggestions', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Liens'))

      await user.click(screen.getByText('Détecter les liens'))

      await waitFor(() => {
        expect(screen.getByText('Related Note')).toBeInTheDocument()
      })
    })

    it('should navigate to linked note', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Liens'))

      await user.click(screen.getByText('Détecter les liens'))
      await waitFor(() => {
        expect(screen.getByText('Related Note')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Related Note'))

      expect(defaultProps.onNavigateToNote).toHaveBeenCalledWith('note-2')
    })

    it('should show confidence percentage', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Liens'))

      await user.click(screen.getByText('Détecter les liens'))

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument()
      })
    })
  })

  describe('Brainstorm Tab', () => {
    it('should have topic input', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Idées'))

      expect(screen.getByPlaceholderText('Test Note 1')).toBeInTheDocument()
    })

    it('should generate ideas', async () => {
      const user = userEvent.setup()
      const { aiService } = await import('@/services/ai/mistralService')

      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Idées'))

      const generateButton = screen.getByText('Générer des idées')
      await user.click(generateButton)

      await waitFor(() => {
        expect(aiService.generateIdeas).toHaveBeenCalledWith(
          'Test Note 1',
          'Content of note 1'
        )
      })
    })

    it('should display generated ideas', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Idées'))

      await user.click(screen.getByText('Générer des idées'))

      await waitFor(() => {
        expect(screen.getByText('Idea 1')).toBeInTheDocument()
        expect(screen.getByText('Idea 2')).toBeInTheDocument()
      })
    })

    it('should create note from idea', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Idées'))

      await user.click(screen.getByText('Générer des idées'))
      await waitFor(() => {
        expect(screen.getByText('Créer une note')).toBeInTheDocument()
      })

      const createButtons = screen.getAllByText('Créer une note')
      await user.click(createButtons[0])

      expect(defaultProps.onCreateNote).toHaveBeenCalled()
    })
  })

  describe('Synthesis Tab', () => {
    it('should show note selection checkboxes', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Synthèse'))

      expect(screen.getByText('Test Note 1')).toBeInTheDocument()
      expect(screen.getByText('Test Note 2')).toBeInTheDocument()
    })

    it('should select notes for synthesis', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Synthèse'))

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      const synthesizeButton = screen.getByText(/Synthétiser/)
      expect(synthesizeButton).not.toBeDisabled()
    })

    it('should generate synthesis', async () => {
      const user = userEvent.setup()
      const { aiService } = await import('@/services/ai/mistralService')

      render(<AIPanel {...defaultProps} />)
      await user.click(screen.getByText('Synthèse'))

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      const synthesizeButton = screen.getByText(/Synthétiser/)
      await user.click(synthesizeButton)

      await waitFor(() => {
        expect(aiService.synthesizeNotes).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error when no note selected', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} currentNote={null} />)

      const generateButton = screen.getByText('Générer un résumé')
      await user.click(generateButton)

      expect(screen.getByText('Aucune note sélectionnée ou note vide')).toBeInTheDocument()
    })

    it('should display API error messages', async () => {
      const user = userEvent.setup()
      const { aiService } = await import('@/services/ai/mistralService')
      ;(aiService.summarize as any).mockRejectedValue(new Error('API Error'))

      render(<AIPanel {...defaultProps} />)

      await user.click(screen.getByText('Générer un résumé'))

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during summary generation', async () => {
      const user = userEvent.setup()
      const { aiService } = await import('@/services/ai/mistralService')
      ;(aiService.summarize as any).mockImplementation(() => new Promise(() => {}))

      render(<AIPanel {...defaultProps} />)

      await user.click(screen.getByText('Générer un résumé'))

      expect(screen.getByText('Génération...')).toBeInTheDocument()
    })

    it('should disable buttons during loading', async () => {
      const user = userEvent.setup()
      const { aiService } = await import('@/services/ai/mistralService')
      ;(aiService.summarize as any).mockImplementation(() => new Promise(() => {}))

      render(<AIPanel {...defaultProps} />)

      const generateButton = screen.getByText('Générer un résumé')
      await user.click(generateButton)

      expect(generateButton).toBeDisabled()
    })
  })

  describe('Closing', () => {
    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup()
      render(<AIPanel {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: '' })
      await user.click(closeButton)

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Styling', () => {
    it('should have fixed positioning', () => {
      render(<AIPanel {...defaultProps} />)
      const panel = screen.getByText('Assistant IA').closest('div[class*="fixed"]')
      expect(panel).toHaveClass('fixed', 'right-0', 'top-0')
    })

    it('should have correct width', () => {
      render(<AIPanel {...defaultProps} />)
      const panel = screen.getByText('Assistant IA').closest('div[class*="fixed"]')
      expect(panel).toHaveClass('w-full', 'sm:w-[400px]')
    })

    it('should have dark mode support', () => {
      render(<AIPanel {...defaultProps} />)
      const panel = screen.getByText('Assistant IA').closest('div[class*="fixed"]')
      expect(panel).toHaveClass('dark:bg-gray-900')
    })
  })
})
