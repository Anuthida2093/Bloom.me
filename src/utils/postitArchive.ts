/*============================================================================*\
  postitArchive.ts — [ใหม่ตามที่ระบุ] โพสอิทที่ผู้ใช้กด "เก็บเข้าประวัติ" (เอาออกจากต้นไม้)
  ────────────────────────────────────────────────────────────────────────────
  โพสอิทบนต้นไม้เลือกได้ว่าจะเก็บ (ย้ายเข้าประวัติ) หรือทิ้งไว้บนต้นไม้ต่อ — ที่เก็บแล้วอ่านย้อนหลังได้
  ที่หน้าโปรไฟล์ → ประวัติการเขียน → ประวัติโพสอิท (PostItHistoryModal.tsx)
  เก็บในเครื่องแยกตามบัญชี (backend ยังไม่มีตารางประวัติโพสอิทแยก — ลบจาก post_its ตอนเก็บ)
\*============================================================================*/

export interface ArchivedPostIt {
  id: string
  content: string
  color: string
  /** วันที่เขียนโพสอิท (ถ้ารู้) */
  createdAt: string | null
  /** วันที่กดเก็บเข้าประวัติ */
  savedAt: string
}

const keyOf = (userId: string) => `bloom.postitArchive.${userId || 'guest'}`

export function loadPostItArchive(userId: string): ArchivedPostIt[] {
  try {
    const raw = JSON.parse(localStorage.getItem(keyOf(userId)) ?? '[]') as ArchivedPostIt[]
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}

export function addToPostItArchive(userId: string, item: ArchivedPostIt): void {
  try {
    const next = [item, ...loadPostItArchive(userId).filter((p) => p.id !== item.id)].slice(0, 500)
    localStorage.setItem(keyOf(userId), JSON.stringify(next))
  } catch { /* พื้นที่เต็ม/ปิดอยู่ */ }
}
