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
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    reporters: 'verbose',
  },
});
