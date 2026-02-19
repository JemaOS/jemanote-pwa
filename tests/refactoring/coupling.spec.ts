/**
 * Coupling Tests
 * Tests to ensure module coupling stays within acceptable thresholds
 */

import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';
import { describe, it, expect, beforeAll } from 'vitest';

// Configuration
const CONFIG = {
  sourceDir: path.resolve(__dirname, '../../src'),
  thresholds: {
    maxDependencies: 10, // Max imports per file
    maxDependents: 10, // Max files importing a module
    maxExternalDeps: 15, // Max external dependencies per file
    instabilityThreshold: 0.7, // Max instability (I = Ce / (Ca + Ce))
  },
  excludePatterns: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/__mocks__/**',
    '**/*.stories.tsx',
    '**/*.stories.ts',
    '**/*.d.ts',
  ],
};

// Types
interface DependencyGraph {
  [key: string]: {
    dependencies: string[];
    dependents: string[];
    externalDeps: string[];
  };
}

interface CouplingMetrics {
  path: string;
  ca: number; // Afferent coupling (incoming)
  ce: number; // Efferent coupling (outgoing)
  instability: number;
}

// Store analysis results
let dependencyGraph: DependencyGraph = {};
let couplingMetrics: CouplingMetrics[] = [];

describe('Module Coupling Analysis', () => {
  beforeAll(() => {
    const files = getSourceFiles();
    dependencyGraph = buildDependencyGraph(files);
    couplingMetrics = calculateCouplingMetrics(dependencyGraph);
  });

  describe('Dependency Count', () => {
    it('should not have files with > 10 dependencies', () => {
      const violations: string[] = [];

      for (const [file, data] of Object.entries(dependencyGraph)) {
        if (data.dependencies.length > CONFIG.thresholds.maxDependencies) {
          violations.push(`${file} - dependencies: ${data.dependencies.length}`);
        }
      }

      if (violations.length > 0) {
        console.warn('High dependency violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });

    it('should not have files with > 15 external dependencies', () => {
      const violations: string[] = [];

      for (const [file, data] of Object.entries(dependencyGraph)) {
        if (data.externalDeps.length > CONFIG.thresholds.maxExternalDeps) {
          violations.push(`${file} - external deps: ${data.externalDeps.length}`);
        }
      }

      if (violations.length > 0) {
        console.warn('High external dependency violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Instability', () => {
    it('should not have modules with instability > 0.7', () => {
      const violations: string[] = [];

      for (const metric of couplingMetrics) {
        if (metric.instability > CONFIG.thresholds.instabilityThreshold) {
          violations.push(`${metric.path} - instability: ${metric.instability.toFixed(2)}`);
        }
      }

      if (violations.length > 0) {
        console.warn('High instability violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });

    it('should have average instability < 0.5', () => {
      const totalInstability = couplingMetrics.reduce((sum, m) => sum + m.instability, 0);

      const averageInstability =
        couplingMetrics.length > 0 ? totalInstability / couplingMetrics.length : 0;

      expect(averageInstability).toBeLessThan(0.5);
    });
  });

  describe('God Modules', () => {
    it('should not have god modules with > 10 dependents', () => {
      const violations: string[] = [];

      for (const metric of couplingMetrics) {
        if (metric.ca > CONFIG.thresholds.maxDependents) {
          violations.push(`${metric.path} - dependents: ${metric.ca}`);
        }
      }

      if (violations.length > 0) {
        console.warn('God module violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Circular Dependencies', () => {
    it('should not have circular dependencies', () => {
      const cycles = detectCircularDependencies(dependencyGraph);

      if (cycles.length > 0) {
        console.warn('Circular dependencies detected:');
        cycles.forEach((cycle, i) => {
          console.warn(`  Cycle ${i + 1}: ${cycle.join(' → ')}`);
        });
      }

      expect(cycles).toHaveLength(0);
    });
  });

  describe('Layer Dependencies', () => {
    it('should not have services depending on components', () => {
      const violations: string[] = [];

      for (const [file, data] of Object.entries(dependencyGraph)) {
        if (file.startsWith('services/')) {
          for (const dep of data.dependencies) {
            if (dep.startsWith('components/')) {
              violations.push(`${file} → ${dep}`);
            }
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Layer violation (services → components):');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });

    it('should not have utils depending on components or services', () => {
      const violations: string[] = [];

      for (const [file, data] of Object.entries(dependencyGraph)) {
        if (file.startsWith('utils/')) {
          for (const dep of data.dependencies) {
            if (dep.startsWith('components/') || dep.startsWith('services/')) {
              violations.push(`${file} → ${dep}`);
            }
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Layer violation (utils → components/services):');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });
  });
});

// Helper functions
function getSourceFiles(): string[] {
  const files: string[] = [];
  const extensions = ['*.ts', '*.tsx'];

  for (const ext of extensions) {
    const pattern = path.join(CONFIG.sourceDir, '**', ext);
    const matches = glob.sync(pattern, {
      ignore: CONFIG.excludePatterns,
    });
    files.push(...matches);
  }

  return files.filter(file => !file.includes('node_modules'));
}

function parseImports(content: string): { internal: string[]; external: string[] } {
  const internal: string[] = [];
  const external: string[] = [];

  // ES6 imports
  const importRegex = /import\s+(?:(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"];?/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    if (importPath.startsWith('.')) {
      // Relative import - treat as internal
      internal.push(importPath);
    } else if (importPath.startsWith('@/')) {
      // Alias import - treat as internal
      internal.push(importPath);
    } else {
      // External dependency
      external.push(importPath);
    }
  }

  return { internal, external };
}

function buildDependencyGraph(files: string[]): DependencyGraph {
  const graph: DependencyGraph = {};

  // Initialize graph
  for (const file of files) {
    const relativePath = path.relative(CONFIG.sourceDir, file).replace(/\.(ts|tsx)$/, '');
    graph[relativePath] = {
      dependencies: [],
      dependents: [],
      externalDeps: [],
    };
  }

  // Build relationships
  for (const file of files) {
    const relativePath = path.relative(CONFIG.sourceDir, file).replace(/\.(ts|tsx)$/, '');
    const content = fs.readFileSync(file, 'utf-8');
    const { internal, external } = parseImports(content);

    graph[relativePath].externalDeps = external;

    for (const imp of internal) {
      // Resolve relative import
      const dirName = path.dirname(file);
      let resolvedPath: string | null = null;

      if (imp.startsWith('@/')) {
        resolvedPath = imp.replace('@/', '');
      } else {
        const resolved = path.resolve(dirName, imp);
        resolvedPath = path.relative(CONFIG.sourceDir, resolved).replace(/\.(ts|tsx)$/, '');
      }

      if (resolvedPath && graph[resolvedPath]) {
        graph[relativePath].dependencies.push(resolvedPath);
        graph[resolvedPath].dependents.push(relativePath);
      }
    }
  }

  return graph;
}

function calculateCouplingMetrics(graph: DependencyGraph): CouplingMetrics[] {
  const metrics: CouplingMetrics[] = [];

  for (const [path, data] of Object.entries(graph)) {
    const ca = data.dependents.length;
    const ce = data.dependencies.length;
    const instability = ca + ce === 0 ? 0 : ce / (ca + ce);

    metrics.push({
      path,
      ca,
      ce,
      instability: Math.round(instability * 100) / 100,
    });
  }

  return metrics.sort((a, b) => b.instability - a.instability);
}

function detectCircularDependencies(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]) {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat([node]);
      cycles.push(cycle);
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    recursionStack.add(node);

    const nodeData = graph[node];
    if (nodeData) {
      for (const dep of nodeData.dependencies) {
        dfs(dep, [...path, node]);
      }
    }

    recursionStack.delete(node);
  }

  for (const key of Object.keys(graph)) {
    if (!visited.has(key)) {
      dfs(key, []);
    }
  }

  // Remove duplicate cycles
  const uniqueCycles: string[][] = [];
  const seen = new Set<string>();

  for (const cycle of cycles) {
    const normalized = cycle.slice(0, -1).sort().join(',');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueCycles.push(cycle);
    }
  }

  return uniqueCycles;
}
