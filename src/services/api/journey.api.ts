import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import { DEFAULT_JOURNEY_DEADLINE_DAYS, resolveJourneyStatus, calcMapTotalStepsTarget } from '../../config/journeyRules'
import { JOURNEY_MAPS } from '../../config/journeyMaps'
import type { JourneyRecord } from '../../types.journey'

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
  if (API_MODE === 'mock') {
    await mockDelay(120)
    const db = getDb()
    if (!db.activeJourney) return null
    const refreshed = refreshStatus(db.activeJourney, db.user.bmi ?? 0)
    return refreshed.status === 'IN_PROGRESS' ? refreshed : null
  }
  return http.get<JourneyRecord | null>('/journeys/active')
}

export async function startJourney(destinationMapId: string): Promise<JourneyRecord> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const db = updateDb((d) => {
      // จำเป้าหมายทริปเก่าเอาไว้เป็นจุดเริ่มของทริปใหม่
      const prevDest = d.activeJourney?.destinationMapId || null
      d.activeJourney = createMockJourney(destinationMapId, d.user.id, prevDest)
    })
    return db.activeJourney as JourneyRecord
  }
  return http.post<JourneyRecord>('/journeys', { destinationMapId })
}

export async function addSteps(journeyId: string, steps: number): Promise<JourneyRecord> {
  if (API_MODE === 'mock') {
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
  return http.patch<JourneyRecord>(`/journeys/${journeyId}/steps`, { steps })
}