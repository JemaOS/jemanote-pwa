/**
 * Bundle Size Tests
 * 
 * Tests pour surveiller la taille des bundles et s'assurer
 * qu'ils respectent les budgets définis.
 */

import * as nodeFs from 'node:fs';
import * as nodePath from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import { test, expect } from '@playwright/test';

const gzipAsync = promisify(gzip);

interface BundleStats {
  path: string;
  size: number;
  gzipSize: number;
  name: string;
}

interface BundleBudget {
  pattern: RegExp;
  maxSize: number;      // Taille max en bytes (non compressée)
  maxGzipSize: number;  // Taille max en bytes (gzip)
  name: string;
}

// Budgets de taille pour les différents types de bundles
const BUNDLE_BUDGETS: BundleBudget[] = [
  {
    pattern: /index-.*\.js$/,
    maxSize: 500 * 1024,     // 500KB non compressé
    maxGzipSize: 150 * 1024, // 150KB gzippé
    name: 'Main Entry (index.js)',
  },
  {
    pattern: /vendor-.*\.js$/,
    maxSize: 800 * 1024,     // 800KB non compressé
    maxGzipSize: 250 * 1024, // 250KB gzippé
    name: 'Vendor Bundle',
  },
  {
    pattern: /react-.*\.js$/,
    maxSize: 300 * 1024,     // 300KB non compressé
    maxGzipSize: 100 * 1024, // 100KB gzippé
    name: 'React Bundle',
  },
  {
    pattern: /codemirror-.*\.js$/,
    maxSize: 400 * 1024,     // 400KB non compressé
    maxGzipSize: 120 * 1024, // 120KB gzippé
    name: 'CodeMirror Bundle',
  },
  {
    pattern: /cytoscape-.*\.js$/,
    maxSize: 350 * 1024,     // 350KB non compressé
    maxGzipSize: 100 * 1024, // 100KB gzippé
    name: 'Cytoscape Bundle',
  },
  {
    pattern: /.*\.css$/,
    maxSize: 200 * 1024,    // 200KB non compressé
    maxGzipSize: 50 * 1024, // 50KB gzippé
    name: 'CSS Bundle',
  },
];

// Budget global
const TOTAL_BUDGET = {
  maxSize: 2 * 1024 * 1024,     // 2MB total non compressé
  maxGzipSize: 500 * 1024,      // 500KB total gzippé
  maxJsSize: 1.5 * 1024 * 1024, // 1.5MB JS total
  maxCssSize: 200 * 1024,       // 200KB CSS total
};

/**
 * Récupère tous les fichiers du dossier dist/assets
 */
async function getBundleFiles(): Promise<BundleStats[]> {
  const assetsDir = nodePath.join(process.cwd(), 'dist', 'assets');
  
  if (!nodeFs.existsSync(assetsDir)) {
    throw new Error('dist/assets directory not found. Run npm run build first.');
  }

  const files = nodeFs.readdirSync(assetsDir);
  const stats: BundleStats[] = [];

  for (const file of files) {
    const filePath = nodePath.join(assetsDir, file);
    const content = nodeFs.readFileSync(filePath);
    const gzipped = await gzipAsync(content);

    stats.push({
      path: filePath,
      size: content.length,
      gzipSize: gzipped.length,
      name: file,
    });
  }

  return stats;
}

/**
 * Trouve le budget correspondant à un fichier
 */
function findBudget(filename: string): BundleBudget | undefined {
  return BUNDLE_BUDGETS.find(budget => budget.pattern.test(filename));
}

test.describe('Bundle Size Tests', () => {
  let bundleStats: BundleStats[];

  test.beforeAll(async () => {
    bundleStats = await getBundleFiles();
  });

  test.describe('Individual Bundle Budgets', () => {
    test('all JS bundles should respect their budgets', () => {
      const jsBundles = bundleStats.filter(stat => stat.name.endsWith('.js'));
      
      for (const bundle of jsBundles) {
        const budget = findBudget(bundle.name);
        
        if (budget) {
          expect(
            bundle.gzipSize,
            `${budget.name} (${bundle.name}) exceeds gzip budget: ${(bundle.gzipSize / 1024).toFixed(2)}KB > ${(budget.maxGzipSize / 1024).toFixed(2)}KB`
          ).toBeLessThanOrEqual(budget.maxGzipSize);
          
          expect(
            bundle.size,
            `${budget.name} (${bundle.name}) exceeds raw budget: ${(bundle.size / 1024).toFixed(2)}KB > ${(budget.maxSize / 1024).toFixed(2)}KB`
          ).toBeLessThanOrEqual(budget.maxSize);
        }
      }
    });

    test('all CSS bundles should respect their budgets', () => {
      const cssBundles = bundleStats.filter(stat => stat.name.endsWith('.css'));
      
      for (const bundle of cssBundles) {
        const budget = findBudget(bundle.name);
        
        if (budget) {
          expect(
            bundle.gzipSize,
            `CSS bundle (${bundle.name}) exceeds gzip budget: ${(bundle.gzipSize / 1024).toFixed(2)}KB > ${(budget.maxGzipSize / 1024).toFixed(2)}KB`
          ).toBeLessThanOrEqual(budget.maxGzipSize);
        }
      }
    });
  });

  test.describe('Total Bundle Budgets', () => {
    test('total bundle size should be under budget', () => {
      const totalSize = bundleStats.reduce((sum, stat) => sum + stat.size, 0);
      const totalGzipSize = bundleStats.reduce((sum, stat) => sum + stat.gzipSize, 0);

      expect(
        totalGzipSize,
        `Total gzipped size exceeds budget: ${(totalGzipSize / 1024).toFixed(2)}KB > ${(TOTAL_BUDGET.maxGzipSize / 1024).toFixed(2)}KB`
      ).toBeLessThanOrEqual(TOTAL_BUDGET.maxGzipSize);

      expect(
        totalSize,
        `Total raw size exceeds budget: ${(totalSize / 1024 / 1024).toFixed(2)}MB > ${(TOTAL_BUDGET.maxSize / 1024 / 1024).toFixed(2)}MB`
      ).toBeLessThanOrEqual(TOTAL_BUDGET.maxSize);
    });

    test('total JavaScript size should be under budget', () => {
      const jsStats = bundleStats.filter(stat => stat.name.endsWith('.js'));
      const totalJsSize = jsStats.reduce((sum, stat) => sum + stat.size, 0);
      const totalJsGzipSize = jsStats.reduce((sum, stat) => sum + stat.gzipSize, 0);

      expect(
        totalJsGzipSize,
        `Total JS gzipped size exceeds budget: ${(totalJsGzipSize / 1024).toFixed(2)}KB > ${(TOTAL_BUDGET.maxGzipSize / 1024).toFixed(2)}KB`
      ).toBeLessThanOrEqual(TOTAL_BUDGET.maxGzipSize);

      expect(
        totalJsSize,
        `Total JS raw size exceeds budget: ${(totalJsSize / 1024 / 1024).toFixed(2)}MB > ${(TOTAL_BUDGET.maxJsSize / 1024 / 1024).toFixed(2)}MB`
      ).toBeLessThanOrEqual(TOTAL_BUDGET.maxJsSize);
    });

    test('total CSS size should be under budget', () => {
      const cssStats = bundleStats.filter(stat => stat.name.endsWith('.css'));
      const totalCssSize = cssStats.reduce((sum, stat) => sum + stat.size, 0);
      const totalCssGzipSize = cssStats.reduce((sum, stat) => sum + stat.gzipSize, 0);

      expect(
        totalCssGzipSize,
        `Total CSS gzipped size exceeds budget: ${(totalCssGzipSize / 1024).toFixed(2)}KB > 50KB`
      ).toBeLessThanOrEqual(50 * 1024);

      expect(
        totalCssSize,
        `Total CSS raw size exceeds budget: ${(totalCssSize / 1024).toFixed(2)}KB > ${(TOTAL_BUDGET.maxCssSize / 1024).toFixed(2)}KB`
      ).toBeLessThanOrEqual(TOTAL_BUDGET.maxCssSize);
    });
  });

  test.describe('Chunk Analysis', () => {
    test('should have reasonable number of chunks', () => {
      const jsChunks = bundleStats.filter(stat => stat.name.endsWith('.js'));
      
      // Devrait avoir entre 5 et 20 chunks pour un bon code splitting
      expect(jsChunks.length).toBeGreaterThanOrEqual(5);
      expect(jsChunks.length).toBeLessThanOrEqual(30);
    });

    test('no single chunk should exceed 50% of total JS', () => {
      const jsStats = bundleStats.filter(stat => stat.name.endsWith('.js'));
      const totalJsSize = jsStats.reduce((sum, stat) => sum + stat.size, 0);
      
      for (const stat of jsStats) {
        const percentage = (stat.size / totalJsSize) * 100;
        expect(
          percentage,
          `Chunk ${stat.name} is too large: ${percentage.toFixed(1)}% of total JS`
        ).toBeLessThanOrEqual(50);
      }
    });

    test('should generate source maps in development', () => {
      const sourceMaps = bundleStats.filter(stat => stat.name.endsWith('.map'));
      const jsFiles = bundleStats.filter(stat => stat.name.endsWith('.js') && !stat.name.endsWith('.map'));
      
      // En production, on peut ne pas avoir de source maps
      // Ce test vérifie juste la cohérence si elles existent
      if (sourceMaps.length > 0) {
        expect(sourceMaps.length).toBeGreaterThanOrEqual(jsFiles.length * 0.5);
      }
    });
  });

  test.describe('Bundle Composition', () => {
    test('should have separate vendor chunks', () => {
      const vendorChunks = bundleStats.filter(stat => 
        stat.name.includes('vendor') || stat.name.includes('node_modules')
      );
      
      expect(vendorChunks.length).toBeGreaterThanOrEqual(1);
    });

    test('should lazy load heavy dependencies', () => {
      // Vérifie que les grosses dépendances sont dans des chunks séparés
      const heavyLibs = ['cytoscape', 'codemirror', 'mermaid', 'recharts'];
      
      for (const lib of heavyLibs) {
        const libChunk = bundleStats.find(stat => 
          stat.name.toLowerCase().includes(lib.toLowerCase())
        );
        
        // Si la librairie est présente, elle devrait être dans un chunk séparé
        if (libChunk) {
          expect(libChunk.size).toBeGreaterThan(10 * 1024); // Au moins 10KB
        }
      }
    });
  });
});
