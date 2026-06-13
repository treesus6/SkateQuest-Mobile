/* eslint-disable no-undef */
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: [
      'node_modules/**', '.expo/**', 'coverage/**', 'dist/**',
      'website/**', 'scripts/**', '.claude/**', 'metro.config.js', '*.d.ts',
    ],
  },

  ...compat.extends('expo', 'plugin:@typescript-eslint/recommended'),

  {
    rules: {
      // RN + Supabase legitimately need `any` (navigation params, DB responses)
      '@typescript-eslint/no-explicit-any': 'off',
      // Animation refs and fetch callbacks cause infinite loops if deps naively added
      'react-hooks/exhaustive-deps': 'off',
      // Unused vars: allow underscore-prefix escape hatch
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-require-imports': 'off',
      // Only warn/error console calls allowed
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Not required in RN (DevTools behave differently than web)
      'react/display-name': 'off',
      // Stylistic - not a bug
      '@typescript-eslint/array-type': 'off',
      // React Compiler rules - project does not use React Compiler (Forget)
      // These fire false positives on valid RN patterns
      'react-compiler/react-compiler': 'off',
    },
  },

  // Test files
  {
    files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/jest.setup.*', '**/jest.config.*'],
    languageOptions: {
      globals: {
        jest: 'readonly', describe: 'readonly', it: 'readonly',
        expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
        beforeAll: 'readonly', afterAll: 'readonly', test: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'react-compiler/react-compiler': 'off',
    },
  },
];
