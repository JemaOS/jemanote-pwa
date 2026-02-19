// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import path from 'node:path';

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import sourceIdentifierPlugin from 'vite-plugin-source-identifier';

const isProd = process.env.BUILD_MODE === 'prod';
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // Don't auto-inject SW registration script - we register manually after page load
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
      },
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Jemanote - Prise de Notes Intelligente',
        short_name: 'Jemanote',
        description:
          'Application de prise de notes professionnelle avec graphe de connaissances et canvas, optimisée pour JemaOS',
        theme_color: '#5a63e9',
        background_color: '#FAFAFA',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        id: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['productivity', 'utilities'],
        shortcuts: [
          {
            name: 'Nouvelle note',
            short_name: 'Nouvelle',
            description: 'Créer une nouvelle note',
            url: '/?action=new',
            icons: [
              {
                src: 'icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'text/markdown': ['.md', '.markdown'],
            },
          },
        ],
      },
    }),
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    }),
    // Plugin de visualisation du bundle (activé uniquement avec ANALYZE=true)
    visualizer({
      open: process.env.ANALYZE === 'true',
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    sourcemap: 'hidden',
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-codemirror': [
            '@codemirror/view',
            '@codemirror/state',
            '@codemirror/commands',
            '@codemirror/lang-markdown',
            '@codemirror/language',
            '@codemirror/autocomplete',
            '@codemirror/search',
            '@codemirror/lint',
            '@codemirror/theme-one-dark',
          ],
          'vendor-ui': ['lucide-react', 'date-fns'],
          'vendor-markdown': [
            'react-markdown',
            'rehype-katex',
            'rehype-raw',
            'remark-gfm',
            'remark-math',
            'katex',
          ],
          'vendor-mermaid': ['mermaid'],
          'vendor-pixi': ['pixi.js'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
