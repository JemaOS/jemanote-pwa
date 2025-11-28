# Déploiement sur Vercel

Ce document explique comment déployer l'application Jemanote sur Vercel en mode production.

Prérequis
- Compte Vercel (https://vercel.com)
- Node.js et npm installés
- (Optionnel) CLI Vercel (`npm i -g vercel`)

Étapes rapides (CLI)

1. Installer les dépendances:

```bash
cd jemanote-pwa
npm install
```

2. Construire l'application localement (optionnel pour test):

```bash
npm run build
# Le dossier de sortie est `dist`
```

3. Déployer avec Vercel (connexion si nécessaire):

```bash
vercel login
vercel --prod
```

Étapes via Git (recommandé)
1. Pousser votre repo sur GitHub/GitLab/Bitbucket.
2. Dans Vercel, connecter le dépôt et sélectionner le projet.
3. Vercel détecte un projet Vite et utilisera `npm run build`. Si ce n'est pas le cas, configurez la commande de build sur `npm run build` et le dossier de sortie sur `dist`.

Remarques PWA
- Le plugin `vite-plugin-pwa` est déjà configuré dans `vite.config.ts`. Assurez-vous que les fichiers d'icônes (`icon-192.png`, `icon-512.png`) sont présents dans `public/` ou `src/` selon votre configuration.
- Pour que Chrome/Edge affiche le bouton "Installer" dans la barre d'URL, il faut :
  - que le site soit servi en HTTPS et ait un manifest valide (le plugin gère ça),
  - que la page soit servie avec un Service Worker actif (le plugin configure un SW en build). Vercel fournit HTTPS par défaut.

Problèmes courants
- Icônes manquantes: vérifiez `public/` pour `icon-192.png` et `icon-512.png`.
- Le bouton d'installation n'apparaît pas immédiatement: ouvrez DevTools > Application > Service Workers pour vérifier que le SW est actif. Rechargez la page deux fois.

Si vous voulez, je peux :
- Configurer automatiquement `vercel.json` (déjà ajouté),
- Vérifier la présence des icônes PWA, ou
- Lancer les commandes (vous devrez les exécuter localement).