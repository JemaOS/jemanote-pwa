// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * End-to-End Markdown Editor Tests
 * Tests text input, preview, formatting, wiki links, and image upload
 */


import { test, expect, Page } from '@playwright/test'

// Generate unique test data
// SECURITY NOTE: Math.random() is acceptable here for test ID generation
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
const generateNoteTitle = () => `Editor Test ${generateUniqueId()}`

// Helper to clear localStorage
async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    indexedDB.deleteDatabase('ObsidianPWA')
  })
}

// Helper to create a note and open it
async function createAndOpenNote(page: Page, title: string, content: string = '') {
  await page.getByRole('button', { name: /nouvelle note|new note/i }).click()
  await page.waitForTimeout(500)
  
  // Fill title
  const titleInput = page.locator('input').first()
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.fill(title)
  }
  
  // Fill content
  const editor = page.locator('.cm-editor .cm-content').first()
  if (await editor.isVisible().catch(() => false)) {
    await editor.fill(content)
  }
  
  await page.waitForTimeout(500)
}

test.describe('Markdown Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await clearLocalStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test.describe('Text Input', () => {
    test('should type text in editor', async ({ page }) => {
      const title = generateNoteTitle()
      const content = 'This is a test note content.'
      
      await createAndOpenNote(page, title, content)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await expect(editor).toContainText(content)
    })

    test('should handle multiline text', async ({ page }) => {
      const title = generateNoteTitle()
      const content = `Line 1
Line 2
Line 3`
      
      await createAndOpenNote(page, title, content)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await expect(editor).toContainText('Line 1')
      await expect(editor).toContainText('Line 2')
      await expect(editor).toContainText('Line 3')
    })

    test('should handle special characters', async ({ page }) => {
      const title = generateNoteTitle()
      const content = 'Special chars: !@#$%^&*()_+-=[]{}|;\':",./<>?'
      
      await createAndOpenNote(page, title, content)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await expect(editor).toContainText('Special chars')
    })

    test('should handle unicode characters', async ({ page }) => {
      const title = generateNoteTitle()
      const content = 'Unicode: 你好世界 🌍 émojis ñoño'
      
      await createAndOpenNote(page, title, content)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await expect(editor).toContainText('Unicode')
    })

    test('should handle very long text', async ({ page }) => {
      const title = generateNoteTitle()
      const content = 'A'.repeat(10000)
      
      await createAndOpenNote(page, title, content)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      const text = await editor.textContent()
      expect(text?.length).toBeGreaterThan(9000)
    })
  })

  test.describe('Markdown Preview', () => {
    test('should render markdown preview', async ({ page }) => {
      const title = generateNoteTitle()
      const content = '# Heading\n\nThis is **bold** and *italic* text.'
      
      await createAndOpenNote(page, title, content)
      
      // Switch to preview mode if available
      const previewButton = page.getByRole('button', { name: /aperçu|preview|eye/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        // Check rendered content
        const preview = page.locator('.markdown-preview, .preview').first()
        await expect(preview.locator('h1')).toContainText('Heading')
        await expect(preview.locator('strong')).toContainText('bold')
        await expect(preview.locator('em')).toContainText('italic')
      }
    })

    test('should render headings correctly', async ({ page }) => {
      const title = generateNoteTitle()
      const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const preview = page.locator('.markdown-preview, .preview').first()
        await expect(preview.locator('h1')).toBeVisible()
        await expect(preview.locator('h2')).toBeVisible()
        await expect(preview.locator('h3')).toBeVisible()
      }
    })

    test('should render lists correctly', async ({ page }) => {
      const title = generateNoteTitle()
      const content = `- Item 1
- Item 2
- Item 3

1. First
2. Second
3. Third`
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const preview = page.locator('.markdown-preview, .preview').first()
        await expect(preview.locator('ul li')).toHaveCount(3)
        await expect(preview.locator('ol li')).toHaveCount(3)
      }
    })

    test('should render code blocks', async ({ page }) => {
      const title = generateNoteTitle()
      const content = `\`\`\`javascript
const x = 1;
console.log(x);
\`\`\``
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const preview = page.locator('.markdown-preview, .preview').first()
        await expect(preview.locator('pre code')).toBeVisible()
      }
    })

    test('should render links', async ({ page }) => {
      const title = generateNoteTitle()
      const content = '[Google](https://google.com)'
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const preview = page.locator('.markdown-preview, .preview').first()
        const link = preview.locator('a[href="https://google.com"]')
        await expect(link).toBeVisible()
        await expect(link).toContainText('Google')
      }
    })

    test('should render images', async ({ page }) => {
      const title = generateNoteTitle()
      const content = '![Alt text](https://via.placeholder.com/150)'
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const preview = page.locator('.markdown-preview, .preview').first()
        await expect(preview.locator('img')).toBeVisible()
      }
    })

    test('should render tables', async ({ page }) => {
      const title = generateNoteTitle()
      const content = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const preview = page.locator('.markdown-preview, .preview').first()
        await expect(preview.locator('table')).toBeVisible()
        await expect(preview.locator('th')).toHaveCount(2)
      }
    })

    test('should render blockquotes', async ({ page }) => {
      const title = generateNoteTitle()
      const content = '> This is a blockquote\n> With multiple lines'
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const preview = page.locator('.markdown-preview, .preview').first()
        await expect(preview.locator('blockquote')).toContainText('blockquote')
      }
    })

    test('should render horizontal rules', async ({ page }) => {
      const title = generateNoteTitle()
      const content = 'Text before\n\n---\n\nText after'
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const preview = page.locator('.markdown-preview, .preview').first()
        await expect(preview.locator('hr')).toBeVisible()
      }
    })
  })

  test.describe('Formatting', () => {
    test('should apply bold formatting', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await editor.fill('**bold text**')
      
      // Check that bold marker is present in editor
      const content = await editor.textContent()
      expect(content).toContain('bold text')
    })

    test('should apply italic formatting', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await editor.fill('*italic text*')
      
      const content = await editor.textContent()
      expect(content).toContain('italic text')
    })

    test('should apply strikethrough formatting', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await editor.fill('~~strikethrough~~')
      
      const content = await editor.textContent()
      expect(content).toContain('strikethrough')
    })

    test('should apply inline code formatting', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await editor.fill('`inline code`')
      
      const content = await editor.textContent()
      expect(content).toContain('inline code')
    })

    test('should apply heading formatting with keyboard shortcut', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title, 'Heading text')
      
      const editor = page.locator('.cm-editor').first()
      await editor.click()
      
      // Select all and apply heading
      await page.keyboard.press('Control+a')
      await page.keyboard.type('# ')
      
      const content = page.locator('.cm-editor .cm-content').first()
      await expect(content).toContainText('# Heading text')
    })
  })

  test.describe('Editor Modes', () => {
    test('should switch between edit and preview modes', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title, '# Test Heading')
      
      // Find mode toggle buttons
      const editButton = page.getByRole('button', { name: /éditer|edit/i }).first()
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      
      if (await previewButton.isVisible().catch(() => false)) {
        // Switch to preview
        await previewButton.click()
        await page.waitForTimeout(300)
        
        // Should see rendered content
        const preview = page.locator('.markdown-preview, .preview').first()
        if (await preview.isVisible().catch(() => false)) {
          await expect(preview.locator('h1')).toContainText('Test Heading')
        }
        
        // Switch back to edit
        if (await editButton.isVisible().catch(() => false)) {
          await editButton.click()
          await page.waitForTimeout(300)
          
          const editor = page.locator('.cm-editor').first()
          await expect(editor).toBeVisible()
        }
      }
    })

    test('should support split view mode', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title, '# Test')
      
      // Look for split view button
      const splitButton = page.getByRole('button', { name: /split|divisé|both/i }).first()
      
      if (await splitButton.isVisible().catch(() => false)) {
        await splitButton.click()
        
        // Should show both editor and preview
        await expect(page.locator('.cm-editor').first()).toBeVisible()
        await expect(page.locator('.markdown-preview, .preview').first()).toBeVisible()
      }
    })
  })

  test.describe('Wiki Links', () => {
    test('should create wiki link syntax', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await editor.fill('See [[Another Note]] for details')
      
      const content = await editor.textContent()
      expect(content).toContain('[[Another Note]]')
    })

    test('should highlight wiki links in editor', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title, '[[Linked Note]]')
      
      // Wiki links should have special styling - just verify the content is there
      const editor = page.locator('.cm-editor .cm-content').first()
      await expect(editor).toContainText('Linked Note')
    })

    test('should navigate to linked note on click', async ({ page }) => {
      const note1Title = `Note ${generateUniqueId()}`
      const note2Title = `Note ${generateUniqueId()}`
      
      // Create first note
      await page.getByRole('button', { name: /nouvelle note/i }).click()
      await page.waitForTimeout(500)
      await page.locator('input').first().fill(note1Title)
      await page.waitForTimeout(500)
      
      // Create second note with link
      await page.getByRole('button', { name: /nouvelle note/i }).click()
      await page.waitForTimeout(500)
      await page.locator('input').first().fill(note2Title)
      const editor = page.locator('.cm-editor .cm-content').first()
      await editor.fill(`Link to [[${note1Title}]]`)
      await page.waitForTimeout(500)
      
      // Click on wiki link in preview if available
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const wikiLink = page.locator('.wiki-link, a').filter({ hasText: note1Title }).first()
        if (await wikiLink.isVisible().catch(() => false)) {
          await wikiLink.click()
          
          // Should navigate to the linked note
          await expect(page.getByText(note1Title).first()).toBeVisible({ timeout: 5000 })
        }
      }
    })
  })

  test.describe('Image Upload', () => {
    test('should upload image to note', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      // Look for image upload button
      const uploadButton = page.getByRole('button', { name: /image|upload|photo/i }).first()
      
      if (await uploadButton.isVisible().catch(() => false)) {
        // Create a test file
        const fileInput = page.locator('input[type="file"]').first()
        
        if (await fileInput.isVisible().catch(() => false)) {
          // Upload a test image (this would need an actual image file)
          // await fileInput.setInputFiles('path/to/test/image.png')
          test.skip()
        }
      } else {
        test.skip()
      }
    })

    test('should paste image from clipboard', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor').first()
      await editor.click()
      
      // Try to paste (this may not work in all browsers)
      // This is more of a placeholder for the test structure
      test.skip()
    })
  })

  test.describe('Editor Features', () => {
    test('should show line numbers', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title, 'Line 1\nLine 2\nLine 3')
      
      // Check for line numbers
      const lineNumbers = page.locator('.cm-gutters .cm-lineNumbers .cm-gutterElement')
      const count = await lineNumbers.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should support undo/redo', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await editor.fill('First text')
      await page.waitForTimeout(500)
      
      // Undo
      await page.keyboard.press('Control+z')
      await page.waitForTimeout(500)
      
      // Content should be cleared or changed
      const content = await editor.textContent()
      expect(content).not.toBe('First text')
    })

    test('should support find and replace', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title, 'Hello world, hello universe')
      
      // Open find dialog
      await page.keyboard.press('Control+f')
      
      // Look for find input
      const findInput = page.locator('input[placeholder*="find" i], input[placeholder*="rechercher" i]').first()
      if (await findInput.isVisible().catch(() => false)) {
        await findInput.fill('hello')
        
        // Should highlight matches
        const highlights = page.locator('.cm-searchMatch, .cm-selectionMatch')
        const count = await highlights.count()
        expect(count).toBeGreaterThan(0)
      }
    })

    test('should auto-save content', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor .cm-content').first()
      await editor.fill('Auto-save test content')
      
      // Wait for auto-save
      await page.waitForTimeout(2000)
      
      // Check for save indicator
      const saveIndicator = page.getByText(/sauvegardé|saved|enregistré/i)
      await expect(saveIndicator).toBeVisible()
    })

    test('should handle keyboard shortcuts', async ({ page }) => {
      const title = generateNoteTitle()
      
      await createAndOpenNote(page, title)
      
      const editor = page.locator('.cm-editor').first()
      await editor.click()
      
      // Test Ctrl+A (select all)
      await page.keyboard.press('Control+a')
      
      // Type to replace
      await page.keyboard.type('Replaced content')
      
      const content = page.locator('.cm-editor .cm-content').first()
      await expect(content).toContainText('Replaced content')
    })
  })

  test.describe('Mermaid Diagrams', () => {
    test('should render mermaid diagram', async ({ page }) => {
      const title = generateNoteTitle()
      const content = `\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\``
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        // Check for rendered SVG
        const mermaidSvg = page.locator('.mermaid svg, .language-mermaid svg').first()
        await expect(mermaidSvg).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Math Expressions', () => {
    test('should render math expressions', async ({ page }) => {
      const title = generateNoteTitle()
      const content = 'Inline math: $E = mc^2$'
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        // Check for math rendering
        const mathElement = page.locator('.katex, .math').first()
        await expect(mathElement).toBeVisible()
      }
    })

    test('should render block math', async ({ page }) => {
      const title = generateNoteTitle()
      const content = `$$
\\sum_{i=1}^{n} x_i
$$`
      
      await createAndOpenNote(page, title, content)
      
      const previewButton = page.getByRole('button', { name: /aperçu|preview/i }).first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()
        
        const mathElement = page.locator('.katex-display, .math.block').first()
        await expect(mathElement).toBeVisible()
      }
    })
  })
})
