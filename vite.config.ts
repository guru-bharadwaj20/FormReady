import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// BASE_PATH is set by the Pages workflow (/FormReady/); local builds serve from /.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte()],
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
