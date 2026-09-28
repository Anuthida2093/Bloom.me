import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  WateringCanFx — [ไฟล์ใหม่ — เควส "แคลอรี่ตาม BMI"] แอนิเมชันบัวรดน้ำบินเข้ามารดน้ำที่โคน
  ต้นไม้หน้า Dashboard หลังปิดเควส Balanced Nutrients สำเร็จ
  ────────────────────────────────────────────────────────────────────────────
  [ตามที่ระบุ] เอฟเฟกต์นี้ต้องเล่น "ตอนกลับมาที่ Dashboard หลังปิดเควส" ไม่ใช่ในหน้าเควสเอง —
  ผูกกับ treeGrowthPulse.questCode (ProgressContext.tsx → handleToggleQuest ใส่ questCode
  ให้ทุกครั้งที่เควสสำเร็จอยู่แล้ว) แทนการสร้าง event/state ใหม่คู่ขนาน — Dashboard.tsx เพียง
  ส่ง pulse ตัวเดิมที่มีอยู่แล้วเข้ามา ให้ component นี้เช็คเองว่าเป็นเควสไหน
\*============================================================================*/

const BALANCED_NUTRIENTS_QUEST_CODE = 'phys-balanced-nutrients'
/** ระยะเวลาที่แอนิเมชันเล่นทั้งหมดก่อนหายไปเอง (มิลลิวินาที) */
const EFFECT_DURATION_MS = 2400

interface WateringCanFxProps {
  pulse: { category: string; key: number; questCode?: string } | null
  /** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 6] "แรงสั่นบัวรดน้ำ" ทั่วไป — ไม่ผูกกับเควสใดเควสหนึ่งเจาะจง
   *  (ต่างจาก pulse ด้านบนที่ยังคงพฤติกรรมเดิมของ phys-balanced-nutrients ไว้) เปลี่ยนค่าทุก
   *  ครั้งที่มีจุดไหนในระบบเรียก triggerWateringEffect() (ProgressContext.tsx) — ปัจจุบันคือ
   *  ทุกครั้งที่ OracleCardsPage.tsx ให้รางวัลหยดน้ำจริงแล้วผู้ใช้กดกลับหน้า Home */
  waterPulseKey?: number
}

export default function WateringCanFx({ pulse, waterPulseKey }: WateringCanFxProps) {
  const [visible, setVisible] = useState(false)
  // [แก้ตามที่ระบุ] Dashboard ส่ง pulse = null ระหว่างหน้าเควสยังเปิดอยู่ แล้วส่งค่าเดิมกลับมาตอนปิด →
  // เล่นตอนกลับมาหน้า Home จริงๆ ครั้งเดียวต่อการทำเควสสำเร็จ (จำ key ที่เล่นไปแล้ว กันเล่นซ้ำตอนเปิด/ปิดป็อปอัพอื่น)
  const lastPlayedKey = useRef<number | null>(null)

  useEffect(() => {
    if (!pulse || pulse.questCode !== BALANCED_NUTRIENTS_QUEST_CODE) return
    if (lastPlayedKey.current === pulse.key) return
    lastPlayedKey.current = pulse.key
    // [หมายเหตุ react-hooks/set-state-in-effect] ซิงค์กับสัญญาณจากภายนอกจริง (pulse prop ที่
    // เปลี่ยนมาจาก ProgressContext ตอนเควสสำเร็จ) ไม่ใช่ state ที่ derive จาก props ได้เพียวๆ —
    // ต้องตั้ง timer จริงเพื่อซ่อนเอฟเฟกต์เองหลังเล่นจบ (แพทเทิร์นเดียวกับ MindfulAnchorPage.tsx)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), EFFECT_DURATION_MS)
    return () => window.clearTimeout(timer)
    // pulse.key เปลี่ยนทุกครั้งที่ทำเควสสำเร็จ (แม้ code เดิม) — ใช้เป็น dependency หลักเพื่อให้
    // เล่นซ้ำได้ทุกครั้งที่ทำเควสนี้สำเร็จอีก ไม่ใช่แค่ครั้งแรก
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse?.key])

  /* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 6] ทริกเกอร์ทั่วไปแยกจากด้านบน — ใช้ waterPulseKey > 0 กันไม่ให้
     เล่นเอฟเฟกต์ตอน mount ครั้งแรก (ค่าเริ่มต้นคือ 0 จาก ProgressContext) */
  useEffect(() => {
    if (!waterPulseKey) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), EFFECT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [waterPulseKey])

  return (
    <AnimatePresence>
      {visible && (
        <div className="watering-can-fx" aria-hidden="true">
          <motion.img
            src={BADGE_ICONS.wateringCan}
            alt=""
            className="watering-can-fx__can"
            // [แก้ตามที่ระบุ] พวยอยู่ทางซ้ายของรูป → เอียงทวนเข็ม (-25°) ให้หัวพวยก้มลงเทน้ำใส่ต้นไม้
            initial={{ x: '60%', y: '-40%', opacity: 0, rotate: 10 }}
            animate={{ x: '0%', y: '0%', opacity: 1, rotate: -25 }}
            exit={{ opacity: 0, y: '10%' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
          <motion.div
            className="watering-can-fx__drops"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.img
                key={i}
                src={BADGE_ICONS.water}
                alt=""
                className="watering-can-fx__drop"
                style={{ left: `${(i % 3) * 7 - 7}px` }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: 78, opacity: [0, 1, 0] }}
                transition={{ duration: 0.9, delay: 0.65 + i * 0.08, repeat: 1, repeatDelay: 0.2 }}
              />
            ))}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
