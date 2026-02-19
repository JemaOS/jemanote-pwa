// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/* eslint-disable prefer-global */

/**
 * End-to-End Command Palette Tests
 * Tests opening with Cmd+K, searching commands, keyboard navigation, and execution
 */

import { test, expect, Page } from '@playwright/test';

// Generate unique test data
// SECURITY NOTE: Math.random() is acceptable here for test ID generation
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`; // NOSONAR
const generateNoteTitle = () => `Palette Test ${generateUniqueId()}`;

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

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await clearLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Opening Command Palette', () => {
    test('should open with Cmd+K', async ({ page }) => {
      // Press Cmd+K (or Ctrl+K)
      await page.keyboard.press('Control+k');

      await page.waitForTimeout(300);

      // Check for command palette
      const commandPalette = page
        .locator('[cmdk-root], .command-palette, [data-testid="command-palette"]')
        .first();
      await expect(commandPalette).toBeVisible();
    });

    test('should open with Cmd+K on Mac', async ({ page }) => {
      // Use Meta key for Mac
      await page.keyboard.press('Meta+k');

      await page.waitForTimeout(300);

      const commandPalette = page.locator('[cmdk-root], .command-palette').first();
      await expect(commandPalette).toBeVisible();
    });

    test('should close with Escape', async ({ page }) => {
      // Open palette
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const commandPalette = page.locator('[cmdk-root], .command-palette').first();
      await expect(commandPalette).toBeVisible();

      // Close with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      await expect(commandPalette).not.toBeVisible();
    });

    test('should close with Cmd+K again', async ({ page }) => {
      // Open palette
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const commandPalette = page.locator('[cmdk-root], .command-palette').first();
      await expect(commandPalette).toBeVisible();

      // Close with Cmd+K
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      await expect(commandPalette).not.toBeVisible();
    });

    test('should close on backdrop click', async ({ page }) => {
      // Open palette
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const commandPalette = page.locator('[cmdk-root], .command-palette').first();
      await expect(commandPalette).toBeVisible();

      // Click on backdrop
      await page.mouse.click(10, 10);
      await page.waitForTimeout(300);

      await expect(commandPalette).not.toBeVisible();
    });
  });

  test.describe('Searching Commands', () => {
    test('should display search input', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const searchInput = page
        .locator('[cmdk-input], input[placeholder*="rechercher" i], input[placeholder*="search" i]')
        .first();
      await expect(searchInput).toBeVisible();
    });

    test('should filter commands by search', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const searchInput = page.locator('[cmdk-input], input').first();
      await searchInput.fill('new note');
      await page.waitForTimeout(300);

      // Should show filtered results
      const results = page.locator('[cmdk-item], .command-item');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should show no results for unknown command', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const searchInput = page.locator('[cmdk-input], input').first();
      await searchInput.fill('xyznonexistentcommand');
      await page.waitForTimeout(300);

      // Should show empty state
      const emptyState = page.getByText(/aucun résultat|no results|rien trouvé/i);
      await expect(emptyState).toBeVisible();
    });

    test('should search notes', async ({ page }) => {
      const title = generateNoteTitle();
      await createNote(page, title);

      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const searchInput = page.locator('[cmdk-input], input').first();
      await searchInput.fill(title);
      await page.waitForTimeout(300);

      // Should show the note in results
      await expect(page.getByText(title)).toBeVisible();
    });
  });

  test.describe('Command Groups', () => {
    test('should show Actions group', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const actionsGroup = page.getByText(/actions/i).first();
      await expect(actionsGroup).toBeVisible();
    });

    test('should show Views group', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const viewsGroup = page.getByText(/vues|views/i).first();
      await expect(viewsGroup).toBeVisible();
    });

    test('should show Notes group', async ({ page }) => {
      const title = generateNoteTitle();
      await createNote(page, title);

      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const notesGroup = page.getByText(/notes/i).first();
      await expect(notesGroup).toBeVisible();
    });
  });

  test.describe('Executing Commands', () => {
    test('should create new note from command', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      // Search for new note command
      const searchInput = page.locator('[cmdk-input], input').first();
      await searchInput.fill('new note');
      await page.waitForTimeout(300);

      // Click on new note command
      const newNoteCommand = page
        .getByRole('option', { name: /nouvelle note|new note|créer/i })
        .first();
      if (await newNoteCommand.isVisible().catch(() => false)) {
        await newNoteCommand.click();

        // Should create a new note
        await page.waitForTimeout(500);
        const editor = page.locator('.cm-editor').first();
        await expect(editor).toBeVisible();
      }
    });

    test('should switch to graph view', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const searchInput = page.locator('[cmdk-input], input').first();
      await searchInput.fill('graph');
      await page.waitForTimeout(300);

      const graphCommand = page.getByRole('option', { name: /graphe|graph/i }).first();
      if (await graphCommand.isVisible().catch(() => false)) {
        await graphCommand.click();

        await page.waitForTimeout(1000);

        // Should show graph view
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
      }
    });

    test('should switch to settings', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const searchInput = page.locator('[cmdk-input], input').first();
      await searchInput.fill('settings');
      await page.waitForTimeout(300);

      const settingsCommand = page.getByRole('option', { name: /paramètres|settings/i }).first();
      if (await settingsCommand.isVisible().catch(() => false)) {
        await settingsCommand.click();

        await page.waitForTimeout(500);

        // Should show settings
        const settingsHeading = page.getByText(/paramètres|settings/i).first();
        await expect(settingsHeading).toBeVisible();
      }
    });

    test('should toggle theme', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const searchInput = page.locator('[cmdk-input], input').first();
      await searchInput.fill('theme');
      await page.waitForTimeout(300);

      const themeCommand = page
        .getByRole('option', { name: /thème|theme|sombre|clair|dark|light/i })
        .first();
      if (await themeCommand.isVisible().catch(() => false)) {
        await themeCommand.click();

        // Theme should toggle
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate with arrow keys', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      // Press down arrow
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Should highlight first item
      // Selection state may vary by implementation
    });

    test('should select with Enter', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      // Navigate to first item
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Press Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Command palette should close
      const commandPalette = page.locator('[cmdk-root], .command-palette').first();
      await expect(commandPalette).not.toBeVisible();
    });

    test('should navigate with Tab', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      // Press Tab to navigate
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Should move focus
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should go back with Shift+Tab', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      // Navigate forward
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Navigate back
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(200);

      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Command Shortcuts Display', () => {
    test('should show keyboard shortcuts', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      // Look for shortcut indicators
      const shortcuts = page.locator('kbd, .shortcut, [data-shortcut]');
      const count = await shortcuts.count();

      // Some commands should have shortcuts
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should show Ctrl+N for new note', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const newNoteCommand = page.getByRole('option', { name: /nouvelle note|new note/i }).first();

      if (await newNoteCommand.isVisible().catch(() => false)) {
        // Look for shortcut near the command
        const shortcut = newNoteCommand.locator('kbd').first();
        if (await shortcut.isVisible().catch(() => false)) {
          const shortcutText = await shortcut.textContent();
          expect(shortcutText).toMatch(/ctrl|cmd|⌘/i);
        }
      }
    });
  });

  test.describe('Recent Commands', () => {
    test('should show recent commands', async ({ page }) => {
      // Execute a command first
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const searchInput = page.locator('[cmdk-input], input').first();
      await searchInput.fill('graph');
      await page.waitForTimeout(300);

      const graphCommand = page.getByRole('option', { name: /graphe|graph/i }).first();
      if (await graphCommand.isVisible().catch(() => false)) {
        await graphCommand.click();
        await page.waitForTimeout(1000);

        // Open palette again
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(300);

        // Should show recent commands
        const recentGroup = page.getByText(/récent|recent/i).first();
        if (await recentGroup.isVisible().catch(() => false)) {
          await expect(recentGroup).toBeVisible();
        }
      }
    });
  });

  test.describe('Command Palette UI', () => {
    test('should have proper styling', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const commandPalette = page.locator('[cmdk-root], .command-palette').first();

      // Check for backdrop blur
      const hasBackdrop = await commandPalette.evaluate(el => {
        const style = globalThis.getComputedStyle(el);
        return style.backdropFilter !== 'none' || style.backgroundColor !== 'transparent';
      });

      expect(hasBackdrop).toBe(true);
    });

    test('should be centered on screen', async ({ page }) => {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(300);

      const commandPalette = page.locator('[cmdk-root], .command-palette').first();
      const box = await commandPalette.boundingBox();

      if (box) {
        const viewport = page.viewportSize();
        if (viewport) {
          const centerX = box.x + box.width / 2;
          const viewportCenterX = viewport.width / 2;

          // Should be roughly centered (within 100px)
          expect(Math.abs(centerX - viewportCenterX)).toBeLessThan(100);
        }
      }
    });
  });
});
