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
}

function read(): MockDb {
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    if (!raw) return structuredClone(EMPTY_DB)
    return { ...structuredClone(EMPTY_DB), ...(JSON.parse(raw) as Partial<MockDb>) }
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