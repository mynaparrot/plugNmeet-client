import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tsEslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['dist/', '**/node_modules/', '.git/'],
  },
  // Spread the recommended configs for a flat, modern structure
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  // Ensure prettier is last so it can override other formatting rules
  prettierRecommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parser: tsEslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off', // Kept from original config
    },
  },
]);
