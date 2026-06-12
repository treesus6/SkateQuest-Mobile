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
      // RN + Supabase patterns legitimately require `any` in many places
      '@typescript-eslint/no-explicit-any': 'off',
      // useEffect deps with animation refs / fetch callbacks cause infinite loops if naively added
      'react-hooks/exhaustive-deps': 'off',
      // Unused vars: warn with underscore-prefix escape hatch
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      // Console: only warn/error allowed
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Array type: enforce T[] style
      '@typescript-eslint/array-type': ['warn', { default: 'array' }],
      // Display name: warn
      'react/display-name': 'warn',
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
