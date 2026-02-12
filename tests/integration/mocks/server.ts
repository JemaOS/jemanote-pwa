// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * MSW Server Setup for Integration Tests
 * Configures and exports the mock service worker server
 */

import { setupServer } from 'msw/node'

import { handlers } from './handlers'

// Create MSW server with all handlers
export const server = setupServer(...handlers)

// Helper to wait for pending requests
export const waitForRequests = (ms: number = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper to reset server state between tests
export const resetServer = () => {
  server.resetHandlers()
}

// Helper to add temporary handler for specific test
export const addHandler = (handler: Parameters<typeof server.use>[0]) => {
  server.use(handler)
}
