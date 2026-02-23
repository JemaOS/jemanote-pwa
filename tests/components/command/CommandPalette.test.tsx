// Copyright (c) 2025 Jema Technology.
// Tests for CommandPalette component

import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CommandPalette from '@/components/command/CommandPalette';
import type { Note, ViewMode } from '@/types';

import { render, screen } from '@/tests/utils/test-utils';

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

describe('CommandPalette', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      title: 'First Note',
      content: 'Content of first note',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'note-2',
      title: 'Second Note',
      content: 'Content of second note',
      user_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    notes: mockNotes,
    currentView: 'workspace' as ViewMode,
    onViewChange: vi.fn(),
    onNoteSelect: vi.fn(),
    onCreateNote: vi.fn(),
    onShowAuth: vi.fn(),
    user: null,
    onSignOut: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(<CommandPalette {...defaultProps} open={false} />);
      expect(
        screen.queryByPlaceholderText('Rechercher des commandes ou des notes...')
      ).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(
        screen.getByPlaceholderText('Rechercher des commandes ou des notes...')
      ).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render actions section', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render views section', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('Vues')).toBeInTheDocument();
    });

    it('should render notes section', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should filter commands based on search', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Rechercher des commandes ou des notes...');
      await user.type(searchInput, 'workspace');

      expect(screen.getByText('Espace de travail')).toBeInTheDocument();
    });

    it('should show empty state when no results', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Rechercher des commandes ou des notes...');
      await user.type(searchInput, 'xyznonexistent');

      expect(screen.getByText('Aucun résultat trouvé')).toBeInTheDocument();
    });

    it('should clear search on close', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CommandPalette {...defaultProps} onClose={onClose} />);

      const searchInput = screen.getByPlaceholderText('Rechercher des commandes ou des notes...');
      await user.type(searchInput, 'test');

      // Close by pressing Escape
      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('should render create note action', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('Créer une nouvelle note')).toBeInTheDocument();
    });

    it('should render toggle theme action', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('Basculer en mode sombre')).toBeInTheDocument();
    });

    it('should call onCreateNote when selecting create note', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const createNoteAction = screen.getByText('Créer une nouvelle note');
      await user.click(createNoteAction);

      expect(defaultProps.onCreateNote).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call toggleTheme when selecting theme toggle', async () => {
      const user = userEvent.setup();
      const { useTheme } = await import('@/contexts/ThemeContext');
      const toggleTheme = vi.fn();
      (useTheme as any).mockReturnValue({ theme: 'light', toggleTheme });

      render(<CommandPalette {...defaultProps} />);

      const themeAction = screen.getByText('Basculer en mode sombre');
      await user.click(themeAction);

      expect(toggleTheme).toHaveBeenCalled();
    });
  });

  describe('Authentication Actions', () => {
    it('should show login action when user is not authenticated', () => {
      render(<CommandPalette {...defaultProps} user={null} />);
      expect(screen.getByText('Se connecter')).toBeInTheDocument();
    });

    it('should show logout action when user is authenticated', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      render(<CommandPalette {...defaultProps} user={mockUser} />);
      expect(screen.getByText('Se déconnecter')).toBeInTheDocument();
    });

    it('should call onShowAuth when selecting login', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} user={null} />);

      const loginAction = screen.getByText('Se connecter');
      await user.click(loginAction);

      expect(defaultProps.onShowAuth).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should call onSignOut when selecting logout', async () => {
      const user = userEvent.setup();
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      render(<CommandPalette {...defaultProps} user={mockUser} />);

      const logoutAction = screen.getByText('Se déconnecter');
      await user.click(logoutAction);

      expect(defaultProps.onSignOut).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('View Navigation', () => {
    it('should render all view options', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('Espace de travail')).toBeInTheDocument();
      expect(screen.getByText('Graphe de connaissances')).toBeInTheDocument();
      expect(screen.getByText('Canvas')).toBeInTheDocument();
      expect(screen.getByText('Chronologie')).toBeInTheDocument();
      expect(screen.getByText('Recherche')).toBeInTheDocument();
      expect(screen.getByText('Paramètres')).toBeInTheDocument();
    });

    it('should highlight current view', () => {
      render(<CommandPalette {...defaultProps} currentView="workspace" />);
      expect(screen.getByText('Espace de travail')).toBeInTheDocument();
      expect(screen.getByText('Actif')).toBeInTheDocument();
    });

    it('should call onViewChange when selecting a view', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const canvasOption = screen.getByText('Canvas');
      await user.click(canvasOption);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith('canvas');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Note Selection', () => {
    it('should render note list', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
    });

    it('should show note preview', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('Content of first note...')).toBeInTheDocument();
    });

    it('should call onNoteSelect when selecting a note', async () => {
      const user = userEvent.setup();
      render(<CommandPalette {...defaultProps} />);

      const firstNote = screen.getByText('First Note');
      await user.click(firstNote);

      expect(defaultProps.onNoteSelect).toHaveBeenCalledWith('note-1');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should limit notes to 10', () => {
      const manyNotes = Array.from({ length: 15 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content ${i}`,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      render(<CommandPalette {...defaultProps} notes={manyNotes} />);
      // Should only show first 10 notes
      expect(screen.getByText('Note 0')).toBeInTheDocument();
      expect(screen.getByText('Note 9')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CommandPalette {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
    });

    it('should close on Cmd+K', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CommandPalette {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Meta>}k{/Meta}');

      expect(onClose).toHaveBeenCalled();
    });

    it('should auto-focus search input', () => {
      render(<CommandPalette {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Rechercher des commandes ou des notes...');
      expect(searchInput).toHaveFocus();
    });
  });

  describe('Backdrop', () => {
    it('should close when clicking backdrop', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CommandPalette {...defaultProps} onClose={onClose} />);

      const backdrop = screen
        .getByPlaceholderText('Rechercher des commandes ou des notes...')
        .closest('div[class*="fixed"]');
      if (backdrop) {
        await user.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('should not close when clicking palette content', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<CommandPalette {...defaultProps} onClose={onClose} />);

      const searchInput = screen.getByPlaceholderText('Rechercher des commandes ou des notes...');
      await user.click(searchInput);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have backdrop blur', () => {
      render(<CommandPalette {...defaultProps} />);
      const backdrop = document.querySelector('.backdrop-blur-sm');
      expect(backdrop).toBeInTheDocument();
    });

    it('should have modal styling', () => {
      render(<CommandPalette {...defaultProps} />);
      const modal = screen
        .getByPlaceholderText('Rechercher des commandes ou des notes...')
        .closest('div[class*="bg-white"]');
      expect(modal).toHaveClass('rounded-lg', 'shadow-modal');
    });

    it('should have dark mode support', () => {
      render(<CommandPalette {...defaultProps} />);
      const modal = screen
        .getByPlaceholderText('Rechercher des commandes ou des notes...')
        .closest('div[class*="bg-white"]');
      expect(modal).toHaveClass('dark:bg-neutral-900');
    });
  });

  describe('Accessibility', () => {
    it('should have search icon', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(document.querySelector('[data-lucide="search"]')).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      render(<CommandPalette {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Rechercher des commandes ou des notes...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should have keyboard shortcut hints', () => {
      render(<CommandPalette {...defaultProps} />);
      expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+Shift+L')).toBeInTheDocument();
    });
  });
});
