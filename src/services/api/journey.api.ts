import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import { DEFAULT_JOURNEY_DEADLINE_DAYS, resolveJourneyStatus, calcMapTotalStepsTarget } from '../../config/journeyRules'
import { JOURNEY_MAPS } from '../../config/journeyMaps'
import type { JourneyRecord } from '../../types.journey'
import { getCachedMe } from './user.api'

/** true = เก็บทริปในเครื่อง (mockDb) แม้อยู่โหมด live — ใช้ได้ถ้าต้องต่อ backend รุ่นที่ยังไม่มี
 *  /api/journeys (backend branch feature/frontend-contract เพิ่มให้แล้ว จึงตั้งเป็น false) */
const JOURNEY_LOCAL_ONLY: boolean = false

/** เป้าหมายทริปล่าสุด (โหมด live) — ใช้เป็นด่านแรกของทริปถัดไปแบบเดียวกับโหมด mock */
const LAST_DESTINATION_KEY = 'bloom:journey-last-destination'
function readLastDestination(): string | null {
  try { return window.localStorage.getItem(LAST_DESTINATION_KEY) } catch { return null }
}
function rememberDestination(mapId: string) {
  try { window.localStorage.setItem(LAST_DESTINATION_KEY, mapId) } catch { /* ไม่มี storage ก็สุ่มด่านแรกแทน */ }
}

/** โหมด live: สถานะคำนวณจากสูตรก้าวตาม BMI ของหน้าเว็บ (journeyRules.ts) — ถ้าจบแล้วแจ้ง backend
 *  ผ่าน PATCH steps (steps: 0 + status ปลายทาง) เซิร์ฟเวอร์ห้ามแก้ทริปที่จบไปแล้วอยู่แล้ว */
async function liveBmi(): Promise<number> {
  return (await getCachedMe()).bmi ?? 0
}

function getRandomMapIdExcluding(excludeIds: string[]): string {
  const availableMaps = JOURNEY_MAPS.filter(m => !excludeIds.includes(m.id))
  if (availableMaps.length === 0) return JOURNEY_MAPS[0].id
  const randomIndex = Math.floor(Math.random() * availableMaps.length)
  return availableMaps[randomIndex].id
}

function createMockJourney(destinationMapId: string, userId: string, previousDestinationId: string | null): JourneyRecord {
  const now = new Date()
  const deadline = new Date(now.getTime() + DEFAULT_JOURNEY_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
  
  // 1. ด่าน 1 = จุดหมายของทริปที่แล้ว (ถ้าไม่มีให้สุ่ม)
  const map1 = previousDestinationId || getRandomMapIdExcluding([destinationMapId])
  // 2. ด่าน 2 = สุ่มด่านกลางที่ไม่ซ้ำกับด่าน 1 และด่านเป้าหมาย
  const map2 = getRandomMapIdExcluding([map1, destinationMapId])
  // 3. ด่าน 3 = เป้าหมายที่เลือก
  const map3 = destinationMapId

  return {
    id: `local-journey-${Date.now()}`,
    userId,
    destinationMapId,
    routeMapIds: [map1, map2, map3], // เก็บ 3 ด่านเรียงกัน
    progressOnCurrentMapSteps: 0,
    startedAt: now.toISOString(),
    deadlineAt: deadline.toISOString(),
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

export async function getActiveJourney(): Promise<JourneyRecord | null> {
  if (JOURNEY_LOCAL_ONLY || API_MODE === 'mock') {
    await mockDelay(120)
    const db = getDb()
    if (!db.activeJourney) return null
    const refreshed = refreshStatus(db.activeJourney, db.user.bmi ?? 0)
    return refreshed.status === 'IN_PROGRESS' ? refreshed : null
  }
  const journey = await http.get<JourneyRecord | null>('/journeys/active')
  if (!journey) return null
  const refreshed = refreshStatus(journey, await liveBmi())
  if (refreshed.status === journey.status) return journey
  // หมดเวลา/เดินถึงแล้วระหว่างที่ไม่ได้เปิดแอป — บันทึกสถานะจบให้ backend
  await http.patch<JourneyRecord>(`/journeys/${journey.id}/steps`, { steps: 0, status: refreshed.status })
  return null
}

export async function startJourney(destinationMapId: string): Promise<JourneyRecord> {
  if (JOURNEY_LOCAL_ONLY || API_MODE === 'mock') {
    await mockDelay()
    const db = updateDb((d) => {
      // จำเป้าหมายทริปเก่าเอาไว้เป็นจุดเริ่มของทริปใหม่
      const prevDest = d.activeJourney?.destinationMapId || null
      d.activeJourney = createMockJourney(destinationMapId, d.user.id, prevDest)
    })
    return db.activeJourney as JourneyRecord
  }
  // สุ่มเส้นทาง 3 ด่านฝั่งหน้าเว็บ (แคตตาล็อกแผนที่อยู่ที่ journeyMaps.ts) แล้วให้ backend เก็บ
  const { routeMapIds } = createMockJourney(destinationMapId, '', readLastDestination())
  const journey = await http.post<JourneyRecord>('/journeys', { destinationMapId, routeMapIds })
  rememberDestination(destinationMapId)
  return journey
}

export async function addSteps(journeyId: string, steps: number): Promise<JourneyRecord> {
  if (JOURNEY_LOCAL_ONLY || API_MODE === 'mock') {
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