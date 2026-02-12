/**
 * Lighthouse CI Configuration
 * 
 * Configuration pour les audits de performance automatisés
 * Seuils définis selon les recommandations Core Web Vitals
 * 
 * @see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
 */

module.exports = {
  ci: {
    /**
     * Configuration du serveur de collecte
     */
    collect: {
      // Nombre d'exécutions pour chaque URL (moyenne des résultats)
      numberOfRuns: 3,
      
      // URLs à tester
      url: [
        'http://localhost:5173/',           // Homepage
        'http://localhost:5173/?note=new',  // Editor (nouvelle note)
        'http://localhost:5173/?view=graph', // Graph view
      ],
      
      // Commande pour démarrer le serveur
      startServerCommand: 'npm run preview',
      
      // URL du serveur une fois démarré
      startServerReadyPattern: 'Local.*http',
      
      // Timeout pour le démarrage du serveur (ms)
      startServerReadyTimeout: 60000,
      
      // Paramètres Chrome supplémentaires
      settings: {
        // Émuler un appareil mobile
        emulatedFormFactor: 'mobile',
        // Throttling réseau (4G rapide)
        throttling: {
          rttMs: 150,
          throughputKbps: 1.6 * 1024,
          cpuSlowdownMultiplier: 4,
        },
        // Ignorer les erreurs de certificat en local
        skipAudits: ['uses-http2'],
      },
    },
    
    /**
     * Configuration de l'upload des résultats
     */
    upload: {
      // Type d'upload (temporary pour CI)
      target: 'temporary-public-storage',
      
      // Options GitHub (commentaires de PR)
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
      githubApiHost: 'https://api.github.com/',
    },
    
    /**
     * Configuration des assertions (budgets de performance)
     */
    assert: {
      // Niveau d'assertion
      assertionLevel: 'error',
      
      // Préréglages
      preset: 'lighthouse:recommended',
      
      // Assertions personnalisées
      assertions: {
        // Performance globale
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.90 }],
        'categories:pwa': ['warn', { minScore: 0.70 }],
        
        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // < 2.5s
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],   // < 1.8s
        'total-blocking-time': ['error', { maxNumericValue: 200 }],       // < 200ms
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],   // < 0.1
        'speed-index': ['error', { maxNumericValue: 3400 }],              // < 3.4s
        'interactive': ['error', { maxNumericValue: 3800 }],              // TTI < 3.8s
        
        // Métriques supplémentaires
        'max-potential-fid': ['error', { maxNumericValue: 130 }],         // FID potentiel
        'server-response-time': ['error', { maxNumericValue: 600 }],      // TTFB < 600ms
        
        // Budgets de ressources
        'resource-summary:document:size': ['error', { maxNumericValue: 50000 }],  // HTML < 50KB
        'resource-summary:script:size': ['error', { maxNumericValue: 300000 }],   // JS < 300KB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 50000 }], // CSS < 50KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }],      // Images < 500KB
        'resource-summary:font:size': ['warn', { maxNumericValue: 100000 }],       // Fonts < 100KB
        'resource-summary:total:size': ['error', { maxNumericValue: 500000 }],     // Total < 500KB
        
        // Nombre de requêtes
        'resource-summary:script:count': ['warn', { maxNumericValue: 15 }],
        'resource-summary:total:count': ['warn', { maxNumericValue: 50 }],
        
        // Audits spécifiques
        'render-blocking-resources': 'error',
        'unused-javascript': 'warn',
        'unused-css-rules': 'warn',
        'modern-image-formats': 'warn',
        'efficiently-encode-images': 'warn',
        'uses-responsive-images': 'warn',
        'offscreen-images': 'warn',
        'unminified-javascript': 'error',
        'unminified-css': 'error',
        'uses-text-compression': 'error',
        'uses-optimized-images': 'warn',
        'dom-size': ['error', { maxNumericValue: 800 }],                  // DOM < 800 nodes
        'bootup-time': ['warn', { maxNumericValue: 2000 }],               // Bootup < 2s
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 3500 }], // Main thread < 3.5s
      },
    },
  },
};
