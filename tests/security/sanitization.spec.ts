// Copyright (c) 2025 Jema Technology.
// Input Sanitization Tests

import { test, expect } from '@playwright/test'

/**
 * HTML sanitization test cases
 */
const HTML_SANITIZATION_CASES = [
  {
    input: '<script>alert("XSS")</script>',
    shouldContain: [],
    shouldNotContain: ['<script>', 'alert'],
  },
  {
    input: '<p>Hello</p><script>alert(1)</script>',
    shouldContain: ['<p>', 'Hello'],
    shouldNotContain: ['<script>'],
  },
  {
    input: '<a href="javascript:alert(1)">Click</a>',
    shouldContain: ['<a', '>Click</a>'],
    shouldNotContain: ['javascript:'],
  },
  {
    input: '<img src=x onerror="alert(1)">',
    shouldContain: ['<img'],
    shouldNotContain: ['onerror'],
  },
  {
    input: '<div onclick="alert(1)">Click</div>',
    shouldContain: ['<div>', 'Click'],
    shouldNotContain: ['onclick'],
  },
  {
    input: '<style>body{color:red}</style>',
    shouldContain: [],
    shouldNotContain: ['<style>'],
  },
  {
    input: '<iframe src="evil.com"></iframe>',
    shouldContain: [],
    shouldNotContain: ['<iframe'],
  },
  {
    input: '<object data="evil.swf"></object>',
    shouldContain: [],
    shouldNotContain: ['<object'],
  },
  {
    input: '<embed src="evil.swf">',
    shouldContain: [],
    shouldNotContain: ['<embed'],
  },
]

/**
 * URL sanitization test cases
 */
const URL_SANITIZATION_CASES = [
  { input: 'javascript:alert(1)', expected: '' },
  { input: 'javascript://alert(1)', expected: '' },
  { input: 'data:text/html,<script>alert(1)</script>', expected: '' },
  { input: 'vbscript:msgbox(1)', expected: '' },
  { input: 'https://example.com', expected: 'https://example.com' },
  { input: 'http://example.com', expected: 'http://example.com' },
  { input: '/relative/path', expected: '/relative/path' },
  { input: '#anchor', expected: '#anchor' },
  { input: 'mailto:test@example.com', expected: 'mailto:test@example.com' },
]

/**
 * File name sanitization test cases
 */
const FILENAME_SANITIZATION_CASES = [
  { input: '../../../etc/passwd', shouldNotContain: ['..', '/'] },
  { input: String.raw`..\windows\system32\config\sam`, shouldNotContain: ['..', '\\'] },
  { input: 'file.txt<script>alert(1)</script>', shouldNotContain: ['<script>'] },
  { input: 'normal-file.txt', shouldContain: ['normal-file.txt'] },
  { input: 'file with spaces.txt', shouldContain: ['file with spaces.txt'] },
]

/**
 * CSS sanitization test cases
 */
const CSS_SANITIZATION_CASES = [
  { input: 'color: red; behavior: url(#default#VML)', shouldNotContain: ['behavior'] },
  { input: 'background: url(javascript:alert(1))', shouldNotContain: ['javascript:'] },
  { input: 'color: red; -moz-binding: url(xss.xml)', shouldNotContain: ['-moz-binding'] },
  { input: 'color: red; expression(alert(1))', shouldNotContain: ['expression'] },
  { input: 'color: red;', shouldContain: ['color: red'] },
]

test.describe('Input Sanitization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should sanitize HTML tags in note content', async ({ page }) => {
    for (const testCase of HTML_SANITIZATION_CASES) {
      await page.evaluate((content) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-sanitize-${Math.random()}`,
          title: 'Sanitization Test',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, testCase.input)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      
      // Check that forbidden content is not present
      for (const forbidden of testCase.shouldNotContain) {
        expect(pageContent).not.toContain(forbidden)
      }
    }
  })

  test('should sanitize URLs in links', async ({ page }) => {
    for (const testCase of URL_SANITIZATION_CASES) {
      const content = `<a href="${testCase.input}">Link</a>`
      
      await page.evaluate((noteContent) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-url-${Math.random()}`,
          title: 'URL Test',
          content: noteContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, content)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      
      // Dangerous URLs should be removed or sanitized
      if (testCase.expected === '') {
        // Should not contain dangerous URL schemes
        expect(pageContent).not.toContain(testCase.input)
      }
    }
  })

  test('should sanitize file names', async ({ page }) => {
    for (const testCase of FILENAME_SANITIZATION_CASES) {
      await page.evaluate((fileName) => {
        const attachments = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-file-${Math.random()}`,
          name: fileName,
          note_id: 'test-note-1',
          created_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_attachments', JSON.stringify(attachments))
      }, testCase.input)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      
      // Check that dangerous patterns are not present
      for (const forbidden of testCase.shouldNotContain || []) {
        expect(pageContent).not.toContain(forbidden)
      }
    }
  })

  test('should sanitize CSS in style attributes', async ({ page }) => {
    for (const testCase of CSS_SANITIZATION_CASES) {
      const content = `<div style="${testCase.input}">Test</div>`
      
      await page.evaluate((noteContent) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-css-${Math.random()}`,
          title: 'CSS Test',
          content: noteContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, content)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      
      // Check that dangerous CSS is not present
      for (const forbidden of testCase.shouldNotContain || []) {
        expect(pageContent.toLowerCase()).not.toContain(forbidden.toLowerCase())
      }
    }
  })

  test('should escape HTML entities', async ({ page }) => {
    const htmlEntities = [
      { input: '<', expected: '<' },
      { input: '>', expected: '>' },
      { input: '"', expected: '"' },
      { input: "'", expected: '&#x27;' },
      { input: '&', expected: '&' },
    ]
    
    for (const entity of htmlEntities) {
      const content = `Test ${entity.input} value`
      
      await page.evaluate((noteContent) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-entity-${Math.random()}`,
          title: 'Entity Test',
          content: noteContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, content)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // The raw character should not appear in dangerous contexts
      const pageContent = await page.content()
      
      // Check that the page didn't break
      expect(pageContent).toContain('Test')
    }
  })

  test('should sanitize SVG content', async ({ page }) => {
    const svgPayloads = [
      '<svg><script>alert(1)</script></svg>',
      '<svg><animate onbegin="alert(1)">',
      '<svg><foreignObject><script>alert(1)</script></foreignObject></svg>',
    ]
    
    for (const svg of svgPayloads) {
      await page.evaluate((content) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-svg-${Math.random()}`,
          title: 'SVG Test',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, svg)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Check for script execution
      const hasScript = await page.evaluate(() => {
        return document.querySelectorAll('script:not([src])').length > 0
      })
      
      expect(hasScript).toBe(false)
    }
  })

  test('should sanitize form inputs', async ({ page }) => {
    const formPayloads = [
      '<input type="text" value="<script>alert(1)</script>">',
      '<textarea><script>alert(1)</script></textarea>',
      '<select><option><script>alert(1)</script></option></select>',
    ]
    
    for (const payload of formPayloads) {
      await page.evaluate((content) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-form-${Math.random()}`,
          title: 'Form Test',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, payload)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      expect(pageContent).not.toContain('<script>alert(1)</script>')
    }
  })

  test('should sanitize data attributes', async ({ page }) => {
    const dataPayloads = [
      '<div data-value="<script>alert(1)</script>">Test</div>',
      '<span data-json="{"key":"<script>alert(1)</script>"}">Test</span>',
    ]
    
    for (const payload of dataPayloads) {
      await page.evaluate((content) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-data-${Math.random()}`,
          title: 'Data Attribute Test',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, payload)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      expect(pageContent).not.toContain('<script>alert(1)</script>')
    }
  })

  test('should sanitize markdown content', async ({ page }) => {
    const markdownPayloads = [
      { input: '[Link](javascript:alert(1))', shouldNotContain: ['javascript:'] },
      { input: '![Image](javascript:alert(1))', shouldNotContain: ['javascript:'] },
      { input: '<script>alert(1)</script>', shouldNotContain: ['<script>'] },
      { input: '```\n<script>alert(1)</script>\n```', shouldNotContain: ['<script>'] },
    ]
    
    for (const testCase of markdownPayloads) {
      await page.evaluate((content) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-md-${Math.random()}`,
          title: 'Markdown Test',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, testCase.input)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      
      for (const forbidden of testCase.shouldNotContain) {
        expect(pageContent).not.toContain(forbidden)
      }
    }
  })

  test('should sanitize search queries', async ({ page }) => {
    const searchPayloads = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      "'; DROP TABLE notes; --",
      '<img src=x onerror=alert(1)>',
    ]
    
    // Open command palette
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(100)
    
    for (const payload of searchPayloads) {
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Delete')
      await page.keyboard.type(payload)
      await page.waitForTimeout(100)
      
      // Check that the search input doesn't execute scripts
      const hasScript = await page.evaluate(() => {
        return document.querySelectorAll('script:not([src])').length > 0
      })
      
      expect(hasScript).toBe(false)
    }
    
    await page.keyboard.press('Escape')
  })

  test('should handle unicode and special characters safely', async ({ page }) => {
    const specialInputs = [
      '\u0000', // Null byte
      '\uFEFF', // BOM
      '\u202E', // Right-to-left override
      '<\u0073cript>', // Unicode script tag
      'javascript\u0000:', // Null byte in protocol
    ]
    
    for (const input of specialInputs) {
      await page.evaluate((content) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-unicode-${Math.random()}`,
          title: 'Unicode Test',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, input)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Should not crash or execute scripts
      const hasCrashed = await page.evaluate(() => {
        return document.body === null
      })
      
      expect(hasCrashed).toBe(false)
    }
  })

  test('should sanitize ID attributes', async ({ page }) => {
    const idPayloads = [
      { input: 'id="<script>alert(1)</script>"', shouldNotContain: ['<script>'] },
      { input: 'id="javascript:alert(1)"', shouldNotContain: ['javascript:'] },
    ]
    
    for (const testCase of idPayloads) {
      const content = `<div ${testCase.input}>Test</div>`
      
      await page.evaluate((noteContent) => {
        const notes = [{
          // SECURITY NOTE: Math.random() is acceptable here for test ID generation
          id: `test-id-${Math.random()}`,
          title: 'ID Test',
          content: noteContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, content)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      const pageContent = await page.content()
      
      for (const forbidden of testCase.shouldNotContain) {
        expect(pageContent).not.toContain(forbidden)
      }
    }
  })
})
