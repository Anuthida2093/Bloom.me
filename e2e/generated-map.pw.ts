import { expect, test, type Page } from '@playwright/test'

/*  แผนที่ 9 (วาดด้วยโค้ด): ภาพเหมือนเดิมทุกครั้งต่อ seed + เวลาสร้าง/วาดบนเครื่องช้า (CPU ช้าลง 4 เท่า) */

const SEEDS = [777, 1, 42]

for (const seed of SEEDS) {
  test(`ภาพแผนที่ seed ${seed} ไม่เปลี่ยนโดยไม่ตั้งใจ`, async ({ page }) => {
    await page.goto(`/dev/generated-map?seeds=${seed}&size=512`)
    const canvas = page.locator(`canvas[data-seed="${seed}"]`)
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveScreenshot(`map9-seed-${seed}.png`, { maxDiffPixelRatio: 0.002 })
  })
}

async function measure(page: Page, label: string) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const t0 = Date.now()
  await page.goto('/dev/generated-map?seeds=777&size=64&perf')
  await page.waitForFunction(() => window.__mapArtPerf !== undefined, undefined, { timeout: 60_000 })
  const perf = await page.evaluate(() => window.__mapArtPerf!)
  // first paint ของภาพ = เวลาตั้งแต่เริ่มโหลดหน้าจนได้ภาพพร้อมแสดง
  const result = { label, ...perf, pageToArtMs: Date.now() - t0 }
  console.log(`[map9-perf] ${JSON.stringify(result, (_, v) => (typeof v === 'number' ? Math.round(v) : v))}`)
  test.info().annotations.push({ type: 'perf', description: JSON.stringify(result) })
  return result
}

test('วัดเวลา: เดสก์ท็อป CPU ช้าลง 4 เท่า', async ({ page }) => {
  const r = await measure(page, 'desktop-4x')
  expect(r.mode).toBe('worker')
})

// รันใน project "phone" (Pixel 7) เท่านั้น — ดู playwright.config.ts
test('วัดเวลา: มือถือ (Pixel 7) CPU ช้าลง 4 เท่า', async ({ page }) => {
  const r = await measure(page, 'phone-4x')
  expect(r.mode).toBe('worker')
  expect(r.size).toBeLessThanOrEqual(3072)
})
