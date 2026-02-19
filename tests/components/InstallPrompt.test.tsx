// Copyright (c) 2025 Jema Technology.
// Tests for InstallPrompt component

/* eslint-disable prefer-global */

import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import InstallPrompt from '@/components/InstallPrompt';

import { render, screen, waitFor } from '@/tests/utils/test-utils';

// Mock globalThis.matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('InstallPrompt', () => {
  const mockBeforeInstallPrompt: Event | null = null;
  let beforeInstallPromptHandler: ((e: Event) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Reset matchMedia
    (globalThis.matchMedia as any).mockReturnValue({
      matches: false,
      media: '(display-mode: standalone)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    // Mock globalThis.addEventListener for beforeinstallprompt
    beforeInstallPromptHandler = null;
    vi.spyOn(globalThis, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'beforeinstallprompt') {
        beforeInstallPromptHandler = handler as (e: Event) => void;
      }
    });
    vi.spyOn(globalThis, 'removeEventListener').mockImplementation(() => {});

    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should not render when app is already installed', () => {
      (globalThis.matchMedia as any).mockReturnValue({
        matches: true,
        media: '(display-mode: standalone)',
      });

      render(<InstallPrompt />);
      expect(screen.queryByText('Installer Jemanote')).not.toBeInTheDocument();
    });

    it('should not render before beforeinstallprompt event', () => {
      render(<InstallPrompt />);
      expect(screen.queryByText('Installer Jemanote')).not.toBeInTheDocument();
    });

    it('should not render if user declined recently', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago
      localStorage.setItem('pwa-install-declined', recentDate.toISOString());

      render(<InstallPrompt />);
      expect(screen.queryByText('Installer Jemanote')).not.toBeInTheDocument();
    });

    it('should render if user declined more than 7 days ago', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago
      localStorage.setItem('pwa-install-declined', oldDate.toISOString());

      render(<InstallPrompt />);

      // Trigger beforeinstallprompt
      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      // Wait for the 30 second timeout
      await new Promise(resolve => setTimeout(resolve, 31000));

      await waitFor(
        () => {
          expect(screen.queryByText('Installer Jemanote')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Prompt Display', () => {
    it('should show install prompt after delay', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      // Trigger beforeinstallprompt
      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      // Fast forward 30 seconds
      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByText('Installer Jemanote')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should show app name in prompt', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByText('Installer Jemanote')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should show description text', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByText(/Installez l'application/)).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Install Action', () => {
    it('should call prompt when clicking install', async () => {
      vi.useFakeTimers();
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockUserChoice = Promise.resolve({ outcome: 'accepted' });

      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice,
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByText('Installer')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Installer'));

      expect(mockPrompt).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should log success when install is accepted', async () => {
      vi.useFakeTimers();
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockUserChoice = Promise.resolve({ outcome: 'accepted' });

      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: mockPrompt,
        userChoice: mockUserChoice,
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByText('Installer')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Installer'));

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('PWA installée');
      });

      vi.useRealTimers();
    });
  });

  describe('Dismiss Action', () => {
    it('should close prompt when clicking dismiss', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByText('Plus tard')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Plus tard'));

      expect(screen.queryByText('Installer Jemanote')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('should save dismiss date to localStorage', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByText('Plus tard')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Plus tard'));

      expect(localStorage.getItem('pwa-install-declined')).toBeTruthy();
      vi.useRealTimers();
    });

    it('should close prompt when clicking X button', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByLabelText('Fermer')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByLabelText('Fermer'));

      expect(screen.queryByText('Installer Jemanote')).not.toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe('App Installed Event', () => {
    it('should hide prompt when app is installed', async () => {
      vi.useFakeTimers();
      let appInstalledHandler: (() => void) | null = null;

      vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          beforeInstallPromptHandler = handler as (e: Event) => void;
        }
        if (event === 'appinstalled') {
          appInstalledHandler = handler as () => void;
        }
      });

      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        expect(screen.getByText('Installer Jemanote')).toBeInTheDocument();
      });

      // Simulate app installed
      if (appInstalledHandler) {
        appInstalledHandler();
      }

      expect(screen.queryByText('Installer Jemanote')).not.toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe('Styling', () => {
    it('should have fixed positioning at bottom right', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        const prompt = screen.getByText('Installer Jemanote').closest('div[class*="fixed"]');
        expect(prompt).toHaveClass('fixed', 'bottom-4', 'right-4');
      });

      vi.useRealTimers();
    });

    it('should have animation class', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        const prompt = screen.getByText('Installer Jemanote').closest('div[class*="animate"]');
        expect(prompt).toHaveClass('animate-slide-up');
      });

      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on close button', async () => {
      vi.useFakeTimers();
      render(<InstallPrompt />);

      const mockEvent = {
        preventDefault: vi.fn(),
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      };

      if (beforeInstallPromptHandler) {
        beforeInstallPromptHandler(mockEvent as any);
      }

      vi.advanceTimersByTime(31000);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Fermer');
        expect(closeButton).toHaveAttribute('aria-label', 'Fermer');
      });

      vi.useRealTimers();
    });
  });
});
