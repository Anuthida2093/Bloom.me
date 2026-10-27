import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { MoodEntryData, MoodCategory, MoodTypeValue } from '../../types'
import type { MoodColorCode } from '../../types.mental'
import { MAX_PAGE_SIZE, type Paginated } from './adapters'

/*============================================================================*\
  mood.api.ts — [ไฟล์ใหม่] คำขอที่เกี่ยวกับการบันทึกอารมณ์
  ────────────────────────────────────────────────────────────────────────────
  [ข้อจำกัดที่ต้องรู้] ตาราง mood_entries ปัจจุบันยังไม่มี logDate + unique(userId, logDate)
  ทำให้ "1 วัน 1 record" บังคับที่ระดับฐานข้อมูลไม่ได้ และการนับวันอารมณ์ลบติดกัน
  จะแม่นเฉพาะฝั่งหน้าเว็บเท่านั้น — ดู docs/DB_CHANGES.md ข้อ 2
\*============================================================================*/

export interface CreateMoodPayload {
  category: MoodCategory
  mood: MoodTypeValue
  note: string | null
  /** สีน้ำยาที่เท (5 สี) — backend มีคอลัมน์ mood_entries.colorCode แล้ว */
  colorCode?: MoodColorCode
  /** ความเข้มอารมณ์ 1-5 — backend มีคอลัมน์ mood_entries.moodScore แล้ว */
  moodScore?: number
}

export async function getMoodEntries(): Promise<MoodEntryData[]> {
  if (API_MODE === 'mock') { await mockDelay(120); return getDb().moodEntries }
  // backend: GET /api/mood/me (แบ่งหน้า ใหม่สุดก่อน)
  const res = await http.get<Paginated<MoodEntryData>>(`/mood/me?pageSize=${MAX_PAGE_SIZE}`)
  return res.data
}

export async function createMoodEntry(payload: CreateMoodPayload): Promise<MoodEntryData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const entry: MoodEntryData = {
      id: `local-${Date.now()}`,
      userId: getDb().user.id,
      category: payload.category,
      mood: payload.mood,
      note: payload.note,
      colorCode: payload.colorCode,
      moodScore: payload.moodScore,
      createdAt: new Date().toISOString(),
    }
    updateDb((d) => { d.moodEntries.push(entry) })
    return entry
  }
  // backend: POST /api/mood — note ต้องเป็น string หรือไม่ส่งเลย (ไม่รับ null)
  return http.post<MoodEntryData>('/mood', {
    category: payload.category,
    mood: payload.mood,
    ...(payload.note ? { note: payload.note } : {}),
    ...(payload.colorCode ? { colorCode: payload.colorCode } : {}),
    ...(payload.moodScore ? { moodScore: payload.moodScore } : {}),
  })
}