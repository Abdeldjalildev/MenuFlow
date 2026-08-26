import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Context modules intentionally export context objects/hooks alongside providers.
  // Fast Refresh's component-only export rule is not applicable to these modules.
  {
    files: ['src/context/*.ts', 'src/context/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
