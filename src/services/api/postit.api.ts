import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { PostItData } from '../../types'
import { MAX_PAGE_SIZE, type Paginated } from './adapters'

/*============================================================================*\
  postit.api.ts — โพสอิทบนต้นไม้ (บันทึกความรู้สึกประจำวันจากเช็คอินอารมณ์)
  ────────────────────────────────────────────────────────────────────────────
  mock: mockDb.postIts (แยกต่อบัญชี) / live: backend /api/postit (ตาราง post_its)
  positionX/positionY = ตำแหน่งบนพุ่มต้นไม้เป็น % ของกล่องต้นไม้ (TreeOfLife.tsx วาดตามนี้)
\*============================================================================*/

export interface CreatePostItPayload {
  content: string
  color?: string
  positionX: number
  positionY: number
}

export async function getPostIts(): Promise<PostItData[]> {
  if (API_MODE === 'mock') { await mockDelay(80); return getDb().postIts }
  const res = await http.get<Paginated<PostItData>>(`/postit/me?pageSize=${MAX_PAGE_SIZE}`)
  return res.data
}

export async function createPostIt(payload: CreatePostItPayload): Promise<PostItData> {
  if (API_MODE === 'mock') {
    await mockDelay(80)
    const db = getDb()
    const postIt: PostItData = {
      id: `local-postit-${Date.now()}`,
      content: payload.content,
      color: payload.color ?? '#FFF59D',
      positionX: payload.positionX,
      positionY: payload.positionY,
      isPinned: false,
      userId: db.user.id,
      createdAt: new Date().toISOString(),
    }
    updateDb((d) => { d.postIts = [...(d.postIts ?? []), postIt] })
    return postIt
  }
  return http.post<PostItData>('/postit', {
    content: payload.content.slice(0, 1000),
    positionX: Math.round(payload.positionX),
    positionY: Math.round(payload.positionY),
    ...(payload.color ? { color: payload.color } : {}),
  })
}

/** [เพิ่มตามที่ระบุ] ลากโพสอิทไปวางที่ไหนก็ได้บนจอ — บันทึกตำแหน่งใหม่ (% ของจอ)
 *  live: PATCH /api/postit/:id { positionX, positionY } (backend รับเป็นจำนวนเต็ม) */
export async function updatePostItPosition(id: string, positionX: number, positionY: number): Promise<void> {
  if (API_MODE === 'mock') {
    updateDb((d) => {
      d.postIts = (d.postIts ?? []).map((p) => (p.id === id ? { ...p, positionX, positionY } : p))
    })
    return
  }
  await http.patch(`/postit/${id}`, { positionX: Math.round(positionX), positionY: Math.round(positionY) })
}

/** [เพิ่มตามที่ระบุ] เก็บโพสอิทเข้าประวัติ = เอาออกจากต้นไม้ — live: DELETE /api/postit/:id */
export async function deletePostIt(id: string): Promise<void> {
  if (API_MODE === 'mock') {
    updateDb((d) => { d.postIts = (d.postIts ?? []).filter((p) => p.id !== id) })
    return
  }
  await http.del(`/postit/${id}`)
}
