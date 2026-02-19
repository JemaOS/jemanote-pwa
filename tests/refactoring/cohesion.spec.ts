/**
 * Cohesion Tests
 * Tests to ensure module cohesion is high and responsibilities are well-defined
 */

import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';
import { describe, it, expect, beforeAll } from 'vitest';

// Configuration
const CONFIG = {
  sourceDir: path.resolve(__dirname, '../../src'),
  thresholds: {
    minMethodsPerClass: 1,
    maxMethodsPerClass: 20,
    maxPublicMethods: 10,
    maxProperties: 15,
    minCohesionRatio: 0.5, // LCOM (Lack of Cohesion of Methods) inverse
    maxFileResponsibilities: 3
  },
  excludePatterns: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/__mocks__/**',
    '**/*.stories.tsx',
    '**/*.stories.ts',
    '**/*.d.ts'
  ]
};

// Types
interface FileAnalysis {
  path: string;
  exports: {
    functions: string[];
    classes: string[];
    components: string[];
    hooks: string[];
    constants: string[];
    types: string[];
  };
  responsibilities: string[];
  cohesion: number;
}

// Store analysis results
let fileAnalyses: FileAnalysis[] = [];

describe('Module Cohesion Analysis', () => {
  beforeAll(() => {
    const files = getSourceFiles();
    fileAnalyses = files.map(file => analyzeFile(file));
  });

  describe('Single Responsibility', () => {
    it('should have files with clear, focused responsibilities', () => {
      const violations: string[] = [];

      for (const analysis of fileAnalyses) {
        const responsibilityCount = analysis.responsibilities.length;
        if (responsibilityCount > CONFIG.thresholds.maxFileResponsibilities) {
          violations.push(
            `${analysis.path} - responsibilities: ${responsibilityCount} (${analysis.responsibilities.join(', ')})`
          );
        }
      }

      if (violations.length > 0) {
        console.warn('Single responsibility violations:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Export Count', () => {
    it('should not have files with excessive exports', () => {
      const violations: string[] = [];

      for (const analysis of fileAnalyses) {
        const totalExports =
          analysis.exports.functions.length +
          analysis.exports.classes.length +
          analysis.exports.components.length +
          analysis.exports.hooks.length +
          analysis.exports.constants.length +
          analysis.exports.types.length;

        if (totalExports > 10) {
          violations.push(
            `${analysis.path} - exports: ${totalExports}`
          );
        }
      }

      if (violations.length > 0) {
        console.warn('Excessive export violations:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Component Cohesion', () => {
    it('should have components with focused props', () => {
      const violations: string[] = [];

      for (const analysis of fileAnalyses) {
        // Check for components with too many props (indicated by complex interfaces)
        if (analysis.exports.components.length > 0) {
          const content = fs.readFileSync(
            `${path.join(CONFIG.sourceDir, analysis.path)  }.tsx`,
            'utf-8'
          );

          // Look for Props interfaces with many properties
          const propsInterfaceMatch = content.match(/interface\s+\w*Props\s*{([^}]*)}/s);
          if (propsInterfaceMatch) {
            const propsContent = propsInterfaceMatch[1];
            const propCount = (propsContent.match(/\w+\??\s*:/g) || []).length;

            if (propCount > 10) {
              violations.push(
                `${analysis.path} - component props: ${propCount}`
              );
            }
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Component cohesion violations:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Hook Cohesion', () => {
    it('should have hooks that return consistent types', () => {
      const violations: string[] = [];

      const checkHookComplexity = (analysis: any, content: string) => {
        // SECURITY FIX: Limit content size to prevent ReDoS
        const MAX_CONTENT_LENGTH = 1000000; // 1MB max
        const safeContent = content.length > MAX_CONTENT_LENGTH
          ? content.substring(0, MAX_CONTENT_LENGTH)
          : content;

        const hookMatches = safeContent.match(/export\s+function\s+use[a-zA-Z_]\w{0,99}/g) || [];
        for (const hook of hookMatches) {
          const hookName = hook.replace('export function ', '');
          
          // SECURITY FIX: Validate hook name to prevent ReDoS in dynamic regex
          if (!/^\w+$/.test(hookName)) {
            continue; // Skip invalid hook names
          }
          
          // SECURITY FIX: Use safer regex with length limits
          const hookRegex = new RegExp(
            String.raw`export\s+function\s+${hookName}\s*\([^)]{0,500}\)\s*\{[\s\S]{0,50000}\}`,
            's'
          );
          const hookMatch = safeContent.match(hookRegex);
          if (!hookMatch) continue;
          
          const useEffectCount = (hookMatch[0].match(/useEffect/g) || []).length;
          const useStateCount = (hookMatch[0].match(/useState/g) || []).length;
          if (useEffectCount > 3 || useStateCount > 5) {
            violations.push(`${analysis.path}:${hookName} - effects: ${useEffectCount}, states: ${useStateCount}`);
          }
        }
      };

      for (const analysis of fileAnalyses) {
        if (analysis.exports.hooks.length === 0) continue;
        const content = fs.readFileSync(
          `${path.join(CONFIG.sourceDir, analysis.path)  }.ts`,
          'utf-8'
        );
        checkHookComplexity(analysis, content);
      }

      if (violations.length > 0) {
        console.warn('Hook cohesion violations:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Service Cohesion', () => {
    it('should have services with focused functionality', () => {
      const violations: string[] = [];

      for (const analysis of fileAnalyses) {
        if (analysis.path.startsWith('services/')) {
          const functionCount = analysis.exports.functions.length;

          // Services should have a reasonable number of functions
          if (functionCount > CONFIG.thresholds.maxMethodsPerClass) {
            violations.push(
              `${analysis.path} - functions: ${functionCount}`
            );
          }

          // Services should export functions, not just a class
          if (functionCount === 0 && analysis.exports.classes.length === 0) {
            violations.push(
              `${analysis.path} - no exported functions or classes`
            );
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Service cohesion violations:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Utility Cohesion', () => {
    it('should have utility files with related functions', () => {
      const violations: string[] = [];

      for (const analysis of fileAnalyses) {
        if (analysis.path.startsWith('utils/') || analysis.path.startsWith('lib/')) {
          const functionCount = analysis.exports.functions.length;

          // Utility files should have multiple related functions
          if (functionCount === 1) {
            // Single function utilities might be better placed elsewhere
            violations.push(
              `${analysis.path} - only 1 function, consider merging or relocating`
            );
          }

          // But not too many
          if (functionCount > 15) {
            violations.push(
              `${analysis.path} - too many functions (${functionCount}), consider splitting`
            );
          }
        }
      }

      if (violations.length > 0) {
        console.warn('Utility cohesion violations:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Naming Consistency', () => {
    it('should have consistent naming patterns within modules', () => {
      const violations: string[] = [];

      for (const analysis of fileAnalyses) {
        // Check for mix of naming conventions
        const functions = analysis.exports.functions;
        const camelCase = functions.filter(f => /^[a-z][a-zA-Z0-9]*$/.test(f));
        const PascalCase = functions.filter(f => /^[A-Z][a-zA-Z0-9]*$/.test(f));

        if (camelCase.length > 0 && PascalCase.length > 0) {
          violations.push(
            `${analysis.path} - mixed naming conventions (camelCase and PascalCase functions)`
          );
        }
      }

      if (violations.length > 0) {
        console.warn('Naming consistency violations:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
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
      ignore: CONFIG.excludePatterns
    });
    files.push(...matches);
  }

  return files.filter(file => !file.includes('node_modules'));
}

function analyzeFile(filePath: string): FileAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(CONFIG.sourceDir, filePath).replace(/\.(ts|tsx)$/, '');

  // Extract exports
  const exports = {
    functions: extractFunctionExports(content),
    classes: extractClassExports(content),
    components: extractComponentExports(content),
    hooks: extractHookExports(content),
    constants: extractConstantExports(content),
    types: extractTypeExports(content)
  };

  // Determine responsibilities
  const responsibilities = determineResponsibilities(exports, content);

  // Calculate cohesion (simplified)
  const cohesion = calculateCohesion(exports, content);

  return {
    path: relativePath,
    exports,
    responsibilities,
    cohesion
  };
}

function extractFunctionExports(content: string): string[] {
  const functions: string[] = [];
  const regex = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  return functions;
}

function extractClassExports(content: string): string[] {
  const classes: string[] = [];
  const regex = /export\s+(?:abstract\s+)?class\s+(\w+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    classes.push(match[1]);
  }

  return classes;
}

function extractComponentExports(content: string): string[] {
  const components: string[] = [];
  const regex = /export\s+(?:default\s+)?(?:function|const)\s+(\w+):?\s*.*?React\.FC|export\s+(?:default\s+)?(?:function|const)\s+(\w+)\s*[=\(].*?=>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const name = match[1] || match[2];
    if (name && /^[A-Z]/.test(name)) {
      components.push(name);
    }
  }

  // Also check for JSX return
  const jsxRegex = /export\s+(?:default\s+)?(?:function|const)\s+(\w+)/g;
  while ((match = jsxRegex.exec(content)) !== null) {
    const name = match[1];
    if (name && /^[A-Z]/.test(name) && !components.includes(name)) {
      // Check if function returns JSX
      const funcRegex = new RegExp(
        `(?:function|const)\\s+${name}.*?=>\\s*\\(??[\\s\\S]*?<\\w+`,
        's'
      );
      if (funcRegex.test(content)) {
        components.push(name);
      }
    }
  }

  return components;
}

function extractHookExports(content: string): string[] {
  const hooks: string[] = [];
  const regex = /export\s+(?:default\s+)?(?:function|const)\s+(use\w+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    hooks.push(match[1]);
  }

  return hooks;
}

function extractConstantExports(content: string): string[] {
  const constants: string[] = [];
  const regex = /export\s+const\s+(\w+)\s*=/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    constants.push(match[1]);
  }

  return constants;
}

function extractTypeExports(content: string): string[] {
  const types: string[] = [];
  const regex = /export\s+(?:type|interface)\s+(\w+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    types.push(match[1]);
  }

  return types;
}

function determineResponsibilities(exports: FileAnalysis['exports'], content: string): string[] {
  const responsibilities: string[] = [];

  if (exports.components.length > 0) {
    responsibilities.push('UI Rendering');
  }

  if (exports.hooks.length > 0) {
    responsibilities.push('State Management');
  }

  if (exports.functions.some(f =>
    f.includes('fetch') || f.includes('get') || f.includes('post') || f.includes('api')
  )) {
    responsibilities.push('Data Fetching');
  }

  if (exports.functions.some(f =>
    f.includes('validate') || f.includes('parse') || f.includes('format')
  )) {
    responsibilities.push('Data Transformation');
  }

  if (exports.functions.some(f =>
    f.includes('handle') || f.includes('on') || f.includes('click')
  )) {
    responsibilities.push('Event Handling');
  }

  if (content.includes('localStorage') || content.includes('indexedDB')) {
    responsibilities.push('Storage');
  }

  if (content.includes('useEffect') || content.includes('useLayoutEffect')) {
    responsibilities.push('Side Effects');
  }

  return responsibilities;
}

function calculateCohesion(exports: FileAnalysis['exports'], content: string): number {
  // Simplified LCOM (Lack of Cohesion of Methods) calculation
  // Higher is better (1 = perfect cohesion)

  const allExports = [
    ...exports.functions,
    ...exports.hooks,
    ...exports.components
  ];

  if (allExports.length <= 1) {
    return 1; // Single export is perfectly cohesive
  }

  // Count shared dependencies between exports
  let sharedDependencies = 0;
  const exportDependencies: string[][] = [];

  for (const exp of allExports) {
    const regex = new RegExp(String.raw`${exp}.*?\{([^}]*)\}`, 's');
    const match = content.match(regex);
    if (match) {
      const deps = (match[1].match(/\b\w+\b/g) || []).filter(w =>
        allExports.includes(w) && w !== exp
      );
      exportDependencies.push(deps);
    }
  }

  // Calculate cohesion based on shared dependencies
  for (let i = 0; i < exportDependencies.length; i++) {
    for (let j = i + 1; j < exportDependencies.length; j++) {
      const shared = exportDependencies[i].filter(d =>
        exportDependencies[j].includes(d)
      );
      if (shared.length > 0) {
        sharedDependencies++;
      }
    }
  }

  const possiblePairs = (allExports.length * (allExports.length - 1)) / 2;
  return possiblePairs > 0 ? sharedDependencies / possiblePairs : 1;
}
