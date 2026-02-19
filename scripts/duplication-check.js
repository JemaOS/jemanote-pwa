#!/usr/bin/env node

/**
 * Duplication Check Script
 * Uses jscpd to detect code duplication
 * Generates reports and validates against thresholds
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  threshold: 3, // Maximum allowed duplication percentage
  minLines: 5,
  minTokens: 50,
  outputDir: path.join(ROOT_DIR, 'reports', 'duplication'),
  formats: ['typescript', 'javascript', 'tsx', 'jsx'],
  reporters: ['html', 'json', 'console'],
  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    // '**/*.test.ts',
    // '**/*.test.tsx',
    // '**/*.spec.ts',
    // '**/*.spec.tsx',
    '**/__mocks__/**',
    '**/mocks/**',
    '**/*.stories.tsx',
    '**/*.stories.ts',
    '**/*.config.ts',
    '**/*.config.js',
    '**/scripts/**',
    '**/public/**',
    '**/types/**',
    '**/*.d.ts',
  ],
};

/**
 * Get CSS class for duplication percentage
 */
function getDuplicationClass(percentage, threshold) {
  if (percentage > threshold) return 'danger';
  if (percentage > 1) return 'warning';
  return 'good';
}

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Check if jscpd is installed
 */
function checkJscpd() {
  try {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execFileSync(npx, ['jscpd', '--version'], { stdio: 'pipe' });  // NOSONAR
    return true;
  } catch {
    return false;
  }
}

/**
 * Run jscpd analysis
 */
function runJscpd() {
  console.log(`${colors.blue}🔍 Running jscpd analysis...${colors.reset}\n`);

  // Build command arguments array to avoid shell injection
  // All values are from trusted CONFIG object, not user input
  const args = [
    'jscpd',
    path.join(ROOT_DIR, 'src'),
    path.join(ROOT_DIR, 'tests'),
    '--min-lines',
    String(CONFIG.minLines),
    '--min-tokens',
    String(CONFIG.minTokens),
    '--threshold',
    String(CONFIG.threshold),
    '--output',
    CONFIG.outputDir,
    ...CONFIG.reporters.flatMap(r => ['--reporters', r]),
    ...CONFIG.formats.flatMap(f => ['--format', f]),
    ...CONFIG.ignore.flatMap(i => ['--ignore', i]),
    '--gitignore',
    '--blame',
  ];

  try {
    // Use execFileSync instead of execSync to avoid shell injection vulnerabilities
    // execFileSync does not use shell, so no shell injection is possible
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const output = execFileSync(npx, args, {  // NOSONAR
      encoding: 'utf-8',
      cwd: ROOT_DIR,
    });
    return { success: true, output };
  } catch (error) {
    // jscpd exits with code 1 if threshold is exceeded
    if (error.status === 1) {
      return { success: false, output: error.stdout, error: 'Threshold exceeded' };
    }
    return { success: false, output: error.stdout, error: error.message };
  }
}

/**
 * Parse jscpd JSON report
 */
function parseReport() {
  const reportPath = path.join(CONFIG.outputDir, 'jscpd-report.json');

  if (!fs.existsSync(reportPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(reportPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(
      `${colors.yellow}Warning: Could not parse jscpd report: ${error.message}${colors.reset}`
    );
    return null;
  }
}

/**
 * Generate summary from report
 */
function generateSummary(report) {
  if (!report || !report.statistics) {
    return {
      totalFiles: 0,
      totalLines: 0,
      duplicatedLines: 0,
      duplicatedTokens: 0,
      duplicationPercentage: 0,
      clones: [],
      formats: {},
    };
  }

  const stats = report.statistics;
  const totalLines = stats.total?.lines || 0;
  const duplicatedLines = stats.total?.duplicatedLines || 0;
  const duplicationPercentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;

  return {
    totalFiles: stats.total?.sources || 0,
    totalLines,
    duplicatedLines,
    duplicatedTokens: stats.total?.duplicatedTokens || 0,
    duplicationPercentage: Math.round(duplicationPercentage * 100) / 100,
    clones: report.duplicates || [],
    formats: stats.formats || {},
  };
}

/**
 * Generate HTML report
 */
function generateHTMLReport(summary, report) {
  const clones = summary.clones || [];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Duplication Analysis Report - Jemanote PWA</title>
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
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
    .card .value { font-size: 32px; font-weight: bold; color: #2c3e50; }
    .card .subtext { font-size: 12px; color: #95a5a6; margin-top: 5px; }
    .good { color: #27ae60; }
    .warning { color: #f39c12; }
    .danger { color: #e74c3c; }
    .threshold-info { 
      background: #ecf0f1; 
      padding: 15px; 
      border-radius: 8px; 
      margin-bottom: 20px;
      border-left: 4px solid #3498db;
    }
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
    .clone-block {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .clone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ecf0f1;
    }
    .clone-title { font-weight: 600; color: #2c3e50; }
    .clone-lines { 
      background: #e74c3c; 
      color: white; 
      padding: 4px 8px; 
      border-radius: 4px; 
      font-size: 12px;
      font-weight: 600;
    }
    .clone-files { margin-top: 10px; }
    .clone-file {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 8px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
    }
    .clone-file path { color: #3498db; }
    .clone-file lines { color: #7f8c8d; }
    .progress-bar {
      height: 20px;
      background: #ecf0f1;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #27ae60, #2ecc71);
      transition: width 0.3s ease;
    }
    .progress-fill.warning { background: linear-gradient(90deg, #f39c12, #f1c40f); }
    .progress-fill.danger { background: linear-gradient(90deg, #e74c3c, #c0392b); }
    .timestamp { text-align: right; color: #95a5a6; font-size: 14px; margin-bottom: 20px; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Duplication Analysis Report</h1>
    <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    
    <div class="threshold-info">
      <strong>Threshold:</strong> Maximum ${CONFIG.threshold}% duplication allowed
      <br><strong>Min Lines:</strong> ${CONFIG.minLines} lines
      <br><strong>Min Tokens:</strong> ${CONFIG.minTokens} tokens
    </div>
    
    <h2>📊 Summary</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>Total Files</h3>
        <div class="value">${summary.totalFiles}</div>
        <div class="subtext">Analyzed source files</div>
      </div>
      <div class="card">
        <h3>Total Lines</h3>
        <div class="value">${summary.totalLines.toLocaleString()}</div>
        <div class="subtext">Lines of code</div>
      </div>
      <div class="card">
        <h3>Duplicated Lines</h3>
        <div class="value ${summary.duplicatedLines > 0 ? 'warning' : 'good'}">${summary.duplicatedLines.toLocaleString()}</div>
        <div class="subtext">Lines duplicated</div>
      </div>
      <div class="card">
        <h3>Duplication %</h3>
        <div class="value ${getDuplicationClass(summary.duplicationPercentage, CONFIG.threshold)}">${summary.duplicationPercentage}%</div>
        <div class="subtext">${summary.duplicationPercentage > CONFIG.threshold ? 'EXCEEDS THRESHOLD' : 'Within threshold'}</div>
        <div class="progress-bar">
          <div class="progress-fill ${getDuplicationClass(summary.duplicationPercentage, CONFIG.threshold)}" style="width: ${Math.min(summary.duplicationPercentage * 10, 100)}%"></div>
        </div>
      </div>
      <div class="card">
        <h3>Duplicated Tokens</h3>
        <div class="value">${summary.duplicatedTokens.toLocaleString()}</div>
        <div class="subtext">Tokens duplicated</div>
      </div>
      <div class="card">
        <h3>Clone Pairs</h3>
        <div class="value ${clones.length > 0 ? 'warning' : 'good'}">${clones.length}</div>
        <div class="subtext">Duplicate code blocks</div>
      </div>
    </div>

    <h2>📁 Duplication by Format</h2>
    <table>
      <thead>
        <tr>
          <th>Format</th>
          <th>Files</th>
          <th>Lines</th>
          <th>Duplicated Lines</th>
          <th>Duplication %</th>
        </tr>
      </thead>
      <tbody>
        ${
          Object.entries(summary.formats)
            .map(([format, stats]) => {
              const pct = stats.total?.lines
                ? (((stats.total?.duplicatedLines || 0) / stats.total.lines) * 100).toFixed(2)
                : 0;
              const cellClass = getDuplicationClass(Number.parseFloat(pct), CONFIG.threshold);
              return `
            <tr>
              <td>${format}</td>
              <td>${stats.total?.sources || 0}</td>
              <td>${(stats.total?.lines || 0).toLocaleString()}</td>
              <td>${(stats.total?.duplicatedLines || 0).toLocaleString()}</td>
              <td class="${cellClass}">${pct}%</td>
            </tr>
          `;
            })
            .join('') ||
          '<tr><td colspan="5" style="text-align: center;">No data available</td></tr>'
        }
      </tbody>
    </table>

    <h2>🔍 Clone Details (${clones.length} found)</h2>
    ${
      clones.length > 0
        ? clones
            .map(
              (clone, index) => `
      <div class="clone-block">
        <div class="clone-header">
          <span class="clone-title">Clone #${index + 1}</span>
          <span class="clone-lines">${clone.duplicatedLines} lines</span>
        </div>
        <div class="clone-files">
          ${
            clone.fragment
              ? `
            <div class="clone-file">
              <path>${clone.fragment.sourceId}</path> 
              <lines>(lines ${clone.fragment.startLine}-${clone.fragment.endLine})</lines>
            </div>
          `
              : ''
          }
          ${
            clone.duplicates
              ? clone.duplicates
                  .map(
                    dup => `
            <div class="clone-file">
              <path>${dup.sourceId}</path> 
              <lines>(lines ${dup.startLine}-${dup.endLine})</lines>
            </div>
          `
                  )
                  .join('')
              : ''
          }
        </div>
        ${
          clone.fragment?.fragment
            ? `
          <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 4px; font-family: monospace; font-size: 12px; overflow-x: auto;">
            <pre>${clone.fragment.fragment}</pre>
          </div>
        `
            : ''
        }
      </div>
    `
            )
            .join('')
        : '<div class="card"><p style="text-align: center; color: #27ae60; font-weight: 600;">🎉 No clones detected!</p></div>'
    }
  </div>
</body>
</html>`;

  return html;
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.cyan}📋 Starting duplication check...${colors.reset}\n`);

  // Check jscpd
  if (!checkJscpd()) {
    console.error(
      `${colors.red}Error: jscpd is not installed. Run: npm install -g jscpd${colors.reset}`
    );
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Run jscpd
  runJscpd();

  // Parse report
  const report = parseReport();
  const summary = generateSummary(report);

  // Generate custom HTML report
  if (report) {
    const htmlReport = generateHTMLReport(summary, report);
    fs.writeFileSync(path.join(CONFIG.outputDir, 'duplication-report.html'), htmlReport);
  }

  // Print summary
  console.log(`\n${colors.cyan}📊 Duplication Summary:${colors.reset}`);
  console.log(`  Total Files: ${summary.totalFiles}`);
  console.log(`  Total Lines: ${summary.totalLines.toLocaleString()}`);
  console.log(`  Duplicated Lines: ${summary.duplicatedLines.toLocaleString()}`);
  console.log(`  Duplication Percentage: ${summary.duplicationPercentage}%`);
  console.log(`  Clone Pairs: ${summary.clones.length}`);

  console.log(`\n${colors.cyan}📁 Reports generated:${colors.reset}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'jscpd-report.json')}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'jscpd-report.html')}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'duplication-report.html')}`);

  // Check threshold
  if (summary.duplicationPercentage > CONFIG.threshold) {
    console.log(
      `\n${colors.red}❌ Duplication threshold exceeded! (${summary.duplicationPercentage}% > ${CONFIG.threshold}%)${colors.reset}`
    );
    process.exit(1);
  } else if (summary.duplicationPercentage > 0) {
    console.log(
      `\n${colors.yellow}⚠️ Found ${summary.duplicationPercentage}% duplication (within threshold)${colors.reset}`
    );
  } else {
    console.log(`\n${colors.green}✅ No duplication detected!${colors.reset}`);
  }

  process.exit(0);
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

export { main, runJscpd, parseReport, generateSummary };
