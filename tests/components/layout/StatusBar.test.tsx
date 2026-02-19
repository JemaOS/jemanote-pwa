// Copyright (c) 2025 Jema Technology.
// Tests for StatusBar component

import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import StatusBar from '@/components/layout/StatusBar';

import { render, screen } from '@/tests/utils/test-utils';

describe('StatusBar', () => {
  const defaultProps = {
    userId: null as string | null,
    activeNoteId: null as string | null,
    syncing: false,
    syncEnabled: false,
    onShowAuth: vi.fn(),
    onEnableSync: vi.fn(),
    onManualSync: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render status bar', () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText('Local')).toBeInTheDocument();
    });

    it('should show local mode when user is not logged in', () => {
      render(<StatusBar {...defaultProps} userId={null} />);
      expect(screen.getByText('Local')).toBeInTheDocument();
    });

    it('should show full local mode message on larger screens', () => {
      render(<StatusBar {...defaultProps} userId={null} />);
      const localButton = screen.getByTitle('Connectez-vous pour synchroniser vos notes');
      expect(localButton).toBeInTheDocument();
    });
  });

  describe('Authentication State', () => {
    it('should show sync status when user is logged in', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={true} />);
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('should show sync indicator when user is logged in', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={true} />);
      expect(screen.getByText('Synchronisé')).toBeInTheDocument();
    });

    it('should show syncing indicator when syncing', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncing={true} syncEnabled={true} />);
      expect(screen.getByText('Sync')).toBeInTheDocument();
    });

    it('should show disconnected status when sync is disabled', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={false} />);
      expect(screen.getByText('Off')).toBeInTheDocument();
    });
  });

  describe('Sync Actions', () => {
    it('should call onShowAuth when clicking local mode button', async () => {
      const user = userEvent.setup();
      render(<StatusBar {...defaultProps} userId={null} />);

      const localButton = screen.getByTitle('Connectez-vous pour synchroniser vos notes');
      await user.click(localButton);

      expect(defaultProps.onShowAuth).toHaveBeenCalled();
    });

    it('should show enable sync button when sync is disabled', () => {
      render(
        <StatusBar {...defaultProps} userId="user-123" syncEnabled={false} onEnableSync={vi.fn()} />
      );
      expect(screen.getByText('Activer')).toBeInTheDocument();
    });

    it('should call onEnableSync when clicking enable button', async () => {
      const user = userEvent.setup();
      render(
        <StatusBar {...defaultProps} userId="user-123" syncEnabled={false} onEnableSync={vi.fn()} />
      );

      const enableButton = screen.getByText('Activer');
      await user.click(enableButton);

      expect(defaultProps.onEnableSync).toHaveBeenCalled();
    });

    it('should show manual sync button when sync is enabled', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={true} syncing={false} />);
      expect(screen.getByTitle('Synchroniser maintenant')).toBeInTheDocument();
    });

    it('should call onManualSync when clicking sync button', async () => {
      const user = userEvent.setup();
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={true} syncing={false} />);

      const syncButton = screen.getByTitle('Synchroniser maintenant');
      await user.click(syncButton);

      expect(defaultProps.onManualSync).toHaveBeenCalled();
    });

    it('should not show manual sync button while syncing', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={true} syncing={true} />);
      expect(screen.queryByTitle('Synchroniser maintenant')).not.toBeInTheDocument();
    });
  });

  describe('Active Note Info', () => {
    it('should show last modified time when note is active', () => {
      render(<StatusBar {...defaultProps} activeNoteId="note-123" />);
      expect(screen.getByText(/Dernière modification:/)).toBeInTheDocument();
    });

    it('should not show last modified time when no note is active', () => {
      render(<StatusBar {...defaultProps} activeNoteId={null} />);
      expect(screen.queryByText(/Dernière modification:/)).not.toBeInTheDocument();
    });
  });

  describe('Footer Info', () => {
    it('should show developer credit', () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText('Jema Technology')).toBeInTheDocument();
    });

    it('should have link to developer website', () => {
      render(<StatusBar {...defaultProps} />);
      const link = screen.getByText('Jema Technology');
      expect(link.closest('a')).toHaveAttribute('href', 'https://www.jematechnology.fr/');
    });

    it('should show edit mode indicator', () => {
      render(<StatusBar {...defaultProps} />);
      expect(screen.getByText('Mode: Édition')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should show abbreviated text on small screens', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={true} />);
      // Mobile view shows abbreviated status
      expect(screen.getByText('OK')).toBeInTheDocument();
    });

    it('should show full text on larger screens', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={true} />);
      // Desktop view shows full status
      expect(screen.getByText('Synchronisé')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible titles on buttons', () => {
      render(<StatusBar {...defaultProps} userId={null} />);
      expect(screen.getByTitle('Connectez-vous pour synchroniser vos notes')).toBeInTheDocument();
    });

    it('should have accessible sync button title', () => {
      render(<StatusBar {...defaultProps} userId="user-123" syncEnabled={true} />);
      expect(screen.getByTitle('Synchroniser maintenant')).toBeInTheDocument();
    });
  });
});
