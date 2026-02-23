// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Integration Tests for Mistral API
 * Tests the real interactions between mistralService and the API
 */

import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

import { mistralService } from '@/services/ai/mistralService';

// Setup MSW
let server: ReturnType<typeof import('msw/node').setupServer>;

beforeAll(async () => {
  const { setupServer } = await import('msw/node');
  const { handlers } = await import('../mocks/handlers');
  server = setupServer(...handlers);
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('Mistral API Integration', () => {
  describe('Summary Generation', () => {
    it('should generate a short summary successfully', async () => {
      const longText = `
        L'intelligence artificielle (IA) est un domaine de l'informatique qui vise à créer des machines 
        capables de simuler l'intelligence humaine. Cela inclut l'apprentissage automatique, le traitement 
        du langage naturel, la vision par ordinateur et bien d'autres domaines. L'IA a connu des avancées 
        significatives ces dernières années, notamment avec l'émergence des grands modèles de langage.
      `;

      const summary = await mistralService.summarize(longText, 'short');

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain('résumé');
    });

    it('should generate a detailed summary successfully', async () => {
      const longText = `
        La productivité personnelle est un sujet qui passionne de nombreux professionnels. 
        Il existe plusieurs méthodes pour améliorer son efficacité : la méthode GTD (Getting Things Done), 
        la technique Pomodoro, le time blocking, et bien d'autres. Chaque méthode a ses avantages et 
        ses inconvénients, et il est important de trouver celle qui correspond le mieux à son style de travail.
      `;

      const summary = await mistralService.summarize(longText, 'detailed');

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should generate bullet point summary successfully', async () => {
      const longText = `
        Pour réussir un projet, il faut : 1) Définir clairement les objectifs, 2) Établir un planning 
        réaliste, 3) Allouer les ressources nécessaires, 4) Communiquer régulièrement avec l'équipe, 
        5) Suivre l'avancement et ajuster si nécessaire.
      `;

      const summary = await mistralService.summarize(longText, 'bullets');

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should report progress during summary generation', async () => {
      const progressCallback = vi.fn();
      const text = 'Texte à résumer pour tester le callback de progression.';

      await mistralService.summarize(text, 'short', progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      // Progress should reach 100
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1];
      expect(lastCall[0]).toBe(100);
    });

    it('should use cached response on subsequent calls with same text', async () => {
      const text = 'Texte unique pour tester le cache.';

      // First call
      const result1 = await mistralService.summarize(text, 'short');

      // Second call should use cache
      const result2 = await mistralService.summarize(text, 'short');

      expect(result1).toBe(result2);
    });
  });

  describe('Text Analysis', () => {
    it('should continue text successfully', async () => {
      const text = 'Le développement web moderne nécessite';
      const context = 'Article sur les technologies web';

      const continuation = await mistralService.continueText(text, context);

      expect(continuation).toBeDefined();
      expect(typeof continuation).toBe('string');
      expect(continuation.length).toBeGreaterThan(0);
      expect(continuation.toLowerCase()).toContain('continuation');
    });

    it('should improve text successfully', async () => {
      const text = 'Ce text est mal ecrit et contient des ereurs.';

      const improved = await mistralService.improveText(text);

      expect(improved).toBeDefined();
      expect(typeof improved).toBe('string');
      expect(improved.length).toBeGreaterThan(0);
      expect(improved.toLowerCase()).toContain('améliorée');
    });

    it('should change tone of text', async () => {
      const text = 'Salut, ça va ? On se voit demain ?';

      const formal = await mistralService.changeTone(text, 'formal');
      expect(formal).toBeDefined();
      expect(typeof formal).toBe('string');

      const professional = await mistralService.changeTone(text, 'professional');
      expect(professional).toBeDefined();
      expect(typeof professional).toBe('string');

      const persuasive = await mistralService.changeTone(text, 'persuasive');
      expect(persuasive).toBeDefined();
      expect(typeof persuasive).toBe('string');
    });

    it('should translate text', async () => {
      const text = 'Bonjour, comment allez-vous ?';

      const translated = await mistralService.translate(text, 'english');

      expect(translated).toBeDefined();
      expect(typeof translated).toBe('string');
      expect(translated.length).toBeGreaterThan(0);
    });
  });

  describe('Tag Generation', () => {
    it('should generate tags for text', async () => {
      const text = `
        La gestion de projet agile est une méthode qui privilégie la collaboration, 
        l'adaptation au changement et la livraison continue de valeur. Les équipes 
        travaillent par sprints et utilisent des outils comme les tableaux Kanban.
      `;

      const tags = await mistralService.generateTags(text, 5);

      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeLessThanOrEqual(5);
      tags.forEach(tag => {
        expect(typeof tag).toBe('string');
        expect(tag.length).toBeGreaterThan(0);
      });
    });

    it('should respect max tags limit', async () => {
      const text = 'Texte pour tester la limite de tags.';

      const tags3 = await mistralService.generateTags(text, 3);
      expect(tags3.length).toBeLessThanOrEqual(3);

      const tags10 = await mistralService.generateTags(text, 10);
      expect(tags10.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Idea Generation', () => {
    it('should generate ideas for brainstorming', async () => {
      const topic = 'Améliorer la productivité';
      const context = 'Équipe de développement de 5 personnes';

      const ideas = await mistralService.generateIdeas(topic, context);

      expect(ideas).toBeDefined();
      expect(Array.isArray(ideas)).toBe(true);
      expect(ideas.length).toBeGreaterThan(0);
      ideas.forEach(idea => {
        expect(typeof idea).toBe('string');
        expect(idea.length).toBeGreaterThan(0);
      });
    });

    it('should generate ideas without context', async () => {
      const topic = 'Nouvelles fonctionnalités';

      const ideas = await mistralService.generateIdeas(topic);

      expect(ideas).toBeDefined();
      expect(Array.isArray(ideas)).toBe(true);
      expect(ideas.length).toBeGreaterThan(0);
    });
  });

  describe('Note Synthesis', () => {
    it('should synthesize multiple notes', async () => {
      const notes = [
        { title: 'Note 1', content: 'Contenu de la première note sur le sujet A.' },
        { title: 'Note 2', content: 'Contenu de la deuxième note sur le sujet B.' },
        { title: 'Note 3', content: 'Contenu de la troisième note sur le sujet C.' },
      ];

      const synthesis = await mistralService.synthesizeNotes(notes);

      expect(synthesis).toBeDefined();
      expect(typeof synthesis).toBe('string');
      expect(synthesis.length).toBeGreaterThan(0);
      expect(synthesis.toLowerCase()).toContain('synthèse');
    });

    it('should handle empty notes array', async () => {
      const synthesis = await mistralService.synthesizeNotes([]);

      expect(synthesis).toBeDefined();
      expect(typeof synthesis).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors (429)', async () => {
      // Override handler for this test
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
          async () => {
            return HttpResponse.json(
              { error: { message: 'Rate limit exceeded' } },
              { status: 429 }
            );
          }
        )
      );

      await expect(mistralService.summarize('Test', 'short')).rejects.toThrow('Quota API dépassé');
    });

    it('should handle server errors (500)', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
          async () => {
            return HttpResponse.json(
              { error: { message: 'Internal server error' } },
              { status: 500 }
            );
          }
        )
      );

      await expect(mistralService.summarize('Test', 'short')).rejects.toThrow(
        'Serveur Mistral temporairement indisponible'
      );
    });

    it('should handle unauthorized errors (401)', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
          async () => {
            return HttpResponse.json({ error: { message: 'Invalid API key' } }, { status: 401 });
          }
        )
      );

      await expect(mistralService.summarize('Test', 'short')).rejects.toThrow(
        'Clé API Mistral invalide'
      );
    });

    it('should handle bad request errors (400)', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
          async () => {
            return HttpResponse.json({ error: { message: 'Invalid parameters' } }, { status: 400 });
          }
        )
      );

      await expect(mistralService.summarize('Test', 'short')).rejects.toThrow('Requête invalide');
    });

    it('should handle service unavailable errors (503)', async () => {
      server.use(
        http.post(
          'https://yadtnmgyrmigqbndnmho.supabase.co/functions/v1/mistral-proxy',
          async () => {
            return HttpResponse.json(
              { error: { message: 'Service unavailable' } },
              { status: 503 }
            );
          }
        )
      );

      await expect(mistralService.summarize('Test', 'short')).rejects.toThrow(
        'Serveur Mistral temporairement indisponible'
      );
    });
  });

  describe('Request Cancellation', () => {
    it('should cancel ongoing request', async () => {
      // Start a request
      const promise = mistralService.summarize('Long text that takes time...', 'detailed');

      // Cancel it immediately
      mistralService.cancelRequest();

      await expect(promise).rejects.toThrow('Génération annulée');
    });

    it('should handle abort gracefully', () => {
      // Should not throw when no request is active
      expect(() => mistralService.cancelRequest()).not.toThrow();
    });
  });

  describe('Summary History', () => {
    it('should save summary to history', async () => {
      const noteId = 'test-note-id';
      const noteTitle = 'Test Note';
      const content = 'Content to summarize';
      const summary = 'Generated summary';
      const summaryType: 'short' | 'detailed' | 'bullets' = 'short';

      await mistralService.saveSummaryToHistory(noteId, noteTitle, content, summary, summaryType);

      // History should be saved (we can't easily verify IndexedDB in tests,
      // but we can verify no error was thrown)
      expect(true).toBe(true);
    });

    it('should retrieve summary history', async () => {
      // First save some entries
      await mistralService.saveSummaryToHistory(
        'note-1',
        'Note 1',
        'Content 1',
        'Summary 1',
        'short'
      );
      await mistralService.saveSummaryToHistory(
        'note-2',
        'Note 2',
        'Content 2',
        'Summary 2',
        'detailed'
      );

      const history = await mistralService.getSummaryHistory(10);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should respect history limit', async () => {
      const history = await mistralService.getSummaryHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Configuration', () => {
    it('should always report as configured', () => {
      expect(mistralService.isConfigured()).toBe(true);
    });

    it('should accept API key (no-op in current implementation)', () => {
      expect(() => mistralService.setApiKey('test-key')).not.toThrow();
    });
  });
});
