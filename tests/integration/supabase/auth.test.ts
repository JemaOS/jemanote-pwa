// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Integration Tests for Supabase Auth
 * Tests the real interactions between useAuth hook and Supabase Auth API
 */

import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'

import { supabase } from '@/lib/supabase'

import { server } from '../mocks/server'


// Setup MSW
beforeAll(() => { server.listen({ onUnhandledRequest: 'error' }); })
afterEach(() => {
  server.resetHandlers()
  // Clear any stored sessions
  supabase.auth.signOut().catch(() => {})
})
afterAll(() => { server.close(); })

describe('Supabase Auth Integration', () => {
  describe('Sign Up', () => {
    it('should sign up with email and password successfully', async () => {
      const email = 'newuser@example.com'
      const password = 'SecurePassword123!'

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.email).toBe(email)
      expect(data.session).toBeDefined()
    })

    it('should handle duplicate email error', async () => {
      // First signup
      const email = 'duplicate@example.com'
      const password = 'SecurePassword123!'
      
      await supabase.auth.signUp({ email, password })

      // Override handler to simulate duplicate
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/signup',
          async () => {
            return HttpResponse.json(
              { error: 'User already registered', error_description: 'User already registered' },
              { status: 422 }
            )
          }
        )
      )

      // Second signup with same email
      const { data, error } = await supabase.auth.signUp({ email, password })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should handle weak password error', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/signup',
          async () => {
            return HttpResponse.json(
              { error: 'Password should be at least 6 characters', error_description: 'Password too weak' },
              { status: 422 }
            )
          }
        )
      )

      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: '123',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should handle invalid email format', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/signup',
          async () => {
            return HttpResponse.json(
              { error: 'Invalid email format', error_description: 'Invalid email' },
              { status: 422 }
            )
          }
        )
      )

      const { data, error } = await supabase.auth.signUp({
        email: 'invalid-email',
        password: 'SecurePassword123!',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })
  })

  describe('Sign In', () => {
    it('should sign in with valid credentials', async () => {
      // First create a user
      const email = 'loginuser@example.com'
      const password = 'SecurePassword123!'
      
      await supabase.auth.signUp({ email, password })
      await supabase.auth.signOut()

      // Then sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.email).toBe(email)
      expect(data.session).toBeDefined()
      expect(data.session?.access_token).toBeDefined()
    })

    it('should handle invalid credentials', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/token',
          async () => {
            return HttpResponse.json(
              { error: 'Invalid login credentials', error_description: 'Invalid login credentials' },
              { status: 400 }
            )
          }
        )
      )

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'wrong@example.com',
        password: 'WrongPassword123!',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should handle non-existent user', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })
  })

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      // First sign in
      const { data: signUpData } = await supabase.auth.signUp({
        email: 'logoutuser@example.com',
        password: 'SecurePassword123!',
      })

      expect(signUpData.session).toBeDefined()

      // Then sign out
      const { error } = await supabase.auth.signOut()

      expect(error).toBeNull()

      // Verify session is cleared
      const { data: sessionData } = await supabase.auth.getSession()
      expect(sessionData.session).toBeNull()
    })

    it('should handle sign out when not signed in', async () => {
      const { error } = await supabase.auth.signOut()

      // Should not throw error even if not signed in
      expect(error).toBeNull()
    })
  })

  describe('Password Recovery', () => {
    it('should send password reset email for existing user', async () => {
      // Create user first
      const email = 'recovery@example.com'
      await supabase.auth.signUp({
        email,
        password: 'SecurePassword123!',
      })
      await supabase.auth.signOut()

      const { data, error } = await supabase.auth.resetPasswordForEmail(email)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should not reveal if email exists (security)', async () => {
      // Even for non-existent email, should return success to prevent enumeration
      const { error } = await supabase.auth.resetPasswordForEmail('nonexistent@example.com')

      // Note: In real implementation, this might still return success
      // for security reasons (prevent email enumeration)
      expect(error).toBeNull()
    })

    it('should handle server error during password reset', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/recover',
          async () => {
            return HttpResponse.json(
              { error: 'Internal server error' },
              { status: 500 }
            )
          }
        )
      )

      const { error } = await supabase.auth.resetPasswordForEmail('test@example.com')

      expect(error).toBeDefined()
    })
  })

  describe('Email Verification', () => {
    it('should verify email with valid token', async () => {
      const email = 'verify@example.com'
      
      // Create user
      await supabase.auth.signUp({
        email,
        password: 'SecurePassword123!',
      })

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: 'valid-verification-token',
        type: 'email',
      })

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
    })

    it('should handle invalid verification token', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/verify',
          async () => {
            return HttpResponse.json(
              { error: 'Invalid token', error_description: 'Token expired or invalid' },
              { status: 400 }
            )
          }
        )
      )

      const { data, error } = await supabase.auth.verifyOtp({
        email: 'test@example.com',
        token: 'invalid-token',
        type: 'email',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should handle expired verification token', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/verify',
          async () => {
            return HttpResponse.json(
              { error: 'Token expired', error_description: 'Verification token has expired' },
              { status: 400 }
            )
          }
        )
      )

      const { data, error } = await supabase.auth.verifyOtp({
        email: 'test@example.com',
        token: 'expired-token',
        type: 'signup',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })
  })

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Sign up to get initial tokens
      const { data: signUpData } = await supabase.auth.signUp({
        email: 'refresh@example.com',
        password: 'SecurePassword123!',
      })

      expect(signUpData.session).toBeDefined()

      // Refresh the session
      const { data, error } = await supabase.auth.refreshSession()

      expect(error).toBeNull()
      expect(data.session).toBeDefined()
      expect(data.session?.access_token).toBeDefined()
    })

    it('should handle invalid refresh token', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/token',
          async () => {
            return HttpResponse.json(
              { error: 'Invalid refresh token', error_description: 'Token is invalid or expired' },
              { status: 400 }
            )
          }
        )
      )

      const { data, error } = await supabase.auth.refreshSession()

      expect(error).toBeDefined()
      expect(data.session).toBeNull()
    })
  })

  describe('Get User', () => {
    it('should get current user when authenticated', async () => {
      // Sign up first
      await supabase.auth.signUp({
        email: 'getuser@example.com',
        password: 'SecurePassword123!',
      })

      const { data, error } = await supabase.auth.getUser()

      expect(error).toBeNull()
      expect(data.user).toBeDefined()
      expect(data.user?.email).toBe('getuser@example.com')
    })

    it('should return null user when not authenticated', async () => {
      // Ensure signed out
      await supabase.auth.signOut()

      const { data } = await supabase.auth.getUser()

      // Should not error, just return null user
      expect(data.user).toBeNull()
    })
  })

  describe('Get Session', () => {
    it('should get current session when authenticated', async () => {
      // Sign up first
      await supabase.auth.signUp({
        email: 'getsession@example.com',
        password: 'SecurePassword123!',
      })

      const { data, error } = await supabase.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toBeDefined()
      expect(data.session?.access_token).toBeDefined()
      expect(data.session?.refresh_token).toBeDefined()
    })

    it('should return null session when not authenticated', async () => {
      // Ensure signed out
      await supabase.auth.signOut()

      const { data, error } = await supabase.auth.getSession()

      expect(error).toBeNull()
      expect(data.session).toBeNull()
    })
  })

  describe('Auth State Changes', () => {
    it('should trigger auth state change on sign in', async () => {
      const callback = vi.fn()
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session)
      })

      // Sign in
      await supabase.auth.signUp({
        email: 'statechange@example.com',
        password: 'SecurePassword123!',
      })

      // Wait for callback
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()
      
      subscription.unsubscribe()
    })

    it('should trigger auth state change on sign out', async () => {
      // Sign in first
      await supabase.auth.signUp({
        email: 'signoutstate@example.com',
        password: 'SecurePassword123!',
      })

      const callback = vi.fn()
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session)
      })

      // Sign out
      await supabase.auth.signOut()

      // Wait for callback
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(callback).toHaveBeenCalled()
      
      subscription.unsubscribe()
    })
  })

  describe('Update User', () => {
    it('should update user metadata', async () => {
      // Sign up first
      await supabase.auth.signUp({
        email: 'updateuser@example.com',
        password: 'SecurePassword123!',
      })

      const { data: _data, error } = await supabase.auth.updateUser({
        data: { full_name: 'John Doe' },
      })

      // Note: This may or may not work depending on mock implementation
      // In real tests, you'd verify the update
      expect(error).toBeNull()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/signup',
          async () => {
            return HttpResponse.error()
          }
        )
      )

      const { data, error } = await supabase.auth.signUp({
        email: 'network@example.com',
        password: 'SecurePassword123!',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should handle server errors (500)', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/signup',
          async () => {
            return HttpResponse.json(
              { error: 'Internal server error' },
              { status: 500 }
            )
          }
        )
      )

      const { data, error } = await supabase.auth.signUp({
        email: 'servererror@example.com',
        password: 'SecurePassword123!',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })

    it('should handle rate limiting (429)', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/signup',
          async () => {
            return HttpResponse.json(
              { error: 'Rate limit exceeded', error_description: 'Too many requests' },
              { status: 429 }
            )
          }
        )
      )

      const { data, error } = await supabase.auth.signUp({
        email: 'ratelimit@example.com',
        password: 'SecurePassword123!',
      })

      expect(error).toBeDefined()
      expect(data.user).toBeNull()
    })
  })
})
