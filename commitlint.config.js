// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

/**
 * Commitlint configuration following Conventional Commits specification
 * @see https://www.conventionalcommits.org/
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of the conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // A new feature
        'fix',      // A bug fix
        'docs',     // Documentation only changes
        'style',    // Changes that do not affect the meaning of the code
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'perf',     // A code change that improves performance
        'test',     // Adding missing tests or correcting existing tests
        'build',    // Changes that affect the build system or external dependencies
        'ci',       // Changes to CI configuration files and scripts
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverts a previous commit
      ],
    ],
    // Type must be in lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Type cannot be empty
    'type-empty': [2, 'never'],
    // Scope must be one of the defined scopes (optional but recommended)
    'scope-enum': [
      1,
      'always',
      [
        'auth',       // Authentication related
        'notes',      // Notes functionality
        'graph',      // Graph visualization
        'editor',     // Markdown editor
        'ai',         // AI features
        'search',     // Search functionality
        'sync',       // Synchronization
        'ui',         // UI components
        'pwa',        // PWA features
        'test',       // Tests
        'deps',       // Dependencies
        'config',     // Configuration
        'ci',         // CI/CD
        'docs',       // Documentation
        'api',        // API related
        'storage',    // Storage layer
        'perf',       // Performance
        'security',   // Security
        'i18n',       // Internationalization
      ],
    ],
    // Scope must be in lowercase
    'scope-case': [2, 'always', 'lower-case'],
    // Subject cannot be empty
    'subject-empty': [2, 'never'],
    // Subject must not end with period
    'subject-full-stop': [2, 'never', '.'],
    // Subject case - allow any case for flexibility
    'subject-case': [0],
    // Header max length (GitHub truncates at 72)
    'header-max-length': [2, 'always', 72],
    // Body max length
    'body-max-length': [2, 'always', 100],
    // Body must wrap at 100 chars
    'body-max-line-length': [2, 'always', 100],
    // Footer max line length
    'footer-max-line-length': [2, 'always', 100],
    // Footer cannot be empty if provided
    'footer-empty': [0],
    // References issue numbers in footer
    'references-empty': [0],
  },
  // Custom parser preset
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
      referenceActions: ['close', 'closes', 'closed', 'fix', 'fixes', 'fixed', 'resolve', 'resolves', 'resolved'],
      issuePrefixes: ['#', 'JEMA-'],
    },
  },
  // Help message
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
};
