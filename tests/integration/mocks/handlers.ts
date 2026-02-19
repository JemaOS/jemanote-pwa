// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * MSW Handlers for API mocking in integration tests
 * Mocks external API calls (Mistral AI, Supabase)
 */

import { http, HttpResponse, delay } from 'msw';

import type { Note, Folder, Tag, Link } from '@/types';

// Mistral API Response Types
interface MistralResponse {
  data: {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

// Supabase Auth Response Types
interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

// Mock data stores for integration tests
const mockNotes: Map<string, Note> = new Map();
const mockFolders: Map<string, Folder> = new Map();
const mockTags: Map<string, Tag> = new Map();
const mockLinks: Map<string, Link> = new Map();
const mockUsers: Map<string, AuthUser> = new Map();

// Helper to generate UUID
const generateId = () => crypto.randomUUID();

// Helper to create mock note
const createMockNote = (overrides?: Partial<Note>): Note => ({
  id: generateId(),
  user_id: 'test-user-id',
  title: 'Test Note',
  content: 'Test content',
  folder_id: undefined,
  is_pinned: false,
  is_archived: false,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Mistral API Handlers
export const mistralHandlers = [
  // Mistral Proxy Edge Function
  http.post(
    'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
    async ({ request }) => {
      const body = (await request.json()) as {
        model?: string;
        messages?: Array<{ role: string; content: string }>;
        max_tokens?: number;
        temperature?: number;
      };

      // Simulate network delay
      await delay(100);

      const userMessage = body.messages?.find(m => m.role === 'user')?.content || '';
      const systemMessage = body.messages?.find(m => m.role === 'system')?.content || '';

      // Generate contextual responses based on prompts
      let responseContent = '';

      if (
        userMessage.toLowerCase().includes('résume') ||
        userMessage.toLowerCase().includes('summary')
      ) {
        responseContent =
          'Ceci est un résumé concis du texte fourni, mettant en avant les points clés.';
      } else if (
        userMessage.toLowerCase().includes('continue') ||
        userMessage.toLowerCase().includes('texte à continuer')
      ) {
        responseContent =
          'Voici la continuation naturelle et cohérente du texte, développant les idées présentées.';
      } else if (
        userMessage.toLowerCase().includes('améliore') ||
        userMessage.toLowerCase().includes('improve')
      ) {
        responseContent =
          'Voici une version améliorée, plus claire et mieux structurée du texte original.';
      } else if (
        userMessage.toLowerCase().includes('traduis') ||
        userMessage.toLowerCase().includes('translate')
      ) {
        responseContent = 'This is the translated version of the provided text.';
      } else if (
        userMessage.toLowerCase().includes('tags') ||
        systemMessage.toLowerCase().includes('tags')
      ) {
        responseContent = 'productivité, organisation, notes, idées, projet';
      } else if (
        userMessage.toLowerCase().includes('idées') ||
        userMessage.toLowerCase().includes('brainstorming')
      ) {
        responseContent =
          "Idée 1: Explorer de nouvelles approches\nIdée 2: Collaborer avec l'équipe\nIdée 3: Documenter les processus\nIdée 4: Automatiser les tâches répétitives\nIdée 5: Mesurer les résultats";
      } else if (
        userMessage.toLowerCase().includes('synthétise') ||
        userMessage.toLowerCase().includes('synthesize')
      ) {
        responseContent = 'Synthèse des notes fournies en un document cohérent et structuré.';
      } else {
        responseContent = `Réponse générée par l'IA pour: ${userMessage.substring(0, 50)}`;
      }

      const response: MistralResponse = {
        data: {
          choices: [
            {
              message: {
                content: responseContent,
              },
            },
          ],
          usage: {
            promptTokens: userMessage.length / 4,
            completionTokens: responseContent.length / 4,
            totalTokens: (userMessage.length + responseContent.length) / 4,
          },
        },
      };

      return HttpResponse.json(response);
    }
  ),

  // Rate limit error simulation
  http.post(
    'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
    async ({ request }) => {
      const body = (await request.json()) as { simulateError?: string };

      if (body.simulateError === 'rate_limit') {
        return HttpResponse.json({ error: { message: 'Rate limit exceeded' } }, { status: 429 });
      }

      return undefined; // Pass to next handler
    },
    { once: true }
  ),

  // Server error simulation
  http.post(
    'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
    async ({ request }) => {
      const body = (await request.json()) as { simulateError?: string };

      if (body.simulateError === 'server_error') {
        return HttpResponse.json({ error: { message: 'Internal server error' } }, { status: 500 });
      }

      return undefined;
    },
    { once: true }
  ),

  // Timeout simulation
  http.post(
    'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
    async ({ request }) => {
      const body = (await request.json()) as { simulateError?: string };

      if (body.simulateError === 'timeout') {
        await delay(30000); // Long delay to trigger timeout
        return HttpResponse.json({ error: { message: 'Request timeout' } }, { status: 504 });
      }

      return undefined;
    },
    { once: true }
  ),

  // Unauthorized error simulation
  http.post(
    'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
    async ({ request }) => {
      const body = (await request.json()) as { simulateError?: string };

      if (body.simulateError === 'unauthorized') {
        return HttpResponse.json({ error: { message: 'Invalid API key' } }, { status: 401 });
      }

      return undefined;
    },
    { once: true }
  ),
];

// Supabase Auth Handlers
export const supabaseAuthHandlers = [
  // Sign up
  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/signup', async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as { email: string; password: string };

    const user: AuthUser = {
      id: generateId(),
      email: body.email,
      user_metadata: {},
    };

    mockUsers.set(user.id, user);

    const session: AuthSession = {
      access_token: `mock-access-token-${generateId()}`,
      refresh_token: `mock-refresh-token-${generateId()}`,
      expires_in: 3600,
      user,
    };

    return HttpResponse.json({ user, session });
  }),

  // Sign in with password
  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/token', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const grantType = url.searchParams.get('grant_type');

    if (grantType === 'password') {
      const body = (await request.json()) as { email: string; password: string };

      // Find user by email (mock validation)
      const user = Array.from(mockUsers.values()).find(u => u.email === body.email);

      if (!user) {
        return HttpResponse.json(
          { error: 'Invalid login credentials', error_description: 'Invalid login credentials' },
          { status: 400 }
        );
      }

      const session: AuthSession = {
        access_token: `mock-access-token-${generateId()}`,
        refresh_token: `mock-refresh-token-${generateId()}`,
        expires_in: 3600,
        user,
      };

      return HttpResponse.json({ user, session });
    }

    if (grantType === 'refresh_token') {
      const body = (await request.json()) as { refresh_token: string };

      const user = Array.from(mockUsers.values())[0];
      if (!user) {
        return HttpResponse.json({ error: 'Invalid refresh token' }, { status: 400 });
      }

      const session: AuthSession = {
        access_token: `mock-access-token-${generateId()}`,
        refresh_token: body.refresh_token,
        expires_in: 3600,
        user,
      };

      return HttpResponse.json({ user, session });
    }

    return HttpResponse.json({ error: 'Invalid grant type' }, { status: 400 });
  }),

  // Get user
  http.get('https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/user', async ({ request }) => {
    await delay(50);
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return HttpResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const user = Array.from(mockUsers.values())[0];
    if (!user) {
      return HttpResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return HttpResponse.json(user);
  }),

  // Sign out
  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/logout', async () => {
    await delay(50);
    return HttpResponse.json({ message: 'Signed out successfully' });
  }),

  // Password recovery
  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/recover', async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as { email: string };

    const user = Array.from(mockUsers.values()).find(u => u.email === body.email);

    if (!user) {
      // Still return success to prevent email enumeration
      return HttpResponse.json({ message: 'Password reset email sent' });
    }

    return HttpResponse.json({ message: 'Password reset email sent' });
  }),

  // Verify email OTP
  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/auth/v1/verify', async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as { type: string; token: string; email: string };

    if (body.type === 'signup' || body.type === 'email') {
      const user = Array.from(mockUsers.values()).find(u => u.email === body.email);

      if (!user) {
        return HttpResponse.json({ error: 'Invalid token' }, { status: 400 });
      }

      return HttpResponse.json({
        user: { ...user, email_confirmed_at: new Date().toISOString() },
        session: {
          access_token: `mock-access-token-${generateId()}`,
          refresh_token: `mock-refresh-token-${generateId()}`,
          expires_in: 3600,
          user,
        },
      });
    }

    return HttpResponse.json({ error: 'Invalid verification type' }, { status: 400 });
  }),
];

// Supabase Database Handlers
export const supabaseDatabaseHandlers = [
  // Notes CRUD
  http.get('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    let notes = Array.from(mockNotes.values());

    if (userId) {
      notes = notes.filter(n => n.user_id === userId);
    }

    // Handle ordering
    const orderColumn = url.searchParams.get('order');
    if (orderColumn) {
      notes.sort((a, b) => {
        const aVal = a[orderColumn as keyof Note];
        const bVal = b[orderColumn as keyof Note];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return bVal.localeCompare(aVal);
        }
        return 0;
      });
    }

    return HttpResponse.json(notes);
  }),

  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as Partial<Note> | Partial<Note>[];
    const notesData = Array.isArray(body) ? body : [body];

    const createdNotes: Note[] = [];

    for (const noteData of notesData) {
      const note = createMockNote(noteData);
      mockNotes.set(note.id, note);
      createdNotes.push(note);
    }

    return HttpResponse.json(createdNotes.length === 1 ? createdNotes[0] : createdNotes);
  }),

  http.patch('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const body = (await request.json()) as Partial<Note>;

    if (!id) {
      return HttpResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const existingNote = mockNotes.get(id);
    if (!existingNote) {
      return HttpResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const updatedNote = {
      ...existingNote,
      ...body,
      updated_at: new Date().toISOString(),
    };

    mockNotes.set(id, updatedNote);

    return HttpResponse.json(updatedNote);
  }),

  http.delete('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/notes', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return HttpResponse.json({ error: 'ID required' }, { status: 400 });
    }

    mockNotes.delete(id);

    return HttpResponse.json({ message: 'Note deleted' });
  }),

  // Folders CRUD
  http.get('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/folders', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    let folders = Array.from(mockFolders.values());

    if (userId) {
      folders = folders.filter(f => f.user_id === userId);
    }

    return HttpResponse.json(folders);
  }),

  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/folders', async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as Partial<Folder>;

    const folder: Folder = {
      id: generateId(),
      user_id: body.user_id || 'test-user-id',
      name: body.name || 'New Folder',
      parent_id: body.parent_id,
      path: body.path || '/',
      icon: body.icon,
      color: body.color,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockFolders.set(folder.id, folder);

    return HttpResponse.json(folder);
  }),

  // Tags CRUD
  http.get('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/tags', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    let tags = Array.from(mockTags.values());

    if (userId) {
      tags = tags.filter(t => t.user_id === userId);
    }

    return HttpResponse.json(tags);
  }),

  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/tags', async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as Partial<Tag>;

    const tag: Tag = {
      id: generateId(),
      user_id: body.user_id || 'test-user-id',
      name: body.name || 'New Tag',
      color: body.color,
      created_at: new Date().toISOString(),
    };

    mockTags.set(tag.id, tag);

    return HttpResponse.json(tag);
  }),

  // Links CRUD
  http.get('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/links', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const sourceNoteId = url.searchParams.get('source_note_id');

    let links = Array.from(mockLinks.values());

    if (sourceNoteId) {
      links = links.filter(l => l.source_note_id === sourceNoteId);
    }

    return HttpResponse.json(links);
  }),

  http.post('https://yadtnmgyrmigqbndnmho.supabase.co/rest/v1/links', async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as Partial<Link>;

    const link: Link = {
      id: generateId(),
      user_id: body.user_id || 'test-user-id',
      source_note_id: body.source_note_id || '',
      target_note_id: body.target_note_id || '',
      link_type: body.link_type || 'wiki',
      created_at: new Date().toISOString(),
    };

    mockLinks.set(link.id, link);

    return HttpResponse.json(link);
  }),
];

// Supabase Realtime Handlers (WebSocket simulation)
export const supabaseRealtimeHandlers = [
  // Realtime WebSocket endpoint
  http.get('https://yadtnmgyrmigqbndnmho.supabase.co/realtime/v1/websocket', () => {
    return HttpResponse.json({ message: 'WebSocket connection established' });
  }),
];

// Helper functions for tests
export const mockDataHelpers = {
  clearAll: () => {
    mockNotes.clear();
    mockFolders.clear();
    mockTags.clear();
    mockLinks.clear();
    mockUsers.clear();
  },

  addMockNote: (note?: Partial<Note>) => {
    const newNote = createMockNote(note);
    mockNotes.set(newNote.id, newNote);
    return newNote;
  },

  addMockUser: (email: string) => {
    const user: AuthUser = {
      id: generateId(),
      email,
    };
    mockUsers.set(user.id, user);
    return user;
  },

  getMockNotes: () => Array.from(mockNotes.values()),
  getMockUsers: () => Array.from(mockUsers.values()),

  createMockNote,
};

// Combine all handlers
export const handlers = [
  ...mistralHandlers,
  ...supabaseAuthHandlers,
  ...supabaseDatabaseHandlers,
  ...supabaseRealtimeHandlers,
];
