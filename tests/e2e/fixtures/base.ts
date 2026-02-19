import { test as base, Page, expect } from '@playwright/test'

// Define custom fixtures type
type TestFixtures = {
  authenticatedPage: Page
  offlinePage: Page
}

/**
 * Extended test fixture with custom helpers
 */
export const test = base.extend<TestFixtures>(
  {
    // Authenticated page fixture
    authenticatedPage: async ({ page }, use) => {
      // Mock authentication state
      await page.addInitScript(() => {
        localStorage.setItem(
          'supabase.auth.token',
          JSON.stringify({
            access_token: 'mock-token',
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
            },
          })
        )
      })
      await use(page)
    },

    // Offline page fixture
    offlinePage: async ({ page }, use) => {
      // Set offline mode
      await page.context().setOffline(true)
      await use(page)
      // Reset to online after test
      await page.context().setOffline(false)
    },
  }
)

export { expect } from '@playwright/test'
