#!/usr/bin/env node
/**
 * Code Metrics Script
 * Calculates comprehensive code quality metrics:
 * - Lines of Code (LOC)
 * - Cyclomatic Complexity
 * - Cognitive Complexity
 * - Maintainability Index
 * - Technical Debt Ratio
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import glob from 'glob';
import escomplex from 'typhonjs-escomplex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  sourceDir: path.join(ROOT_DIR, 'src'),
  outputDir: path.join(ROOT_DIR, 'reports', 'metrics'),
  thresholds: {
    locPerFile: 300,
    cyclomaticComplexity: 10,
    cognitiveComplexity: 15,
    maintainabilityIndex: 80,
    technicalDebtRatio: 5,
    commentRatio: 10, // Minimum 10% comments
  },
  excludePatterns: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/__mocks__/**',
    '**/mocks/**',
    '**/*.stories.tsx',
    '**/*.stories.ts',
    '**/*.d.ts',
  ],
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Utility to safely create regex patterns from keywords
function createSafeKeywordRegex(keyword) {
  return String.raw`\b${keyword}\b`;
}

/**
 * Get all source files
 */
function getSourceFiles() {
  const files = [];
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

/**
 * Count lines of code
 */
function classifyLine(trimmed, inBlockComment) {
  if (trimmed === '') return { type: 'blank', inBlockComment };
  if (inBlockComment) {
    return { type: 'comment', inBlockComment: !trimmed.includes('*/') };
  }
  if (trimmed.startsWith('/*')) {
    return { type: 'comment', inBlockComment: !trimmed.includes('*/') };
  }
  if (trimmed.startsWith('//')) return { type: 'comment', inBlockComment };
  return { type: 'code', inBlockComment };
}

function countLines(content) {
  const lines = content.split('\n');
  const totalLines = lines.length;
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const result = classifyLine(line.trim(), inBlockComment);
    inBlockComment = result.inBlockComment;
    if (result.type === 'blank') blankLines++;
    else if (result.type === 'comment') commentLines++;
    else codeLines++;
  }

  return {
    total: totalLines,
    code: codeLines,
    comments: commentLines,
    blank: blankLines,
    commentRatio: totalLines > 0 ? (commentLines / totalLines) * 100 : 0,
  };
}

/**
 * Calculate cyclomatic complexity
 */
function calculateCyclomaticComplexity(content) {
  // Count decision points
  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bforeach\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\b&&\b/g,
    /\|\|/g,
    /\?\s*:/g, // NOSONAR - safe pattern
    /\breturn\s+[^?]*\?/g, // NOSONAR - safe pattern with negated char class
  ];

  let complexity = 1; // Base complexity

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Calculate cognitive complexity
 */
function matchesKeyword(trimmed, keywords) {
  for (const keyword of keywords) {
    // SECURITY FIX: Validate keyword to prevent ReDoS in dynamic regex
    // Only allow valid JavaScript identifier characters
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(keyword)) {
      continue; // Skip invalid keywords
    }
    if (new RegExp(String.raw`\b${keyword}\b`).test(trimmed)) return true;
  }
  return false;
}

function calculateCognitiveComplexity(content) {
  let complexity = 0;
  const lines = content.split('\n');
  let nestingLevel = 0;

  const nestingKeywords = ['if', 'while', 'for', 'switch', 'catch'];
  const incrementKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '?:'];

  for (const line of lines) {
    const trimmed = line.trim();

    // Nesting increase
    if (matchesKeyword(trimmed, nestingKeywords) && trimmed.endsWith('{')) {
      nestingLevel++;
      complexity += nestingLevel;
    }

    // Nesting decrease
    if (trimmed === '}' && nestingLevel > 0) nestingLevel--;

    // Increments without nesting
    if (matchesKeyword(trimmed, incrementKeywords) && !trimmed.endsWith('{')) complexity++;

    // Ternary operators
    if (/\?\s*[^:]*:/.test(trimmed)) complexity++; // NOSONAR

    // Logical operators
    complexity += (trimmed.match(/&&/g) || []).length;
    complexity += (trimmed.match(/\|\|/g) || []).length;
  }

  return Math.max(1, complexity);
}

/**
 * Calculate maintainability index
 * MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
 */
function calculateMaintainabilityIndex(metrics) {
  const halsteadVolume = metrics.halstead?.volume || 100;
  const cyclomatic = metrics.cyclomatic || 1;
  const loc = metrics.lines?.code || 1;

  // Original formula
  const mi =
    171 -
    5.2 * Math.log(halsteadVolume) -
    0.23 * cyclomatic -
    16.2 * Math.log(loc);

  // Normalize to 0-100 scale
  return Math.max(0, Math.min(100, (mi / 171) * 100));
}

/**
 * Calculate technical debt ratio
 */
function calculateTechnicalDebtRatio(metrics) {
  const cyclomatic = metrics.cyclomatic || 1;
  const loc = metrics.lines?.code || 1;

  // Simple heuristic: higher complexity and lower comment ratio = more debt
  const complexityDebt = Math.max(0, cyclomatic - CONFIG.thresholds.cyclomaticComplexity);
  const commentDebt = Math.max(
    0,
    CONFIG.thresholds.commentRatio - (metrics.lines?.commentRatio || 0)
  );

  return complexityDebt * 0.5 + commentDebt * 0.5;
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = countLines(content);

    // Get cyclomatic complexity from escomplex
    let cyclomatic = 1;
    let cognitive = 1;
    let halstead = {};

    try {
      const report = escomplex.analyse(content, {
        loc: true,
        newmi: true,
      });

      cyclomatic = report.aggregate.cyclomatic || 1;
      cognitive = report.aggregate.cognitive || 1;
      halstead = report.aggregate.halstead || {};
    } catch (e) {
      // Fallback to simple calculation if escomplex fails
      cyclomatic = calculateCyclomaticComplexity(content);
      cognitive = calculateCognitiveComplexity(content);
    }

    const metrics = {
      path: filePath,
      lines,
      cyclomatic,
      cognitive,
      halstead,
      maintainability: 0,
      technicalDebt: 0,
    };

    metrics.maintainability = calculateMaintainabilityIndex(metrics);
    metrics.technicalDebt = calculateTechnicalDebtRatio(metrics);

    return metrics;
  } catch (error) {
    console.error(`${colors.red}Error analyzing ${filePath}:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Analyze all source files
 */
function analyzeProject() {
  console.log(`${colors.cyan}Analyzing project metrics...${colors.reset}\n`);

  const files = getSourceFiles();
  const results = [];

  for (const file of files) {
    const metrics = analyzeFile(file);
    if (metrics) {
      results.push(metrics);
    }
  }

  return results;
}

/**
 * Generate summary report
 */
function generateSummary(metrics) {
  const totals = {
    lines: { total: 0, code: 0, comments: 0, blank: 0 },
    cyclomatic: 0,
    cognitive: 0,
  };

  for (const m of metrics) {
    totals.lines.total += m.lines.total;
    totals.lines.code += m.lines.code;
    totals.lines.comments += m.lines.comments;
    totals.lines.blank += m.lines.blank;
    totals.cyclomatic += m.cyclomatic;
    totals.cognitive += m.cognitive;
  }

  const avgCyclomatic = totals.cyclomatic / metrics.length;
  const avgCognitive = totals.cognitive / metrics.length;

  return {
    totals,
    averages: {
      cyclomatic: avgCyclomatic,
      cognitive: avgCognitive,
    },
  };
}

/**
 * Print detailed report
 */
function printReport(metrics) {
  console.log(`${colors.cyan}=== Detailed File Metrics ===${colors.reset}\n`);

  // Sort by cyclomatic complexity (most complex first)
  const sorted = [...metrics].sort((a, b) => b.cyclomatic - a.cyclomatic);

  for (const m of sorted) {
    const complexityColor =
      m.cyclomatic > CONFIG.thresholds.cyclomaticComplexity
        ? colors.red
        : m.cyclomatic > CONFIG.thresholds.cyclomaticComplexity * 0.7
          ? colors.yellow
          : colors.green;

    const cognitiveColor =
      m.cognitive > CONFIG.thresholds.cognitiveComplexity
        ? colors.red
        : m.cognitive > CONFIG.thresholds.cognitiveComplexity * 0.7
          ? colors.yellow
          : colors.green;

    const miColor =
      m.maintainability < CONFIG.thresholds.maintainabilityIndex
        ? colors.red
        : m.maintainability < CONFIG.thresholds.maintainabilityIndex * 1.2
          ? colors.yellow
          : colors.green;

    console.log(`${colors.blue}${m.path}${colors.reset}`);
    console.log(`  LOC: ${m.lines.code} code, ${m.lines.comments} comments, ${m.lines.blank} blank`);
    console.log(
      `  Complexity: ${complexityColor}Cyclomatic: ${m.cyclomatic}${colors.reset}, ${cognitiveColor}Cognitive: ${m.cognitive}${colors.reset}`
    );
    console.log(`  Maintainability: ${miColor}${Math.round(m.maintainability)}${colors.reset}`);
    console.log(`  Technical Debt: ${m.technicalDebt.toFixed(1)}%`);
    console.log();
  }
}

/**
 * Print summary report
 */
function printSummary(summary) {
  console.log(`${colors.cyan}=== Project Summary ===${colors.reset}\n`);
  console.log(`Total Files: ${summary.totals.lines.total}`);
  console.log(`Total LOC: ${summary.totals.lines.code}`);
  console.log(`Comments: ${summary.totals.lines.comments} (${((summary.totals.lines.comments / summary.totals.lines.total) * 100).toFixed(1)}%)`);
  console.log(`Blank: ${summary.totals.lines.blank}`);
  console.log();
  console.log(`Average Cyclomatic Complexity: ${summary.averages.cyclomatic.toFixed(2)}`);
  console.log(`Average Cognitive Complexity: ${summary.averages.cognitive.toFixed(2)}`);
  console.log();
}

/**
 * Main execution
 */
function main() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const metrics = analyzeProject();
    const summary = generateSummary(metrics);

    printSummary(summary);
    printReport(metrics);

    // Save JSON report
    const reportPath = path.join(CONFIG.outputDir, 'metrics.json');
    fs.writeFileSync(reportPath, JSON.stringify({ metrics, summary }, null, 2));
    console.log(`${colors.green}Report saved to ${reportPath}${colors.reset}`);

    // Check thresholds and report violations
    const violations = [];
    for (const m of metrics) {
      if (m.lines.code > CONFIG.thresholds.locPerFile) {
        violations.push(`${m.path}: LOC (${m.lines.code}) exceeds threshold`);
      }
      if (m.cyclomatic > CONFIG.thresholds.cyclomaticComplexity) {
        violations.push(
          `${m.path}: Cyclomatic complexity (${m.cyclomatic}) exceeds threshold`
        );
      }
      if (m.cognitive > CONFIG.thresholds.cognitiveComplexity) {
        violations.push(
          `${m.path}: Cognitive complexity (${m.cognitive}) exceeds threshold`
        );
      }
      if (m.maintainability < CONFIG.thresholds.maintainabilityIndex) {
        violations.push(
          `${m.path}: Maintainability index (${Math.round(m.maintainability)}) below threshold`
        );
      }
    }

    if (violations.length > 0) {
      console.log(`\n${colors.yellow}Threshold Violations:${colors.reset}`);
      violations.forEach(v => console.log(`  ${colors.red}✗${colors.reset} ${v}`));
      process.exit(1);
    } else {
      console.log(`\n${colors.green}All metrics within thresholds!${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    process.exit(1);
  }
}

main();
