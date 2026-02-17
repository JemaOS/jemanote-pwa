#!/usr/bin/env node

// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Quality Check Script
 * 
 * This script runs all quality checks in sequence:
 * - ESLint
 * - TypeScript type checking
 * - Prettier formatting check
 * - Unit tests
 * - Dependency check (depcheck)
 * - Dead code detection (knip)
 * 
 * Usage:
 *   node scripts/quality-check.js [--fix]
 * 
 * Options:
 *   --fix    Auto-fix issues where possible
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const shouldFix = process.argv.includes('--fix');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Print a formatted header
 */
function printHeader(text) {
  console.log('\n' + colors.cyan + colors.bright + '━'.repeat(60) + colors.reset);
  console.log(colors.cyan + colors.bright + '  ' + text + colors.reset);
  console.log(colors.cyan + colors.bright + '━'.repeat(60) + colors.reset + '\n');
}

/**
 * Print a success message
 */
function printSuccess(text) {
  console.log(colors.green + '✓ ' + text + colors.reset);
}

/**
 * Print an error message
 */
function printError(text) {
  console.log(colors.red + '✗ ' + text + colors.reset);
}

/**
 * Print a warning message
 */
function printWarning(text) {
  console.log(colors.yellow + '⚠ ' + text + colors.reset);
}

/**
 * Run a command and return a promise
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'pipe',
      shell: true,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      if (options.verbose !== false) {
        process.stdout.write(output);
      }
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      if (options.verbose !== false) {
        process.stderr.write(output);
      }
    });

    child.on('close', (code) => {
      if (code === 0 || options.ignoreError) {
        resolve({ code, stdout, stderr });
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if a command exists
 */
async function commandExists(command) {
  try {
    await runCommand('which', [command], { verbose: false, ignoreError: true });
    return true;
  } catch {
    try {
      await runCommand('where', [command], { verbose: false, ignoreError: true });
      return true;
    } catch {
      return false;
    }
  }
}

// Track results
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

/**
 * Run ESLint check
 */
async function runESLint() {
  printHeader('Running ESLint');
  try {
    const args = shouldFix ? ['.', '--fix'] : ['.', '--max-warnings=0'];
    await runCommand('npx', ['eslint', ...args]);
    printSuccess('ESLint passed');
    results.passed.push('ESLint');
  } catch {
    printError('ESLint failed');
    results.failed.push('ESLint');
    if (!shouldFix) {
      console.log(colors.yellow + '  Run with --fix to auto-fix issues' + colors.reset);
    }
  }
}

/**
 * Run TypeScript type check
 */
async function runTypeCheck() {
  printHeader('Running TypeScript Type Check');
  try {
    await runCommand('npx', ['tsc', '--noEmit']);
    printSuccess('TypeScript type check passed');
    results.passed.push('TypeScript');
  } catch {
    printError('TypeScript type check failed');
    results.failed.push('TypeScript');
  }
}

/**
 * Run Prettier check
 */
async function runPrettier() {
  printHeader('Running Prettier Check');
  try {
    const args = shouldFix 
      ? ['--write', '.'] 
      : ['--check', '.'];
    await runCommand('npx', ['prettier', ...args]);
    printSuccess(shouldFix ? 'Prettier formatting applied' : 'Prettier check passed');
    results.passed.push('Prettier');
  } catch {
    if (shouldFix) {
      printError('Prettier failed');
      results.failed.push('Prettier');
    } else {
      printError('Prettier check failed - some files are not formatted');
      console.log(colors.yellow + '  Run with --fix to format files' + colors.reset);
      results.failed.push('Prettier');
    }
  }
}

/**
 * Run unit tests
 */
async function runTests() {
  printHeader('Running Unit Tests');
  try {
    await runCommand('npx', ['vitest', 'run', '--passWithNoTests']);
    printSuccess('Unit tests passed');
    results.passed.push('Unit Tests');
  } catch {
    printError('Unit tests failed');
    results.failed.push('Unit Tests');
  }
}

/**
 * Run dependency check
 */
async function runDepcheck() {
  printHeader('Running Dependency Check (depcheck)');
  try {
    await runCommand('npx', ['depcheck', '--ignore-bin-package', '--skip-missing']);
    printSuccess('Dependency check passed');
    results.passed.push('Depcheck');
  } catch (err) {
    // Depcheck exits with code 1 if it finds issues, but we want to treat warnings differently
    const output = err.message || '';
    if (output.includes('Unused dependencies') || output.includes('Unused devDependencies')) {
      printWarning('Dependency check found unused dependencies');
      results.warnings.push('Depcheck');
    } else {
      printError('Dependency check failed');
      results.failed.push('Depcheck');
    }
  }
}

/**
 * Run Knip (dead code detection)
 */
async function runKnip() {
  printHeader('Running Dead Code Detection (Knip)');
  try {
    await runCommand('npx', ['knip']);
    printSuccess('Dead code detection passed');
    results.passed.push('Knip');
  } catch {
    printWarning('Knip found potential dead code or issues');
    results.warnings.push('Knip');
  }
}

/**
 * Print final summary
 */
function printSummary() {
  console.log('\n' + colors.cyan + colors.bright + '━'.repeat(60) + colors.reset);
  console.log(colors.cyan + colors.bright + '  QUALITY CHECK SUMMARY' + colors.reset);
  console.log(colors.cyan + colors.bright + '━'.repeat(60) + colors.reset + '\n');

  if (results.passed.length > 0) {
    console.log(colors.green + colors.bright + '✓ Passed (' + results.passed.length + '):' + colors.reset);
    results.passed.forEach(item => console.log(colors.green + '  • ' + item + colors.reset));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log(colors.yellow + colors.bright + '⚠ Warnings (' + results.warnings.length + '):' + colors.reset);
    results.warnings.forEach(item => console.log(colors.yellow + '  • ' + item + colors.reset));
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log(colors.red + colors.bright + '✗ Failed (' + results.failed.length + '):' + colors.reset);
    results.failed.forEach(item => console.log(colors.red + '  • ' + item + colors.reset));
    console.log('');
  }

  const total = results.passed.length + results.warnings.length + results.failed.length;
  const success = results.failed.length === 0;

  console.log(colors.cyan + colors.bright + '━'.repeat(60) + colors.reset);
  
  if (success) {
    console.log(colors.green + colors.bright + '  ✓ All quality checks passed!' + colors.reset);
    console.log(colors.cyan + colors.bright + '━'.repeat(60) + colors.reset + '\n');
    return 0;
  } else {
    console.log(colors.red + colors.bright + `  ✗ ${results.failed.length}/${total} checks failed` + colors.reset);
    console.log(colors.cyan + colors.bright + '━'.repeat(60) + colors.reset + '\n');
    return 1;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(colors.blue + colors.bright + `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║           JEMANOTE QUALITY CHECK SUITE                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  ` + colors.reset);

  if (shouldFix) {
    console.log(colors.yellow + '⚠ Running in FIX mode - will auto-fix issues where possible\n' + colors.reset);
  }

  const startTime = Date.now();

  try {
    // Run all checks
    await runESLint();
    await runTypeCheck();
    await runPrettier();
    await runTests();
    await runDepcheck();
    await runKnip();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(colors.blue + `\n⏱  Total time: ${duration}s\n` + colors.reset);

    const exitCode = printSummary();
    process.exit(exitCode);
  } catch (error) {
    console.error(colors.red + 'Unexpected error:' + colors.reset, error);
    process.exit(1);
  }
}

await main();
