import { appStorage } from './testerSession'

/*============================================================================*\
  tourProgress.ts — จำว่าผู้ใช้ดูทัวร์สอนใช้งานของหน้าไหนไปแล้ว (แยกตามบัญชี)
  ────────────────────────────────────────────────────────────────────────────
  เก็บผ่าน appStorage: ผู้ใช้จริง → localStorage (เห็นครั้งเดียวต่อหน้า ตลอดไป)
  บัญชีทดสอบ → sessionStorage (เปิดเบราว์เซอร์ใหม่ = เห็นทัวร์ใหม่ทุกหน้า)
  ปุ่ม "ดูวิธีใช้งานอีกครั้ง" ในหน้าตั้งค่าเรียก resetTours() แล้ว PageTour ทุกตัวที่เปิดอยู่
  ฟัง TOURS_RESET_EVENT เพื่อเล่นใหม่ทันที
\*============================================================================*/

export const TOURS_RESET_EVENT = 'bloom:tours-reset'

const keyOf = (userId: string) => `bloom:tours-seen:${userId}`

function readSeen(userId: string): string[] {
  try { return JSON.parse(appStorage.getItem(keyOf(userId)) ?? '[]') as string[] } catch { return [] }
}

export function hasSeenTour(userId: string, tourId: string): boolean {
  return readSeen(userId).includes(tourId)
}

export function markTourSeen(userId: string, tourId: string) {
  const seen = readSeen(userId)
  if (seen.includes(tourId)) return
  try { appStorage.setItem(keyOf(userId), JSON.stringify([...seen, tourId])) } catch { /* storage ปิด — เห็นซ้ำได้ ไม่เป็นไร */ }
}

export function resetTours(userId: string) {
  try { appStorage.removeItem(keyOf(userId)) } catch { /* noop */ }
  window.dispatchEvent(new Event(TOURS_RESET_EVENT))
}
