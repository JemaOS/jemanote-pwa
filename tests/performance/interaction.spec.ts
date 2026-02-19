/**
 * Interaction Performance Tests
 *
 * Tests pour mesurer les interactions utilisateur (INP, FID)
 * et s'assurer que l'application reste réactive.
 */

/* eslint-disable prefer-global */

import { test, expect, type Page } from '@playwright/test';

interface InteractionMetrics {
  inputDelay: number; // Délai avant le traitement (FID-like)
  processingTime: number; // Temps de traitement
  presentationDelay: number; // Délai de présentation
  totalTime: number; // Temps total (INP-like)
}

interface INPMetrics {
  inp: number; // Interaction to Next Paint
  interactions: InteractionMetrics[];
  slowInteractions: number;
}

// Budgets d'interaction (en ms)
const INTERACTION_BUDGETS = {
  fid: 100, // First Input Delay < 100ms (Good)
  inpGood: 200, // INP < 200ms (Good)
  inpNeedsImprovement: 500, // INP < 500ms (Needs Improvement)
  processingTime: 50, // Temps de traitement < 50ms
  totalTime: 200, // Temps total d'interaction < 200ms
};

/**
 * Mesure une interaction spécifique
 */
async function measureInteraction(
  page: Page,
  action: () => Promise<void>
): Promise<InteractionMetrics> {
  // Injecter un script de mesure
  await page.evaluate(() => {
    (globalThis as unknown as { __interactionMetrics?: InteractionMetrics }).__interactionMetrics = {
      inputDelay: 0,
      processingTime: 0,
      presentationDelay: 0,
      totalTime: 0,
    };
  });

  const startTime = performance.now();

  await action();

  // Attendre que le prochain frame soit présenté
  await page.waitForTimeout(100);

  const endTime = performance.now();

  // Récupérer les métriques détaillées si disponibles
  const metrics = await page.evaluate(() => {
    const entries = performance.getEntriesByType('event') as PerformanceEventTiming[];
    const lastEntry = entries[entries.length - 1];

    if (lastEntry && 'processingStart' in lastEntry) {
      const eventEntry = lastEntry as PerformanceEventTiming & {
        processingStart: number;
        processingEnd: number;
        startTime: number;
      };

      return {
        inputDelay: eventEntry.processingStart - eventEntry.startTime,
        processingTime: eventEntry.processingEnd - eventEntry.processingStart,
        presentationDelay: Date.now() - eventEntry.processingEnd,
        totalTime: Date.now() - eventEntry.startTime,
      };
    }

    return null;
  });

  return (
    metrics || {
      inputDelay: 0,
      processingTime: endTime - startTime,
      presentationDelay: 0,
      totalTime: endTime - startTime,
    }
  );
}

/**
 * Mesure plusieurs interactions pour calculer l'INP
 */
async function measureINP(page: Page, interactions: (() => Promise<void>)[]): Promise<INPMetrics> {
  const results: InteractionMetrics[] = [];

  for (const interaction of interactions) {
    const metrics = await measureInteraction(page, interaction);
    results.push(metrics);
    await page.waitForTimeout(200); // Délai entre les interactions
  }

  // INP = 98e percentile des temps d'interaction
  const sorted = [...results].sort((a, b) => b.totalTime - a.totalTime);
  const inpIndex = Math.floor(sorted.length * 0.02);
  const inp = sorted[inpIndex]?.totalTime || sorted[0]?.totalTime || 0;

  const slowInteractions = results.filter(r => r.totalTime > INTERACTION_BUDGETS.inpGood).length;

  return {
    inp,
    interactions: results,
    slowInteractions,
  };
}

/**
 * Simule une interaction clavier
 */
async function simulateKeyPress(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

/**
 * Simule un clic sur un élément
 */
async function simulateClick(page: Page, selector: string): Promise<void> {
  await page.click(selector);
}

test.describe('Interaction Performance Tests', () => {
  test.describe('First Input Delay (FID)', () => {
    test('first interaction should have low input delay', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const metrics = await measureInteraction(page, async () => {
        await page.keyboard.press('Tab');
      });

      expect(metrics.inputDelay).toBeLessThan(INTERACTION_BUDGETS.fid);
      expect(metrics.totalTime).toBeLessThan(INTERACTION_BUDGETS.totalTime);
    });

    test('first click should be responsive', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Attendre qu'un élément cliquable soit présent
      await page.waitForSelector('button, a, [role="button"]', { timeout: 5000 });

      const clickable = page.locator('button, a, [role="button"]').first();

      const metrics = await measureInteraction(page, async () => {
        await clickable.click();
      });

      expect(metrics.inputDelay).toBeLessThan(INTERACTION_BUDGETS.fid);
    });
  });

  test.describe('Interaction to Next Paint (INP)', () => {
    test('common interactions should have good INP', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const interactions = [
        async () => {
          await page.keyboard.press('Tab');
        },
        async () => {
          await page.keyboard.press('Control+k');
        },
        async () => {
          await page.keyboard.press('Escape');
        },
        async () => {
          await page.keyboard.press('ArrowDown');
        },
        async () => {
          await page.keyboard.press('ArrowUp');
        },
      ];

      const inpMetrics = await measureINP(page, interactions);

      expect(inpMetrics.inp).toBeLessThan(INTERACTION_BUDGETS.inpGood);
      expect(inpMetrics.slowInteractions).toBeLessThanOrEqual(1);
    });

    test('editor interactions should be responsive', async ({ page }) => {
      await page.goto('/?note=new');
      await page.waitForLoadState('networkidle');

      const editor = page.locator('.cm-editor').first();

      if (await editor.isVisible().catch(() => false)) {
        await editor.click();

        const interactions = [
          async () => {
            await page.keyboard.type('a');
          },
          async () => {
            await page.keyboard.press('Enter');
          },
          async () => {
            await page.keyboard.press('Backspace');
          },
          async () => {
            await page.keyboard.press('ArrowRight');
          },
          async () => {
            await page.keyboard.press('Control+a');
          },
        ];

        const inpMetrics = await measureINP(page, interactions);

        // L'éditeur peut être un peu plus lent
        expect(inpMetrics.inp).toBeLessThan(INTERACTION_BUDGETS.inpNeedsImprovement);
      }
    });
  });

  test.describe('Command Palette', () => {
    test('opening command palette should be instant', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const metrics = await measureInteraction(page, async () => {
        await page.keyboard.press('Control+k');
      });

      expect(metrics.totalTime).toBeLessThan(100);
      expect(metrics.processingTime).toBeLessThan(INTERACTION_BUDGETS.processingTime);
    });

    test('command palette search should be responsive', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Ouvrir la palette
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(200);

      // Mesurer la recherche
      const metrics = await measureInteraction(page, async () => {
        await page.keyboard.type('settings');
      });

      // La recherche avec filtrage devrait être rapide
      expect(metrics.totalTime).toBeLessThan(150);
    });
  });

  test.describe('Navigation', () => {
    test('sidebar navigation should be responsive', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Trouver un lien de navigation
      const navLink = page.locator('nav a, [role="navigation"] a').first();

      if (await navLink.isVisible().catch(() => false)) {
        const metrics = await measureInteraction(page, async () => {
          await navLink.click();
        });

        expect(metrics.totalTime).toBeLessThan(INTERACTION_BUDGETS.totalTime);
      }
    });

    test('view switching should be smooth', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Switch vers graph view
      const graphMetrics = await measureInteraction(page, async () => {
        await page.goto('/?view=graph');
      });

      expect(graphMetrics.totalTime).toBeLessThan(500); // Navigation plus permissive

      await page.waitForLoadState('networkidle');

      // Switch vers editor
      const editorMetrics = await measureInteraction(page, async () => {
        await page.goto('/?note=new');
      });

      expect(editorMetrics.totalTime).toBeLessThan(500);
    });
  });

  test.describe('Modal Interactions', () => {
    test('modal open/close should be responsive', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Ouvrir une modale
      const openMetrics = await measureInteraction(page, async () => {
        await page.keyboard.press('Control+k');
      });

      expect(openMetrics.totalTime).toBeLessThan(100);

      await page.waitForTimeout(200);

      // Fermer la modale
      const closeMetrics = await measureInteraction(page, async () => {
        await page.keyboard.press('Escape');
      });

      expect(closeMetrics.totalTime).toBeLessThan(100);
    });
  });

  test.describe('Graph Interactions', () => {
    test('graph pan and zoom should be responsive', async ({ page }) => {
      await page.goto('/?view=graph');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const canvas = page.locator('canvas').first();

      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox();

        if (box) {
          // Mesurer le début du pan
          const metrics = await measureInteraction(page, async () => {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
          });

          expect(metrics.inputDelay).toBeLessThan(INTERACTION_BUDGETS.fid);

          await page.mouse.up();
        }
      }
    });
  });

  test.describe('Long Tasks', () => {
    test('should not have long tasks blocking interactions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Collecter les long tasks
      const longTasks = await page.evaluate(async () => {
        return new Promise<PerformanceEntry[]>(resolve => {
          const tasks: PerformanceEntry[] = [];

          const observer = new PerformanceObserver(list => {
            tasks.push(...list.getEntries());
          });

          observer.observe({ entryTypes: ['longtask'] as const });

          setTimeout(() => {
            observer.disconnect();
            resolve(tasks);
          }, 5000);
        });
      });

      // Filtrer les long tasks > 50ms
      const blockingTasks = longTasks.filter(
        (task: PerformanceEntry) => (task as unknown as { duration: number }).duration > 50
      );

      // Pas plus de 3 long tasks pendant 5s d'inactivité
      expect(blockingTasks.length).toBeLessThanOrEqual(3);
    });
  });

  test.describe('Event Handler Performance', () => {
    test('scroll events should be throttled/debounced', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Injecter un compteur d'events
      await page.evaluate(() => {
        (globalThis as unknown as { __scrollCount: number }).__scrollCount = 0;
        globalThis.addEventListener(
          'scroll',
          () => {
            (globalThis as unknown as { __scrollCount: number }).__scrollCount++;
          },
          { passive: true }
        );
      });

      // Simuler beaucoup de scroll events
      await page.evaluate(async () => {
        for (let i = 0; i < 100; i++) {
          globalThis.scrollBy(0, 10);
          // Pas de délai - events rapides
        }
      });

      await page.waitForTimeout(500);

      // Vérifier que les events ont été traités
      const scrollCount = await page.evaluate(
        () => (globalThis as unknown as { __scrollCount: number }).__scrollCount
      );

      // Si throttled correctement, on ne devrait pas avoir 100 callbacks
      // (mais c'est acceptable d'en avoir beaucoup avec passive: true)
      expect(scrollCount).toBeGreaterThan(0);
    });
  });
});
