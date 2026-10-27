import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { BrainDumpRecord } from '../../types.mental'
import { MAX_PAGE_SIZE, type Paginated } from './adapters'

/*============================================================================*\
  brainDump.api.ts — เควส "เทกระเป๋าความจำผ่านเสียง" (know-brain-dump): เก็บเสียงที่พูด + คำที่ถอดได้
  ────────────────────────────────────────────────────────────────────────────
  ตรงกับ backend (bloom-me-project) ตาราง brain_dump_sessions:
    1. POST /api/brain-dump/upload-url { fileExt }         → { signedUrl, path }
    2. PUT ไฟล์เสียงไปที่ signedUrl (Supabase Storage)
    3. POST /api/brain-dump { audioPath, durationSec, topic } → session
    4. PATCH /api/brain-dump/:id/transcript { transcriptText } (คำที่ถอดจากเสียง)
  GET /api/brain-dump/me = ประวัติ (หน้าโปรไฟล์)
  โหมด mock เก็บใน mockDb (ไม่เก็บไฟล์เสียง — เปิดฟังย้อนหลังได้เฉพาะรอบที่เพิ่งพูด)
  หัวข้อที่จำได้/ลืม backend ยังไม่มีคอลัมน์ — เก็บเฉพาะ mock, ฝั่ง live คำนวณใหม่จาก topic+transcript
\*============================================================================*/

export interface SaveBrainDumpInput {
  topics: string[]
  transcript: string
  durationSec: number
  recalledTopics: string[]
  missedTopics: string[]
  /** ไฟล์เสียงที่อัดไว้ (null = เบราว์เซอร์อัดเสียงไม่ได้) */
  audio: Blob | null
  questLogId?: string
}

/** หัวข้อทั้งหมดรวมเป็นช่อง topic เดียวของ backend (สูงสุด 200 ตัวอักษร) คั่นด้วย " | " */
const TOPIC_SEPARATOR = ' | '

function audioExt(blob: Blob): 'webm' | 'm4a' | 'mp3' | 'wav' {
  if (blob.type.includes('mp4') || blob.type.includes('m4a') || blob.type.includes('aac')) return 'm4a'
  if (blob.type.includes('mpeg') || blob.type.includes('mp3')) return 'mp3'
  if (blob.type.includes('wav')) return 'wav'
  return 'webm'
}

export async function saveBrainDumpSession(input: SaveBrainDumpInput): Promise<BrainDumpRecord | null> {
  const record: BrainDumpRecord = {
    id: `local-bd-${Date.now()}`,
    createdAt: new Date().toISOString(),
    topics: input.topics,
    transcript: input.transcript,
    durationSec: input.durationSec,
    recalledTopics: input.recalledTopics,
    missedTopics: input.missedTopics,
  }
  if (API_MODE === 'mock') {
    await mockDelay(80)
    updateDb((d) => { d.brainDumps = [record, ...(d.brainDumps ?? [])].slice(0, 200) })
    return record
  }
  // backend บังคับให้มีไฟล์เสียง (audioPath) — อัดเสียงไม่ได้ก็บันทึกขึ้นเซิร์ฟเวอร์ไม่ได้
  if (!input.audio) return null
  const { signedUrl, path } = await http.post<{ signedUrl: string; path: string }>('/brain-dump/upload-url', { fileExt: audioExt(input.audio) })
  const upload = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': input.audio.type || 'audio/webm' }, body: input.audio })
  if (!upload.ok) throw new Error(`upload failed ${upload.status}`)
  const session = await http.post<{ id: string; createdAt: string }>('/brain-dump', {
    audioPath: path,
    durationSec: Math.max(1, Math.round(input.durationSec)),
    topic: input.topics.join(TOPIC_SEPARATOR).slice(0, 200) || undefined,
    ...(input.questLogId ? { questLogId: input.questLogId } : {}),
  })
  if (input.transcript.trim()) {
    await http.patch(`/brain-dump/${session.id}/transcript`, { transcriptText: input.transcript.trim() })
  }
  return { ...record, id: session.id, createdAt: session.createdAt }
}

export async function getBrainDumpSessions(): Promise<BrainDumpRecord[]> {
  if (API_MODE === 'mock') { await mockDelay(80); return getDb().brainDumps ?? [] }
  const res = await http.get<Paginated<{ id: string; createdAt: string; topic: string | null; transcriptText: string | null; durationSec: number }>>(
    `/brain-dump/me?pageSize=${MAX_PAGE_SIZE}`,
  )
  return res.data.map((s) => {
    const topics = (s.topic ?? '').split(TOPIC_SEPARATOR).map((t) => t.trim()).filter(Boolean)
    const transcript = s.transcriptText ?? ''
    const spoken = transcript.toLowerCase()
    return {
      id: s.id,
      createdAt: s.createdAt,
      topics,
      transcript,
      durationSec: s.durationSec,
      recalledTopics: topics.filter((t) => spoken.includes(t.toLowerCase())),
      missedTopics: topics.filter((t) => !spoken.includes(t.toLowerCase())),
    }
  })
}
