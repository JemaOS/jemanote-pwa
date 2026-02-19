import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { ThemeProvider } from '@/contexts/ThemeContext';

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  queryClient?: QueryClient;
}

function AllTheProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>{children}</ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function customRender(ui: ReactElement, options?: CustomRenderOptions): RenderResult {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Helper to create a test query client
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Helper to wait for async operations
async function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to create mock notes
function createMockNote(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: 'Test Note',
    content: 'Test content',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'test-user-id',
    is_archived: false,
    is_pinned: false,
    tags: [],
    ...overrides,
  };
}

// Helper to create mock user
function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
    },
    ...overrides,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export {
  customRender as render,
  createTestQueryClient,
  waitForAsync,
  createMockNote,
  createMockUser,
};
