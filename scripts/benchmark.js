/**
 * Performance Benchmark Script
 *
 * Script pour mesurer et comparer les performances de build,
 * de démarrage et de chargement des pages.
 *
 * Usage: node scripts/benchmark.js [--compare] [--verbose]
 */

const { execSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

// Configuration
const CONFIG = {
  buildIterations: 3,
  loadTestIterations: 5,
  serverStartupTimeout: 60000,
  pageLoadTimeout: 30000,
  resultsDir: path.join(process.cwd(), 'benchmark-results'),
};

// Métriques collectées
const metrics = {
  buildTime: [],
  buildSize: {},
  startupTime: 0,
  pageLoadTimes: {},
};

/**
 * Affiche un message avec timestamp
 */
function log(message, verbose = false) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Exécute une commande et mesure son temps d'exécution
 */
function measureCommand(command, options = {}) {
  const start = Date.now();

  try {
    // Split command into command and arguments to avoid shell interpretation
    const [cmd, ...args] = command.split(' ');
    execFileSync(cmd, args, {
      stdio: options.verbose ? 'inherit' : 'pipe',
      cwd: process.cwd(),
      ...options,
    });

    return {
      success: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Nettoie le dossier dist
 */
function cleanDist() {
  log('Cleaning dist folder...');
  const distPath = path.join(process.cwd(), 'dist');

  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
}

/**
 * Mesure le temps de build
 */
async function benchmarkBuild() {
  log('Benchmarking build time...');

  for (let i = 0; i < CONFIG.buildIterations; i++) {
    cleanDist();

    log(`Build iteration ${i + 1}/${CONFIG.buildIterations}...`);
    const result = measureCommand('npm run build', { timeout: 300000 });

    if (result.success) {
      metrics.buildTime.push(result.duration);
      log(`  Build ${i + 1}: ${(result.duration / 1000).toFixed(2)}s`);
    } else {
      log(`  Build ${i + 1}: FAILED - ${result.error}`);
    }
  }

  // Calculer les statistiques
  const times = metrics.buildTime;
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  log(`Build Time Results:`);
  log(`  Average: ${(avg / 1000).toFixed(2)}s`);
  log(`  Min: ${(min / 1000).toFixed(2)}s`);
  log(`  Max: ${(max / 1000).toFixed(2)}s`);

  return { avg, min, max };
}

/**
 * Analyse la taille du build
 */
function analyzeBuildSize() {
  log('Analyzing build size...');

  const distPath = path.join(process.cwd(), 'dist');
  const assetsPath = path.join(distPath, 'assets');

  if (!fs.existsSync(assetsPath)) {
    log('  No assets folder found');
    return null;
  }

  const files = fs.readdirSync(assetsPath);
  const stats = {
    totalSize: 0,
    jsSize: 0,
    cssSize: 0,
    otherSize: 0,
    fileCount: files.length,
  };

  for (const file of files) {
    const filePath = path.join(assetsPath, file);
    const size = fs.statSync(filePath).size;

    stats.totalSize += size;

    if (file.endsWith('.js')) {
      stats.jsSize += size;
    } else if (file.endsWith('.css')) {
      stats.cssSize += size;
    } else {
      stats.otherSize += size;
    }
  }

  metrics.buildSize = stats;

  log(`Build Size Results:`);
  log(`  Total: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  log(
    `  JavaScript: ${(stats.jsSize / 1024 / 1024).toFixed(2)} MB (${((stats.jsSize / stats.totalSize) * 100).toFixed(1)}%)`
  );
  log(
    `  CSS: ${(stats.cssSize / 1024 / 1024).toFixed(2)} MB (${((stats.cssSize / stats.totalSize) * 100).toFixed(1)}%)`
  );
  log(`  Other: ${(stats.otherSize / 1024 / 1024).toFixed(2)} MB`);
  log(`  Files: ${stats.fileCount}`);

  return stats;
}

/**
 * Mesure le temps de démarrage du serveur
 */
async function benchmarkStartup() {
  log('Benchmarking server startup...');

  return new Promise(resolve => {
    const startTime = Date.now();

    // Démarrer le serveur preview
    execSync('npm run preview', {
      cwd: process.cwd(),
      timeout: CONFIG.serverStartupTimeout,
    });

    // Attendre que le serveur soit prêt
    const checkServer = () => {
      http
        .get('http://localhost:4173', res => {
          const startupTime = Date.now() - startTime;
          metrics.startupTime = startupTime;

          log(`Server Startup Time: ${(startupTime / 1000).toFixed(2)}s`);
          resolve(startupTime);
        })
        .on('error', () => {
          setTimeout(checkServer, 100);
        });
    };

    setTimeout(checkServer, 1000);

    // Timeout de sécurité
    setTimeout(() => {
      resolve(null);
    }, CONFIG.serverStartupTimeout);
  });
}

/**
 * Mesure le temps de chargement des pages
 */
async function benchmarkPageLoad() {
  log('Benchmarking page load times...');

  const pages = [
    { name: 'Homepage', path: '/' },
    { name: 'Editor', path: '/?note=new' },
    { name: 'Graph', path: '/?view=graph' },
  ];

  for (const page of pages) {
    log(`  Testing ${page.name}...`);
    const times = [];

    for (let i = 0; i < CONFIG.loadTestIterations; i++) {
      const start = Date.now();

      try {
        await new Promise((resolve, reject) => {
          http
            .get(`http://localhost:4173${page.path}`, res => {
              let data = '';
              res.on('data', chunk => (data += chunk));
              res.on('end', () => resolve(data));
            })
            .on('error', reject)
            .setTimeout(CONFIG.pageLoadTimeout, () => {
              reject(new Error('Timeout'));
            });
        });

        const duration = Date.now() - start;
        times.push(duration);
      } catch {
        log(`    Request ${i + 1}: FAILED`);
      }
    }

    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      metrics.pageLoadTimes[page.name] = {
        avg,
        min: Math.min(...times),
        max: Math.max(...times),
      };

      log(`    Average: ${avg.toFixed(0)}ms`);
    }
  }

  return metrics.pageLoadTimes;
}

/**
 * Génère un rapport JSON
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      buildTime: {
        avg:
          metrics.buildTime.length > 0
            ? metrics.buildTime.reduce((a, b) => a + b, 0) / metrics.buildTime.length
            : 0,
        min: metrics.buildTime.length > 0 ? Math.min(...metrics.buildTime) : 0,
        max: metrics.buildTime.length > 0 ? Math.max(...metrics.buildTime) : 0,
      },
      buildSize: metrics.buildSize,
      startupTime: metrics.startupTime,
      pageLoadTimes: metrics.pageLoadTimes,
    },
    raw: metrics,
  };

  // Créer le dossier de résultats
  if (!fs.existsSync(CONFIG.resultsDir)) {
    fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
  }

  // Sauvegarder le rapport
  const reportPath = path.join(CONFIG.resultsDir, `benchmark-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(`Report saved to: ${reportPath}`);

  return report;
}

/**
 * Compare avec un rapport précédent
 */
function compareWithPrevious(currentReport) {
  const files = fs
    .readdirSync(CONFIG.resultsDir)
    .filter(f => f.startsWith('benchmark-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length < 2) {
    log('No previous report to compare with');
    return;
  }

  const previousPath = path.join(CONFIG.resultsDir, files[1]);
  const previousReport = JSON.parse(fs.readFileSync(previousPath, 'utf-8'));

  log('\n=== Comparison with Previous Run ===\n');

  // Comparer le temps de build
  const buildDiff = currentReport.summary.buildTime.avg - previousReport.summary.buildTime.avg;
  const buildDiffPercent = (buildDiff / previousReport.summary.buildTime.avg) * 100;

  log(`Build Time:`);
  log(`  Current: ${(currentReport.summary.buildTime.avg / 1000).toFixed(2)}s`);
  log(`  Previous: ${(previousReport.summary.buildTime.avg / 1000).toFixed(2)}s`);
  log(
    `  Difference: ${buildDiff > 0 ? '+' : ''}${(buildDiff / 1000).toFixed(2)}s (${buildDiffPercent > 0 ? '+' : ''}${buildDiffPercent.toFixed(1)}%)`
  );

  // Comparer la taille
  if (currentReport.summary.buildSize.totalSize && previousReport.summary.buildSize.totalSize) {
    const sizeDiff =
      currentReport.summary.buildSize.totalSize - previousReport.summary.buildSize.totalSize;
    const sizeDiffPercent = (sizeDiff / previousReport.summary.buildSize.totalSize) * 100;

    log(`\nBuild Size:`);
    log(`  Current: ${(currentReport.summary.buildSize.totalSize / 1024 / 1024).toFixed(2)} MB`);
    log(`  Previous: ${(previousReport.summary.buildSize.totalSize / 1024 / 1024).toFixed(2)} MB`);
    log(
      `  Difference: ${sizeDiff > 0 ? '+' : ''}${(sizeDiff / 1024).toFixed(2)} KB (${sizeDiffPercent > 0 ? '+' : ''}${sizeDiffPercent.toFixed(1)}%)`
    );
  }
}

/**
 * Point d'entrée principal
 */
async function main() {
  const args = new Set(process.argv.slice(2));
  const shouldCompare = args.has('--compare');

  log('=== Performance Benchmark ===\n');

  try {
    // Build benchmark
    await benchmarkBuild();

    // Size analysis
    analyzeBuildSize();

    // Startup benchmark (optionnel - nécessite que le build soit fait)
    // await benchmarkStartup();
    // await benchmarkPageLoad();

    // Générer le rapport
    const report = generateReport();

    // Comparer si demandé
    if (shouldCompare) {
      compareWithPrevious(report);
    }

    log('\n=== Benchmark Complete ===');

    // Exit code basé sur les seuils
    const buildTimeAvg = report.summary.buildTime.avg;
    const buildSizeMB = (report.summary.buildSize.totalSize || 0) / 1024 / 1024;

    if (buildTimeAvg > 120000) {
      // > 2 minutes
      log('\nWARNING: Build time exceeds 2 minutes');
      process.exit(1);
    }

    if (buildSizeMB > 10) {
      // > 10 MB
      log('\nWARNING: Build size exceeds 10 MB');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    log(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  await main();
}

module.exports = { benchmarkBuild, analyzeBuildSize, generateReport };
