/* eslint-disable no-undef */
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'coverage/**',
      'dist/**',
      'website/**',
      'scripts/**',
      '.claude/**',
      'metro.config.js',
      '*.d.ts',
    ],
  },

  // Main app config
  ...compat.extends('expo', 'plugin:@typescript-eslint/recommended'),

  {
    rules: {
      // RN + Supabase legitimately need `any` in many places (navigation params, DB responses)
      '@typescript-eslint/no-explicit-any': 'off',
      // Animation refs and fetch callbacks in useEffect deps cause infinite loops if naively added
      'react-hooks/exhaustive-deps': 'off',
      // Unused vars: warn with underscore-prefix escape hatch for both vars and args
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-require-imports': 'off',
      // Console: only warn/error allowed (no console.log)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Display name not required in RN (DevTools behave differently than web React)
      'react/display-name': 'off',
      // Array type: off for now (Array<T> vs T[] is stylistic, not a bug)
      '@typescript-eslint/array-type': 'off',
    },
  },

  // Test files — relax rules
  {
    files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/jest.setup.*', '**/jest.config.*'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
];
