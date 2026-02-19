#!/usr/bin/env node
// Copyright (c) 2025 Jema Technology.
// Security audit script for dependency vulnerability scanning

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const AUDIT_REPORT_FILE = 'security-audit-report.json';
const SEVERITY_LEVELS = ['critical', 'high', 'moderate', 'low', 'info'];

/**
 * Run npm audit and capture results
 */
function runNpmAudit() {
  console.log('🔍 Running npm audit...\n');

  try {
    // Run npm audit with JSON output
    const result = execSync('npm audit --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(result);
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    // but still outputs valid JSON
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        console.error('❌ Failed to parse npm audit output');
        process.exit(1);
      }
    }
    console.error('❌ npm audit failed:', error.message);
    process.exit(1);
  }
}

/**
 * Filter vulnerabilities by severity
 */
function filterBySeverity(vulnerabilities, minSeverity = 'low') {
  const minIndex = SEVERITY_LEVELS.indexOf(minSeverity);
  const filtered = {};

  for (const [pkg, info] of Object.entries(vulnerabilities)) {
    const severity = info.severity || 'info';
    const severityIndex = SEVERITY_LEVELS.indexOf(severity);

    if (severityIndex <= minIndex) {
      filtered[pkg] = info;
    }
  }

  return filtered;
}

/**
 * Format vulnerability report
 */
function formatReport(auditData) {
  const { vulnerabilities, metadata } = auditData;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: metadata?.vulnerabilities?.total || 0,
      critical: metadata?.vulnerabilities?.critical || 0,
      high: metadata?.vulnerabilities?.high || 0,
      moderate: metadata?.vulnerabilities?.moderate || 0,
      low: metadata?.vulnerabilities?.low || 0,
      info: metadata?.vulnerabilities?.info || 0,
    },
    vulnerabilities: {},
    recommendations: [],
  };

  if (vulnerabilities) {
    for (const [pkgName, info] of Object.entries(vulnerabilities)) {
      report.vulnerabilities[pkgName] = {
        severity: info.severity,
        range: info.range,
        fixAvailable: info.fixAvailable
          ? {
              name: info.fixAvailable.name,
              version: info.fixAvailable.version,
            }
          : null,
        via: Array.isArray(info.via)
          ? info.via.map(v => (typeof v === 'string' ? v : v.title)).filter(Boolean)
          : [info.via],
      };

      if (info.fixAvailable) {
        report.recommendations.push(`Update ${pkgName} to version ${info.fixAvailable.version}`);
      }
    }
  }

  return report;
}

/**
 * Print formatted report to console
 */
function printReport(report) {
  console.log('\n📊 Security Audit Report');
  console.log('========================\n');

  console.log('Summary:');
  console.log(`  Total vulnerabilities: ${report.summary.total}`);
  console.log(`  🔴 Critical: ${report.summary.critical}`);
  console.log(`  🟠 High: ${report.summary.high}`);
  console.log(`  🟡 Moderate: ${report.summary.moderate}`);
  console.log(`  🟢 Low: ${report.summary.low}`);
  console.log(`  ℹ️  Info: ${report.summary.info}`);

  if (Object.keys(report.vulnerabilities).length > 0) {
    console.log('\n📋 Vulnerability Details:');
    console.log('------------------------\n');

    for (const [pkg, info] of Object.entries(report.vulnerabilities)) {
      const severityEmoji =
        {
          critical: '🔴',
          high: '🟠',
          moderate: '🟡',
          low: '🟢',
          info: 'ℹ️',
        }[info.severity] || '⚪';

      console.log(`${severityEmoji} ${pkg}`);
      console.log(`   Severity: ${info.severity.toUpperCase()}`);
      console.log(`   Affected versions: ${info.range}`);

      if (info.via && info.via.length > 0) {
        console.log(`   Issues: ${info.via.join(', ')}`);
      }

      if (info.fixAvailable) {
        console.log(`   ✅ Fix available: ${info.fixAvailable.name}@${info.fixAvailable.version}`);
      } else {
        console.log(`   ⚠️  No automatic fix available`);
      }
      console.log('');
    }
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    console.log('-------------------\n');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  console.log('\n');
}

/**
 * Save report to file
 */
function saveReport(report) {
  const reportPath = path.join(process.cwd(), AUDIT_REPORT_FILE);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${reportPath}`);
}

/**
 * Check if .nsprc exists and load exceptions
 */
function loadNsprcExceptions() {
  const nsprcPath = path.join(process.cwd(), '.nsprc');

  if (fs.existsSync(nsprcPath)) {
    try {
      const content = fs.readFileSync(nsprcPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('⚠️  Failed to parse .nsprc:', error.message);
    }
  }

  return { exceptions: [] };
}

/**
 * Apply .nsprc exceptions to report
 */
function applyExceptions(report, exceptions) {
  if (!exceptions.exceptions || exceptions.exceptions.length === 0) {
    return report;
  }

  const filteredVulnerabilities = {};
  const ignored = [];

  for (const [pkg, info] of Object.entries(report.vulnerabilities)) {
    const exception = exceptions.exceptions.find(e => e.package === pkg || pkg.includes(e.package));

    if (exception) {
      ignored.push({
        package: pkg,
        reason: exception.reason || 'No reason provided',
        expires: exception.expires || 'No expiration',
      });
    } else {
      filteredVulnerabilities[pkg] = info;
    }
  }

  return {
    ...report,
    vulnerabilities: filteredVulnerabilities,
    ignored,
  };
}

/**
 * Main function
 */
async function main() {
  const args = new Set(process.argv.slice(2));
  const saveToFile = args.has('--save');
  const failOnCritical = args.has('--fail-on-critical');
  const failOnHigh = args.has('--fail-on-high');

  console.log('🛡️  Jemanote Security Audit Tool\n');

  // Run audit
  const auditData = runNpmAudit();

  // Format report
  let report = formatReport(auditData);

  // Apply .nsprc exceptions
  const exceptions = loadNsprcExceptions();
  report = applyExceptions(report, exceptions);

  // Print report
  printReport(report);

  // Save if requested
  if (saveToFile) {
    saveReport(report);
  }

  // Print ignored vulnerabilities
  if (report.ignored && report.ignored.length > 0) {
    console.log('🚫 Ignored Vulnerabilities (.nsprc):');
    console.log('-------------------------------------\n');
    report.ignored.forEach(item => {
      console.log(`  • ${item.package}`);
      console.log(`    Reason: ${item.reason}`);
      console.log(`    Expires: ${item.expires}`);
      console.log('');
    });
  }

  // Determine exit code
  let exitCode = 0;

  if (failOnCritical && report.summary.critical > 0) {
    console.error('❌ Failing due to critical vulnerabilities');
    exitCode = 1;
  }

  if (failOnHigh && (report.summary.critical > 0 || report.summary.high > 0)) {
    console.error('❌ Failing due to high/critical vulnerabilities');
    exitCode = 1;
  }

  // Summary
  const totalIssues = Object.keys(report.vulnerabilities).length;
  if (totalIssues === 0) {
    console.log('✅ No vulnerabilities found!');
  } else {
    console.log(`⚠️  Found ${totalIssues} unaddressed vulnerabilities`);
  }

  process.exit(exitCode);
}

try {
  await main();
} catch (error) {
  console.error('❌ Security audit failed:', error);
  process.exit(1);
}
