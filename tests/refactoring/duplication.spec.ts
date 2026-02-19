/**
 * Duplication Tests
 * Tests to ensure code duplication stays within acceptable thresholds
 */

import fs from 'node:fs';
import path from 'node:path';

import { glob } from 'glob';
import { describe, it, expect, beforeAll } from 'vitest';

// Configuration
const CONFIG = {
  sourceDir: path.resolve(__dirname, '../../src'),
  thresholds: {
    maxDuplicationPercent: 3,
    minDuplicateLines: 5,
    minDuplicateTokens: 50,
    maxSimilarFunctions: 2
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
interface DuplicateBlock {
  file1: string;
  file2: string;
  lines1: { start: number; end: number };
  lines2: { start: number; end: number };
  content: string;
  similarity: number;
}

interface DuplicationReport {
  totalFiles: number;
  totalLines: number;
  duplicatedLines: number;
  duplicationPercent: number;
  duplicates: DuplicateBlock[];
}

// Store analysis results
let duplicationReport: DuplicationReport = {
  totalFiles: 0,
  totalLines: 0,
  duplicatedLines: 0,
  duplicationPercent: 0,
  duplicates: []
};

describe('Code Duplication Analysis', () => {
  beforeAll(() => {
    const files = getSourceFiles();
    duplicationReport = analyzeDuplication(files);
  });

  describe('Duplication Threshold', () => {
    it('should have total duplication < 3%', () => {
      console.log(`Duplication: ${duplicationReport.duplicationPercent.toFixed(2)}%`);

      expect(duplicationReport.duplicationPercent).toBeLessThan(
        CONFIG.thresholds.maxDuplicationPercent
      );
    });

    it('should not have any files with > 10% duplication', () => {
      const fileDuplication = calculateFileDuplication(duplicationReport);
      const violations: string[] = [];

      for (const [file, percent] of Object.entries(fileDuplication)) {
        if (percent > 10) {
          violations.push(`${file} - ${percent.toFixed(2)}%`);
        }
      }

      if (violations.length > 0) {
        console.warn('High file duplication:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Duplicate Blocks', () => {
    it('should not have duplicate blocks > 10 lines', () => {
      const violations: string[] = [];

      for (const dup of duplicationReport.duplicates) {
        const lines1 = dup.lines1.end - dup.lines1.start + 1;
        const lines2 = dup.lines2.end - dup.lines2.start + 1;

        if (lines1 > 10 || lines2 > 10) {
          violations.push(
            `${dup.file1}:${dup.lines1.start}-${dup.lines1.end} ↔ ${dup.file2}:${dup.lines2.start}-${dup.lines2.end} (${Math.max(lines1, lines2)} lines)`
          );
        }
      }

      if (violations.length > 0) {
        console.warn('Large duplicate blocks:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });

    it('should not have identical functions in different files', () => {
      const violations = findIdenticalFunctions(duplicationReport);

      if (violations.length > 0) {
        console.warn('Identical functions found:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Similar Code Patterns', () => {
    it('should not have more than 2 similar function implementations', () => {
      const files = getSourceFiles();
      const violations = findSimilarFunctions(files);

      if (violations.length > 0) {
        console.warn('Similar function patterns:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });

    it('should not have duplicated error handling patterns', () => {
      const files = getSourceFiles();
      const violations = findDuplicatedErrorHandling(files);

      if (violations.length > 0) {
        console.warn('Duplicated error handling:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Type Duplication', () => {
    it('should not have identical type definitions', () => {
      const files = getSourceFiles();
      const violations = findDuplicatedTypes(files);

      if (violations.length > 0) {
        console.warn('Duplicated type definitions:');
        violations.forEach(v => { console.warn(`  - ${v}`); });
      }

      expect(violations).toHaveLength(0);
    });
  });

  describe('Import Duplication', () => {
    it('should not have unused imports', () => {
      const files = getSourceFiles();
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const unusedImports = findUnusedImports(content);

        if (unusedImports.length > 0) {
          const relativePath = path.relative(CONFIG.sourceDir, file);
          violations.push(`${relativePath}: ${unusedImports.join(', ')}`);
        }
      }

      if (violations.length > 0) {
        console.warn('Unused imports:');
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

function readFileContents(files: string[]): { fileContents: { [key: string]: string[] }; totalLines: number } {
  const fileContents: { [key: string]: string[] } = {};
  let totalLines = 0;
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf-8').split('\n');
    const relativePath = path.relative(CONFIG.sourceDir, file);
    fileContents[relativePath] = lines;
    totalLines += lines.length;
  }
  return { fileContents, totalLines };
}

function findDuplicateWindow(
  // eslint-disable-next-line max-params
  window1: string, file1: string, i: number,
  file2: string, lines2: string[], windowSize: number,
  processed: Set<string>, duplicates: DuplicateBlock[]
) {
  for (let j = 0; j <= lines2.length - windowSize; j++) {
    const window2 = lines2.slice(j, j + windowSize).join('\n').trim();
    if (window1 !== window2 || window1.length <= CONFIG.thresholds.minDuplicateTokens) continue;
    
    const similarity = calculateSimilarity(window1, window2);
    if (similarity <= 0.9) continue;
    
    duplicates.push({
      file1, file2,
      lines1: { start: i + 1, end: i + windowSize },
      lines2: { start: j + 1, end: j + windowSize },
      content: window1.substring(0, 100), similarity
    });
    for (let k = 0; k < windowSize; k++) {
      processed.add(`${file1}:${i + k}`);
      processed.add(`${file2}:${j + k}`);
    }
  }
}

function analyzeDuplication(files: string[]): DuplicationReport {
  const { fileContents, totalLines } = readFileContents(files);
  const windowSize = CONFIG.thresholds.minDuplicateLines;
  const duplicates: DuplicateBlock[] = [];
  const processed = new Set<string>();

  for (const [file1, lines1] of Object.entries(fileContents)) {
    for (let i = 0; i <= lines1.length - windowSize; i++) {
      if (processed.has(`${file1}:${i}`)) continue;
      const window1 = lines1.slice(i, i + windowSize).join('\n').trim();

      for (const [file2, lines2] of Object.entries(fileContents)) {
        if (file1 === file2) continue;
        findDuplicateWindow(window1, file1, i, file2, lines2, windowSize, processed, duplicates);
      }
    }
  }

  const duplicatedLines = processed.size;
  return {
    totalFiles: files.length,
    totalLines,
    duplicatedLines,
    duplicationPercent: totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0,
    duplicates
  };
}

function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) {return 1;}

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {return 1;}

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function calculateFileDuplication(report: DuplicationReport): { [key: string]: number } {
  const fileDuplication: { [key: string]: { total: number; duplicated: number } } = {};

  for (const dup of report.duplicates) {
    if (!fileDuplication[dup.file1]) {
      fileDuplication[dup.file1] = { total: 0, duplicated: 0 };
    }
    if (!fileDuplication[dup.file2]) {
      fileDuplication[dup.file2] = { total: 0, duplicated: 0 };
    }

    const lines1 = dup.lines1.end - dup.lines1.start + 1;
    const lines2 = dup.lines2.end - dup.lines2.start + 1;

    fileDuplication[dup.file1].duplicated += lines1;
    fileDuplication[dup.file2].duplicated += lines2;
  }

  const result: { [key: string]: number } = {};
  for (const [file, data] of Object.entries(fileDuplication)) {
    // Estimate total lines (simplified)
    const estimatedTotal = Math.max(data.duplicated * 2, 100);
    result[file] = (data.duplicated / estimatedTotal) * 100;
  }

  return result;
}

function findIdenticalFunctions(report: DuplicationReport): string[] {
  const violations: string[] = [];

  for (const dup of report.duplicates) {
    // Check if the duplicate looks like a function
    if (dup.content.includes('function') || dup.content.includes('=>')) {
      violations.push(
        `${dup.file1}:${dup.lines1.start} ↔ ${dup.file2}:${dup.lines2.start}`
      );
    }
  }

  return violations;
}

function findSimilarFunctions(files: string[]): string[] {
  const violations: string[] = [];
  const functionBodies: { [key: string]: string[] } = {};

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(CONFIG.sourceDir, file);

    // SECURITY FIX: Added content length limit and safer regex to prevent ReDoS
    const MAX_CONTENT_LENGTH = 1000000; // 1MB max per file
    const safeContent = content.length > MAX_CONTENT_LENGTH
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

    // Extract function bodies (simplified) with safer regex patterns
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_]\w{0,99})\s*\([^)]{0,500}\)\s*\{([^}]*)\}/g;
    let match;

    while ((match = functionRegex.exec(safeContent)) !== null) {
      const funcName = match[1];
      const funcBody = match[2].replaceAll(/\s+/g, ' ').trim();

      if (!functionBodies[funcBody]) {
        functionBodies[funcBody] = [];
      }
      functionBodies[funcBody].push(`${relativePath}:${funcName}`);
    }
  }

  // Find similar functions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [body, locations] of Object.entries(functionBodies)) {
    if (locations.length > CONFIG.thresholds.maxSimilarFunctions) {
      violations.push(`Similar functions found in: ${locations.join(', ')}`);
    }
  }

  return violations;
}

function findDuplicatedErrorHandling(files: string[]): string[] {
  const violations: string[] = [];
  const errorPatterns: { [key: string]: string[] } = {};

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(CONFIG.sourceDir, file);

    // SECURITY FIX: Limit content size for regex processing
    const MAX_CONTENT_LENGTH = 1000000; // 1MB max per file
    const safeContent = content.length > MAX_CONTENT_LENGTH
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

    // Find try-catch blocks with safer regex
    const tryCatchRegex = /try\s*\{[\s\S]{0,10000}\}\s*catch\s*\([^)]{0,200}\)\s*\{([^}]*)\}/g;
    let match;

    while ((match = tryCatchRegex.exec(safeContent)) !== null) {
      const catchBody = match[1].replaceAll(/\s+/g, ' ').trim();

      if (!errorPatterns[catchBody]) {
        errorPatterns[catchBody] = [];
      }
      errorPatterns[catchBody].push(relativePath);
    }
  }

  // Find duplicated error handling
  for (const [pattern, locations] of Object.entries(errorPatterns)) {
    if (locations.length > 2 && pattern.length > 50) {
      violations.push(`Duplicated error handling in: ${locations.join(', ')}`);
    }
  }

  return violations;
}

function findDuplicatedTypes(files: string[]): string[] {
  const violations: string[] = [];
  const typeDefinitions: { [key: string]: string[] } = {};

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(CONFIG.sourceDir, file);

    // Find interface definitions
    const interfaceRegex = /export\s+interface\s+(\w+)\s*\{([^}]*)\}/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceBody = match[2].replaceAll(/\s+/g, ' ').trim();

      if (!typeDefinitions[interfaceBody]) {
        typeDefinitions[interfaceBody] = [];
      }
      typeDefinitions[interfaceBody].push(`${relativePath}:${match[1]}`);
    }
  }

  // Find duplicated types
  for (const [body, locations] of Object.entries(typeDefinitions)) {
    if (locations.length > 1 && body.length > 30) {
      violations.push(`Duplicated type in: ${locations.join(', ')}`);
    }
  }

  return violations;
}

function findUnusedImports(content: string): string[] {
  const unused: string[] = [];

  // Find all imports
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"];?/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1].split(',').map(i => i.trim().split(' as ')[0]);

    for (const imp of imports) {
      // SECURITY FIX: Escape special regex characters in import names to prevent ReDoS
      // and validate import name format before creating dynamic regex
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(imp)) {
        continue; // Skip invalid import names
      }
      
      // Check if import is used (excluding the import statement itself)
      const usageRegex = new RegExp(String.raw`\b${imp}\b`, 'g');
      const usages = content.match(usageRegex) || [];

      // If only one usage (the import itself), it's unused
      if (usages.length <= 1) {
        unused.push(imp);
      }
    }
  }

  return unused;
}
