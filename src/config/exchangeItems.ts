import { DECORATION_ITEM_META } from './decorationItems'

/*============================================================================*\
  exchangeItems.ts — "การ์ดแลกซื้อ" (Exchange Card) สำหรับของ 🟡พิเศษ / 🟣หายาก ในร้านค้า
  ────────────────────────────────────────────────────────────────────────────
  ของพิเศษ/หายากซื้อด้วยเหรียญอย่างเดียวไม่ได้ — ต้องมี "การ์ดแลกซื้อ<ชื่อไอเทม>" ครบจำนวน (รูป Item.png)
  กติกาฝั่งเซิร์ฟเวอร์ (ผู้ใช้ไม่เห็นตัวนับใดๆ):
    - นับวันที่เดินครบเป้าก้าวรายวัน ตั้งแต่สร้างบัญชี — ครบ 21 วัน = ปลดล็อกระบบการ์ดถาวร
    - หลังปลดล็อก: ทำเควสประจำวันสำเร็จ มีโอกาสได้การ์ดสุ่ม (EXCHANGE_CARD_DROP_CHANCE) ไม่ต้องรอ 21 วันอีก
    - หยั่งรากลึกครบ 3 รอบไม่กดข้าม: ลุ้นการ์ดเพิ่ม (DEEP_ROOT_CARD_CHANCE) — ก่อนปลดล็อกได้เหรียญโบนัสแทน
  จำนวนที่ต้องใช้ (2/3/5/8) ตั้งตามราคา — แก้ที่ EXCHANGE_REQUIREMENTS จุดเดียว
  [backend] ยังไม่มีตาราง — โหมด mock จำลองฝั่งเซิร์ฟเวอร์ใน mockDb.progression (services/api/progression.api.ts)
\*============================================================================*/

export type ExchangeTier = 'SPECIAL' | 'RARE'

export interface ExchangeRequirement {
  tier: ExchangeTier
  /** จำนวนการ์ดแลกซื้อที่ต้องใช้ (บวกเหรียญตามราคาเดิมในร้าน) */
  tokens: number
}

export const EXCHANGE_REQUIREMENTS: Record<string, ExchangeRequirement> = {
  // 🟡 พิเศษ — ยิ่งแพงยิ่งต้องสะสมมาก
  'white-dragon': { tier: 'SPECIAL', tokens: 8 },
  'fire-dragon': { tier: 'SPECIAL', tokens: 5 },
  'magic-parrot': { tier: 'SPECIAL', tokens: 5 },
  'jade-dragon': { tier: 'SPECIAL', tokens: 3 },
  'flame-pattern': { tier: 'SPECIAL', tokens: 3 },
  // 🟣 หายาก
  'crystal-ball': { tier: 'RARE', tokens: 3 },
  'forest-unicorn': { tier: 'RARE', tokens: 3 },
  'calm-butterfly': { tier: 'RARE', tokens: 3 },
  'butterfly-pat': { tier: 'RARE', tokens: 2 },
  'lucky-clover': { tier: 'RARE', tokens: 2 },
  'magic-wand': { tier: 'RARE', tokens: 2 },
}

export const EXCHANGE_ITEM_CODES = Object.keys(EXCHANGE_REQUIREMENTS)

/** [เซิร์ฟเวอร์เท่านั้น — ห้ามแสดงผู้ใช้] วันเดินครบเป้าสะสมที่ปลดล็อกระบบการ์ดถาวร */
export const CARD_UNLOCK_SUCCESS_DAYS = 21
/** โอกาสได้การ์ด 1 ใบต่อเควสประจำวันที่ทำสำเร็จ (หลังปลดล็อก) */
export const EXCHANGE_CARD_DROP_CHANCE = 0.15
/** โอกาสได้การ์ดจากหยั่งรากลึกครบ 3 รอบ (หลังปลดล็อก — ไม่ได้ = ได้เหรียญโบนัสแทน) */
export const DEEP_ROOT_CARD_CHANCE = 0.5
export const DEEP_ROOT_BONUS_COINS = 60

export function exchangeItemName(code: string): string {
  return DECORATION_ITEM_META[code]?.nameTh ?? code
}

/** ชื่อการ์ด เช่น "การ์ดแลกซื้อมังกรไฟ" */
export function exchangeCardLabel(code: string): string {
  return `การ์ดแลกซื้อ${exchangeItemName(code)}`
}

export function tierLabel(tier: ExchangeTier): string {
  return tier === 'SPECIAL' ? 'ของพิเศษ' : 'ของหายาก'
}

/** สุ่มไอเทมเป้าหมายของการ์ด — ไอเทมที่ใช้การ์ดน้อยใบออกบ่อยกว่า */
export function pickRandomExchangeItem(random: () => number = Math.random): string {
  const weighted = EXCHANGE_ITEM_CODES.flatMap((code) => Array(EXCHANGE_REQUIREMENTS[code].tier === 'RARE' ? 3 : 2).fill(code) as string[])
  return weighted[Math.floor(random() * weighted.length)]
}
