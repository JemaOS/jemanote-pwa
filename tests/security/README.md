# Security Tests Documentation

## Overview

This directory contains comprehensive security tests for the Jemanote application. These tests are designed to identify and prevent common security vulnerabilities in a React/TypeScript/Vite PWA application.

## Test Categories

### 1. Content Security Policy (CSP) Tests
**File:** [`csp.spec.ts`](csp.spec.ts)

Tests that verify the application has proper CSP headers configured to prevent XSS and other code injection attacks.

**Key Tests:**
- CSP header/meta tag presence
- Secure `default-src` directive
- `object-src: 'none'` to prevent plugin attacks
- `frame-ancestors` for clickjacking protection
- No `unsafe-eval` in script-src
- No wildcards in script-src
- Secure `base-uri` and `form-action`
- API domain restrictions in `connect-src`
- PWA manifest and worker restrictions

### 2. HTTP Security Headers Tests
**File:** [`headers.spec.ts`](headers.spec.ts)

Tests for essential HTTP security headers that protect against various attacks.

**Key Tests:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options` or CSP frame-ancestors
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`
- `Permissions-Policy`
- No server information disclosure
- Secure CORS configuration
- Cross-Origin policies (COEP, COOP, CORP)
- Secure cache headers for static assets
- Error page security headers

### 3. XSS Prevention Tests
**File:** [`xss.spec.ts`](xss.spec.ts)

Comprehensive tests for Cross-Site Scripting vulnerabilities.

**Key Tests:**
- Script tag sanitization
- Event handler sanitization (onerror, onload, etc.)
- JavaScript protocol URL blocking
- DOM-based XSS via URL parameters
- SVG-based XSS
- Template injection prevention
- Markdown content sanitization
- File name sanitization
- Search input escaping
- Unicode and special character handling

**Test Payloads:**
- `<script>alert("XSS")</script>`
- `<img src=x onerror="alert('XSS')">`
- `javascript:alert('XSS')`
- Template literals: `${alert("XSS")}`
- SVG onload events
- Encoded payloads

### 4. Injection Attack Tests
**File:** [`injection.spec.ts`](injection.spec.ts)

Tests for SQL, NoSQL, Command, LDAP, and XPath injection vulnerabilities.

**Key Tests:**
- SQL injection in search queries
- SQL injection in note titles
- NoSQL injection (MongoDB operators)
- Command injection in file names
- LDAP injection in search
- XPath injection in content
- Special character escaping
- URL parameter injection
- UUID format validation
- Prototype pollution prevention
- JSON injection

**Test Payloads:**
- `' OR '1'='1`
- `'; DROP TABLE users; --`
- `{"$gt": ""}`
- `; cat /etc/passwd`
- `{{constructor.constructor("alert('XSS')")()}}`

### 5. Input Sanitization Tests
**File:** [`sanitization.spec.ts`](sanitization.spec.ts)

Tests for proper input sanitization across the application.

**Key Tests:**
- HTML tag sanitization
- URL sanitization (blocking dangerous protocols)
- File name sanitization (path traversal prevention)
- CSS sanitization (expression, behavior blocking)
- HTML entity escaping
- SVG content sanitization
- Form input sanitization
- Data attribute sanitization
- Markdown content sanitization
- Search query sanitization
- ID attribute sanitization

### 6. Authentication Security Tests
**File:** [`auth.spec.ts`](auth.spec.ts)

Tests for authentication and session management security.

**Key Tests:**
- No password storage in localStorage
- No plain text token storage
- Secure logout (data clearing)
- Minimum password length enforcement
- Password complexity requirements
- Authentication bypass prevention
- Session timeout handling
- Session ID regeneration
- Session fixation prevention
- CSRF protection
- Email format validation
- Rate limiting
- Secure password reset flow
- Brute force protection
- Secure token storage
- Redirect URL validation
- MFA/TOTP security
- Concurrent session handling
- Secure error messages

### 7. Storage Security Tests
**File:** [`storage.spec.ts`](storage.spec.ts)

Tests for localStorage, sessionStorage, and IndexedDB security.

**Key Tests:**
- No plain text sensitive data storage
- Data validation before loading
- Quota exceeded handling
- Prototype pollution prevention
- Secure storage keys
- Data clearing on logout
- XSS protection for stored data
- IndexedDB data integrity
- Appropriate storage type usage
- Storage event security
- Data encryption (conceptual)
- Origin-bound storage
- Storage migration security
- Quota management
- Data sanitization before storage
- Concurrent access handling

## Running the Tests

### Run All Security Tests
```bash
npx playwright test tests/security/ --project=chromium
```

### Run Specific Test File
```bash
npx playwright test tests/security/xss.spec.ts --project=chromium
```

### Run with UI Mode
```bash
npx playwright test tests/security/ --ui
```

### Run with Debug Mode
```bash
npx playwright test tests/security/ --debug
```

## Security Scripts

### Security Audit
```bash
# Run dependency security audit
node scripts/security-audit.js

# Fail on high severity vulnerabilities
node scripts/security-audit.js --fail-on-high

# Save report to file
node scripts/security-audit.js --save
```

### CSP Check
```bash
# Check CSP configuration
node scripts/csp-check.js

# Generate recommended CSP
node scripts/csp-check.js --generate
```

## Vulnerability Coverage

### OWASP Top 10 (2021)
1. **Broken Access Control** - Covered in auth.spec.ts
2. **Cryptographic Failures** - Covered in storage.spec.ts
3. **Injection** - Covered in injection.spec.ts, xss.spec.ts
4. **Insecure Design** - Covered across all tests
5. **Security Misconfiguration** - Covered in csp.spec.ts, headers.spec.ts
6. **Vulnerable Components** - Covered by security-audit.js
7. **Authentication Failures** - Covered in auth.spec.ts
8. **Software and Data Integrity** - Covered in storage.spec.ts
9. **Security Logging Failures** - Documented in recommendations
10. **Server-Side Request Forgery** - Covered in sanitization.spec.ts

### Additional Vulnerabilities Tested
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- SQL/NoSQL Injection
- Command Injection
- LDAP Injection
- XPath Injection
- Prototype Pollution
- Local Storage Security
- Insecure Direct Object References
- Security Misconfiguration
- Sensitive Data Exposure
- Clickjacking
- MIME Sniffing
- Open Redirects

## Security Checklist (Pre-Deployment)

### Code Security
- [ ] All security tests pass
- [ ] No high/critical npm audit vulnerabilities
- [ ] No secrets in code (use secret-scan)
- [ ] Input validation implemented
- [ ] Output encoding implemented
- [ ] Authentication checks in place
- [ ] Authorization checks in place

### Configuration Security
- [ ] CSP headers configured
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Build optimizations enabled

### Infrastructure Security
- [ ] Server security headers configured
- [ ] SSL/TLS properly configured
- [ ] Rate limiting enabled
- [ ] DDoS protection enabled
- [ ] Web Application Firewall (WAF) configured

### Monitoring & Response
- [ ] Security logging enabled
- [ ] Error tracking configured
- [ ] Uptime monitoring enabled
- [ ] Incident response plan documented
- [ ] Security contact established

## Incident Response Guide

### Detecting Security Incidents

1. **Monitor Security Alerts**
   - GitHub Security Advisories
   - npm audit notifications
   - Snyk alerts
   - Playwright security test failures

2. **Signs of Compromise**
   - Unexpected data in localStorage
   - Unauthorized API calls
   - CSP violation reports
   - Unusual error patterns

### Responding to Incidents

1. **Immediate Actions**
   ```bash
   # Run security audit
   node scripts/security-audit.js --fail-on-critical
   
   # Run all security tests
   npx playwright test tests/security/
   ```

2. **Assessment**
   - Identify affected components
   - Determine scope of compromise
   - Document findings

3. **Containment**
   - Disable compromised features
   - Revoke affected tokens
   - Clear compromised storage

4. **Remediation**
   - Apply security patches
   - Update dependencies
   - Fix vulnerable code
   - Enhance security controls

5. **Recovery**
   - Re-run security tests
   - Verify fixes
   - Monitor for recurrence

6. **Post-Incident**
   - Document lessons learned
   - Update security procedures
   - Conduct security review

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. Email security@jemanote.app with details
3. Include steps to reproduce
4. Allow time for remediation before disclosure

## Additional Resources

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Security Headers](https://securityheaders.com/)
- [npm Security Best Practices](https://docs.npmjs.com/security)

## Maintenance

### Regular Security Tasks

**Daily:**
- Review security alerts
- Monitor error logs

**Weekly:**
- Run security tests
- Check for new vulnerabilities

**Monthly:**
- Full security audit
- Dependency updates
- Security test review

**Quarterly:**
- Penetration testing
- Security architecture review
- Incident response drill

## Contributing

When adding new security tests:

1. Follow the existing test structure
2. Document the vulnerability being tested
3. Include both positive and negative test cases
4. Update this README with new tests
5. Ensure tests are deterministic
6. Add appropriate timeouts for async operations
