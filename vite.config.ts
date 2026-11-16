import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(here('./package.json'), 'utf8')) as { version: string };

// BASE_PATH is set by the Pages workflow (/FormReady/); local builds serve from /.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'FormReady',
        short_name: 'FormReady',
        description:
          'Fix your photo, signature and PDF to exam and government portal specs on your own device.',
        theme_color: '#c2410c',
        background_color: '#faf7f1',
        display: 'standalone',
        start_url: process.env.BASE_PATH ?? '/',
        lang: 'en',
        categories: ['utilities', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything is precached so the app works fully offline after one visit.
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,json,mjs}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      $lib: here('./src/lib'),
      $ui: here('./src/ui'),
      $specs: here('./specs'),
      $workers: here('./src/workers'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  optimizeDeps: {
    // These ship WASM next to their JS; pre-bundling would break the relative URLs.
    exclude: ['@jsquash/jpeg', '@jsquash/png'],
  },
  worker: {
    format: 'es',
  },
});
