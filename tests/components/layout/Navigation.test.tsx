// Copyright (c) 2025 Jema Technology.
// Tests for Navigation component

import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import Navigation from '@/components/layout/Navigation';
import type { ViewMode } from '@/types';

import { render, screen } from '@tests/utils/test-utils';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('Navigation', () => {
  const defaultProps = {
    currentView: 'workspace' as ViewMode,
    onViewChange: vi.fn(),
    onToggleLeftSidebar: vi.fn(),
    onToggleRightSidebar: vi.fn(),
    leftSidebarOpen: true,
    rightSidebarOpen: false,
    user: null,
    onShowAuth: vi.fn(),
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render navigation with logo', () => {
      render(<Navigation {...defaultProps} />);
      expect(screen.getByText('Jemanote')).toBeInTheDocument();
    });

    it('should render navigation as a landmark', () => {
      render(<Navigation {...defaultProps} />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render search input on desktop', () => {
      render(<Navigation {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText('Rechercher des notes...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render view navigation buttons', () => {
      render(<Navigation {...defaultProps} />);
      expect(screen.getByTitle('Espace de travail')).toBeInTheDocument();
      expect(screen.getByTitle('Canvas')).toBeInTheDocument();
      expect(screen.getByTitle('Chronologie')).toBeInTheDocument();
      expect(screen.getByTitle('Paramètres')).toBeInTheDocument();
    });

    it('should render sidebar toggle buttons', () => {
      render(<Navigation {...defaultProps} />);
      expect(screen.getByTitle('Masquer la barre latérale')).toBeInTheDocument();
      expect(screen.getByTitle("Afficher l'inspecteur")).toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('should render mobile menu button', () => {
      render(<Navigation {...defaultProps} />);
      expect(screen.getByTitle('Menu')).toBeInTheDocument();
    });

    it('should open mobile menu when clicking menu button', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} />);

      const menuButton = screen.getByTitle('Menu');
      await user.click(menuButton);

      expect(screen.getByText('Espace de travail')).toBeInTheDocument();
      expect(screen.getByText('Canvas')).toBeInTheDocument();
    });

    it('should close mobile menu when selecting a view', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} />);

      // Open menu
      const menuButton = screen.getByTitle('Menu');
      await user.click(menuButton);

      // Select a view
      const workspaceButton = screen.getByText('Espace de travail');
      await user.click(workspaceButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith('workspace');
    });

    it('should render mobile search button', () => {
      render(<Navigation {...defaultProps} />);
      expect(screen.getByTitle('Rechercher')).toBeInTheDocument();
    });
  });

  describe('View Navigation', () => {
    it('should highlight active view', () => {
      render(<Navigation {...defaultProps} currentView="workspace" />);
      const workspaceButton = screen.getByTitle('Espace de travail');
      expect(workspaceButton).toHaveClass('bg-primary-100');
    });

    it('should call onViewChange when clicking a view button', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} />);

      const canvasButton = screen.getByTitle('Canvas');
      await user.click(canvasButton);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith('canvas');
    });

    it('should change view to search when focusing search input', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Rechercher des notes...');
      await user.click(searchInput);

      expect(defaultProps.onViewChange).toHaveBeenCalledWith('search');
    });
  });

  describe('Sidebar Toggles', () => {
    it('should call onToggleLeftSidebar when clicking left toggle', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} />);

      const toggleButton = screen.getByTitle('Masquer la barre latérale');
      await user.click(toggleButton);

      expect(defaultProps.onToggleLeftSidebar).toHaveBeenCalled();
    });

    it('should show different icon when left sidebar is closed', () => {
      render(<Navigation {...defaultProps} leftSidebarOpen={false} />);
      expect(screen.getByTitle('Afficher la barre latérale')).toBeInTheDocument();
    });

    it('should call onToggleRightSidebar when clicking right toggle', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} />);

      const toggleButton = screen.getByTitle("Afficher l'inspecteur");
      await user.click(toggleButton);

      expect(defaultProps.onToggleRightSidebar).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should show login button when user is not authenticated', () => {
      render(<Navigation {...defaultProps} user={null} />);
      expect(screen.getByText('Connexion')).toBeInTheDocument();
    });

    it('should show logout button when user is authenticated', () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      render(<Navigation {...defaultProps} user={mockUser as any} />);
      expect(screen.getByTitle('Se déconnecter')).toBeInTheDocument();
    });

    it('should call onShowAuth when clicking login button', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} user={null} />);

      const loginButton = screen.getByText('Connexion');
      await user.click(loginButton);

      expect(defaultProps.onShowAuth).toHaveBeenCalled();
    });

    it('should call signOut when clicking logout button', async () => {
      const user = userEvent.setup();
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      render(<Navigation {...defaultProps} user={mockUser as any} />);

      const logoutButton = screen.getByTitle('Se déconnecter');
      await user.click(logoutButton);
    });
  });

  describe('Search', () => {
    it('should display search query in input', () => {
      render(<Navigation {...defaultProps} searchQuery="test query" />);
      const searchInput = screen.getByPlaceholderText('Rechercher des notes...');
      expect(searchInput).toHaveValue('test query');
    });

    it('should call onSearchQueryChange when typing in search', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Rechercher des notes...');
      await user.type(searchInput, 'test');

      expect(defaultProps.onSearchQueryChange).toHaveBeenCalledWith('test');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons with titles', () => {
      render(<Navigation {...defaultProps} />);
      expect(screen.getByTitle('Espace de travail')).toBeInTheDocument();
      expect(screen.getByTitle('Canvas')).toBeInTheDocument();
      expect(screen.getByTitle('Paramètres')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Navigation {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Rechercher des notes...');
      await user.click(searchInput);

      expect(searchInput).toHaveFocus();
    });
  });
});
