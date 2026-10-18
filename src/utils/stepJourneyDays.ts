/*============================================================================*\
  stepJourneyDays.ts — ก้าวที่บันทึกเข้า "ทริปที่เดินอยู่" แยกตามวัน (เก็บในเครื่อง)
  ────────────────────────────────────────────────────────────────────────────
  ใช้เป็นฐานเทียบตอนซิงค์ก้าวรวมทั้งวัน (Google Fit/Health) กันนับซ้ำ + เพดานก้าวที่นับเข้าทริป
  [เปลี่ยนรอบนี้] ทริปเป็นรายวันแล้ว — วันที่เดินครบเป้า (สะสมสู่ 21 วัน) ย้ายไปเก็บกับบัญชีที่
  services/api/progression.api.ts (ไม่หายเมื่อเปลี่ยนเครื่อง) ไฟล์นี้เหลือแค่ตัวช่วยของทริปปัจจุบัน
\*============================================================================*/

import { bangkokDateString } from './progression'

const KEY = 'bloom.stepJourney.days'

interface JourneyDaysState {
  journeyId: string
  /** ก้าวที่เดินได้ในแต่ละวัน (YYYY-MM-DD → ก้าว) */
  steps: Record<string, number>
  /** วันที่เดินครบเป้าหมายแล้ว */
  doneDays: string[]
}

/** วันตามเวลาไทย — ตรงกับวันทริป (localDateKey) และเส้นตายเที่ยงคืนเวลาไทย */
function todayKey(): string {
  return bangkokDateString()
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

export function getTodayJourneySteps(journeyId: string): number {
  return stateFor(journeyId).steps[todayKey()] ?? 0
}

/** บันทึกก้าวที่เพิ่มขึ้นวันนี้ → คืนจำนวนก้าวที่นับเข้าความคืบหน้าของทริปได้ (ไม่เกินเป้าหมายรายวัน) */
export function recordJourneySteps(journeyId: string, delta: number, dailyTarget: number): { countable: number } {
  const s = stateFor(journeyId)
  const day = todayKey()
  const before = s.steps[day] ?? 0
  const after = before + Math.max(0, delta)
  s.steps[day] = after
  const countable = Math.max(0, Math.min(after, dailyTarget) - Math.min(before, dailyTarget))
  if (after >= dailyTarget && !s.doneDays.includes(day)) s.doneDays.push(day)
  write(s)
  return { countable }
}

/** เริ่มทริปใหม่/รับรางวัลแล้ว → ล้างก้าวของทริปเดิม */
export function resetStepJourneyDays(journeyId?: string): void {
  write(journeyId ? { journeyId, steps: {}, doneDays: [] } : null)
}

/** ก้าวจริงที่เดินได้ในวันที่ระบุของทริปนี้ (ไม่ตัดที่เป้า) — ใช้แสดงผล/บันทึกเข้าบัญชีตอนเปิดหน้าสรุปย้อนหลัง */
export function getJourneyDaySteps(journeyId: string, date: string): number {
  return stateFor(journeyId).steps[date] ?? 0
}
