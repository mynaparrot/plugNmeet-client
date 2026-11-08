import { defineConfig } from 'vitest/config';

/*
 * Minimal Vitest config for this package.
 *
 * Tests only come from dedicated `__tests__` directories, so one-off scratch
 * files created during development can never be picked up by the normal test
 * script.
 */
export default defineConfig({
  root: import.meta.dirname,
  // vite.config defines this at build time; tests importing app modules need it.
  // Keep it true so stores skip the (browser-only) devtools compose step.
  define: { IS_PRODUCTION: 'true' },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    reporters: 'verbose',
  },
});
