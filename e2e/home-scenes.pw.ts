import { expect, test } from '@playwright/test'

/*  ฉากพื้นหลังหน้า Home ที่วาดด้วยโค้ด (6-8): ภาพนิ่ง (t=2) ไม่เปลี่ยนโดยไม่ตั้งใจ ที่ 3 ขนาดจอ × แดด/ฝน
    + วัดประสิทธิภาพ (เฟรมแรก / ต่อเฟรม / fps) บนเดสก์ท็อป และมือถือ CPU ช้าลง 4 เท่า */

const VPS = [
  { id: 'phone', width: 390, height: 844, scale: 2 },
  { id: 'ipad', width: 1024, height: 768, scale: 1 },
  { id: 'desktop', width: 1440, height: 900, scale: 1 },
] as const

interface Stats { buildMs: number; firstFrameMs: number; frameMs: number; fps: number; bytes: number; dpr: number }
declare global { interface Window { __homeSceneStats?: Record<string, Stats> } }

for (const scene of [3, 4, 5]) {
  for (const weather of scene === 3 ? ['clear', 'rain'] : ['clear']) {
    for (const vp of VPS) {
      test(`ฉาก ${scene} ${weather} ${vp.id} ไม่เปลี่ยนโดยไม่ตั้งใจ`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, reducedMotion: 'reduce' })
        const page = await ctx.newPage()
        await page.goto(`/dev/home-scenes?scene=${scene}&weather=${weather}&vp=${vp.id}&freeze=2&tree=0`)
        await page.waitForSelector('[data-ready="1"]')
        await page.waitForTimeout(300)
        await expect(page).toHaveScreenshot(`home-scene${scene}-${weather}-${vp.id}.png`, { maxDiffPixelRatio: 0.003 })
        await ctx.close()
      })
    }
  }
}

async function measure(page: import('@playwright/test').Page, vp: string, throttle: number) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })
  await page.goto(`/dev/home-scenes?scene=3&weather=rain&vp=${vp}&tree=0`)
  await page.waitForSelector('[data-ready="1"]')
  await page.waitForFunction((id) => (window.__homeSceneStats?.[id]?.fps ?? 0) > 0, vp, { timeout: 20_000 })
  await page.waitForTimeout(2500)
  const s = await page.evaluate((id) => window.__homeSceneStats![id], vp)
  console.log(`[home-scene-perf] ${JSON.stringify({ vp, throttle, ...s }, (_, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v))}`)
  test.info().annotations.push({ type: 'perf', description: JSON.stringify(s) })
  return s
}

test('วัดเวลาฉาก: เดสก์ท็อป', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const s = await measure(page, 'desktop', 1)
  expect(s.fps).toBeGreaterThanOrEqual(50)
})

// รันใน project "phone" (Pixel 7) เท่านั้น — ดู playwright.config.ts
test('วัดเวลาฉาก: มือถือ (Pixel 7) CPU ช้าลง 4 เท่า', async ({ page }) => {
  const s = await measure(page, 'phone', 4)
  expect(s.firstFrameMs).toBeLessThan(800)
  expect(s.fps).toBeGreaterThanOrEqual(30)
})
