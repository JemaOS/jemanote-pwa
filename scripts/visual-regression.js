#!/usr/bin/env node

// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Script de comparaison visuelle pour les tests de régression
 * 
 * Ce script compare les screenshots générés par Playwright avec les baselines
 * et génère un rapport HTML des différences détectées.
 * 
 * Usage:
 *   node scripts/visual-regression.js
 *   node scripts/visual-regression.js --update
 *   node scripts/visual-regression.js --report
 */

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

// Configuration
const CONFIG = {
  baselineDir: path.join(__dirname, '..', 'tests', 'regression', 'snapshots'),
  actualDir: path.join(__dirname, '..', 'test-results'),
  diffDir: path.join(__dirname, '..', 'visual-regression-report'),
  threshold: 0.2, // 0.2% de différence
  maxDiffPixels: 100,
}

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

// Utilitaires
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const getAllFiles = (dir, pattern = /.*/) => {
  const files = []
  if (!fs.existsSync(dir)) return files
  
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, pattern))
    } else if (pattern.test(item)) {
      files.push(fullPath)
    }
  }
  return files
}

// Comparer deux images (simplifié - utilise pixelmatch si disponible)
const compareImages = async (baselinePath, actualPath) => {
  try {
    // Essayer d'utiliser pixelmatch si disponible
    const pixelmatch = require('pixelmatch')
    const PNG = require('pngjs').PNG
    
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath))
    const actual = PNG.sync.read(fs.readFileSync(actualPath))
    
    const { width, height } = baseline
    const diff = new PNG({ width, height })
    
    const numDiffPixels = pixelmatch(
      baseline.data,
      actual.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    )
    
    const diffPercentage = (numDiffPixels / (width * height)) * 100
    
    return {
      match: diffPercentage <= CONFIG.threshold && numDiffPixels <= CONFIG.maxDiffPixels,
      diffPercentage,
      numDiffPixels,
      diffImage: diff,
    }
  } catch (error) {
    // Fallback: comparaison simple de taille de fichier
    const baselineStat = fs.statSync(baselinePath)
    const actualStat = fs.statSync(actualPath)
    const sizeDiff = Math.abs(baselineStat.size - actualStat.size)
    const diffPercentage = (sizeDiff / baselineStat.size) * 100
    
    return {
      match: diffPercentage <= CONFIG.threshold,
      diffPercentage,
      numDiffPixels: 0,
      diffImage: null,
      fallback: true,
    }
  }
}

// Générer le rapport HTML
const generateReport = (results) => {
  const timestamp = new Date().toISOString()
  const totalTests = results.length
  const passedTests = results.filter(r => r.passed).length
  const failedTests = totalTests - passedTests
  
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport de Régression Visuelle</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .header h1 { margin-bottom: 0.5rem; }
    .summary {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    .summary-item {
      background: rgba(255,255,255,0.2);
      padding: 1rem 2rem;
      border-radius: 8px;
    }
    .summary-item .number {
      font-size: 2rem;
      font-weight: bold;
    }
    .passed { color: #4caf50; }
    .failed { color: #f44336; }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }
    .test-result {
      background: white;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .test-header {
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test-header.passed { background: #e8f5e9; }
    .test-header.failed { background: #ffebee; }
    .test-title {
      font-weight: 600;
      font-size: 1.1rem;
    }
    .test-status {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .test-status.passed {
      background: #4caf50;
      color: white;
    }
    .test-status.failed {
      background: #f44336;
      color: white;
    }
    .test-details {
      padding: 1.5rem;
    }
    .comparison {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .image-box {
      text-align: center;
    }
    .image-box h4 {
      margin-bottom: 0.5rem;
      color: #666;
    }
    .image-box img {
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .diff-info {
      margin-top: 1rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .diff-info p {
      margin: 0.25rem 0;
    }
    .footer {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
    @media (max-width: 768px) {
      .comparison {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📸 Rapport de Régression Visuelle</h1>
    <p>Généré le ${new Date(timestamp).toLocaleString('fr-FR')}</p>
    <div class="summary">
      <div class="summary-item">
        <div class="number">${totalTests}</div>
        <div>Tests Total</div>
      </div>
      <div class="summary-item">
        <div class="number passed">${passedTests}</div>
        <div>Réussis</div>
      </div>
      <div class="summary-item">
        <div class="number failed">${failedTests}</div>
        <div>Échoués</div>
      </div>
    </div>
  </div>
  
  <div class="container">
    ${results.map(result => `
      <div class="test-result">
        <div class="test-header ${result.passed ? 'passed' : 'failed'}">
          <div class="test-title">${result.name}</div>
          <div class="test-status ${result.passed ? 'passed' : 'failed'}">
            ${result.passed ? '✓ Passé' : '✗ Échoué'}
          </div>
        </div>
        ${!result.passed ? `
          <div class="test-details">
            <div class="comparison">
              <div class="image-box">
                <h4>Baseline</h4>
                <img src="${result.baselinePath}" alt="Baseline" loading="lazy">
              </div>
              <div class="image-box">
                <h4>Actual</h4>
                <img src="${result.actualPath}" alt="Actual" loading="lazy">
              </div>
              ${result.diffPath ? `
                <div class="image-box">
                  <h4>Différence</h4>
                  <img src="${result.diffPath}" alt="Diff" loading="lazy">
                </div>
              ` : ''}
            </div>
            <div class="diff-info">
              <p><strong>Différence:</strong> ${result.diffPercentage?.toFixed(2) || 'N/A'}%</p>
              <p><strong>Pixels différents:</strong> ${result.numDiffPixels || 'N/A'}</p>
              ${result.error ? `<p><strong>Erreur:</strong> ${result.error}</p>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
  
  <div class="footer">
    <p>Jemanote Visual Regression Testing</p>
  </div>
</body>
</html>`

  fs.writeFileSync(path.join(CONFIG.diffDir, 'index.html'), html)
  log(`Rapport généré: ${path.join(CONFIG.diffDir, 'index.html')}`, 'cyan')
}

// Mettre à jour les baselines
const updateBaselines = () => {
  log('Mise à jour des baselines...', 'yellow')
  
  ensureDir(CONFIG.baselineDir)
  
  // Copier tous les screenshots actuels comme nouvelles baselines
  const actualFiles = getAllFiles(CONFIG.actualDir, /\.png$/)
  
  for (const file of actualFiles) {
    const relativePath = path.relative(CONFIG.actualDir, file)
    const baselinePath = path.join(CONFIG.baselineDir, relativePath)
    
    ensureDir(path.dirname(baselinePath))
    fs.copyFileSync(file, baselinePath)
    log(`Baseline mise à jour: ${relativePath}`, 'green')
  }
  
  log(`${actualFiles.length} baselines mises à jour`, 'green')
}

// Fonction principale
const main = async () => {
  const args = process.argv.slice(2)
  const shouldUpdate = args.includes('--update')
  const shouldReport = args.includes('--report')
  
  ensureDir(CONFIG.diffDir)
  
  if (shouldUpdate) {
    updateBaselines()
    return
  }
  
  log('Analyse des tests de régression visuelle...', 'blue')
  
  // Récupérer tous les screenshots
  const baselineFiles = getAllFiles(CONFIG.baselineDir, /\.png$/)
  const actualFiles = getAllFiles(CONFIG.actualDir, /\.png$/)
  
  log(`${baselineFiles.length} baselines trouvées`, 'cyan')
  log(`${actualFiles.length} screenshots actuels trouvés`, 'cyan')
  
  const results = []
  let hasFailures = false
  
  const processNewScreenshot = (relativePath) => {
    log(`Nouveau screenshot (pas de baseline): ${relativePath}`, 'yellow')
    return { name: relativePath, passed: false, error: 'Nouveau screenshot - aucune baseline', baselinePath: null, actualPath: relativePath }
  }

  const processDiffResult = (comparison, relativePath, baselineFile, actualFile) => {
    log(`Différence détectée: ${relativePath} (${comparison.diffPercentage.toFixed(2)}%)`, 'red')
    let diffPath = null
    if (comparison.diffImage) {
      diffPath = path.join(CONFIG.diffDir, 'diffs', relativePath)
      ensureDir(path.dirname(diffPath))
      fs.writeFileSync(diffPath, PNG.sync.write(comparison.diffImage))
    }
    return {
      name: relativePath, passed: false,
      diffPercentage: comparison.diffPercentage, numDiffPixels: comparison.numDiffPixels,
      baselinePath: path.relative(CONFIG.diffDir, baselineFile),
      actualPath: path.relative(CONFIG.diffDir, actualFile),
      diffPath: diffPath ? path.relative(CONFIG.diffDir, diffPath) : null,
    }
  }

  // Comparer chaque screenshot avec sa baseline
  for (const actualFile of actualFiles) {
    const relativePath = path.relative(CONFIG.actualDir, actualFile)
    const baselineFile = path.join(CONFIG.baselineDir, relativePath)
    
    if (!fs.existsSync(baselineFile)) {
      results.push(processNewScreenshot(relativePath))
      hasFailures = true
      continue
    }
    
    try {
      const comparison = await compareImages(baselineFile, actualFile)
      
      if (!comparison.match) {
        hasFailures = true
        results.push(processDiffResult(comparison, relativePath, baselineFile, actualFile))
      } else {
        log(`✓ ${relativePath}`, 'green')
        results.push({
          name: relativePath,
          passed: true,
          diffPercentage: comparison.diffPercentage,
          numDiffPixels: comparison.numDiffPixels,
        })
      }
    } catch (error) {
      hasFailures = true
      log(`Erreur lors de la comparaison: ${relativePath}`, 'red')
      results.push({
        name: relativePath,
        passed: false,
        error: error.message,
        baselinePath: path.relative(CONFIG.diffDir, baselineFile),
        actualPath: path.relative(CONFIG.diffDir, actualFile),
      })
    }
  }
  
  // Vérifier les baselines manquantes
  for (const baselineFile of baselineFiles) {
    const relativePath = path.relative(CONFIG.baselineDir, baselineFile)
    const actualFile = path.join(CONFIG.actualDir, relativePath)
    
    if (!fs.existsSync(actualFile)) {
      log(`Screenshot manquant: ${relativePath}`, 'red')
      results.push({
        name: relativePath,
        passed: false,
        error: 'Screenshot manquant',
        baselinePath: path.relative(CONFIG.diffDir, baselineFile),
        actualPath: null,
      })
      hasFailures = true
    }
  }
  
  // Générer le rapport
  if (shouldReport || hasFailures) {
    generateReport(results)
  }
  
  // Résumé
  log('\n' + '='.repeat(50), 'cyan')
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  log(`Total: ${results.length} | Réussis: ${passed} | Échoués: ${failed}`, 'cyan')
  
  if (hasFailures) {
    log('\nDes différences visuelles ont été détectées!', 'red')
    log('Pour mettre à jour les baselines: npm run test:visual:update', 'yellow')
    process.exit(1)
  } else {
    log('\n✓ Tous les tests visuels ont réussi!', 'green')
    process.exit(0)
  }
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  log(`Erreur non gérée: ${error}`, 'red')
  process.exit(1)
})

// Exécuter
(async () => {
  try {
    await main()
  } catch (error) {
    log(`Erreur: ${error.message}`, 'red')
    process.exit(1)
  }
})()
