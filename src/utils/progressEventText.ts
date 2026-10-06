import type { ProgressEvent } from '../services/api/activity.api'
import type { TranslationKey } from '../i18n/th'
import { findQuestByCode } from '../config/questCatalog'
import { DECORATION_ITEM_META } from '../config/decorationItems'

/*============================================================================*\
  progressEventText.ts — ข้อความ/ไอคอนของเหตุการณ์เพื่อน (ใช้ร่วมกันทั้ง toast และแผงแจ้งเตือน 🔔)
  แยกไว้ที่เดียวกันข้อความสองจุดเพี้ยนกัน
\*============================================================================*/

type Tv = (key: TranslationKey, vars: Record<string, string | number>) => string

export const PROGRESS_EVENT_EMOJI: Record<ProgressEvent['type'], string> = {
  LEVEL_UP: '🌟',
  QUEST_COMPLETED: '✅',
  ITEM_UNLOCKED: '🎁',
}

export function describeProgressEvent(event: ProgressEvent, tv: Tv, language: 'th' | 'en'): string {
  const name = event.user.username
  const { payload } = event
  switch (event.type) {
    case 'LEVEL_UP':
      return tv('feed.levelUp', { name, level: payload.level ?? '' })
    case 'QUEST_COMPLETED': {
      // backend ส่งชื่อเควสจากฐานข้อมูล — ใช้ชื่อในแคตตาล็อกตามภาษาที่เลือกถ้ามี
      const def = payload.questCode ? findQuestByCode(payload.questCode) : undefined
      const quest = (def && (language === 'th' ? def.titleTh : def.title)) ?? payload.questTitle ?? payload.questCode ?? ''
      return tv('feed.questCompleted', { name, quest })
    }
    case 'ITEM_UNLOCKED': {
      const meta = payload.itemCode ? DECORATION_ITEM_META[payload.itemCode] : undefined
      return tv('feed.itemUnlocked', { name, item: meta?.nameTh ?? payload.itemName ?? payload.itemCode ?? '' })
    }
  }
}
