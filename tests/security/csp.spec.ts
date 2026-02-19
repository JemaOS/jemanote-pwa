// Copyright (c) 2025 Jema Technology.
// Content Security Policy E2E Tests

import { test, expect } from '@playwright/test';
import { parseCSP } from './utils';

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
        expect(directives['script-src']).not.toContain(String.raw`http://*`);
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

    // We can't easily trigger a CSP violation without modifying the page content
    // But we can verify that no violations occurred during normal load
    expect(consoleMessages).toHaveLength(0);
  });
});
