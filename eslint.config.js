const js = require('@eslint/js');
const globals = require('globals');
const reactHooks = require('eslint-plugin-react-hooks');
const reactRefresh = require('eslint-plugin-react-refresh');
const tsEslint = require('typescript-eslint');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = tsEslint.config(
    {ignores: ['dist']},
    {
        extends: [
            js.configs.recommended,
            ...tsEslint.configs.recommended,
            eslintPluginPrettierRecommended,
        ],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parser: tsEslint.parser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
            'react-refresh/only-export-components': 'warn',
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
);
