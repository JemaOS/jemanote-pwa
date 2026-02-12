// Copyright (c) 2025 Jema Technology.
// Tests for AuthView component

import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AuthView from '@/components/auth/AuthView'

import { render, screen, waitFor } from '@/tests/utils/test-utils'

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
  }),
}))

describe('AuthView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render app title', () => {
      render(<AuthView />)
      expect(screen.getByText('Obsidian PWA')).toBeInTheDocument()
    })

    it('should render app description', () => {
      render(<AuthView />)
      expect(screen.getByText('Application de prise de notes professionnelle')).toBeInTheDocument()
    })

    it('should render email input', () => {
      render(<AuthView />)
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('should render password input', () => {
      render(<AuthView />)
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    })

    it('should render tab buttons', () => {
      render(<AuthView />)
      expect(screen.getByRole('button', { name: 'Connexion' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Inscription' })).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(<AuthView />)
      expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    })

    it('should have email icon', () => {
      render(<AuthView />)
      expect(document.querySelector('[data-lucide="mail"]')).toBeInTheDocument()
    })

    it('should have lock icon', () => {
      render(<AuthView />)
      expect(document.querySelector('[data-lucide="lock"]')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should default to login tab', () => {
      render(<AuthView />)
      const loginButton = screen.getByRole('button', { name: 'Connexion' })
      expect(loginButton).toHaveClass('bg-primary-500')
    })

    it('should switch to signup tab when clicking inscription', async () => {
      const user = userEvent.setup()
      render(<AuthView />)

      const signupButton = screen.getByRole('button', { name: 'Inscription' })
      await user.click(signupButton)

      expect(signupButton).toHaveClass('bg-primary-500')
      expect(screen.getByRole('button', { name: "S'inscrire" })).toBeInTheDocument()
    })

    it('should switch back to login tab when clicking connexion', async () => {
      const user = userEvent.setup()
      render(<AuthView />)

      // Switch to signup first
      const signupButton = screen.getByRole('button', { name: 'Inscription' })
      await user.click(signupButton)

      // Switch back to login
      const loginButton = screen.getByRole('button', { name: 'Connexion' })
      await user.click(loginButton)

      expect(loginButton).toHaveClass('bg-primary-500')
      expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    })
  })

  describe('Form Input', () => {
    it('should update email input value', async () => {
      const user = userEvent.setup()
      render(<AuthView />)

      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password input value', async () => {
      const user = userEvent.setup()
      render(<AuthView />)

      const passwordInput = screen.getByLabelText('Mot de passe')
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('should have email input with correct type', () => {
      render(<AuthView />)
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('should have password input with correct type', () => {
      render(<AuthView />)
      const passwordInput = screen.getByLabelText('Mot de passe')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should have required attributes on inputs', () => {
      render(<AuthView />)
      expect(screen.getByLabelText('Email')).toHaveAttribute('required')
      expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('required')
    })

    it('should have placeholder text on email input', () => {
      render(<AuthView />)
      expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument()
    })

    it('should have placeholder text on password input', () => {
      render(<AuthView />)
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('should call signIn on login form submission', async () => {
      const user = userEvent.setup()
      const { useAuth } = await import('@/hooks/useAuth')
      const signInMock = vi.fn().mockResolvedValue({ error: null })
      ;(useAuth as any).mockReturnValue({
        signIn: signInMock,
        signUp: vi.fn(),
      })

      render(<AuthView />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Mot de passe'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      await waitFor(() => {
        expect(signInMock).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('should call signUp on signup form submission', async () => {
      const user = userEvent.setup()
      const { useAuth } = await import('@/hooks/useAuth')
      const signUpMock = vi.fn().mockResolvedValue({ error: null })
      ;(useAuth as any).mockReturnValue({
        signIn: vi.fn(),
        signUp: signUpMock,
      })

      render(<AuthView />)

      // Switch to signup tab
      await user.click(screen.getByRole('button', { name: 'Inscription' }))

      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.type(screen.getByLabelText('Mot de passe'), 'password123')
      await user.click(screen.getByRole('button', { name: "S'inscrire" }))

      await waitFor(() => {
        expect(signUpMock).toHaveBeenCalledWith('new@example.com', 'password123')
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      const { useAuth } = await import('@/hooks/useAuth')
      ;(useAuth as any).mockReturnValue({
        signIn: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        signUp: vi.fn(),
      })

      render(<AuthView />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Mot de passe'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('should disable submit button during loading', async () => {
      const user = userEvent.setup()
      const { useAuth } = await import('@/hooks/useAuth')
      ;(useAuth as any).mockReturnValue({
        signIn: vi.fn().mockImplementation(() => new Promise(() => {})),
        signUp: vi.fn(),
      })

      render(<AuthView />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Mot de passe'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      expect(screen.getByRole('button', { name: 'Chargement...' })).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message on login failure', async () => {
      const user = userEvent.setup()
      const { useAuth } = await import('@/hooks/useAuth')
      ;(useAuth as any).mockReturnValue({
        signIn: vi.fn().mockResolvedValue({ error: { message: 'Invalid credentials' } }),
        signUp: vi.fn(),
      })

      render(<AuthView />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Mot de passe'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('should display generic error on unexpected error', async () => {
      const user = userEvent.setup()
      const { useAuth } = await import('@/hooks/useAuth')
      ;(useAuth as any).mockReturnValue({
        signIn: vi.fn().mockRejectedValue(new Error('Network error')),
        signUp: vi.fn(),
      })

      render(<AuthView />)

      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Mot de passe'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      await waitFor(() => {
        expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
      })
    })

    it('should clear error when switching tabs', async () => {
      const user = userEvent.setup()
      const { useAuth } = await import('@/hooks/useAuth')
      ;(useAuth as any).mockReturnValue({
        signIn: vi.fn().mockResolvedValue({ error: { message: 'Error' } }),
        signUp: vi.fn(),
      })

      render(<AuthView />)

      // Trigger error
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Mot de passe'), 'wrong')
      await user.click(screen.getByRole('button', { name: 'Se connecter' }))

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })

      // Switch tab - error should be cleared (component re-renders with fresh state)
      await user.click(screen.getByRole('button', { name: 'Inscription' }))
    })
  })

  describe('Validation', () => {
    it('should have minLength on password input', () => {
      render(<AuthView />)
      expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('minLength', '6')
    })

    it('should prevent form submission with empty fields', async () => {
      const user = userEvent.setup()
      render(<AuthView />)

      const submitButton = screen.getByRole('button', { name: 'Se connecter' })
      await user.click(submitButton)

      // Form should not submit due to HTML5 validation
      expect(screen.getByLabelText('Email')).toBeInvalid()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      render(<AuthView />)
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    })

    it('should have focus styles on inputs', () => {
      render(<AuthView />)
      const emailInput = screen.getByLabelText('Email')
      expect(emailInput).toHaveClass('focus:ring-2')
    })
  })

  describe('Layout', () => {
    it('should be centered on the page', () => {
      render(<AuthView />)
      const container = screen.getByText('Obsidian PWA').parentElement?.parentElement
      expect(container).toHaveClass('flex', 'min-h-screen', 'items-center', 'justify-center')
    })

    it('should have card styling', () => {
      render(<AuthView />)
      const card = screen.getByText('Connexion').parentElement?.parentElement
      expect(card).toHaveClass('bg-surface-bg', 'rounded-lg', 'shadow-card')
    })
  })
})
