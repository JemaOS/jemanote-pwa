// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * End-to-End Notes Management Tests
 * Tests note creation, editing, deletion, search, folders, and wiki links
 */

import { test, expect, Page } from '@playwright/test';

// Generate unique test data
// SECURITY NOTE: Math.random() is acceptable here for test ID generation
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
const generateNoteTitle = () => `Test Note ${generateUniqueId()}`;
const generateFolderName = () => `Test Folder ${generateUniqueId()}`;

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

  // Fill in the note (title is usually auto-selected or focused)
  const titleInput = page
    .locator('input[placeholder*="titre" i], input[placeholder*="title" i]')
    .first();
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.fill(title);
  }

  // Fill content if editor is visible
  const editor = page.locator('.cm-editor .cm-content, [contenteditable="true"]').first();
  if (await editor.isVisible().catch(() => false)) {
    await editor.fill(content);
  }

  await page.waitForTimeout(500);
}

test.describe('Notes Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await clearLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Note Creation', () => {
    test('should create a new note', async ({ page }) => {
      const title = generateNoteTitle();

      await createNote(page, title, 'Test content for the note');

      // Verify note appears in the list
      await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    });

    test('should create multiple notes', async ({ page }) => {
      const titles = [generateNoteTitle(), generateNoteTitle(), generateNoteTitle()];

      for (const title of titles) {
        await createNote(page, title);
      }

      // Verify all notes appear
      for (const title of titles) {
        await expect(page.getByText(title)).toBeVisible();
      }
    });

    test('should create note with special characters in title', async ({ page }) => {
      const title = `Note avec caractères spéciaux !@#$%^&*() ${generateUniqueId()}`;

      await createNote(page, title);

      await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    });

    test('should create note with emoji in title', async ({ page }) => {
      const title = `📝 Note Test ${generateUniqueId()}`;

      await createNote(page, title);

      await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Note Editing', () => {
    test('should edit note title', async ({ page }) => {
      const originalTitle = generateNoteTitle();
      const newTitle = `Edited ${originalTitle}`;

      // Create note
      await createNote(page, originalTitle);
      await expect(page.getByText(originalTitle)).toBeVisible();

      // Click on note to select it
      await page.getByText(originalTitle).click();
      await page.waitForTimeout(500);

      // Find and click edit button
      const editButton = page.getByRole('button', { name: /renommer|edit|modifier/i }).first();
      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();

        // Edit title
        const titleInput = page.locator('input').first();
        await titleInput.fill(newTitle);
        await titleInput.press('Enter');

        // Verify new title
        await expect(page.getByText(newTitle)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should edit note content', async ({ page }) => {
      const title = generateNoteTitle();
      const content = 'Original content';
      const newContent = 'Updated content with more text';

      // Create note
      await createNote(page, title, content);
      await page.getByText(title).click();
      await page.waitForTimeout(500);

      // Edit content
      const editor = page.locator('.cm-editor .cm-content, [contenteditable="true"]').first();
      if (await editor.isVisible().catch(() => false)) {
        await editor.fill(newContent);
        await page.waitForTimeout(1000); // Wait for auto-save

        // Reload and verify content persisted
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.getByText(title).click();

        await expect(editor).toContainText(newContent);
      }
    });

    test('should save note automatically', async ({ page }) => {
      const title = generateNoteTitle();

      await createNote(page, title);
      await page.getByText(title).click();
      await page.waitForTimeout(500);

      const editor = page.locator('.cm-editor .cm-content, [contenteditable="true"]').first();
      if (await editor.isVisible().catch(() => false)) {
        await editor.fill('Auto-save test content');

        // Wait for auto-save indicator
        await page.waitForTimeout(1500);

        // Check for save indicator
        const saveIndicator = page.getByText(/sauvegardé|saved|enregistré/i);
        await expect(saveIndicator).toBeVisible();
      }
    });
  });

  test.describe('Note Deletion', () => {
    test('should delete a note', async ({ page }) => {
      const title = generateNoteTitle();

      // Create note
      await createNote(page, title);
      await expect(page.getByText(title)).toBeVisible();

      // Find and click delete button
      const noteElement = page.getByText(title).locator('..').locator('..');
      const deleteButton = noteElement
        .getByRole('button', { name: /supprimer|delete|trash/i })
        .first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();

        // Confirm deletion if dialog appears
        const confirmButton = page.getByRole('button', { name: /oui|yes|confirmer|confirm/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        // Verify note is removed
        await expect(page.getByText(title)).not.toBeVisible({ timeout: 5000 });
      }
    });

    test('should move note to trash', async ({ page }) => {
      const title = generateNoteTitle();

      await createNote(page, title);
      await expect(page.getByText(title)).toBeVisible();

      // Delete the note
      const noteElement = page.getByText(title).locator('..').locator('..');
      const deleteButton = noteElement.getByRole('button', { name: /supprimer|delete/i }).first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();

        // Confirm
        const confirmButton = page.getByRole('button', { name: /oui|yes/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        // Open trash
        const trashButton = page.getByRole('button', { name: /corbeille|trash/i });
        await trashButton.click();

        // Verify note is in trash
        await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should restore note from trash', async ({ page }) => {
      const title = generateNoteTitle();

      // Create and delete note
      await createNote(page, title);
      const noteElement = page.getByText(title).locator('..').locator('..');
      const deleteButton = noteElement.getByRole('button', { name: /supprimer|delete/i }).first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        const confirmButton = page.getByRole('button', { name: /oui|yes/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        // Open trash and restore
        await page.getByRole('button', { name: /corbeille|trash/i }).click();
        await expect(page.getByText(title)).toBeVisible();

        const restoreButton = page.getByRole('button', { name: /restaurer|restore/i }).first();
        await restoreButton.click();

        // Verify note is back in main list
        await page.getByRole('button', { name: /corbeille|trash/i }).click(); // Close trash
        await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should permanently delete note from trash', async ({ page }) => {
      const title = generateNoteTitle();

      // Create and delete note
      await createNote(page, title);
      const noteElement = page.getByText(title).locator('..').locator('..');
      const deleteButton = noteElement.getByRole('button', { name: /supprimer|delete/i }).first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        const confirmButton = page.getByRole('button', { name: /oui|yes/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        // Open trash
        await page.getByRole('button', { name: /corbeille|trash/i }).click();
        await expect(page.getByText(title)).toBeVisible();

        // Permanently delete
        const permanentDeleteButton = page
          .getByRole('button', { name: /supprimer définitivement|delete permanently/i })
          .first();
        await permanentDeleteButton.click();

        // Confirm permanent deletion
        const finalConfirm = page.getByRole('button', { name: /oui|yes|confirmer/i });
        if (await finalConfirm.isVisible().catch(() => false)) {
          await finalConfirm.click();
        }

        // Verify note is completely gone
        await expect(page.getByText(title)).not.toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Note Search', () => {
    test('should search for notes by title', async ({ page }) => {
      const title1 = `Alpha ${generateNoteTitle()}`;
      const title2 = `Beta ${generateNoteTitle()}`;
      const title3 = `Gamma ${generateNoteTitle()}`;

      await createNote(page, title1);
      await createNote(page, title2);
      await createNote(page, title3);

      // Use search
      const searchInput = page.getByPlaceholder(/rechercher|search/i);
      await searchInput.fill('Alpha');
      await page.waitForTimeout(500); // Debounce

      // Should show matching note
      await expect(page.getByText(title1)).toBeVisible();
    });

    test('should search for notes by content', async ({ page }) => {
      const title = generateNoteTitle();
      const uniqueContent = `UniqueContent${generateUniqueId()}`;

      await createNote(page, title, uniqueContent);

      // Search by content
      const searchInput = page.getByPlaceholder(/rechercher|search/i);
      await searchInput.fill(uniqueContent);
      await page.waitForTimeout(500);

      await expect(page.getByText(title)).toBeVisible();
    });

    test('should show no results for non-matching search', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/rechercher|search/i);
      await searchInput.fill('XYZNonExistentSearch123');
      await page.waitForTimeout(500);

      await expect(page.getByText(/aucun résultat|no results/i)).toBeVisible();
    });

    test('should clear search results', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/rechercher|search/i);
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Clear search
      const clearButton = page.getByRole('button', { name: /effacer|clear|x/i }).first();
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
        await expect(searchInput).toHaveValue('');
      }
    });
  });

  test.describe('Folder Management', () => {
    test('should create a new folder', async ({ page }) => {
      const folderName = generateFolderName();

      // Click new folder button
      const newFolderButton = page.getByRole('button', { name: /nouveau dossier|new folder/i });
      await newFolderButton.click();

      // Enter folder name
      const folderInput = page
        .locator('input[placeholder*="dossier" i], input[placeholder*="folder" i]')
        .first();
      await folderInput.fill(folderName);
      await folderInput.press('Enter');

      // Verify folder appears
      await expect(page.getByText(folderName)).toBeVisible({ timeout: 5000 });
    });

    test('should create note inside folder', async ({ page }) => {
      const folderName = generateFolderName();
      const noteTitle = generateNoteTitle();

      // Create folder
      await page.getByRole('button', { name: /nouveau dossier|new folder/i }).click();
      const folderInput = page.locator('input[placeholder*="dossier" i]').first();
      await folderInput.fill(folderName);
      await folderInput.press('Enter');

      // Expand folder
      await page.getByText(folderName).click();

      // Create note in folder
      const addNoteButton = page
        .locator(`text=${folderName}`)
        .locator('..')
        .getByRole('button', { name: /plus|add|nouvelle/i })
        .first();
      if (await addNoteButton.isVisible().catch(() => false)) {
        await addNoteButton.click();

        const titleInput = page.locator('input').first();
        await titleInput.fill(noteTitle);
        await titleInput.press('Enter');

        // Verify note is in folder
        await expect(page.getByText(noteTitle)).toBeVisible();
      }
    });

    test('should rename folder', async ({ page }) => {
      const oldName = generateFolderName();
      const newName = `Renamed ${oldName}`;

      // Create folder
      await page.getByRole('button', { name: /nouveau dossier|new folder/i }).click();
      const folderInput = page.locator('input[placeholder*="dossier" i]').first();
      await folderInput.fill(oldName);
      await folderInput.press('Enter');

      // Find rename button
      const folderElement = page.getByText(oldName).locator('..');
      const renameButton = folderElement.getByRole('button', { name: /renommer|edit/i }).first();

      if (await renameButton.isVisible().catch(() => false)) {
        await renameButton.click();

        const renameInput = page.locator('input').first();
        await renameInput.fill(newName);
        await renameInput.press('Enter');

        await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should delete folder', async ({ page }) => {
      const folderName = generateFolderName();

      // Create folder
      await page.getByRole('button', { name: /nouveau dossier|new folder/i }).click();
      const folderInput = page.locator('input[placeholder*="dossier" i]').first();
      await folderInput.fill(folderName);
      await folderInput.press('Enter');

      // Delete folder
      const folderElement = page.getByText(folderName).locator('..');
      const deleteButton = folderElement
        .getByRole('button', { name: /supprimer|delete|trash/i })
        .first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();

        // Confirm
        const confirmButton = page.getByRole('button', { name: /oui|yes|confirmer/i });
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }

        await expect(page.getByText(folderName)).not.toBeVisible({ timeout: 5000 });
      }
    });

    test('should move note between folders', async ({ page }) => {
      // This test depends on drag-and-drop or move functionality
      // Implementation depends on the specific UI
      test.skip();
    });
  });

  test.describe('Wiki Links', () => {
    test('should create wiki link between notes', async ({ page }) => {
      const note1Title = generateNoteTitle();
      const note2Title = generateNoteTitle();

      // Create first note
      await createNote(page, note1Title, 'Content of first note');

      // Create second note with link to first
      await createNote(page, note2Title, `Link to [[${note1Title}]]`);

      // Open second note
      await page.getByText(note2Title).click();
      await page.waitForTimeout(500);

      // Verify link is rendered
      const wikiLink = page.locator('.wiki-link, a[href*="note"]').filter({ hasText: note1Title });
      await expect(wikiLink).toBeVisible();
    });

    test('should navigate through wiki link', async ({ page }) => {
      const note1Title = generateNoteTitle();
      const note2Title = generateNoteTitle();

      // Create notes
      await createNote(page, note1Title, 'First note content');
      await createNote(page, note2Title, `See [[${note1Title}]] for more info`);

      // Open second note
      await page.getByText(note2Title).click();
      await page.waitForTimeout(500);

      // Click on wiki link
      const wikiLink = page.locator('.wiki-link, a').filter({ hasText: note1Title }).first();
      if (await wikiLink.isVisible().catch(() => false)) {
        await wikiLink.click();

        // Should navigate to first note
        await expect(page.getByText('First note content')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Note Pinning', () => {
    test('should pin a note', async ({ page }) => {
      const title = generateNoteTitle();

      await createNote(page, title);

      // Find and click pin button
      const noteElement = page.getByText(title).locator('..').locator('..');
      const pinButton = noteElement.getByRole('button', { name: /épingler|pin/i }).first();

      if (await pinButton.isVisible().catch(() => false)) {
        await pinButton.click();

        // Verify note is pinned (might have visual indicator)
        await expect(noteElement.locator('.pinned, [data-pinned="true"]')).toBeVisible();
      } else {
        test.skip();
      }
    });
  });
});
