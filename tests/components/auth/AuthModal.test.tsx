// Copyright (c) 2025 Jema Technology.
// Tests for AuthModal component

import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AuthModal from '@/components/auth/AuthModal';

import { render, screen, waitFor } from '@tests/utils/test-utils';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

describe('AuthModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByText('Synchronisation Cloud')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<AuthModal {...defaultProps} />);
      expect(
        screen.getByText('Connectez-vous pour synchroniser vos notes sur tous vos appareils')
      ).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByLabelText('Fermer')).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should render password input', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    });

    it('should render tab buttons', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Connexion' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Inscription' })).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should default to login tab', () => {
      render(<AuthModal {...defaultProps} />);
      const loginButton = screen.getByRole('button', { name: 'Connexion' });
      expect(loginButton).toHaveClass('bg-primary-500');
    });

    it('should switch to signup tab when clicking inscription', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const signupButton = screen.getByRole('button', { name: 'Inscription' });
      await user.click(signupButton);

      expect(signupButton).toHaveClass('bg-primary-500');
      expect(screen.getByRole('button', { name: "S'inscrire" })).toBeInTheDocument();
    });

    it('should switch back to login tab when clicking connexion', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      // Switch to signup first
      const signupButton = screen.getByRole('button', { name: 'Inscription' });
      await user.click(signupButton);

      // Switch back to login
      const loginButton = screen.getByRole('button', { name: 'Connexion' });
      await user.click(loginButton);

      expect(loginButton).toHaveClass('bg-primary-500');
      expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should update email input value', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password input value', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Mot de passe');
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });

    it('should have email input with correct type', () => {
      render(<AuthModal {...defaultProps} />);
      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password input with correct type', () => {
      render(<AuthModal {...defaultProps} />);
      const passwordInput = screen.getByLabelText('Mot de passe');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should have required attributes on inputs', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByLabelText('Email')).toHaveAttribute('required');
      expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('required');
    });
  });

  describe('Form Submission', () => {
    it('should call signIn on login form submission', async () => {
      const user = userEvent.setup();
      const { useAuth } = await import('@/hooks/useAuth');
      const signInMock = vi.fn().mockResolvedValue({ error: null });
      (useAuth as any).mockReturnValue({
        signIn: signInMock,
        signUp: vi.fn(),
      });

      render(<AuthModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Mot de passe'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Se connecter' }));

      await waitFor(() => {
        expect(signInMock).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should call signUp on signup form submission', async () => {
      const user = userEvent.setup();
      const { useAuth } = await import('@/hooks/useAuth');
      const signUpMock = vi.fn().mockResolvedValue({ error: null });
      (useAuth as any).mockReturnValue({
        signIn: vi.fn(),
        signUp: signUpMock,
      });

      render(<AuthModal {...defaultProps} />);

      // Switch to signup tab
      await user.click(screen.getByRole('button', { name: 'Inscription' }));

      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Mot de passe'), 'password123');
      await user.click(screen.getByRole('button', { name: "S'inscrire" }));

      await waitFor(() => {
        expect(signUpMock).toHaveBeenCalledWith('new@example.com', 'password123');
      });
    });

    it('should close modal on successful login', async () => {
      const user = userEvent.setup();
      const { useAuth } = await import('@/hooks/useAuth');
      (useAuth as any).mockReturnValue({
        signIn: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn(),
      });

      render(<AuthModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Mot de passe'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Se connecter' }));

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const { useAuth } = await import('@/hooks/useAuth');
      (useAuth as any).mockReturnValue({
        signIn: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        signUp: vi.fn(),
      });

      render(<AuthModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Mot de passe'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Se connecter' }));

      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on login failure', async () => {
      const user = userEvent.setup();
      const { useAuth } = await import('@/hooks/useAuth');
      (useAuth as any).mockReturnValue({
        signIn: vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } }),
        signUp: vi.fn(),
      });

      render(<AuthModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Mot de passe'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'Se connecter' }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should display generic error on unexpected error', async () => {
      const user = userEvent.setup();
      const { useAuth } = await import('@/hooks/useAuth');
      (useAuth as any).mockReturnValue({
        signIn: vi.fn().mockRejectedValue(new Error('Network error')),
        signUp: vi.fn(),
      });

      render(<AuthModal {...defaultProps} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Mot de passe'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Se connecter' }));

      await waitFor(() => {
        expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Closing', () => {
    it('should close modal when clicking close button', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Fermer');
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should close modal when clicking backdrop', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const backdrop =
        screen.getByText('Synchronisation Cloud').parentElement?.parentElement?.parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });

    it('should not close modal when clicking modal content', async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const modalContent = screen.getByText('Synchronisation Cloud');
      await user.click(modalContent);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on close button', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByLabelText('Fermer')).toHaveAttribute('aria-label', 'Fermer');
    });

    it('should have accessible form labels', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument();
    });

    it('should have minLength on password input', () => {
      render(<AuthModal {...defaultProps} />);
      expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('minLength', '6');
    });
  });

  describe('Informational Text', () => {
    it('should show sync info text', () => {
      render(<AuthModal {...defaultProps} />);
      expect(
        screen.getByText('Vos notes locales seront automatiquement synchronisées après connexion')
      ).toBeInTheDocument();
    });
  });
});
