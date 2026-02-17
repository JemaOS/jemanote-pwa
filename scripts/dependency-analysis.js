#!/usr/bin/env node

/**
 * Dependency Analysis Script
 * Analyzes module dependencies, detects cycles, and measures coupling/cohesion
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import glob from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  sourceDir: path.join(ROOT_DIR, 'src'),
  outputDir: path.join(ROOT_DIR, 'reports', 'dependencies'),
  thresholds: {
    maxDependencies: 10, // Max imports per file
    maxDependents: 10,   // Max files importing a module
    maxCircularDepth: 3, // Max depth for circular dependencies
    instabilityThreshold: 0.7 // Max instability (I = Ce / (Ca + Ce))
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

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Get all source files
 */
function getSourceFiles() {
  const files = [];
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

/**
 * Parse imports from a file
 */
function parseImports(filePath, content) {
  const imports = [];
  const relativePath = path.relative(CONFIG.sourceDir, filePath);
  const dirName = path.dirname(filePath);
  
  // ES6 imports
  const es6Regex = /import\s+(?:(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"];?/g;
  let match;
  while ((match = es6Regex.exec(content)) !== null) {
    const importPath = match[1];
    imports.push(resolveImportPath(importPath, dirName));
  }
  
  // Dynamic imports
  const dynamicRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRegex.exec(content)) !== null) {
    const importPath = match[1];
    imports.push(resolveImportPath(importPath, dirName));
  }
  
  // Require statements
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    const importPath = match[1];
    imports.push(resolveImportPath(importPath, dirName));
  }
  
  return imports.filter(imp => imp && !isExternalDependency(imp));
}

/**
 * Resolve import path to relative path from src
 */
function resolveImportPath(importPath, currentDir) {
  // Skip external dependencies
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return null;
  }
  
  // Handle alias imports (@/)
  if (importPath.startsWith('@/')) {
    return importPath.replace('@/', '');
  }
  
  // Resolve relative imports
  const resolved = path.resolve(currentDir, importPath);
  const relativeToSrc = path.relative(CONFIG.sourceDir, resolved);
  
  // Remove extension
  return relativeToSrc.replace(/\.(ts|tsx|js|jsx)$/, '');
}

/**
 * Check if dependency is external
 */
function isExternalDependency(importPath) {
  const externals = [
    'react', 'react-dom', 'react-router-dom',
    '@radix-ui', '@supabase', '@codemirror',
    'lucide-react', 'zod', 'class-variance-authority',
    'clsx', 'tailwind-merge', 'date-fns',
    'fuse.js', 'mermaid', 'katex',
    'recharts', 'embla-carousel-react',
    'sonner', 'vaul', 'cmdk',
    'localforage', 'cytoscape', 'pixi.js',
    'next-themes', 'react-hook-form', '@hookform/resolvers',
    'react-markdown', 'rehype-', 'remark-',
    'input-otp', 'react-day-picker', 'react-resizable-panels'
  ];
  
  return externals.some(ext => importPath.startsWith(ext));
}

/**
 * Build dependency graph
 */
function buildDependencyGraph(files) {
  const graph = new Map();
  const fileMap = new Map();
  
  // First pass: index all files
  for (const file of files) {
    const relativePath = path.relative(CONFIG.sourceDir, file).replace(/\.(ts|tsx)$/, '');
    fileMap.set(relativePath, file);
    graph.set(relativePath, {
      path: relativePath,
      fullPath: file,
      dependencies: new Set(),
      dependents: new Set(),
      externalDeps: new Set()
    });
  }
  
  // Second pass: build relationships
  for (const file of files) {
    const relativePath = path.relative(CONFIG.sourceDir, file).replace(/\.(ts|tsx)$/, '');
    const content = fs.readFileSync(file, 'utf-8');
    const imports = parseImports(file, content);
    const node = graph.get(relativePath);
    
    for (const imp of imports) {
      if (graph.has(imp)) {
        node.dependencies.add(imp);
        const targetNode = graph.get(imp);
        targetNode.dependents.add(relativePath);
      }
    }
  }
  
  return graph;
}

/**
 * Detect circular dependencies
 */
function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  
  function dfs(node, path) {
    if (recursionStack.has(node)) {
      // Found cycle
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
    
    const nodeData = graph.get(node);
    if (nodeData) {
      for (const dep of nodeData.dependencies) {
        dfs(dep, [...path, node]);
      }
    }
    
    recursionStack.delete(node);
  }
  
  for (const [key] of graph) {
    if (!visited.has(key)) {
      dfs(key, []);
    }
  }
  
  // Remove duplicate cycles
  const uniqueCycles = [];
  const seen = new Set();
  
  for (const cycle of cycles) {
    const normalized = cycle.slice(0, -1).sort().join(',');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueCycles.push(cycle);
    }
  }
  
  return uniqueCycles;
}

/**
 * Calculate metrics for each module
 */
function calculateMetrics(graph) {
  const metrics = [];
  
  for (const [path, node] of graph) {
    const ca = node.dependents.size; // Afferent coupling (incoming)
    const ce = node.dependencies.size; // Efferent coupling (outgoing)
    
    // Instability: I = Ce / (Ca + Ce)
    const instability = ca + ce === 0 ? 0 : ce / (ca + ce);
    
    // Abstractness: A = abstract classes / total classes (simplified)
    const abstractness = 0; // Would need AST parsing for accurate calculation
    
    // Distance from main sequence: D = |A + I - 1|
    const distance = Math.abs(abstractness + instability - 1);
    
    metrics.push({
      path,
      ca,
      ce,
      instability: Math.round(instability * 100) / 100,
      abstractness: Math.round(abstractness * 100) / 100,
      distance: Math.round(distance * 100) / 100,
      dependencies: Array.from(node.dependencies),
      dependents: Array.from(node.dependents)
    });
  }
  
  return metrics.sort((a, b) => b.instability - a.instability);
}

/**
 * Identify architectural layers
 */
function identifyLayers(graph) {
  const layers = {
    components: [],
    hooks: [],
    services: [],
    lib: [],
    utils: [],
    types: [],
    contexts: []
  };
  
  for (const [path] of graph) {
    if (path.startsWith('components/')) layers.components.push(path);
    else if (path.startsWith('hooks/')) layers.hooks.push(path);
    else if (path.startsWith('services/')) layers.services.push(path);
    else if (path.startsWith('lib/')) layers.lib.push(path);
    else if (path.startsWith('utils/')) layers.utils.push(path);
    else if (path.startsWith('types/')) layers.types.push(path);
    else if (path.startsWith('contexts/')) layers.contexts.push(path);
  }
  
  return layers;
}

/**
 * Check layer dependencies (architecture rules)
 */
function checkLayerViolations(graph, layers) {
  const violations = [];
  
  // Rules: Services should not depend on Components
  for (const service of layers.services) {
    const node = graph.get(service);
    for (const dep of node.dependencies) {
      if (dep.startsWith('components/')) {
        violations.push({
          rule: 'Services should not depend on Components',
          from: service,
          to: dep,
          severity: 'error'
        });
      }
    }
  }
  
  // Rules: Utils should not depend on Components or Services
  for (const util of layers.utils) {
    const node = graph.get(util);
    for (const dep of node.dependencies) {
      if (dep.startsWith('components/') || dep.startsWith('services/')) {
        violations.push({
          rule: 'Utils should not depend on Components or Services',
          from: util,
          to: dep,
          severity: 'warning'
        });
      }
    }
  }
  
  return violations;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(graph, cycles, metrics, layers, violations) {
  const highInstability = metrics.filter(m => m.instability > CONFIG.thresholds.instabilityThreshold);
  const highDependencies = metrics.filter(m => m.ce > CONFIG.thresholds.maxDependencies);
  const highDependents = metrics.filter(m => m.ca > CONFIG.thresholds.maxDependents);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dependency Analysis Report - Jemanote PWA</title>
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
    .cycle-block {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .cycle-path {
      font-family: monospace;
      font-size: 13px;
      color: #721c24;
    }
    .cycle-arrow { color: #e74c3c; margin: 0 5px; }
    .violation-block {
      background: white;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #e74c3c;
    }
    .violation-block.warning { border-left-color: #f39c12; }
    .metric-bar {
      height: 8px;
      background: #ecf0f1;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    .metric-fill {
      height: 100%;
      background: #3498db;
      border-radius: 4px;
    }
    .metric-fill.warning { background: #f39c12; }
    .metric-fill.danger { background: #e74c3c; }
    .timestamp { text-align: right; color: #95a5a6; font-size: 14px; margin-bottom: 20px; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-error { background: #f8d7da; color: #721c24; }
    .badge-warning { background: #fff3cd; color: #856404; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 Dependency Analysis Report</h1>
    <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    
    <h2>📊 Summary</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>Total Modules</h3>
        <div class="value">${graph.size}</div>
        <div class="subtext">Source files analyzed</div>
      </div>
      <div class="card">
        <h3>Circular Dependencies</h3>
        <div class="value ${cycles.length > 0 ? 'danger' : 'good'}">${cycles.length}</div>
        <div class="subtext">${cycles.length > 0 ? 'Cycles detected!' : 'No cycles found'}</div>
      </div>
      <div class="card">
        <h3>High Instability</h3>
        <div class="value ${highInstability.length > 0 ? 'warning' : 'good'}">${highInstability.length}</div>
        <div class="subtext">Modules with I > ${CONFIG.thresholds.instabilityThreshold}</div>
      </div>
      <div class="card">
        <h3>High Dependencies</h3>
        <div class="value ${highDependencies.length > 0 ? 'warning' : 'good'}">${highDependencies.length}</div>
        <div class="subtext">Modules with > ${CONFIG.thresholds.maxDependencies} deps</div>
      </div>
      <div class="card">
        <h3>Architecture Violations</h3>
        <div class="value ${violations.length > 0 ? 'danger' : 'good'}">${violations.length}</div>
        <div class="subtext">Layer rule violations</div>
      </div>
    </div>

    <h2>🏗️ Architecture Layers</h2>
    <div class="summary-grid">
      <div class="card">
        <h3>Components</h3>
        <div class="value">${layers.components.length}</div>
        <div class="subtext">UI components</div>
      </div>
      <div class="card">
        <h3>Hooks</h3>
        <div class="value">${layers.hooks.length}</div>
        <div class="subtext">Custom React hooks</div>
      </div>
      <div class="card">
        <h3>Services</h3>
        <div class="value">${layers.services.length}</div>
        <div class="subtext">Business logic services</div>
      </div>
      <div class="card">
        <h3>Lib</h3>
        <div class="value">${layers.lib.length}</div>
        <div class="subtext">Library utilities</div>
      </div>
      <div class="card">
        <h3>Utils</h3>
        <div class="value">${layers.utils.length}</div>
        <div class="subtext">Helper utilities</div>
      </div>
      <div class="card">
        <h3>Contexts</h3>
        <div class="value">${layers.contexts.length}</div>
        <div class="subtext">React contexts</div>
      </div>
    </div>

    ${cycles.length > 0 ? `
    <h2>🔄 Circular Dependencies (${cycles.length})</h2>
    ${cycles.map((cycle, i) => `
      <div class="cycle-block">
        <strong>Cycle #${i + 1}</strong>
        <div class="cycle-path">
          ${cycle.map((node, j) => `
            ${node}${j < cycle.length - 1 ? '<span class="cycle-arrow">→</span>' : ''}
          `).join('')}
        </div>
      </div>
    `).join('')}
    ` : ''}

    ${violations.length > 0 ? `
    <h2>⚠️ Architecture Violations (${violations.length})</h2>
    ${violations.map(v => `
      <div class="violation-block ${v.severity}">
        <strong>${v.rule}</strong>
        <div>${v.from} → ${v.to}</div>
      </div>
    `).join('')}
    ` : ''}

    <h2>📈 Module Metrics</h2>
    <table>
      <thead>
        <tr>
          <th>Module</th>
          <th>Ca (Afferent)</th>
          <th>Ce (Efferent)</th>
          <th>Instability (I)</th>
          <th>Distance (D)</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.map(m => `
          <tr>
            <td>${m.path}</td>
            <td>${m.ca}</td>
            <td>${m.ce}</td>
            <td class="${m.instability > CONFIG.thresholds.instabilityThreshold ? 'warning' : 'good'}">${m.instability}</td>
            <td>${m.distance}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>🔗 High Dependency Modules</h2>
    <table>
      <thead>
        <tr>
          <th>Module</th>
          <th>Dependencies</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        ${highDependencies.map(m => `
          <tr>
            <td>${m.path}</td>
            <td>${m.dependencies.slice(0, 5).join(', ')}${m.dependencies.length > 5 ? '...' : ''}</td>
            <td class="warning">${m.ce}</td>
          </tr>
        `).join('') || '<tr><td colspan="3" style="text-align: center;">No high dependency modules found</td></tr>'}
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
  console.log(`${colors.cyan}🔗 Starting dependency analysis...${colors.reset}\n`);
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Get source files
  console.log(`${colors.blue}📁 Scanning source files...${colors.reset}`);
  const files = getSourceFiles();
  console.log(`Found ${files.length} files to analyze\n`);
  
  // Build dependency graph
  console.log(`${colors.blue}📊 Building dependency graph...${colors.reset}`);
  const graph = buildDependencyGraph(files);
  
  // Detect cycles
  console.log(`${colors.blue}🔄 Detecting circular dependencies...${colors.reset}`);
  const cycles = detectCycles(graph);
  
  // Calculate metrics
  console.log(`${colors.blue}📈 Calculating metrics...${colors.reset}`);
  const metrics = calculateMetrics(graph);
  
  // Identify layers
  console.log(`${colors.blue}🏗️ Identifying architecture layers...${colors.reset}`);
  const layers = identifyLayers(graph);
  
  // Check violations
  console.log(`${colors.blue}⚠️ Checking architecture violations...${colors.reset}`);
  const violations = checkLayerViolations(graph, layers);
  
  // Generate reports
  console.log(`${colors.blue}📝 Generating reports...${colors.reset}`);
  
  // JSON report
  const jsonReport = {
    summary: {
      totalModules: graph.size,
      circularDependencies: cycles.length,
      layers: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length]))
    },
    cycles,
    metrics,
    layers,
    violations,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'dependency-report.json'),
    JSON.stringify(jsonReport, null, 2)
  );
  
  // HTML report
  const htmlReport = generateHTMLReport(graph, cycles, metrics, layers, violations);
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'dependency-report.html'),
    htmlReport
  );
  
  // Print summary
  console.log(`\n${colors.cyan}📊 Analysis Summary:${colors.reset}`);
  console.log(`  Total Modules: ${graph.size}`);
  console.log(`  Circular Dependencies: ${cycles.length}`);
  console.log(`  Architecture Violations: ${violations.length}`);
  
  console.log(`\n${colors.cyan}🏗️ Layer Distribution:${colors.reset}`);
  for (const [layer, count] of Object.entries(layers)) {
    if (count.length > 0) {
      console.log(`  ${layer}: ${count.length}`);
    }
  }
  
  if (cycles.length > 0) {
    console.log(`\n${colors.red}❌ Found ${cycles.length} circular dependencies!${colors.reset}`);
    for (const cycle of cycles) {
      console.log(`  ${cycle.join(' → ')}`);
    }
  }
  
  if (violations.length > 0) {
    console.log(`\n${colors.yellow}⚠️ Found ${violations.length} architecture violations!${colors.reset}`);
    for (const v of violations) {
      console.log(`  ${v.rule}: ${v.from} → ${v.to}`);
    }
  }
  
  console.log(`\n${colors.cyan}📁 Reports generated:${colors.reset}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'dependency-report.json')}`);
  console.log(`  - ${path.join(CONFIG.outputDir, 'dependency-report.html')}`);
  
  // Exit code
  if (cycles.length > 0 || violations.filter(v => v.severity === 'error').length > 0) {
    console.log(`\n${colors.red}❌ Analysis failed due to critical issues${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ Analysis completed successfully!${colors.reset}`);
    process.exit(0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  });
}

export { main, buildDependencyGraph, detectCycles, calculateMetrics };
