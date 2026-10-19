import { useCallback, useEffect, useState } from 'react'

/*============================================================================*\
  savedPosts.ts — [ใหม่ตามที่ระบุ] "บันทึกโพสต์" (ไอคอนบุ๊กมาร์กขวาสุดของแถวไอคอน แบบ IG)
  เก็บในเครื่องแยกตามบัญชี — backend ยังไม่มีตาราง saved posts (ข้อเสนอ: POST/DELETE
  /api/posts/:id/save · GET /api/posts/saved) เปลี่ยนเครื่องแล้วรายการที่บันทึกไม่ตามไป
\*============================================================================*/

const KEY = (userId: string) => `bloom:saved-posts:${userId}`
const CHANGED = 'bloom:saved-posts-changed'

function load(userId: string): string[] {
  try {
    const raw = localStorage.getItem(KEY(userId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}

/** [ใหม่ตามที่ระบุ] รายการ id โพสต์ที่บันทึกไว้ทั้งหมด (ล่าสุดก่อน) — หน้า "บันทึก" ในเมนูสามขีดของสตอรี่ */
export function useSavedPostIds(userId: string): string[] {
  const [ids, setIds] = useState(() => load(userId))
  useEffect(() => {
    const sync = () => setIds(load(userId))
    window.addEventListener(CHANGED, sync)
    return () => window.removeEventListener(CHANGED, sync)
  }, [userId])
  return ids
}

/** สถานะบันทึกของโพสต์หนึ่งโพสต์ + สลับบันทึก/เลิกบันทึก (ทุกการ์ดของโพสต์เดียวกันอัปเดตพร้อมกัน) */
export function useSavedPost(userId: string, postId: string): [boolean, () => void] {
  const [saved, setSaved] = useState(() => load(userId).includes(postId))

  useEffect(() => {
    const sync = () => setSaved(load(userId).includes(postId))
    window.addEventListener(CHANGED, sync)
    return () => window.removeEventListener(CHANGED, sync)
  }, [userId, postId])

  const toggle = useCallback(() => {
    const list = load(userId)
    const next = list.includes(postId) ? list.filter((id) => id !== postId) : [postId, ...list]
    try { localStorage.setItem(KEY(userId), JSON.stringify(next)) } catch { /* storage ปิด — สลับแค่บนจอ */ }
    setSaved(next.includes(postId))
    window.dispatchEvent(new CustomEvent(CHANGED))
  }, [userId, postId])

  return [saved, toggle]
}
