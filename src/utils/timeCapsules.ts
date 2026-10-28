import { appStorage } from './testerSession'
/*============================================================================*\
  timeCapsules.ts — นัดทบทวนจากเควส "แคปซูลเวลา" (know-content-review)
  ────────────────────────────────────────────────────────────────────────────
  เก็บในเครื่องแยกตามบัญชี (เหมือนมื้ออาหาร/ไดอะรี่) + ส่งซ้ำไปใน payload ของ quest log ด้วย
  (backend ยังไม่มีคอลัมน์ payload/ตารางนัดหมาย — ดู docs/PROGRESSION_API.md)
  ถึงเวลาแล้ว → ป็อปอัพเตือนทันทีที่ล็อกอิน/เปิดหน้า Home (TimeCapsuleReminder.tsx)
\*============================================================================*/

export interface TimeCapsule {
  id: string
  /** เวลาที่ต้องเตือน (ISO) */
  at: string
  /** เป้าหมาย Active Focus ของวันที่ตั้ง (ถ้ามี) */
  goal: string | null
  /** หัวข้อที่ลืมจากเทกระเป๋าความจำผ่านเสียง */
  topics: string[]
  createdAt: string
  /** ทบทวนแล้ว (ไม่เตือนอีก) */
  doneAt?: string | null
  /** เลื่อนการเตือนไปถึงเวลานี้ */
  snoozedUntil?: string | null
}

export const TIME_CAPSULES_CHANGED_EVENT = 'bloom:time-capsules-changed'

function key(userId: string): string {
  return `bloom:time-capsules:${userId}`
}

export function loadTimeCapsules(userId: string): TimeCapsule[] {
  try {
    const raw = appStorage.getItem(key(userId))
    return raw ? (JSON.parse(raw) as TimeCapsule[]) : []
  } catch { return [] }
}

function save(userId: string, list: TimeCapsule[]): void {
  try {
    appStorage.setItem(key(userId), JSON.stringify(list))
    window.dispatchEvent(new CustomEvent(TIME_CAPSULES_CHANGED_EVENT))
  } catch { /* storage เต็ม/ปิด — ยังมีสำเนาใน payload ของ quest log */ }
}

export function addTimeCapsules(userId: string, items: Omit<TimeCapsule, 'id' | 'createdAt'>[]): TimeCapsule[] {
  const now = new Date().toISOString()
  const created = items.map((it, i) => ({ ...it, id: `tc-${Date.now()}-${i}`, createdAt: now }))
  save(userId, [...loadTimeCapsules(userId), ...created])
  return created
}

/** แคปซูลที่ถึงเวลาเตือนแล้ว (ยังไม่ทบทวน และไม่อยู่ในช่วงเลื่อน) */
export function dueTimeCapsules(userId: string, now: Date = new Date()): TimeCapsule[] {
  const t = now.getTime()
  return loadTimeCapsules(userId)
    .filter((c) => !c.doneAt && new Date(c.at).getTime() <= t && (!c.snoozedUntil || new Date(c.snoozedUntil).getTime() <= t))
    .sort((a, b) => a.at.localeCompare(b.at))
}

/** แคปซูลที่ยังรออยู่ (ไว้โชว์ในหน้าเควส) */
export function upcomingTimeCapsules(userId: string, now: Date = new Date()): TimeCapsule[] {
  return loadTimeCapsules(userId)
    .filter((c) => !c.doneAt && new Date(c.at).getTime() > now.getTime())
    .sort((a, b) => a.at.localeCompare(b.at))
}

export function markTimeCapsulesDone(userId: string, ids: string[]): void {
  const at = new Date().toISOString()
  save(userId, loadTimeCapsules(userId).map((c) => (ids.includes(c.id) ? { ...c, doneAt: at } : c)))
}

export function snoozeTimeCapsules(userId: string, ids: string[], minutes: number): void {
  const until = new Date(Date.now() + minutes * 60_000).toISOString()
  save(userId, loadTimeCapsules(userId).map((c) => (ids.includes(c.id) ? { ...c, snoozedUntil: until } : c)))
}
