/**
 * Complexity Tests
 * Tests to ensure code complexity stays within acceptable thresholds
 */

import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';
import escomplex from 'typhonjs-escomplex';
import { describe, it, expect, beforeAll } from 'vitest';

// Configuration
const CONFIG = {
  sourceDir: path.resolve(__dirname, '../../src'),
  thresholds: {
    cyclomatic: 10,
    cognitive: 15,
    linesPerFunction: 50,
    paramsPerFunction: 4,
    nestedDepth: 3,
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

// Store analysis results
let analysisResults: Array<{
  file: string;
  methods: Array<{
    name: string;
    cyclomatic: number;
    sloc: { logical: number };
    paramCount: number;
    maxNestedMethodDepth?: number;
  }>;
  maintainability: number;
}> = [];

describe('Code Complexity Analysis', () => {
  beforeAll(() => {
    const files = getSourceFiles();
    analysisResults = files
      .map(file => analyzeFile(file))
      .filter((result): result is NonNullable<typeof result> => result !== null);
  });

  describe('Cyclomatic Complexity', () => {
    it('should not have functions with cyclomatic complexity > 10', () => {
      const violations: string[] = [];

      for (const result of analysisResults) {
        for (const method of result.methods) {
          if (method.cyclomatic > CONFIG.thresholds.cyclomatic) {
            violations.push(`${result.file}:${method.name} - cyclomatic: ${method.cyclomatic}`);
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Cyclomatic complexity violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });

    it('should have average cyclomatic complexity < 5', () => {
      let totalComplexity = 0;
      let functionCount = 0;

      for (const result of analysisResults) {
        for (const method of result.methods) {
          totalComplexity += method.cyclomatic;
          functionCount++;
        }
      }

      const averageComplexity = functionCount > 0 ? totalComplexity / functionCount : 0;
      expect(averageComplexity).toBeLessThan(5);
    });
  });

  describe('Cognitive Complexity', () => {
    it('should not have functions with cognitive complexity > 15', () => {
      const violations: string[] = [];

      for (const result of analysisResults) {
        for (const method of result.methods) {
          const cognitive = calculateCognitiveComplexity(method);
          if (cognitive > CONFIG.thresholds.cognitive) {
            violations.push(`${result.file}:${method.name} - cognitive: ${cognitive}`);
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Cognitive complexity violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Function Size', () => {
    it('should not have functions with > 50 lines', () => {
      const violations: string[] = [];

      for (const result of analysisResults) {
        for (const method of result.methods) {
          if (method.sloc.logical > CONFIG.thresholds.linesPerFunction) {
            violations.push(`${result.file}:${method.name} - lines: ${method.sloc.logical}`);
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Function size violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Function Parameters', () => {
    it('should not have functions with > 4 parameters', () => {
      const violations: string[] = [];

      for (const result of analysisResults) {
        for (const method of result.methods) {
          if (method.paramCount > CONFIG.thresholds.paramsPerFunction) {
            violations.push(`${result.file}:${method.name} - params: ${method.paramCount}`);
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Parameter count violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Nesting Depth', () => {
    it('should not have functions with nesting depth > 3', () => {
      const violations: string[] = [];

      for (const result of analysisResults) {
        for (const method of result.methods) {
          const depth = method.maxNestedMethodDepth || 0;
          if (depth > CONFIG.thresholds.nestedDepth) {
            violations.push(`${result.file}:${method.name} - nesting: ${depth}`);
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Nesting depth violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Maintainability Index', () => {
    it('should have maintainability index > 80 for all files', () => {
      const violations: string[] = [];

      for (const result of analysisResults) {
        if (result.maintainability < 80) {
          violations.push(
            `${result.file} - maintainability: ${Math.round(result.maintainability)}`
          );
        }
      }

      if (violations.length > 0) {
        console.warn('Maintainability violations:');
        violations.forEach(v => {
          console.warn(`  - ${v}`);
        });
      }

      expect(violations).toHaveLength(0);
    });

    it('should have average maintainability index > 85', () => {
      let totalMaintainability = 0;

      for (const result of analysisResults) {
        totalMaintainability += result.maintainability;
      }

      const averageMaintainability =
        analysisResults.length > 0 ? totalMaintainability / analysisResults.length : 0;

      expect(averageMaintainability).toBeGreaterThan(85);
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

function analyzeFile(filePath: string): {
  file: string;
  methods: Array<{
    name: string;
    cyclomatic: number;
    sloc: { logical: number };
    paramCount: number;
    maxNestedMethodDepth?: number;
  }>;
  maintainability: number;
} | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(CONFIG.sourceDir, filePath);

    const result = escomplex.analyzeModule(content, {
      commonjs: true,
      forin: true,
      logicalor: true,
      switchcase: true,
      trycatch: true,
      newmi: true,
    });

    return {
      file: relativePath,
      methods: result.methods || [],
      maintainability: result.maintainability || 100,
    };
  } catch (error) {
    console.warn(`Could not analyze ${filePath}:`, error);
    return null;
  }
}

function calculateCognitiveComplexity(method: {
  cyclomatic: number;
  maxNestedMethodDepth?: number;
}): number {
  let complexity = method.cyclomatic;

  if (method.maxNestedMethodDepth) {
    complexity += method.maxNestedMethodDepth;
  }

  return complexity;
}
