import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// [แก้] เดิม files: ['**/*.{js,jsx}'] — แต่ทั้งโปรเจกต์เป็น TypeScript ล้วน
// (.ts / .tsx) จึงไม่เคยมีไฟล์ไหนเข้าเงื่อนไขนี้เลยสักไฟล์ ผลคือไม่มีอะไรถูก lint จริง
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
])