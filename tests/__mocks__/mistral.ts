import { vi } from 'vitest';

/**
 * Mock for Mistral AI Service
 */
export const mockMistralService = {
  generateSummary: vi.fn().mockResolvedValue({
    summary: 'This is a mock summary of the note content.',
    keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
  }),

  generateTags: vi.fn().mockResolvedValue({
    tags: ['test', 'mock', 'ai', 'automation'],
  }),

  suggestLinks: vi.fn().mockResolvedValue({
    suggestions: [
      { noteId: 'note-1', relevance: 0.95 },
      { noteId: 'note-2', relevance: 0.87 },
    ],
  }),

  answerQuestion: vi.fn().mockResolvedValue({
    answer: 'This is a mock answer to your question.',
    sources: ['note-1', 'note-2'],
  }),

  analyzeSentiment: vi.fn().mockResolvedValue({
    sentiment: 'positive',
    score: 0.85,
  }),

  generateEmbedding: vi.fn().mockResolvedValue({
    // SECURITY NOTE: Math.random() is acceptable here for mock embedding generation
    // This is test code generating fake embedding vectors, not used for cryptography
    embedding: Array.from({ length: 384 }, () => Math.random()), // NOSONAR
  }),

  streamCompletion: vi.fn().mockImplementation(async function* () {
    const chunks = ['This', ' is', ' a', ' streaming', ' response', '.'];
    for (const chunk of chunks) {
      yield { content: chunk };
    }
  }),
};

/**
 * Helper to create mock AI responses
 */
export function createMockAIResponse(type: 'summary' | 'tags' | 'answer' | 'sentiment') {
  const responses = {
    summary: {
      summary: 'Mock summary text',
      keyPoints: ['Point 1', 'Point 2'],
    },
    tags: {
      tags: ['tag1', 'tag2', 'tag3'],
    },
    answer: {
      answer: 'Mock answer text',
      sources: ['source-1'],
    },
    sentiment: {
      sentiment: 'neutral',
      score: 0.5,
    },
  };

  return responses[type];
}

/**
 * Mock fetch for Mistral API calls
 */
export function mockMistralFetch() {
  return vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: 'Mock summary',
                  keyPoints: ['Point 1', 'Point 2'],
                }),
              },
            },
          ],
        }),
    })
  );
}
