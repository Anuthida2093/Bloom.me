import { http, isMockMode, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import { endOfTripDay, resolveJourneyStatus, calcMapTotalStepsTarget } from '../../config/journeyRules'
import type { JourneyRecord } from '../../types.journey'
import { getCachedMe } from './user.api'
import { appStorage } from '../../utils/testerSession'

/** true = เก็บทริปในเครื่อง (mockDb) แม้อยู่โหมด live — ใช้ได้ถ้าต้องต่อ backend รุ่นที่ยังไม่มี
 *  /api/journeys (backend branch feature/frontend-contract เพิ่มให้แล้ว จึงตั้งเป็น false) */
const JOURNEY_LOCAL_ONLY: boolean = false

/** โหมด live: สถานะคำนวณจากสูตรก้าวตาม BMI ของหน้าเว็บ (journeyRules.ts) — ถ้าจบแล้วแจ้ง backend
 *  ผ่าน PATCH steps (steps: 0 + status ปลายทาง) เซิร์ฟเวอร์ห้ามแก้ทริปที่จบไปแล้วอยู่แล้ว */
async function liveBmi(): Promise<number> {
  return (await getCachedMe()).bmi ?? 0
}

/** ทริปรายวัน: เส้นทาง = แผนที่เดียวที่เลือก เส้นตาย = สิ้นวันนี้ */
function createMockJourney(destinationMapId: string, userId: string): JourneyRecord {
  const now = new Date()
  return {
    id: `local-journey-${Date.now()}`,
    userId,
    destinationMapId,
    routeMapIds: [destinationMapId],
    progressOnCurrentMapSteps: 0,
    startedAt: now.toISOString(),
    deadlineAt: endOfTripDay(now).toISOString(),
    status: 'IN_PROGRESS',
  }
}

function calcProgressPct(journey: JourneyRecord, bmi: number): number {
  const target = calcMapTotalStepsTarget(bmi)
  return target > 0 ? Math.min(100, (journey.progressOnCurrentMapSteps / target) * 100) : 0
}

function refreshStatus(journey: JourneyRecord, bmi: number): JourneyRecord {
  const progressPct = calcProgressPct(journey, bmi)
  const status = resolveJourneyStatus(journey, progressPct, new Date())
  return status === journey.status ? journey : { ...journey, status }
}

/* ทริปที่จบแล้วแต่ยังไม่ได้กดรับรางวัล — เดิม getActiveJourney คืน null ทันทีที่ทริปจบ (หมดเวลา/เดินครบ
   ตอนปิดแอป) หน้าสรุปผลจึงไม่เคยขึ้นและรางวัลตามสัดส่วนหายเงียบ เก็บไว้ในเครื่องจนกว่าจะกดรับ */
const PENDING_CLAIM_KEY = 'bloom:journey-pending-claim'

function readPendingClaim(): JourneyRecord | null {
  try {
    const raw = appStorage.getItem(PENDING_CLAIM_KEY)
    return raw ? (JSON.parse(raw) as JourneyRecord) : null
  } catch { return null }
}

function rememberPendingClaim(journey: JourneyRecord) {
  try { appStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify(journey)) } catch { /* ไม่มี storage */ }
}

/** เรียกหลังกดรับรางวัลทริปแล้ว (finish เควส) */
export function clearPendingJourneyClaim() {
  try { appStorage.removeItem(PENDING_CLAIM_KEY) } catch { /* ไม่มี storage */ }
}

/** ทริปที่กำลังเดิน หรือทริปที่จบแล้วแต่ยังไม่รับรางวัล (status ≠ IN_PROGRESS → หน้าเว็บโชว์หน้าสรุปผล) */
export async function getActiveJourney(): Promise<JourneyRecord | null> {
  const pending = readPendingClaim()
  if (pending) {
    // ของบัญชีอื่นที่เคยล็อกอินเครื่องนี้ — ทิ้ง ไม่โชว์รางวัลข้ามบัญชี
    const currentUserId = JOURNEY_LOCAL_ONLY || isMockMode() ? getDb().user.id : (await getCachedMe()).id
    if (pending.userId === currentUserId) return pending
    clearPendingJourneyClaim()
  }

  if (JOURNEY_LOCAL_ONLY || isMockMode()) {
    await mockDelay(120)
    const db = getDb()
    if (!db.activeJourney || db.activeJourney.status !== 'IN_PROGRESS') return null
    const refreshed = refreshStatus(db.activeJourney, db.user.bmi ?? 0)
    if (refreshed.status !== 'IN_PROGRESS') {
      updateDb((d) => { d.activeJourney = refreshed })
      rememberPendingClaim(refreshed)
    }
    return refreshed
  }
  const journey = await http.get<JourneyRecord | null>('/journeys/active')
  if (!journey) return null
  const refreshed = refreshStatus(journey, await liveBmi())
  if (refreshed.status === journey.status) return journey
  // หมดเวลา/เดินถึงแล้วระหว่างที่ไม่ได้เปิดแอป — บันทึกสถานะจบให้ backend แล้วรอให้ผู้เล่นกดรับรางวัล
  const ended = await http.patch<JourneyRecord>(`/journeys/${journey.id}/steps`, { steps: 0, status: refreshed.status })
  rememberPendingClaim(ended)
  return ended
}

/** ยกเลิกทริปที่เดินอยู่ (ปุ่ม "เปลี่ยนจุดหมาย") — เดิมแค่ล้าง state หน้าเว็บ ทริปฝั่ง backend ยัง
 *  IN_PROGRESS อยู่ ทำให้ POST /journeys ถัดไปโดน 409 JOURNEY_IN_PROGRESS ปิดเป็น TIME_UP โดยไม่ให้รางวัล */
export async function abandonJourney(journeyId: string): Promise<void> {
  clearPendingJourneyClaim()
  if (JOURNEY_LOCAL_ONLY || isMockMode()) {
    await mockDelay(80)
    updateDb((d) => {
      if (d.activeJourney?.id === journeyId) d.activeJourney = { ...d.activeJourney, status: 'TIME_UP' }
    })
    return
  }
  await http.patch<JourneyRecord>(`/journeys/${journeyId}/steps`, { steps: 0, status: 'TIME_UP' })
}

export async function startJourney(destinationMapId: string): Promise<JourneyRecord> {
  if (JOURNEY_LOCAL_ONLY || isMockMode()) {
    await mockDelay()
    const db = updateDb((d) => {
      d.activeJourney = createMockJourney(destinationMapId, d.user.id)
    })
    return db.activeJourney as JourneyRecord
  }
  // [backend ต้องปรับ] deadline ของทริปรายวัน = สิ้นวัน (ดู docs/PROGRESSION_API.md)
  return http.post<JourneyRecord>('/journeys', {
    destinationMapId, routeMapIds: [destinationMapId], deadlineAt: endOfTripDay().toISOString(),
  })
}

export async function addSteps(journeyId: string, steps: number): Promise<JourneyRecord> {
  const updated = await sendSteps(journeyId, steps)
  if (updated.status !== 'IN_PROGRESS') rememberPendingClaim(updated)
  return updated
}

async function sendSteps(journeyId: string, steps: number): Promise<JourneyRecord> {
  if (JOURNEY_LOCAL_ONLY || isMockMode()) {
    await mockDelay()
    const db = updateDb((d) => {
      if (!d.activeJourney || d.activeJourney.id !== journeyId) return
      const updated: JourneyRecord = {
        ...d.activeJourney,
        progressOnCurrentMapSteps: d.activeJourney.progressOnCurrentMapSteps + steps,
      }
      d.activeJourney = refreshStatus(updated, d.user.bmi ?? 0)
    })
    return db.activeJourney as JourneyRecord
  }
  const current = await http.get<JourneyRecord | null>('/journeys/active')
  if (!current || current.id !== journeyId) {
    return http.patch<JourneyRecord>(`/journeys/${journeyId}/steps`, { steps })
  }
  const next = refreshStatus({ ...current, progressOnCurrentMapSteps: current.progressOnCurrentMapSteps + steps }, await liveBmi())
  return http.patch<JourneyRecord>(`/journeys/${journeyId}/steps`, {
    steps,
    ...(next.status !== 'IN_PROGRESS' ? { status: next.status } : {}),
  })
}
