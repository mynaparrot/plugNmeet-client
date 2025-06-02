import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks"
import tsEslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig([
    {
        ignores: ['dist/', '**/node_modules/', '.git/'],
        extends: [
            js.configs.recommended,
            tsEslint.configs.recommended,
            prettierRecommended,
        ],
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            globals: globals.browser,
            parser: tsEslint.parser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            'react-hooks': reactHooks
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'off',
            'prettier/prettier': [
                'error',
                {
                    'singleQuote': true,
                    'semi': true,
                    'tabWidth': 2,
                    'bracketSpacing': true,
                    'trailingComma': 'all',
                    'arrowParens': 'always',
                    'endOfLine': 'auto',
                },
            ],
        },
    },
]);
