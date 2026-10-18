import { getActiveJourney, clearPendingJourneyClaim } from './api/journey.api'
import { getProgression, localDateKey, openStepChest, recordStepDay } from './api/progression.api'
import { completeQuest } from './api/quest.api'
import { calcDailyStepTarget, calcMapTotalStepsTarget, calcProportionalRewards } from '../config/journeyRules'
import { calculateStepReward } from '../config/stepGoalByBmi'
import type { StepChestReward } from '../config/stepChest'
import { getJourneyDaySteps, resetStepJourneyDays } from '../utils/stepJourneyDays'
import { bangkokTimeOn } from '../utils/progression'

/*============================================================================*\
  stepSettlement.ts — ปิดรอบเควสก้าวเพื่อสุขภาพของ "วันที่ผ่านไปแล้ว" แบบ lazy ตอนเปิดแอปครั้งถัดไป
  ────────────────────────────────────────────────────────────────────────────
  ตัดรอบเที่ยงคืนเวลาไทย (endOfTripDay) — ผู้เล่นไม่ได้เปิดหน้าสรุปกดรับเองก่อนเที่ยงคืน ทริปค้างเป็น
  "จบแล้วแต่ยังไม่รับ" (pending claim) → เปิดแอปครั้งถัดไประบบรับให้อัตโนมัติด้วย "ก้าวล่าสุดที่บันทึกไว้":
    1) ยืนยันก้าวของวันนั้นเข้าบัญชี (recordStepDay — นับวันถึงเป้าสะสม 21 วัน)
    2) completeQuest ด้วยสูตรเดิมของ backend (ต่อ 100 ก้าว) + settleDate = วันทริป (ไม่กินโควตาวันนี้)
    3) หยดน้ำตามสัดส่วน (ฝั่งหน้าเว็บ) + ถ้าถึงเป้า เปิดหีบของวันนั้นให้ (ผลสุ่มจากเซิร์ฟเวอร์ ครั้งเดียว)
    4) เก็บผลสรุปไว้แสดงเป็นแจ้งเตือน "ผลสรุปรางวัลก้าวเพื่อสุขภาพเมื่อวาน" ตอนเช้า (useNotifications)
  [ข้อจำกัด] ก้าวที่ใช้คือก้าวที่ซิงค์เข้ามาแล้วก่อนเที่ยงคืน — ก้าวที่เดินหลังซิงค์ครั้งสุดท้ายไม่ถูกนับ
  และ backend ยังรับ logDate ย้อนหลังไม่ได้ (โหมด live จะลงเป็นวันนี้) — ข้อเสนอใน docs/PROGRESSION_API.md
\*============================================================================*/

const STEP_QUEST_CODE = 'phys-vitality-steps'
/** แจ้งเตือนผลสรุปขึ้นไม่เร็วกว่ากี่โมงเช้า (เวลาไทย) ของวันถัดไป */
const MORNING_HOUR = 7
const MAX_RECORDS = 7
export const STEP_SETTLED_EVENT = 'bloom:step-settled'

export interface StepSettlementRecord {
  date: string
  steps: number
  goal: number
  goalMet: boolean
  exp: number
  coins: number
  waterDrops: number
  chest: StepChestReward | null
  settledAt: string
  /** เวลาที่แจ้งเตือนเริ่มแสดง (เช้าวันถัดไป หรือเวลาที่ปิดรอบ ถ้าเปิดแอปสายกว่านั้น) */
  notifyAt: string
}

const recordsKey = (userId: string) => `bloom:step-settlements:${userId}`

export function readStepSettlements(userId: string): StepSettlementRecord[] {
  if (!userId) return []
  try {
    const raw = window.localStorage.getItem(recordsKey(userId))
    return raw ? (JSON.parse(raw) as StepSettlementRecord[]) : []
  } catch { return [] }
}

function saveStepSettlement(userId: string, record: StepSettlementRecord) {
  const list = [record, ...readStepSettlements(userId).filter((r) => r.date !== record.date)].slice(0, MAX_RECORDS)
  try { window.localStorage.setItem(recordsKey(userId), JSON.stringify(list)) } catch { /* storage ปิด */ }
  window.dispatchEvent(new CustomEvent(STEP_SETTLED_EVENT))
}

let inFlight: Promise<StepSettlementRecord | null> | null = null
/** จำนวนหน้าเควสก้าวที่เปิดอยู่ — เปิดอยู่ = ผู้เล่นรับรางวัลเองในหน้าสรุป (เช่นเปิดค้างข้ามเที่ยงคืน) ไม่ปิดรอบแทน */
let holds = 0

/** หน้าเควสก้าวเรียกตอน mount — คืนฟังก์ชันปล่อยตอน unmount */
export function holdStepSettlement(): () => void {
  holds++
  return () => { holds = Math.max(0, holds - 1) }
}

/** หน้าเควสก้าวรอให้ปิดรอบเสร็จก่อนโหลดทริป — กันรับรางวัลทริปเดียวกันซ้ำสองทาง */
export function waitForStepSettlement(): Promise<unknown> {
  return inFlight ?? Promise.resolve()
}

export interface SettleContext {
  userId: string
  bmi: number
  /** บวกหยดน้ำ (ข้อมูลฝั่งหน้าเว็บ — backend ไม่มี) */
  addWaterDrops: (amount: number) => void
}

/** ปิดรอบทริปของวันก่อนหน้าที่ยังไม่ได้รับรางวัล — ไม่มีอะไรค้าง/เป็นทริปของวันนี้ → null */
export function settlePreviousStepDay(ctx: SettleContext): Promise<StepSettlementRecord | null> {
  if (inFlight) return inFlight
  if (holds > 0) return Promise.resolve(null)
  inFlight = run(ctx).finally(() => { inFlight = null })
  return inFlight
}

async function run({ userId, bmi, addWaterDrops }: SettleContext): Promise<StepSettlementRecord | null> {
  const journey = await getActiveJourney().catch(() => null)
  if (!journey || journey.status === 'IN_PROGRESS' || journey.userId !== userId) return null
  const tripDate = localDateKey(new Date(journey.startedAt))
  const today = localDateKey()
  // ทริปของวันนี้ที่จบแล้ว (เดินถึงเป้า) — ผู้เล่นเปิดหีบ/กดรับเองในหน้าเควส ไม่ปิดรอบแทน
  if (tripDate >= today) return null

  const dailyTarget = calcDailyStepTarget(bmi)
  const tripTarget = calcMapTotalStepsTarget(bmi)
  const steps = Math.max(getJourneyDaySteps(journey.id, tripDate), journey.progressOnCurrentMapSteps)
  const goalMet = journey.progressOnCurrentMapSteps >= tripTarget
  const trip = { mapId: journey.destinationMapId, journeyId: journey.id }

  await recordStepDay(tripDate, steps, dailyTarget, trip).catch(() => { /* เซิร์ฟเวอร์เก็บค่ามากสุด ส่งซ้ำรอบหน้าได้ */ })
  const consecutiveGoalDays = (await getProgression().catch(() => null))?.goalStreakDays ?? 0
  // ผิดพลาดตรงนี้ → โยนต่อ ทริปยังค้างเป็น pending ลองใหม่ตอนเปิดแอปครั้งหน้า (ไม่ล้างอะไร)
  await completeQuest({
    questCode: STEP_QUEST_CODE,
    payload: {
      destinationMapId: journey.destinationMapId, mapId: journey.destinationMapId, status: journey.status,
      steps: journey.progressOnCurrentMapSteps, consecutiveGoalDays, settleDate: tripDate, autoSettled: true,
    },
  })
  resetStepJourneyDays()
  clearPendingJourneyClaim()

  // แสดงผลด้วยสูตรเดียวกับ backend/หน้าสรุป (DiaryRewardScroll) — ตัวเลขจริงอยู่ที่เซิร์ฟเวอร์แล้ว
  const reward = calculateStepReward({ steps: journey.progressOnCurrentMapSteps, bmi, consecutiveGoalDays })
  let waterDrops = calcProportionalRewards(journey.progressOnCurrentMapSteps, tripTarget).waterDrops
  let chest: StepChestReward | null = null
  if (goalMet) {
    const opened = await openStepChest(tripDate).catch(() => null)
    if (opened) {
      chest = opened.reward
      if (!opened.alreadyOpened && opened.reward.kind === 'WATER_DROPS') waterDrops += opened.reward.amount
    }
  }
  if (waterDrops > 0) addWaterDrops(waterDrops)

  const now = new Date()
  const morning = bangkokTimeOn(today, MORNING_HOUR)
  const record: StepSettlementRecord = {
    date: tripDate, steps, goal: dailyTarget, goalMet, exp: reward.exp, coins: reward.coins, waterDrops, chest,
    settledAt: now.toISOString(),
    notifyAt: (morning > now ? morning : now).toISOString(),
  }
  saveStepSettlement(userId, record)
  return record
}
