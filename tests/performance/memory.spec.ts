/**
 * Memory Usage Tests
 *
 * Tests pour surveiller la consommation mémoire de l'application
 * et détecter les fuites mémoire potentielles.
 */

import { test, expect, type Page } from '@playwright/test';

interface MemorySnapshot {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

interface MemoryMetrics {
  initial: MemorySnapshot;
  peak: MemorySnapshot;
  final: MemorySnapshot;
  growth: number;
}

// Budgets mémoire (en MB)
const MEMORY_BUDGETS = {
  initialHeap: 50, // Heap initial < 50MB
  peakHeap: 150, // Pic mémoire < 150MB
  finalHeap: 100, // Mémoire finale < 100MB
  maxGrowth: 30, // Croissance max < 30MB
  nodeGrowth: 1000, // Croissance max du nombre de nœuds DOM
};

/**
 * Récupère les métriques mémoire via Chrome DevTools Protocol
 */
async function getMemoryMetrics(page: Page): Promise<MemorySnapshot> {
  const client = await page.context().newCDPSession(page);

  // Forcer le garbage collector si disponible
  try {
    await client.send('HeapProfiler.collectGarbage');
  } catch {
    // Ignorer si non disponible
  }

  // Attendre un peu pour que le GC fasse son travail
  await page.waitForTimeout(100);

  // Récupérer les métriques de performance
  const metrics = await page.evaluate(() => {
    const memory = (
      performance as unknown as {
        memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }
    ).memory;

    return {
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      totalJSHeapSize: memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
      timestamp: Date.now(),
    };
  });

  await client.detach();

  return metrics;
}

/**
 * Récupère le nombre de nœuds DOM
 */
async function getDOMNodeCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('*').length);
}

/**
 * Effectue un snapshot mémoire complet
 */
async function takeMemorySnapshot(page: Page): Promise<{
  memory: MemorySnapshot;
  domNodes: number;
}> {
  const [memory, domNodes] = await Promise.all([getMemoryMetrics(page), getDOMNodeCount(page)]);

  return { memory, domNodes };
}

test.describe('Memory Usage Tests', () => {
  test.describe('Initial Load', () => {
    test('should have reasonable initial memory usage', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const { memory, domNodes } = await takeMemorySnapshot(page);
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;

      expect(usedMB).toBeLessThan(MEMORY_BUDGETS.initialHeap);
      expect(domNodes).toBeLessThan(1000); // DOM initial raisonnable
    });

    test('should not leak memory on navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const initial = await getMemoryMetrics(page);

      // Naviguer plusieurs fois
      for (let i = 0; i < 5; i++) {
        await page.goto('/?note=new');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await page.goto('/?view=graph');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
      }

      // Forcer GC et attendre
      const client = await page.context().newCDPSession(page);
      try {
        await client.send('HeapProfiler.collectGarbage');
      } catch {}
      await page.waitForTimeout(500);
      await client.detach();

      const final = await getMemoryMetrics(page);
      const growthMB = (final.usedJSHeapSize - initial.usedJSHeapSize) / 1024 / 1024;

      expect(growthMB).toBeLessThan(MEMORY_BUDGETS.maxGrowth);
    });
  });

  test.describe('Editor Memory', () => {
    test('should manage memory when editing large documents', async ({ page }) => {
      await page.goto('/?note=new');
      await page.waitForLoadState('networkidle');

      const initial = await getMemoryMetrics(page);

      // Simuler l'édition d'un grand document
      const largeContent = `# Test\n\n${'Lorem ipsum dolor sit amet.\n'.repeat(1000)}`;

      // Trouver l'éditeur et y entrer du contenu
      const editor = page.locator('.cm-editor').first();
      if (await editor.isVisible().catch(() => false)) {
        await editor.click();
        await page.keyboard.type(largeContent);

        await page.waitForTimeout(1000);

        const afterEdit = await getMemoryMetrics(page);
        const growthMB = (afterEdit.usedJSHeapSize - initial.usedJSHeapSize) / 1024 / 1024;

        // La croissance devrait être raisonnable pour ce volume de texte
        expect(growthMB).toBeLessThan(50);

        // Vider le contenu
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(500);

        // Forcer GC
        const client = await page.context().newCDPSession(page);
        try {
          await client.send('HeapProfiler.collectGarbage');
        } catch {}
        await page.waitForTimeout(500);
        await client.detach();

        const afterClear = await getMemoryMetrics(page);
        const remainingGrowthMB =
          (afterClear.usedJSHeapSize - initial.usedJSHeapSize) / 1024 / 1024;

        // La mémoire devrait être largement récupérée
        expect(remainingGrowthMB).toBeLessThan(MEMORY_BUDGETS.maxGrowth);
      }
    });
  });

  test.describe('Graph View Memory', () => {
    test('should manage memory with large graphs', async ({ page }) => {
      await page.goto('/?view=graph');
      await page.waitForLoadState('networkidle');

      const initial = await getMemoryMetrics(page);

      // Attendre que le graph se charge
      await page.waitForTimeout(2000);

      const afterLoad = await getMemoryMetrics(page);
      const growthMB = (afterLoad.usedJSHeapSize - initial.usedJSHeapSize) / 1024 / 1024;

      // Le graph ne devrait pas consommer plus de 80MB supplémentaires
      expect(growthMB).toBeLessThan(80);

      // Naviguer ailleurs et revenir
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await page.goto('/?view=graph');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const afterReload = await getMemoryMetrics(page);
      const reloadGrowthMB = (afterReload.usedJSHeapSize - initial.usedJSHeapSize) / 1024 / 1024;

      // Pas de fuite significative après rechargement
      expect(reloadGrowthMB).toBeLessThan(growthMB + MEMORY_BUDGETS.maxGrowth);
    });
  });

  test.describe('Component Lifecycle', () => {
    test('should not leak when mounting/unmounting components', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const initial = await getMemoryMetrics(page);

      // Ouvrir et fermer des modales/dialogues plusieurs fois
      for (let i = 0; i < 10; i++) {
        // Ouvrir palette de commandes
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(200);

        // Fermer
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      // Forcer GC
      const client = await page.context().newCDPSession(page);
      try {
        await client.send('HeapProfiler.collectGarbage');
      } catch {}
      await page.waitForTimeout(500);
      await client.detach();

      const final = await getMemoryMetrics(page);
      const growthMB = (final.usedJSHeapSize - initial.usedJSHeapSize) / 1024 / 1024;

      expect(growthMB).toBeLessThan(MEMORY_BUDGETS.maxGrowth);
    });
  });

  test.describe('DOM Node Count', () => {
    test('should keep DOM node count reasonable', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const initialNodes = await getDOMNodeCount(page);

      // Naviguer vers différentes vues
      await page.goto('/?note=new');
      await page.waitForLoadState('networkidle');
      const editorNodes = await getDOMNodeCount(page);

      await page.goto('/?view=graph');
      await page.waitForLoadState('networkidle');
      const graphNodes = await getDOMNodeCount(page);

      // Revenir à l'accueil
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const finalNodes = await getDOMNodeCount(page);

      // Le nombre de nœuds ne devrait pas croître de façon permanente
      expect(finalNodes).toBeLessThan(initialNodes + MEMORY_BUDGETS.nodeGrowth);

      // Les pics temporaires sont acceptables
      expect(Math.max(editorNodes, graphNodes)).toBeLessThan(5000);
    });
  });

  test.describe('Memory Pressure', () => {
    test('should handle memory pressure gracefully', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const metrics: MemorySnapshot[] = [];

      // Effectuer des actions intensives
      for (let i = 0; i < 20; i++) {
        await page.goto(`/?note=test-${i}`);
        await page.waitForLoadState('networkidle');

        const metric = await getMemoryMetrics(page);
        metrics.push(metric);

        // Vérifier qu'on ne dépasse pas le budget de pic
        const usedMB = metric.usedJSHeapSize / 1024 / 1024;
        expect(usedMB).toBeLessThan(MEMORY_BUDGETS.peakHeap);
      }

      // Vérifier la tendance (pas de croissance linéaire constante)
      const firstHalf = metrics.slice(0, 10);
      const secondHalf = metrics.slice(10);

      const firstAvg = firstHalf.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / secondHalf.length;

      const growth = (secondAvg - firstAvg) / 1024 / 1024;

      // La croissance entre les deux moitiés ne devrait pas être excessive
      expect(growth).toBeLessThan(MEMORY_BUDGETS.maxGrowth * 2);
    });
  });
});
