/**
 * Configuration globale pour les tests
 *
 * Ce fichier centralise les constantes, timeouts et données de test
 * utilisées dans l'ensemble de la suite de tests.
 *
 * @example
 * import { TEST_CONFIG, MOCK_DATA, TIMEOUTS } from '@/tests/config'
 */

// =============================================================================
// TIMEOUTS
// =============================================================================

/**
 * Timeouts configurables pour différents types de tests
 * Les valeurs sont augmentées en environnement CI pour plus de stabilité
 */
export const TIMEOUTS = {
  /** Timeout par défaut pour les tests unitaires (ms) */
  UNIT: process.env.CI ? 30000 : 10000,

  /** Timeout pour les tests d'intégration (ms) */
  INTEGRATION: process.env.CI ? 60000 : 30000,

  /** Timeout pour les tests de composants (ms) */
  COMPONENT: process.env.CI ? 30000 : 15000,

  /** Timeout pour les tests E2E (ms) */
  E2E: process.env.CI ? 60000 : 30000,

  /** Timeout pour les actions Playwright (ms) */
  ACTION: process.env.CI ? 15000 : 10000,

  /** Timeout pour la navigation Playwright (ms) */
  NAVIGATION: process.env.CI ? 30000 : 15000,

  /** Timeout pour les tests de performance (ms) */
  PERFORMANCE: process.env.CI ? 120000 : 60000,

  /** Timeout pour les tests de sécurité (ms) */
  SECURITY: process.env.CI ? 60000 : 30000,

  /** Délai de debounce pour les inputs (ms) */
  DEBOUNCE: 300,

  /** Délai d'animation (ms) */
  ANIMATION: 300,

  /** Délai de polling pour les attentes (ms) */
  POLLING: 100,
} as const;

// =============================================================================
// URLS DE TEST
// =============================================================================

/**
 * URLs utilisées dans les tests
 */
export const TEST_URLS = {
  /** URL de base pour l'application */
  // SECURITY NOTE: Using HTTP for localhost development is acceptable
  // These are local development server URLs, not production endpoints
  BASE: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173', // NOSONAR

  /** URL de base pour l'API */
  // SECURITY NOTE: Using HTTP for localhost Supabase is acceptable
  // This is a local development Supabase instance, not production
  API: process.env.VITE_SUPABASE_URL || 'http://localhost:54321', // NOSONAR

  /** Routes de l'application */
  ROUTES: {
    HOME: '/',
    NOTES: '/notes',
    EDITOR: '/editor',
    GRAPH: '/graph',
    CANVAS: '/canvas',
    TIMELINE: '/timeline',
    SETTINGS: '/settings',
    SEARCH: '/search',
    AI: '/ai',
  },

  /** Endpoints API */
  API_ENDPOINTS: {
    AUTH: '/auth/v1',
    REST: '/rest/v1',
    REALTIME: '/realtime/v1',
    STORAGE: '/storage/v1',
  },
} as const;

// =============================================================================
// DONNÉES DE TEST
// =============================================================================

/**
 * Données de test communes réutilisables
 */
export const MOCK_DATA = {
  /** Utilisateur de test */
  USER: {
    id: 'test-user-id-123',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
      avatar_url: null,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },

  /** Session de test - Mock tokens for testing purposes only, NOT real credentials */
  SESSION: {
    /** Mock access token for testing - NOT a real credential */
    access_token: 'mock-access-token-123',
    /** Mock refresh token for testing - NOT a real credential */
    refresh_token: 'mock-refresh-token-456',
    expires_in: 3600,
    token_type: 'bearer',
    user: null as any, // Sera défini avec MOCK_DATA.USER
  },

  /** Note de test */
  NOTE: {
    id: 'test-note-id-789',
    title: 'Test Note',
    content: '# Test Content\n\nThis is a test note.',
    user_id: 'test-user-id-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_archived: false,
    is_pinned: false,
    tags: ['test', 'example'],
    folder_id: null,
  },

  /** Dossier de test */
  FOLDER: {
    id: 'test-folder-id-abc',
    name: 'Test Folder',
    user_id: 'test-user-id-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    parent_id: null,
  },

  /** Tag de test */
  TAG: {
    id: 'test-tag-id-def',
    name: 'test-tag',
    user_id: 'test-user-id-123',
    color: '#3b82f6',
  },

  /** Paramètres de test */
  SETTINGS: {
    theme: 'system',
    fontSize: 16,
    sidebarCollapsed: false,
    autoSave: true,
    autoSaveInterval: 30000,
    spellCheck: true,
    defaultView: 'list',
  },

  /** Réponse API de test */
  API_RESPONSE: {
    success: { success: true, message: 'Operation completed' },
    error: { error: 'Something went wrong', code: 'ERROR_CODE' },
    notFound: { error: 'Resource not found', code: 'NOT_FOUND' },
    unauthorized: { error: 'Unauthorized', code: 'UNAUTHORIZED' },
  },
} as const;

// =============================================================================
// SÉLECTEURS
// =============================================================================

/**
 * Sélecteurs de test data attributes
 * Utiliser ces attributs dans les composants pour les tests
 *
 * @example
 * <button data-testid={TEST_SELECTORS.BUTTON.SUBMIT}>Submit</button>
 */
export const TEST_SELECTORS = {
  /** Boutons */
  BUTTON: {
    SUBMIT: 'submit-button',
    CANCEL: 'cancel-button',
    DELETE: 'delete-button',
    EDIT: 'edit-button',
    CREATE: 'create-button',
    SAVE: 'save-button',
    CLOSE: 'close-button',
    MENU: 'menu-button',
    SEARCH: 'search-button',
    SETTINGS: 'settings-button',
    NEW_NOTE: 'new-note-button',
    SYNC: 'sync-button',
    OFFLINE: 'offline-button',
  },

  /** Inputs - These are test selectors for form input elements, NOT actual credentials */
  INPUT: {
    /** Test selector for title input field */
    TITLE: 'title-input',
    /** Test selector for search input field */
    SEARCH: 'search-input',
    /** Test selector for email input field (data-testid attribute value) */
    EMAIL: 'email-input',
    /** Test selector for password input field (data-testid attribute value) - NOT a real password */
    PASSWORD: 'password-input', // NOSONAR
    /** Test selector for content input field */
    CONTENT: 'content-input',
    /** Test selector for tag input field */
    TAG: 'tag-input',
  },

  /** Conteneurs */
  CONTAINER: {
    SIDEBAR: 'sidebar-container',
    EDITOR: 'editor-container',
    PREVIEW: 'preview-container',
    MODAL: 'modal-container',
    TOAST: 'toast-container',
    GRAPH: 'graph-container',
    CANVAS: 'canvas-container',
  },

  /** Listes */
  LIST: {
    NOTES: 'notes-list',
    FOLDERS: 'folders-list',
    TAGS: 'tags-list',
    SEARCH_RESULTS: 'search-results-list',
  },

  /** Items */
  ITEM: {
    NOTE: 'note-item',
    FOLDER: 'folder-item',
    TAG: 'tag-item',
  },

  /** Navigation */
  NAV: {
    ROOT: 'navigation',
    LINK_HOME: 'nav-home',
    LINK_NOTES: 'nav-notes',
    LINK_GRAPH: 'nav-graph',
    LINK_CANVAS: 'nav-canvas',
    LINK_TIMELINE: 'nav-timeline',
    LINK_SETTINGS: 'nav-settings',
  },

  /** État */
  STATE: {
    LOADING: 'loading-state',
    ERROR: 'error-state',
    EMPTY: 'empty-state',
    OFFLINE: 'offline-state',
    SYNCING: 'syncing-state',
  },
} as const;

// =============================================================================
// CONFIGURATION DES TESTS
// =============================================================================

/**
 * Configuration principale des tests
 */
export const TEST_CONFIG = {
  /** Environnement d'exécution */
  CI: process.env.CI === 'true',

  /** Mode debug */
  DEBUG: process.env.DEBUG === 'true',

  /** Mode verbose */
  VERBOSE: process.env.VERBOSE === 'true',

  /** Couverture de code */
  COVERAGE: {
    /** Seuils minimaux */
    THRESHOLDS: {
      STATEMENTS: 70,
      BRANCHES: 60,
      FUNCTIONS: 70,
      LINES: 70,
    },
    /** Répertoire de sortie */
    OUTPUT_DIR: './coverage',
    /** Formats de rapport */
    REPORTERS: ['text', 'json', 'html', 'lcov'] as const,
  },

  /** Configuration E2E */
  E2E: {
    /** Navigateurs à tester */
    BROWSERS: ['chromium', 'firefox', 'webkit'] as const,
    /** Appareils à tester */
    DEVICES: [
      'Desktop Chrome',
      'Desktop Firefox',
      'Desktop Safari',
      'Pixel 5',
      'iPhone 12',
    ] as const,
    /** Retries en cas d'échec */
    RETRIES: process.env.CI ? 2 : 0,
    /** Workers parallèles */
    WORKERS: process.env.CI ? 1 : undefined,
  },

  /** Configuration des mocks */
  MOCKS: {
    /** Délai de réponse simulé (ms) */
    DELAY: 100,
    /** Taux d'erreur simulé (0-1) */
    ERROR_RATE: 0,
  },

  /** Configuration de sécurité - Test payloads for security testing only */
  SECURITY: {
    /** Payloads XSS de test - Used for testing XSS protection mechanisms */
    XSS_PAYLOADS: [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")', // NOSONAR
      '<svg onload="alert(\'XSS\')">',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
    ],
    /** Payloads d'injection SQL - Used for testing SQL injection protection */
    SQL_PAYLOADS: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' AND 1=1 --",
    ],
  },

  /** Configuration de performance */
  PERFORMANCE: {
    /** Seuils Lighthouse */
    LIGHTHOUSE: {
      PERFORMANCE: 80,
      ACCESSIBILITY: 90,
      BEST_PRACTICES: 90,
      SEO: 90,
      PWA: 70,
    },
    /** Limites de taille du bundle (KB) */
    BUNDLE_SIZE: {
      JS: 500,
      CSS: 100,
      TOTAL: 1000,
    },
    /** Métriques Web Vitals */
    WEB_VITALS: {
      LCP: 2500, // Largest Contentful Paint (ms)
      FID: 100, // First Input Delay (ms)
      CLS: 0.1, // Cumulative Layout Shift
      FCP: 1800, // First Contentful Paint (ms)
      TTFB: 600, // Time to First Byte (ms)
    },
  },
} as const;

// =============================================================================
// UTILITAIRES
// =============================================================================

/**
 * Générateurs de données de test
 */
export const generators = {
  /**
   * Génère un ID unique
   * SECURITY FIX: Using crypto.getRandomValues instead of Math.random() for better randomness
   * Note: This is test code, but we use secure random generation as a best practice
   */
  id: (): string => {
    const timestamp = Date.now();
    // Use crypto.getRandomValues if available (Node.js 14+), fallback to Math.random for compatibility
    let randomPart: string;
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(2);
        crypto.getRandomValues(array);
        randomPart = array[0].toString(36).substring(0, 7);
      } else {
        // Fallback for environments without crypto
        randomPart = Math.floor(Math.random() * 10000000) // NOSONAR
          .toString(36)
          .substring(0, 7);
      }
    } catch {
      // Final fallback
      randomPart = Math.floor(Math.random() * 10000000) // NOSONAR
        .toString(36)
        .substring(0, 7);
    }
    return `test-${timestamp}-${randomPart}`;
  },

  /**
   * Génère un email de test unique
   */
  email: (): string => `test-${Date.now()}@example.com`,

  /**
   * Génère un mot de passe de test aléatoire
   * This generates a random test password for testing purposes only
   */
  password: (): string => `TestPass${Date.now()}!`,

  /**
   * Génère une note de test
   */
  note: (overrides: Partial<typeof MOCK_DATA.NOTE> = {}) => ({
    ...MOCK_DATA.NOTE,
    id: generators.id(),
    ...overrides,
  }),

  /**
   * Génère un utilisateur de test
   */
  user: (overrides: Partial<typeof MOCK_DATA.USER> = {}) => ({
    ...MOCK_DATA.USER,
    id: generators.id(),
    email: generators.email(),
    ...overrides,
  }),

  /**
   * Génère du contenu Markdown de test
   */
  markdown: (paragraphs: number = 3): string => {
    const lorem = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa.',
    ];
    return Array.from(
      { length: paragraphs },
      (_, i) => `${'#'.repeat(Math.min(i + 1, 3))} Heading ${i + 1}\n\n${lorem[i % lorem.length]}`
    ).join('\n\n');
  },
} as const;

// =============================================================================
// EXPORTS PAR DÉFAUT
// =============================================================================

/**
 * Export par défaut pour une importation simplifiée
 *
 * @example
 * import testConfig from '@/tests/config'
 * console.log(testConfig.TIMEOUTS.UNIT)
 */
export default {
  TIMEOUTS,
  TEST_URLS,
  MOCK_DATA,
  TEST_SELECTORS,
  TEST_CONFIG,
  generators,
};
