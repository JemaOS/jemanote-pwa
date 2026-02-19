import { vi } from 'vitest';

/**
 * Mock for localStorage with in-memory storage
 */
export class MockLocalStorage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  // Helper method for tests
  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  // Helper method for tests
  getAllItems(): Record<string, string> {
    return Object.fromEntries(this.store);
  }
}

/**
 * Setup localStorage mock
 */
export function setupLocalStorageMock(): MockLocalStorage {
  const mockStorage = new MockLocalStorage();

  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });

  return mockStorage;
}

/**
 * Mock for localforage (indexedDB wrapper)
 * Uses an in-memory store to persist data across calls
 */
const localforageStore: Map<string, unknown> = new Map();

export const mockLocalforage = {
  getItem: vi.fn(<T>(key: string): Promise<T | null> => {
    return Promise.resolve((localforageStore.get(key) as T) ?? null);
  }),
  setItem: vi.fn(<T>(key: string, value: T): Promise<T> => {
    localforageStore.set(key, value);
    return Promise.resolve(value);
  }),
  removeItem: vi.fn((key: string): Promise<void> => {
    localforageStore.delete(key);
    return Promise.resolve(undefined);
  }),
  clear: vi.fn((): Promise<void> => {
    localforageStore.clear();
    return Promise.resolve(undefined);
  }),
  keys: vi.fn((): Promise<string[]> => {
    return Promise.resolve(Array.from(localforageStore.keys()));
  }),
  length: vi.fn((): Promise<number> => {
    return Promise.resolve(localforageStore.size);
  }),
  iterate: vi.fn().mockResolvedValue(undefined),
  createInstance: vi.fn().mockReturnThis(),
  config: vi.fn(),
  driver: vi.fn(),
  setDriver: vi.fn().mockResolvedValue(undefined),
  defineDriver: vi.fn().mockResolvedValue(undefined),
};

/**
 * Helper to mock notes in localStorage
 */
export function mockNotesInLocalStorage(notes: unknown[]): void {
  localStorage.setItem('jemanote-notes', JSON.stringify(notes));
}

/**
 * Helper to mock user settings in localStorage
 */
export function mockSettingsInLocalStorage(settings: Record<string, unknown>): void {
  localStorage.setItem('jemanote-settings', JSON.stringify(settings));
}
