import { ApiError } from '../http'
import { DEFAULT_USER_DATA, type ActivityItem, type Gender, type InventoryItem, type MbtiType, type PostCommentData, type PostData, type QuestLogEntry, type UserData } from '../../types'

/*============================================================================*\
  adapters.ts — แปลง response ของ backend จริง (repo bloom-me-project, Express + Prisma)
  ให้เป็น type ที่หน้าเว็บใช้อยู่แล้ว — ใช้เฉพาะโหมด live (VITE_API_MODE=live)
  ────────────────────────────────────────────────────────────────────────────
  ยึดสัญญาของ backend เป็นหลัก (path/body/ชื่อ field) แล้วแปลงที่ชั้น service จุดเดียว
  คอมโพเนนต์/Context ไม่ต้องรู้ว่าข้อมูลมาจาก mock หรือ backend จริง
  gender/isProfilePrivate มีคอลัมน์ใน backend แล้ว (migration frontend_contract) — เหลือ
  waterDrops ที่ยังเก็บในเครื่องแยกตาม user (localExtras) เพราะยังไม่ได้ตัดสินกติกาการได้หยดน้ำ
  ฝั่งเซิร์ฟเวอร์ (ถ้าให้หน้าเว็บส่งค่ามาเองผู้ใช้จะโกงได้) — ดู docs/DB_CHANGES.md
\*============================================================================*/

/** รายการแบบแบ่งหน้าของ backend: GET /mood/me, /quests/logs/me, /brain-dump/me ฯลฯ */
export interface Paginated<T> {
  data: T[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

/** ดึงให้ได้ทีเดียวพอสำหรับหน้าจอปัจจุบัน (backend จำกัด pageSize สูงสุด 100) */
export const MAX_PAGE_SIZE = 100

/** ฟีเจอร์ที่หน้าเว็บมีแต่ backend ยังไม่มี endpoint — โยน error ภาษาไทยที่ชัดเจนแทนการยิงไปเจอ 404 */
export function notSupportedYet(feature: string): never {
  throw new ApiError(501, `${feature} ยังไม่รองรับบนเซิร์ฟเวอร์ — รอ backend เพิ่ม endpoint`)
}

/* ── field ที่ backend ยังไม่มี (waterDrops) + ค่าสำรองของ gender/isProfilePrivate: เก็บในเครื่อง ──
   ค่าจาก backend ชนะเสมอ ใช้ค่าในเครื่องเฉพาะเมื่อ response ไม่มี field นั้น */

export interface LocalUserExtras {
  gender: Gender
  waterDrops: number
  isProfilePrivate: boolean
}

const EXTRAS_KEY = (userId: string) => `bloom:user-extras:${userId}`

export function getLocalExtras(userId: string): LocalUserExtras {
  const fallback: LocalUserExtras = {
    gender: DEFAULT_USER_DATA.gender,
    waterDrops: DEFAULT_USER_DATA.waterDrops,
    isProfilePrivate: DEFAULT_USER_DATA.isProfilePrivate,
  }
  try {
    const raw = window.localStorage.getItem(EXTRAS_KEY(userId))
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<LocalUserExtras>) } : fallback
  } catch {
    return fallback
  }
}

export function setLocalExtras(userId: string, patch: Partial<LocalUserExtras>) {
  try {
    window.localStorage.setItem(EXTRAS_KEY(userId), JSON.stringify({ ...getLocalExtras(userId), ...patch }))
  } catch { /* storage ปิดอยู่ — ค่าเสริมหายเมื่อรีเฟรช ไม่กระทบข้อมูลหลัก */ }
}

/* ── User ── */

/** user จาก backend (GET /users/me, login/register, PATCH /users/me, หรือ select ย่อยตอนให้รางวัล)
 *  → UserData เต็มรูป — field ที่ response ไม่มีใช้ค่าจาก `prev` (ข้อมูลเดิมในแคช) ก่อนค่าเริ่มต้น */
export function toUserData(raw: Record<string, unknown>, prev?: UserData): UserData {
  const base = prev ?? DEFAULT_USER_DATA
  const id = (raw.id as string | undefined) ?? base.id
  const merged = { ...base } as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_USER_DATA)) {
    if (key in raw && raw[key] !== undefined) merged[key] = raw[key]
  }
  const extras = id ? getLocalExtras(id) : null
  const localOnly: Partial<LocalUserExtras> = {}
  if (extras) {
    localOnly.waterDrops = extras.waterDrops
    if (raw.gender == null) localOnly.gender = extras.gender
    if (raw.isProfilePrivate == null) localOnly.isProfilePrivate = extras.isProfilePrivate
  }
  return {
    ...(merged as unknown as UserData),
    id,
    mbtiType: ((raw.mbtiType ?? base.mbtiType) as MbtiType | null),
    ...localOnly,
  }
}

/** ฟิลด์ที่ PATCH /users/me รับจริง (updateMyProfileSchema) — ที่เหลือ backend ตัดทิ้งเงียบๆ */
const PROFILE_PATCH_KEYS = [
  'username', 'avatarUrl', 'bio', 'mbtiType', 'birthDate', 'height', 'weight', 'gender', 'isProfilePrivate',
] as const

/** แปลง patch ของหน้าเว็บให้ผ่าน validation ของ backend: เอาเฉพาะคีย์ที่รับ + ตัด null ออก
 *  (zod ฝั่ง backend ใช้ .optional() ไม่รับ null) */
export function toProfilePatchBody(patch: Partial<UserData>): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const key of PROFILE_PATCH_KEYS) {
    const value = patch[key]
    if (value === null || value === undefined || value === '') continue
    body[key] = value
  }
  return body
}

/* ── Quest / Inventory ── */

export function toQuestLogEntry(raw: Record<string, unknown>): QuestLogEntry {
  const quest = raw.quest as Record<string, unknown> | undefined
  return {
    id: raw.id as string,
    status: raw.status as QuestLogEntry['status'],
    userId: raw.userId as string,
    questId: raw.questId as string,
    quest: quest ? { ...quest, code: quest.code as string } : undefined,
    logDate: (raw.logDate as string | null) ?? null,
    completedAt: (raw.completedAt as string | null) ?? null,
    payload: (raw.payload as Record<string, unknown> | undefined) ?? undefined,
  }
}

export function toInventoryItem(raw: Record<string, unknown>): InventoryItem {
  return {
    id: raw.id as string,
    userId: raw.userId as string,
    shopItemId: raw.shopItemId as string,
    isEquipped: Boolean(raw.isEquipped),
    purchasedAt: raw.purchasedAt as string,
    shopItem: raw.shopItem as InventoryItem['shopItem'],
  }
}

/* ── Posts ── */

/** โพสต์จาก backend: ฟีด (มี author/likeCount/likedByMe/commentCount) หรือโพสต์ดิบจาก
 *  POST/PATCH /posts (ไม่มี author/นับไลก์) — ใส่ชื่อผู้โพสต์จาก `me` เมื่อเป็นโพสต์ของเราเอง
 *  comments/likedBy เติมทีหลังจาก GET /posts/:id/comments และ /likes (post.api.ts) */
export function toPostData(raw: Record<string, unknown>, me: { id: string; username: string }): PostData {
  const author = raw.author as { username?: string } | null | undefined
  const userId = (raw.userId as string | null) ?? ''
  const isMine = userId === me.id
  return {
    id: raw.id as string,
    userId,
    authorName: author?.username ?? (isMine ? me.username : 'ไม่ระบุตัวตน'),
    content: raw.content as string,
    imageUrl: (raw.imageUrl as string | null) ?? null,
    isAnonymous: Boolean(raw.isAnonymous),
    likedBy: [],
    likeCount: (raw.likeCount as number | undefined) ?? 0,
    likedByMe: Boolean(raw.likedByMe),
    comments: [],
    createdAt: raw.createdAt as string,
    repostedByMe: false,
    repostCount: 0,
  }
}

export function toCommentData(raw: Record<string, unknown>, me: { id: string; username: string }): PostCommentData {
  const author = raw.author as { username?: string } | undefined
  return {
    id: raw.id as string,
    userId: raw.userId as string,
    authorName: author?.username ?? (raw.userId === me.id ? me.username : 'ผู้ใช้'),
    content: raw.content as string,
    createdAt: raw.createdAt as string,
  }
}

/* ── Social ── */

export function toActivityItem(raw: Record<string, unknown>): ActivityItem {
  const actor = (raw.actor as { id?: string; username?: string } | null) ?? {}
  return {
    id: raw.id as string,
    type: raw.type as ActivityItem['type'],
    actorId: actor.id ?? '',
    actorName: actor.username ?? 'ผู้ใช้',
    createdAt: raw.createdAt as string,
    excerpt: (raw.postExcerpt as string | null) ?? null,
    postId: (raw.postId as string | null) ?? null,
  }
}
