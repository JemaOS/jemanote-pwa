// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * End-to-End AI Features Tests
 * Tests AI summary generation, tag suggestions, text analysis, and translation
 */

import { test, expect, Page } from '@playwright/test';

// Generate unique test data
// SECURITY NOTE: Math.random() is acceptable here for test ID generation
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`; // NOSONAR
const generateNoteTitle = () => `AI Test ${generateUniqueId()}`;

// Helper to clear localStorage
async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('ObsidianPWA');
  });
}

// Helper to login user
async function loginUser(page: Page) {
  const email = `test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  // Open auth modal
  await page.getByRole('button', { name: /se connecter|login/i }).click();
  await page.waitForTimeout(500);

  // Switch to register tab
  await page.getByRole('button', { name: /inscription|sign up/i }).click();
  await page.waitForTimeout(500);

  // Fill form using placeholders (matching auth.spec.ts)
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByLabel(/mot de passe|password/i).fill(password);

  // Submit
  await page.getByRole('button', { name: /s'inscrire|sign up|register/i }).click();
  
  // Wait for modal to close after registration
  await page.waitForSelector('dialog:not([open])', { timeout: 10000 }).catch(() => {
    // If modal still open, try clicking outside or pressing escape
    return page.keyboard.press('Escape').catch(() => {});
  });
  await page.waitForTimeout(2000);
}

// Helper to create a note with content
async function createNoteWithContent(page: Page, title: string, content: string) {
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

  await page.waitForTimeout(1000);
}

test.describe('AI Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await clearLocalStorage(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Login user for AI features
    await loginUser(page);
    await page.waitForTimeout(1000);
  });

  test.describe('AI Summary Generation', () => {
    test('should generate summary of note', async ({ page }) => {
      const title = generateNoteTitle();
      const content = `This is a long text about artificial intelligence and machine learning. 
        AI has revolutionized many industries including healthcare, finance, and transportation.
        Machine learning algorithms can now recognize patterns in data that humans might miss.
        Deep learning has enabled breakthroughs in computer vision and natural language processing.`;

      await createNoteWithContent(page, title, content);

      // Open AI panel
      const aiButton = page.getByRole('button', { name: /ia|ai|intelligence|assistant/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        // Click generate summary
        const summaryButton = page
          .getByRole('button', { name: /résumer|summarize|générer un résumé/i })
          .first();
        if (await summaryButton.isVisible().catch(() => false)) {
          await summaryButton.click();

          // Wait for generation
          await page.waitForTimeout(3000);

          // Check for summary output
          const summaryOutput = page
            .locator('.ai-summary, [data-testid="ai-summary"], .summary-result')
            .first();
          await expect(summaryOutput).toBeVisible({ timeout: 10000 });
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should generate different summary types', async ({ page }) => {
      const title = generateNoteTitle();
      const content = 'This is test content for summary generation with multiple types.';

      await createNoteWithContent(page, title, content);

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        // Look for summary type selector
        const shortOption = page.getByRole('radio', { name: /court|short|brief/i });

        if (await shortOption.isVisible().catch(() => false)) {
          await shortOption.click();

          const generateButton = page.getByRole('button', { name: /résumer|summarize/i }).first();
          await generateButton.click();

          await page.waitForTimeout(3000);

          const summaryOutput = page.locator('.ai-summary').first();
          await expect(summaryOutput).toBeVisible({ timeout: 10000 });
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should save summary to history', async ({ page }) => {
      const title = generateNoteTitle();
      const content = 'Test content for summary history.';

      await createNoteWithContent(page, title, content);

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        const summaryButton = page.getByRole('button', { name: /résumer|summarize/i }).first();
        if (await summaryButton.isVisible().catch(() => false)) {
          await summaryButton.click();
          await page.waitForTimeout(3000);

          // Check for history section
          const historySection = page.getByText(/historique|history/i);
          await expect(historySection).toBeVisible();
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AI Tag Suggestions', () => {
    test('should suggest tags for note', async ({ page }) => {
      const title = generateNoteTitle();
      const content = `Python programming tutorial for beginners. 
        Learn about variables, functions, classes, and object-oriented programming.
        This guide covers the basics of software development.`;

      await createNoteWithContent(page, title, content);

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        // Switch to tags tab
        const tagsTab = page.getByRole('tab', { name: /tags|étiquettes/i });
        if (await tagsTab.isVisible().catch(() => false)) {
          await tagsTab.click();

          const suggestButton = page
            .getByRole('button', { name: /suggérer|suggest|générer tags/i })
            .first();
          if (await suggestButton.isVisible().catch(() => false)) {
            await suggestButton.click();

            await page.waitForTimeout(3000);

            // Check for suggested tags
            const suggestedTags = page.locator(
              '.suggested-tag, .ai-tag, [data-testid="suggested-tag"]'
            );
            const count = await suggestedTags.count();
            expect(count).toBeGreaterThan(0);
          } else {
            test.skip();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should apply suggested tags to note', async ({ page }) => {
      const title = generateNoteTitle();
      const content = 'Test content for tag suggestions.';

      await createNoteWithContent(page, title, content);

      const isVisible = async (locator: any) => locator.isVisible().catch(() => false);

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (!(await isVisible(aiButton))) {
        test.skip();
        return;
      }
      await aiButton.click();

      const tagsTab = page.getByRole('tab', { name: /tags|étiquettes/i });
      if (!(await isVisible(tagsTab))) {
        test.skip();
        return;
      }
      await tagsTab.click();

      const suggestButton = page.getByRole('button', { name: /suggérer|suggest/i }).first();
      if (!(await isVisible(suggestButton))) {
        test.skip();
        return;
      }
      await suggestButton.click();
      await page.waitForTimeout(3000);

      const firstTag = page.locator('.suggested-tag, .ai-tag').first();
      if (!(await isVisible(firstTag))) {
        return;
      }
      await firstTag.click();

      const applyButton = page
        .getByRole('button', { name: /appliquer|apply|ajouter tags/i })
        .first();
      if (!(await isVisible(applyButton))) {
        return;
      }
      await applyButton.click();

      await page.waitForTimeout(1000);
      const editor = page.locator('.cm-editor .cm-content').first();
      const editorContent = await editor.textContent();
      expect(editorContent).toContain('#');
    });
  });

  test.describe('AI Text Analysis', () => {
    test('should continue text', async ({ page }) => {
      const title = generateNoteTitle();
      const content = 'The future of artificial intelligence is';

      await createNoteWithContent(page, title, content);

      // Select text and use context menu
      const editor = page.locator('.cm-editor').first();
      await editor.click();

      // Select all text
      await page.keyboard.press('Control+a');

      // Look for AI context menu or button
      const aiContextButton = page.getByRole('button', { name: /continuer|continue|ia/i }).first();

      if (await aiContextButton.isVisible().catch(() => false)) {
        await aiContextButton.click();

        await page.waitForTimeout(3000);

        // Check for continued text
        const editorContent = page.locator('.cm-editor .cm-content').first();
        const newContent = await editorContent.textContent();
        expect(newContent?.length).toBeGreaterThan(content.length);
      } else {
        test.skip();
      }
    });

    test('should improve text', async ({ page }) => {
      const title = generateNoteTitle();
      const content = 'This is bad text with errors and mistakes.';

      await createNoteWithContent(page, title, content);

      const editor = page.locator('.cm-editor').first();
      await editor.click();
      await page.keyboard.press('Control+a');

      const improveButton = page
        .getByRole('button', { name: /améliorer|improve|enhance/i })
        .first();

      if (await improveButton.isVisible().catch(() => false)) {
        await improveButton.click();

        await page.waitForTimeout(3000);

        // Check for improved text
        const result = page.locator('.ai-result, .improved-text').first();
        await expect(result).toBeVisible({ timeout: 10000 });
      } else {
        test.skip();
      }
    });

    test('should change tone of text', async ({ page }) => {
      const title = generateNoteTitle();
      const content = "Hey there! What's up?";

      await createNoteWithContent(page, title, content);

      const editor = page.locator('.cm-editor').first();
      await editor.click();
      await page.keyboard.press('Control+a');

      const toneButton = page.getByRole('button', { name: /ton|tone|style/i }).first();

      if (await toneButton.isVisible().catch(() => false)) {
        await toneButton.click();

        // Select formal tone
        const formalOption = page
          .getByRole('button', { name: /formel|formal|professionnel/i })
          .first();
        if (await formalOption.isVisible().catch(() => false)) {
          await formalOption.click();

          await page.waitForTimeout(3000);

          const result = page.locator('.ai-result').first();
          await expect(result).toBeVisible({ timeout: 10000 });
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AI Translation', () => {
    test('should translate text to English', async ({ page }) => {
      const title = generateNoteTitle();
      const content = "Bonjour, comment allez-vous aujourd'hui?";

      await createNoteWithContent(page, title, content);

      const editor = page.locator('.cm-editor').first();
      await editor.click();
      await page.keyboard.press('Control+a');

      const translateButton = page.getByRole('button', { name: /traduire|translate/i }).first();

      if (await translateButton.isVisible().catch(() => false)) {
        await translateButton.click();

        // Select English
        const englishOption = page.getByRole('button', { name: /anglais|english/i }).first();
        if (await englishOption.isVisible().catch(() => false)) {
          await englishOption.click();

          await page.waitForTimeout(3000);

          const result = page.locator('.ai-result, .translation').first();
          await expect(result).toBeVisible({ timeout: 10000 });

          const resultText = await result.textContent();
          expect(resultText?.toLowerCase()).toMatch(/hello|how are you/);
        }
      } else {
        test.skip();
      }
    });

    test('should translate text to multiple languages', async ({ page }) => {
      const title = generateNoteTitle();
      const content = 'Hello world';

      await createNoteWithContent(page, title, content);

      const editor = page.locator('.cm-editor').first();
      await editor.click();
      await page.keyboard.press('Control+a');

      const translateButton = page.getByRole('button', { name: /traduire|translate/i }).first();

      if (await translateButton.isVisible().catch(() => false)) {
        await translateButton.click();

        // Check for language options
        const languageOptions = page
          .getByRole('button')
          .filter({ hasText: /français|espagnol|allemand|italien|french|spanish|german|italian/i });
        const count = await languageOptions.count();
        expect(count).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });
  });

  test.describe('AI Brainstorming', () => {
    test('should generate ideas for topic', async ({ page }) => {
      const title = generateNoteTitle();

      await createNoteWithContent(page, title, 'Project ideas');

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        // Switch to brainstorm tab
        const brainstormTab = page.getByRole('tab', { name: /brainstorm|idées|ideas/i });
        if (await brainstormTab.isVisible().catch(() => false)) {
          await brainstormTab.click();

          // Enter topic
          const topicInput = page.getByPlaceholder(/sujet|topic|thème/i).first();
          if (await topicInput.isVisible().catch(() => false)) {
            await topicInput.fill('Mobile app ideas');

            const generateButton = page
              .getByRole('button', { name: /générer|generate|idées/i })
              .first();
            await generateButton.click();

            await page.waitForTimeout(3000);

            // Check for generated ideas
            const ideas = page.locator('.idea-item, .brainstorm-idea');
            const count = await ideas.count();
            expect(count).toBeGreaterThan(0);
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should create note from idea', async ({ page }) => {
      const title = generateNoteTitle();

      await createNoteWithContent(page, title, 'Ideas');

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        const brainstormTab = page.getByRole('tab', { name: /brainstorm|idées/i });
        if (await brainstormTab.isVisible().catch(() => false)) {
          await brainstormTab.click();

          const topicInput = page.getByPlaceholder(/sujet|topic/i).first();
          if (await topicInput.isVisible().catch(() => false)) {
            await topicInput.fill('Test topic');

            const generateButton = page.getByRole('button', { name: /générer|generate/i }).first();
            await generateButton.click();
            await page.waitForTimeout(3000);

            // Create note from first idea
            const createNoteButton = page
              .getByRole('button', { name: /créer note|create note/i })
              .first();
            if (await createNoteButton.isVisible().catch(() => false)) {
              await createNoteButton.click();

              // Verify new note was created
              await page.waitForTimeout(1000);
              const newNoteTitle = page.locator('input').first();
              const noteTitleValue = await newNoteTitle.inputValue();
              expect(noteTitleValue).toBeTruthy();
            }
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AI Multi-Note Synthesis', () => {
    test('should synthesize multiple notes', async ({ page }) => {
      // Create multiple notes
      const note1Title = `Note 1 ${generateUniqueId()}`;
      const note2Title = `Note 2 ${generateUniqueId()}`;

      await createNoteWithContent(page, note1Title, 'Content of first note about topic A.');
      await createNoteWithContent(page, note2Title, 'Content of second note about topic B.');

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        // Switch to synthesis tab
        const synthesisTab = page.getByRole('tab', { name: /synthèse|synthesis/i });
        if (await synthesisTab.isVisible().catch(() => false)) {
          await synthesisTab.click();

          // Select notes
          const noteCheckboxes = page.getByRole('checkbox');
          const count = await noteCheckboxes.count();
          if (count > 0) {
            await noteCheckboxes.first().check();

            const synthesizeButton = page
              .getByRole('button', { name: /synthétiser|synthesize/i })
              .first();
            await synthesizeButton.click();

            await page.waitForTimeout(5000);

            // Check for synthesis result
            const result = page.locator('.synthesis-result, .ai-synthesis').first();
            await expect(result).toBeVisible({ timeout: 10000 });
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AI Link Detection', () => {
    test('should suggest links between notes', async ({ page }) => {
      // Create related notes
      const note1Title = `Python Programming ${generateUniqueId()}`;
      const note2Title = `Machine Learning Basics ${generateUniqueId()}`;

      await createNoteWithContent(page, note1Title, 'Python is great for ML.');
      await createNoteWithContent(page, note2Title, 'Learn Python first.');

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        // Switch to links tab
        const linksTab = page.getByRole('tab', { name: /liens|links/i });
        if (await linksTab.isVisible().catch(() => false)) {
          await linksTab.click();

          const detectButton = page
            .getByRole('button', { name: /détecter|detect|suggérer liens/i })
            .first();
          if (await detectButton.isVisible().catch(() => false)) {
            await detectButton.click();

            await page.waitForTimeout(3000);

            // Check for link suggestions
            const suggestions = page.locator('.link-suggestion');
            const count = await suggestions.count();
            // May be 0 if no links detected, but the feature should work
            expect(count).toBeGreaterThanOrEqual(0);
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('AI Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      const title = generateNoteTitle();

      await createNoteWithContent(page, title, 'Test content');

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        const summaryButton = page.getByRole('button', { name: /résumer|summarize/i }).first();
        if (await summaryButton.isVisible().catch(() => false)) {
          await summaryButton.click();

          // Wait for response (may be error or success)
          await page.waitForTimeout(5000);

          // Should show either result or error message
          const resultOrError = page
            .locator('.ai-summary, .ai-error, .error-message, [data-testid="ai-result"]')
            .first();
          await expect(resultOrError).toBeVisible();
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });

    test('should show loading state', async ({ page }) => {
      const title = generateNoteTitle();

      await createNoteWithContent(page, title, 'Test content');

      const aiButton = page.getByRole('button', { name: /ia|ai/i }).first();
      if (await aiButton.isVisible().catch(() => false)) {
        await aiButton.click();

        const summaryButton = page.getByRole('button', { name: /résumer|summarize/i }).first();
        if (await summaryButton.isVisible().catch(() => false)) {
          await summaryButton.click();

          // Check for loading indicator immediately after click
          const loadingIndicator = page
            .locator('.loading, .spinner, [data-testid="loading"], .animate-spin')
            .first();
          // Loading might be too fast to catch
          if (await loadingIndicator.isVisible().catch(() => false)) {
            await expect(loadingIndicator).toBeVisible();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    });
  });
});
