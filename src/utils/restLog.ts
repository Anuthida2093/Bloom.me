/*============================================================================*\
  restLog.ts — เวลาพักผ่อนของ "ผู้พิทักษ์การพักผ่อน" (เก็บในเครื่องแยกตามบัญชี)
  ────────────────────────────────────────────────────────────────────────────
  ทำงานเบื้องหลังคู่กับ "หยั่งรากลึก": จดจ่อครบ 90 นาที → startRest() เริ่มจับเวลาพัก 15 นาทีอัตโนมัติ
  ใช้เวลาจริง (timestamp) ไม่ใช่ตัวนับในหน้าจอ — พักต่อได้แม้ปิดหน้าเควส และตัวจับเวลาของ
  หยั่งรากลึกยังเดินต่อตามปกติ ไม่ถูกขัด · ครบเวลาแล้วนับเป็น "เวลาพักที่ทำได้" ทันที
\*============================================================================*/

export interface RestSession {
  startedAt: string
  minutes: number
}

export const REST_LOG_CHANGED_EVENT = 'bloom:rest-log-changed'

const key = (userId: string) => `bloom:rest-log:${userId}`
const MAX_SESSIONS = 200

export function loadRestSessions(userId: string): RestSession[] {
  try {
    const raw = window.localStorage.getItem(key(userId))
    return raw ? (JSON.parse(raw) as RestSession[]) : []
  } catch { return [] }
}

/** เริ่มพัก (เรียกตอนหยั่งรากลึกครบช่วงจดจ่อ) — ถ้ายังมีรอบพักค้างอยู่ ไม่เริ่มซ้อน */
export function startRest(userId: string, minutes: number, now: Date = new Date()): void {
  if (!userId) return
  const list = loadRestSessions(userId)
  if (activeRest(list, now.getTime())) return
  try {
    window.localStorage.setItem(key(userId), JSON.stringify([...list, { startedAt: now.toISOString(), minutes }].slice(-MAX_SESSIONS)))
    window.dispatchEvent(new CustomEvent(REST_LOG_CHANGED_EVENT))
  } catch { /* storage ปิด */ }
}

const endOf = (s: RestSession) => new Date(s.startedAt).getTime() + s.minutes * 60_000

/** รอบพักที่กำลังนับอยู่ (null = ไม่ได้พัก) */
export function activeRest(list: RestSession[], nowMs: number): RestSession | null {
  return list.find((s) => new Date(s.startedAt).getTime() <= nowMs && endOf(s) > nowMs) ?? null
}

/** เวลาพักที่ทำได้ (นาที) — นับเฉพาะรอบที่พักครบแล้ว · วันนี้ / ทั้งหมด */
export function restTotals(list: RestSession[], nowMs: number): { todayMinutes: number; totalMinutes: number; sessionsToday: number } {
  const today = new Date(nowMs).toDateString()
  let todayMinutes = 0, totalMinutes = 0, sessionsToday = 0
  for (const s of list) {
    if (endOf(s) > nowMs) continue
    totalMinutes += s.minutes
    if (new Date(s.startedAt).toDateString() === today) { todayMinutes += s.minutes; sessionsToday++ }
  }
  return { todayMinutes, totalMinutes, sessionsToday }
}
