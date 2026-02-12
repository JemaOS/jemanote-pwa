// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Tests de régression visuelle avec Playwright
 * 
 * Ces tests capturent des screenshots des pages principales et les comparent
 * avec les baselines pour détecter les changements visuels non intentionnels.
 */

import { test, expect } from '@playwright/test'

// Configuration des seuils de tolérance
const VISUAL_CONFIG = {
  threshold: 0.2, // 0.2% de différence maximale
  maxDiffPixels: 100, // Maximum 100 pixels différents
  animations: 'disabled' as const, // Désactiver les animations
}

// Masquer les éléments non déterministes (timestamps, IDs aléatoires)
const hideNonDeterministicElements = async (page: any) => {
  await page.addStyleTag({
    content: `
      [data-testid="timestamp"],
      [data-testid="date"],
      [data-testid="random-id"],
      time,
      .timestamp {
        visibility: hidden !important;
      }
    `,
  })
}

// Attendre que les animations soient terminées
const waitForAnimations = async (page: any) => {
  await page.waitForTimeout(500)
}

test.describe('Visual Regression Tests - Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Désactiver les animations CSS
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `,
    })
  })

  test('Home page - desktop', async ({ page }) => {
    await page.goto('/')
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('home-desktop.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Home page - loading state', async ({ page }) => {
    // Simuler un état de chargement
    await page.goto('/')
    await page.evaluate(() => {
      document.body.classList.add('loading')
    })
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('home-loading.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Home page - empty state', async ({ page }) => {
    await page.goto('/')
    // Simuler un état vide
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('home-empty.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Editor page - with content', async ({ page }) => {
    await page.goto('/')
    // Attendre que l'éditeur soit chargé
    await page.waitForSelector('[data-testid="editor"]', { timeout: 10000 })
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('editor-with-content.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Graph page - desktop', async ({ page }) => {
    await page.goto('/')
    // Naviguer vers la vue graphe
    await page.click('[data-testid="graph-view-button"]')
    await page.waitForSelector('[data-testid="graph-view"]', { timeout: 10000 })
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('graph-desktop.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Settings page - desktop', async ({ page }) => {
    await page.goto('/')
    // Naviguer vers les paramètres
    await page.click('[data-testid="settings-button"]')
    await page.waitForSelector('[data-testid="settings-view"]', { timeout: 10000 })
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('settings-desktop.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Search page - desktop', async ({ page }) => {
    await page.goto('/')
    // Naviguer vers la recherche
    await page.click('[data-testid="search-button"]')
    await page.waitForSelector('[data-testid="search-view"]', { timeout: 10000 })
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('search-desktop.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })
})

test.describe('Visual Regression Tests - Responsive', () => {
  test('Home page - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('home-mobile.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Home page - tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('home-tablet.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Home page - laptop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('home-laptop.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Home page - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('home-desktop-large.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Mobile menu - open', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Ouvrir le menu mobile
    await page.click('[data-testid="mobile-menu-button"]')
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('mobile-menu-open.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Sidebar - collapsed mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Fermer la sidebar
    await page.click('[data-testid="toggle-sidebar-button"]')
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('sidebar-collapsed-mobile.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })
})

test.describe('Visual Regression Tests - States', () => {
  test('Error state', async ({ page }) => {
    await page.goto('/')
    // Simuler une erreur
    await page.evaluate(() => {
      const errorElement = document.createElement('div')
      errorElement.dataset.testid = 'error-boundary'
      errorElement.innerHTML = '<div class="error">Une erreur est survenue</div>'
      document.body.appendChild(errorElement)
    })
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('error-state.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Auth modal - login', async ({ page }) => {
    await page.goto('/')
    // Ouvrir le modal d'authentification
    await page.click('[data-testid="auth-button"]')
    await page.waitForSelector('[data-testid="auth-modal"]', { timeout: 10000 })
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('auth-modal-login.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Command palette - open', async ({ page }) => {
    await page.goto('/')
    // Ouvrir la palette de commandes
    await page.keyboard.press('Control+k')
    await page.waitForSelector('[data-testid="command-palette"]', { timeout: 10000 })
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('command-palette-open.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Dark mode', async ({ page }) => {
    await page.goto('/')
    // Activer le mode sombre
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
      localStorage.setItem('jemanote-theme', 'dark')
    })
    await page.reload()
    await hideNonDeterministicElements(page)
    await waitForAnimations(page)
    
    await expect(page).toHaveScreenshot('dark-mode.png', {
      fullPage: true,
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })
})

test.describe('Visual Regression Tests - Components', () => {
  test('Navigation component', async ({ page }) => {
    await page.goto('/')
    const navigation = await page.locator('nav')
    await waitForAnimations(page)
    
    await expect(navigation).toHaveScreenshot('navigation-component.png', {
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Status bar component', async ({ page }) => {
    await page.goto('/')
    const statusBar = await page.locator('[data-testid="status-bar"]')
    await waitForAnimations(page)
    
    await expect(statusBar).toHaveScreenshot('status-bar-component.png', {
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })

  test('Sidebar component', async ({ page }) => {
    await page.goto('/')
    const sidebar = await page.locator('[data-testid="sidebar-left"]')
    await waitForAnimations(page)
    
    await expect(sidebar).toHaveScreenshot('sidebar-component.png', {
      threshold: VISUAL_CONFIG.threshold,
      maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    })
  })
})
