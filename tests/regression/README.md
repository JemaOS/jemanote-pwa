# Tests de Régression Visuelle

Ce dossier contient les tests de régression visuelle pour l'application Jemanote.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Workflow de review](#workflow-de-review)
- [Mettre à jour les baselines](#mettre-à-jour-les-baselines)
- [Ignorer des différences intentionnelles](#ignorer-des-différences-intentionnelles)
- [Dépannage](#dépannage)

## Vue d'ensemble

Les tests de régression visuelle permettent de détecter les changements visuels non intentionnels dans l'interface utilisateur. Ils utilisent :

- **Playwright** pour capturer les screenshots des pages
- **Storybook** pour tester les composants isolés
- **pixelmatch** (optionnel) pour comparer les images

### Seuils de tolérance configurés

| Paramètre       | Valeur   | Description                              |
| --------------- | -------- | ---------------------------------------- |
| `threshold`     | 0.2%     | Pourcentage maximal de pixels différents |
| `maxDiffPixels` | 100      | Nombre maximal de pixels différents      |
| `animations`    | disabled | Animations désactivées pour la cohérence |

## Architecture

```
tests/regression/
├── visual.spec.ts          # Tests Playwright pour les screenshots
├── snapshots/              # Baselines des screenshots (Git LFS)
│   ├── home-desktop.png
│   ├── home-mobile.png
│   └── ...
└── README.md              # Cette documentation

scripts/
└── visual-regression.js   # Script de comparaison et rapport

.github/workflows/
└── visual.yml             # CI/CD pour les tests visuels
```

## Configuration

### Prérequis

```bash
# Installer les dépendances
npm install

# Installer les navigateurs Playwright
npx playwright install chromium

# Optionnel: installer pixelmatch pour une comparaison avancée
npm install --save-dev pixelmatch pngjs
```

### Configuration Playwright

Les tests utilisent la configuration existante dans [`playwright.config.ts`](../../playwright.config.ts) avec des ajustements spécifiques pour les tests visuels :

```typescript
// tests/regression/visual.spec.ts
const VISUAL_CONFIG = {
  threshold: 0.2, // 0.2% de différence maximale
  maxDiffPixels: 100, // Maximum 100 pixels différents
  animations: 'disabled', // Désactiver les animations
};
```

## Utilisation

### Lancer tous les tests visuels

```bash
npm run test:visual
```

### Lancer avec mise à jour des baselines

```bash
npm run test:visual:update
```

### Lancer un test spécifique

```bash
npx playwright test tests/regression/visual.spec.ts -g "Home page"
```

### Générer le rapport HTML

```bash
node scripts/visual-regression.js --report
```

Le rapport sera généré dans `visual-regression-report/index.html`.

## Workflow de review

### 1. Développement local

Avant de pousser vos changements :

```bash
# Lancer les tests visuels
npm run test:visual

# Si des différences sont détectées
# 1. Examiner le rapport: visual-regression-report/index.html
# 2. Si les changements sont intentionnels:
npm run test:visual:update
```

### 2. Pull Request

Lors d'une PR, le workflow CI exécute automatiquement les tests visuels :

1. Les screenshots sont comparés avec les baselines
2. Si des différences sont détectées, un commentaire est ajouté à la PR
3. Les artifacts contiennent le rapport détaillé

### 3. Examen des résultats

1. Télécharger l'artifact `visual-test-results`
2. Ouvrir `visual-regression-report/index.html`
3. Comparer les images baseline/actual/diff

### 4. Approbation des changements

Si les changements sont intentionnels :

**Option A - Via GitHub CLI :**

```bash
gh workflow run visual.yml -f update_baselines=true
```

**Option B - Via l'interface GitHub :**

1. Aller dans l'onglet "Actions"
2. Sélectionner "Visual Regression Tests"
3. Cliquer "Run workflow"
4. Cocher "Mettre à jour les baselines"

## Mettre à jour les baselines

### Scénarios nécessitant une mise à jour

- Nouvelle fonctionnalité avec nouvelle UI
- Refactoring visuel intentionnel
- Correction de bug visuel
- Mise à jour de dépendances affectant le rendu

### Méthodes de mise à jour

**1. Localement (développement) :**

```bash
npm run test:visual:update
```

**2. Via le script :**

```bash
node scripts/visual-regression.js --update
```

**3. Via CI/CD :**

```bash
gh workflow run visual.yml -f update_baselines=true --ref <branch-name>
```

### Bonnes pratiques

- Ne mettez à jour les baselines que sur votre branche de travail
- Ne committez pas de baselines sans les avoir revues
- Documentez les changements visuels importants dans la PR

## Ignorer des différences intentionnelles

### Masquer les éléments non déterministes

Dans vos composants, utilisez les attributs `data-testid` pour masquer les éléments variables :

```tsx
// Éléments à masquer dans les screenshots
<span data-testid="timestamp">{new Date().toLocaleString()}</span>
<span data-testid="random-id">{generateId()}</span>
```

Le test les masque automatiquement :

```typescript
await page.addStyleTag({
  content: `
    [data-testid="timestamp"],
    [data-testid="date"],
    [data-testid="random-id"] {
      visibility: hidden !important;
    }
  `,
});
```

### Désactiver les animations

Les animations sont automatiquement désactivées dans les tests :

```typescript
test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    `,
  });
});
```

### Ignorer des zones spécifiques

Pour ignorer une zone spécifique d'un screenshot :

```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('.dynamic-content')],
  threshold: 0.2,
  maxDiffPixels: 100,
});
```

## Dépannage

### Screenshots instables

**Problème :** Les tests échouent aléatoirement

**Solutions :**

1. Augmenter le délai d'attente :

   ```typescript
   await page.waitForTimeout(1000);
   ```

2. Attendre le chargement complet :

   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. Masquer les éléments instables :
   ```typescript
   await page.addStyleTag({
     content: '.unstable-element { visibility: hidden !important; }',
   });
   ```

### Différences de rendu entre OS

**Problème :** Les screenshots diffèrent entre macOS/Linux/Windows

**Solutions :**

1. Utiliser Docker pour la cohérence :

   ```bash
   docker run --rm -v $(pwd):/app -w /app mcr.microsoft.com/playwright:v1.40.0-jammy npm run test:visual
   ```

2. Configurer la CI comme source de vérité
3. Utiliser Git LFS pour stocker les baselines

### Taille des fichiers

**Problème :** Les baselines prennent trop de place

**Solutions :**

1. Utiliser Git LFS :

   ```bash
   git lfs track "tests/regression/snapshots/**/*.png"
   ```

2. Comprimer les images avant commit
3. Ne stocker que les screenshots essentiels

### Tests lents

**Problème :** Les tests visuels prennent trop de temps

**Solutions :**

1. Paralléliser les tests :

   ```bash
   npx playwright test --workers=4
   ```

2. Réduire le nombre de viewports testés
3. Utiliser `@playwright/test` avec sharding en CI

## Ressources

- [Documentation Playwright - Screenshots](https://playwright.dev/docs/screenshots)
- [Documentation Playwright - Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Storybook - Visual Testing](https://storybook.js.org/docs/react/writing-tests/visual-testing)
- [Chromatic Documentation](https://www.chromatic.com/docs/)

## Contribution

Pour ajouter de nouveaux tests visuels :

1. Créer un nouveau fichier `.spec.ts` dans `tests/regression/`
2. Suivre la structure existante dans `visual.spec.ts`
3. Ajouter les masques pour les éléments non déterministes
4. Documenter le test dans ce README

---

**Note :** Ces tests sont exécutés automatiquement dans la CI. Assurez-vous que vos changements passent les tests visuels avant de merger.
