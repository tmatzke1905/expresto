// eslint.config.cjs - minimal flat config for expresto-server

const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  //
  // 1. Globale Ignores (entspricht .eslintrc ignorePatterns)
  //
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  //
  // 2. Hauptkonfiguration für alle TS/JS-Dateien
  //
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      //
      // TS-Plugin recommended
      //
      ...tsPlugin.configs.recommended.rules,

      //
      // Deine individuellen Regeln
      //
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // kein require() mehr
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='require']",
          message: 'Use import instead of require for ESM compatibility and tree shaking',
        },
      ],
    },
  },

  //
  // 3. Overrides für .d.ts (Deklarationsdateien)
  //
  {
    files: ['**/*.d.ts'],
    rules: {},
  },
];
