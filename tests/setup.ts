import { vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';

import { mockLocalforage } from './__mocks__/localStorage';

console.log('[SETUP] Loading test setup...');

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children as React.ReactElement,
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

// Mock localforage
vi.mock('localforage', () => ({
  default: mockLocalforage,
}));

// Note: MSW setup is done in each integration test file

// Mock matchMedia
// eslint-disable-next-line prefer-global
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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

// Mock localStorage with proper implementation
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] || null),
};
// eslint-disable-next-line prefer-global
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage with proper implementation
const sessionStorageStore: Record<string, string> = {};
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStorageStore[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(sessionStorageStore).forEach(key => delete sessionStorageStore[key]);
  }),
  get length() {
    return Object.keys(sessionStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(sessionStorageStore)[index] || null),
};
Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(
    private callback: IntersectionObserverCallback,
    private options?: IntersectionObserverInit
  ) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock ResizeObserver
class ResizeObserverMock {
  constructor(private callback: ResizeObserverCallback) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// Mock globalThis.scrollTo
// eslint-disable-next-line prefer-global
Object.defineProperty(globalThis, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock navigator.permissions
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: vi.fn().mockResolvedValue({ state: 'prompt' }),
  },
});

// Mock BroadcastChannel
class BroadcastChannelMock {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

// eslint-disable-next-line prefer-global
Object.defineProperty(globalThis, 'BroadcastChannel', {
  writable: true,
  value: BroadcastChannelMock,
});

// Polyfill WritableStream for MSW (Mock Service Worker)
// This is required for tests using MSW for API mocking
class WritableStreamMock {
  constructor(private underlyingSink?: UnderlyingSink) {}

  getWriter() {
    return {
      write: vi.fn(),
      close: vi.fn(),
      abort: vi.fn(),
      releaseLock: vi.fn(),
    };
  }

  close() {
    return Promise.resolve();
  }

  abort() {
    return Promise.resolve();
  }
}

// eslint-disable-next-line prefer-global
Object.defineProperty(globalThis, 'WritableStream', {
  writable: true,
  value: WritableStreamMock,
});

// Polyfill ReadableStream for MSW
class ReadableStreamMock {
  constructor(private underlyingSource?: UnderlyingSource) {}

  getReader() {
    return {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
      cancel: vi.fn(),
    };
  }

  cancel() {
    return Promise.resolve();
  }
}

// eslint-disable-next-line prefer-global
Object.defineProperty(globalThis, 'ReadableStream', {
  writable: true,
  value: ReadableStreamMock,
});

// Polyfill TransformStream for MSW
class TransformStreamMock {
  readable = new ReadableStreamMock();
  writable = new WritableStreamMock();
}

// eslint-disable-next-line prefer-global
Object.defineProperty(globalThis, 'TransformStream', {
  writable: true,
  value: TransformStreamMock,
});

console.log('[SETUP] Test setup loaded successfully');
