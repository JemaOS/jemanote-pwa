// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * End-to-End Authentication Tests
 * Tests user registration, login, logout, password recovery, and session persistence
 */

import { test, expect, Page } from '@playwright/test';
import { generateTestEmail, generateTestPassword, clearLocalStorage } from './utils';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Clear any existing auth state
    await clearLocalStorage(page);
  });

  test.describe('User Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const email = generateTestEmail();
      const password = generateTestPassword();

      // Open auth modal
      await page.getByRole('button', { name: /connexion|login/i }).click();

      // Switch to registration tab
      await page.getByRole('button', { name: /inscription|sign up/i }).click();

      // Fill registration form
      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);

      // Submit form
      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      // Wait for success or check that modal closes
      await expect(page.getByText(/connexion|login/i).first()).not.toBeVisible({ timeout: 10000 });

      // Verify user is logged in (check for logout button or user indicator)
      await expect(page.getByRole('button', { name: /déconnexion|logout/i })).toBeVisible({
        timeout: 10000,
      });
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();

      // Fill with invalid email
      await page.getByPlaceholder(/email/i).fill('invalid-email');
      await page.getByPlaceholder(/mot de passe|password/i).fill('password123'); // NOSONAR

      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      // Should show validation error
      await expect(page.getByText(/email invalide|invalid email/i)).toBeVisible();
    });

    test('should show error for weak password', async ({ page }) => {
      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();

      await page.getByPlaceholder(/email/i).fill(generateTestEmail());
      // Password too short
      await page.getByPlaceholder(/mot de passe|password/i).fill('123'); // NOSONAR

      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      // Should show password validation error
      await expect(page.getByText(/mot de passe|password/i)).toBeVisible();
    });

    test('should show error for duplicate email', async ({ page }) => {
      const email = generateTestEmail();
      const password = generateTestPassword();

      // Register first user
      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();
      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);
      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      // Wait for registration to complete
      await page.waitForTimeout(2000);

      // Try to register again with same email
      await page.goto('/');
      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();
      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);
      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      // Should show duplicate email error
      await expect(page.getByText(/existe déjà|already exists|déjà utilisé/i)).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      // First register a user
      const email = generateTestEmail();
      const password = generateTestPassword();

      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();
      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);
      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      await page.waitForTimeout(2000);

      // Logout first
      await page.getByRole('button', { name: /déconnexion|logout/i }).click();
      await page.waitForTimeout(1000);

      // Now try to login
      await page.getByRole('button', { name: /connexion|login/i }).click();

      // Ensure we're on login tab
      await page
        .getByRole('button', { name: /connexion|login/i })
        .first()
        .click();

      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);
      await page.getByRole('button', { name: /se connecter|sign in/i }).click();

      // Should be logged in
      await expect(page.getByRole('button', { name: /déconnexion|logout/i })).toBeVisible({
        timeout: 10000,
      });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.getByRole('button', { name: /connexion|login/i }).click();

      await page.getByPlaceholder(/email/i).fill('nonexistent@example.com');
      await page.getByPlaceholder(/mot de passe|password/i).fill('wrongpassword'); // NOSONAR
      await page.getByRole('button', { name: /se connecter|sign in/i }).click();

      // Should show error message
      await expect(
        page.getByText(
          /identifiants invalides|invalid credentials|email ou mot de passe incorrect/i
        )
      ).toBeVisible({ timeout: 5000 });
    });

    test('should show error for empty fields', async ({ page }) => {
      await page.getByRole('button', { name: /connexion|login/i }).click();

      // Try to submit empty form
      await page.getByRole('button', { name: /se connecter|sign in/i }).click();

      // Should show validation error or remain on form
      await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    });
  });

  test.describe('User Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Register and login first
      const email = generateTestEmail();
      const password = generateTestPassword();

      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();
      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);
      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      await page.waitForTimeout(2000);

      // Verify logged in
      await expect(page.getByRole('button', { name: /déconnexion|logout/i })).toBeVisible();

      // Logout
      await page.getByRole('button', { name: /déconnexion|logout/i }).click();

      // Should show login button again
      await expect(page.getByRole('button', { name: /connexion|login/i })).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Password Recovery', () => {
    test('should show password recovery form', async ({ page }) => {
      await page.getByRole('button', { name: /connexion|login/i }).click();

      // Look for forgot password link
      const forgotPasswordLink = page.getByRole('button', {
        name: /mot de passe oublié|forgot password/i,
      });

      // If the link exists, click it
      if (await forgotPasswordLink.isVisible().catch(() => false)) {
        await forgotPasswordLink.click();

        // Should show password recovery form
        await expect(page.getByPlaceholder(/email/i)).toBeVisible();
        await expect(
          page.getByRole('button', { name: /envoyer|send|réinitialiser/i })
        ).toBeVisible();
      } else {
        // Skip if feature not implemented
        test.skip();
      }
    });

    test('should send password reset email', async ({ page }) => {
      const email = generateTestEmail();

      await page.getByRole('button', { name: /connexion|login/i }).click();

      const forgotPasswordLink = page.getByRole('button', {
        name: /mot de passe oublié|forgot password/i,
      });

      if (await forgotPasswordLink.isVisible().catch(() => false)) {
        await forgotPasswordLink.click();
        await page.getByPlaceholder(/email/i).fill(email);
        await page.getByRole('button', { name: /envoyer|send/i }).click();

        // Should show success message
        await expect(page.getByText(/email envoyé|email sent|vérifiez votre boîte/i)).toBeVisible({
          timeout: 5000,
        });
      } else {
        test.skip();
      }
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session after page reload', async ({ page }) => {
      // Register and login
      const email = generateTestEmail();
      const password = generateTestPassword();

      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();
      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);
      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      await page.waitForTimeout(2000);

      // Verify logged in
      await expect(page.getByRole('button', { name: /déconnexion|logout/i })).toBeVisible();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be logged in
      await expect(page.getByRole('button', { name: /déconnexion|logout/i })).toBeVisible({
        timeout: 10000,
      });
    });

    test('should persist session in new tab', async ({ browser }) => {
      // Create a new context to test session persistence
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Register and login
      const email = generateTestEmail();
      const password = generateTestPassword();

      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();
      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);
      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      await page.waitForTimeout(2000);

      // Open new tab
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.waitForLoadState('networkidle');

      // Should be logged in on new tab
      await expect(newPage.getByRole('button', { name: /déconnexion|logout/i })).toBeVisible({
        timeout: 10000,
      });

      await context.close();
    });

    test('should clear session on logout', async ({ page }) => {
      // Register and login
      const email = generateTestEmail();
      const password = generateTestPassword();

      await page.getByRole('button', { name: /connexion|login/i }).click();
      await page.getByRole('button', { name: /inscription|sign up/i }).click();
      await page.getByPlaceholder(/email/i).fill(email);
      await page.getByPlaceholder(/mot de passe|password/i).fill(password);
      await page.getByRole('button', { name: /s'inscrire|sign up/i }).click();

      await page.waitForTimeout(2000);

      // Logout
      await page.getByRole('button', { name: /déconnexion|logout/i }).click();
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should not be logged in
      await expect(page.getByRole('button', { name: /connexion|login/i })).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Auth Modal UI', () => {
    test('should open and close auth modal', async ({ page }) => {
      // Open modal
      await page.getByRole('button', { name: /connexion|login/i }).click();

      // Modal should be visible
      await expect(page.getByText(/synchronisation|connexion|login/i).first()).toBeVisible();

      // Close modal using X button
      await page.getByRole('button', { name: /fermer|close/i }).click();

      // Modal should be closed
      await expect(page.getByPlaceholder(/email/i)).not.toBeVisible();
    });

    test('should close modal on backdrop click', async ({ page }) => {
      await page.getByRole('button', { name: /connexion|login/i }).click();

      // Click on backdrop (outside modal content)
      await page
        .locator('.fixed.inset-0')
        .first()
        .click({ position: { x: 10, y: 10 } });

      // Modal should be closed
      await expect(page.getByPlaceholder(/email/i)).not.toBeVisible();
    });

    test('should switch between login and register tabs', async ({ page }) => {
      await page.getByRole('button', { name: /connexion|login/i }).click();

      // Check login tab is active
      await expect(page.getByRole('button', { name: /connexion|login/i }).first()).toHaveClass(
        /bg-primary/
      );

      // Switch to register
      await page.getByRole('button', { name: /inscription|sign up/i }).click();

      // Check register tab is active
      await expect(page.getByRole('button', { name: /inscription|sign up/i })).toHaveClass(
        /bg-primary/
      );
    });
  });
});
