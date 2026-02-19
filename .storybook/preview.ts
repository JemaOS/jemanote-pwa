// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#171717',
        },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        laptop: {
          name: 'Laptop',
          styles: {
            width: '1280px',
            height: '800px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
      },
    },
    chromatic: {
      // Configuration pour Chromatic
      delay: 300, // Attendre 300ms pour les animations
      diffThreshold: 0.2, // Seuil de différence en pourcentage
      pauseAnimationAtEnd: true, // Mettre en pause les animations à la fin
    },
    a11y: {
      config: {
        rules: [
          {
            // Désactiver certaines règles si nécessaire
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
  decorators: [
    // Ajouter un décorateur pour simuler le contexte si nécessaire
    Story => {
      // Simuler localStorage pour les stories
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          },
          writable: true,
        });
      }
      return Story();
    },
  ],
};

export default preview;
