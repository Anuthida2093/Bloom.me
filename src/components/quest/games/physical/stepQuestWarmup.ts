import type { JourneyRecord } from '../../../../types.journey'
import { mapDefById, warmMapArt, warmPickerThumbs } from './mapArtLoader'
import { appStorage } from '../../../../utils/testerSession'

/*============================================================================*\
  stepQuestWarmup — เตรียมเควสก้าวเพื่อสุขภาพล่วงหน้าก่อนผู้เล่นแตะ
  ────────────────────────────────────────────────────────────────────────────
  - สแนปช็อตทริปล่าสุด (localStorage) → แตะเปิดเควสแล้ววาดแผนที่ได้ทันทีจากข้อมูลในเครื่อง
    แล้วค่อยอัปเดตก้าว/สถานะเมื่อ getActiveJourney ตอบกลับ (stale-while-revalidate)
  - warmStepQuest(): โหลด/ถอดรหัสภาพแผนที่ของทริปปัจจุบัน (หรือการ์ดหน้าเลือกแผนที่ถ้ายังไม่เลือก)
    เรียกซ้ำได้ — เรียกตอนหน้า Home ว่าง และตอนเปิดรายการเควสสุขภาพกาย
\*============================================================================*/

const SNAPSHOT_KEY = 'bloom.stepJourney.snapshot'

export function readJourneySnapshot(userId: string | null | undefined): JourneyRecord | null {
  try {
    const raw = JSON.parse(appStorage.getItem(SNAPSHOT_KEY) ?? 'null') as { userId: string; journey: JourneyRecord } | null
    if (!raw || (userId && raw.userId !== userId)) return null
    // ทริปเมื่อวานไม่ใช้วาดก่อน (วันใหม่ต้องเลือกแผนที่ใหม่)
    if (new Date(raw.journey.deadlineAt).getTime() < Date.now() || raw.journey.status !== 'IN_PROGRESS') return null
    return raw.journey
  } catch {
    return null
  }
}

export function writeJourneySnapshot(userId: string | null | undefined, journey: JourneyRecord | null) {
  try {
    if (!journey || !userId) appStorage.removeItem(SNAPSHOT_KEY)
    else appStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ userId, journey }))
  } catch { /* storage ปิดอยู่ */ }
}

/** โหลดภาพที่เควสก้าวต้องใช้ล่วงหน้า (ไม่บล็อกอะไร) */
export function warmStepQuest(userId?: string | null): void {
  const j = readJourneySnapshot(userId)
  const map = mapDefById(j?.routeMapIds?.[0] ?? j?.destinationMapId)
  if (map) void warmMapArt(map)
  else warmPickerThumbs()
}
