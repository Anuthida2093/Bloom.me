import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { MoodEntryData } from '../../types'
import { MOOD_CATEGORY_SUBTYPES } from '../../config/moodTypes'
import { BADGE_ICONS } from '../../config/iconAssets'
import { SAFETY_NET_CONTACTS } from '../../config/screening'

/*============================================================================*\
  MedicalBoxAlert — [ไฟล์ใหม่ — ตามที่ระบุ] แจ้งเตือนอารมณ์เป็นกลุ่มลบ (SAD/ANXIOUS/TIRED/
  ANGRY — ดู MOOD_CATEGORY_SUBTYPES.NEGATIVE) ติดต่อกันตั้งแต่ 3 วันขึ้นไป
  ────────────────────────────────────────────────────────────────────────────
  ไอคอนกล่องพยาบาลลอยมุมจอ (ใกล้ dashboard__corner-actions--right) — โผล่เฉพาะตอนตรวจพบ
  streak จริงเท่านั้น กดแล้วเล่นเอฟเฟกต์ฝาเปิด แล้วโชว์ popup ข้อความห่วงใย (ไม่ตัดสิน/วินิจฉัย)
  พร้อมทางลัดที่มีอยู่แล้วในระบบ: สายด่วน 1323 (SAFETY_NET_CONTACTS) และปุ่มไปหมวดสุขภาพจิต
  (ซึ่งมีทั้งเควสไพ่ทิพย์/สมุดบันทึกรากไม้เรืองแสง/เกราะแห่งความขอบคุณให้เลือกเล่นเองอยู่แล้ว —
  ไม่ deep-link ตรงไปเควสใดเควสหนึ่งเพื่อไม่บังคับ ให้ผู้ใช้เลือกเองว่าอยากทำอะไร)
\*============================================================================*/

const NEGATIVE_MOODS = new Set(MOOD_CATEGORY_SUBTYPES.NEGATIVE)
const MIN_STREAK_DAYS = 3

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** นับ "จำนวนวันติดต่อกันล่าสุด" (นับถอยจากวันนี้ย้อนหลังไปทุกวันไม่มีวันขาด) ที่มี mood
 *  entry ของวันนั้นอยู่ในกลุ่มลบ — ถ้าวันนี้ยังไม่เช็คอินหรือวันไหนขาดหาย streak หยุดนับทันที
 *  (ไม่นับข้ามวันที่ไม่มีข้อมูล) ใช้รายการล่าสุดของแต่ละวันถ้าเช็คอินซ้ำหลายครั้งในวันเดียว */
function countNegativeStreakDays(moodEntries: MoodEntryData[]): number {
  if (moodEntries.length === 0) return 0
  const sorted = [...moodEntries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const byDay = new Map<string, MoodEntryData['mood']>()
  for (const entry of sorted) byDay.set(entry.createdAt.split('T')[0], entry.mood)

  let streak = 0
  const cursor = new Date()
  while (true) {
    const mood = byDay.get(toDateKey(cursor))
    if (!mood || !NEGATIVE_MOODS.has(mood)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

interface MedicalBoxAlertProps {
  moodEntries: MoodEntryData[]
  /** เปิดหมวดเควสสุขภาพจิต — reuse handleOpenQuestCategory('mental') เดิมของ Dashboard.tsx */
  onOpenMentalQuests: () => void
}

export default function MedicalBoxAlert({ moodEntries, onOpenMentalQuests }: MedicalBoxAlertProps) {
  const [isOpening, setIsOpening] = useState(false)
  const [showPopup, setShowPopup] = useState(false)

  const streakDays = useMemo(() => countNegativeStreakDays(moodEntries), [moodEntries])
  const hotline = SAFETY_NET_CONTACTS[0]

  if (streakDays < MIN_STREAK_DAYS) return null

  const handleOpen = () => {
    setIsOpening(true)
    window.setTimeout(() => {
      setShowPopup(true)
      setIsOpening(false)
    }, 420)
  }

  return (
    <>
      <button
        className={isOpening ? 'medical-box-alert__fab medical-box-alert__fab--opening' : 'medical-box-alert__fab'}
        onClick={handleOpen}
        title="เราสังเกตเห็นว่าช่วงนี้คุณรู้สึกไม่ค่อยดี — แตะเพื่อดูทางช่วยเหลือ"
        aria-label="กล่องช่วยเหลือดูแลใจ"
      >
        {/* ยืนยันแล้วว่ามีไฟล์ Medical Box.png จริงในโฟลเดอร์ badges (ดู iconAssets.ts) —
            ไม่ต้อง fallback เป็น emoji */}
        <span className="medical-box-alert__lid" aria-hidden="true">
          <img src={BADGE_ICONS.medicalBox} alt="" />
        </span>
      </button>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            className="medical-box-alert__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPopup(false)}
          >
            <motion.div
              className="medical-box-alert__card"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="medical-box-alert__close" onClick={() => setShowPopup(false)} title="ปิด" aria-label="ปิด"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>
              <div className="medical-box-alert__icon">🏥</div>
              <h3 className="medical-box-alert__title">เราเป็นห่วงคุณนะ</h3>
              <p className="medical-box-alert__body">
                ช่วงนี้เราสังเกตว่าอารมณ์ของคุณดูไม่ค่อยสดใสมาหลายวันติดกันเลย
                ไม่เป็นไรนะถ้าจะรู้สึกแบบนี้ — ลองพักหายใจสักครู่ หรือเล่นเควสในหมวดสุขภาพจิต
                ดูก็ได้ ถ้าอยากคุยกับใครสักคนก็มีสายด่วนพร้อมรับฟังอยู่เสมอ
              </p>
              <a className="medical-box-alert__hotline" href={hotline.href}>
                <span>{hotline.icon}</span>
                <span>
                  <strong>{hotline.title}</strong>
                  <small>{hotline.subtitle}</small>
                </span>
              </a>
              <button
                className="medical-box-alert__cta"
                onClick={() => { setShowPopup(false); onOpenMentalQuests() }}
              >
                🔮 ไปหมวดสุขภาพจิต
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .medical-box-alert__fab {
          width: 2cm; height: 2cm;
          border: none; background: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform var(--dur-fast) var(--ease-spring);
        }
        .medical-box-alert__fab:hover { transform: scale(1.08); }
        .medical-box-alert__fab:active { transform: scale(.94); }
        .medical-box-alert__lid { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
        .medical-box-alert__lid img { width: 2.2cm; height: 2.2cm; object-fit: contain; }

        /* เอฟเฟกต์ "ฝากล่องเปิดออก" สั้นๆ ตอนกด — หมุน+ยกขึ้นเบาๆ ก่อน popup จะโผล่ */
        .medical-box-alert__fab--opening .medical-box-alert__lid {
          animation: medicalBoxLidOpen .42s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes medicalBoxLidOpen {
          0%   { transform: rotate(0deg) translateY(0); }
          50%  { transform: rotate(-14deg) translateY(-6px); }
          100% { transform: rotate(0deg) translateY(0); }
        }

        .medical-box-alert__backdrop {
          position: fixed; inset: 0; z-index: 1050;
          background: var(--glass-b-45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .medical-box-alert__card {
          width: 100%; max-width: 380px; position: relative; text-align: center;
          background: var(--bg-card); border-radius: 26px; padding: 32px 26px;
          box-shadow: 0 24px 60px var(--glass-b-30);
        }
        .medical-box-alert__close {
          position: absolute; top: 12px; right: 12px; width: 36px; height: 36px;
          border-radius: 99px; border: none; background: var(--n100); color: var(--text-sub);
          cursor: pointer; font-size: 14px;
        }
        .medical-box-alert__icon { font-size: 46px; margin-bottom: 4px; }
        .medical-box-alert__title {
          font-family: var(--font-display); font-size: var(--fs-xl); color: var(--heading-accent); margin-bottom: 8px;
        }
        .medical-box-alert__body {
          font-size: var(--fs-sm); line-height: var(--lh-body); color: var(--text-sub); margin-bottom: 20px;
        }
        .medical-box-alert__hotline {
          display: flex; align-items: center; gap: 12px; text-align: left;
          padding: 12px 14px; border-radius: 16px; background: var(--n50);
          text-decoration: none; margin-bottom: 14px;
        }
        .medical-box-alert__hotline span:first-child { font-size: 24px; flex-shrink: 0; }
        .medical-box-alert__hotline strong { display: block; font-family: var(--font-display); font-size: var(--fs-sm); color: var(--text); }
        .medical-box-alert__hotline small { font-size: var(--fs-xs); color: var(--text-muted); }
        .medical-box-alert__cta {
          width: 100%; padding: 13px; border: none; border-radius: 16px;
          background: linear-gradient(135deg, var(--purple), var(--g600));
          color: var(--fixed-white); font-family: var(--font-display); font-size: var(--fs-md);
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .medical-box-alert__fab { width: 1.5cm; height: 1.5cm; }
          .medical-box-alert__lid img { width: 1.9cm; height: 1.9cm; }
        }

        @media (prefers-reduced-motion: reduce) {
          .medical-box-alert__fab--opening .medical-box-alert__lid { animation: none; }
        }
      `}</style>
    </>
  )
}
