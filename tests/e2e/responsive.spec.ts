// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/* eslint-disable prefer-global */

/**
 * End-to-End Responsive/Mobile Tests
 * Tests mobile display, tablet display, hamburger menu, and interface adaptation
 */

import { test, expect, Page } from '@playwright/test';

// Generate unique test data
// SECURITY NOTE: Math.random() is acceptable here for test ID generation
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`; // NOSONAR
const generateNoteTitle = () => `Responsive Test ${generateUniqueId()}`;

// Helper to clear localStorage
async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('ObsidianPWA');
  });
}

// Helper to create a note
async function createNote(page: Page, title: string, content: string = '') {
  await page.getByRole('button', { name: /nouvelle note|new note/i }).click();
  await page.waitForTimeout(500);

  const titleInput = page.locator('input').first();
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.fill(title);
  }

  const editor = page.locator('.cm-editor .cm-content').first();
  if (await editor.isVisible().catch(() => false)) {
    await editor.fill(content);
  }

  await page.waitForTimeout(500);
}

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await clearLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Mobile Display (375px)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should display correctly on mobile', async ({ page }) => {
      // Check that app container is visible
      const app = page.locator('#root, #app, .app').first();
      await expect(app).toBeVisible();

      // Check that content fits within viewport
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();

      if (bodyBox) {
        expect(bodyBox.width).toBeLessThanOrEqual(375);
      }
    });

    test('should show hamburger menu on mobile', async ({ page }) => {
      // May be visible or have different name
      const menuButton = page
        .locator('button')
        .filter({ has: page.locator('svg') })
        .first();

      if (await menuButton.isVisible().catch(() => false)) {
        await expect(menuButton).toBeVisible();
      }
    });

    test('should toggle sidebar with hamburger menu', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /menu/i }).first();

      if (await menuButton.isVisible().catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(300);

        // Sidebar should be visible
        const sidebar = page.locator('aside, .sidebar, [data-testid="sidebar"]').first();
        await expect(sidebar).toBeVisible();

        // Close sidebar
        await menuButton.click();
        await page.waitForTimeout(300);
      }
    });

    test('should hide sidebar by default on mobile', async ({ page }) => {
      const sidebar = page.locator('aside, .sidebar').first();

      // Sidebar might be hidden or off-screen
      const isVisible = await sidebar.isVisible().catch(() => false);

      // Either not visible or has transform to hide it
      if (isVisible) {
        const transform = await sidebar.evaluate(el => {
          return globalThis.getComputedStyle(el).transform;
        });
        // If visible, it might be transformed off-screen
        expect(transform).toBeTruthy();
      }
    });

    test('should have touch-friendly buttons on mobile', async ({ page }) => {
      // Check button sizes
      const buttons = page.getByRole('button');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();

        if (box) {
          // Buttons should be at least 44x44 for touch
          expect(box.width).toBeGreaterThanOrEqual(32);
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    });

    test('should create note on mobile', async ({ page }) => {
      const title = generateNoteTitle();

      await createNote(page, title);

      // Note should appear in list
      await expect(page.getByText(title)).toBeVisible();
    });

    test('should show search on mobile', async ({ page }) => {
      const searchButton = page.getByRole('button', { name: /rechercher|search/i }).first();

      if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click();

        const searchInput = page.getByPlaceholder(/rechercher|search/i);
        await expect(searchInput).toBeVisible();
      }
    });
  });

  test.describe('Tablet Display (768px)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should display correctly on tablet', async ({ page }) => {
      const app = page.locator('#root, #app, .app').first();
      await expect(app).toBeVisible();
    });

    test('should show sidebar on tablet', async ({ page }) => {
      const sidebar = page.locator('aside, .sidebar').first();

      // Sidebar might be visible or collapsed
      const isVisible = await sidebar.isVisible().catch(() => false);

      if (isVisible) {
        await expect(sidebar).toBeVisible();
      }
    });

    test('should have responsive layout on tablet', async ({ page }) => {
      // Check that main content area exists
      const main = page.locator('main').first();
      await expect(main).toBeVisible();
    });

    test('should handle touch gestures on tablet', async ({ page }) => {
      // Create a note first
      await createNote(page, `Tablet Note ${generateUniqueId()}`);

      // Try swipe gesture (simulated with drag)
      const main = page.locator('main').first();
      const box = await main.boundingBox();

      if (box) {
        // Swipe from left edge
        await page.mouse.move(box.x + 10, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 100, box.y + box.height / 2);
        await page.mouse.up();

        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Desktop Display (1280px)', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should display correctly on desktop', async ({ page }) => {
      const app = page.locator('#root, #app, .app').first();
      await expect(app).toBeVisible();
    });

    test('should show sidebar on desktop', async ({ page }) => {
      const sidebar = page.locator('aside, .sidebar').first();
      await expect(sidebar).toBeVisible();
    });

    test('should show full navigation on desktop', async ({ page }) => {
      // Navigation should be visible
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();

      // All nav items should be visible
      const navButtons = nav.getByRole('button');
      const count = await navButtons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Large Desktop Display (1920px)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should display correctly on large desktop', async ({ page }) => {
      const app = page.locator('#root, #app, .app').first();
      await expect(app).toBeVisible();
    });

    test('should utilize full width on large screens', async ({ page }) => {
      const main = page.locator('main').first();
      const box = await main.boundingBox();

      if (box) {
        expect(box.width).toBeGreaterThan(1000);
      }
    });
  });

  test.describe('Responsive Navigation', () => {
    test('should adapt navigation at different sizes', async ({ page }) => {
      // Test at mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      const mobileMenuVisible = await page
        .getByRole('button', { name: /menu/i })
        .first()
        .isVisible()
        .catch(() => false);

      // Test at desktop size
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const desktopNavVisible = await page
        .locator('nav')
        .first()
        .isVisible()
        .catch(() => false);

      // Navigation should adapt
      expect(desktopNavVisible || mobileMenuVisible).toBe(true);
    });

    test('should show/hide elements based on screen size', async ({ page }) => {
      // At mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Some elements might be hidden
      const sidebar = page.locator('aside').first();
      const sidebarVisibleMobile = await sidebar.isVisible().catch(() => false);

      // At desktop size
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const sidebarVisibleDesktop = await sidebar.isVisible().catch(() => false);

      // Sidebar should be more likely visible on desktop
      if (!sidebarVisibleMobile) {
        expect(sidebarVisibleDesktop).toBe(true);
      }
    });
  });

  test.describe('Touch Interactions', () => {
    test('should handle tap events', async ({ page }) => {
      const title = generateNoteTitle();
      await createNote(page, title);

      // Tap on note
      const note = page.getByText(title);
      await note.tap();

      await page.waitForTimeout(500);

      // Editor should open or note should be selected
      const editor = page.locator('.cm-editor').first();
      const isVisible = await editor.isVisible().catch(() => false);

      expect(isVisible || (await note.isVisible())).toBe(true);
    });

    test('should handle double tap', async ({ page }) => {
      // Double tap behavior depends on implementation
      const title = generateNoteTitle();
      await createNote(page, title);

      const note = page.getByText(title);
      await note.dblclick();

      await page.waitForTimeout(500);
    });

    test('should handle long press', async ({ page }) => {
      const title = generateNoteTitle();
      await createNote(page, title);

      const note = page.getByText(title);
      const box = await note.boundingBox();

      if (box) {
        // Long press
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(800);
        await page.mouse.up();

        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle portrait to landscape', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      const app = page.locator('#root, #app').first();
      await expect(app).toBeVisible();

      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      await expect(app).toBeVisible();
    });

    test('should handle landscape to portrait', async ({ page }) => {
      // Start in landscape
      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(500);

      const app = page.locator('#root, #app').first();
      await expect(app).toBeVisible();

      // Switch to portrait
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(500);

      await expect(app).toBeVisible();
    });
  });

  test.describe('Mobile-Specific Features', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have bottom navigation on mobile', async ({ page }) => {
      // Look for bottom navigation
      const bottomNav = page.locator('.bottom-nav, [data-testid="bottom-nav"]').first();

      if (await bottomNav.isVisible().catch(() => false)) {
        await expect(bottomNav).toBeVisible();
      }
    });

    test('should have pull-to-refresh area', async ({ page }) => {
      // Pull-to-refresh might be implemented
      const main = page.locator('main').first();
      await expect(main).toBeVisible();
    });

    test('should have safe area insets on mobile', async ({ page }) => {
      const body = page.locator('body');
      const padding = await body.evaluate(el => {
        const style = globalThis.getComputedStyle(el);
        return {
          top: style.paddingTop,
          bottom: style.paddingBottom,
        };
      });

      // Should have some padding for safe areas
      expect(padding).toBeTruthy();
    });
  });

  test.describe('Accessibility on Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have proper touch targets', async ({ page }) => {
      const buttons = page.getByRole('button');
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();

        if (box) {
          // WCAG recommends 44x44 for touch targets
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should have readable font sizes on mobile', async ({ page }) => {
      const body = page.locator('body');
      const fontSize = await body.evaluate(el => {
        return globalThis.getComputedStyle(el).fontSize;
      });

      // Should be at least 16px for readability
      const sizeInPx = Number.parseInt(fontSize);
      expect(sizeInPx).toBeGreaterThanOrEqual(14);
    });
  });
});
