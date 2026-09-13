/*============================================================================*\
  motion.ts — [ไฟล์ใหม่] ชุดท่าเคลื่อนไหวกลางของทั้งแอป
  ────────────────────────────────────────────────────────────────────────────
  เดิมแต่ละโมดัลเขียนอนิเมชันเอง (หรือไม่มีเลย) และเกือบทุกตัวเป็น
  {modals.x && <X />} ซึ่งแปลว่า "ตอนปิดคือหายวับ" ไม่มีอนิเมชันขาออก
  นี่เป็นหนึ่งในสัญญาณที่คนรับรู้เร็วที่สุดว่าแอปยังไม่เสร็จ แม้จะบอกไม่ถูกว่าเพราะอะไร

  หลักการที่ยึด: ใช้ "หนึ่งช่วงเวลาที่ออกแบบมาอย่างตั้งใจ" ไม่ใช่ใส่อนิเมชัน
  จางขึ้น-เลื่อนขึ้นให้ทุกการ์ดทุกส่วน (ซึ่งเป็นลายเซ็นของงานที่ทำแบบเทมเพลต)
  ช่วงเวลาที่เป็นพระเอกของแอปนี้คือ "ต้นไม้เติบโตตอนทำเควสสำเร็จ" (growthPulse
  ใน TreeOfLife) — ที่เหลือควรเงียบและเรียบ

  ใช้กับ framer-motion:
      import { m, AnimatePresence } from 'framer-motion'
      import { sceneEnter } from '../../config/motion'
      <AnimatePresence mode="wait">
        {open && <m.div key="x" {...sceneEnter}>...</m.div>}
      </AnimatePresence>
\*============================================================================*/

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const

/** ฉากเต็มจอ / full-screen section (เควส ร้านค้า คลังไอเทม) */
export const sceneEnter = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.32, ease: EASE_OUT_SOFT } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: EASE_OUT_SOFT } },
}

/** โมดัลกลางจอที่มีพื้นหลังมืด */
export const modalEnter = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: EASE_OUT_SOFT } },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.18 } },
}

/** พื้นหลังมืดของโมดัล */
export const backdropEnter = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.24 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
}

/** แผงลอยข้างจอ (leaderboard / tree stats) */
export const panelEnter = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE_OUT_SOFT } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.18 } },
}

/** การ์ดรางวัล / ฉลอง — ท่าเดียวในแอปที่อนุญาตให้เด้ง */
export const celebrateEnter = {
  initial: { opacity: 0, scale: 0.6, rotate: -8 },
  animate: {
    opacity: 1, scale: 1, rotate: 0,
    transition: { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] as const },
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
}