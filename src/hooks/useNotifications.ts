import { useMemo } from 'react'
import { usePersistentState } from './usePersistentState'
import { useAppContext } from '../context/AppContext'
import { useSocial } from '../context/SocialContext'
import { ALL_QUESTS, findQuestByCode, CATEGORY_TO_TAB, type QuestTabId } from '../config/questCatalog'
import { BADGE_ICONS, QUEST_ICONS } from '../config/iconAssets'
import type { ActivityItem } from '../types'

/*============================================================================*\
  useNotifications — [ไฟล์ใหม่ตามที่ระบุ] แจ้งเตือนรวม "แบบ derived" ล้วนๆ

  ────────────────────────────────────────────────────────────────────────────
  ไม่มี notification table ใหม่ฝั่ง backend เลยตามหลักการ "หลังบ้านทำงานน้อยที่สุด" ที่
  ใช้ตอนออกแบบฟีเจอร์ Story (ดู types.ts ข้อ Feed/Social — likeCount/comments ก็ derive
  จากข้อมูลที่มีอยู่แล้วเหมือนกัน) — รวมมาจาก 3 แหล่งที่มีอยู่แล้วในระบบทั้งหมด:
    1) useSocial().activity — ฟีดกิจกรรม Story เดิม (ติดตามใหม่/ไลค์/คอมเมนต์/แชร์มาให้เรา)
    2) questLogs ที่ completedAt = วันนี้ → สรุปเป็น "ทำเควส X สำเร็จ"
    3) เควสที่มี requiresQuestIds ครบทุกตัวแล้ว (ปลดล็อกแล้ว) — เวลา "ปลดล็อก" คำนวณจาก
       completedAt ล่าสุดในบรรดาเควสที่เป็นเงื่อนไข (ดู isRequiredQuestsIncomplete ใน
       QuestSection.tsx ที่ใช้ requiresQuestIds เดียวกันนี้ตัดสินใจล็อก/ปลดล็อกอยู่แล้ว)
       [ขอบเขตที่ตั้งใจไม่รวม] เควสที่ล็อกแบบนับจำนวน (isLocked+unlockAfterQuestCount เช่น
       know-daily-checkin) และเควสที่ล็อกจากเงื่อนไขความเสี่ยง/โควตาโฟกัส/เวลาตัดจอ (ผันผวน
       ตามเวลาจริง ไม่ใช่ "ปลดล็อกครั้งเดียวถาวร") ไม่นับเป็นแจ้งเตือน — นับเฉพาะ
       requiresQuestIds ซึ่งเป็นแบบ data-driven ตรงไปตรงมาที่สุด

  "อ่านแล้ว/ยังไม่อ่าน" เทียบกับ lastSeenAt เก็บใน localStorage ผ่าน usePersistentState
  (pattern เดียวกับ story-recent-searches ใน SocialContext.tsx) — เปิด list แล้วอัปเดตทันที
\*============================================================================*/

export type NotificationKind =
  | 'QUEST_UNLOCKED' | 'QUEST_COMPLETED'
  | 'NEW_FOLLOWER' | 'LIKE_POST' | 'COMMENT_POST' | 'SHARED_POST_TO_YOU'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  icon: string
  /** [เพิ่มตามที่ระบุ] true = icon เป็น path รูปจริง (ต้องเรนเดอร์เป็น <img>) false/ไม่ใส่ =
   *  icon เป็นอีโมจิ (เรนเดอร์เป็นตัวอักษรตรงๆ) — ตั้งเป็น field แยกชัดเจนแทนการเดาจาก
   *  prefix ของ string เพื่อไม่ให้ NotificationPanel.tsx ต้องรู้ไส้ในของ path */
  iconIsImage?: boolean
  text: string
  createdAt: string
  /** กดแล้วพาไปเปิดหมวดเควสนี้ (เฉพาะ QUEST_UNLOCKED/QUEST_COMPLETED) */
  questTab?: QuestTabId
  /** กดแล้วพาไปเปิดโพสต์นี้ในสตอรี่ (เฉพาะกิจกรรมที่มี postId) */
  postId?: string | null
}

/** [แก้ตามที่ระบุ — เปลี่ยนอีโมจิเป็นรูปภาพทั้งหมดสำหรับการแจ้งเตือน] ใช้รูปจริงจาก
 *  iconAssets.ts ทุกจุดที่มีไฟล์จริงรองรับ — ตรวจแล้วไม่มีไฟล์ไอคอน "ไลค์"/"คอมเมนต์" อยู่ใน
 *  public/assets/images/icons/badges/ เลยสักไฟล์ (ls จริงแล้ว) จึงยังคงเป็นอีโมจิไว้ก่อน 2 จุด
 *  นี้เท่านั้น — ถ้ามีไฟล์รูปเพิ่มในอนาคตค่อยสลับ path เข้ามาแทนที่นี่ได้จุดเดียว */
const ACTIVITY_ICON: Record<ActivityItem['type'], { icon: string; isImage: boolean }> = {
  NEW_FOLLOWER: { icon: BADGE_ICONS.friends, isImage: true },
  LIKE_POST: { icon: '❤️', isImage: false },
  COMMENT_POST: { icon: '💬', isImage: false },
  SHARED_POST_TO_YOU: { icon: BADGE_ICONS.share, isImage: true },
}

function activityText(item: ActivityItem): string {
  switch (item.type) {
    case 'NEW_FOLLOWER': return `${item.actorName} เริ่มติดตามคุณ`
    case 'LIKE_POST': return `${item.actorName} กดไลค์โพสต์ของคุณ`
    case 'COMMENT_POST': return `${item.actorName} คอมเมนต์${item.excerpt ? `: "${item.excerpt}"` : 'บนโพสต์ของคุณ'}`
    case 'SHARED_POST_TO_YOU': return `${item.actorName} แชร์โพสต์มาให้คุณ`
  }
}

export function useNotifications() {
  const { questLogs } = useAppContext()
  const { activity } = useSocial()
  const [lastSeenAt, setLastSeenAt] = usePersistentState<string>('notif-last-seen', new Date(0).toISOString())

  const items = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = []

    for (const a of activity) {
      const { icon, isImage } = ACTIVITY_ICON[a.type]
      list.push({
        id: `act-${a.id}`, kind: a.type, icon, iconIsImage: isImage,
        text: activityText(a), createdAt: a.createdAt, postId: a.postId ?? null,
      })
    }

    const todayStr = new Date().toDateString()
    const latestCompletedAtByCode = new Map<string, string>()
    for (const log of questLogs) {
      if (log.status !== 'COMPLETED' || !log.completedAt || !log.quest?.code) continue
      const prev = latestCompletedAtByCode.get(log.quest.code)
      if (!prev || log.completedAt > prev) latestCompletedAtByCode.set(log.quest.code, log.completedAt)

      if (new Date(log.completedAt).toDateString() !== todayStr) continue
      const def = findQuestByCode(log.quest.code)
      if (!def) continue
      const questIcon = QUEST_ICONS[def.code]
      list.push({
        id: `qc-${log.id}`, kind: 'QUEST_COMPLETED', icon: questIcon ?? def.icon, iconIsImage: !!questIcon,
        text: `ทำเควส "${def.titleTh}" สำเร็จ +${def.coinReward} เหรียญ`,
        createdAt: log.completedAt, questTab: CATEGORY_TO_TAB[def.category],
      })
    }

    for (const q of ALL_QUESTS) {
      if (!q.requiresQuestIds || q.requiresQuestIds.length === 0) continue
      if (latestCompletedAtByCode.has(q.code)) continue // ทำไปแล้ว ไม่ต้องแจ้ง "ปลดล็อก" อีก
      const depTimes = q.requiresQuestIds.map((code) => latestCompletedAtByCode.get(code))
      if (depTimes.some((t) => !t)) continue // ยังทำเงื่อนไขไม่ครบ ยังไม่ปลดล็อกจริง
      const confirmedDepTimes = depTimes as string[]
      const unlockedAt = confirmedDepTimes.reduce((max, t) => (t > max ? t : max), confirmedDepTimes[0])
      const questIcon = QUEST_ICONS[q.code]
      list.push({
        id: `qu-${q.code}`, kind: 'QUEST_UNLOCKED', icon: questIcon ?? q.icon, iconIsImage: !!questIcon,
        text: `ปลดล็อกเควสใหม่ "${q.titleTh}" แล้ว`,
        createdAt: unlockedAt, questTab: CATEGORY_TO_TAB[q.category],
      })
    }

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [activity, questLogs])

  const unreadCount = useMemo(
    () => items.filter((n) => n.createdAt > lastSeenAt).length,
    [items, lastSeenAt],
  )

  const markAllSeen = () => setLastSeenAt(new Date().toISOString())

  return { items, unreadCount, markAllSeen }
}
