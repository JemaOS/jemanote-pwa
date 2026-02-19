/**
 * Rendering Performance Tests
 *
 * Tests pour mesurer les temps de rendu et s'assurer que
 * l'application reste fluide (60fps).
 */

import { test, expect, type Page } from '@playwright/test';

interface RenderingMetrics {
  fps: number;
  frameDrops: number;
  longFrames: number; // Frames > 16.67ms (60fps)
  avgFrameTime: number;
  maxFrameTime: number;
}

interface PaintMetrics {
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
}

// Budgets de rendu (en ms)
const RENDERING_BUDGETS = {
  frameTime: 16.67, // 60fps = 16.67ms par frame
  longFrameThreshold: 50, // Frame "longue" > 50ms
  targetFps: 55, // FPS minimum acceptable
  maxFrameDrops: 5, // Drops de frames acceptables
  firstPaint: 1000, // First Paint < 1s
  fcp: 1800, // FCP < 1.8s
  lcp: 2500, // LCP < 2.5s
};

/**
 * Frame performance measurement function (passed to page.evaluate to reduce nesting)
 */
function measureFramePerformance(measureDuration: number): Promise<RenderingMetrics> {
  const frames: number[] = [];
  let lastTime = performance.now();
  let frameDrops = 0;
  let longFrames = 0;

  const measureFrame = () => {
    const now = performance.now();
    const frameTime = now - lastTime;
    frames.push(frameTime);
    if (frameTime > 33.33) {
      frameDrops++;
    }
    if (frameTime > 50) {
      longFrames++;
    }
    lastTime = now;
  };

  const computeResults = (): RenderingMetrics => ({
    fps: 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length),
    frameDrops,
    longFrames,
    avgFrameTime: frames.reduce((a, b) => a + b, 0) / frames.length,
    maxFrameTime: Math.max(...frames),
  });

  const startTime = performance.now();
  return new Promise<RenderingMetrics>(resolve => {
    const rafLoop = () => {
      measureFrame();
      const elapsed = performance.now() - startTime >= measureDuration;
      elapsed ? resolve(computeResults()) : requestAnimationFrame(rafLoop);
    };
    requestAnimationFrame(rafLoop);
  });
}

/**
 * Mesure les métriques de rendu via Chrome DevTools
 */
async function measureRenderingMetrics(
  page: Page,
  duration: number = 5000
): Promise<RenderingMetrics> {
  const client = await page.context().newCDPSession(page);

  // Activer le profiling
  await client.send('Runtime.enable');

  // Injecter un script de mesure
  const metrics = (await page.evaluate(measureFramePerformance, duration)) as RenderingMetrics;

  await client.detach();

  return metrics;
}

/**
 * Récupère les métriques de paint
 */
async function getPaintMetrics(page: Page): Promise<PaintMetrics> {
  return page.evaluate(() => {
    const paintEntries = performance.getEntriesByType('paint') as PerformancePaintTiming[];
    const lcpEntries = performance.getEntriesByType(
      'largest-contentful-paint'
    ) as PerformanceEntry[];

    const firstPaint = paintEntries.find(p => p.name === 'first-paint')?.startTime || 0;
    const fcp = paintEntries.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
    const lcp =
      (lcpEntries[lcpEntries.length - 1] as PerformanceEntry & { startTime: number })?.startTime ||
      0;

    return {
      firstPaint,
      firstContentfulPaint: fcp,
      largestContentfulPaint: lcp,
    };
  });
}

/**
 * Mesure le temps de rendu d'une interaction
 */
async function measureInteractionRenderTime(
  page: Page,
  action: () => Promise<void>
): Promise<number> {
  const startTime = await page.evaluate(() => performance.now());

  await action();

  // Attendre le prochain frame
  await page.waitForTimeout(50);

  const endTime = await page.evaluate(() => performance.now());

  return endTime - startTime;
}

test.describe('Rendering Performance Tests', () => {
  test.describe('Page Load Rendering', () => {
    test('homepage should render within budget', async ({ page }) => {
      await page.goto('/');

      // Attendre que la page soit stable
      await page.waitForLoadState('networkidle');

      const paintMetrics = await getPaintMetrics(page);

      expect(paintMetrics.firstPaint).toBeLessThan(RENDERING_BUDGETS.firstPaint);
      expect(paintMetrics.firstContentfulPaint).toBeLessThan(RENDERING_BUDGETS.fcp);
      expect(paintMetrics.largestContentfulPaint).toBeLessThan(RENDERING_BUDGETS.lcp);
    });

    test('editor should render within budget', async ({ page }) => {
      await page.goto('/?note=new');
      await page.waitForLoadState('networkidle');

      const paintMetrics = await getPaintMetrics(page);

      // Budgets plus permissifs pour l'éditeur
      expect(paintMetrics.firstContentfulPaint).toBeLessThan(RENDERING_BUDGETS.fcp * 1.2);
      expect(paintMetrics.largestContentfulPaint).toBeLessThan(RENDERING_BUDGETS.lcp * 1.2);
    });

    test('graph view should render within budget', async ({ page }) => {
      await page.goto('/?view=graph');
      await page.waitForLoadState('networkidle');

      // Attendre que le graph se charge
      await page.waitForTimeout(2000);

      const paintMetrics = await getPaintMetrics(page);

      // Budgets plus permissifs pour le graph
      expect(paintMetrics.firstContentfulPaint).toBeLessThan(RENDERING_BUDGETS.fcp * 1.3);
      expect(paintMetrics.largestContentfulPaint).toBeLessThan(RENDERING_BUDGETS.lcp * 1.5);
    });
  });

  test.describe('Frame Rate Stability', () => {
    test('should maintain 60fps during idle', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const metrics = await measureRenderingMetrics(page, 3000);

      expect(metrics.fps).toBeGreaterThanOrEqual(RENDERING_BUDGETS.targetFps);
      expect(metrics.longFrames).toBeLessThanOrEqual(RENDERING_BUDGETS.maxFrameDrops);
    });

    test('should maintain acceptable fps during scrolling', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Démarrer la mesure
      const metricsPromise = measureRenderingMetrics(page, 3000);

      // Simuler le scroll
      await page.evaluate(async () => {
        for (let i = 0; i < 10; i++) {
          globalThis.scrollBy(0, 100);
          await new Promise(r => setTimeout(r, 100));
        }
      });

      const metrics = await metricsPromise;

      // Légèrement moins strict pendant le scroll
      expect(metrics.fps).toBeGreaterThanOrEqual(45);
      expect(metrics.avgFrameTime).toBeLessThan(25);
    });
  });

  test.describe('Interaction Rendering', () => {
    test('command palette should open smoothly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const renderTime = await measureInteractionRenderTime(page, async () => {
        await page.keyboard.press('Control+k');
      });

      // Devrait s'ouvrir en moins de 100ms
      expect(renderTime).toBeLessThan(100);
    });

    test('sidebar toggle should be smooth', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Trouver et cliquer sur le bouton de toggle
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]').first();

      if (await toggleButton.isVisible().catch(() => false)) {
        const renderTime = await measureInteractionRenderTime(page, async () => {
          await toggleButton.click();
        });

        expect(renderTime).toBeLessThan(100);
      }
    });

    test('modal dialogs should render smoothly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Ouvrir une modale (settings par exemple)
      const settingsButton = page.locator('[data-testid="settings-button"]').first();

      if (await settingsButton.isVisible().catch(() => false)) {
        const renderTime = await measureInteractionRenderTime(page, async () => {
          await settingsButton.click();
        });

        expect(renderTime).toBeLessThan(150);
      }
    });
  });

  test.describe('Editor Rendering', () => {
    test('typing should not cause frame drops', async ({ page }) => {
      await page.goto('/?note=new');
      await page.waitForLoadState('networkidle');

      const editor = page.locator('.cm-editor').first();

      if (await editor.isVisible().catch(() => false)) {
        await editor.click();

        // Mesurer pendant la frappe
        const metricsPromise = measureRenderingMetrics(page, 2000);

        // Simuler la frappe rapide
        await page.keyboard.type('The quick brown fox jumps over the lazy dog. '.repeat(10), {
          delay: 10,
        });

        const metrics = await metricsPromise;

        expect(metrics.fps).toBeGreaterThanOrEqual(50);
        expect(metrics.longFrames).toBeLessThanOrEqual(3);
      }
    });

    test('syntax highlighting should not block rendering', async ({ page }) => {
      await page.goto('/?note=new');
      await page.waitForLoadState('networkidle');

      const editor = page.locator('.cm-editor').first();

      if (await editor.isVisible().catch(() => false)) {
        await editor.click();

        // Coller un gros bloc de markdown
        const markdownContent = `
# Heading 1
## Heading 2
### Heading 3

**Bold text** and *italic text*

\`\`\`javascript
const x = 1;
function test() {
  return x + 1;
}
\`\`\`

| Table | Col 2 | Col 3 |
|-------|-------|-------|
| A     | B     | C     |
| D     | E     | F     |
`.repeat(20);

        const renderTime = await measureInteractionRenderTime(page, async () => {
          await page.keyboard.type(markdownContent);
        });

        // Le rendu initial peut prendre un peu de temps
        expect(renderTime).toBeLessThan(500);
      }
    });
  });

  test.describe('Graph Rendering', () => {
    test('graph interactions should be smooth', async ({ page }) => {
      await page.goto('/?view=graph');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const canvas = page.locator('canvas').first();

      if (await canvas.isVisible().catch(() => false)) {
        // Mesurer pendant le pan
        const metricsPromise = measureRenderingMetrics(page, 3000);

        // Simuler le pan du graph
        const box = await canvas.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();

          for (let i = 0; i < 10; i++) {
            await page.mouse.move(box.x + box.width / 2 + i * 20, box.y + box.height / 2);
            await page.waitForTimeout(50);
          }

          await page.mouse.up();
        }

        const metrics = await metricsPromise;

        // Le graph devrait rester fluide pendant les interactions
        expect(metrics.fps).toBeGreaterThanOrEqual(30);
      }
    });
  });

  test.describe('Layout Stability', () => {
    test('should minimize layout shifts during load', async ({ page }) => {
      await page.goto('/');

      // Collecter les entrées Layout Shift
      const cls = await page.evaluate(async () => {
        return new Promise<number>(resolve => {
          let clsValue = 0;

          const observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
                clsValue += (entry as unknown as { value: number }).value;
              }
            }
          });

          observer.observe({ entryTypes: ['layout-shift'] as const });

          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 5000);
        });
      });

      expect(cls).toBeLessThan(0.1);
    });
  });
});
