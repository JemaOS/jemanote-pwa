# Documentation des Tests - JemaNote

<p align="center">
  <img src="../public/icon-192.png" alt="JemaNote Logo" width="80" height="80">
</p>

<p align="center">
  <strong>Infrastructure de tests complète pour JemaNote PWA</strong>
</p>

<p align="center">
  <a href="#-vue-densemble">Vue d'ensemble</a> •
  <a href="#-architecture-des-tests">Architecture</a> •
  <a href="#-démarrage-rapide">Démarrage</a> •
  <a href="#-structure-des-tests">Structure</a> •
  <a href="#-commandes-disponibles">Commandes</a>
</p>

---

## 📋 Vue d'ensemble

Cette documentation décrit l'infrastructure de tests complète de **JemaNote**, une application React/TypeScript/Vite PWA. Notre stratégie de tests suit la **pyramide des tests** avec une couverture complète à tous les niveaux.

### 🎯 Objectifs

- **Qualité du code** : Détecter les bugs avant la production
- **Régression** : Prévenir les régressions lors des modifications
- **Documentation** : Les tests servent de documentation vivante
- **Confiance** : Permettre des refactorings sans crainte
- **CI/CD** : Intégration continue avec feedback rapide

### 📊 Métriques de couverture

| Type de test         | Nombre | Couverture cible | Outil                   |
| -------------------- | ------ | ---------------- | ----------------------- |
| Tests unitaires      | 50+    | 70%              | Vitest                  |
| Tests d'intégration  | 30+    | -                | Vitest + MSW            |
| Tests de composants  | 25+    | 80%              | React Testing Library   |
| Tests E2E            | 40+    | -                | Playwright              |
| Tests de sécurité    | 100+   | -                | Playwright              |
| Tests de performance | 20+    | -                | Lighthouse + Playwright |
| Tests de refactoring | 15+    | -                | Scripts custom          |

---

## 🏗️ Architecture des tests

### La Pyramide des Tests

```
                    /\
                   /  \
                  / E2E \         ← 10% - Tests End-to-End (Playwright)
                 /________\
                /          \
               / Integration \    ← 20% - Tests d'intégration (Vitest + MSW)
              /______________\
             /                \
            /    Component      \  ← 30% - Tests de composants (RTL)
           /____________________\
          /                      \
         /       Unit Tests        \ ← 40% - Tests unitaires (Vitest)
        /____________________________\
```

### Types de tests

#### 1. 🧪 Tests Unitaires (`tests/unit/`)

Tests rapides et isolés pour les fonctions, hooks et utilitaires.

**Caractéristiques :**

- Exécution en millisecondes
- Pas de dépendances externes
- Mock complet des dépendances
- Couverture de code élevée

**Exemples :**

- [`tests/unit/hooks/useAuth.test.ts`](unit/hooks/useAuth.test.ts)
- [`tests/unit/lib/utils.test.ts`](unit/lib/utils.test.ts)
- [`tests/unit/services/graphIndexer.test.ts`](unit/services/graphIndexer.test.ts)

#### 2. 🔗 Tests d'Intégration (`tests/integration/`)

Tests des interactions entre modules et services externes.

**Caractéristiques :**

- Mock des API avec MSW (Mock Service Worker)
- Tests de flux complets
- Validation des schémas de données
- Tests de synchronisation

**Exemples :**

- [`tests/integration/supabase/auth.test.ts`](integration/supabase/auth.test.ts)
- [`tests/integration/storage/localStorage.test.ts`](integration/storage/localStorage.test.ts)
- [`tests/integration/sync/offlineSync.test.ts`](integration/sync/offlineSync.test.ts)

#### 3. 🧩 Tests de Composants (`tests/components/`)

Tests des composants React avec interactions utilisateur.

**Caractéristiques :**

- Rendu dans un DOM virtuel (jsdom)
- Simulation des événements utilisateur
- Tests d'accessibilité
- Tests de snapshots (optionnel)

**Exemples :**

- [`tests/components/editor/MarkdownEditor.test.tsx`](components/editor/MarkdownEditor.test.tsx)
- [`tests/components/layout/Sidebar.test.tsx`](components/layout/Sidebar.test.tsx)
- [`tests/components/ai/AIPanel.test.tsx`](components/ai/AIPanel.test.tsx)

#### 4. 🎭 Tests E2E (`tests/e2e/`)

Tests de bout en bout dans un vrai navigateur.

**Caractéristiques :**

- Exécution dans Chrome, Firefox, Safari
- Tests sur mobile et desktop
- Tests hors-ligne (PWA)
- Captures d'écran et vidéos

**Exemples :**

- [`tests/e2e/auth.spec.ts`](e2e/auth.spec.ts)
- [`tests/e2e/notes.spec.ts`](e2e/notes.spec.ts)
- [`tests/e2e/offline.spec.ts`](e2e/offline.spec.ts)

#### 5. 🔒 Tests de Sécurité (`tests/security/`)

Tests de vulnérabilités et de conformité sécuritaire.

**Caractéristiques :**

- Tests XSS, CSP, headers HTTP
- Injection SQL et NoSQL
- Sanitization des entrées
- Authentification et autorisation

**Exemples :**

- [`tests/security/xss.spec.ts`](security/xss.spec.ts)
- [`tests/security/csp.spec.ts`](security/csp.spec.ts)
- [`tests/security/headers.spec.ts`](security/headers.spec.ts)

#### 6. ⚡ Tests de Performance (`tests/performance/`)

Tests de performance et de mémoire.

**Caractéristiques :**

- Audits Lighthouse
- Tests de bundle size
- Tests de mémoire
- Tests d'interactions

**Exemples :**

- [`tests/performance/lighthouse.spec.ts`](performance/lighthouse.spec.ts)
- [`tests/performance/bundle.spec.ts`](performance/bundle.spec.ts)

#### 7. 📝 Tests de Refactoring (`tests/refactoring/`)

Tests de qualité du code et de métriques.

**Caractéristiques :**

- Analyse de complexité cyclomatique
- Détection de duplication
- Analyse de couplage
- Analyse de cohésion

**Exemples :**

- [`tests/refactoring/complexity.spec.ts`](refactoring/complexity.spec.ts)
- [`tests/refactoring/duplication.spec.ts`](refactoring/duplication.spec.ts)

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Navigateurs pour les tests E2E (Chrome, Firefox, Safari)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/jematechnology/jemanote-pwa.git
cd jemanote-pwa

# Installer les dépendances
npm install

# Installer les navigateurs Playwright
npx playwright install
```

### Premier test

```bash
# Lancer les tests unitaires
npm run test

# Lancer les tests E2E
npm run test:e2e

# Lancer tous les tests
npm run test:all
```

---

## 📁 Structure des tests

```
tests/
├── README.md                 # Cette documentation
├── CONTRIBUTING.md           # Guide de contribution
├── DEBUGGING.md             # Guide de débogage
├── CI_CD.md                 # Guide CI/CD
├── config.ts                # Configuration globale
├── setup.ts                 # Configuration Vitest
├── utils/
│   └── test-utils.tsx       # Utilitaires de test React
├── __mocks__/
│   ├── fileMock.ts          # Mock des fichiers
│   ├── localStorage.ts      # Mock localStorage
│   ├── mistral.ts           # Mock API Mistral
│   ├── styleMock.ts         # Mock des styles
│   └── supabase.ts          # Mock Supabase
├── unit/                    # Tests unitaires
│   ├── hooks/               # Tests des hooks React
│   ├── lib/                 # Tests des utilitaires
│   ├── services/            # Tests des services
│   └── types/               # Tests des types
├── integration/             # Tests d'intégration
│   ├── api/                 # Tests des API
│   ├── mocks/               # Handlers MSW
│   ├── storage/             # Tests de stockage
│   ├── supabase/            # Tests Supabase
│   └── sync/                # Tests de synchronisation
├── components/              # Tests de composants
│   ├── ai/                  # Composants IA
│   ├── auth/                # Composants auth
│   ├── command/             # Palette de commandes
│   ├── editor/              # Éditeur Markdown
│   └── layout/              # Layout (Sidebar, Navigation)
├── e2e/                     # Tests E2E
│   ├── fixtures/            # Fixtures Playwright
│   ├── page-objects/        # Pattern Page Object
│   ├── *.spec.ts            # Fichiers de test
├── security/                # Tests de sécurité
├── performance/             # Tests de performance
├── refactoring/             # Tests de refactoring
└── regression/              # Tests de régression visuelle
```

---

## ⌨️ Commandes disponibles

### Tests unitaires et d'intégration (Vitest)

| Commande                | Description                                 |
| ----------------------- | ------------------------------------------- |
| `npm run test`          | Lancer tous les tests unitaires une fois    |
| `npm run test:watch`    | Lancer les tests en mode watch              |
| `npm run test:coverage` | Lancer les tests avec rapport de couverture |

### Tests E2E (Playwright)

| Commande                 | Description                         |
| ------------------------ | ----------------------------------- |
| `npm run test:e2e`       | Lancer tous les tests E2E           |
| `npm run test:e2e:ui`    | Lancer avec l'interface utilisateur |
| `npm run test:e2e:debug` | Lancer en mode débogage             |

### Tests de régression visuelle

| Commande                     | Description                             |
| ---------------------------- | --------------------------------------- |
| `npm run test:visual`        | Lancer les tests de régression visuelle |
| `npm run test:visual:update` | Mettre à jour les snapshots             |
| `npm run test:visual:report` | Générer le rapport visuel               |

### Tests de performance

| Commande                   | Description                     |
| -------------------------- | ------------------------------- |
| `npm run test:performance` | Lancer les tests de performance |
| `npm run test:lighthouse`  | Lancer les audits Lighthouse    |
| `npm run benchmark`        | Lancer les benchmarks           |

### Tests de sécurité

| Commande                    | Description                        |
| --------------------------- | ---------------------------------- |
| `npm run test:security`     | Lancer les tests de sécurité       |
| `npm run test:security:all` | Lancer tous les audits de sécurité |
| `npm run security:audit`    | Audit des dépendances              |
| `npm run security:csp`      | Vérification CSP                   |

### Tests de refactoring

| Commande                      | Description                          |
| ----------------------------- | ------------------------------------ |
| `npm run test:refactoring`    | Lancer tous les tests de refactoring |
| `npm run analyze:complexity`  | Analyser la complexité               |
| `npm run analyze:duplication` | Détecter la duplication              |
| `npm run analyze:all`         | Toutes les analyses                  |

### Commandes globales

| Commande                  | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `npm run test:all`        | Lancer tous les tests (lint + types + unit + e2e) |
| `npm run test:all:visual` | Tous les tests + régression visuelle              |
| `npm run test:quality`    | Tests de refactoring + analyses                   |

---

## 🔧 Configuration

### Vitest ([`vitest.config.ts`](../vitest.config.ts))

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
```

### Playwright ([`playwright.config.ts`](../playwright.config.ts))

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
});
```

---

## 📈 Couverture de code

### Seuils actuels

| Métrique   | Seuil | Statut |
| ---------- | ----- | ------ |
| Statements | 70%   | ✅     |
| Branches   | 60%   | ✅     |
| Functions  | 70%   | ✅     |
| Lines      | 70%   | ✅     |

### Générer le rapport

```bash
npm run test:coverage
```

Le rapport HTML est généré dans le dossier [`coverage/`](../coverage/).

---

## ✅ Bonnes pratiques

### Générales

1. **AAA Pattern** : Arrange, Act, Assert
2. **Un seul concept par test** : Un test = une assertion logique
3. **Noms descriptifs** : Le nom du test doit décrire le comportement attendu
4. **Pas de logique conditionnelle** dans les tests
5. **Isolation** : Les tests ne doivent pas dépendre les uns des autres

### Tests unitaires

```typescript
// ✅ Bon
it('should return user data when authenticated', async () => {
  // Arrange
  mockAuthService.getUser.mockResolvedValue(mockUser);

  // Act
  const result = await getUser();

  // Assert
  expect(result).toEqual(mockUser);
});

// ❌ Mauvais
it('test user', async () => {
  const x = await getUser();
  if (x) {
    expect(x.id).toBeDefined();
  }
});
```

### Tests de composants

```typescript
// ✅ Bon
it('should display error message when form submission fails', async () => {
  render(<LoginForm />)

  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
  await userEvent.click(screen.getByRole('button', { name: /login/i }))

  expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
})

// ❌ Mauvais
test('form', () => {
  const { container } = render(<LoginForm />)
  expect(container.firstChild).toMatchSnapshot()
})
```

### Tests E2E

```typescript
// ✅ Bon
test('user can create and delete a note', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /new note/i }).click();
  await page.getByPlaceholder(/title/i).fill('Test Note');
  await page.getByRole('button', { name: /save/i }).click();

  await expect(page.getByText('Test Note')).toBeVisible();

  await page.getByRole('button', { name: /delete/i }).click();
  await expect(page.getByText('Test Note')).not.toBeVisible();
});
```

---

## 🐛 Débogage

Voir le guide complet : [`DEBUGGING.md`](DEBUGGING.md)

### Déboguer les tests unitaires

```bash
# Avec console.log
npm run test:watch -- --reporter=verbose

# Avec debugger
node --inspect-brk node_modules/.bin/vitest run
```

### Déboguer les tests E2E

```bash
# Mode UI
npm run test:e2e:ui

# Mode debug
npm run test:e2e:debug

# Avec traces
npx playwright test --trace=on
```

---

## 🤝 Contribution

Voir le guide complet : [`CONTRIBUTING.md`](CONTRIBUTING.md)

### Avant de commencer

1. Lire les conventions de nommage
2. Comprendre la structure des tests
3. Exécuter les tests existants

### Cycle de développement

1. Écrire le test qui échoue (TDD)
2. Implémenter la fonctionnalité
3. Vérifier que le test passe
4. Refactoriser si nécessaire
5. Soumettre la PR

---

## 📚 Ressources

### Documentation officielle

- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW](https://mswjs.io/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)

### Articles et guides

- [Testing Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [React Testing Patterns](https://reactpatterns.com/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

### Outils

- [Testing Playground](https://testing-playground.com/) - Générer des queries
- [Storybook](https://storybook.js.org/) - Développement de composants isolés

---

## 📞 Support

Si vous rencontrez des problèmes avec les tests :

1. Consulter [`DEBUGGING.md`](DEBUGGING.md)
2. Vérifier les logs dans `playwright-report/` ou `coverage/`
3. Ouvrir une issue sur GitHub

---

<p align="center">
  Fait avec ❤️ par <a href="https://www.jematechnology.fr/">Jema Technology</a>
</p>
