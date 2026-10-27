import { http, API_MODE, ApiError, mockDelay } from '../http'
import { getDb, updateDb } from '../mock/mockDb'
import { ALL_QUESTS, findQuestByCode, type QuestDef } from '../../config/questCatalog'
import { crossGrowthMultiplier, isSeriousMode } from '../../config/crossGrowth'
import type { MoodCategory, MoodTypeValue, QuestLogEntry, QuestCategory, UserData } from '../../types'
import { MAX_PAGE_SIZE, toQuestLogEntry, toUserData, type Paginated } from './adapters'
import { getMe } from './user.api'
import { bangkokDateString, bangkokTimeOn, calculateLevel, calculateNextStreak, endOfBangkokDay } from '../../utils/progression'
import { MOOD_CHECKIN_QUESTS } from '../../config/moodCheckinSlots'
import type { MoodColorCode } from '../../types.mental'
import { calculateStepReward } from '../../config/stepGoalByBmi'
import { mockHasDoubleReward, mockRollDailyCard, mockRollLearningGift } from './progression.api'
import type { LearningGift } from '../../config/learningGift'
import { isQuestDoneNow, learningRoundState, LEARNING_DAILY_CODES } from '../../utils/questCompletion'
import { requiredQuestPhotos } from './upload.api'

/** เควสที่รางวัลคิดจากก้าวจริงตอนจบ (ตรงกับ Quest.config.stepReward ของ backend vitality-steps) */
const STEP_REWARD_QUEST_CODE = 'phys-vitality-steps'

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
  /** การ์ดแลกซื้อที่สุ่มตกจากเควสประจำวันนี้ (itemCode) — null/ไม่มี = ไม่ได้ */
  exchangeCard?: string | null
  /** [ใหม่] ของขวัญสุ่มเมื่อ log นี้ปิดรอบเส้นทางการเรียนรู้ (ครบ 5 ด่าน) — null/ไม่มี = ไม่ได้ปิดรอบ */
  learningGift?: LearningGift | null
}

function guessCategory(code: string): QuestCategory {
  if (code.startsWith('mood-checkin')) return 'EMOTION'
  if (code.startsWith('know-')) return 'KNOWLEDGE'
  if (code.startsWith('phys-')) return 'HEALTH'
  if (code.startsWith('ment-')) return 'EMOTION'
  return 'KNOWLEDGE'
}

const STACK_FIELD = { KNOWLEDGE: 'knowledgeStack', EMOTION: 'emotionStack', HEALTH: 'healthStack' } as const

/** [โหมด mock] ให้/คืนรางวัลเควสด้วยสูตรเดียวกับ backend (quest.controller.ts → grantQuestRewards):
 *  exp += expReward, coins += coinReward, stack ของหมวดนั้น += expReward (ทั้งหมดคูณ rewardMultiplier
 *  ที่ปัดแล้ว) แล้วคำนวณเลเวลจาก exp ใหม่ — sign = -1 คือยกเลิกเควส (มีแค่ใน mock backend ไม่มี)
 *  streak นับเฉพาะตอนทำสำเร็จ (ยกเลิกไม่ย้อน streak — backend ไม่มีการยกเลิกให้เทียบ) */
function applyQuestReward(
  user: UserData, category: QuestCategory, gains: { exp: number; coins: number; stack: number }, sign: 1 | -1,
): UserData {
  const stackField = STACK_FIELD[category]
  const exp = Math.max(0, user.exp + gains.exp * sign)
  const now = new Date()
  return {
    ...user,
    exp,
    level: calculateLevel(exp),
    coins: Math.max(0, user.coins + gains.coins * sign),
    [stackField]: Math.max(0, user[stackField] + gains.stack * sign),
    ...(sign === 1
      ? { streak: calculateNextStreak(user.streak, user.lastActiveDate, now), lastActiveDate: bangkokDateString(now) }
      : {}),
  }
}

export type QuestStatus = 'pending' | 'in-progress' | 'completed'
export interface QuestWithStatus extends QuestDef {
  /** pending = ยังไม่ทำรอบนี้ · in-progress = มี log ค้าง IN_PROGRESS · completed = ทำสำเร็จแล้ว (เควสรายวัน = วันนี้/รอบนี้) */
  status: QuestStatus
}

/** รายการเควสทั้งหมด + สถานะของผู้เล่น — แคตตาล็อกจาก config/questCatalog.ts (= mockData MOCK_QUESTS)
 *  สถานะคิดจากประวัติเควส (getQuestLogs: mock = mockDb · live = GET /api/quests/logs/me) ด้วยกฎเดียวกับหน้าเควส
 *  (isQuestDoneNow — เควสรายวันนับเฉพาะวันนี้/รอบการเรียนรู้ปัจจุบัน) */
export async function getQuests(): Promise<QuestWithStatus[]> {
  const logs = await getQuestLogs()
  const now = new Date()
  return ALL_QUESTS.map((q) => ({
    ...q,
    status: isQuestDoneNow(logs, q.code, now)
      ? 'completed'
      : logs.some((l) => l.quest?.code === q.code && l.status === 'IN_PROGRESS') ? 'in-progress' : 'pending',
  }))
}

export async function getQuestLogs(): Promise<QuestLogEntry[]> {
  if (API_MODE === 'mock') { await mockDelay(120); return getDb().questLogs }
  // backend: GET /api/quests/logs/me (แบ่งหน้า)
  const res = await http.get<Paginated<Record<string, unknown>>>(`/quests/logs/me?pageSize=${MAX_PAGE_SIZE}`)
  return res.data.map(toQuestLogEntry)
}

export async function completeQuest(input: CompleteQuestPayload): Promise<CompleteQuestResult> {
  const { questCode, payload } = input

  if (API_MODE === 'mock') {
    await mockDelay()
    const def = findQuestByCode(questCode) ?? MOOD_CHECKIN_QUESTS.find((q) => q.code === questCode)
    const category = def?.category ?? guessCategory(questCode)
    // [เพิ่มรอบนี้ — โหมดเคร่งครัด] payload.skipped มาจากเกมจับเวลาที่ผู้เล่นกด "ข้าม"
    // กลางคัน (ดู GameShell.tsx) — รางวัลครึ่งเดียวแบบตายตัว ไม่คิดตามสัดส่วนเวลาที่ทำจริง
    // เพื่อไม่ให้ผู้เล่นได้ประโยชน์จากการข้ามเร็วกว่าข้ามช้า
    const skipped = payload?.skipped === true
    // การ์ด ×2 ที่ใช้อยู่ (12 ชม. นับจากตอนกดใช้) — EXP/เหรียญของทุกเควสที่ทำสำเร็จระหว่างนั้น ×2
    const doubled = mockHasDoubleReward(getDb())
    const rewardMultiplier = (skipped ? 0.5 : 1) * (doubled ? 2 : 1)
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
    const stepReward = questCode === STEP_REWARD_QUEST_CODE
      ? calculateStepReward({
        steps: num(payload?.steps) ?? 0,
        bmi: getDb().user.bmi,
        consecutiveGoalDays: num(payload?.consecutiveGoalDays),
        stepsPerMinute: num(payload?.stepsPerMinute),
        continuousActiveMinutes: num(payload?.continuousActiveMinutes),
      })
      : null
    const expGain = Math.round((stepReward?.exp ?? def?.expReward ?? 20) * rewardMultiplier)
    const coinGain = Math.round((stepReward?.coins ?? def?.coinReward ?? 10) * rewardMultiplier)
    const now = new Date().toISOString()
    // [เพิ่มรอบนี้ — เควสเล่นซ้ำได้ต่อวัน] เควสที่มี maxPerDay (เช่น phys-pure-water) ต้อง
    // "เพิ่ม log ใหม่ทุกครั้ง" แทนการ toggle log เดิมตัวเดียวซ้ำไปมา — ไม่งั้นเล่นรอบที่ 2 จะ
    // กลายเป็นการ "ยกเลิก" รอบแรกแทนที่จะนับเป็นครั้งใหม่
    // เช็คอินอารมณ์เช้า/เย็น (isDaily) ก็เพิ่ม log ใหม่ต่อวันเช่นกัน แต่ซ้ำในวันเดียวกันไม่ได้ —
    // ตรงกับ backend ที่ตอบ 409 QUEST_ALREADY_COMPLETED
    const isMoodCheckin = MOOD_CHECKIN_QUESTS.some((q) => q.code === questCode)
    const today = bangkokDateString()
    if (isMoodCheckin && getDb().questLogs.some((l) => l.quest?.code === questCode && l.status === 'COMPLETED' && l.logDate === today)) {
      throw new ApiError(409, 'วันนี้เช็คอินรอบนี้ไปแล้ว', { error: { code: 'QUEST_ALREADY_COMPLETED' } })
    }
    // [แก้บั๊ก] เควสรายวันต้องได้ log ใหม่ทุกวัน (และทุก "รอบ" ของหมวดการเรียนรู้) — เดิมหา log เก่า
    // ตัวเดียวแล้วสลับสถานะ ทำเมื่อวานแล้ววันนี้ทำอีก = "ยกเลิก" ของเมื่อวาน รางวัลถูกหักคืน
    const isDailyQuest = !!def && 'isDaily' in def && def.isDaily === true
    if (isDailyQuest && !isMoodCheckin && !findQuestByCode(questCode)?.maxPerDay && isQuestDoneNow(getDb().questLogs, questCode)) {
      // ทำไปแล้วรอบนี้ (เช่นกดซ้ำเร็วๆ) — ไม่ให้รางวัลซ้ำ คืนสถานะเดิม
      const db = getDb()
      const done = [...db.questLogs].reverse().find((l) => l.quest?.code === questCode && l.status === 'COMPLETED') as QuestLogEntry
      return { log: done, user: db.user }
    }
    // ตรงกับ backend: เควสที่มี maxPerDay ทำครบโควตาวันนี้แล้ว → 409 DAILY_LIMIT_REACHED (เช่นโหมดจดจ่อรอบที่ 4)
    const maxPerDay = findQuestByCode(questCode)?.maxPerDay
    if (maxPerDay && getDb().questLogs.filter((l) => l.quest?.code === questCode && l.status === 'COMPLETED' && l.logDate === today).length >= maxPerDay) {
      throw new ApiError(409, 'ทำครบโควตาของวันนี้แล้ว', { error: { code: 'DAILY_LIMIT_REACHED' } })
    }
    const isRepeatable = isMoodCheckin || isDailyQuest || !!findQuestByCode(questCode)?.maxPerDay
    // ปิดรอบเควสก้าวของ "เมื่อวาน" ย้อนหลัง (utils/stepSettlement.ts) — log ลงวันนั้น ไม่กินโควตาวันนี้
    // [backend ยังไม่รองรับ] ฝั่งจริงใช้ logDate = วันนี้เสมอ — ข้อเสนอใน docs/PROGRESSION_API.md
    const settleDate = questCode === STEP_REWARD_QUEST_CODE && typeof payload?.settleDate === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(payload.settleDate) && payload.settleDate < today ? payload.settleDate : null
    const logDate = settleDate ?? today
    const logCompletedAt = settleDate ? endOfBangkokDay(bangkokTimeOn(settleDate, 12)).toISOString() : now
    let resultLog!: QuestLogEntry
    let exchangeCard: string | null = null
    let learningGift: LearningGift | null = null
    // การ์ดแลกซื้อสุ่มตกจาก "เควสประจำวัน" (รายวัน หรือทริปก้าวรายวัน) ที่ทำครบ ไม่กดข้าม — เซิร์ฟเวอร์
    // ตัดสินเองว่าปลดล็อกระบบการ์ดแล้วหรือยัง (เดินถึงเป้าครบ 21 วัน) หน้าเว็บไม่รู้ตัวนับ
    const cardEligible = !skipped && (isDailyQuest || questCode === STEP_REWARD_QUEST_CODE)

    const db = updateDb((d) => {
      // [แก้ตามที่ระบุ] ทั้ง 3 ด้านมีผลต่อกันเล็กน้อย: ขาดเควสหมวดต้นทาง 5-9 วัน → หมวดนี้ได้คะแนน stack -5%,
      // 10 วันขึ้นไป → -10% (สุขภาพ→ความรู้, ความรู้→จิตใจ, จิตใจ→สุขภาพ — ดู config/crossGrowth.ts)
      // [หมายเหตุ] กลไกนี้มีแค่ในโหมด mock — backend จริงให้ stack = expReward เต็มเสมอ
      // [แก้ตามที่ระบุ] ลดเฉพาะโหมดจริงจัง — โหมดปกติได้เต็มเสมอ
      const growth = isSeriousMode() ? crossGrowthMultiplier(category, d.questLogs) : 1
      const awarded = Math.round(expGain * growth)
      if (isRepeatable) {
        const newLog: QuestLogEntry = {
          id: `local-${questCode}-${Date.now()}`,
          status: 'COMPLETED',
          userId: d.user.id,
          questId: questCode,
          quest: { id: questCode, code: questCode, category },
          logDate,
          completedAt: logCompletedAt,
          ...(payload ? { payload } : {}),
          stackAwarded: awarded,
        } as QuestLogEntry
        // [ใหม่] ปิดรอบเส้นทางการเรียนรู้ (ครบ 5 ด่าน) ด้วย log นี้หรือไม่ — เทียบจำนวนรอบก่อน/หลังเพิ่ม log
        const roundsBefore = LEARNING_DAILY_CODES.includes(questCode) ? learningRoundState(d.questLogs).roundsDone : 0
        d.questLogs.push(newLog)
        resultLog = newLog
        d.user = applyQuestReward(d.user, category, { exp: expGain, coins: coinGain, stack: awarded }, 1)
        if (cardEligible) exchangeCard = mockRollDailyCard(d)
        if (LEARNING_DAILY_CODES.includes(questCode) && learningRoundState(d.questLogs).roundsDone > roundsBefore) {
          learningGift = mockRollLearningGift(d, newLog.id)
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
          logDate: today,
          completedAt: now,
          ...(payload ? { payload } : {}),
          stackAwarded: awarded,
        } as QuestLogEntry
        d.questLogs.push(newLog)
        resultLog = newLog
      } else {
        // ยกเลิก = คืนคะแนนเท่าที่ได้ไปจริงตอนทำสำเร็จ (อาจถูกลดเพราะดินแห้ง) ไม่ใช่ค่าเต็ม
        if (!willComplete) delta = existing.stackAwarded ?? expGain
        existing.status = willComplete ? 'COMPLETED' : 'IN_PROGRESS'
        existing.completedAt = willComplete ? now : null
        existing.stackAwarded = willComplete ? awarded : undefined
        resultLog = existing
      }

      d.user = applyQuestReward(d.user, category, { exp: expGain, coins: coinGain, stack: delta }, willComplete ? 1 : -1)
      if (willComplete && cardEligible) exchangeCard = mockRollDailyCard(d)
    })

    return { log: resultLog, user: db.user, exchangeCard, learningGift }
  }

  // เควสรูปถ่าย: ต้องอัปโหลดรูปมาก่อน (upload.api.ts prepareQuestPhotos) แล้วส่ง photoPaths ครบจำนวนเป๊ะ
  // ห้ามส่ง data URL ขึ้นไปใน payload — ไม่ครบ = ไม่ยิง complete เลย
  const requiredPhotos = requiredQuestPhotos(questCode)
  if (requiredPhotos > 0) {
    const paths = payload?.photoPaths
    const valid = Array.isArray(paths) && paths.length === requiredPhotos
      && paths.every((p) => typeof p === 'string' && p.length > 0 && !p.startsWith('data:'))
    if (!valid) throw new ApiError(400, `ต้องอัปโหลดรูป ${requiredPhotos} รูปก่อนส่งเควสนี้`)
  }
  // backend: POST /api/quest-logs/complete → { log, user } (user เป็น select ย่อย) — เติม field
  // ที่ขาดจากโปรไฟล์เต็ม ให้หน้าจอได้ stack/เลเวลล่าสุดครบ
  const res = await http.post<{ log: Record<string, unknown>; user: Record<string, unknown>; exchangeCard?: string | null; learningGift?: LearningGift | null }>('/quest-logs/complete', input)
  return { log: toQuestLogEntry(res.log), user: toUserData(res.user, await getMe()), exchangeCard: res.exchangeCard ?? null, learningGift: res.learningGift ?? null }
}

export interface MoodCheckinQuestInput {
  questCode: string
  category: MoodCategory
  mood: MoodTypeValue
  note?: string | null
  colorCode?: MoodColorCode
  moodScore?: number
}

/** [โหมด live] เช็คอินอารมณ์เช้า/เย็นต้องผ่าน flow 2 ขั้นของ backend (POST /api/quest-logs/complete
 *  ปฏิเสธเควส mood-checkin-* เพราะต้องสร้าง MoodEntry ด้วย): POST /quests/:id/start → PATCH
 *  /quests/logs/:logId/complete พร้อม category/mood/note — backend สร้าง MoodEntry ให้เองใน
 *  ทรานแซกชันเดียวกับการให้รางวัล (หน้าเว็บจึง "ไม่ต้อง" POST /mood ซ้ำอีก)
 *  ถ้าเคย start ค้างไว้วันนี้ (409 DAILY_QUEST_ALREADY_STARTED) ใช้ log IN_PROGRESS เดิมต่อ */
export async function completeMoodCheckinQuest(input: MoodCheckinQuestInput): Promise<CompleteQuestResult> {
  const quests = await http.get<{ id: string; code: string }[]>('/quests?category=EMOTION&isDaily=true')
  const quest = quests.find((q) => q.code === input.questCode)
  if (!quest) throw new ApiError(404, 'ไม่พบเควสเช็คอินอารมณ์บนเซิร์ฟเวอร์')

  let logId: string
  try {
    logId = (await http.post<{ id: string }>(`/quests/${quest.id}/start`)).id
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 409)) throw error
    const today = bangkokDateString()
    const logs = await getQuestLogs()
    const pending = logs.find((l) => l.quest?.code === input.questCode && l.logDate?.slice(0, 10) === today)
    if (!pending || pending.status === 'COMPLETED') throw error
    logId = pending.id
  }

  const res = await http.patch<{ questLog: Record<string, unknown>; user: Record<string, unknown> }>(
    `/quests/logs/${logId}/complete`,
    {
      category: input.category,
      mood: input.mood,
      ...(input.note ? { note: input.note } : {}),
      ...(input.colorCode ? { colorCode: input.colorCode } : {}),
      ...(input.moodScore ? { moodScore: input.moodScore } : {}),
    },
  )
  return { log: toQuestLogEntry(res.questLog), user: toUserData(res.user, await getMe()) }
}
