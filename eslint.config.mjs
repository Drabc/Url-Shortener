import typescriptParser from '@typescript-eslint/parser'
import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import prettierPlugin from 'eslint-plugin-prettier'
import jestPlugin from 'eslint-plugin-jest'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'eslint.config.js', 'node_modules/*'
  ]),
  {
    files: ['src/**/*.ts'],

    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
        sourceType: 'module',
      },
    },

    plugins: {
      '@typescript-eslint': typescriptPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
      jest: jestPlugin,
    },

    rules: {
      // Bring in each plugin’s recommended rules
      ...typescriptPlugin.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...prettierPlugin.configs.recommended.rules,

      // overrides
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/order': ['error', {
        groups: ['builtin','external','internal','parent','sibling','index'],
        'newlines-between': 'always'
      }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'never'],
    },

    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
])
