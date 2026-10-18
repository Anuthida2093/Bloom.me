import { http, API_MODE, ApiError, mockDelay } from '../http'
import { getDb, updateDb, emptyProgression, type MockDb, type MockProgression } from '../mock/mockDb'
import type { InventoryItem, UserData } from '../../types'
import {
  CARD_UNLOCK_SUCCESS_DAYS, DEEP_ROOT_BONUS_COINS, DEEP_ROOT_CARD_CHANCE, EXCHANGE_CARD_DROP_CHANCE,
  EXCHANGE_REQUIREMENTS, exchangeCardLabel, exchangeItemName, pickRandomExchangeItem,
} from '../../config/exchangeItems'
import { toInventoryItem } from './adapters'
import { getMe } from './user.api'
import { DOUBLE_CARD_HOURS, rollStepChest, type StepChestReward } from '../../config/stepChest'
import { bangkokDateString, calculateLevel } from '../../utils/progression'
import { rollLearningGift, type LearningGift } from '../../config/learningGift'

/*============================================================================*\
  progression.api.ts — ความก้าวหน้าระยะยาวที่ต้องอยู่กับ "บัญชี" ไม่ใช่เครื่อง
  ────────────────────────────────────────────────────────────────────────────
  - วันที่เดินครบเป้า (เควสก้าวเพื่อสุขภาพ) + แผนที่ของวันนั้น (เปิดดูย้อนหลังได้)
  - ปลดล็อกระบบ "การ์ดแลกซื้อ" เมื่อเดินครบเป้าสะสม 21 วัน (นับฝั่งเซิร์ฟเวอร์ — ไม่ส่งตัวนับให้หน้าเว็บ)
  - การ์ดสุ่มตกจากเควสประจำวัน (quest.api → completeQuest) / หยั่งรากลึกครบ 3 รอบ
  - แลกซื้อของพิเศษ/หายากในร้าน
  - หีบสมบัติ 1 ใบต่อวันที่เดินถึงเป้า (openStepChest — ตารางสุ่มใน config/stepChest.ts)
  โหมด mock จำลองฝั่งเซิร์ฟเวอร์ทั้งหมด (สุ่มรางวัลที่นี่ ไม่ใช่ใน component)
  โหมด live เรียก endpoint ตามสเปกใน docs/PROGRESSION_API.md — backend ยังไม่ได้ทำ
\*============================================================================*/

/** สิ่งที่หน้าเว็บได้รู้ — ไม่มีจำนวนวันสะสม/สถานะปลดล็อก (เป็นความลับฝั่งเซิร์ฟเวอร์) */
export interface ProgressionSummary {
  /** การ์ดแลกซื้อ: itemCode → จำนวนใบ */
  exchangeCards: Record<string, number>
  /** [แก้ตามที่ระบุ] true = การ์ด ×2 กำลังทำงานอยู่ตอนนี้ (เดิม doubleRewardToday — บัฟทั้งวันจากกล่องที่เลิกใช้) */
  doubleRewardActive: boolean
  /** การ์ด ×2 ที่ใช้อยู่หมดเวลาเมื่อไร (ISO) — null = ไม่มีบัฟ · หน้าเว็บใช้นับถอยหลังเท่านั้น เซิร์ฟเวอร์ตัดสินเอง */
  doubleRewardUntil: string | null
  /** การ์ด ×2 ที่ยังไม่ได้ใช้ในคลัง */
  doubleCards: number
  /** วันเดินครบเป้าติดกันล่าสุด — ใช้คิดโบนัสสตรีคของ BMI < 18.5 เท่านั้น */
  goalStreakDays: number
  /** [ใหม่] ผงพิเศษในคลัง (ได้จากหีบสมบัติ) */
  specialDust: number
}

export interface StepDayRecord {
  date: string
  steps: number
  goal: number
  goalMet: boolean
  mapId: string | null
  journeyId: string | null
  /** ผลหีบสมบัติของวันนั้น — null = ยังไม่เปิด (หรือวันนั้นไม่ถึงเป้า ไม่มีหีบ) */
  chest: StepChestReward | null
}

export interface OpenStepChestResult {
  reward: StepChestReward
  /** true = เคยเปิดไปแล้ว (ได้ผลเดิม ไม่ได้รางวัลซ้ำ) */
  alreadyOpened: boolean
}

export interface BonusRollResult {
  cardItemCode: string | null
  coins: number
}

export interface ExchangeResult { item: InventoryItem; user: UserData }

/** วันที่ตามเวลาไทย YYYY-MM-DD — "วันนี้" ของทริปรายวัน (ตัดรอบเที่ยงคืนเวลาไทย ตรงกับ logDate ของ backend)
 *  [แก้ตามที่ระบุ] เดิมใช้วันตามเวลาเครื่อง */
export function localDateKey(date: Date = new Date()): string {
  return bangkokDateString(date)
}

function ensure(d: MockDb): MockProgression {
  if (!d.progression) d.progression = emptyProgression(localDateKey())
  return d.progression
}

function countSuccessDays(p: MockProgression): number {
  return Object.entries(p.stepDays).filter(([date, day]) => day.goalMet && date >= p.firstLoginDate).length
}

function goalStreak(p: MockProgression): number {
  const cursor = new Date()
  if (!p.stepDays[localDateKey(cursor)]?.goalMet) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (p.stepDays[localDateKey(cursor)]?.goalMet) { streak++; cursor.setDate(cursor.getDate() - 1) }
  return streak
}

/** บัฟ ×2 ทำงานอยู่ไหม ณ เวลานี้ — การ์ด ×2 (12 ชม.) หรือบัฟทั้งวันแบบเก่า (doubleRewardDate) */
function doubleActiveUntil(p: MockProgression | null | undefined, nowMs = Date.now()): string | null {
  if (!p) return null
  if (p.doubleRewardUntil && Date.parse(p.doubleRewardUntil) > nowMs) return p.doubleRewardUntil
  return null
}

function summarize(p: MockProgression): ProgressionSummary {
  const until = doubleActiveUntil(p)
  return {
    exchangeCards: { ...p.exchangeCards },
    doubleRewardActive: !!until || p.doubleRewardDate === localDateKey(),
    doubleRewardUntil: until,
    doubleCards: p.doubleCards ?? 0,
    goalStreakDays: goalStreak(p),
    specialDust: p.specialDust ?? 0,
  }
}

function addCard(p: MockProgression, itemCode: string) {
  p.exchangeCards[itemCode] = (p.exchangeCards[itemCode] ?? 0) + 1
}

/** GET /api/progression/me */
export async function getProgression(): Promise<ProgressionSummary> {
  if (API_MODE === 'mock') {
    await mockDelay(80)
    let summary!: ProgressionSummary
    updateDb((d) => { summary = summarize(ensure(d)) })
    return summary
  }
  return http.get<ProgressionSummary>('/progression/me')
}

/** PUT /api/steps/days/:date — บันทึกก้าวรวมของวัน (เก็บค่ามากสุด) + แผนที่ของวันนั้น
 *  เซิร์ฟเวอร์นับวันถึงเป้าสะสม ครบ 21 วัน → ปลดล็อกระบบการ์ดถาวร (ไม่แจ้งตัวเลขกลับมา) */
export async function recordStepDay(
  date: string, steps: number, goal: number, trip?: { mapId: string; journeyId: string },
): Promise<ProgressionSummary> {
  if (API_MODE === 'mock') {
    await mockDelay(60)
    let summary!: ProgressionSummary
    updateDb((d) => {
      const p = ensure(d)
      const prev = p.stepDays[date]
      const best = Math.max(prev?.steps ?? 0, steps)
      p.stepDays[date] = {
        ...prev,
        steps: best, goal, goalMet: best >= goal,
        mapId: trip?.mapId ?? prev?.mapId ?? null, journeyId: trip?.journeyId ?? prev?.journeyId ?? null,
      }
      if (!p.cardsUnlockedAt && countSuccessDays(p) >= CARD_UNLOCK_SUCCESS_DAYS) p.cardsUnlockedAt = new Date().toISOString()
      summary = summarize(p)
    })
    return summary
  }
  return http.put<ProgressionSummary>(`/steps/days/${date}`, { steps, goal, ...trip })
}

/** GET /api/steps/days — วันที่มีบันทึกก้าว (ใหม่สุดก่อน) */
export async function getStepHistory(): Promise<StepDayRecord[]> {
  if (API_MODE === 'mock') {
    await mockDelay(60)
    const p = getDb().progression
    if (!p) return []
    return Object.entries(p.stepDays)
      .map(([date, d]) => ({
        date, steps: d.steps, goal: d.goal, goalMet: d.goalMet, mapId: d.mapId ?? null, journeyId: d.journeyId ?? null,
        chest: d.chest ? { kind: d.chest.kind, amount: d.chest.amount, cardItemCode: d.chest.cardItemCode ?? null } : null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }
  return http.get<StepDayRecord[]>('/steps/days')
}

/** [mock — ฝั่งเซิร์ฟเวอร์] สุ่มการ์ดตอนทำเควสประจำวันสำเร็จ (เรียกจาก quest.api completeQuest)
 *  ยังไม่ปลดล็อกระบบการ์ด → ไม่มีวันได้ */
export function mockRollDailyCard(d: MockDb): string | null {
  const p = ensure(d)
  if (!p.cardsUnlockedAt || Math.random() >= EXCHANGE_CARD_DROP_CHANCE) return null
  const code = pickRandomExchangeItem()
  addCard(p, code)
  return code
}

/** [mock — ฝั่งเซิร์ฟเวอร์] ของขวัญสุ่มเมื่อทำเควสการเรียนรู้ครบ 5 ด่าน (เรียกจาก quest.api completeQuest)
 *  rollKey = id ของ log ที่ปิดรอบ — กันสุ่มซ้ำ · หยดน้ำบวกเข้า user ตรงนี้ (โหมด mock เท่านั้น — backend
 *  ยังไม่มีหยดน้ำ ดู docs/PROGRESSION_API.md) */
export function mockRollLearningGift(d: MockDb, rollKey: string): LearningGift {
  const p = ensure(d)
  const prev = p.learningGifts?.[rollKey]
  if (prev) return prev
  const rolled = rollLearningGift(!!p.cardsUnlockedAt)
  const gift: LearningGift = { ...rolled, cardItemCode: null }
  if (gift.kind === 'EXCHANGE_CARD') {
    gift.cardItemCode = pickRandomExchangeItem()
    addCard(p, gift.cardItemCode)
  } else if (gift.kind === 'BONUS_COINS') {
    d.user = { ...d.user, coins: d.user.coins + gift.amount }
  } else {
    d.user = { ...d.user, waterDrops: (d.user.waterDrops ?? 0) + gift.amount }
  }
  p.learningGifts = { ...(p.learningGifts ?? {}), [rollKey]: gift }
  return gift
}

/** POST /api/quests/know-deep-root/bonus — จดจ่อครบ 3 รอบไม่กดข้าม: การ์ด (หลังปลดล็อก) หรือเหรียญโบนัส
 *  rollKey กันสุ่มซ้ำ (วันที่ + รอบการเรียนรู้) */
export async function claimDeepRootBonus(rollKey: string): Promise<BonusRollResult> {
  if (API_MODE === 'mock') {
    await mockDelay()
    let result!: BonusRollResult
    updateDb((d) => {
      const p = ensure(d)
      const prev = p.bonusRolls[rollKey]
      if (prev) { result = prev; return }
      const cardItemCode = p.cardsUnlockedAt && Math.random() < DEEP_ROOT_CARD_CHANCE ? pickRandomExchangeItem() : null
      const coins = cardItemCode ? 0 : DEEP_ROOT_BONUS_COINS
      if (cardItemCode) addCard(p, cardItemCode)
      if (coins) d.user = { ...d.user, coins: d.user.coins + coins }
      p.bonusRolls[rollKey] = { cardItemCode, coins }
      result = { cardItemCode, coins }
    })
    return result
  }
  return http.post<BonusRollResult>('/quests/know-deep-root/bonus', { rollKey })
}

/** POST /api/steps/days/:date/chest — เปิดหีบสมบัติของวันที่เดินถึงเป้า (1 ใบต่อวัน)
 *  เซิร์ฟเวอร์ตรวจว่าวันนั้นถึงเป้าจริง สุ่มรางวัลจากตาราง (config/stepChest.ts) แล้วให้รางวัลเอง —
 *  เปิดซ้ำได้ผลเดิม (alreadyOpened) · error: 400 GOAL_NOT_MET
 *  ข้อยกเว้น: WATER_DROPS — หยดน้ำยังเป็นข้อมูลฝั่งหน้าเว็บเท่านั้น (backend ไม่มี) ผู้เรียกบวกเองเมื่อ !alreadyOpened */
export async function openStepChest(date: string): Promise<OpenStepChestResult> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const day = getDb().progression?.stepDays[date]
    if (!day?.goalMet) throw new ApiError(400, 'วันนั้นยังเดินไม่ถึงเป้า', { error: { code: 'GOAL_NOT_MET' } })
    let result!: OpenStepChestResult
    updateDb((d) => {
      const p = ensure(d)
      const target = p.stepDays[date]
      if (target.chest) {
        const { kind, amount, cardItemCode } = target.chest
        result = { reward: { kind, amount, cardItemCode: cardItemCode ?? null }, alreadyOpened: true }
        return
      }
      const rolled = rollStepChest(!!p.cardsUnlockedAt)
      const reward: StepChestReward = { ...rolled, cardItemCode: null }
      if (reward.kind === 'EXCHANGE_CARD') {
        reward.cardItemCode = pickRandomExchangeItem()
        addCard(p, reward.cardItemCode)
      } else if (reward.kind === 'BONUS_COINS') {
        d.user = { ...d.user, coins: d.user.coins + reward.amount }
      } else if (reward.kind === 'SPECIAL_DUST') {
        p.specialDust = (p.specialDust ?? 0) + reward.amount
      } else if (reward.kind === 'DOUBLE_CARD') {
        p.doubleCards = (p.doubleCards ?? 0) + reward.amount
      } else if (reward.kind === 'BONUS_EXP') {
        const exp = d.user.exp + reward.amount
        d.user = { ...d.user, exp, level: calculateLevel(exp) }
      }
      p.stepDays[date] = { ...target, chest: { ...reward, openedAt: new Date().toISOString() } }
      result = { reward, alreadyOpened: false }
    })
    return result
  }
  return http.post<OpenStepChestResult>(`/steps/days/${date}/chest`)
}

export interface UseSpecialDustResult {
  /** EXP ที่ต้นไม้ได้ (เซิร์ฟเวอร์สุ่ม 1-2) */
  expGained: number
  /** ผงพิเศษที่เหลือ */
  remaining: number
  user: UserData
}

/** POST /api/progression/special-dust/use — [ใหม่] ใช้ผงพิเศษ 1 ถุง → ต้นไม้ +1-2 EXP (เซิร์ฟเวอร์สุ่ม)
 *  error: 400 NO_SPECIAL_DUST (ไม่มีผงเหลือ) */
export async function consumeSpecialDust(): Promise<UseSpecialDustResult> {
  if (API_MODE === 'mock') {
    await mockDelay()
    if ((getDb().progression?.specialDust ?? 0) < 1) {
      throw new ApiError(400, 'ไม่มีผงพิเศษเหลือแล้ว', { error: { code: 'NO_SPECIAL_DUST' } })
    }
    let result!: UseSpecialDustResult
    updateDb((d) => {
      const p = ensure(d)
      p.specialDust = Math.max(0, (p.specialDust ?? 0) - 1)
      const expGained = 1 + Math.floor(Math.random() * 2)
      const exp = d.user.exp + expGained
      d.user = { ...d.user, exp, level: calculateLevel(exp) }
      result = { expGained, remaining: p.specialDust, user: d.user }
    })
    return result
  }
  return http.post<UseSpecialDustResult>('/progression/special-dust/use')
}

export interface UseDoubleCardResult {
  /** บัฟ ×2 หมดเวลาเมื่อไร (ISO) */
  doubleRewardUntil: string
  /** การ์ด ×2 ที่เหลือในคลัง */
  remaining: number
}

/** POST /api/progression/double-card/use — [ใหม่] ใช้การ์ด ×2 1 ใบ → เหรียญ/EXP จากเควสทุกเควส ×2 นาน 12 ชั่วโมง
 *  (นับจากเวลาเซิร์ฟเวอร์ตอนกดใช้) · error: 400 NO_DOUBLE_CARD (ไม่มีการ์ด) / 409 DOUBLE_ALREADY_ACTIVE
 *  (ยังมีการ์ดใบก่อนทำงานอยู่ — ไม่ซ้อนเวลา กันเสียการ์ดฟรี) */
export async function consumeDoubleCard(): Promise<UseDoubleCardResult> {
  if (API_MODE === 'mock') {
    await mockDelay()
    const p = getDb().progression
    if ((p?.doubleCards ?? 0) < 1) {
      throw new ApiError(400, 'ไม่มีการ์ดคูณสองเหลือแล้ว', { error: { code: 'NO_DOUBLE_CARD' } })
    }
    if (doubleActiveUntil(p)) {
      throw new ApiError(409, 'การ์ดคูณสองใบก่อนยังทำงานอยู่ — รอให้หมดเวลาก่อนแล้วค่อยใช้ใบใหม่', { error: { code: 'DOUBLE_ALREADY_ACTIVE' } })
    }
    let result!: UseDoubleCardResult
    updateDb((d) => {
      const prog = ensure(d)
      prog.doubleCards = Math.max(0, (prog.doubleCards ?? 0) - 1)
      prog.doubleRewardUntil = new Date(Date.now() + DOUBLE_CARD_HOURS * 3_600_000).toISOString()
      result = { doubleRewardUntil: prog.doubleRewardUntil, remaining: prog.doubleCards }
    })
    return result
  }
  return http.post<UseDoubleCardResult>('/progression/double-card/use')
}

/** true = ตอนนี้มีบัฟคูณสอง (การ์ด ×2 ยังไม่หมดเวลา) — ใช้คิดรางวัลเควสในโหมด mock */
export function mockHasDoubleReward(d: MockDb): boolean {
  return !!doubleActiveUntil(d.progression) || d.progression?.doubleRewardDate === localDateKey()
}

/** POST /api/shop/:id/exchange — แลกซื้อของพิเศษ/หายาก: หักเหรียญตามราคา + การ์ดครบจำนวน
 *  error: 400 INSUFFICIENT_CARDS (detail.error.missing = จำนวนที่ขาด) / 400 INSUFFICIENT_COINS */
export async function exchangeItem(itemCode: string, price: number): Promise<ExchangeResult> {
  const req = EXCHANGE_REQUIREMENTS[itemCode]
  if (!req) throw new ApiError(400, 'ไอเทมนี้ไม่ต้องใช้การ์ดแลกซื้อ')
  if (API_MODE === 'mock') {
    await mockDelay()
    const current = getDb()
    if (current.inventory.some((i) => i.shopItemId === itemCode)) {
      return { item: current.inventory.find((i) => i.shopItemId === itemCode) as InventoryItem, user: current.user }
    }
    const have = current.progression?.exchangeCards[itemCode] ?? 0
    if (have < req.tokens) {
      throw new ApiError(400, `${exchangeCardLabel(itemCode)}ไม่เพียงพอ`, { error: { code: 'INSUFFICIENT_CARDS', missing: req.tokens - have } })
    }
    if (current.user.coins < price) {
      throw new ApiError(400, `เหรียญไม่พอสำหรับ${exchangeItemName(itemCode)}`, { error: { code: 'INSUFFICIENT_COINS' } })
    }
    const db = updateDb((d) => {
      const p = ensure(d)
      p.exchangeCards[itemCode] = (p.exchangeCards[itemCode] ?? 0) - req.tokens
      if (p.exchangeCards[itemCode] <= 0) delete p.exchangeCards[itemCode]
      d.user = { ...d.user, coins: d.user.coins - price }
      d.inventory.push({ id: `local-${itemCode}`, userId: d.user.id, shopItemId: itemCode, isEquipped: false, purchasedAt: new Date().toISOString() })
    })
    return { item: db.inventory.find((i) => i.shopItemId === itemCode) as InventoryItem, user: db.user }
  }
  const res = await http.post<{ userItem: Record<string, unknown> }>(`/shop/${itemCode}/exchange`)
  return { item: toInventoryItem(res.userItem), user: await getMe() }
}
