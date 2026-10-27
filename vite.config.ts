import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/*============================================================================*\
  vite.config.ts — [แก้รอบนี้]
   1. ถอดปลั๊กอิน tailwindcss ออก — ติดตั้งไว้และ import ใน index.css แล้ว
      แต่แทบไม่มีที่ไหนในโปรเจกต์ใช้ utility class จริง กลายเป็นน้ำหนักเปล่า
      ในไปป์ไลน์ build และทำให้คนที่เข้ามาใหม่สับสนว่าตกลงใช้ระบบไหน
   2. เพิ่ม proxy /api → backend ตอนพัฒนา แก้ปัญหา CORS ตั้งแต่วันแรกที่ต่อ API
   3. แยก vendor chunk — ไม่ให้ React/framer-motion/react-query ปนอยู่ในไฟล์เดียว
      กับโค้ดแอป ทำให้ผู้ใช้เดิมไม่ต้องดาวน์โหลด vendor ใหม่ทุกครั้งที่ deploy
\*============================================================================*/

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },

  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
    strictPort: true,
    proxy: {
      // ระหว่างพัฒนา ให้เรียก /api/... ได้ตรงๆ โดยไม่ติด CORS
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
  },

  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Rolldown (ที่ Vite 8 ใช้อยู่) ไม่รองรับ manualChunks แบบ object เหมือน Rollup
        // เดิม ต้องใช้ codeSplitting.groups แทน — ดู https://rolldown.rs/in-depth/manual-code-splitting
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules\/(react|react-dom|react-router-dom)\// },
            { name: 'vendor-motion', test: /node_modules\/framer-motion\// },
            { name: 'vendor-query', test: /node_modules\/@tanstack\/react-query\// },
          ],
        },
      },
    },
    // เตือนเมื่อ chunk ไหนใหญ่เกิน 500KB — งบโหลดครั้งแรกทั้งแอปควรอยู่ใต้ 3MB
    chunkSizeWarningLimit: 500,
  },
})