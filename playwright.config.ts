import { defineConfig, devices } from '@playwright/test'

/*  เทสต์บนเบราว์เซอร์จริง (screenshot + วัดเวลา) — ใช้ Chrome ที่ติดตั้งในเครื่อง (channel: 'chrome')
    ไม่ต้องดาวน์โหลดเบราว์เซอร์ของ Playwright · รัน: npm run test:e2e
    ภาพอ้างอิงอยู่ที่ e2e/__screenshots__ — อัปเดตเมื่อตั้งใจเปลี่ยนหน้าตา: npm run test:e2e -- --update-snapshots */
const PORT = 5299

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.pw.ts',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  timeout: 90_000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, channel: 'chrome' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' }, grepInvert: /มือถือ/ },
    // จำลองมือถือ (จอเล็ก + ความละเอียดสูง + สัมผัส) — ใช้เฉพาะเทสต์วัดเวลา
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' }, grep: /มือถือ/ },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/dev/generated-map`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PORT: String(PORT) },
  },
})
