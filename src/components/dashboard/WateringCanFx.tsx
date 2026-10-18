import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  WateringCanFx — แอนิเมชันบัวรดน้ำบินเข้ามารดน้ำที่โคนต้นไม้หน้า Home
  ────────────────────────────────────────────────────────────────────────────
  เล่น 1 ครั้งทุกครั้งที่ waterPulseKey เปลี่ยน (0 = ไม่เล่น) — Dashboard เป็นคนตัดสินว่าเมื่อไร:
    - กลับมาหน้า Home หลังได้หยดน้ำใหม่จากเควส (ธง one-shot utils/waterPrompt.ts)
    - กด "รดน้ำต้นไม้วันนี้!" ในเช็คอินอารมณ์ (รดน้ำจริงตาม backend: วันละครั้ง +15 EXP)
  [แก้บั๊ก — ขึ้นทุกครั้งที่เข้าหน้า Home] เดิมผูกกับ pulse ใน ProgressContext ที่อยู่ข้ามการ mount
  แต่ตัวกันเล่นซ้ำอยู่ใน ref ของคอมโพเนนต์นี้ — mount ใหม่ = เล่นซ้ำ ตอนนี้ key เป็น state ของหน้า Home
\*============================================================================*/

/** ระยะเวลาที่แอนิเมชันเล่นทั้งหมดก่อนหายไปเอง (มิลลิวินาที) */
const EFFECT_DURATION_MS = 2400

export default function WateringCanFx({ waterPulseKey }: { waterPulseKey: number }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!waterPulseKey) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- เริ่มแอนิเมชันตามสัญญาณจากหน้า Home แล้วซ่อนเองตามเวลา
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
