import { useMemo, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { findQuestByCode } from '../../../../config/questCatalog'
import '../games.css'

/*  [นำกลับมาตามที่ระบุ] เควสเสริม "กระจกแห่งความจริง" (Mirror of Truth)
    ─────────────────────────────────────────────────────────────
    ย้อนดูเควสที่ทำสำเร็จวันนี้ แล้วตอบตรงๆ ว่ารู้สึกยังไงหลังทำแต่ละเควส — บันทึกผ่าน
    submitQuestFeedback() ท่อเดียวกับป้าย QuestFeedbackPrompt (badge "Mirror of Truth" และ
    บันทึกใน "ป่าแห่งสิบปี" จึงนับรวมกันอัตโนมัติ)                                      */

type Reaction = 'good' | 'neutral' | 'bad'

const REACTIONS: { value: Reaction; emoji: string; label: string }[] = [
  { value: 'good', emoji: '👍', label: 'ดี' },
  { value: 'neutral', emoji: '😐', label: 'เฉยๆ' },
  { value: 'bad', emoji: '👎', label: 'ไม่ค่อยดี' },
]

const SELF_CODE = 'know-mirror-of-truth'

export default function MirrorOfTruthGame({ finish }: QuestGameProps) {
  const { questLogs, submitQuestFeedback } = useAppContext()
  const [answers, setAnswers] = useState<Record<string, Reaction>>({})
  /** [แก้ตามที่ระบุ] พิมพ์ความรู้สึก/สิ่งที่ได้เรียนรู้เพิ่มได้ */
  const [note, setNote] = useState('')

  /** เควสที่ทำสำเร็จวันนี้ (ไม่รวมตัวเอง) — เควสที่ทำซ้ำหลายรอบแสดงครั้งเดียว ใช้รอบล่าสุด */
  const todaysQuests = useMemo(() => {
    const todayStr = new Date().toDateString()
    const byCode = new Map<string, { code: string; title: string; completedAt: string }>()
    for (const l of questLogs) {
      const code = l.quest?.code
      if (!code || code === SELF_CODE || l.status !== 'COMPLETED' || !l.completedAt) continue
      if (new Date(l.completedAt).toDateString() !== todayStr) continue
      const prev = byCode.get(code)
      if (prev && prev.completedAt >= l.completedAt) continue
      byCode.set(code, { code, title: findQuestByCode(code)?.titleTh ?? l.quest?.title ?? code, completedAt: l.completedAt })
    }
    return [...byCode.values()]
  }, [questLogs])

  const answeredCount = Object.keys(answers).length

  const handleSubmit = () => {
    for (const q of todaysQuests) {
      const reaction = answers[q.code]
      if (reaction) submitQuestFeedback(q.code, q.completedAt, reaction)
    }
    finish({ feelings: answers, note: note.trim() })
  }

  return (
    <div className="qg">
      <div className="qg-card">
        <div className="qg-title">วันนี้รู้สึกยังไงกับสิ่งที่ทำไป?</div>
        <p className="qg-hint">ตอบตามจริง ไม่มีคำตอบถูกผิด ความรู้สึกหลังเรียนช่วยบอกว่าวิธีไหนเหมาะกับเรา</p>
      </div>

      {todaysQuests.length === 0 ? (
        <div className="qg-card">
          <p className="qg-hint">วันนี้ยังไม่มีเควสที่ทำสำเร็จ ลองทำเควสสักอันก่อน แล้วกลับมาส่องกระจกอีกครั้ง</p>
        </div>
      ) : (
        todaysQuests.map((q) => (
          <div className="qg-card" key={q.code}>
            <span className="qg-label">{q.title}</span>
            <div className="qg-chips">
              {REACTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`qg-chip${answers[q.code] === r.value ? ' is-active' : ''}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.code]: r.value }))}
                  aria-pressed={answers[q.code] === r.value}
                >
                  {r.emoji} {r.label}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="qg-card">
        <label className="qg-label" htmlFor="mot-note">อยากบอกอะไรกับตัวเองหลังเรียนวันนี้?</label>
        <textarea
          id="mot-note"
          className="qg-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="เช่น วันนี้จดจ่อได้ดีขึ้น แต่ยังลืมเรื่องสูตรอยู่บ้าง"
        />
      </div>

      <button className="qg-btn" disabled={answeredCount === 0 && !note.trim()} onClick={handleSubmit}>ส่องกระจกเสร็จแล้ว</button>
    </div>
  )
}
