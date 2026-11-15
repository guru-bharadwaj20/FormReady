import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      $specs: fileURLToPath(new URL('./specs', import.meta.url)),
      $workers: fileURLToPath(new URL('./src/workers', import.meta.url)),
    },
  },
  test: {
    setupFiles: ['tests/unit/setup-codec.ts'],
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
    },
  },
});
