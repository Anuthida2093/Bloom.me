import { useState } from 'react'
import type { MoodEntryData } from '../../../types'
import { getJournalReflection } from '../../../services/aiSummaryService'
import { useAppContext } from '../../../context/AppContext'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import IntroVideoSequence from './shared/IntroVideoSequence'
import ParchmentJournalEditor from './shared/ParchmentJournalEditor'
import JournalHistoryModal from './shared/JournalHistoryModal'

import './ReframerJournalPage.css'

const C_1 = '#9B59D0'
const C_2 = '#9B59D0'
const C_3 = '#9B59D0'
const C_4 = '#9B59D0'

const QUEST_CODE = 'ment-reframer-journal'

interface ReframerJournalPageProps {
  moodEntry: MoodEntryData
  /** [ใหม่] วันนี้ทำเควสนี้ไปแล้วหรือยัง — ส่งมาจาก GameplayFrame (อ้างอิง quest_logs จริง)
   *  ใช้ตัดสิน 3 อย่าง: ข้ามวิดีโอ intro, แสดงหน้าสรุปแทนหน้าเขียน, และไม่แจกรางวัลซ้ำ */
  alreadyCompleted: boolean
  onComplete: () => void
  onClose: () => void
}

/**
 * ReframerJournalPage — [เขียนใหม่ทั้งหมดตามสเปกใหม่] เควส "สมุดบันทึกรากไม้เรืองแสง"
 * Flow: intro (วิดีโอ Reframer-Journal.mp4 + เสียง Reframer-Journal.mp3 + overlay text
 * แฟนตาซี) → main (ปุ่ม "ประวัติสมุดบันทึกรากไม้เรืองแสง" มุมบน + ParchmentJournalEditor
 * ถามคำถาม → เขียนบนกระดาษ parchment แบบ live-sync → AI สะท้อนกลับ → รับรางวัล)
 * กดปุ่มประวัติเมื่อไหร่ก็ได้ (แม้กำลังเขียนอยู่) เปิด JournalHistoryModal ทับขึ้นมา
 */
export default function ReframerJournalPage({ moodEntry, alreadyCompleted, onComplete, onClose }: ReframerJournalPageProps) {
  useLockBodyScroll()
  const { journalEntries, handleAddJournalEntry } = useAppContext()

  /* [เปลี่ยน] วิดีโอ intro เล่นเฉพาะรอบแรกของวัน — คนที่แวะกลับมาเขียนเพิ่ม
     ไม่ควรต้องนั่งรอวิดีโอเดิมซ้ำอีกรอบ */
  const [showIntro, setShowIntro] = useState(!alreadyCompleted)
  const [showHistory, setShowHistory] = useState(false)

  /* [ใหม่] กด "เขียนระบายเพิ่ม" จากหน้าสรุป → เขียนต่อได้ เก็บลงประวัติจริง
     แต่ไม่ได้รางวัลซ้ำ */
  const [isWritingMore, setIsWritingMore] = useState(false)

  useEscapeKey(() => { if (showHistory) setShowHistory(false); else onClose() })

  const myEntries = journalEntries.filter((e) => e.questCode === QUEST_CODE)

  if (showIntro && !alreadyCompleted) {
    return (
      <IntroVideoSequence
        videoSrc="/assets/videos/quest-mental/Reframer-Journal.mp4"
        audioSrc="/assets/sounds/Reframer-Journal.mp3"
        overlayText="คุณกำลังเข้าสู่ สมุดบันทึกรากไม้เรืองแสง มาบันทึกเรื่องของคุณและเก็บความรู้สึกเหล่านี้ไว้ ฉันช่วยคุณได้นะ"
        accent={C_1}
        onComplete={() => setShowIntro(false)}
      />
    )
  }

  /* [ใหม่] ทำครบแล้วของวันนี้ → แสดงหน้าสรุปก่อน ไม่พาไปเขียนทันที */
  if (alreadyCompleted && !isWritingMore) {
    return (
      <div className="reframer-journal-page reframer-journal-page--done">
        <div className="reframer-journal-done">
          <div className="reframer-journal-done__icon">🌿</div>
          <h2 className="reframer-journal-done__title">วันนี้คุณบันทึกเรื่องราวแล้ว!</h2>
          <p className="reframer-journal-done__body">
            รากไม้ได้รับฟังความรู้สึกของคุณเรียบร้อยแล้ว<br />
            แต่ถ้ามีเรื่องอยากระบายเพิ่ม สามารถเขียนต่อได้นะ
            (ข้อความจะถูกเก็บลงประวัติ แต่จะไม่ได้รับรางวัลซ้ำ)
          </p>
          <div className="reframer-journal-done__actions">
            <button className="reframer-journal-done__btn reframer-journal-done__btn--primary" onClick={() => setIsWritingMore(true)}>
              ✏️ เขียนระบายเพิ่ม
            </button>
            <button className="reframer-journal-done__btn" onClick={() => setShowHistory(true)}>
              📜 ดูประวัติสมุดบันทึก
            </button>
            <button className="reframer-journal-done__btn reframer-journal-done__btn--ghost" onClick={onClose}>
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {showHistory && (
          <JournalHistoryModal
            theme="mystic"
            accent={C_2}
            title="ประวัติสมุดบันทึกรากไม้เรืองแสง"
            entries={myEntries}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="reframer-journal-page">
      <button onClick={onClose} title="ปิด" className="reframer-journal-page__close">✕</button>
      <button onClick={() => setShowHistory(true)} className="reframer-journal-page__history-btn">
        📜 ประวัติสมุดบันทึกรากไม้เรืองแสง
      </button>

      <ParchmentJournalEditor
        theme="mystic"
        accent={C_3}
        askQuestion={alreadyCompleted
          ? 'มีอะไรอยากเล่าให้ฉันฟังเพิ่มอีกไหม?'
          : 'วันนี้คุณรู้สึกอย่างไร มีอะไรอยากบอกกับฉันไหม?'}
        placeholder="เขียนสิ่งที่อยู่ในใจวันนี้ลงตรงนี้..."
        submitLabel="🌿 ส่งให้รากไม้อ่าน"
        generateReflection={async (text) => {
          const res = await getJournalReflection({ moodEntry, journalText: text })
          return res.reflection
        }}
        onSaveEntry={(originalText, aiReframedText) => handleAddJournalEntry({ questCode: QUEST_CODE, originalText, aiReframedText })}
        onComplete={() => {
          // [ใหม่] แจกรางวัลเฉพาะรอบแรกของวัน — รอบเขียนเพิ่มเก็บลงประวัติอย่างเดียว
          if (!alreadyCompleted) onComplete()
          onClose()
        }}
      />

      {showHistory && (
        <JournalHistoryModal
          theme="mystic"
          accent={C_4}
          title="ประวัติสมุดบันทึกรากไม้เรืองแสง"
          entries={myEntries}
          onClose={() => setShowHistory(false)}
        />
      )}

    </div>
  )
}