import { useState } from 'react'
import { getGratitudeReflection } from '../../../services/aiSummaryService'
import { useAppContext } from '../../../context/AppContext'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import IntroVideoSequence from './shared/IntroVideoSequence'
import ParchmentJournalEditor from './shared/ParchmentJournalEditor'
import JournalHistoryModal from './shared/JournalHistoryModal'
import { QUEST_ICONS } from '../../../config/iconAssets'

import './GratitudeShieldPage.css'

const C_1 = '#FFB020'
const C_2 = '#FFB020'
const C_3 = '#FFB020'
const C_4 = '#FFB020'
/** [เพิ่มตามที่ระบุ — ข้อ 10] ปุ่ม "เริ่มเขียน" ของเควสนี้ใช้เหลืองพาสเทลของตัวเอง แทน
 *  gradient ส้ม-ม่วง (theme.gold + accent เดิม) ที่ใช้ร่วมกับ Reframer Journal */
const YELLOW_PASTEL_BTN = 'linear-gradient(135deg, #FFF9C4, var(--coin))'

/** รหัสอ้างอิงเควสเกราะแห่งความขอบคุณ */
const QUEST_CODE = 'ment-gratitude-shield'

interface GratitudeShieldPageProps {
  /** [ใหม่] วันนี้ทำเควสนี้ไปแล้วหรือยัง — ส่งมาจาก GameplayFrame (อ้างอิง quest_logs จริง)
   *  ใช้ตัดสิน 3 อย่าง: ข้ามวิดีโอ intro, แสดงหน้าสรุปแทนหน้าเขียน, และไม่แจกรางวัลซ้ำ */
  alreadyCompleted: boolean
  /** คอลแบ็กฟังก์ชันเมื่อทำเควสเสร็จสิ้น (แจกรางวัล) */
  onComplete: () => void
  /** คอลแบ็กฟังก์ชันเมื่อกดปิดหน้าจอ */
  onClose: () => void
}

/**
 * GratitudeShieldPage — คอมโพเนนต์หน้าจอเควส "เกราะแห่งความขอบคุณ"
 * เน้นการบันทึก "เรื่องดีๆ ในแต่ละวัน" (Positive Bias) โทนสีทอง/อบอุ่น
 */
export default function GratitudeShieldPage({ alreadyCompleted, onComplete, onClose }: GratitudeShieldPageProps) {
  // ล็อกการสกอร์ลของ Body เมื่อเปิดหน้านี้
  useLockBodyScroll()

  // ดึงข้อมูลประวัติการบันทึกและฟังก์ชันบันทึกข้อมูลจาก Context
  const { journalEntries, handleAddJournalEntry } = useAppContext()

  /* สถานะเปิด/ปิด วิดีโอ Intro และ หน้าต่างประวัติย้อนหลัง
     [เปลี่ยน] วิดีโอ intro เล่นเฉพาะรอบแรกของวัน — ถ้าทำไปแล้วผู้ใช้ต้องรอวิดีโอซ้ำ
     ทุกครั้งที่แวะเข้ามาดูประวัติ ซึ่งกลายเป็นอุปสรรคแทนที่จะเป็นบรรยากาศ */
  const [showIntro, setShowIntro] = useState(!alreadyCompleted)
  const [showHistory, setShowHistory] = useState(false)

  /* [ใหม่] ผู้ใช้ที่ทำครบแล้วกด "บันทึกสิ่งดีๆ เพิ่ม" — เขียนต่อได้ เก็บลงประวัติจริง
     แต่ไม่ได้รางวัลซ้ำ (ดู onComplete ด้านล่างที่เช็ค alreadyCompleted ก่อนแจก) */
  const [isWritingMore, setIsWritingMore] = useState(false)

  // จัดการการกดปุ่ม ESC: หากเปิดหน้าต่างประวัติอยู่ให้ปิดประวัติก่อน หากไม่ได้เปิดให้ปิดหน้ารวม
  useEscapeKey(() => {
    if (showHistory) setShowHistory(false)
    else onClose()
  })

  // ดึงเฉพาะรายการบันทึกที่เป็นของเควสนี้
  const myEntries = journalEntries.filter((e) => e.questCode === QUEST_CODE)

  // 1. แสดงวิดีโอเกริ่นนำ (Intro Sequence) — เฉพาะรอบแรกของวันเท่านั้น
  if (showIntro && !alreadyCompleted) {
    return (
      <IntroVideoSequence
        videoSrc="/assets/videos/quest-mental/Gratitude-Shield.mp4"
        audioSrc="/assets/sounds/Gratitude-Shield.mp3"
        overlayText="คุณกำลังเข้าสู่ เกราะแห่งความขอบคุณ มาเก็บสิ่งดีๆ ของวันนี้ไว้ ทีละชิ้น จนกลายเป็นเกราะป้องกันใจของคุณ"
        accent={C_1}
        onComplete={() => setShowIntro(false)}
      />
    )
  }

  // 2. [ใหม่] ทำครบแล้วของวันนี้ → แสดงหน้าสรุป ไม่พาไปเขียนทันที
  //    เพื่อให้ผู้ใช้รู้ว่าภารกิจวันนี้สำเร็จแล้ว และเลือกเองว่าจะเขียนเพิ่มหรือไม่
  if (alreadyCompleted && !isWritingMore) {
    return (
      <div className="gratitude-shield-page gratitude-shield-page--done">
        <div className="gratitude-shield-done">
          <div className="gratitude-shield-done__icon">🛡️</div>
          <h2 className="gratitude-shield-done__title">เกราะของคุณแข็งแกร่งขึ้นแล้ว!</h2>
          <p className="gratitude-shield-done__body">
            คุณได้เก็บสิ่งดีๆ ของวันนี้ลงเกราะความขอบคุณเรียบร้อย<br />
            หากมีเรื่องดีๆ ที่อยากจดจำไว้อีก สามารถเขียนเพิ่มได้นะ
            (เก็บลงประวัติ แต่ไม่ได้รางวัลซ้ำ)
          </p>
          <div className="gratitude-shield-done__actions">
            <button className="gratitude-shield-done__btn gratitude-shield-done__btn--primary" onClick={() => setIsWritingMore(true)}>
              ✏️ บันทึกสิ่งดีๆ เพิ่ม
            </button>
            <button className="gratitude-shield-done__btn" onClick={() => setShowHistory(true)}>
              🛡️ ดูประวัติเกราะแห่งความขอบคุณ
            </button>
            <button className="gratitude-shield-done__btn gratitude-shield-done__btn--ghost" onClick={onClose}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {showHistory && (
          <JournalHistoryModal
            theme="golden"
            accent={C_2}
            title="ประวัติเกราะแห่งความขอบคุณ"
            entries={myEntries}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>
    )
  }

  // 3. แสดงหน้าจอเขียนบันทึกและปุ่มเปิดประวัติ
  return (
    <div className="gratitude-shield-page">
      {/* ปุ่มปิดหน้าจอหลัก (มุมขวาบน) */}
      <button onClick={onClose} title="ปิด" className="gratitude-shield-page__close">
        ✕
      </button>

      {/* [ย้ายตามที่ระบุ — ข้อ 12] ป้ายลอยมุมซ้ายบน "ประวัติเกราะแห่งความขอบคุณ" ย้ายไปเป็น
          การ์ดเปิด modal ที่หน้าโปรไฟล์แล้ว (ดู ProfilePage.tsx) — ลบปุ่มซ้ำจากหน้าเควสนี้ */}

      {/* บล็อกกระดาษบันทึกแบบโหมดสีทอง (Golden Theme) */}
      <ParchmentJournalEditor
        theme="golden"
        accent={C_3}
        askIconSrc={QUEST_ICONS[QUEST_CODE]}
        askButtonBg={YELLOW_PASTEL_BTN}
        askQuestion={alreadyCompleted
          ? 'มีเรื่องดีๆ อะไรเกิดขึ้นอีก เล่ามาได้เลยนะ'
          : 'วันนี้มีเรื่องดีๆ อะไรเกิดขึ้นบ้าง ไหนเล่าให้ฟังหน่อย?'}
        placeholder="เขียนสิ่งดีๆ ที่เกิดขึ้น..."
        submitLabel="🛡️ เก็บไว้ในเกราะ"
        generateReflection={async (text) => {
          // เรียกใช้งาน AI เพื่อสร้างคำสะท้อนแง่บวกจากสิ่งที่ผู้ใช้เขียน
          const res = await getGratitudeReflection({ gratitudeText: text })
          return res.reflection
        }}
        onSaveEntry={(originalText, aiReframedText) =>
          handleAddJournalEntry({ questCode: QUEST_CODE, originalText, aiReframedText })
        }
        onComplete={() => {
          // [ใหม่] แจกรางวัลเฉพาะรอบแรกของวัน — รอบเขียนเพิ่มบันทึกลงประวัติอย่างเดียว
          // (onSaveEntry ด้านบนทำงานทุกครั้งอยู่แล้ว ข้อความจึงไม่หายไปไหน)
          if (!alreadyCompleted) onComplete()
          onClose()
        }}
      />

      {/* Modal แสดงรายการบันทึกย้อนหลัง (แสดงเมื่อกดปุ่มประวัติ) */}
      {showHistory && (
        <JournalHistoryModal
          theme="golden"
          accent={C_4}
          title="ประวัติเกราะแห่งความขอบคุณ"
          entries={myEntries}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}