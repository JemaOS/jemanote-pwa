#!/usr/bin/env node
// Copyright (c) 2025 Jema Technology.
// Content Security Policy validation script

import fs from 'node:fs';
import path from 'node:path';

/**
 * Default CSP directives for Jemanote
 */
const DEFAULT_CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'script-src-elem': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'style-src-elem': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://api.mistral.ai',
    'https://*.googleapis.com',
  ],
  'media-src': ["'self'", 'blob:', 'data:'],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'upgrade-insecure-requests': [],
};

/**
 * Required directives for security
 */
const REQUIRED_DIRECTIVES = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'connect-src',
  'object-src',
  'frame-ancestors',
  'base-uri',
];

/**
 * Dangerous values that should not be in CSP
 */
const DANGEROUS_VALUES = new Set([
  "'*'", // Wildcard
  "'unsafe-eval'", // Unless absolutely necessary
  'http:', // Insecure protocol
  'https://*', // Too broad
  'data:', // In script-src (XSS risk)
]);

/**
 * Parse CSP string into object
 */
function parseCSP(cspString) {
  const directives = {};
  
  if (!cspString) return directives;
  
  const parts = cspString.split(';');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex === -1) {
      directives[trimmed] = [];
    } else {
      const directive = trimmed.slice(0, spaceIndex);
      const values = trimmed.slice(spaceIndex + 1).trim().split(/\s+/);
      directives[directive] = values;
    }
  }
  
  return directives;
}

/**
 * Build CSP string from object
 */
function buildCSP(directives) {
  return Object.entries(directives)
    .map(([directive, values]) => {
      if (values.length === 0) return directive;
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Validate CSP directives
 */
function isDangerousValueAllowed(directive, value) {
  if (directive === 'img-src' && value === 'data:') return true;
  if (directive === 'worker-src' && value === 'blob:') return true;
  return false;
}

function checkRequiredDirectives(directives) {
  return REQUIRED_DIRECTIVES
    .filter(required => !directives[required])
    .map(required => ({ type: 'error', message: `Missing required directive: ${required}` }));
}

function checkDangerousValues(directives) {
  const issues = [];
  for (const [directive, values] of Object.entries(directives)) {
    for (const value of values) {
      if (DANGEROUS_VALUES.has(value) && !isDangerousValueAllowed(directive, value)) {
        issues.push({ type: 'error', message: `Dangerous value "${value}" found in ${directive}` });
      }
    }
  }
  return issues;
}

function checkCSPWarnings(directives) {
  const warnings = [];
  
  if (directives['script-src']?.includes("'unsafe-inline'")) {
    const hasNonce = directives['script-src'].some(v => v.includes('nonce-'));
    const hasHash = directives['script-src'].some(v => v.startsWith("'sha256-") || v.startsWith("'sha384-") || v.startsWith("'sha512-"));
    if (!hasNonce && !hasHash) {
      warnings.push({ type: 'warning', message: "script-src uses 'unsafe-inline' without nonce or hash - consider using strict-dynamic" });
    }
  }
  
  if (!directives['frame-ancestors']) {
    warnings.push({ type: 'warning', message: "frame-ancestors not set - application may be vulnerable to clickjacking" });
  }
  if (!directives['upgrade-insecure-requests']) {
    warnings.push({ type: 'warning', message: "Consider adding 'upgrade-insecure-requests' for HTTPS enforcement" });
  }
  return warnings;
}

function validateCSP(directives, source = 'custom') {
  const issues = [
    ...checkRequiredDirectives(directives),
    ...checkDangerousValues(directives),
  ];
  
  if (directives['object-src'] && !directives['object-src'].includes("'none'")) {
    issues.push({ type: 'error', message: "object-src should be set to 'none' to prevent plugin-based attacks" });
  }
  
  const warnings = checkCSPWarnings(directives);
  
  return { issues, warnings, isValid: issues.length === 0 };
}

/**
 * Check index.html for CSP meta tag
 */
function checkIndexHtml() {
  const indexPath = path.join(process.cwd(), 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    return {
      found: false,
      csp: null,
      issues: [{ type: 'error', message: 'index.html not found' }],
    };
  }
  
  const content = fs.readFileSync(indexPath, 'utf-8');
  const cspMatch = content.match(/<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"[^>]*>/i);
  
  if (!cspMatch) {
    return {
      found: false,
      csp: null,
      issues: [{ type: 'warning', message: 'No CSP meta tag found in index.html' }],
    };
  }
  
  const cspString = cspMatch[1];
  const directives = parseCSP(cspString);
  const validation = validateCSP(directives, 'meta-tag');
  
  return {
    found: true,
    csp: cspString,
    directives,
    ...validation,
  };
}

/**
 * Check Vite config for CSP headers
 */
function checkViteConfig() {
  const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
  
  if (!fs.existsSync(viteConfigPath)) {
    return {
      found: false,
      issues: [{ type: 'warning', message: 'vite.config.ts not found' }],
    };
  }
  
  const content = fs.readFileSync(viteConfigPath, 'utf-8');
  
  // Check for headers configuration
  const hasHeaders = content.includes('headers') || content.includes('server') || content.includes('preview');
  
  if (!hasHeaders) {
    return {
      found: false,
      issues: [{ type: 'warning', message: 'No CSP headers configured in Vite config' }],
    };
  }
  
  return {
    found: true,
    issues: [],
  };
}

/**
 * Generate recommended CSP
 */
function generateRecommendedCSP() {
  return buildCSP(DEFAULT_CSP);
}

/**
 * Print results
 */
function printResults(results) {
  console.log('🛡️  Content Security Policy Check\n');
  console.log('=================================\n');
  
  // Meta tag check
  console.log('📄 index.html Meta Tag:');
  if (results.metaTag.found) {
    console.log('  ✅ CSP meta tag found');
    console.log(`  CSP: ${results.metaTag.csp?.substring(0, 80)}...\n`);
    
    if (results.metaTag.issues.length > 0) {
      console.log('  Issues:');
      results.metaTag.issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : '⚠️';
        console.log(`    ${icon} ${issue.message}`);
      });
    }
    
    if (results.metaTag.warnings?.length > 0) {
      console.log('  Warnings:');
      results.metaTag.warnings.forEach(warning => {
        console.log(`    ⚠️  ${warning.message}`);
      });
    }
  } else {
    console.log('  ❌ No CSP meta tag found');
    results.metaTag.issues.forEach(issue => {
      console.log(`  ${issue.type === 'error' ? '❌' : '⚠️'} ${issue.message}`);
    });
  }
  
  console.log('\n');
  
  // Vite config check
  console.log('⚙️  Vite Configuration:');
  if (results.viteConfig.found) {
    console.log('  ✅ Headers configuration found');
  } else {
    console.log('  ⚠️  No headers configuration found');
    results.viteConfig.issues.forEach(issue => {
      console.log(`  ${issue.type === 'error' ? '❌' : '⚠️'} ${issue.message}`);
    });
  }
  
  console.log('\n');
  
  // Recommendations
  console.log('💡 Recommendations:');
  console.log('-------------------\n');
  
  if (!results.metaTag.found || results.metaTag.issues.length > 0) {
    console.log('Add the following CSP meta tag to your index.html <head>:');
    console.log('');
    console.log('<meta http-equiv="Content-Security-Policy"');
    console.log(`      content="${generateRecommendedCSP()}">`);
  } else {
    console.log('✅ CSP configuration looks good!');
  }
  
  console.log('\n');
  
  // For production deployment
  console.log('🚀 Production Deployment:');
  console.log('-------------------------\n');
  console.log('For production, configure CSP headers on your server:');
  console.log('');
  console.log('Nginx:');
  console.log('  add_header Content-Security-Policy "' + generateRecommendedCSP() + '" always;');
  console.log('');
  console.log('Vercel (vercel.json):');
  console.log('  {"headers": [{"source": "/(.*)", "headers": [{"key": "Content-Security-Policy", "value": "' + generateRecommendedCSP() + '"}]}]}');
  
  console.log('\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const generateOnly = args.includes('--generate');
  
  if (generateOnly) {
    console.log('🛡️  Recommended CSP Configuration\n');
    console.log('==================================\n');
    console.log(generateRecommendedCSP());
    console.log('\n');
    console.log('As HTML meta tag:');
    console.log(`<meta http-equiv="Content-Security-Policy" content="${generateRecommendedCSP()}">`);
    return;
  }
  
  const results = {
    metaTag: checkIndexHtml(),
    viteConfig: checkViteConfig(),
  };
  
  printResults(results);
  
  // Exit with error code if there are critical issues
  const hasErrors = results.metaTag.issues?.some(i => i.type === 'error') ||
                    results.viteConfig.issues?.some(i => i.type === 'error');
  
  if (hasErrors) {
    console.log('❌ CSP check failed with errors\n');
    process.exit(1);
  }
  
  console.log('✅ CSP check completed\n');
}

try {
  await main();
} catch (error) {
  console.error('❌ CSP check failed:', error);
  process.exit(1);
}
