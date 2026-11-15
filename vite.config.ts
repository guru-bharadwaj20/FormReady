import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// BASE_PATH is set by the Pages workflow (/FormReady/); local builds serve from /.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte()],
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
