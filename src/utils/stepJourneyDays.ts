/*============================================================================*\
  stepJourneyDays.ts — [แก้ตามที่ระบุ] เควส "ก้าวเพื่อสุขภาพ" ใช้เวลา 3 วัน → นับเป็น "วันที่สำเร็จ" 0/3
  ────────────────────────────────────────────────────────────────────────────
  วันไหนเดินครบเป้าหมายรายวัน = สำเร็จ 1 วัน · วันไหนไม่ครบ = ตัวเลขคงเดิม (ไม่หัก ไม่รีเซ็ต)
  ครบ 3/3 = ได้รับรางวัล — แต่ละวันนับเข้าความคืบหน้าของทริปได้ไม่เกินเป้าหมายรายวัน
  (เดินเกินในวันเดียวไม่ข้ามไปจบทริปก่อนครบ 3 วัน)
  เก็บในเครื่อง (localStorage) ผูกกับ id ทริป — backend ยังไม่มีตารางก้าวรายวันของทริป
\*============================================================================*/

const KEY = 'bloom.stepJourney.days'
export const STEP_JOURNEY_DAYS = 3

interface JourneyDaysState {
  journeyId: string
  /** ก้าวที่เดินได้ในแต่ละวัน (YYYY-MM-DD → ก้าว) */
  steps: Record<string, number>
  /** วันที่เดินครบเป้าหมายแล้ว */
  doneDays: string[]
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function read(): JourneyDaysState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as JourneyDaysState) : null
  } catch { return null }
}

function write(state: JourneyDaysState | null): void {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state))
    else localStorage.removeItem(KEY)
  } catch { /* storage ปิดอยู่ */ }
}

function stateFor(journeyId: string): JourneyDaysState {
  const s = read()
  return s && s.journeyId === journeyId ? s : { journeyId, steps: {}, doneDays: [] }
}

/** จำนวนวันที่สำเร็จของทริปที่เล่นอยู่ (ใช้โชว์ 0/3 ที่รายการเควส) */
export function getStepJourneyDaysDone(journeyId?: string): number {
  const s = read()
  if (!s || (journeyId && s.journeyId !== journeyId)) return 0
  return Math.min(STEP_JOURNEY_DAYS, s.doneDays.length)
}

export function getTodayJourneySteps(journeyId: string): number {
  return stateFor(journeyId).steps[todayKey()] ?? 0
}

/** บันทึกก้าวที่เพิ่มขึ้นวันนี้ → คืนจำนวนก้าวที่นับเข้าความคืบหน้าของทริปได้ (ไม่เกินเป้าหมายรายวัน) */
export function recordJourneySteps(journeyId: string, delta: number, dailyTarget: number): { countable: number; daysDone: number } {
  const s = stateFor(journeyId)
  const day = todayKey()
  const before = s.steps[day] ?? 0
  const after = before + Math.max(0, delta)
  s.steps[day] = after
  const countable = Math.max(0, Math.min(after, dailyTarget) - Math.min(before, dailyTarget))
  if (after >= dailyTarget && !s.doneDays.includes(day)) s.doneDays.push(day)
  write(s)
  return { countable, daysDone: Math.min(STEP_JOURNEY_DAYS, s.doneDays.length) }
}

/** เริ่มทริปใหม่/รับรางวัลแล้ว → นับใหม่ 0/3 */
export function resetStepJourneyDays(journeyId?: string): void {
  write(journeyId ? { journeyId, steps: {}, doneDays: [] } : null)
}
