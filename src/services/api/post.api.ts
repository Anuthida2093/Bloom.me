import { http, API_MODE, mockDelay, ApiError } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import type { PostData, PostCommentData } from '../../types'

/*============================================================================*\
  post.api.ts — [ไฟล์ใหม่] คำขอที่เกี่ยวกับฟีดโพสต์ (Threads-style)
  ────────────────────────────────────────────────────────────────────────────
  ยึด pattern เดียวกับ mood.api.ts/quest.api.ts เป๊ะ: เช็ค API_MODE ก่อนเสมอ
  mock ใช้ mockDb.ts (persist localStorage) ส่วน live ยิง http.ts ตรงๆ
  วันที่ backend มี endpoint จริง สลับแค่ .env ไฟล์เดียว ไม่ต้องแก้ที่อื่น (ดู DB_CHANGES.md)
\*============================================================================*/

/** [ฟีเจอร์สตอรี่] เผื่อ localStorage เก่าจากรอบก่อนที่ยังไม่มี repostedByMe/repostCount/likedBy
 *  (บันทึกไว้ตั้งแต่ก่อนเพิ่ม field พวกนี้ใน types.ts) — กัน `undefined` หลุดไปแสดงผล
 *  [แก้รอบนี้] likedBy คือแหล่งความจริงใหม่ — ถ้าเจอโพสต์เก่าที่มีแค่ likeCount/likedByMe แบบ
 *  ตัวเลขล้วนๆ (ไม่มี likedBy เลย) ให้ derive likeCount/likedByMe จาก likedBy แทนเสมอ กัน
 *  ข้อมูล 2 ชุดไม่ตรงกัน */
function withRepostDefaults(post: PostData, myUserId: string): PostData {
  const likedBy = post.likedBy ?? []
  return {
    ...post,
    repostedByMe: post.repostedByMe ?? false,
    repostCount: post.repostCount ?? 0,
    likedBy,
    likeCount: likedBy.length,
    likedByMe: likedBy.some((l) => l.userId === myUserId),
  }
}

/** [แก้รอบนี้ — ข้อ 2] คืนโพสต์ "ทุกคนในระบบ" เสมอ ไม่กรองตาม following เลย — ฟีดหลักของ
 *  สตอรี่เป็นสาธารณะ ใครโพสต์ก็เห็นในฟีดหลักได้หมด follow ใช้แค่กับหน้า "เพื่อน" กับการ
 *  แจ้งเตือน (ดู FriendsListPanel.tsx/SocialContext.tsx) ไม่ใช่ตัวกรองฟีดนี้ */
export async function getFeedPosts(): Promise<PostData[]> {
  if (API_MODE === 'mock') {
    await mockDelay(150)
    const myUserId = getDb().user.id
    // ใหม่สุดก่อนเสมอ (เหมือนฟีดจริง) — mockDb เก็บเป็น array ที่ unshift ตอนโพสต์ใหม่อยู่แล้ว
    // แต่ SEED_POSTS ตอนตั้งต้นเรียงตามที่เขียนไว้ตรงๆ จึง sort อีกชั้นกันพลาด
    return [...getDb().posts].map((p) => withRepostDefaults(p, myUserId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return http.get<PostData[]>('/posts')
}

export interface CreatePostPayload {
  content: string
  imageUrl?: string | null
  isAnonymous: boolean
}

export async function createPost(payload: CreatePostPayload): Promise<PostData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const db = getDb()
    const post: PostData = {
      id: `local-post-${Date.now()}`,
      userId: db.user.id,
      authorName: db.user.username,
      content: payload.content,
      imageUrl: payload.imageUrl ?? null,
      isAnonymous: payload.isAnonymous,
      likedBy: [],
      likeCount: 0,
      likedByMe: false,
      comments: [],
      repostedByMe: false,
      repostCount: 0,
      createdAt: new Date().toISOString(),
    }
    updateDb((d) => { d.posts = [post, ...d.posts] })
    return post
  }
  return http.post<PostData>('/posts', payload)
}

/** [แก้รอบนี้ — ข้อ 10] ต้องเก็บ "ใครกดไลค์" จริง ไม่ใช่แค่ +1/-1 ตัวเลข เพื่อให้กดดู
 *  รายชื่อคนไลค์ได้ — likedBy คือแหล่งความจริง likeCount/likedByMe derive ตามเสมอ */
export async function toggleLikePost(postId: string): Promise<PostData> {
  if (API_MODE === 'mock') {
    await mockDelay(120)
    let updated: PostData | undefined
    updateDb((d) => {
      const me = { userId: d.user.id, username: d.user.username }
      d.posts = d.posts.map((p) => {
        if (p.id !== postId) return p
        const base = withRepostDefaults(p, d.user.id)
        const alreadyLiked = base.likedBy.some((l) => l.userId === me.userId)
        const likedBy = alreadyLiked ? base.likedBy.filter((l) => l.userId !== me.userId) : [...base.likedBy, me]
        updated = { ...base, likedBy, likeCount: likedBy.length, likedByMe: !alreadyLiked }
        return updated
      })
    })
    if (!updated) throw new ApiError(404, 'ไม่พบโพสต์นี้ — อาจถูกลบไปแล้ว')
    return updated
  }
  return http.post<PostData>(`/posts/${postId}/like`)
}

/** [ใหม่ — ฟีเจอร์สตอรี่] รีโพสต์ — ยึด pattern เดียวกับ toggleLikePost เป๊ะ (toggle + กันติดลบ)
 *  [ตัดออกจาก UI เฟสนี้ตามที่ตกลง — ข้อ 12] เก็บฟังก์ชันนี้ไว้ใช้งานได้เต็มรูปแบบเผื่อกลับมา
 *  เปิดใช้อีกเฟสหน้า ไม่มีปุ่มไหนในหน้าจอเรียกใช้แล้วตอนนี้ */
export async function toggleRepost(postId: string): Promise<PostData> {
  if (API_MODE === 'mock') {
    await mockDelay(120)
    let updated: PostData | undefined
    updateDb((d) => {
      d.posts = d.posts.map((p) => {
        if (p.id !== postId) return p
        const base = withRepostDefaults(p, d.user.id)
        const repostedByMe = !base.repostedByMe
        updated = { ...base, repostedByMe, repostCount: Math.max(0, base.repostCount + (repostedByMe ? 1 : -1)) }
        return updated
      })
    })
    if (!updated) throw new ApiError(404, 'ไม่พบโพสต์นี้ — อาจถูกลบไปแล้ว')
    return updated
  }
  return http.post<PostData>(`/posts/${postId}/repost`)
}

/** [ใหม่ — ฟีเจอร์สตอรี่ ข้อ 6] แก้ไขโพสต์ของตัวเอง — เนื้อหา + สลับสถานะสาธารณะ/ไม่ระบุตัวตน
 *  ได้ทุกเมื่อหลังโพสต์ไปแล้ว (ไม่ใช่ตั้งได้แค่ตอนสร้าง) เช็ค ownership ที่ชั้น service เลย
 *  กันเรียกแก้โพสต์คนอื่นผ่าน API ตรงๆ */
export interface UpdatePostPayload {
  content?: string
  isAnonymous?: boolean
}
export async function updatePost(postId: string, patch: UpdatePostPayload): Promise<PostData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    let updated: PostData | undefined
    updateDb((d) => {
      d.posts = d.posts.map((p) => {
        if (p.id !== postId) return p
        if (p.userId !== d.user.id) return p // ไม่ใช่เจ้าของ — ไม่แก้
        updated = { ...withRepostDefaults(p, d.user.id), ...patch }
        return updated
      })
    })
    if (!updated) throw new ApiError(404, 'ไม่พบโพสต์นี้ หรือคุณไม่ใช่เจ้าของโพสต์')
    return updated
  }
  return http.patch<PostData>(`/posts/${postId}`, patch)
}

export interface AddCommentPayload {
  postId: string
  text: string
}

export async function addComment(input: AddCommentPayload): Promise<PostData> {
  if (API_MODE === 'mock') {
    await mockDelay()
    let updated: PostData | undefined
    updateDb((d) => {
      d.posts = d.posts.map((p) => {
        if (p.id !== input.postId) return p
        const comment: PostCommentData = {
          id: `local-comment-${Date.now()}`,
          userId: d.user.id,
          authorName: d.user.username,
          content: input.text,
          createdAt: new Date().toISOString(),
        }
        updated = { ...withRepostDefaults(p, d.user.id), comments: [...p.comments, comment] }
        return updated
      })
    })
    if (!updated) throw new ApiError(404, 'ไม่พบโพสต์นี้ — อาจถูกลบไปแล้ว')
    return updated
  }
  return http.post<PostData>(`/posts/${input.postId}/comments`, { text: input.text })
}
