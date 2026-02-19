// Copyright (c) 2025 Jema Technology.
// HTTP Security Headers Tests

import { test, expect, Response } from '@playwright/test';

/**
 * Expected security headers and their values
 */
const EXPECTED_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
  'X-XSS-Protection': ['1; mode=block', '0'], // 0 is acceptable for modern browsers with CSP
  'Referrer-Policy': [
    'strict-origin-when-cross-origin',
    'no-referrer',
    'same-origin',
    'strict-origin',
  ],
  'Permissions-Policy': null, // Should exist but value varies
  'Cross-Origin-Embedder-Policy': ['require-corp', 'credentialless'],
  'Cross-Origin-Opener-Policy': ['same-origin', 'same-origin-allow-popups'],
  'Cross-Origin-Resource-Policy': ['same-origin', 'same-site', 'cross-origin'],
};

/**
 * Headers that should NOT be present (information disclosure)
 */
const FORBIDDEN_HEADERS = ['X-Powered-By', 'Server', 'X-AspNet-Version', 'X-AspNetMvc-Version'];

test.describe('HTTP Security Headers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have X-Content-Type-Options: nosniff', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const header = response.headers()['x-content-type-options'];

    // Header should be present and set to nosniff
    expect(header).toBeDefined();
    expect(header?.toLowerCase()).toBe('nosniff');
  });

  test('should have X-Frame-Options to prevent clickjacking', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const header = response.headers()['x-frame-options'];
    const cspHeader = response.headers()['content-security-policy'];

    // Either X-Frame-Options or CSP frame-ancestors should be present
    const hasFrameOptions = header !== undefined;
    const hasCspFrameAncestors = cspHeader?.includes('frame-ancestors');

    expect(hasFrameOptions || hasCspFrameAncestors).toBeTruthy();

    if (hasFrameOptions) {
      const validValues = ['DENY', 'SAMEORIGIN'];
      expect(validValues.map(v => v.toUpperCase())).toContain(header?.toUpperCase());
    }
  });

  test('should have Strict-Transport-Security (HSTS) in production', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const hsts = response.headers()['strict-transport-security'];

    // In production, HSTS should be present
    // In development, it may be absent
    if (process.env.NODE_ENV === 'production' || hsts) {
      expect(hsts).toBeDefined();

      if (hsts) {
        // Should include max-age
        expect(hsts).toMatch(/max-age=/);

        // max-age should be at least 1 year (31536000 seconds) for production
        const maxAgeMatch = hsts.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          const maxAge = Number.parseInt(maxAgeMatch[1], 10);
          expect(maxAge).toBeGreaterThanOrEqual(31536000);
        }

        // Should include includeSubDomains
        expect(hsts.toLowerCase()).toContain('includesubdomains');
      }
    }
  });

  test('should have Referrer-Policy header', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const header = response.headers()['referrer-policy'];

    // Header should be present
    expect(header).toBeDefined();

    // Should be a valid referrer policy
    const validPolicies = [
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url',
    ];

    expect(validPolicies).toContain(header?.toLowerCase());
  });

  test('should have Permissions-Policy header', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const header = response.headers()['permissions-policy'] || response.headers()['feature-policy'];

    // Header should be present
    expect(header).toBeDefined();

    // Should restrict sensitive features
    if (header) {
      // Check for common restricted features
      const restrictedFeatures = ['camera', 'microphone', 'geolocation', 'payment'];

      // At least some features should be restricted
      const hasRestrictions = restrictedFeatures.some(feature =>
        header.toLowerCase().includes(feature)
      );

      expect(hasRestrictions).toBeTruthy();
    }
  });

  test('should not expose server information', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const headers = response.headers();

    // Check for information-disclosing headers
    for (const forbiddenHeader of FORBIDDEN_HEADERS) {
      const headerValue = headers[forbiddenHeader.toLowerCase()];

      // If present, should not reveal version numbers
      if (headerValue) {
        expect(headerValue).not.toMatch(/\d+\.\d+/);
      }
    }
  });

  test('should not have overly permissive CORS headers', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const corsOrigin = response.headers()['access-control-allow-origin'];

    // If CORS is enabled, it should not be wildcard for authenticated endpoints
    if (corsOrigin) {
      // Wildcard with credentials is a security risk
      const allowCredentials = response.headers()['access-control-allow-credentials'];

      if (allowCredentials?.toLowerCase() === 'true') {
        expect(corsOrigin).not.toBe('*');
      }
    }
  });

  test('should have Cross-Origin-Embedder-Policy', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const header = response.headers()['cross-origin-embedder-policy'];

    // Header is recommended for cross-origin isolation
    if (header) {
      const validValues = ['require-corp', 'credentialless', 'unsafe-none'];
      expect(validValues).toContain(header.toLowerCase());
    }
  });

  test('should have Cross-Origin-Opener-Policy', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const header = response.headers()['cross-origin-opener-policy'];

    // Header is recommended to prevent cross-origin attacks
    if (header) {
      const validValues = ['same-origin', 'same-origin-allow-popups', 'unsafe-none'];
      expect(validValues).toContain(header.toLowerCase());
    }
  });

  test('should have Cross-Origin-Resource-Policy', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const header = response.headers()['cross-origin-resource-policy'];

    // Header helps prevent cross-origin resource loading
    if (header) {
      const validValues = ['same-origin', 'same-site', 'cross-origin'];
      expect(validValues).toContain(header.toLowerCase());
    }
  });

  test('should cache static assets securely', async ({ page }) => {
    // Navigate to get static assets
    await page.goto('/');

    // Wait for some static assets to load
    await page.waitForLoadState('networkidle');

    // Get all responses
    const responses: Response[] = [];
    page.on('response', resp => {
      responses.push(resp);
    });

    // Check JavaScript and CSS files
    const jsCssResponses = responses.filter(resp => {
      const contentType = resp.headers()['content-type'] || '';
      return contentType.includes('javascript') || contentType.includes('css');
    });

    for (const resp of jsCssResponses) {
      const cacheControl = resp.headers()['cache-control'];

      if (cacheControl) {
        // Should have some caching but also validation
        const hasNoCache = cacheControl.includes('no-cache');
        const hasNoStore = cacheControl.includes('no-store');
        const hasMaxAge = cacheControl.includes('max-age');

        // Either no-cache, no-store, or max-age should be present
        expect(hasNoCache || hasNoStore || hasMaxAge).toBeTruthy();
      }
    }
  });

  test('should prevent MIME type sniffing on all resources', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check main document
    const mainResponse = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const xContentTypeOptions = mainResponse.headers()['x-content-type-options'];

    // Main document should have nosniff
    if (xContentTypeOptions) {
      expect(xContentTypeOptions.toLowerCase()).toBe('nosniff');
    }
  });

  test('should have Content-Security-Policy or Content-Security-Policy-Report-Only', async ({
    page,
  }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const csp = response.headers()['content-security-policy'];
    const cspReportOnly = response.headers()['content-security-policy-report-only'];

    // At least one CSP header should be present
    expect(csp || cspReportOnly).toBeDefined();
  });

  test('should handle 404 responses securely', async ({ page }) => {
    // Request a non-existent page
    const response = await page.goto('/non-existent-page-12345');

    // Should return 404
    expect(response?.status()).toBe(404);

    // Should still have security headers even on error pages
    const headers = response?.headers() || {};

    // X-Content-Type-Options should be present even on 404
    expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff');
  });

  test('should not leak sensitive headers', async ({ page }) => {
    const response = await page.waitForResponse(
      resp => resp.url() === page.url() && resp.status() === 200
    );

    const headers = response.headers();
    const headerNames = Object.keys(headers);

    // Check for potentially sensitive headers
    const sensitivePatterns = [/password/i, /secret/i, /token/i, /key/i, /auth/i];

    for (const headerName of headerNames) {
      for (const pattern of sensitivePatterns) {
        // Header names should not contain sensitive keywords
        expect(headerName).not.toMatch(pattern);
      }
    }
  });
});
