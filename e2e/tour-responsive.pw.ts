import { expect, test, type Page } from '@playwright/test'

/*  ทัวร์สอนใช้งานต้องใช้ได้ทุกขนาดจอ: มือถือ (แนวตั้ง/เล็ก/แนวนอน) · iPad (แนวตั้ง/แนวนอน) · โน้ตบุ๊ค
    ทุกขั้นของทัวร์หน้า Home + หน้าต้นไม้เพื่อน + บัวรดน้ำ: กล่องข้อความและปุ่มทั้ง 3 ต้องอยู่ในจอทั้งหมด
    ภาพของทุกขั้นเก็บไว้ที่ test-results/tour-sizes/ ไว้เปิดดูด้วยตา */
const SIZES = [
  { name: 'iphone-se', width: 375, height: 667, touch: true },
  { name: 'iphone-pro-max', width: 430, height: 932, touch: true },
  { name: 'android', width: 412, height: 915, touch: true },
  { name: 'android-small', width: 360, height: 640, touch: true },
  { name: 'phone-landscape', width: 844, height: 390, touch: true },
  { name: 'ipad', width: 820, height: 1180, touch: true },
  { name: 'ipad-landscape', width: 1180, height: 820, touch: true },
  { name: 'laptop', width: 1366, height: 768, touch: false },
]

async function expectInViewport(page: Page, label: string) {
  const vp = page.viewportSize()!
  for (const sel of ['.bloom-tour', '.bloom-tour__btn--next', '.bloom-tour__btn--back', '.bloom-tour__skip']) {
    const box = await page.locator(sel).boundingBox()
    expect(box, `${label} ${sel}`).not.toBeNull()
    const b = box!
    expect(b.x >= -1 && b.y >= -1 && b.x + b.width <= vp.width + 1 && b.y + b.height <= vp.height + 1, `${label} ${sel} อยู่นอกจอ ${JSON.stringify(b)}`).toBe(true)
  }
}

/** เดินทัวร์ที่เปิดอยู่จนจบ ตรวจทุกขั้น คืนรายชื่อหัวข้อที่เจอ */
async function walkTour(page: Page, label: string) {
  const tour = page.locator('.bloom-tour')
  const titles: string[] = []
  for (let i = 0; i < 30 && await tour.isVisible(); i++) {
    await page.waitForTimeout(450)
    titles.push((await tour.locator('.bloom-tour__title').textContent()) ?? '')
    await expectInViewport(page, `${label} ขั้น ${i + 1}`)
    await page.screenshot({ path: `test-results/tour-sizes/${label}-${String(i + 1).padStart(2, '0')}.png` })
    await tour.locator('.bloom-tour__btn--next').click()
  }
  await expect(tour).toBeHidden()
  return titles
}

// แต่ละจอเดินทัวร์ครบ 4 ชุด (~1-2 นาที) เกินค่าเริ่มต้น 90 วินาทีของโปรเจกต์
test.describe.configure({ timeout: 240_000 })

for (const size of SIZES) {
  test(`ทัวร์ใช้ได้บนจอ ${size.name} (${size.width}x${size.height})`, async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL, viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch && size.width < 900 })
    const page = await ctx.newPage()
    const tour = page.locator('.bloom-tour')

    await page.goto('/login')
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
    await expect(tour).toBeVisible({ timeout: 15_000 })
    await walkTour(page, `${size.name}-mbti`)
    await page.locator('.mbti-select-card').first().click()

    await expect(tour).toBeVisible({ timeout: 60_000 })
    const homeTitles = await walkTour(page, `${size.name}-home`)
    expect(homeTitles).toContain('จัดอันดับ')

    // ไปบ้านเพื่อน "พงศ์พล" (เพื่อนตั้งต้นของบัญชีทดสอบ) จากกระดานจัดอันดับ — จอเล็กต้องกางกระดานก่อน
    const toggle = page.locator('[data-tour="home-leaderboard-toggle"]')
    if (await toggle.count()) await toggle.click()
    await page.locator('.dashboard__panel--left').getByText('พงศ์พล').first().click()

    await expect(tour).toBeVisible({ timeout: 15_000 })
    const friendTitles = await walkTour(page, `${size.name}-friend`)
    expect(friendTitles).toContain('รดน้ำให้เพื่อน 💧')

    // แตะหยดน้ำ → บัวโผล่ → ทัวร์ "แตะบัวเพื่อเทน้ำ"
    await page.locator('[data-tour="friend-water"]').click()
    await expect(tour).toBeVisible({ timeout: 15_000 })
    await expect(tour.locator('.bloom-tour__title')).toContainText('แตะบัว')
    await walkTour(page, `${size.name}-can`)
    await ctx.close()
  })
}
