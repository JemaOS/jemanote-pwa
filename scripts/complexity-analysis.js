#!/usr/bin/env node

/**
 * Complexity Analysis Script
 * Analyzes code complexity using typhonjs-escomplex
 * Generates HTML reports with complexity metrics
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import escomplex from 'typhonjs-escomplex';
import glob from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  sourceDir: path.join(ROOT_DIR, 'src'),
  outputDir: path.join(ROOT_DIR, 'reports', 'complexity'),
  thresholds: {
    cyclomatic: 10,
    cognitive: 15,
    halstead: 20,
    maintainability: 80,
    linesPerFunction: 50,
    paramsPerFunction: 4
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
    '**/*.d.ts'
  ]
};

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Get all TypeScript/JavaScript files to analyze
 */
function getSourceFiles() {
  const files = [];
  const extensions = ['*.ts', '*.tsx', '*.js', '*.jsx'];
  
  for (const ext of extensions) {
    const pattern = path.join(CONFIG.sourceDir, '**', ext);
    const matches = glob.sync(pattern, {
      ignore: CONFIG.excludePatterns
    });
    files.push(...matches);
  }
  
  return files.filter(file => !file.includes('node_modules'));
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(ROOT_DIR, filePath);
  
  try {
    const result = escomplex.analyzeModule(content, {
      commonjs: true,
      forin: true,
      logicalor: true,
      switchcase: true,
      trycatch: true,
      newmi: true
    });
    
    return {
      file: relativePath,
      path: filePath,
      ...result
    };
  } catch (error) {
    console.warn(`${colors.yellow}Warning: Could not analyze ${relativePath}: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Calculate cognitive complexity
 */
function calculateCognitiveComplexity(method) {
  let complexity = 1;
  
  // Simple heuristic based on cyclomatic complexity and other factors
  if (method.cyclomatic) {
    complexity = method.cyclomatic;
  }
  
  // Adjust for nesting
  if (method.maxNestedMethodDepth) {
    complexity += method.maxNestedMethodDepth;
  }
  
  return complexity;
}

/**
 * Generate summary statistics
 */
function generateSummary(results) {
  const summary = {
    totalFiles: results.length,
    totalFunctions: 0,
    totalClasses: 0,
    averageCyclomatic: 0,
    averageCognitive: 0,
    averageMaintainability: 0,
    highComplexityFunctions: [],
    lowMaintainabilityFiles: [],
    violations: {
      cyclomatic: 0,
      cognitive: 0,
      maintainability: 0,
      linesPerFunction: 0,
      paramsPerFunction: 0
    }
  };
  
  let totalCyclomatic = 0;
  let totalCognitive = 0;
  let totalMaintainability = 0;
  
  const checkMethodViolations = (method, file) => {
    const cyclomatic = method.cyclomatic || 1;
    const cognitive = calculateCognitiveComplexity(method);
    const lines = method.sloc?.logical || 0;
    const params = method.paramCount || 0;
    
    totalCyclomatic += cyclomatic;
    totalCognitive += cognitive;
    
    if (cyclomatic > CONFIG.thresholds.cyclomatic) {
      summary.violations.cyclomatic++;
      summary.highComplexityFunctions.push({ file, function: method.name, type: 'cyclomatic', value: cyclomatic, threshold: CONFIG.thresholds.cyclomatic });
    }
    if (cognitive > CONFIG.thresholds.cognitive) {
      summary.violations.cognitive++;
      summary.highComplexityFunctions.push({ file, function: method.name, type: 'cognitive', value: cognitive, threshold: CONFIG.thresholds.cognitive });
    }
    if (lines > CONFIG.thresholds.linesPerFunction) summary.violations.linesPerFunction++;
    if (params > CONFIG.thresholds.paramsPerFunction) summary.violations.paramsPerFunction++;
  };

  for (const result of results) {
    if (result.methods) {
      summary.totalFunctions += result.methods.length;
      for (const method of result.methods) {
        checkMethodViolations(method, result.file);
      }
    }
    
    if (result.classes) {
      summary.totalClasses += result.classes.length;
    }
    
    const maintainability = result.maintainability || 100;
    totalMaintainability += maintainability;
    
    if (maintainability < CONFIG.thresholds.maintainability) {
      summary.violations.maintainability++;
      summary.lowMaintainabilityFiles.push({
        file: result.file,
        maintainability: Math.round(maintainability),
        threshold: CONFIG.thresholds.maintainability
      });
    }
  }
  
  if (summary.totalFunctions > 0) {
    summary.averageCyclomatic = Math.round((totalCyclomatic / summary.totalFunctions) * 100) / 100;
    summary.averageCognitive = Math.round((totalCognitive / summary.totalFunctions) * 100) / 100;
  }
  
  if (results.length > 0) {
    summary.averageMaintainability = Math.round((totalMaintainability / results.length) * 100) / 100;
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
  <title>Complexity Analysis Report - Jemanote PWA</title>
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
    .threshold-info { font-size: 12px; color: #7f8c8d; }
    .timestamp { text-align: right; color: #95a5a6; font-size: 14px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Complexity Analysis Report</h1>
    <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    
    <h2>📊 Summary</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>Total Files</h3>
        <div class="value">${summary.totalFiles}</div>
        <div class="subtext">Analyzed source files</div>
      </div>
      <div class="card">
        <h3>Total Functions</h3>
        <div class="value">${summary.totalFunctions}</div>
        <div class="subtext">Methods and functions</div>
      </div>
      <div class="card">
        <h3>Total Classes</h3>
        <div class="value">${summary.totalClasses}</div>
        <div class="subtext">Class definitions</div>
      </div>
      <div class="card">
        <h3>Avg Cyclomatic Complexity</h3>
        <div class="value ${summary.averageCyclomatic > CONFIG.thresholds.cyclomatic ? 'warning' : 'good'}">${summary.averageCyclomatic}</div>
        <div class="subtext">Threshold: ${CONFIG.thresholds.cyclomatic}</div>
      </div>
      <div class="card">
        <h3>Avg Cognitive Complexity</h3>
        <div class="value ${summary.averageCognitive > CONFIG.thresholds.cognitive ? 'warning' : 'good'}">${summary.averageCognitive}</div>
        <div class="subtext">Threshold: ${CONFIG.thresholds.cognitive}</div>
      </div>
      <div class="card">
        <h3>Maintainability Index</h3>
        <div class="value ${summary.averageMaintainability < CONFIG.thresholds.maintainability ? 'warning' : 'good'}">${summary.averageMaintainability}</div>
        <div class="subtext">Threshold: ${CONFIG.thresholds.maintainability}</div>
      </div>
    </div>

    <h2>⚠️ Violations (${Object.values(summary.violations).reduce((a, b) => a + b, 0)})</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>High Cyclomatic Complexity</h3>
        <div class="value ${summary.violations.cyclomatic > 0 ? 'danger' : 'good'}">${summary.violations.cyclomatic}</div>
        <div class="subtext">Functions exceeding threshold</div>
      </div>
      <div class="card">
        <h3>High Cognitive Complexity</h3>
        <div class="value ${summary.violations.cognitive > 0 ? 'danger' : 'good'}">${summary.violations.cognitive}</div>
        <div class="subtext">Functions exceeding threshold</div>
      </div>
      <div class="card">
        <h3>Low Maintainability</h3>
        <div class="value ${summary.violations.maintainability > 0 ? 'warning' : 'good'}">${summary.violations.maintainability}</div>
        <div class="subtext">Files below threshold</div>
      </div>
    </div>

    <h2>🔴 High Complexity Functions</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Function</th>
          <th>Type</th>
          <th>Value</th>
          <th>Threshold</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${summary.highComplexityFunctions.map(func => `
          <tr>
            <td>${func.file}</td>
            <td>${func.function}</td>
            <td>${func.type}</td>
            <td>${func.value}</td>
            <td>${func.threshold}</td>
            <td><span class="badge badge-danger">VIOLATION</span></td>
          </tr>
        `).join('') || '<tr><td colspan="6" style="text-align: center;">No violations found! 🎉</td></tr>'}
      </tbody>
    </table>

    <h2>🟡 Low Maintainability Files</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Maintainability Index</th>
          <th>Threshold</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${summary.lowMaintainabilityFiles.map(file => `
          <tr>
            <td>${file.file}</td>
            <td>${file.maintainability}</td>
            <td>${file.threshold}</td>
            <td><span class="badge badge-warning">WARNING</span></td>
          </tr>
        `).join('') || '<tr><td colspan="4" style="text-align: center;">No warnings found! 🎉</td></tr>'}
      </tbody>
    </table>

    <h2>📁 File Details</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Functions</th>
          <th>Classes</th>
          <th>Maintainability</th>
          <th>Max Complexity</th>
        </tr>
      </thead>
      <tbody>
        ${results.map(result => {
          const maxComplexity = result.methods ? Math.max(...result.methods.map(m => m.cyclomatic || 1)) : 0;
          const maintainability = Math.round(result.maintainability || 100);
          return `
            <tr>
              <td>${result.file}</td>
              <td>${result.methods?.length || 0}</td>
              <td>${result.classes?.length || 0}</td>
              <td class="${maintainability < CONFIG.thresholds.maintainability ? 'warning' : 'good'}">${maintainability}</td>
              <td class="${maxComplexity > CONFIG.thresholds.cyclomatic ? 'warning' : 'good'}">${maxComplexity}</td>
            </tr>
          `;
        }).join('')}
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
  console.log(`${colors.cyan}🔍 Starting complexity analysis...${colors.reset}\n`);
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Get source files
  console.log(`${colors.blue}📁 Scanning source files...${colors.reset}`);
  const files = getSourceFiles();
  console.log(`Found ${files.length} files to analyze\n`);
  
  // Analyze each file
  console.log(`${colors.blue}📊 Analyzing complexity...${colors.reset}`);
  const results = [];
  
  for (const file of files) {
    const result = analyzeFile(file);
    if (result) {
      results.push(result);
    }
  }
  
  // Generate summary
  console.log(`${colors.blue}📈 Generating summary...${colors.reset}`);
  const summary = generateSummary(results);
  
  // Generate reports
  console.log(`${colors.blue}📝 Generating reports...${colors.reset}`);
  
  // JSON report
  const jsonReport = {
    summary,
    files: results,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'complexity-report.json'),
    JSON.stringify(jsonReport, null, 2)
  );
  
  // HTML report
  const htmlReport = generateHTMLReport(results, summary);
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'complexity-report.html'),
    htmlReport
  );
  
  // Print summary
  console.log(`\n${colors.cyan}📊 Analysis Summary:${colors.reset}`);
  console.log(`  Total Files: ${summary.totalFiles}`);
  console.log(`  Total Functions: ${summary.totalFunctions}`);
  console.log(`  Total Classes: ${summary.totalClasses}`);
  console.log(`  Avg Cyclomatic Complexity: ${summary.averageCyclomatic}`);
  console.log(`  Avg Cognitive Complexity: ${summary.averageCognitive}`);
  console.log(`  Avg Maintainability Index: ${summary.averageMaintainability}`);
  
  const totalViolations = Object.values(summary.violations).reduce((a, b) => a + b, 0);
  console.log(`\n${colors.cyan}⚠️ Violations:${colors.reset}`);
  console.log(`  High Cyclomatic Complexity: ${summary.violations.cyclomatic}`);
  console.log(`  High Cognitive Complexity: ${summary.violations.cognitive}`);
  console.log(`  Low Maintainability: ${summary.violations.maintainability}`);
  console.log(`  Long Functions: ${summary.violations.linesPerFunction}`);
  console.log(`  Too Many Parameters: ${summary.violations.paramsPerFunction}`);
  
  // Exit code based on violations
  console.log(`\n${colors.cyan}📁 Reports generated:${colors.reset}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'complexity-report.json')}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'complexity-report.html')}`);
  
  if (totalViolations > 0) {
    console.log(`\n${colors.yellow}⚠️ Found ${totalViolations} complexity violations${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ No complexity violations found!${colors.reset}`);
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

export { main, getSourceFiles, analyzeFile, generateSummary };
