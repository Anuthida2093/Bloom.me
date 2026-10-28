import { expect, test, type Page } from '@playwright/test'

/*  มือถือ 375x667: กล่องสถานะรดน้ำไม่ล้นขวา · ไพ่ทิพย์เลื่อนลงได้ · สวิตช์โหมดความเข้มงวดชิดขวา */
test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
test.describe.configure({ timeout: 240_000 })

async function login(page: Page) {
  const tour = page.locator('.bloom-tour')
  const skip = async () => {
    for (let i = 0; i < 6; i++) {
      if (await tour.isVisible()) await tour.locator('.bloom-tour__skip').click()
      await page.waitForTimeout(350)
    }
  }
  await page.goto('/login')
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(tour).toBeVisible({ timeout: 15_000 }); await skip()
  await page.locator('.mbti-select-card').first().click()
  await expect(tour).toBeVisible({ timeout: 60_000 }); await skip()
  return skip
}

test('mobile fixes', async ({ page }) => {
  const skip = await login(page)
  const vw = 375

  // 1) ห้องแชท → กดหยดน้ำมุมขวาบน → กล่องอยู่ในจอ
  await page.locator('[data-tour="nav-story"] a').click(); await skip()
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.locator('.story-sidebar').getByText('แชท', { exact: true }).first().click()
  await page.locator('.story-chat-new__item', { hasText: 'พงศ์พล' }).click()
  await page.locator('.story-chat__head .fw-badge').click()
  const box = (await page.locator('.fw-stats').boundingBox())!
  await page.screenshot({ path: 'test-results/mobile-water-popup.png' })
  expect(box.x).toBeGreaterThanOrEqual(15)
  expect(box.x + box.width).toBeLessThanOrEqual(vw - 15)

  // 2) ไพ่ทิพย์: ใส่อารมณ์วันนี้ใน mock db แล้วเปิดเควส → เปิดไพ่ → เลื่อนลงถึงปุ่มล่างสุด
  await page.evaluate(() => {
    const db = JSON.parse(sessionStorage.getItem('bloom:mock-db')!)
    db.moodEntries = [...(db.moodEntries ?? []), { id: 'm-e2e', userId: db.user.id, category: 'POSITIVE', mood: 'HAPPY', note: null, createdAt: new Date().toISOString() }]
    sessionStorage.setItem('bloom:mock-db', JSON.stringify(db))
  })
  // ทัวร์ของแต่ละหน้าเด้งไม่พร้อมกัน — ซ่อนไว้ระหว่างตรวจเลย์เอาต์ส่วนที่เหลือ
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style')
      st.textContent = '#react-joyride-portal{display:none!important}'
      document.head.appendChild(st)
    })
  })
  await page.goto('/dashboard')
  await page.locator('[data-tour="nav-quests"] a').click()
  await page.locator('.quest-floating-menu button').nth(2).click(); await skip()
  const skipScreening = page.getByRole('button', { name: 'ขอข้ามไว้ก่อน' })
  if (await skipScreening.isVisible().catch(() => false)) { await skipScreening.click(); await skip() }
  await page.locator('.quest-gate-view__row', { hasText: 'ไพ่ทิพย์' }).click(); await skip()
  await page.locator('.oracle-page__deck').click({ force: true })
  await page.waitForTimeout(1500); await page.locator('.oracle-card').first().click({ force: true })
  await page.waitForTimeout(4000)
  const content = page.locator('.oracle-page__content')
  const m = await content.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }))
  console.log('oracle scroll', m)
  await content.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/mobile-oracle-bottom.png' })
  const actions = (await page.locator('.oracle-card__actions').boundingBox())!
  expect(actions.y + actions.height).toBeLessThanOrEqual(667 - 60) // พ้นแถบเมนูล่าง
  await page.locator('.oracle-page__close').click()

  // 3) ตั้งค่า: สวิตช์โหมดความเข้มงวดชิดขวา ข้อความสั้น
  await page.goto('/dashboard'); await skip()
  await page.locator('[data-tour="home-settings"]').click(); await skip()
  const row = page.locator('.settings-toggle-row', { hasText: /^(ปกติ|เข้มงวด)$/ })
  await row.scrollIntoViewIfNeeded()
  const r = (await row.boundingBox())!
  const sw = (await row.locator(':scope > span').last().boundingBox())!
  await page.screenshot({ path: 'test-results/mobile-settings.png' })
  expect(sw.width).toBe(52)
  expect(r.x + r.width - (sw.x + sw.width)).toBeLessThan(24)
  await row.click()
  await expect(row).toHaveText('เข้มงวด')
})
