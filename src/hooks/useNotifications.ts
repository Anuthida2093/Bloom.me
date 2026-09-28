import { useEffect, useMemo, useState } from 'react'
import { usePersistentState } from './usePersistentState'
import { useAppContext } from '../context/AppContext'
import { useSocial } from '../context/SocialContext'
import { usePosts } from '../context/PostContext'
import { ALL_QUESTS, QUEST_CATALOG_BY_TAB, findQuestByCode, CATEGORY_TO_TAB, type QuestTabId } from '../config/questCatalog'
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

/* [แก้ตามที่ระบุ] ไม่แจ้งเตือน "ทำเควสสำเร็จ" แล้ว (ผู้ใช้เพิ่งทำเองรู้อยู่แล้ว) — แจ้งเฉพาะ:
     - เควสเสริม/ด่านถัดไปเปิดให้เล่นได้แล้ว (QUEST_UNLOCKED)
     - เพื่อน (คนที่เราติดตาม) โพสต์สตอรี่ใหม่ (FRIEND_STORY)
     - กิจกรรมบนสตอรี่ของเรา: ติดตาม/ไลค์/คอมเมนต์/แชร์ (NEW_FOLLOWER ฯลฯ)
     - ถึงเวลาทำเควสนั้นๆ ของวันนี้แล้วแต่ยังไม่ได้ทำ (QUEST_REMINDER — ดู QUEST_REMINDERS) */
export type NotificationKind =
  | 'QUEST_UNLOCKED' | 'QUEST_REMINDER' | 'FRIEND_STORY'
  | 'NEW_FOLLOWER' | 'LIKE_POST' | 'COMMENT_POST' | 'SHARED_POST_TO_YOU'

/** เวลาเตือนให้ทำเควสแต่ละอันของวัน (ชั่วโมง:นาที) — เตือนเมื่อถึงเวลาแล้วและวันนี้ยังไม่ได้ทำ */
const QUEST_REMINDERS: { code: string; time: string; text: string }[] = [
  { code: 'phys-sunlit-root', time: '07:30', text: 'ได้เวลารับแดดยามเช้าแล้ว — มาทำเควส "สังเคราะห์แสง" กัน' },
  { code: 'know-active-focus', time: '09:00', text: 'เริ่มวันด้วยการตั้งเป้าหมาย — ถึงเวลาทำเควส "เพ่งสมาธิ / ตั้งเป้าหมาย"' },
  { code: 'phys-hydration-drop', time: '10:00', text: 'ดื่มน้ำสักแก้วไหม? ถึงเวลาทำเควส "น้ำพุหล่อเลี้ยงราก"' },
  { code: 'phys-balanced-nutrients', time: '12:00', text: 'มื้อกลางวันแล้ว — ถ่ายรูปอาหารทำเควส "แคลอรี่ตาม BMI"' },
  { code: 'phys-hydration-drop', time: '15:00', text: 'บ่ายแล้ว อย่าลืมดื่มน้ำ — เควส "น้ำพุหล่อเลี้ยงราก" รออยู่' },
  { code: 'phys-green-vision', time: '16:00', text: 'พักสายตาสักครู่ — ถึงเวลาทำเควส "พักสายตา / ถนอมใบไม้"' },
  { code: 'phys-vitality-steps', time: '18:00', text: 'ออกไปเดินยืดเส้นยืดสาย — ถึงเวลาทำเควส "ก้าวเพื่อสุขภาพ"' },
  { code: 'ment-gratitude-shield', time: '20:00', text: 'วันนี้อยากขอบคุณใคร? ถึงเวลาเขียน "คำขอบคุณ"' },
  { code: 'ment-reframer-journal', time: '21:00', text: 'ก่อนนอนมาบันทึกเรื่องราววันนี้ใน "ไดอะรี่ของฉัน" กัน' },
  { code: 'phys-soil-restoration', time: '22:00', text: 'ใกล้เวลานอนแล้ว — เปิดคลิปกล่อมนอนในเควส "ฟื้นฟูหน้าดิน"' },
]
/** โพสต์ของเพื่อนที่ใหม่กว่านี้ถึงแจ้งเตือน */
const FRIEND_STORY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000

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
  /** กดแล้วพาไปเปิดหมวดเควสนี้ (เฉพาะ QUEST_UNLOCKED/QUEST_REMINDER) */
  questTab?: QuestTabId
  /** [แก้ตามที่ระบุ] กดแล้วเปิดหน้าเล่นของเควสนี้เลย (ไม่ใช่แค่หน้ารวมหมวด) */
  questCode?: string
  /** กดแล้วพาไปเปิดโพสต์นี้ในสตอรี่ (เฉพาะกิจกรรมที่มี postId) */
  postId?: string | null
  /** [เพิ่มตามที่ระบุ] อ่านแล้ว — เคยกดเปิดรายการนี้ หรือมาก่อนการเปิดแผงแจ้งเตือนครั้งก่อน */
  read?: boolean
}

/** [แก้ตามที่ระบุ — เปลี่ยนอีโมจิเป็นรูปภาพทั้งหมดสำหรับการแจ้งเตือน] ใช้รูปจริงจาก
 *  iconAssets.ts ทุกจุดที่มีไฟล์จริงรองรับ — ตรวจแล้วไม่มีไฟล์ไอคอน "ไลค์"/"คอมเมนต์" อยู่ใน
 *  public/assets/images/decorations/ (เดิม icons/badges/) เลยสักไฟล์ (ls จริงแล้ว) จึงยังคงเป็นอีโมจิไว้ก่อน 2 จุด
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
  const { questLogs, userData } = useAppContext()
  const { activity, isFollowing } = useSocial()
  const { posts } = usePosts()
  // นาฬิกาเดินทุกนาที — ให้แจ้งเตือนตามเวลา (QUEST_REMINDER) โผล่เองเมื่อถึงเวลาโดยไม่ต้องรีเฟรช
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const [lastSeenAt, setLastSeenAt] = usePersistentState<string>('notif-last-seen', new Date(0).toISOString())
  /** รายการที่กดเปิดอ่านแล้ว (เก็บล่าสุดไม่เกิน 200 id) */
  const [readIds, setReadIds] = usePersistentState<string[]>('notif-read-ids', [])
  /** เวลาเปิดแผงครั้งก่อน — รายการที่เก่ากว่านี้ถือว่าอ่านแล้ว (ส่วนที่ใหม่กว่ายังโชว์เป็น "ยังไม่อ่าน"
   *  ตลอดการเปิดแผงรอบนี้ แม้ badge ตัวเลขจะเคลียร์ไปแล้ว ผู้ใช้จึงยังเห็นว่าอันไหนเพิ่งเข้ามา) */
  const [previousSeenAt, setPreviousSeenAt] = useState(lastSeenAt)

  const items = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = []

    for (const a of activity) {
      const { icon, isImage } = ACTIVITY_ICON[a.type]
      list.push({
        id: `act-${a.id}`, kind: a.type, icon, iconIsImage: isImage,
        text: activityText(a), createdAt: a.createdAt, postId: a.postId ?? null,
      })
    }

    const now = new Date(nowMs)
    const todayStr = now.toDateString()
    const latestCompletedAtByCode = new Map<string, string>()
    const todayCountByCode = new Map<string, number>()
    for (const log of questLogs) {
      if (log.status !== 'COMPLETED' || !log.completedAt || !log.quest?.code) continue
      const prev = latestCompletedAtByCode.get(log.quest.code)
      if (!prev || log.completedAt > prev) latestCompletedAtByCode.set(log.quest.code, log.completedAt)

      if (new Date(log.completedAt).toDateString() !== todayStr) continue
      todayCountByCode.set(log.quest.code, (todayCountByCode.get(log.quest.code) ?? 0) + 1)
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
        createdAt: unlockedAt, questTab: CATEGORY_TO_TAB[q.category], questCode: q.code,
      })
    }

    // เควสเสริมที่ล็อกแบบ "ทำเควสประจำวันครบ N ข้อ" (isLocked + unlockAfterQuestCount) — แจ้งเมื่อ
    // วันนี้ทำเควสประจำวันของหมวดนั้นครบแล้ว และเควสเสริมนั้นยังไม่ได้ทำวันนี้
    for (const tab of Object.keys(QUEST_CATALOG_BY_TAB) as QuestTabId[]) {
      const { daily, side } = QUEST_CATALOG_BY_TAB[tab]
      const doneDailyToday = daily
        .map((d) => ({ code: d.code, at: latestCompletedAtByCode.get(d.code) }))
        .filter((d) => d.at && new Date(d.at).toDateString() === todayStr)
        .map((d) => d.at as string)
        .sort()
      for (const q of [...daily, ...side]) {
        if (!q.isLocked) continue
        const need = q.unlockAfterQuestCount ?? 1
        if (doneDailyToday.length < need || todayCountByCode.has(q.code)) continue
        const questIcon = QUEST_ICONS[q.code]
        list.push({
          id: `qs-${q.code}-${todayStr}`, kind: 'QUEST_UNLOCKED', icon: questIcon ?? q.icon, iconIsImage: !!questIcon,
          text: `เควสเสริม "${q.titleTh}" เปิดให้เล่นได้แล้ว`,
          createdAt: doneDailyToday[need - 1], questTab: tab, questCode: q.code,
        })
      }
    }

    // ถึงเวลาทำเควสแล้วแต่วันนี้ยังไม่ได้ทำ
    for (const r of QUEST_REMINDERS) {
      const def = findQuestByCode(r.code)
      if (!def) continue
      const [hh, mm] = r.time.split(':').map(Number)
      const at = new Date(now)
      at.setHours(hh, mm, 0, 0)
      if (at.getTime() > nowMs) continue
      const doneToday = todayCountByCode.get(r.code) ?? 0
      if (def.maxPerDay ? doneToday >= def.maxPerDay : doneToday > 0) continue
      const questIcon = QUEST_ICONS[def.code]
      list.push({
        id: `rem-${r.code}-${r.time}-${todayStr}`, kind: 'QUEST_REMINDER', icon: questIcon ?? def.icon, iconIsImage: !!questIcon,
        text: r.text, createdAt: at.toISOString(), questTab: CATEGORY_TO_TAB[def.category], questCode: def.code,
      })
    }

    // สตอรี่ใหม่จากเพื่อน (คนที่เราติดตาม) — โพสต์ไม่ระบุตัวตนไม่นับ (ไม่รู้ว่าใครโพสต์)
    for (const post of posts) {
      if (post.isAnonymous || post.userId === userData.id || !isFollowing(post.userId)) continue
      if (nowMs - new Date(post.createdAt).getTime() > FRIEND_STORY_WINDOW_MS) continue
      list.push({
        id: `fs-${post.id}`, kind: 'FRIEND_STORY', icon: BADGE_ICONS.friends, iconIsImage: true,
        text: `${post.authorName} โพสต์สตอรี่ใหม่${post.content ? `: "${post.content.slice(0, 40)}${post.content.length > 40 ? '…' : ''}"` : ''}`,
        createdAt: post.createdAt, postId: post.id,
      })
    }

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [activity, questLogs, posts, userData.id, isFollowing, nowMs])

  const unreadCount = useMemo(
    () => items.filter((n) => n.createdAt > lastSeenAt).length,
    [items, lastSeenAt],
  )

  const itemsWithRead = useMemo(
    () => items.map((n) => ({ ...n, read: readIds.includes(n.id) || n.createdAt <= previousSeenAt })),
    [items, readIds, previousSeenAt],
  )

  const markAllSeen = () => {
    setPreviousSeenAt(lastSeenAt)
    setLastSeenAt(new Date().toISOString())
  }

  const markRead = (id: string) =>
    setReadIds((prev) => (prev.includes(id) ? prev : [id, ...prev].slice(0, 200)))

  return { items: itemsWithRead, unreadCount, markAllSeen, markRead }
}
