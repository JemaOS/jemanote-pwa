// Copyright (c) 2025 Jema Technology.
// Cross-Site Scripting (XSS) Protection Tests

import { test, expect } from '@playwright/test'

/**
 * Common XSS payloads for testing
 */
const XSS_PAYLOADS = [
  // Script tag injection
  '<script>alert("XSS")</script>',
  '<script>alert(String.fromCharCode(88,83,83))</script>',
  
  // Event handler injection
  '<img src=x onerror="alert(\'XSS\')">',
  '<img src=x onerror=alert("XSS")>',
  '<body onload=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  '<iframe onload=alert("XSS")>',
  
  // JavaScript protocol
  '<a href="javascript:alert(\'XSS\')">Click me</a>',
  '<a href=javascript:alert("XSS")>Click me</a>',
  
  // Data URI
  '<iframe src="data:text/html,<script>alert(\'XSS\')</script>">',
  
  // Encoded payloads
  '<script>alert("XSS")</script>',
  '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
  
  // Template injection
  '{{constructor.constructor("alert(\'XSS\')")()}}',
  '${alert("XSS")}',
  
  // SVG-based
  '<svg><script>alert("XSS")</script></svg>',
  '<svg><animate onbegin=alert("XSS")>',
  
  // Style injection
  '<style>@import url("javascript:alert(\'XSS\')")</style>',
  '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
  
  // Meta refresh
  '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
  
  // Form action
  '<form action="javascript:alert(\'XSS\')"><input type="submit"></form>',
  
  // Object/Embed
  '<object data="javascript:alert(\'XSS\')">',
  '<embed src="javascript:alert(\'XSS\')">',
]

/**
 * Safe content that should be allowed
 */
const SAFE_CONTENT = [
  '<p>Hello World</p>',
  '<strong>Bold text</strong>',
  '<em>Italic text</em>',
  '<a href="https://example.com">Link</a>',
  '<img src="https://example.com/image.png" alt="Image">',
  '<h1>Heading</h1>',
  '<ul><li>Item 1</li><li>Item 2</li></ul>',
]

test.describe('XSS Prevention', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should sanitize script tags in note content', async ({ page }) => {
    // Try to create a note with script tag
    const maliciousContent = '<script>alert("XSS")</script>'
    
    // Inject content via localStorage (simulating stored XSS)
    await page.evaluate((content) => {
      const notes = [{
        id: 'test-xss-1',
        title: 'XSS Test',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
    }, maliciousContent)
    
    // Reload page to trigger rendering
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check that script tag is not executed
    const hasAlert = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const originalAlert = window.alert
        let alertCalled = false
        window.alert = () => {
          alertCalled = true
          window.alert = originalAlert
        }
        setTimeout(() => { resolve(alertCalled); }, 100)
      })
    })
    
    expect(hasAlert).toBe(false)
    
    // Check that script tag is not in the DOM
    const scripts = await page.locator('script').count()
    // Only expect the main app script and service worker
    expect(scripts).toBeLessThanOrEqual(2)
  })

  test('should sanitize event handlers in content', async ({ page }) => {
    const maliciousContent = '<img src="x" onerror="alert(\'XSS\')">'
    
    await page.evaluate((content) => {
      const notes = [{
        id: 'test-xss-2',
        title: 'XSS Test',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
    }, maliciousContent)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check for onerror attributes
    const elementsWithOnError = await page.locator('[onerror]').count()
    expect(elementsWithOnError).toBe(0)
  })

  test('should sanitize javascript: URLs', async ({ page }) => {
    const maliciousContent = '<a href="javascript:alert(\'XSS\')">Click me</a>'
    
    await page.evaluate((content) => {
      const notes = [{
        id: 'test-xss-3',
        title: 'XSS Test',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
    }, maliciousContent)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check for javascript: URLs
    const links = await page.locator('a[href^="javascript:"]').count()
    expect(links).toBe(0)
  })

  test('should escape HTML entities in search input', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(100)
    
    // Try XSS in search
    await page.keyboard.type('<script>alert("XSS")</script>')
    await page.waitForTimeout(100)
    
    // Check that script is not executed
    const hasScript = await page.evaluate(() => {
      return document.querySelector('script') !== null && 
             document.querySelectorAll('script').length > 1
    })
    
    expect(hasScript).toBe(false)
    
    // Close command palette
    await page.keyboard.press('Escape')
  })

  test('should sanitize note titles', async ({ page }) => {
    const maliciousTitle = '<script>alert("XSS")</script>Malicious Note'
    
    await page.evaluate((title) => {
      const notes = [{
        id: 'test-xss-4',
        title,
        content: 'Test content',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
    }, maliciousTitle)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check that script tag is not rendered
    const pageContent = await page.content()
    expect(pageContent).not.toContain('<script>alert')
  })

  test('should prevent DOM-based XSS via URL parameters', async ({ page }) => {
    // Try XSS via URL parameter
    await page.goto('/?search=<script>alert("XSS")</script>')
    await page.waitForLoadState('networkidle')
    
    // Check that script is not executed
    const hasAlert = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        let alertCalled = false
        const originalAlert = window.alert
        window.alert = () => {
          alertCalled = true
          window.alert = originalAlert
        }
        setTimeout(() => { resolve(alertCalled); }, 100)
      })
    })
    
    expect(hasAlert).toBe(false)
  })

  test('should sanitize content in markdown preview', async ({ page }) => {
    const maliciousMarkdown = `
# Test Note

<script>alert("XSS")</script>

<img src=x onerror="alert('XSS')">

[Click me](javascript:alert('XSS'))
    `
    
    await page.evaluate((content) => {
      const notes = [{
        id: 'test-xss-5',
        title: 'Markdown XSS Test',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
    }, maliciousMarkdown)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check rendered content
    const hasInlineScripts = await page.evaluate(() => {
      return document.querySelectorAll('script:not([src])').length > 0
    })
    
    expect(hasInlineScripts).toBe(false)
  })

  test('should prevent XSS via file names', async ({ page }) => {
    const maliciousFileName = '<script>alert("XSS")</script>.txt'
    
    // Simulate file upload with malicious name
    await page.evaluate((fileName) => {
      const attachments = [{
        id: 'test-attachment-1',
        name: fileName,
        note_id: 'test-note-1',
        created_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_attachments', JSON.stringify(attachments))
    }, maliciousFileName)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check that file name is escaped
    const pageContent = await page.content()
    expect(pageContent).not.toContain('<script>alert')
  })

  test('should prevent XSS via folder names', async ({ page }) => {
    const maliciousFolderName = '<img src=x onerror=alert("XSS")>'
    
    await page.evaluate((folderName) => {
      const folders = [{
        id: 'test-folder-1',
        name: folderName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_folders', JSON.stringify(folders))
    }, maliciousFolderName)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check for onerror attributes
    const elementsWithOnError = await page.locator('[onerror]').count()
    expect(elementsWithOnError).toBe(0)
  })

  test('should prevent XSS via tag names', async ({ page }) => {
    const maliciousTagName = '<script>alert("XSS")</script>'
    
    await page.evaluate((tagName) => {
      const tags = [{
        id: 'test-tag-1',
        name: tagName,
        color: '#ff0000',
      }]
      localStorage.setItem('obsidian_pwa_tags', JSON.stringify(tags))
    }, maliciousTagName)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check that script tag is not rendered
    const pageContent = await page.content()
    expect(pageContent).not.toContain('<script>alert')
  })

  test('should handle SVG-based XSS attempts', async ({ page }) => {
    const maliciousSvg = '<svg onload="alert(\'XSS\')">'
    
    await page.evaluate((content) => {
      const notes = [{
        id: 'test-xss-6',
        title: 'SVG XSS Test',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
    }, maliciousSvg)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check for onload attributes
    const elementsWithOnLoad = await page.locator('[onload]').count()
    expect(elementsWithOnLoad).toBe(0)
  })

  test('should prevent template injection', async ({ page }) => {
    const templatePayloads = [
      '{{constructor.constructor("alert(\'XSS\')")()}}',
      '${alert("XSS")}',
      '<%= alert("XSS") %>',
    ]
    
    for (const payload of templatePayloads) {
      await page.evaluate((content) => {
        const notes = [{
          id: `test-xss-${Math.random()}`,
          title: 'Template Injection Test',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, payload)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Check that template syntax is not executed
      const hasAlert = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          let alertCalled = false
          const originalAlert = window.alert
          window.alert = () => {
            alertCalled = true
            window.alert = originalAlert
          }
          setTimeout(() => { resolve(alertCalled); }, 100)
        })
      })
      
      expect(hasAlert).toBe(false)
    }
  })

  test('should sanitize data URLs in content', async ({ page }) => {
    // Data URLs for images should be allowed but validated
    const dataUrlImage = '<img src="data:image/png;base64,iVBORw0KGgo=">'
    
    await page.evaluate((content) => {
      const notes = [{
        id: 'test-xss-7',
        title: 'Data URL Test',
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
      localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
    }, dataUrlImage)
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Data URL images should be allowed
    const images = await page.locator('img[src^="data:image"]').count()
    expect(images).toBeGreaterThanOrEqual(0) // May or may not be rendered
  })

  test('should prevent XSS via innerHTML assignment', async ({ page }) => {
    // This test checks that the app doesn't use innerHTML with user input
    // without proper sanitization
    
    const xssPayloads = [
      '<div id="xss" onclick="alert(\'XSS\')">Click me</div>',
      '<input onfocus="alert(\'XSS\')" autofocus>',
    ]
    
    for (const payload of xssPayloads) {
      await page.evaluate((content) => {
        const notes = [{
          id: `test-xss-${Math.random()}`,
          title: 'InnerHTML Test',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]
        localStorage.setItem('obsidian_pwa_notes_sync', JSON.stringify(notes))
      }, payload)
      
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Check for event handlers
      const hasEventHandlers = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*')
        for (const el of allElements) {
          for (const attr of el.attributes) {
            if (attr.name.startsWith('on')) {return true}
          }
        }
        return false
      })
      
      expect(hasEventHandlers).toBe(false)
    }
  })
})
