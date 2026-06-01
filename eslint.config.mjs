import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        MediCard: 'writable'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-redeclare': 'warn',
      'no-prototype-builtins': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-irregular-whitespace': 'error'
    }
  },
  {
    files: ['tools/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        MediCard: 'readonly'
      }
    }
  },
  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.vitest,
        MediCard: 'writable'
      }
    }
  },
  {
    files: ['src/**/*.js'],
    rules: {
      'no-unused-vars': 'off',
      'no-redeclare': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.claude/**',
      '**/*.min.js',
      'coverage/**'
    ]
  }
];
