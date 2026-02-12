# Tests de Performance

Ce dossier contient tous les tests de performance pour l'application Jemanote PWA.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Budgets de performance](#budgets-de-performance)
- [Métriques Web Vitals](#métriques-web-vitals)
- [Comment exécuter les tests](#comment-exécuter-les-tests)
- [Interprétation des résultats](#interprétation-des-résultats)
- [Optimisation](#optimisation)
- [CI/CD](#cicd)

## Vue d'ensemble

Les tests de performance sont organisés en plusieurs catégories :

| Fichier | Description |
|---------|-------------|
| [`lighthouse.spec.ts`](./lighthouse.spec.ts) | Audits Lighthouse automatisés |
| [`bundle.spec.ts`](./bundle.spec.ts) | Tests de taille des bundles |
| [`memory.spec.ts`](./memory.spec.ts) | Tests de consommation mémoire |
| [`rendering.spec.ts`](./rendering.spec.ts) | Tests de temps de rendu |
| [`interaction.spec.ts`](./interaction.spec.ts) | Tests d'interactions (INP, FID) |

## Budgets de performance

### Core Web Vitals

| Métrique | Budget | Description |
|----------|--------|-------------|
| **FCP** (First Contentful Paint) | < 1.8s | Premier contenu visible |
| **LCP** (Largest Contentful Paint) | < 2.5s | Plus grand contenu visible |
| **TTI** (Time to Interactive) | < 3.8s | Temps d'interactivité |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Stabilité visuelle |
| **TBT** (Total Blocking Time) | < 200ms | Temps de blocage |
| **FID** (First Input Delay) | < 100ms | Délai première interaction |
| **INP** (Interaction to Next Paint) | < 200ms | Réactivité interactions |
| **TTFB** (Time to First Byte) | < 600ms | Temps de réponse serveur |

### Budgets de bundle

| Type | Budget (gzipped) | Description |
|------|------------------|-------------|
| **JavaScript total** | < 300 KB | Tous les fichiers JS |
| **CSS total** | < 50 KB | Tous les fichiers CSS |
| **Bundle total** | < 500 KB | Tous les assets |
| **HTML** | < 50 KB | Fichier index.html |

### Budgets mémoire

| Métrique | Budget | Description |
|----------|--------|-------------|
| **Heap initial** | < 50 MB | Mémoire après chargement |
| **Heap de pic** | < 150 MB | Mémoire maximale |
| **Croissance** | < 30 MB | Augmentation entre navigations |

## Métriques Web Vitals

### Qu'est-ce que les Web Vitals ?

Les Web Vitals sont un ensemble de métriques essentielles pour quantifier l'expérience utilisateur sur le web.

#### Core Web Vitals (3 métriques principales)

1. **LCP (Largest Contentful Paint)**
   - Mesure le temps de chargement du plus grand élément visible
   - **Bon** : < 2.5s | **À améliorer** : < 4s | **Mauvais** : > 4s
   - Optimisation : optimiser les images, utiliser le préchargement

2. **FID (First Input Delay)** → remplacé par INP
   - Mesure le délai avant le traitement de la première interaction
   - **Bon** : < 100ms | **À améliorer** : < 300ms | **Mauvais** : > 300ms
   - Optimisation : réduire le JavaScript, découper les longues tâches

3. **CLS (Cumulative Layout Shift)**
   - Mesure les déplacements visuels inattendus
   - **Bon** : < 0.1 | **À améliorer** : < 0.25 | **Mauvais** : > 0.25
   - Optimisation : définir les dimensions des images, éviter les insertions dynamiques

#### INP (Interaction to Next Paint) - Nouveau

- Remplace FID comme Core Web Vital
- Mesure la latence de toutes les interactions
- **Bon** : < 200ms | **À améliorer** : < 500ms | **Mauvais** : > 500ms

### Autres métriques importantes

- **FCP** : Premier contenu peint
- **TTFB** : Temps de réponse initial
- **TBT** : Temps de blocage total
- **Speed Index** : Vitesse d'affichage visuel

## Comment exécuter les tests

### Prérequis

```bash
# Installer les dépendances
npm install

# Installer Playwright
npx playwright install chromium

# Build l'application
npm run build
```

### Exécuter tous les tests de performance

```bash
# Via Playwright
npx playwright test tests/performance/ --project=chromium

# Avec UI
npx playwright test tests/performance/ --ui

# En mode debug
npx playwright test tests/performance/ --debug
```

### Exécuter des tests spécifiques

```bash
# Tests Lighthouse
npx playwright test tests/performance/lighthouse.spec.ts

# Tests de bundle
npx playwright test tests/performance/bundle.spec.ts

# Tests mémoire
npx playwright test tests/performance/memory.spec.ts

# Tests de rendu
npx playwright test tests/performance/rendering.spec.ts

# Tests d'interaction
npx playwright test tests/performance/interaction.spec.ts
```

### Lighthouse CI

```bash
# Installer LHCI
npm install -g @lhci/cli

# Exécuter
lhci autorun
```

### Analyse de bundle

```bash
# Générer l'analyse
ANALYZE=true npm run build

# Ou via script
npm run analyze
```

### Benchmark

```bash
# Exécuter le benchmark
node scripts/benchmark.js

# Avec comparaison
node scripts/benchmark.js --compare

# Mode verbeux
node scripts/benchmark.js --verbose
```

## Interprétation des résultats

### Rapport Lighthouse

Le rapport Lighthouse génère des scores de 0 à 100 :

| Score | Interprétation |
|-------|----------------|
| 90-100 | 🟢 Excellent |
| 50-89 | 🟡 À améliorer |
| 0-49 | 🔴 Médiocre |

### Métriques de bundle

```
✅ Tous les bundles respectent les budgets
⚠️  Certains bundles approchent la limite
❌ Un ou plusieurs bundles dépassent le budget
```

### Tests mémoire

Un test mémoire réussi signifie :
- Pas de fuites mémoire détectées
- Croissance mémoire < 30MB entre navigations
- Nombre de nœuds DOM stable

### Tests de rendu

Objectif : maintenir 60fps (16.67ms par frame)

```
✅ > 55fps : Excellent
⚠️  30-55fps : Acceptable mais à surveiller
❌ < 30fps : Nécessite optimisation
```

## Optimisation

### Si FCP/LCP est trop élevé

1. **Optimiser les images**
   ```bash
   # Utiliser des formats modernes (WebP, AVIF)
   # Compresser les images
   # Utiliser le lazy loading
   ```

2. **Précharger les ressources critiques**
   ```html
   <link rel="preload" href="critical.css" as="style">
   <link rel="preload" href="font.woff2" as="font" crossorigin>
   ```

3. **Réduire le CSS critique**
   - Extraire le CSS critique inline
   - Charger le reste de manière asynchrone

### Si CLS est trop élevé

1. **Définir les dimensions des images**
   ```html
   <img src="photo.jpg" width="800" height="600" alt="Description">
   ```

2. **Réserver l'espace pour les éléments dynamiques**
   ```css
   .dynamic-content {
     min-height: 200px;
   }
   ```

3. **Éviter les insertions au-dessus du contenu existant**

### Si le bundle est trop gros

1. **Code splitting**
   ```typescript
   // Utiliser React.lazy pour le chargement différé
   const GraphView = React.lazy(() => import('./GraphView'));
   ```

2. **Tree shaking**
   - Utiliser les imports nommés
   - Éviter les imports globaux de libraries

3. **Analyser le bundle**
   ```bash
   npm run analyze
   # Chercher les dépendances non utilisées
   # Identifier les doublons
   ```

### Si INP/FID est élevé

1. **Réduire le JavaScript principal**
   - Décaler le code non critique
   - Utiliser `requestIdleCallback`

2. **Découper les longues tâches**
   ```typescript
   // Mauvais : blocage long
   heavyComputation();
   
   // Bon : découpé
   await scheduler.yield();
   heavyComputationPart1();
   await scheduler.yield();
   heavyComputationPart2();
   ```

3. **Utiliser les Web Workers**
   ```typescript
   const worker = new Worker('./heavy-worker.js');
   worker.postMessage(data);
   ```

### Si la mémoire fuit

1. **Nettoyer les event listeners**
   ```typescript
   useEffect(() => {
     const handler = () => { /* ... */ };
     window.addEventListener('scroll', handler);
     
     return () => {
       window.removeEventListener('scroll', handler);
     };
   }, []);
   ```

2. **Annuler les requêtes en cours**
   ```typescript
   useEffect(() => {
     const controller = new AbortController();
     fetch('/api/data', { signal: controller.signal });
     
     return () => controller.abort();
   }, []);
   ```

3. **Éviter les closures qui capturent de gros objets**

## CI/CD

Les tests de performance sont exécutés automatiquement via GitHub Actions :

### Workflows

- **`.github/workflows/performance.yml`** : Tests complets sur chaque PR

### Jobs

1. **lighthouse-ci** : Audits Lighthouse
2. **bundle-size** : Analyse de la taille du bundle
3. **performance-budget** : Tests Playwright de performance
4. **benchmark** : Benchmarks de build et démarrage
5. **performance-report** : Génération de rapport consolidé

### Seuils d'échec

Un job échoue si :
- Lighthouse score < 85
- Bundle size > 500KB
- Tests Playwright échouent
- Régression de performance > 10%

### Artefacts

Tous les rapports sont conservés comme artefacts :
- Rapports Lighthouse
- Analyses de bundle
- Résultats des tests Playwright
- Rapports de benchmark

## Ressources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Playwright](https://playwright.dev/)
- [Bundle Analysis](https://webpack.js.org/guides/code-splitting/)

## Support

Pour toute question concernant les tests de performance :
1. Consulter les logs d'erreur détaillés
2. Vérifier les artefacts de la CI
3. Exécuter les tests localement avec `--debug`
