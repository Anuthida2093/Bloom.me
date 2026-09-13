import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { MoodEntryData, MoodCategory, MoodTypeValue } from '../../types'

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
}

export async function getMoodEntries(): Promise<MoodEntryData[]> {
  if (API_MODE === 'mock') { await mockDelay(120); return getDb().moodEntries }
  return http.get<MoodEntryData[]>('/mood-entries')
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
      createdAt: new Date().toISOString(),
    }
    updateDb((d) => { d.moodEntries.push(entry) })
    return entry
  }
  return http.post<MoodEntryData>('/mood-entries', payload)
}