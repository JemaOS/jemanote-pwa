/**
 * Lighthouse Performance Tests
 * 
 * Tests automatisés utilisant Lighthouse via Playwright
 * pour auditer les performances des pages critiques.
 */

import { test, expect } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import type { LH } from 'lighthouse';

interface LighthouseResult {
  lhr: {
    categories: {
      performance: { score: number };
      accessibility: { score: number };
      'best-practices': { score: number };
      seo: { score: number };
    };
    audits: Record<string, {
      numericValue?: number;
      score: number | null;
      displayValue?: string;
    }>;
  };
}

interface PerformanceMetrics {
  lcp: number;  // Largest Contentful Paint (ms)
  fcp: number;  // First Contentful Paint (ms)
  tbt: number;  // Total Blocking Time (ms)
  cls: number;  // Cumulative Layout Shift
  tti: number;  // Time to Interactive (ms)
  si: number;   // Speed Index (ms)
}

// Budgets de performance (en ms sauf CLS)
const PERFORMANCE_BUDGETS = {
  lcp: 2500,    // Largest Contentful Paint < 2.5s
  fcp: 1800,    // First Contentful Paint < 1.8s
  tbt: 200,     // Total Blocking Time < 200ms
  cls: 0.1,     // Cumulative Layout Shift < 0.1
  tti: 3800,    // Time to Interactive < 3.8s
  si: 3400,     // Speed Index < 3.4s
} as const;

// Seuils minimum pour les catégories Lighthouse
const CATEGORY_THRESHOLDS = {
  performance: 0.85,
  accessibility: 0.90,
  bestPractices: 0.90,
  seo: 0.90,
} as const;

/**
 * Exécute Lighthouse sur une URL donnée
 */
async function runLighthouseAudit(url: string): Promise<LighthouseResult> {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  });

  const options: LH.CliFlags = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options);
  await chrome.kill();

  if (!runnerResult) {
    throw new Error('Lighthouse audit failed to produce results');
  }

  return runnerResult as unknown as LighthouseResult;
}

/**
 * Extrait les métriques de performance d'un résultat Lighthouse
 */
function extractMetrics(result: LighthouseResult): PerformanceMetrics {
  const { audits } = result.lhr;
  
  return {
    lcp: audits['largest-contentful-paint']?.numericValue ?? 0,
    fcp: audits['first-contentful-paint']?.numericValue ?? 0,
    tbt: audits['total-blocking-time']?.numericValue ?? 0,
    cls: audits['cumulative-layout-shift']?.numericValue ?? 0,
    tti: audits['interactive']?.numericValue ?? 0,
    si: audits['speed-index']?.numericValue ?? 0,
  };
}

test.describe('Lighthouse Performance Audits', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

  test.describe('Homepage', () => {
    test('should pass performance budget', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/`);
      const metrics = extractMetrics(result);

      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.lcp);
      expect(metrics.fcp).toBeLessThan(PERFORMANCE_BUDGETS.fcp);
      expect(metrics.tbt).toBeLessThan(PERFORMANCE_BUDGETS.tbt);
      expect(metrics.cls).toBeLessThan(PERFORMANCE_BUDGETS.cls);
      expect(metrics.tti).toBeLessThan(PERFORMANCE_BUDGETS.tti);
      expect(metrics.si).toBeLessThan(PERFORMANCE_BUDGETS.si);
    });

    test('should meet category thresholds', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/`);
      const { categories } = result.lhr;

      expect(categories.performance.score).toBeGreaterThanOrEqual(CATEGORY_THRESHOLDS.performance);
      expect(categories.accessibility.score).toBeGreaterThanOrEqual(CATEGORY_THRESHOLDS.accessibility);
      expect(categories['best-practices'].score).toBeGreaterThanOrEqual(CATEGORY_THRESHOLDS.bestPractices);
      expect(categories.seo.score).toBeGreaterThanOrEqual(CATEGORY_THRESHOLDS.seo);
    });
  });

  test.describe('Editor Page', () => {
    test('should pass performance budget', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/?note=new`);
      const metrics = extractMetrics(result);

      // Budgets plus permissifs pour l'éditeur (plus complexe)
      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.lcp * 1.2); // +20%
      expect(metrics.fcp).toBeLessThan(PERFORMANCE_BUDGETS.fcp * 1.2);
      expect(metrics.tbt).toBeLessThan(PERFORMANCE_BUDGETS.tbt * 1.5); // +50% pour l'éditeur
      expect(metrics.cls).toBeLessThan(PERFORMANCE_BUDGETS.cls);
      expect(metrics.tti).toBeLessThan(PERFORMANCE_BUDGETS.tti * 1.2);
    });

    test('should meet category thresholds', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/?note=new`);
      const { categories } = result.lhr;

      expect(categories.performance.score).toBeGreaterThanOrEqual(CATEGORY_THRESHOLDS.performance - 0.05);
      expect(categories.accessibility.score).toBeGreaterThanOrEqual(CATEGORY_THRESHOLDS.accessibility);
    });
  });

  test.describe('Graph View', () => {
    test('should pass performance budget', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/?view=graph`);
      const metrics = extractMetrics(result);

      // Budgets plus permissifs pour le graph (WebGL/Canvas)
      expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.lcp * 1.5); // +50%
      expect(metrics.fcp).toBeLessThan(PERFORMANCE_BUDGETS.fcp * 1.2);
      expect(metrics.tbt).toBeLessThan(PERFORMANCE_BUDGETS.tbt * 2); // +100% pour le graph
      expect(metrics.cls).toBeLessThan(PERFORMANCE_BUDGETS.cls);
    });

    test('should meet category thresholds', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/?view=graph`);
      const { categories } = result.lhr;

      expect(categories.performance.score).toBeGreaterThanOrEqual(CATEGORY_THRESHOLDS.performance - 0.1);
      expect(categories.accessibility.score).toBeGreaterThanOrEqual(CATEGORY_THRESHOLDS.accessibility);
    });
  });

  test.describe('Resource Budgets', () => {
    test('JavaScript bundle should be under budget', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/`);
      const jsSize = result.lhr.audits['resource-summary']?.details?.items?.find(
        (item: { resourceType: string }) => item.resourceType === 'script'
      )?.transferSize ?? 0;

      // Budget: 300KB gzipped
      expect(jsSize).toBeLessThan(300 * 1024);
    });

    test('CSS bundle should be under budget', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/`);
      const cssSize = result.lhr.audits['resource-summary']?.details?.items?.find(
        (item: { resourceType: string }) => item.resourceType === 'stylesheet'
      )?.transferSize ?? 0;

      // Budget: 50KB gzipped
      expect(cssSize).toBeLessThan(50 * 1024);
    });

    test('Total page weight should be under budget', async () => {
      const result = await runLighthouseAudit(`${baseUrl  }/`);
      const totalSize = result.lhr.audits['resource-summary']?.details?.items?.reduce(
        (sum: number, item: { transferSize: number }) => sum + (item.transferSize || 0), 0
      ) ?? 0;

      // Budget: 500KB total
      expect(totalSize).toBeLessThan(500 * 1024);
    });
  });
});
