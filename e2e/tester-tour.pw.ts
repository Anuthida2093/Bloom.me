import { expect, test } from '@playwright/test'

/*  บัญชีทดสอบ + ทัวร์สอนใช้งาน: ล็อกอินด้วยค่าที่กรอกไว้ให้ → ทัวร์หน้า MBTI → เลือก MBTI →
    ทัวร์หน้า Home (ย้อนกลับ/ถัดไป/ข้าม) → ข้อมูลทั้งหมดอยู่ใน sessionStorage ไม่แตะ localStorage */
test('tester@bloom.me: กรอกไว้ให้ ล็อกอินได้ทันที ทัวร์เด้งเอง และข้อมูลไม่ลง localStorage', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input').first()).toHaveValue('tester@bloom.me')
  // ค่าตั้งต้น (ภาษา/การตั้งค่า) ที่แอปเขียนลง localStorage ตั้งแต่ยังไม่ล็อกอิน — ไม่ใช่ข้อมูลของผู้ทดสอบ
  await page.waitForTimeout(1000)
  const localBefore = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()

  // บัญชีทดสอบใหม่ยังไม่มี MBTI → ไปหน้าเลือก MBTI และทัวร์หน้านี้เด้งเอง
  await expect(page).toHaveURL(/\/mbti$/)
  const tour = page.locator('.bloom-tour')
  await expect(tour).toBeVisible({ timeout: 10_000 })
  await expect(tour.getByRole('button', { name: 'ย้อนกลับ' })).toBeDisabled()
  await expect(tour.getByRole('button', { name: 'ข้าม' })).toBeVisible()
  await tour.getByRole('button', { name: 'ถัดไป' }).click()
  await expect(tour.locator('.bloom-tour__count')).toHaveText('2/3')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'test-results/tour-mbti.png' })
  await tour.getByRole('button', { name: 'ย้อนกลับ' }).click()
  await expect(tour.locator('.bloom-tour__count')).toHaveText('1/3')
  await tour.getByRole('button', { name: 'ข้าม' }).click()
  await expect(tour).toBeHidden()

  await page.locator('.mbti-select-card').first().click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // ทัวร์หน้า Home รอฉากรับต้นกล้าจบก่อน — เดินจนจบด้วย "ถัดไป"
  await expect(tour).toBeVisible({ timeout: 60_000 })
  await page.screenshot({ path: 'test-results/tour-home-1.png' })
  for (let i = 0; i < 30 && await tour.isVisible(); i++) {
    const btn = tour.locator('.bloom-tour__btn--next')
    if (i === 3) await page.screenshot({ path: 'test-results/tour-home-step.png' })
    await btn.click()
    await page.waitForTimeout(250)
  }
  await expect(tour).toBeHidden()

  const storage = await page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    sessionHasDb: sessionStorage.getItem('bloom:mock-db') !== null,
    seen: sessionStorage.getItem(`bloom:tours-seen:${JSON.parse(sessionStorage.getItem('bloom:mock-db') ?? '{}').user?.id}`),
  }))
  // หลังล็อกอินเป็น tester ไม่มีอะไรถูกเขียนเพิ่ม/เปลี่ยนใน localStorage เลย
  expect(storage.local).toEqual(localBefore)
  expect(storage.sessionHasDb).toBe(true)
  expect(storage.seen).toContain('home')

  // รีโหลด = ยังเป็น tester session เดิม ทัวร์ที่ดูแล้วไม่เด้งซ้ำ
  await page.reload()
  await page.waitForTimeout(3000)
  await expect(tour).toBeHidden()

  // หมวดสุขภาพกาย → ทัวร์ของหมวด → เปิดเควส "น้ำพุหล่อเลี้ยงราก" → ทัวร์ของเควสนั้น
  await page.locator('[data-tour="nav-quests"] a').click()
  await page.locator('.quest-floating-menu button').nth(1).click()
  await expect(tour).toBeVisible({ timeout: 15_000 })
  await expect(tour.locator('.bloom-tour__title')).toContainText('สุขภาพกาย')
  await tour.getByRole('button', { name: 'ข้าม' }).click()
  await page.locator('.quest-gate-view__row', { hasText: 'น้ำพุหล่อเลี้ยงราก' }).click()
  await expect(tour).toBeVisible({ timeout: 15_000 })
  await expect(tour.locator('.bloom-tour__title')).toContainText('ดื่มน้ำ')
  await page.screenshot({ path: 'test-results/tour-quest.png' })
})

/*  ติดตามฝ่ายเดียวก็รดน้ำได้ทันที (ไม่ต้องรอติดตามกลับ) + แจ้งผลหลังรด + หน้าแชท/แผงข้อมูลต้นไม้แสดงหยดน้ำ */
test('ติดตามแล้วรดน้ำได้ทันที · แชทโชว์หยดน้ำ · แผงข้อมูลต้นไม้บอกว่าใครรดน้ำให้', async ({ page }) => {
  test.setTimeout(180_000)
  const tour = page.locator('.bloom-tour')
  const skipTours = async () => {
    for (let i = 0; i < 6; i++) {
      if (await tour.isVisible()) await tour.locator('.bloom-tour__skip').click()
      await page.waitForTimeout(350)
    }
  }
  const closeAlert = async (text: string) => {
    const alert = page.locator('.ui-game-alert')
    await expect(alert).toContainText(text, { timeout: 10_000 })
    await alert.getByRole('button').last().click()
    await expect(alert).toBeHidden()
  }

  await page.goto('/login')
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(tour).toBeVisible({ timeout: 15_000 }); await skipTours()
  await page.locator('.mbti-select-card').first().click()
  await expect(tour).toBeVisible({ timeout: 60_000 }); await skipTours()

  // "ธนาวัฒน์" ยังไม่ได้ติดตามเรา → กดเพิ่มเพื่อนแล้วต้องได้ปุ่มหยดน้ำทันที
  await page.locator('.dashboard__panel--left').getByText('ธนาวัฒน์').first().click()
  await expect(tour).toBeVisible({ timeout: 15_000 }); await skipTours()
  await page.locator('[data-tour="friend-add"]').click()
  await closeAlert('รดน้ำให้ได้เลย')
  await page.locator('[data-tour="friend-water"]').click()
  await skipTours()
  const can = page.locator('.fw-can')
  await expect(can.locator('.fw-can__hint')).toHaveText('แตะเพื่อรดน้ำ')
  await can.click()
  await closeAlert('รดน้ำให้ ธนาวัฒน์ แล้ว')
  await expect(page.locator('[data-tour="friend-water"]')).toHaveAttribute('aria-label', /รอเพื่อนรดกลับ|ฟ้าครึ่ง|รดแล้ว/)

  // "พงศ์พล" เป็นเพื่อนกัน (ติดตามกันทั้งคู่) → รดแล้วเพื่อนจำลองรดกลับ = นับวันต่อเนื่อง
  await page.locator('[data-tour="friend-back"]').click()
  await page.locator('.dashboard__panel--left').getByText('พงศ์พล').first().click()
  await page.locator('[data-tour="friend-water"]').click()
  await skipTours()
  await page.locator('.fw-can').click()
  await expect(page.locator('.ui-game-alert')).toBeVisible({ timeout: 10_000 })
  await page.screenshot({ path: 'test-results/water-alert.png' })
  await page.locator('.ui-game-alert').getByRole('button').last().click()

  // แผงข้อมูลต้นไม้ของเรา: วันนี้ใครรดน้ำให้
  await page.locator('[data-tour="friend-back"]').click()
  await page.locator('[data-tour="home-tree-info"]').click()
  await skipTours()
  await expect(page.locator('.tree-stats-panel')).toContainText('วันนี้ใครรดน้ำให้คุณ')
  await page.screenshot({ path: 'test-results/watered-today.png' })

  // หน้าแชท: รายชื่อมีหยดน้ำ + ในห้องแชทหยดน้ำอยู่มุมขวาบน
  await page.locator('[data-tour="home-tree-info"]').click()
  await page.locator('[data-tour="nav-story"] a').click()
  await skipTours()
  await page.locator('.story-grid-btn', { hasText: 'แชท' }).first().click()
  const friendItem = page.locator('.story-chat-new__item', { hasText: 'พงศ์พล' })
  await expect(friendItem.locator('.fw-chip')).toBeVisible()
  await page.screenshot({ path: 'test-results/chat-list.png' })
  await friendItem.click()
  const head = page.locator('.story-chat__head')
  const badge = head.locator('.fw-badge')
  await expect(badge).toBeVisible()
  const headBox = (await head.boundingBox())!
  const badgeBox = (await badge.boundingBox())!
  expect(headBox.x + headBox.width - (badgeBox.x + badgeBox.width)).toBeLessThan(40) // ชิดขวา
  await page.screenshot({ path: 'test-results/chat-thread.png' })
})
