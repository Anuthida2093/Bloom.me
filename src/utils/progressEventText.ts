import type { ProgressEvent } from '../services/api/activity.api'
import type { TranslationKey } from '../i18n/th'
import { findQuestByCode } from '../config/questCatalog'
import { DECORATION_ITEM_META } from '../config/decorationItems'
import { BADGE_ICONS, ITEM_ICONS, QUEST_ICONS, QUEST_TAB_ICONS, RANK_CATEGORY_ICONS } from '../config/iconAssets'
import { RANK_CATEGORIES } from '../config/leaderboardData'

/*============================================================================*\
  progressEventText.ts — ข้อความ/รูปของเหตุการณ์เพื่อน (ใช้ร่วมกันทั้ง toast และแผงแจ้งเตือน)
  แยกไว้ที่เดียวกันข้อความสองจุดเพี้ยนกัน
  [แก้ตามที่ระบุ] ไม่ใช้อีโมจิเลย (เดิม 🌟/✅/🎁) — ใช้รูปจริงแทน:
    - ทำเควสสำเร็จ: [รูปหมวดเควส] ชื่อ ทำเควส [รูปเควส] ชื่อเควส สำเร็จ
    - ทำเควสการเรียนรู้ครบทุกด่าน: [รูปเควสการเรียนรู้] ชื่อ ทำเควสการเรียนรู้ครบทุกด่านแล้ว
    - ได้รับไอเทม: [รูปไอเทมแลกซื้อ] ชื่อ ได้รับรางวัล [รูปไอเทม] ชื่อไอเทม
    - เลื่อนเลเวล: [รูปเลเวล] ชื่อ เลื่อนเป็นเลเวล N
    - เลื่อนอันดับ: [รูปอันดับ/ถ้วย] ชื่อ เลื่อนเป็นอันดับ N [รูปหมวด] หมวดอันดับ
  ข้อความแปลอยู่ใน i18n (feed.*) — ตำแหน่ง {icon} ในข้อความคือจุดที่วางรูปของเควส/ไอเทม/หมวด
\*============================================================================*/

type Tv = (key: TranslationKey, vars: Record<string, string | number>) => string

/** ชิ้นส่วนข้อความ: ตัวอักษร หรือรูป (src) */
export type ProgressEventPart = string | { img: string }

export interface ProgressEventView {
  /** รูปนำหน้าข้อความ */
  lead: string
  parts: ProgressEventPart[]
  /** ข้อความล้วน (สำหรับ aria-label / ความยาวข้อความวิ่ง) */
  text: string
}

/** แยกข้อความแปลตาม {ชื่อตัวแปร} — {icon} กลายเป็นรูป ที่เหลือแทนค่าตัวอักษร */
function fill(template: string, vars: Record<string, string | number>, icon: string | null): ProgressEventPart[] {
  return template.split(/(\{\w+\})/).filter(Boolean).flatMap<ProgressEventPart>((chunk) => {
    const m = /^\{(\w+)\}$/.exec(chunk)
    if (!m) return [chunk]
    if (m[1] === 'icon') return icon ? [{ img: icon }] : []
    return [String(vars[m[1]] ?? '')]
  })
}

/** tv แทนค่าตัวแปรเองอยู่แล้ว — ส่ง {icon} กลับเป็นตัวเดิมเพื่อมาแยกเป็นรูปทีหลัง */
const KEEP_ICON = { icon: '{icon}' }

export function describeProgressEventView(event: ProgressEvent, tv: Tv, language: 'th' | 'en'): ProgressEventView {
  const name = event.user.username
  const { payload } = event
  let lead: string = BADGE_ICONS.questTab
  let key: TranslationKey
  let vars: Record<string, string | number> = { name }
  let icon: string | null = null

  switch (event.type) {
    case 'LEVEL_UP':
      lead = BADGE_ICONS.seed
      key = 'feed.levelUp'
      vars = { name, level: payload.level ?? '' }
      break
    case 'QUEST_COMPLETED': {
      // backend ส่งชื่อเควสจากฐานข้อมูล — ใช้ชื่อในแคตตาล็อกตามภาษาที่เลือกถ้ามี
      const def = payload.questCode ? findQuestByCode(payload.questCode) : undefined
      const quest = (def && (language === 'th' ? def.titleTh : def.title)) ?? payload.questTitle ?? payload.questCode ?? ''
      lead = (def && QUEST_TAB_ICONS[def.category === 'KNOWLEDGE' ? 'knowledge' : def.category === 'HEALTH' ? 'physical' : 'mental']) ?? BADGE_ICONS.questTab
      icon = (payload.questCode && QUEST_ICONS[payload.questCode]) || null
      key = 'feed.questCompleted'
      vars = { name, quest }
      break
    }
    case 'LEARNING_PATH_COMPLETED':
      lead = BADGE_ICONS.learningTab
      key = 'feed.learningPathCompleted'
      break
    case 'ITEM_UNLOCKED': {
      const meta = payload.itemCode ? DECORATION_ITEM_META[payload.itemCode] : undefined
      lead = BADGE_ICONS.item
      icon = (payload.itemCode && ITEM_ICONS[payload.itemCode]) || null
      key = 'feed.itemUnlocked'
      vars = { name, item: meta?.nameTh ?? payload.itemName ?? payload.itemCode ?? '' }
      break
    }
    case 'RANK_UP': {
      const rank = payload.rank ?? 0
      const cat = RANK_CATEGORIES.find((c) => c.id === payload.rankCategory)
      lead = rank === 1 ? BADGE_ICONS.rank1 : rank === 2 ? BADGE_ICONS.rank2 : rank === 3 ? BADGE_ICONS.rank3 : BADGE_ICONS.trophy
      icon = cat ? RANK_CATEGORY_ICONS[cat.id] : null
      key = 'feed.rankUp'
      vars = { name, rank, category: cat?.label ?? '' }
      break
    }
  }

  const parts = fill(tv(key, { ...vars, ...KEEP_ICON }), vars, icon)
  const text = parts.filter((p): p is string => typeof p === 'string').join('').replace(/\s+/g, ' ').trim()
  return { lead, parts, text }
}

/** ข้อความล้วนของเหตุการณ์ (ไม่มีรูป/อีโมจิ) */
export function describeProgressEvent(event: ProgressEvent, tv: Tv, language: 'th' | 'en'): string {
  return describeProgressEventView(event, tv, language).text
}
