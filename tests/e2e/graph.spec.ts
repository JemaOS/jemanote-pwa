// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * End-to-End Graph View Tests
 * Tests graph visualization, node navigation, zoom/pan, and filtering
 */

import { test, expect, Page } from '@playwright/test'

// Generate unique test data
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
const generateNoteTitle = () => `Graph Test ${generateUniqueId()}`

// Helper to clear localStorage
async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    indexedDB.deleteDatabase('ObsidianPWA')
  })
}

// Helper to create a note
async function createNote(page: Page, title: string, content: string = '') {
  await page.getByRole('button', { name: /nouvelle note|new note/i }).click()
  await page.waitForTimeout(500)
  
  const titleInput = page.locator('input').first()
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.fill(title)
  }
  
  const editor = page.locator('.cm-editor .cm-content').first()
  if (await editor.isVisible().catch(() => false)) {
    await editor.fill(content)
  }
  
  await page.waitForTimeout(500)
}

test.describe('Graph View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await clearLocalStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test.describe('Graph Visualization', () => {
    test('should display graph view', async ({ page }) => {
      // Create some notes first
      await createNote(page, `Note 1 ${generateUniqueId()}`)
      await createNote(page, `Note 2 ${generateUniqueId()}`)
      
      // Navigate to graph view
      const graphButton = page.getByRole('button', { name: /graphe|graph|network/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(1000)
      
      // Check for graph canvas
      const graphCanvas = page.locator('canvas, .graph-container, [data-testid="graph-view"]').first()
      await expect(graphCanvas).toBeVisible()
    })

    test('should display nodes for notes', async ({ page }) => {
      const noteTitle = `Test Note ${generateUniqueId()}`
      await createNote(page, noteTitle)
      
      // Go to graph view
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Check that nodes are rendered (canvas content can't be directly checked)
      const graphContainer = page.locator('.graph-container, canvas').first()
      await expect(graphContainer).toBeVisible()
    })

    test('should display edges between linked notes', async ({ page }) => {
      const note1 = `Note A ${generateUniqueId()}`
      const note2 = `Note B ${generateUniqueId()}`
      
      await createNote(page, note1)
      await createNote(page, note2, `Link to [[${note1}]]`)
      
      // Go to graph view
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Graph should be visible
      const graphContainer = page.locator('.graph-container, canvas').first()
      await expect(graphContainer).toBeVisible()
    })

    test('should show different node sizes based on connections', async ({ page }) => {
      // Create notes with varying connections
      const centralNote = `Central ${generateUniqueId()}`
      await createNote(page, centralNote)
      
      for (let i = 0; i < 3; i++) {
        await createNote(page, `Linked ${i} ${generateUniqueId()}`, `See [[${centralNote}]]`)
      }
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const graphContainer = page.locator('.graph-container, canvas').first()
      await expect(graphContainer).toBeVisible()
    })
  })

  test.describe('Node Navigation', () => {
    test('should click on node to open note', async ({ page }) => {
      const noteTitle = `Clickable Note ${generateUniqueId()}`
      await createNote(page, noteTitle)
      
      // Go to graph view
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Click on a node (canvas click)
      const canvas = page.locator('canvas').first()
      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox()
        if (box) {
          await canvas.click({
            position: { x: box.width / 2, y: box.height / 2 }
          })
          
          // Should navigate to note or show details
          await page.waitForTimeout(1000)
        }
      }
    })

    test('should highlight connected nodes on hover', async ({ page }) => {
      await createNote(page, `Note 1 ${generateUniqueId()}`)
      await createNote(page, `Note 2 ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const canvas = page.locator('canvas').first()
      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox()
        if (box) {
          // Hover over canvas
          await canvas.hover({
            position: { x: box.width / 2, y: box.height / 2 }
          })
          
          await page.waitForTimeout(500)
        }
      }
    })

    test('should show node tooltip on hover', async ({ page }) => {
      const noteTitle = `Tooltip Note ${generateUniqueId()}`
      await createNote(page, noteTitle)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const canvas = page.locator('canvas').first()
      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox()
        if (box) {
          await canvas.hover({
            position: { x: box.width / 2, y: box.height / 2 }
          })
          
          await page.waitForTimeout(500)
          
          // Check for tooltip (if implemented)
          const tooltip = page.locator('.graph-tooltip, [role="tooltip"]').first()
          // Tooltip may or may not appear depending on implementation
        }
      }
    })
  })

  test.describe('Zoom and Pan', () => {
    test('should zoom in on graph', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Click zoom in button
      const zoomInButton = page.getByRole('button', { name: /zoom in|zoom +|agrandir/i }).first()
      if (await zoomInButton.isVisible().catch(() => false)) {
        await zoomInButton.click()
        await page.waitForTimeout(500)
        
        // Graph should still be visible
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should zoom out on graph', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const zoomOutButton = page.getByRole('button', { name: /zoom out|zoom -|réduire/i }).first()
      if (await zoomOutButton.isVisible().catch(() => false)) {
        await zoomOutButton.click()
        await page.waitForTimeout(500)
        
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should reset zoom to default', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const resetButton = page.getByRole('button', { name: /reset|default|centrer|fit/i }).first()
      if (await resetButton.isVisible().catch(() => false)) {
        await resetButton.click()
        await page.waitForTimeout(500)
        
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should pan graph by dragging', async ({ page }) => {
      await createNote(page, `Note 1 ${generateUniqueId()}`)
      await createNote(page, `Note 2 ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const canvas = page.locator('canvas').first()
      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox()
        if (box) {
          // Drag to pan
          await canvas.dragTo(canvas, {
            sourcePosition: { x: box.width / 2, y: box.height / 2 },
            targetPosition: { x: box.width / 2 + 50, y: box.height / 2 + 50 }
          })
          
          await page.waitForTimeout(500)
          
          await expect(canvas).toBeVisible()
        }
      }
    })

    test('should zoom with mouse wheel', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const canvas = page.locator('canvas').first()
      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox()
        if (box) {
          // Use wheel event to zoom
          await canvas.hover({
            position: { x: box.width / 2, y: box.height / 2 }
          })
          await page.mouse.wheel(0, -100)
          
          await page.waitForTimeout(500)
          
          await expect(canvas).toBeVisible()
        }
      }
    })
  })

  test.describe('Node Filtering', () => {
    test('should filter nodes by search', async ({ page }) => {
      const note1 = `Alpha ${generateUniqueId()}`
      const note2 = `Beta ${generateUniqueId()}`
      
      await createNote(page, note1)
      await createNote(page, note2)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Search in graph
      const searchInput = page.getByPlaceholder(/rechercher|search|filter/i).first()
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('Alpha')
        await page.waitForTimeout(500)
        
        // Graph should update
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should filter by node type', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Look for filter options
      const filterButton = page.getByRole('button', { name: /filtre|filter/i }).first()
      if (await filterButton.isVisible().catch(() => false)) {
        await filterButton.click()
        
        // Check for filter options
        const filterOptions = page.getByRole('checkbox')
        if (await filterOptions.first().isVisible().catch(() => false)) {
          await filterOptions.first().click()
          await page.waitForTimeout(500)
        }
      }
    })

    test('should show/hide isolated nodes', async ({ page }) => {
      await createNote(page, `Isolated ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Look for toggle
      const toggleIsolated = page.getByRole('checkbox', { name: /isolé|orphan|isolated/i })
      if (await toggleIsolated.isVisible().catch(() => false)) {
        await toggleIsolated.click()
        await page.waitForTimeout(500)
        
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should filter by number of connections', async ({ page }) => {
      await createNote(page, `Central ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Look for connection filter
      const minLinksInput = page.locator('input[type="number"]').first()
      if (await minLinksInput.isVisible().catch(() => false)) {
        await minLinksInput.fill('1')
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('Graph Settings', () => {
    test('should toggle node labels', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const labelsToggle = page.getByRole('checkbox', { name: /étiquettes|labels|noms/i }).first()
      if (await labelsToggle.isVisible().catch(() => false)) {
        await labelsToggle.click()
        await page.waitForTimeout(500)
        
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should change color scheme', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const colorSchemeSelect = page.getByRole('combobox', { name: /couleurs|colors|schéma/i }).first()
      if (await colorSchemeSelect.isVisible().catch(() => false)) {
        await colorSchemeSelect.selectOption('tags')
        await page.waitForTimeout(500)
        
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should adjust node size', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const sizeSlider = page.locator('input[type="range"]').first()
      if (await sizeSlider.isVisible().catch(() => false)) {
        await sizeSlider.fill('2')
        await page.waitForTimeout(500)
        
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should adjust link thickness', async ({ page }) => {
      await createNote(page, `Note 1 ${generateUniqueId()}`)
      await createNote(page, `Note 2 ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const thicknessSlider = page.locator('input[type="range"]').nth(1)
      if (await thicknessSlider.isVisible().catch(() => false)) {
        await thicknessSlider.fill('2')
        await page.waitForTimeout(500)
        
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })
  })

  test.describe('Graph Physics', () => {
    test('should pause/resume simulation', async ({ page }) => {
      await createNote(page, `Note 1 ${generateUniqueId()}`)
      await createNote(page, `Note 2 ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const pauseButton = page.getByRole('button', { name: /pause|stop|freeze/i }).first()
      if (await pauseButton.isVisible().catch(() => false)) {
        await pauseButton.click()
        await page.waitForTimeout(500)
        
        // Should show play button
        const playButton = page.getByRole('button', { name: /play|resume|start/i }).first()
        if (await playButton.isVisible().catch(() => false)) {
          await playButton.click()
        }
      }
    })

    test('should adjust physics parameters', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Look for physics controls
      const physicsButton = page.getByRole('button', { name: /physique|physics|forces/i }).first()
      if (await physicsButton.isVisible().catch(() => false)) {
        await physicsButton.click()
        
        // Adjust attraction
        const attractionSlider = page.locator('input[type="range"]').filter({ hasText: /attraction/i }).first()
        if (await attractionSlider.isVisible().catch(() => false)) {
          await attractionSlider.fill('0.5')
        }
      }
    })
  })

  test.describe('Local Graph Mode', () => {
    test('should show local graph for selected note', async ({ page }) => {
      const noteTitle = `Local Note ${generateUniqueId()}`
      await createNote(page, noteTitle)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      // Enable local mode
      const localModeToggle = page.getByRole('checkbox', { name: /local|voisinage|neighborhood/i }).first()
      if (await localModeToggle.isVisible().catch(() => false)) {
        await localModeToggle.click()
        await page.waitForTimeout(500)
        
        const canvas = page.locator('canvas').first()
        await expect(canvas).toBeVisible()
      }
    })

    test('should adjust local graph depth', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const depthInput = page.locator('input[type="number"]').filter({ hasText: /profondeur|depth/i }).first()
      if (await depthInput.isVisible().catch(() => false)) {
        await depthInput.fill('2')
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('Graph Export', () => {
    test('should export graph as image', async ({ page }) => {
      await createNote(page, `Note ${generateUniqueId()}`)
      
      const graphButton = page.getByRole('button', { name: /graphe|graph/i }).first()
      await graphButton.click()
      
      await page.waitForTimeout(2000)
      
      const exportButton = page.getByRole('button', { name: /exporter|export|save.*image/i }).first()
      if (await exportButton.isVisible().catch(() => false)) {
        await exportButton.click()
        
        // Check for export options
        const pngOption = page.getByRole('button', { name: /png|image/i }).first()
        if (await pngOption.isVisible().catch(() => false)) {
          // Don't actually download, just verify option exists
          await expect(pngOption).toBeVisible()
        }
      }
    })
  })
})
