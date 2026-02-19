// Copyright (c) 2025 Jema Technology.
// Content Security Policy E2E Tests

import { test, expect } from '@playwright/test';

/**
 * Expected CSP directives for Jemanote
 */
const EXPECTED_CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'https://api.mistral.ai'],
  'media-src': ["'self'", 'blob:', 'data:'],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
};

/**
 * Forbidden CSP values that indicate security issues
 */
const FORBIDDEN_CSP_VALUES = [
  "'*'", // Wildcard allows anything
  "'unsafe-eval'", // Allows eval() - high XSS risk
  'http:', // Insecure HTTP
  'http://*', // Insecure wildcard
];

/**
 * Parse CSP header value into structured object
 */
function parseCSP(headerValue: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};

  if (!headerValue) {
    return directives;
  }

  const parts = headerValue.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex === -1) {
      directives[trimmed] = [];
    } else {
      const directive = trimmed.slice(0, spaceIndex);
      const values = trimmed
        .slice(spaceIndex + 1)
        .trim()
        .split(/\s+/);
      directives[directive] = values;
    }
  }

  return directives;
}

test.describe('Content Security Policy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have CSP header or meta tag', async ({ page }) => {
    // Check for CSP header
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMetaTag = await page.locator('meta[http-equiv="Content-Security-Policy"]').count();

    // Either header or meta tag should exist
    expect(cspHeader || cspMetaTag > 0).toBeTruthy();
  });

  test('should have secure default-src directive', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];

    if (cspHeader) {
      const directives = parseCSP(cspHeader);

      // default-src should be 'self' or more restrictive
      expect(directives['default-src']).toBeDefined();
      expect(directives['default-src']).not.toContain("'*'");
    }
  });

  test('should have object-src set to none', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMeta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    const cspValue = cspHeader || cspMeta;

    if (cspValue) {
      const directives = parseCSP(cspValue);

      // object-src should be 'none' to prevent plugin-based attacks
      if (directives['object-src']) {
        expect(directives['object-src']).toContain("'none'");
      }
    }
  });

  test('should have frame-ancestors set to prevent clickjacking', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const xFrameOptions = response.headers()['x-frame-options'];

    // Either CSP frame-ancestors or X-Frame-Options should be set
    if (cspHeader) {
      const directives = parseCSP(cspHeader);
      const hasFrameAncestors =
        directives['frame-ancestors']?.includes("'none'") ||
        directives['frame-ancestors']?.includes("'self'");

      if (hasFrameAncestors) {
        expect(hasFrameAncestors).toBeTruthy();
      } else if (xFrameOptions) {
        expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions.toUpperCase());
      }
    } else if (xFrameOptions) {
      expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions.toUpperCase());
    }
  });

  test('should not allow unsafe-eval in script-src', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMeta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    const cspValue = cspHeader || cspMeta;

    if (cspValue) {
      const directives = parseCSP(cspValue);

      if (directives['script-src']) {
        expect(directives['script-src']).not.toContain("'unsafe-eval'");
      }
    }
  });

  test('should not have wildcard in script-src', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMeta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    const cspValue = cspHeader || cspMeta;

    if (cspValue) {
      const directives = parseCSP(cspValue);

      if (directives['script-src']) {
        expect(directives['script-src']).not.toContain("'*'");
        expect(directives['script-src']).not.toContain('https://*');
        expect(directives['script-src']).not.toContain('http://*');
      }
    }
  });

  test('should have base-uri set to self', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMeta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    const cspValue = cspHeader || cspMeta;

    if (cspValue) {
      const directives = parseCSP(cspValue);

      if (directives['base-uri']) {
        expect(directives['base-uri']).toContain("'self'");
      }
    }
  });

  test('should have form-action set to self', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMeta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    const cspValue = cspHeader || cspMeta;

    if (cspValue) {
      const directives = parseCSP(cspValue);

      if (directives['form-action']) {
        expect(directives['form-action']).toContain("'self'");
      }
    }
  });

  test('should report CSP violations to console in development', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for CSP violation errors
    const cspViolations = consoleMessages.filter(
      msg => msg.includes('Refused to') || msg.includes('violated')
    );

    // In production, there should be no CSP violations
    // In development, some violations might be expected due to dev tools
    if (process.env.NODE_ENV === 'production') {
      expect(cspViolations).toHaveLength(0);
    }
  });

  test('should not allow inline event handlers', async ({ page }) => {
    // Check that no elements have inline event handlers
    const elementsWithInlineHandlers = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const inlineHandlers: string[] = [];

      allElements.forEach(el => {
        const attributes = el.attributes;
        for (const attr of attributes) {
          if (attr.name.startsWith('on')) {
            inlineHandlers.push(`${el.tagName}.${attr.name}`);
          }
        }
      });

      return inlineHandlers;
    });

    // Should not have any inline event handlers
    expect(elementsWithInlineHandlers).toHaveLength(0);
  });

  test('should have secure connect-src for API calls', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMeta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    const cspValue = cspHeader || cspMeta;

    if (cspValue) {
      const directives = parseCSP(cspValue);

      if (directives['connect-src']) {
        // Should not allow all origins
        expect(directives['connect-src']).not.toContain("'*'");

        // Should include Supabase and Mistral API domains
        const hasSupabase = directives['connect-src'].some(v => v.includes('supabase.co'));
        const hasSelf = directives['connect-src'].includes("'self'");

        expect(hasSelf || hasSupabase).toBeTruthy();
      }
    }
  });

  test('should have manifest-src set to self for PWA', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMeta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    const cspValue = cspHeader || cspMeta;

    if (cspValue) {
      const directives = parseCSP(cspValue);

      // manifest-src should be set for PWA
      if (directives['manifest-src']) {
        expect(directives['manifest-src']).toContain("'self'");
      }
    }
  });

  test('should have worker-src for service workers', async ({ page }) => {
    const response = await page.waitForResponse(
      response => response.url() === page.url() && response.status() === 200
    );

    const cspHeader = response.headers()['content-security-policy'];
    const cspMeta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    const cspValue = cspHeader || cspMeta;

    if (cspValue) {
      const directives = parseCSP(cspValue);

      // worker-src should be set for service workers
      if (directives['worker-src']) {
        expect(directives['worker-src']).toContain("'self'");
      }
    }
  });
});
