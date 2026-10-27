// src/config/badgeCatalog.ts
/*============================================================================*\
  badgeCatalog.ts — [ไฟล์ใหม่ตามที่ระบุ] ระบบ badge/achievement จริงตัวแรกของ frontend
  ────────────────────────────────────────────────────────────────────────────
  backend (schema.prisma) มี model Badge/UserBadge อยู่แล้ว และ seed.ts เก็บ badge ไว้
  8 ตัว แต่ frontend ไม่เคยมีระบบแสดงผล badge เลยแม้แต่จุดเดียวมาก่อน (ตรวจแล้วยืนยัน)

  รอบนี้สร้างเฉพาะ 2 badge ที่ถูกตัดสินใจให้ทำแล้วเท่านั้น (Strategic Delay จากการแยก
  content-review ออกจากเควสเดิม + Mirror of Truth จากกลไก feedback ใหม่) — อีก 6 badge
  ใน seed.ts (ten-year-forest x3, guardian-of-rest, gratitude-aura, soil-restoration) ยัง
  ไม่ได้อยู่ในสโคปที่ตัดสินใจรอบนี้ ไม่ได้ implement ที่นี่ (ไม่ใช่ถูกลืม — ตั้งใจเว้นไว้)

  วิธีประเมินว่า badge ไหน "ปลดล็อกแล้ว" อยู่ที่ MentalContext.tsx (earnedBadges) ไม่ใช่ที่นี่
  — ไฟล์นี้เก็บแค่ข้อมูลแสดงผล (title/description/icon) ตรงกับ seed.ts
\*============================================================================*/

export interface BadgeDef {
  /** ตรงกับ Badge.code ใน seed.ts เป๊ะ */
  code: string
  title: string
  titleTh: string
  description: string
  icon: string
}

export const BADGE_CATALOG: BadgeDef[] = [
  {
    code: 'strategic-delay',
    title: 'Strategic Delay',
    titleTh: 'กลยุทธ์การรอคอย',
    description: 'ตั้งค่าทบทวนเนื้อหาแบบรายเดือนต่อเนื่อง 3 รอบ',
    icon: '📅',
  },
  {
    code: 'mirror-of-truth',
    title: 'Mirror of Truth',
    titleTh: 'กระจกแห่งความจริง',
    description: 'ให้ feedback ทันทีหลังทำกิจกรรมเสร็จ',
    icon: '🪞',
  },
]

export function findBadgeByCode(code: string): BadgeDef | undefined {
  return BADGE_CATALOG.find((b) => b.code === code)
}
