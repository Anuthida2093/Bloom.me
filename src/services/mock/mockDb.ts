import {
  DEFAULT_USER_DATA,
  type UserData,
  type QuestLogEntry,
  type MoodEntryData,
  type InventoryItem,
  type PostData,
  type ActivityItem,
  type PostLikerInfo,
} from '../../types'

/*============================================================================*\
  mockDb.ts — [ไฟล์ใหม่] ข้อมูลจำลองสำหรับโหมด VITE_API_MODE=mock
  ────────────────────────────────────────────────────────────────────────────
  ทำหน้าที่แทน backend ระหว่างที่ API ยังไม่พร้อม แต่ต่างจากของเดิมตรงที่:
    • อยู่หลังชั้น services/api/ เหมือนกับ API จริงทุกประการ
      คอมโพเนนต์จึงไม่รู้และไม่ต้องรู้ว่ากำลังคุยกับของจำลองหรือของจริง
    • persist ลง localStorage → รีเฟรชแล้วข้อมูลไม่หาย ทดสอบ flow ยาวๆ ได้จริง
  วันที่ backend พร้อม: เปลี่ยน VITE_API_MODE=live เท่านั้น ไฟล์นี้ไม่ต้องลบด้วยซ้ำ
  (เก็บไว้ใช้ตอนเขียนเทสต์และตอน demo แบบไม่มีเน็ตได้)
\*============================================================================*/

const STORE_KEY = 'bloom:mock-db'

/** [เพิ่มรอบนี้ — ระบบ auth จำลอง] บัญชีที่สมัครไว้จริง แยกจาก `user` (ข้อมูลเกมของโปรไฟล์ที่
 * กำลังใช้งานอยู่ตอนนี้) เพราะ mockDb เดิมออกแบบมาเป็น "เซฟไฟล์เดียวต่อเบราว์เซอร์" ไม่มีระบบ
 * หลายบัญชี/สลับผู้ใช้จริง — รายชื่อนี้มีไว้ใช้แค่ตรวจสอบตอน login/register/ลืมรหัสผ่าน
 * (อีเมลซ้ำ, รหัสผ่านถูกไหม) เท่านั้น ไม่ได้ผูกกับข้อมูลเกมแยกรายบัญชีจริง — ดูสรุปท้ายบทสนทนา
 * สำหรับสิ่งที่ backend จริงต้องทำเพิ่มเพื่อให้แยกข้อมูลผู้ใช้แต่ละคนได้จริง */
export interface MockAccount {
  id: string
  /** เก็บเป็นตัวพิมพ์เล็กเสมอ ใช้เป็น key ตรวจอีเมลซ้ำแบบ case-insensitive */
  email: string
  username: string
  /** แฮชด้วย mockAuth.hashPasswordMock — ดูคำเตือนความปลอดภัยในไฟล์นั้น */
  passwordHash: string
  createdAt: string
}

/** [เพิ่มรอบนี้] โทเคนกู้รหัสผ่านชั่วคราว จำลองสิ่งที่ backend จริงจะส่งไปในอีเมล */
export interface MockPasswordResetToken {
  token: string
  email: string
  expiresAt: string
}

/** [เพิ่มรอบนี้ — แยกข้อมูลเกมต่อบัญชี] ข้อมูลเกมทั้งหมดของ "หนึ่งบัญชี" — เดิมฟิลด์เหล่านี้อยู่
 * บนสุดของ MockDb ตรงๆ และใช้ร่วมกันทุกบัญชีในเบราว์เซอร์เดียวกัน (บั๊ก: login/register เปลี่ยน
 * แค่ d.user แต่ไม่แตะ questLogs เลย ทำให้บัญชีใหม่เห็นเควส/mood/โพสต์ของบัญชีก่อนหน้า) ตอนนี้
 * เก็บเป็นสแนปช็อตแยกต่อ accountId ใน MockDb.profiles แทน */
export interface MockAccountProfile {
  user: UserData
  questLogs: QuestLogEntry[]
  moodEntries: MoodEntryData[]
  inventory: InventoryItem[]
  posts: PostData[]
  following: string[]
  activity: ActivityItem[]
  privateProfileUserIds: string[]
}

export interface MockDb {
  user: UserData
  questLogs: QuestLogEntry[]
  moodEntries: MoodEntryData[]
  inventory: InventoryItem[]
  posts: PostData[]
  /** [ใหม่ — ฟีเจอร์สตอรี่] รายชื่อ userId ที่เรา (ผู้ใช้ปัจจุบัน) กดติดตามอยู่ */
  following: string[]
  /** [ใหม่ — ฟีเจอร์สตอรี่] ฟีดกิจกรรม (คนติดตามเรา/ไลค์-คอมเมนต์โพสต์เรา/แชร์มาให้เรา) */
  activity: ActivityItem[]
  /** [เพิ่มรอบแก้ไข Story] userId ของ "ผู้ใช้ปลอมจำลอง" (p1-p7) ที่ตั้งค่าปิดโปรไฟล์ไว้ —
   *  บัญชีเราเองใช้ user.isProfilePrivate แทน (แก้ได้จากหน้าตั้งค่าจริง) ส่วนชุดนี้ mock ตายตัว
   *  ไว้สาธิตว่า toast "โพสต์ปิดโปรไฟล์" ทำงานจริงตอนพยายามดูโปรไฟล์คนอื่นที่ปิดไว้ */
  privateProfileUserIds: string[]
  /** [เพิ่มรอบนี้ — ระบบ auth จำลอง] ดู MockAccount ด้านบน */
  accounts: MockAccount[]
  /** [เพิ่มรอบนี้ — ระบบ auth จำลอง] ดู MockPasswordResetToken ด้านบน */
  passwordResetTokens: MockPasswordResetToken[]
  /** [เพิ่มรอบนี้ — แยกข้อมูลเกมต่อบัญชี] accountId ของบัญชีที่ "active" อยู่ตอนนี้ — ฟิลด์ข้างบน
   *  ทั้งหมด (user, questLogs, ...) คือ "มิเรอร์" ของ profiles[activeAccountId] เท่านั้น ที่ต้อง
   *  คงรูปแบบเดิมไว้บนสุด (ไม่ย้ายเข้า profiles ทั้งหมด) เพราะไฟล์ api อื่นๆ (quest/mood/post/
   *  social/shop.api.ts) อ่าน-เขียนฟิลด์เหล่านี้ตรงๆ อยู่แล้วจำนวนมาก การย้ายจะกระทบวงกว้างเกินจำเป็น */
  activeAccountId: string | null
  /** [เพิ่มรอบนี้ — แยกข้อมูลเกมต่อบัญชี] สแนปช็อตข้อมูลเกมของบัญชีที่ไม่ได้ active อยู่ ณ ขณะนี้
   *  คีย์ด้วย MockAccount.id ห้ามแก้ตรงนี้ตรงๆ ที่อื่น ต้องผ่าน switchActiveAccount() เท่านั้น
   *  ไม่งั้นจะไม่ sync กับมิเรอร์ด้านบน */
  profiles: Record<string, MockAccountProfile>
}

/** [ใหม่] โพสต์ตัวอย่าง 2 อัน — ใช้ userId ตรงกับ MOCK_LEADERBOARD_PLAYERS (p1/p2 ใน
 * config/leaderboardData.ts) เพื่อให้กด "ดูโปรไฟล์" จากฟีดแล้วเจอข้อมูล/ต้นไม้จริงผ่าน
 * viewingPlayer pattern ที่มีอยู่แล้ว (ไม่ใช่แค่ชื่อลอยๆ ที่กดแล้วไม่มีอะไรเกิดขึ้น)
 * อันที่สองตั้งใจให้ isAnonymous: true ไว้เดโมว่าซ่อนชื่อได้จริง */
/** [แก้รอบนี้] likedBy คือแหล่งความจริง — likeCount/likedByMe ต้อง derive ให้ตรงกันเสมอ
 *  (ยังไม่มี userId ของเราเองตอนตั้งต้น เพราะ userId จริงมาจาก mockDb.user.id ซึ่งรู้แค่ตอน
 *  runtime — likedByMe ของ seed จึงเป็น false เสมอ ถูกต้องอยู่แล้วเพราะยังไม่เคยกดไลค์) */
const SEED_LIKERS_1: PostLikerInfo[] = [
  { userId: 'p2', username: 'สิริมา' }, { userId: 'p3', username: 'พงศ์พล' }, { userId: 'p4', username: 'วาสนา' },
]
const SEED_LIKERS_2: PostLikerInfo[] = [{ userId: 'p3', username: 'พงศ์พล' }]
const SEED_LIKERS_3: PostLikerInfo[] = [
  { userId: 'p1', username: 'ธนาวัฒน์' }, { userId: 'p2', username: 'สิริมา' }, { userId: 'p4', username: 'วาสนา' },
  { userId: 'p5', username: 'ณัฐพล' }, { userId: 'p6', username: 'ปริยา' },
]

const SEED_POSTS: PostData[] = [
  {
    id: 'seed-post-1', userId: 'p1', authorName: 'ธนาวัฒน์',
    content: 'วันนี้ทำเควส Deep Root ครบ 90 นาทีแบบไม่วอกแวกเลย! ต้นไม้โตขึ้นอีกระดับ 🌳',
    imageUrl: null, isAnonymous: false, likedBy: SEED_LIKERS_1, likeCount: SEED_LIKERS_1.length, likedByMe: false, comments: [],
    repostedByMe: false, repostCount: 1,
    createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
  {
    id: 'seed-post-2', userId: 'p2', authorName: 'สิริมา',
    content: 'มีใครรู้สึกเหนื่อยกับงานช่วงนี้บ้างไหม... วันนี้เลือกเควสสายผ่อนคลายแทน',
    imageUrl: null, isAnonymous: true, likedBy: SEED_LIKERS_2, likeCount: SEED_LIKERS_2.length, likedByMe: false, comments: [],
    repostedByMe: false, repostCount: 0,
    createdAt: new Date(Date.now() - 20 * 3600_000).toISOString(),
  },
  /** [ใหม่ — ฟีเจอร์สตอรี่] ตัวอย่างโพสต์แนบรูป — ใช้ค่าพิเศษ 'seed-placeholder' แทนรูปจริง
   *  (โปรเจกต์นี้ยังไม่มีระบบอัปโหลดไฟล์ขึ้นเซิร์ฟเวอร์จริง) ฝั่ง PostCard.tsx เช็คค่านี้แล้ว
   *  render เป็นกล่อง gradient แทน <img> เพื่อไม่ให้ broken-image icon ตอน demo */
  {
    id: 'seed-post-3', userId: 'p3', authorName: 'พงศ์พล',
    content: 'ลองทำสวนเล็กๆ ข้างบ้านช่วงวันหยุด ได้ผ่อนคลายมากกว่าที่คิดไว้เยอะเลย 🌿',
    imageUrl: 'seed-placeholder', isAnonymous: false, likedBy: SEED_LIKERS_3, likeCount: SEED_LIKERS_3.length, likedByMe: false, comments: [],
    repostedByMe: false, repostCount: 2,
    createdAt: new Date(Date.now() - 30 * 3600_000).toISOString(),
  },
]

/** [ใหม่ — ฟีเจอร์สตอรี่] กิจกรรมตัวอย่าง — actorId อ้างอิง MOCK_LEADERBOARD_PLAYERS ชุดเดียวกับ
 * SEED_POSTS (p1-p7 ใน config/leaderboardData.ts) เพื่อให้กดติดตาม/ติดตามกลับจากแผงกิจกรรม
 * ส่งผลสอดคล้องกับสถานะ "+" ที่โชว์บน avatar ในฟีดจริง (คนละหน้าจอ แต่คนเดียวกัน) */
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 3600_000).toISOString()
}

/** [แก้รอบนี้ — ตัดเฟส] เหลือ 4 ประเภทตรงตามที่ระบุ (ติดตามใหม่/ไลค์/คอมเมนต์/แชร์มาให้เรา)
 *  postId อ้างอิง SEED_POSTS จริงเพื่อให้กดแถวกิจกรรมแล้ว "เปิดโพสต์นั้นทันที" ได้จริง (ข้อ 14) */
const SEED_ACTIVITY: ActivityItem[] = [
  { id: 'act-1', type: 'NEW_FOLLOWER', actorId: 'p3', actorName: 'พงศ์พล', createdAt: daysAgoIso(2), excerpt: 'เริ่มติดตามคุณ' },
  { id: 'act-2', type: 'NEW_FOLLOWER', actorId: 'p4', actorName: 'วาสนา', createdAt: daysAgoIso(3), excerpt: 'เริ่มติดตามคุณ' },
  { id: 'act-3', type: 'NEW_FOLLOWER', actorId: 'p6', actorName: 'ปริยา', createdAt: daysAgoIso(29), excerpt: 'เริ่มติดตามคุณ' },
  { id: 'act-4', type: 'LIKE_POST', actorId: 'p2', actorName: 'สิริมา', createdAt: daysAgoIso(2), excerpt: 'ถูกใจโพสต์ของคุณ: "ลองทำสวนเล็กๆ ข้างบ้าน..."', postId: 'seed-post-3' },
  { id: 'act-5', type: 'LIKE_POST', actorId: 'p4', actorName: 'วาสนา', createdAt: daysAgoIso(6), excerpt: 'ถูกใจโพสต์ของคุณ: "ลองทำสวนเล็กๆ ข้างบ้าน..."', postId: 'seed-post-3' },
  { id: 'act-6', type: 'COMMENT_POST', actorId: 'p3', actorName: 'พงศ์พล', createdAt: daysAgoIso(3), excerpt: 'แสดงความคิดเห็นในโพสต์ของคุณ: "เก่งมากเลย!"', postId: 'seed-post-1' },
  { id: 'act-7', type: 'COMMENT_POST', actorId: 'p5', actorName: 'ณัฐพล', createdAt: daysAgoIso(29), excerpt: 'แสดงความคิดเห็นในโพสต์ของคุณ: "ทำต่อไปนะ!"', postId: 'seed-post-1' },
  { id: 'act-8', type: 'SHARED_POST_TO_YOU', actorId: 'p7', actorName: 'ชัยวัฒน์', createdAt: daysAgoIso(2), excerpt: 'แชร์โพสต์นี้ให้คุณ', postId: 'seed-post-2' },
]

const EMPTY_DB: MockDb = {
  user: { ...DEFAULT_USER_DATA, id: 'mock-user', username: 'ผู้มาเยือน' },
  questLogs: [],
  moodEntries: [],
  inventory: [],
  posts: SEED_POSTS,
  following: [],
  activity: SEED_ACTIVITY,
  // [เพิ่มรอบแก้ไข Story] ตั้งให้ "วาสนา" (p4) ปิดโปรไฟล์ไว้เป็นตัวอย่างตายตัว — ใช้สาธิต
  // ว่าตอนกดดูโปรไฟล์เขาจาก list เพื่อน/คนกดไลค์/คอมเมนต์ จะเจอ toast แจ้งจริง (ข้อ 11)
  privateProfileUserIds: ['p4'],
  accounts: [],
  passwordResetTokens: [],
  activeAccountId: null,
  profiles: {},
}

/** ดึงมิเรอร์บนสุดของ db มาเป็นสแนปช็อตหนึ่งก้อน (ไว้เก็บเข้า profiles ก่อนสลับบัญชี) */
function snapshotActiveProfile(db: MockDb): MockAccountProfile {
  return {
    user: db.user,
    questLogs: db.questLogs,
    moodEntries: db.moodEntries,
    inventory: db.inventory,
    posts: db.posts,
    following: db.following,
    activity: db.activity,
    privateProfileUserIds: db.privateProfileUserIds,
  }
}

/** เขียนสแนปช็อตทับมิเรอร์บนสุดของ db (ไว้ตอนสลับเข้าบัญชีที่มีข้อมูลอยู่แล้ว) */
function applyProfileToMirror(db: MockDb, profile: MockAccountProfile) {
  db.user = profile.user
  db.questLogs = profile.questLogs
  db.moodEntries = profile.moodEntries
  db.inventory = profile.inventory
  db.posts = profile.posts
  db.following = profile.following
  db.activity = profile.activity
  db.privateProfileUserIds = profile.privateProfileUserIds
}

/** ข้อมูลเริ่มต้นของบัญชีที่ "ไม่เคยมีมาก่อน" — ใช้ posts/activity ตัวอย่างชุดเดียวกับ EMPTY_DB
 * (โคลนใหม่ทุกครั้งกันบัญชีต่างๆ แชร์ reference อาร์เรย์เดียวกันโดยไม่ตั้งใจ) */
function createFreshProfile(userSeed: Partial<UserData>): MockAccountProfile {
  return {
    user: { ...DEFAULT_USER_DATA, id: 'mock-user', username: 'ผู้มาเยือน', ...userSeed },
    questLogs: [],
    moodEntries: [],
    inventory: [],
    posts: structuredClone(SEED_POSTS),
    following: [],
    activity: structuredClone(SEED_ACTIVITY),
    privateProfileUserIds: ['p4'],
  }
}

/** [เพิ่มรอบนี้ — แก้บั๊กเควส/mood/โพสต์ "รั่ว" ข้ามบัญชี] สลับบัญชี active ให้ปลอดภัย: เซฟข้อมูล
 * บัญชีเดิมเข้า profiles ก่อนเสมอ แล้วค่อยโหลด (หรือสร้างใหม่ถ้ายังไม่เคยมี) ข้อมูลของบัญชีปลายทาง
 * เข้ามิเรอร์ — ต้องเรียกจาก login()/register() ใน user.api.ts เท่านั้น ห้ามแก้ d.user/d.questLogs
 * ตรงๆ ตอนสลับบัญชีที่อื่นอีก เพราะจะย้อนกลับไปเป็นบั๊กเดิม (เซฟไฟล์เดียวใช้ร่วมกันทุกบัญชี) */
export function switchActiveAccount(
  db: MockDb,
  accountId: string,
  userSeed: Partial<UserData> = {},
): UserData {
  if (db.activeAccountId && db.activeAccountId !== accountId) {
    db.profiles[db.activeAccountId] = snapshotActiveProfile(db)
  }
  const existing = db.profiles[accountId]
  if (existing) {
    applyProfileToMirror(db, existing)
    if (Object.keys(userSeed).length > 0) db.user = { ...db.user, ...userSeed }
  } else {
    applyProfileToMirror(db, createFreshProfile(userSeed))
  }
  db.activeAccountId = accountId
  db.profiles[accountId] = snapshotActiveProfile(db)
  return db.user
}

function read(): MockDb {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return structuredClone(EMPTY_DB)
    const db = { ...structuredClone(EMPTY_DB), ...(JSON.parse(raw) as Partial<MockDb>) }
    // [ใหม่] db.user จาก JSON.parse (ถ้ามี) แทนที่ EMPTY_DB.user ทั้งก้อนแบบ shallow (ไม่ merge
    // ทีละฟิลด์) — ผู้ใช้เดิมที่ persist ไว้ก่อนมีฟิลด์ gender จะไม่มีคีย์นี้เลย (undefined จริง
    // ตอน runtime ถึง type จะบอกว่าไม่ null ก็ตาม) เติม fallback 'FEMALE' ตรงนี้จุดเดียวตามที่ระบุ
    db.user.gender = db.user.gender ?? 'FEMALE'
    return db
  } catch {
    return structuredClone(EMPTY_DB)
  }
}

function write(db: MockDb) {
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(db)) } catch { /* noop */ }
}

/** อ่านสำเนาปัจจุบัน (อ่านอย่างเดียว ห้ามแก้ object ที่คืนไปตรงๆ) */
export function getDb(): MockDb {
  return read()
}

/** แก้ข้อมูลแล้วบันทึกทันที — คืนสำเนาใหม่ */
export function updateDb(mutator: (db: MockDb) => void): MockDb {
  const db = read()
  mutator(db)
  write(db)
  return db
}

export function resetDb() {
  try { window.localStorage.removeItem(STORE_KEY) } catch { /* noop */ }
}