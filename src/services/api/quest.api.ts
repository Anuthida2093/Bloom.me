import { http, API_MODE, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import { findQuestByCode } from '../../config/questCatalog'
import { daysSinceLastHealthQuest, groundDryness, knowledgeGrowthMultiplier } from '../../config/groundFertility'
import type { QuestLogEntry, QuestCategory, UserData } from '../../types'

/*============================================================================*\
  quest.api.ts — [ไฟล์ใหม่] คำขอที่เกี่ยวกับเควส
  ────────────────────────────────────────────────────────────────────────────
  [สำคัญ] completeQuest คืน "ทั้ง log และ user ที่อัปเดตแล้ว" กลับมาในคำขอเดียว
  เพราะการทำเควสสำเร็จกระทบทั้งสองอย่างพร้อมกัน (เหรียญ/EXP/stack ของต้นไม้)
  ถ้าแยกเป็น 2 คำขอ จะมีช่วงเวลาที่หน้าจอแสดงข้อมูลไม่สอดคล้องกัน
  ซึ่งบนเน็ตมือถือช้าผู้ใช้จะเห็นชัดมาก

  payload: สิ่งที่ผู้ใช้กรอก/จับเวลาในรอบนั้น → ต้องเพิ่มคอลัมน์ quest_logs.payload
  (ดู docs/DB_CHANGES.md) ตอนนี้ backend ยังไม่มีที่เก็บ
\*============================================================================*/

export interface CompleteQuestPayload {
  questCode: string
  payload?: Record<string, unknown>
  durationSeconds?: number
}

export interface CompleteQuestResult {
  log: QuestLogEntry
  user: UserData
}

function guessCategory(code: string): QuestCategory {
  if (code.startsWith('know-')) return 'KNOWLEDGE'
  if (code.startsWith('phys-')) return 'HEALTH'
  if (code.startsWith('ment-')) return 'EMOTION'
  return 'KNOWLEDGE'
}

export async function getQuestLogs(): Promise<QuestLogEntry[]> {
  if (API_MODE === 'mock') { await mockDelay(120); return getDb().questLogs }
  return http.get<QuestLogEntry[]>('/quest-logs')
}

export async function completeQuest(input: CompleteQuestPayload): Promise<CompleteQuestResult> {
  const { questCode, payload } = input

  if (API_MODE === 'mock') {
    await mockDelay()
    const def = findQuestByCode(questCode)
    const category = def?.category ?? guessCategory(questCode)
    // [เพิ่มรอบนี้ — โหมดเคร่งครัด] payload.skipped มาจากเกมจับเวลาที่ผู้เล่นกด "ข้าม"
    // กลางคัน (ดู GameShell.tsx) — รางวัลครึ่งเดียวแบบตายตัว ไม่คิดตามสัดส่วนเวลาที่ทำจริง
    // เพื่อไม่ให้ผู้เล่นได้ประโยชน์จากการข้ามเร็วกว่าข้ามช้า
    const skipped = payload?.skipped === true
    const rewardMultiplier = skipped ? 0.5 : 1
    const stackDelta = Math.round((def?.expReward ?? 20) * rewardMultiplier)
    const now = new Date().toISOString()
    // [เพิ่มรอบนี้ — เควสเล่นซ้ำได้ต่อวัน] เควสที่มี maxPerDay (เช่น phys-pure-water) ต้อง
    // "เพิ่ม log ใหม่ทุกครั้ง" แทนการ toggle log เดิมตัวเดียวซ้ำไปมา — ไม่งั้นเล่นรอบที่ 2 จะ
    // กลายเป็นการ "ยกเลิก" รอบแรกแทนที่จะนับเป็นครั้งใหม่
    const isRepeatable = !!def?.maxPerDay
    let resultLog!: QuestLogEntry

    const db = updateDb((d) => {
      // ดินไม่อุดมสมบูรณ์ (ไม่ได้ทำเควสสุขภาพติดต่อกันหลายวัน) → เควสความรู้ได้คะแนนลำต้นน้อยลง
      // ต้นไม้จึงโตช้าลง (ดู config/groundFertility.ts) — หมวดอื่นได้เต็มเหมือนเดิม
      const growth = category === 'KNOWLEDGE'
        ? knowledgeGrowthMultiplier(groundDryness(daysSinceLastHealthQuest(d.questLogs)))
        : 1
      const awarded = Math.round(stackDelta * growth)
      if (isRepeatable) {
        const newLog: QuestLogEntry = {
          id: `local-${questCode}-${Date.now()}`,
          status: 'COMPLETED',
          userId: d.user.id,
          questId: questCode,
          quest: { id: questCode, code: questCode, category },
          logDate: now.split('T')[0],
          completedAt: now,
          ...(payload ? { payload } : {}),
          stackAwarded: awarded,
        } as QuestLogEntry
        d.questLogs.push(newLog)
        resultLog = newLog
        d.user = {
          ...d.user,
          coins: Math.max(0, d.user.coins + Math.round(10 * rewardMultiplier)),
          exp: Math.max(0, d.user.exp + Math.round(5 * rewardMultiplier)),
          knowledgeStack: category === 'KNOWLEDGE' ? d.user.knowledgeStack + awarded : d.user.knowledgeStack,
          emotionStack: category === 'EMOTION' ? d.user.emotionStack + awarded : d.user.emotionStack,
          healthStack: category === 'HEALTH' ? d.user.healthStack + awarded : d.user.healthStack,
        }
        return
      }

      const existing = d.questLogs.find((l) => l.quest?.code === questCode)
      const willComplete = !(existing?.status === 'COMPLETED')
      let delta = awarded

      if (!existing) {
        const newLog: QuestLogEntry = {
          id: `local-${questCode}-${Date.now()}`,
          status: 'COMPLETED',
          userId: d.user.id,
          questId: questCode,
          quest: { id: questCode, code: questCode, category },
          logDate: now.split('T')[0],
          completedAt: now,
          ...(payload ? { payload } : {}),
          stackAwarded: awarded,
        } as QuestLogEntry
        d.questLogs.push(newLog)
        resultLog = newLog
      } else {
        // ยกเลิก = คืนคะแนนเท่าที่ได้ไปจริงตอนทำสำเร็จ (อาจถูกลดเพราะดินแห้ง) ไม่ใช่ค่าเต็ม
        if (!willComplete) delta = existing.stackAwarded ?? stackDelta
        existing.status = willComplete ? 'COMPLETED' : 'IN_PROGRESS'
        existing.completedAt = willComplete ? now : null
        existing.stackAwarded = willComplete ? awarded : undefined
        resultLog = existing
      }

      const sign = willComplete ? 1 : -1
      d.user = {
        ...d.user,
        coins: Math.max(0, d.user.coins + Math.round(10 * rewardMultiplier) * sign),
        exp: Math.max(0, d.user.exp + Math.round(5 * rewardMultiplier) * sign),
        knowledgeStack: category === 'KNOWLEDGE'
          ? Math.max(0, d.user.knowledgeStack + delta * sign) : d.user.knowledgeStack,
        emotionStack: category === 'EMOTION'
          ? Math.max(0, d.user.emotionStack + delta * sign) : d.user.emotionStack,
        healthStack: category === 'HEALTH'
          ? Math.max(0, d.user.healthStack + delta * sign) : d.user.healthStack,
      }
    })

    return { log: resultLog, user: db.user }
  }

  return http.post<CompleteQuestResult>('/quest-logs/complete', input)
}