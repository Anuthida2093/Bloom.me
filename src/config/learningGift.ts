/*============================================================================*\
  learningGift.ts — [แก้ตามที่ระบุ] ของขวัญสุ่มเมื่อทำเควสการเรียนรู้ครบทั้ง 5 ด่าน (จบ 1 รอบเส้นทาง)
  ────────────────────────────────────────────────────────────────────────────
  การ์ดแลกซื้อ / เหรียญโบนัส / หยดน้ำ — สุ่มที่ "เซิร์ฟเวอร์" ผูกกับ log ที่ปิดรอบ (โหมด mock จำลองใน
  quest.api completeQuest · backend: docs/PROGRESSION_API.md) จากนั้นเส้นทางการเรียนรู้รีเซ็ต
  กลับไปเล่นด่านแรกใหม่ได้ (utils/questCompletion.ts learningRoundState)
  [รออนุมัติ] อัตราสุ่มด้านล่างเป็นค่าเริ่มต้นที่เสนอ ปรับได้ที่นี่จุดเดียว
  การ์ดออกเฉพาะเมื่อระบบการ์ดปลดล็อกแล้ว (กติกาเดียวกับหีบสมบัติเควสก้าว)
\*============================================================================*/

export type LearningGiftKind = 'EXCHANGE_CARD' | 'BONUS_COINS' | 'WATER_DROPS'

export interface LearningGift {
  kind: LearningGiftKind
  /** เหรียญ/หยดน้ำที่ได้ (การ์ด = 1) */
  amount: number
  /** itemCode ของการ์ด (เฉพาะ EXCHANGE_CARD) */
  cardItemCode?: string | null
}

export const LEARNING_GIFT_LOOT: { kind: LearningGiftKind; weight: number; min?: number; max?: number }[] = [
  { kind: 'EXCHANGE_CARD', weight: 20 },
  { kind: 'BONUS_COINS', weight: 45, min: 30, max: 80 },
  { kind: 'WATER_DROPS', weight: 35, min: 3, max: 6 },
]

/** สุ่มจากตาราง — cardsUnlocked=false ตัดช่องการ์ดออก */
export function rollLearningGift(cardsUnlocked: boolean, random: () => number = Math.random): Omit<LearningGift, 'cardItemCode'> {
  const pool = LEARNING_GIFT_LOOT.filter((l) => l.kind !== 'EXCHANGE_CARD' || cardsUnlocked)
  const total = pool.reduce((sum, l) => sum + l.weight, 0)
  let roll = random() * total
  const pick = pool.find((l) => (roll -= l.weight) < 0) ?? pool[pool.length - 1]
  if (pick.kind === 'EXCHANGE_CARD') return { kind: pick.kind, amount: 1 }
  const min = pick.min ?? 1, max = pick.max ?? min
  return { kind: pick.kind, amount: min + Math.floor(random() * (max - min + 1)) }
}
