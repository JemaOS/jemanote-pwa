import { Page } from '@playwright/test';

export const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`; // NOSONAR
export const generateTestEmail = () => `test-${generateUniqueId()}@example.com`;
export const generateTestPassword = () => `TestPass${Date.now()}!`;

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    if (globalThis.indexedDB) {
      globalThis.indexedDB.deleteDatabase('ObsidianPWA');
    }
  });
}

export async function createNote(page: Page, title: string, content: string = '') {
  await page.getByRole('button', { name: /nouvelle note|new note/i }).click();
  await page.waitForTimeout(500);

  const titleInput = page
    .locator('input[placeholder*="titre" i], input[placeholder*="title" i]')
    .first();
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.fill(title);
  }

  const editor = page.locator('.cm-editor .cm-content, [contenteditable="true"]').first();
  if (await editor.isVisible().catch(() => false)) {
    await editor.fill(content);
  }

  await page.waitForTimeout(500);
}
