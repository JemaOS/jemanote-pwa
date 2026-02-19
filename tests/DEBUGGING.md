# Guide de Débogage des Tests

Ce guide vous aide à diagnostiquer et résoudre les problèmes avec les tests dans JemaNote.

---

## 📋 Table des matières

- [Débogage des tests unitaires](#débogage-des-tests-unitaires)
- [Débogage des tests E2E](#débogage-des-tests-e2e)
- [Outils de débogage](#outils-de-débogage)
- [Problèmes courants](#problèmes-courants)
- [Techniques avancées](#techniques-avancées)

---

## 🧪 Débogage des tests unitaires

### Console et logs

```bash
# Afficher tous les console.log pendant les tests
npm run test -- --reporter=verbose

# Afficher les logs même pour les tests qui passent
npm run test -- --reporter=verbose --no-capture

# Lancer un test spécifique avec logs
npm run test -- --reporter=verbose tests/unit/hooks/useAuth.test.ts
```

### Mode watch avec filtre

```bash
# Lancer en mode watch
npm run test:watch

# Dans l'interface :
# - Appuyez sur 'p' pour filtrer par pattern
# - Appuyez sur 't' pour filtrer par nom de test
# - Appuyez sur 'a' pour relancer tous les tests
# - Appuyez sur 'f' pour relancer les tests qui ont échoué
# - Appuyez sur 'q' pour quitter
```

### Debug avec Node.js

```bash
# Lancer le debugger Node.js
node --inspect-brk node_modules/.bin/vitest run

# Ou avec npm
npm run test -- --inspect-brk

# Puis dans Chrome, ouvrir chrome://inspect
```

### Utilisation de `debug()`

```typescript
import { screen } from '@testing-library/react'

it('should render component', () => {
  render(<MyComponent />)

  // Affiche le DOM dans la console
  screen.debug()

  // Affiche un élément spécifique
  screen.debug(screen.getByRole('button'))

  // Affiche avec un formatage étendu
  screen.debug(undefined, 30000) // maxLength de 30000
})
```

### Log des appels de mocks

```typescript
it('should call API', async () => {
  const mockFn = vi.fn();
  vi.mocked(api.fetchData).mockImplementation(mockFn);

  await fetchUserData();

  // Afficher l'historique des appels
  console.log(mockFn.mock.calls);
  console.log(mockFn.mock.results);

  // Afficher avec plus de détails
  expect(mockFn).toHaveBeenCalled();
  expect(mockFn.mock.calls[0]).toEqual(['expected-arg']);
});
```

---

## 🎭 Débogage des tests E2E

### Mode UI de Playwright

```bash
# Lancer le mode UI interactif
npm run test:e2e:ui

# Fonctionnalités disponibles :
# - Voir les snapshots du DOM
# - Rejouer les tests
# - Voir les traces
# - Inspecter les éléments
# - Modifier les tests en direct
```

### Mode Debug

```bash
# Lancer en mode debug (pas de headless, fenêtre visible)
npm run test:e2e:debug

# Ou pour un test spécifique
npx playwright test tests/e2e/auth.spec.ts --debug
```

### Captures d'écran et vidéos

Les captures sont automatiquement générées en cas d'échec :

```bash
# Voir les captures d'écran
cat playwright-report/index.html

# Ouvrir le rapport HTML
npx playwright show-report

# Les captures sont dans :
# - playwright-report/ (rapport HTML)
# - test-results/ (captures et vidéos)
```

### Traces Playwright

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on', // Toujours enregistrer les traces
    // ou
    trace: 'retain-on-failure', // Conserver uniquement en cas d'échec
    // ou
    trace: 'on-first-retry', // Par défaut
  },
});
```

Pour voir une trace :

```bash
# Ouvrir la trace dans le viewer
npx playwright show-trace test-results/trace.zip
```

### Pause et inspection

```typescript
import { test, expect } from '@playwright/test';

test('debug example', async ({ page }) => {
  await page.goto('/');

  // Pause le test pour inspection manuelle
  await page.pause();

  // Ou utiliser un point d'arrêt
  await page.getByRole('button').click();

  // Le test attendra ici en mode debug
});
```

### Logs de la page

```typescript
test('capture page logs', async ({ page }) => {
  // Écouter les console.log de la page
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // Écouter les erreurs
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // Écouter les requêtes réseau
  page.on('request', request => {
    console.log(`[REQUEST] ${request.method()} ${request.url()}`);
  });

  page.on('response', response => {
    console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
  });

  await page.goto('/');
});
```

---

## 🛠️ Outils de débogage

### Testing Playground

[Testing Playground](https://testing-playground.com/) est un outil pour trouver les meilleurs queries :

```typescript
// Dans votre test, ajoutez temporairement :
import { logRoles } from '@testing-library/dom'

it('debug queries', () => {
  const { container } = render(<MyComponent />)

  // Affiche tous les rôles disponibles
  logRoles(container)
})
```

### React DevTools

Pour déboguer les composants dans les tests E2E :

1. Installer l'extension React DevTools dans le navigateur
2. Lancer les tests en mode non-headless
3. Ouvrir les DevTools pendant l'exécution

### Playwright Codegen

Générer automatiquement des tests :

```bash
# Lancer le générateur de code
npx playwright codegen http://localhost:5173

# Cela ouvre un navigateur où vous pouvez interagir
# et génère le code Playwright correspondant
```

### Vitest UI

```bash
# Lancer l'interface graphique Vitest
npx vitest --ui

# Accessible sur http://localhost:51204/__vitest__/
```

---

## 🔧 Problèmes courants

### Tests qui échouent aléatoirement (Flaky tests)

**Symptôme :** Le test passe parfois, échoue parfois.

**Solutions :**

```typescript
// ❌ Mauvais - Pas d'attente explicite
it('should show data', async () => {
  render(<Component />)
  expect(screen.getByText('Data')).toBeInTheDocument() // Peut échouer
})

// ✅ Bon - Attendre explicitement
it('should show data', async () => {
  render(<Component />)
  expect(await screen.findByText('Data')).toBeInTheDocument()
})

// ✅ Encore mieux - Utiliser waitFor
it('should show data', async () => {
  render(<Component />)
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})
```

**Pour Playwright :**

```typescript
// ❌ Mauvais
await page.click('button');
expect(await page.textContent('.result')).toBe('Done');

// ✅ Bon
await page.click('button');
await expect(page.locator('.result')).toHaveText('Done');

// ✅ Avec timeout personnalisé
await expect(page.locator('.result')).toHaveText('Done', { timeout: 10000 });
```

### Timeouts

**Symptôme :** `Test timeout exceeded`

```bash
# Augmenter le timeout global
npm run test -- --testTimeout=30000

# Ou dans vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
```

### Mocks qui persistent entre les tests

**Symptôme :** Un mock d'un test affecte un autre test.

```typescript
// ✅ Solution - Toujours nettoyer
describe('MyTests', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Réinitialise l'historique
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restaure les implémentations originales
  });

  // Ou pour un mock spécifique
  beforeEach(() => {
    mockFn.mockReset(); // Réinitialise tout
  });
});
```

### Problèmes de mémoire

**Symptôme :** `JavaScript heap out of memory`

```bash
# Augmenter la mémoire pour Node.js
node --max-old-space-size=4096 node_modules/.bin/vitest run

# Ou avec une variable d'environnement
export NODE_OPTIONS="--max-old-space-size=4096"
npm run test
```

### Tests E2E qui échouent en CI mais passent localement

**Causes possibles :**

1. **Timing différent** - Le CI est plus lent

   ```typescript
   // Augmenter les timeouts
   await expect(locator).toBeVisible({ timeout: 10000 });
   ```

2. **Résolution d'écran** - Le CI utilise une taille différente

   ```typescript
   // Forcer une taille dans playwright.config.ts
   use: {
     viewport: { width: 1280, height: 720 },
   }
   ```

3. **État non nettoyé** - Les tests ne sont pas isolés
   ```typescript
   test.afterEach(async ({ page }) => {
     await page.evaluate(() => localStorage.clear());
     await page.evaluate(() => sessionStorage.clear());
   });
   ```

### Erreurs "Unable to find element"

```typescript
// ❌ Mauvais - Query synchrone
test('find element', () => {
  render(<Component />)
  screen.getByText('Loading...') // Peut ne pas exister encore
})

// ✅ Bon - Query asynchrone
test('find element', async () => {
  render(<Component />)
  await screen.findByText('Loading...') // Attend que l'élément apparaisse
})
```

### Problèmes avec les animations

```typescript
// Désactiver les animations dans les tests
// tests/setup.ts
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    // ...
  })),
})

// Ou dans CSS
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🔬 Techniques avancées

### Débogage des requêtes réseau

```typescript
// Intercepter et inspecter les requêtes
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/data', req => {
    console.log('Request headers:', req.headers);
    console.log('Request params:', req.params);

    return HttpResponse.json({ data: 'test' });
  })
);
```

### Débogage des hooks

```typescript
import { renderHook } from '@testing-library/react';

it('debug hook', () => {
  const { result, rerender } = renderHook(() => useMyHook());

  console.log('Initial state:', result.current);

  act(() => {
    result.current.increment();
  });

  console.log('After increment:', result.current);
});
```

### Débogage du Provider

```typescript
// Créer un wrapper avec logging
function DebugProvider({ children }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

// Utiliser dans le test
render(<MyComponent />, { wrapper: DebugProvider })
```

### Profiler React

```typescript
import { Profiler } from 'react'

function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  console.log('Component:', id)
  console.log('Phase:', phase)
  console.log('Actual duration:', actualDuration)
  console.log('Base duration:', baseDuration)
}

// Dans le test
render(
  <Profiler id="MyComponent" onRender={onRenderCallback}>
    <MyComponent />
  </Profiler>
)
```

### Débogage des tests de performance

```typescript
it('should render quickly', async () => {
  const start = performance.now()

  render(<HeavyComponent />)

  const end = performance.now()
  console.log(`Render time: ${end - start}ms`)

  expect(end - start).toBeLessThan(100)
})
```

---

## 📊 Analyse des rapports

### Rapport de couverture

```bash
# Générer le rapport	npm run test:coverage

# Ouvrir le rapport HTML
open coverage/index.html

# Analyser :
# - Statements : Lignes de code exécutées
# - Branches : Conditions couvertes (if/else)
# - Functions : Fonctions appelées
# - Lines : Lignes physiques couvertes
```

### Rapport Playwright

```bash
# Générer et ouvrir
npx playwright show-report

# Analyser :
# - Screenshots des échecs
# - Traces interactives
# - Vidéos des tests
# - Logs console
```

---

## 💡 Conseils généraux

1. **Commencez simple** - Ajoutez des `console.log` basiques
2. **Isolez le problème** - Créez un test minimal qui reproduit le bug
3. **Utilisez les outils visuels** - Mode UI, screenshots, traces
4. **Lisez les erreurs** - Souvent le message d'erreur contient la solution
5. **Documentez** - Si vous trouvez un bug subtil, documentez-le

---

## 🆘 Besoin d'aide ?

Si vous êtes bloqué :

1. Exécuter avec `--reporter=verbose` pour plus de détails
2. Essayer `--no-threads` pour exécuter les tests séquentiellement
3. Vérifier que les dépendances sont à jour
4. Consulter les issues GitHub existantes
5. Ouvrir une nouvelle issue avec :
   - Le code du test
   - L'erreur complète
   - La version de Node.js
   - Le système d'exploitation
