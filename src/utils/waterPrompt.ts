/*============================================================================*\
  waterPrompt.ts — ธง "ได้หยดน้ำใหม่ที่ยังไม่ได้เห็น" (one-shot) สำหรับแอนิเมชันบัวรดน้ำหน้า Home
  ────────────────────────────────────────────────────────────────────────────
  ตั้งธงเมื่อเควสให้หยดน้ำเพิ่ม (UserContext.updateProfile เห็น waterDrops เพิ่มขึ้น) → กลับมาหน้า Home
  แล้วเล่นบัวรดน้ำครั้งเดียว + ล้างธง — ไม่เล่นทุกครั้งที่เข้าหน้า Home อีก
  [แก้บั๊ก] เดิมผูกกับ waterPulseKey/treeGrowthPulse ใน ProgressContext (อยู่ตลอด) แต่ตัวกันเล่นซ้ำอยู่ใน ref
  ของคอมโพเนนต์ — Dashboard mount ใหม่เมื่อไหร่ ref รีเซ็ต แอนิเมชันเล่นซ้ำทุกครั้ง
  หมายเหตุ: หยดน้ำมีแค่ฝั่งหน้าเว็บ (localStorage แยกตามบัญชี — ดู adapters.ts) backend ไม่มีแนวคิดนี้
\*============================================================================*/

const key = (userId: string) => `bloom:water-unseen:${userId}`

export function markNewWaterDrop(userId: string): void {
  if (!userId) return
  try { window.localStorage.setItem(key(userId), '1') } catch { /* storage ปิด */ }
}

/** คืน true ครั้งเดียวต่อหยดน้ำใหม่ แล้วล้างธงทันที */
export function takeNewWaterDrop(userId: string): boolean {
  if (!userId) return false
  try {
    if (window.localStorage.getItem(key(userId)) !== '1') return false
    window.localStorage.removeItem(key(userId))
    return true
  } catch { return false }
}

/** ดูว่ามีหยดน้ำใหม่ที่ยังไม่ได้เห็นไหม (ไม่ล้างธง) */
export function hasNewWaterDrop(userId: string): boolean {
  if (!userId) return false
  try { return window.localStorage.getItem(key(userId)) === '1' } catch { return false }
}

/** [แก้ตามที่ระบุ] ได้รางวัลหยดน้ำ → Dashboard ปิดทุกหน้าที่เปิดอยู่ กลับหน้า Home แล้วเล่นบัวรดน้ำต้นไม้ทันที */
export const HOME_WATERING_EVENT = 'bloom:home-watering'

export function requestHomeWatering(): void {
  window.dispatchEvent(new CustomEvent(HOME_WATERING_EVENT))
}
