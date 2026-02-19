// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('useAuth', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: { name: 'Test User' },
  };

  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    user: mockUser,
  };

  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return loading state initially', () => {
      vi.mocked(supabase.auth.getSession).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should return unauthenticated state when no session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should return authenticated state when session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });
  });

  describe('auth state changes', () => {
    it('should subscribe to auth state changes on mount', async () => {
      renderHook(() => useAuth());

      await waitFor(() => {
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      });
    });

    it('should unsubscribe from auth state changes on unmount', async () => {
      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should update state when auth state changes to signed in', async () => {
      let authChangeCallback: Function | null = null;

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        } as any;
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate auth state change
      authChangeCallback?.('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.session).toEqual(mockSession);
      });
    });

    it('should update state when auth state changes to signed out', async () => {
      let authChangeCallback: Function | null = null;

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback: any) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        } as any;
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Simulate sign out
      authChangeCallback?.('SIGNED_OUT', null);

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });
  });

  describe('signUp', () => {
    it('should call supabase.auth.signUp with correct parameters', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signUp('test@example.com', 'password123'); // NOSONAR

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123', // NOSONAR
      });
      expect(response.data?.user).toEqual(mockUser);
      expect(response.error).toBeNull();
    });

    it('should return error when signUp fails', async () => {
      const mockError = new Error('Email already registered');
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signUp('test@example.com', 'password123'); // NOSONAR

      expect(response.error).toEqual(mockError);
    });
  });

  describe('signIn', () => {
    it('should call supabase.auth.signInWithPassword with correct parameters', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('test@example.com', 'password123'); // NOSONAR

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123', // NOSONAR
      });
      expect(response.data?.user).toEqual(mockUser);
      expect(response.error).toBeNull();
    });

    it('should return error when signIn fails', async () => {
      const mockError = new Error('Invalid credentials');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signIn('test@example.com', 'wrongpassword'); // NOSONAR

      expect(response.error).toEqual(mockError);
    });
  });

  describe('signOut', () => {
    it('should call supabase.auth.signOut', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(response.error).toBeNull();
    });

    it('should return error when signOut fails', async () => {
      const mockError = new Error('Network error');
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError as any });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.signOut();

      expect(response.error).toEqual(mockError);
    });
  });

  describe('edge cases', () => {
    it('should handle getSession error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      // Wait for the hook to process the error
      await waitFor(
        () => {
          // The hook should eventually stop loading
          expect(result.current.loading).toBe(false);
        },
        { timeout: 3000 }
      );

      // After error, user and session should be null
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should handle session with missing user', async () => {
      const sessionWithoutUser = { ...mockSession, user: null };
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: sessionWithoutUser as any },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toEqual(sessionWithoutUser);
    });
  });
});
