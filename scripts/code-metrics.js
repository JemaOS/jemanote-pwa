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
    /\?\s*:/g, // ternary
    /\breturn\s+.*\?/g, // conditional return
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
    if (/\?\s*[^:]*:/.test(trimmed)) complexity++;

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
  let mi = 171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cyclomatic - 16.2 * Math.log(loc);

  // Normalize to 0-100 scale
  mi = Math.max(0, Math.min(100, mi));

  return Math.round(mi * 100) / 100;
}

/**
 * Calculate technical debt
 * Based on SQALE methodology
 */
function calculateTechnicalDebt(metrics, violations) {
  // Simplified calculation
  // Each violation adds to debt based on severity
  const debtPerViolation = {
    critical: 60, // 1 hour
    high: 30, // 30 minutes
    medium: 10, // 10 minutes
    low: 5, // 5 minutes
  };

  let totalDebtMinutes = 0;

  for (const violation of violations) {
    totalDebtMinutes += debtPerViolation[violation.severity] || debtPerViolation.low;
  }

  // Convert to hours
  const debtHours = totalDebtMinutes / 60;

  // Calculate ratio: Debt / (LOC * Cost per line)
  // Assuming 0.5 hours per 100 LOC as baseline
  const loc = metrics.lines?.code || 1;
  const estimatedDevTime = loc * 0.005; // hours
  const debtRatio = estimatedDevTime > 0 ? (debtHours / estimatedDevTime) * 100 : 0;

  return {
    hours: Math.round(debtHours * 100) / 100,
    ratio: Math.round(debtRatio * 100) / 100,
  };
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, filePath);

  // Line counts
  const lines = countLines(content);

  // Complexity
  const cyclomatic = calculateCyclomaticComplexity(content);
  const cognitive = calculateCognitiveComplexity(content);

  // Try to get more accurate metrics from escomplex
  let escomplexMetrics = null;
  try {
    escomplexMetrics = escomplex.analyzeModule(content);
  } catch {
    // Fallback to calculated metrics
  }

  // Calculate maintainability index
  const mi = calculateMaintainabilityIndex({
    halstead: escomplexMetrics?.halstead,
    cyclomatic,
    lines,
  });

  // Detect violations
  const violations = [];

  if (lines.total > CONFIG.thresholds.locPerFile) {
    violations.push({
      type: 'LOC',
      severity: 'medium',
      message: `File has ${lines.total} lines (threshold: ${CONFIG.thresholds.locPerFile})`,
      value: lines.total,
      threshold: CONFIG.thresholds.locPerFile,
    });
  }

  if (cyclomatic > CONFIG.thresholds.cyclomaticComplexity) {
    violations.push({
      type: 'Cyclomatic',
      severity: 'high',
      message: `Cyclomatic complexity is ${cyclomatic} (threshold: ${CONFIG.thresholds.cyclomaticComplexity})`,
      value: cyclomatic,
      threshold: CONFIG.thresholds.cyclomaticComplexity,
    });
  }

  if (cognitive > CONFIG.thresholds.cognitiveComplexity) {
    violations.push({
      type: 'Cognitive',
      severity: 'medium',
      message: `Cognitive complexity is ${cognitive} (threshold: ${CONFIG.thresholds.cognitiveComplexity})`,
      value: cognitive,
      threshold: CONFIG.thresholds.cognitiveComplexity,
    });
  }

  if (mi < CONFIG.thresholds.maintainabilityIndex) {
    violations.push({
      type: 'Maintainability',
      severity: 'high',
      message: `Maintainability index is ${mi} (threshold: ${CONFIG.thresholds.maintainabilityIndex})`,
      value: mi,
      threshold: CONFIG.thresholds.maintainabilityIndex,
    });
  }

  if (lines.commentRatio < CONFIG.thresholds.commentRatio) {
    violations.push({
      type: 'Comments',
      severity: 'low',
      message: `Comment ratio is ${lines.commentRatio.toFixed(1)}% (threshold: ${CONFIG.thresholds.commentRatio}%)`,
      value: lines.commentRatio,
      threshold: CONFIG.thresholds.commentRatio,
    });
  }

  const debt = calculateTechnicalDebt({ lines }, violations);

  return {
    file: relativePath,
    lines,
    complexity: {
      cyclomatic,
      cognitive,
    },
    maintainabilityIndex: mi,
    violations,
    debt,
    escomplex: escomplexMetrics
      ? {
          methods: escomplexMetrics.methods?.length || 0,
          classes: escomplexMetrics.classes?.length || 0,
        }
      : null,
  };
}

/**
 * Generate summary statistics
 */
function generateSummary(results) {
  const summary = {
    totalFiles: results.length,
    totalLines: 0,
    totalCodeLines: 0,
    totalCommentLines: 0,
    avgLocPerFile: 0,
    avgCyclomatic: 0,
    avgCognitive: 0,
    avgMaintainability: 0,
    avgCommentRatio: 0,
    totalDebtHours: 0,
    avgDebtRatio: 0,
    violations: {
      LOC: 0,
      Cyclomatic: 0,
      Cognitive: 0,
      Maintainability: 0,
      Comments: 0,
    },
    filesByMaintainability: {
      excellent: 0, // 90-100
      good: 0, // 80-89
      moderate: 0, // 70-79
      poor: 0, // 60-69
      bad: 0, // <60
    },
  };

  let totalCyclomatic = 0;
  let totalCognitive = 0;
  let totalMaintainability = 0;
  let totalCommentRatio = 0;
  let totalDebtRatio = 0;

  for (const result of results) {
    summary.totalLines += result.lines.total;
    summary.totalCodeLines += result.lines.code;
    summary.totalCommentLines += result.lines.comments;
    totalCyclomatic += result.complexity.cyclomatic;
    totalCognitive += result.complexity.cognitive;
    totalMaintainability += result.maintainabilityIndex;
    totalCommentRatio += result.lines.commentRatio;
    totalDebtRatio += result.debt.ratio;
    summary.totalDebtHours += result.debt.hours;

    // Count violations
    for (const violation of result.violations) {
      summary.violations[violation.type]++;
    }

    // Categorize by maintainability
    const mi = result.maintainabilityIndex;
    if (mi >= 90) summary.filesByMaintainability.excellent++;
    else if (mi >= 80) summary.filesByMaintainability.good++;
    else if (mi >= 70) summary.filesByMaintainability.moderate++;
    else if (mi >= 60) summary.filesByMaintainability.poor++;
    else summary.filesByMaintainability.bad++;
  }

  if (results.length > 0) {
    summary.avgLocPerFile = Math.round(summary.totalLines / results.length);
    summary.avgCyclomatic = Math.round((totalCyclomatic / results.length) * 100) / 100;
    summary.avgCognitive = Math.round((totalCognitive / results.length) * 100) / 100;
    summary.avgMaintainability = Math.round((totalMaintainability / results.length) * 100) / 100;
    summary.avgCommentRatio = Math.round((totalCommentRatio / results.length) * 100) / 100;
    summary.avgDebtRatio = Math.round((totalDebtRatio / results.length) * 100) / 100;
  }

  return summary;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(results, summary) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Metrics Report - Jemanote PWA</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; margin-bottom: 20px; }
    h2 { color: #34495e; margin: 30px 0 15px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card h3 { color: #7f8c8d; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }
    .card .value { font-size: 28px; font-weight: bold; color: #2c3e50; }
    .card .subtext { font-size: 12px; color: #95a5a6; margin-top: 5px; }
    .good { color: #27ae60; }
    .warning { color: #f39c12; }
    .danger { color: #e74c3c; }
    table {
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-collapse: collapse;
    }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ecf0f1; }
    th { background: #34495e; color: white; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .metric-bar {
      height: 20px;
      background: #ecf0f1;
      border-radius: 10px;
      overflow: hidden;
    }
    .metric-fill {
      height: 100%;
      border-radius: 10px;
      transition: width 0.3s ease;
    }
    .metric-fill.excellent { background: #27ae60; }
    .metric-fill.good { background: #2ecc71; }
    .metric-fill.moderate { background: #f39c12; }
    .metric-fill.poor { background: #e67e22; }
    .metric-fill.bad { background: #e74c3c; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .timestamp { text-align: right; color: #95a5a6; font-size: 14px; margin-bottom: 20px; }
    .threshold-row { background: #fff3cd !important; }
    .violation-row { background: #f8d7da !important; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Code Metrics Report</h1>
    <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    
    <h2>📈 Overview</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>Total Files</h3>
        <div class="value">${summary.totalFiles}</div>
        <div class="subtext">Source files analyzed</div>
      </div>
      <div class="card">
        <h3>Total Lines</h3>
        <div class="value">${summary.totalLines.toLocaleString()}</div>
        <div class="subtext">Lines of code</div>
      </div>
      <div class="card">
        <h3>Code Lines</h3>
        <div class="value">${summary.totalCodeLines.toLocaleString()}</div>
        <div class="subtext">Executable code</div>
      </div>
      <div class="card">
        <h3>Comment Lines</h3>
        <div class="value">${summary.totalCommentLines.toLocaleString()}</div>
        <div class="subtext">${summary.avgCommentRatio.toFixed(1)}% of total</div>
      </div>
    </div>

    <h2>🎯 Quality Metrics</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>Avg LOC/File</h3>
        <div class="value ${summary.avgLocPerFile > CONFIG.thresholds.locPerFile ? 'warning' : 'good'}">${summary.avgLocPerFile}</div>
        <div class="subtext">Threshold: ${CONFIG.thresholds.locPerFile}</div>
      </div>
      <div class="card">
        <h3>Avg Cyclomatic</h3>
        <div class="value ${summary.avgCyclomatic > CONFIG.thresholds.cyclomaticComplexity ? 'warning' : 'good'}">${summary.avgCyclomatic}</div>
        <div class="subtext">Threshold: ${CONFIG.thresholds.cyclomaticComplexity}</div>
      </div>
      <div class="card">
        <h3>Avg Cognitive</h3>
        <div class="value ${summary.avgCognitive > CONFIG.thresholds.cognitiveComplexity ? 'warning' : 'good'}">${summary.avgCognitive}</div>
        <div class="subtext">Threshold: ${CONFIG.thresholds.cognitiveComplexity}</div>
      </div>
      <div class="card">
        <h3>Maintainability</h3>
        <div class="value ${summary.avgMaintainability < CONFIG.thresholds.maintainabilityIndex ? 'warning' : 'good'}">${summary.avgMaintainability}</div>
        <div class="subtext">Threshold: ${CONFIG.thresholds.maintainabilityIndex}</div>
      </div>
      <div class="card">
        <h3>Tech Debt Ratio</h3>
        <div class="value ${summary.avgDebtRatio > CONFIG.thresholds.technicalDebtRatio ? 'danger' : 'good'}">${summary.avgDebtRatio}%</div>
        <div class="subtext">Threshold: ${CONFIG.thresholds.technicalDebtRatio}%</div>
      </div>
      <div class="card">
        <h3>Tech Debt</h3>
        <div class="value ${summary.totalDebtHours > 10 ? 'warning' : 'good'}">${summary.totalDebtHours.toFixed(1)}h</div>
        <div class="subtext">Estimated fix time</div>
      </div>
    </div>

    <h2>📊 Maintainability Distribution</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>Excellent (90-100)</h3>
        <div class="value good">${summary.filesByMaintainability.excellent}</div>
        <div class="subtext">Highly maintainable</div>
      </div>
      <div class="card">
        <h3>Good (80-89)</h3>
        <div class="value good">${summary.filesByMaintainability.good}</div>
        <div class="subtext">Maintainable</div>
      </div>
      <div class="card">
        <h3>Moderate (70-79)</h3>
        <div class="value warning">${summary.filesByMaintainability.moderate}</div>
        <div class="subtext">Acceptable</div>
      </div>
      <div class="card">
        <h3>Poor (60-69)</h3>
        <div class="value warning">${summary.filesByMaintainability.poor}</div>
        <div class="subtext">Needs attention</div>
      </div>
      <div class="card">
        <h3>Bad (<60)</h3>
        <div class="value danger">${summary.filesByMaintainability.bad}</div>
        <div class="subtext">Needs refactoring</div>
      </div>
    </div>

    <h2>⚠️ Violations</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>LOC Violations</h3>
        <div class="value ${summary.violations.LOC > 0 ? 'warning' : 'good'}">${summary.violations.LOC}</div>
        <div class="subtext">Files exceeding threshold</div>
      </div>
      <div class="card">
        <h3>Complexity Violations</h3>
        <div class="value ${summary.violations.Cyclomatic > 0 ? 'warning' : 'good'}">${summary.violations.Cyclomatic}</div>
        <div class="subtext">High cyclomatic complexity</div>
      </div>
      <div class="card">
        <h3>Cognitive Violations</h3>
        <div class="value ${summary.violations.Cognitive > 0 ? 'warning' : 'good'}">${summary.violations.Cognitive}</div>
        <div class="subtext">High cognitive complexity</div>
      </div>
      <div class="card">
        <h3>Maintainability Violations</h3>
        <div class="value ${summary.violations.Maintainability > 0 ? 'danger' : 'good'}">${summary.violations.Maintainability}</div>
        <div class="subtext">Low maintainability index</div>
      </div>
    </div>

    <h2>📁 File Details</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>LOC</th>
          <th>Code</th>
          <th>Comments</th>
          <th>Cyclomatic</th>
          <th>Cognitive</th>
          <th>Maintainability</th>
          <th>Debt Ratio</th>
          <th>Violations</th>
        </tr>
      </thead>
      <tbody>
        ${results
          .map(r => {
            const hasViolations = r.violations.length > 0;
            const rowClass = hasViolations ? 'violation-row' : '';
            return `
            <tr class="${rowClass}">
              <td>${r.file}</td>
              <td>${r.lines.total}</td>
              <td>${r.lines.code}</td>
              <td>${r.lines.comments} (${r.lines.commentRatio.toFixed(1)}%)</td>
              <td class="${r.complexity.cyclomatic > CONFIG.thresholds.cyclomaticComplexity ? 'warning' : 'good'}">${r.complexity.cyclomatic}</td>
              <td class="${r.complexity.cognitive > CONFIG.thresholds.cognitiveComplexity ? 'warning' : 'good'}">${r.complexity.cognitive}</td>
              <td class="${r.maintainabilityIndex < CONFIG.thresholds.maintainabilityIndex ? 'warning' : 'good'}">${r.maintainabilityIndex}</td>
              <td class="${r.debt.ratio > CONFIG.thresholds.technicalDebtRatio ? 'danger' : 'good'}">${r.debt.ratio}%</td>
              <td>${
                hasViolations
                  ? r.violations
                      .map(v => {
                        let badgeClass;
                        if (v.severity === 'high') {
                          badgeClass = 'danger';
                        } else if (v.severity === 'medium') {
                          badgeClass = 'warning';
                        } else {
                          badgeClass = 'success';
                        }
                        return `<span class="badge badge-${badgeClass}">${v.type}</span>`;
                      })
                      .join(' ')
                  : '-'
              }</td>
            </tr>
          `;
          })
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.cyan}📊 Starting code metrics analysis...${colors.reset}\n`);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Get source files
  console.log(`${colors.blue}📁 Scanning source files...${colors.reset}`);
  const files = getSourceFiles();
  console.log(`Found ${files.length} files to analyze\n`);

  // Analyze each file
  console.log(`${colors.blue}📈 Calculating metrics...${colors.reset}`);
  const results = [];

  for (const file of files) {
    const result = analyzeFile(file);
    results.push(result);
  }

  // Generate summary
  console.log(`${colors.blue}📊 Generating summary...${colors.reset}`);
  const summary = generateSummary(results);

  // Generate reports
  console.log(`${colors.blue}📝 Generating reports...${colors.reset}`);

  // JSON report
  const jsonReport = {
    summary,
    files: results,
    thresholds: CONFIG.thresholds,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'metrics-report.json'),
    JSON.stringify(jsonReport, null, 2)
  );

  // HTML report
  const htmlReport = generateHTMLReport(results, summary);
  fs.writeFileSync(path.join(CONFIG.outputDir, 'metrics-report.html'), htmlReport);

  // Print summary
  console.log(`\n${colors.cyan}📊 Metrics Summary:${colors.reset}`);
  console.log(`  Total Files: ${summary.totalFiles}`);
  console.log(`  Total Lines: ${summary.totalLines.toLocaleString()}`);
  console.log(`  Code Lines: ${summary.totalCodeLines.toLocaleString()}`);
  console.log(`  Comment Lines: ${summary.totalCommentLines.toLocaleString()}`);
  console.log(`  Avg LOC/File: ${summary.avgLocPerFile}`);
  console.log(`  Avg Cyclomatic: ${summary.avgCyclomatic}`);
  console.log(`  Avg Cognitive: ${summary.avgCognitive}`);
  console.log(`  Avg Maintainability: ${summary.avgMaintainability}`);
  console.log(`  Avg Debt Ratio: ${summary.avgDebtRatio}%`);
  console.log(`  Total Debt: ${summary.totalDebtHours.toFixed(1)} hours`);

  const totalViolations = Object.values(summary.violations).reduce((a, b) => a + b, 0);
  console.log(`\n${colors.cyan}⚠️ Violations:${colors.reset}`);
  console.log(`  LOC: ${summary.violations.LOC}`);
  console.log(`  Cyclomatic: ${summary.violations.Cyclomatic}`);
  console.log(`  Cognitive: ${summary.violations.Cognitive}`);
  console.log(`  Maintainability: ${summary.violations.Maintainability}`);
  console.log(`  Comments: ${summary.violations.Comments}`);

  console.log(`\n${colors.cyan}📁 Reports generated:${colors.reset}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'metrics-report.json')}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'metrics-report.html')}`);

  // Exit code based on violations
  if (totalViolations > 0 || summary.avgDebtRatio > CONFIG.thresholds.technicalDebtRatio) {
    console.log(`\n${colors.yellow}⚠️ Found ${totalViolations} violations${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ All metrics within thresholds!${colors.reset}`);
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

export { main, analyzeFile, generateSummary, calculateMaintainabilityIndex };
