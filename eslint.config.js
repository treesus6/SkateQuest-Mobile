import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import expoConfig from 'eslint-config-expo/index.js';

export default [
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'coverage/',
      'dist/',
      'website/public/js/*',
      'website/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  expoConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
