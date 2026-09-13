import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { ActivityItem } from '../../types'
import { MOCK_LEADERBOARD_PLAYERS } from '../../config/leaderboardData'

/** [ใหม่ — ข้อ 11] เช็คว่าโปรไฟล์ userId นี้ปิดไว้ (ทั้งบัญชี) ไหม — เรียกก่อนพยายามเปิดหน้า
 *  โปรไฟล์คนอื่นเสมอ (จาก list เพื่อน/คนกดไลค์/คอมเมนต์) บัญชีตัวเองใช้ user.isProfilePrivate
 *  ส่วนบัญชี mock อื่น (p1-p7) เช็คจาก privateProfileUserIds ที่ตั้งไว้ตายตัวใน mockDb */
export async function checkProfileAccess(userId: string): Promise<{ blocked: boolean }> {
  if (API_MODE === 'mock') {
    await mockDelay(80)
    const db = getDb()
    if (userId === db.user.id) return { blocked: false } // ดูโปรไฟล์ตัวเองได้เสมอ
    return { blocked: db.privateProfileUserIds.includes(userId) }
  }
  return http.get<{ blocked: boolean }>(`/social/profile-access/${userId}`)
}

/** [ใหม่ — ข้อ 13] แชร์โพสต์ให้เพื่อนในแอป (ไม่ใช่ native share sheet) — สร้าง ActivityItem
 *  ประเภท SHARED_POST_TO_YOU ให้ปรากฏในหน้ากิจกรรม
 *  [ข้อจำกัดของ mock — ระบบนี้มีบัญชีเดียวในเครื่อง] เพราะแอปนี้ยังไม่มีบัญชีของเพื่อนแยกจริง
 *  (เพื่อนทุกคนเป็นแค่ mock player ไม่มี mockDb ของตัวเอง) จึงเขียน ActivityItem ลงฟีดกิจกรรม
 *  ของ "เรา" เองเป็นใบเสร็จยืนยันว่าแชร์ไปแล้วจริง (แสดงชื่อเพื่อนที่แชร์ให้) แทนที่จะไปโผล่ใน
 *  กิจกรรมของฝั่งเพื่อน — วันที่มีบัญชีจริงหลายคน (backend จริง) ให้เปลี่ยนเป็นเขียนลง
 *  activity ของฝั่งผู้รับแทน (friendUserId) ไม่ใช่ของผู้ส่ง */
export async function sharePostToFriend(postId: string, friendUserId: string): Promise<void> {
  if (API_MODE === 'mock') {
    await mockDelay(150)
    const friend = MOCK_LEADERBOARD_PLAYERS.find((p) => p.id === friendUserId)
    updateDb((d) => {
      const post = d.posts.find((p) => p.id === postId)
      d.activity = [
        {
          id: `local-activity-${Date.now()}`,
          type: 'SHARED_POST_TO_YOU',
          actorId: friendUserId,
          actorName: friend?.username ?? 'เพื่อน',
          createdAt: new Date().toISOString(),
          excerpt: `คุณแชร์โพสต์นี้ให้ ${friend?.username ?? 'เพื่อน'}: "${(post?.content ?? '').slice(0, 40)}"`,
          postId,
        },
        ...d.activity,
      ]
    })
    return
  }
  await http.post<void>(`/social/share-post/${postId}`, { friendUserId })
}

/*============================================================================*\
  social.api.ts — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] ติดตาม/กิจกรรม/ค้นหาผู้ใช้
  ────────────────────────────────────────────────────────────────────────────
  ยึด pattern เดียวกับ post.api.ts/mood.api.ts เป๊ะ: เช็ค API_MODE ก่อนเสมอ
  "ติดตาม" ในไฟล์นี้เป็นแบบทางเดียว (one-way follow) ล้วนๆ ไม่ใช่ friend-request
  ที่ต้องกดรับ/ปฏิเสธ — ถ้าจะทำ friend-request เต็มรูปแบบเป็นงานแยกอีกเฟส (ตามที่แจ้งไว้
  ตอนขอสร้างระบบโพสต์+เพื่อนรอบก่อน) ยังไม่ได้ทำในรอบนี้

  ค้นหาผู้ใช้ยังไม่มี endpoint/ตาราง "users directory" แยกจริงใน docs — โหมด mock จึงค้นจาก
  MOCK_LEADERBOARD_PLAYERS (เซตเดียวกับที่ SEED_POSTS/SEED_ACTIVITY อ้างอิง userId ชุดเดียวกัน)
  วันที่ backend มี GET /social/search จริง แทนที่ตรงนี้ได้เลย ไม่ต้องแก้โค้ดฝั่ง UI
\*============================================================================*/

export async function getFollowing(): Promise<string[]> {
  if (API_MODE === 'mock') {
    await mockDelay(100)
    return getDb().following
  }
  return http.get<string[]>('/social/following')
}

export async function toggleFollow(userId: string): Promise<string[]> {
  if (API_MODE === 'mock') {
    await mockDelay(150)
    return updateDb((d) => {
      d.following = d.following.includes(userId)
        ? d.following.filter((id) => id !== userId)
        : [...d.following, userId]
    }).following
  }
  return http.post<string[]>(`/social/follow/${userId}`)
}

export async function getActivityFeed(): Promise<ActivityItem[]> {
  if (API_MODE === 'mock') {
    await mockDelay(150)
    return [...getDb().activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return http.get<ActivityItem[]>('/social/activity')
}

export interface SearchUserResult {
  id: string
  username: string
}

export async function searchUsers(query: string): Promise<SearchUserResult[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  if (API_MODE === 'mock') {
    await mockDelay(120)
    return MOCK_LEADERBOARD_PLAYERS
      .filter((p) => p.username.toLowerCase().includes(q))
      .map((p) => ({ id: p.id, username: p.username }))
  }
  return http.get<SearchUserResult[]>(`/social/search?q=${encodeURIComponent(query)}`)
}
