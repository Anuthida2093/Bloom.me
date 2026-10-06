/*============================================================================*\
  stepChest.ts — หีบสมบัติของเควสก้าวเพื่อสุขภาพ: 1 ใบต่อ "วันที่เดินถึงเป้าสำเร็จ" เท่านั้น
  ────────────────────────────────────────────────────────────────────────────
  แทนกล่อง/จุดสำรวจรายจุดบนแผนที่ทั้งหมดของรอบก่อน — ผลสุ่มทำที่ "เซิร์ฟเวอร์" ผูกกับวันที่ทำเควสสำเร็จ
  เปิดได้ครั้งเดียวต่อวัน (โหมด mock จำลองใน progression.api.ts → openStepChest; backend: docs/PROGRESSION_API.md)
  [รออนุมัติ] ตารางสุ่มด้านล่างเป็นค่าเริ่มต้นที่เสนอ — ผู้ดูแลโปรเจกต์ยังไม่ได้กำหนดอัตรา ปรับได้ที่นี่จุดเดียว
\*============================================================================*/
import { exchangeCardLabel } from './exchangeItems'

/** ปุ่ม "แลกซื้อ" ในป็อปอัปการ์ด → ขอเปิดป็อปอัปสินค้าในร้าน (detail = itemCode) — Dashboard ฟังแล้ว
 *  ปิดหน้าเควส เปิดร้านที่ไอเทมนั้น (หน้าเกมอยู่ลึก ไม่มี callback ส่งต่อถึง Dashboard) */
export const OPEN_SHOP_ITEM_EVENT = 'bloom:open-shop-item'

export type StepChestKind = 'EXCHANGE_CARD' | 'BONUS_COINS' | 'WATER_DROPS' | 'BONUS_EXP'

export interface StepChestLoot {
  kind: StepChestKind
  /** น้ำหนักสุ่ม (ไม่ต้องรวมได้ 100) */
  weight: number
  /** จำนวนสุ่มในช่วง [min, max] (ไม่ใช้กับการ์ด — การ์ดได้ 1 ใบเสมอ) */
  min?: number
  max?: number
}

export const STEP_CHEST_LOOT: StepChestLoot[] = [
  // การ์ดออกได้เฉพาะเมื่อระบบการ์ดปลดล็อกแล้ว (เดินถึงเป้าสะสม 21 วัน — ตัดสินฝั่งเซิร์ฟเวอร์) ไม่งั้นข้ามช่องนี้
  { kind: 'EXCHANGE_CARD', weight: 15 },
  { kind: 'BONUS_COINS', weight: 35, min: 20, max: 60 },
  { kind: 'WATER_DROPS', weight: 25, min: 2, max: 5 },
  { kind: 'BONUS_EXP', weight: 25, min: 15, max: 40 },
]

export interface StepChestReward {
  kind: StepChestKind
  /** เหรียญ/หยดน้ำ/EXP ที่ได้ (การ์ด = 1) */
  amount: number
  /** itemCode ของการ์ดแลกซื้อ (เฉพาะ EXCHANGE_CARD) */
  cardItemCode?: string | null
}

/** ข้อความผลหีบ เช่น "หีบสมบัติ: เหรียญโบนัส +30" (ม้วนกระดาษสรุป/แจ้งเตือนสรุปเมื่อวาน) */
export function describeStepChest(c: StepChestReward): string {
  if (c.kind === 'EXCHANGE_CARD') return `หีบสมบัติ: ${c.cardItemCode ? exchangeCardLabel(c.cardItemCode) : 'การ์ดแลกซื้อไอเทม'}`
  if (c.kind === 'BONUS_COINS') return `หีบสมบัติ: เหรียญโบนัส +${c.amount}`
  if (c.kind === 'WATER_DROPS') return `หีบสมบัติ: หยดน้ำ +${c.amount}`
  return `หีบสมบัติ: EXP โบนัส +${c.amount}`
}

/** สุ่มจากตาราง — cardsUnlocked=false ตัดช่องการ์ดออก */
export function rollStepChest(cardsUnlocked: boolean, random: () => number = Math.random): Omit<StepChestReward, 'cardItemCode'> {
  const pool = STEP_CHEST_LOOT.filter((l) => l.kind !== 'EXCHANGE_CARD' || cardsUnlocked)
  const total = pool.reduce((sum, l) => sum + l.weight, 0)
  let roll = random() * total
  const pick = pool.find((l) => (roll -= l.weight) < 0) ?? pool[pool.length - 1]
  if (pick.kind === 'EXCHANGE_CARD') return { kind: pick.kind, amount: 1 }
  const min = pick.min ?? 1, max = pick.max ?? min
  return { kind: pick.kind, amount: min + Math.floor(random() * (max - min + 1)) }
}
