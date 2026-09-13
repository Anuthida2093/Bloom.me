import { useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { playSfx } from '../../../../utils/audioPlayer'
import '../games.css'
import './DailyCheckinGame.css'

/*  เควส Daily Learning Check-in (เช็กอินรายวัน)
    ทฤษฎี: Deliberate Practice · Deep Work · Testing Effect · Ultradian Rhythms · Growth Mindset
    ─────────────────────────────────────────────────────────────
    5 คำถามตรงตามเอกสาร "5 คำถามสำหรับ Daily Learning Check-in" ทุกข้อ
    การแสดงผลตามเอกสาร: "บัวรดน้ำ" ที่ระดับน้ำค่อยๆ เต็มขึ้นทุกครั้งที่ให้ดาว
    ครบ 5 ข้อแล้วบัวจะเทน้ำลงลำต้นพร้อมเอฟเฟกต์แสงวิบวับ

    เชื่อมกับระบบอื่นจริง 2 จุด:
      • บันทึกคะแนนลง learning_checkins (ดู docs/DB_CHANGES.md ข้อ 6) เพื่อทำสถิติย้อนหลัง
      • ถ้าข้อ "การจดจ่อ" หรือ "การพักผ่อนสมอง" ได้ ≤ 2 ดาว จะโชว์คำแนะนำให้ไปทำเควส
        ทอดสมอใจ (ฝึกหายใจ) ต่อ — [แก้รอบหลัง] เดิมแนะนำ Mindful Breeze แต่เควสนั้น
        ถูกลบออกจากระบบแล้ว (ซ้ำกับทอดสมอใจ) จึงเปลี่ยนมาแนะนำทอดสมอใจแทน            */

const QUESTIONS = [
  { key: 'goalClarity', text: 'วันนี้คุณเริ่มต้นการเรียน/ทำงานด้วยเป้าหมายที่ชัดเจนมากแค่ไหน?' },
  { key: 'deepFocus', text: 'คุณจดจ่อกับสิ่งที่ทำโดยไม่ถูกรบกวน (ไม่ไถมือถือ ไม่วอกแวก) ได้ดีเพียงใด?' },
  { key: 'activeRecall', text: 'วันนี้คุณพยายามนึก ทบทวน หรือสรุปสิ่งที่เรียนรู้ด้วยตัวเอง (ไม่เปิดดูเนื้อหา) มากแค่ไหน?' },
  { key: 'qualityRest', text: 'คุณได้หยุดพักผ่อนสมองอย่างแท้จริง (พักสายตา ยืดเหยียด) ระหว่างช่วงเรียนหรือไม่?' },
  { key: 'satisfaction', text: 'โดยรวมแล้ววันนี้คุณพึงพอใจกับความพยายามที่ใส่ลงไปมากแค่ไหน?' },
] as const

export default function DailyCheckinGame({ finish }: QuestGameProps) {
  const { saveLearningCheckin, settings } = useAppContext()
  const [scores, setScores] = useState<Record<string, number>>({})
  const [bonusNote, setBonusNote] = useState('')
  const [pouring, setPouring] = useState(false)

  const answered = QUESTIONS.filter((q) => scores[q.key] > 0).length
  const fillPct = (answered / QUESTIONS.length) * 100
  const allAnswered = answered === QUESTIONS.length

  const setScore = (key: string, value: number) => {
    setScores((s) => ({ ...s, [key]: value }))
    playSfx('WATER_DROP', { volume: settings.sfxVolume * 0.5, enabled: settings.soundEnabled })
  }

  const handleSubmit = () => {
    setPouring(true)
    playSfx('TREE_GROW', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
    const record = {
      goalClarity: scores.goalClarity,
      deepFocus: scores.deepFocus,
      activeRecall: scores.activeRecall,
      qualityRest: scores.qualityRest,
      satisfaction: scores.satisfaction,
      bonusNote: bonusNote.trim() || null,
    }
    saveLearningCheckin(record)
    // รอให้บัวรดน้ำเทน้ำจบก่อนค่อยไปหน้ารางวัล
    window.setTimeout(() => finish({ ...record, needsBreeze: record.deepFocus <= 2 || record.qualityRest <= 2 }), 1500)
  }

  const needsBreeze = allAnswered && (scores.deepFocus <= 2 || scores.qualityRest <= 2)

  return (
    <div className="qg">
      {/* บัวรดน้ำ — ระดับน้ำเพิ่มตามจำนวนข้อที่ตอบ */}
      <div className={`checkin-can${pouring ? ' checkin-can--pouring' : ''}`}>
        <div className="checkin-can__body">
          <div className="checkin-can__water" style={{ height: `${fillPct}%` }} />
          <span className="checkin-can__emoji">🪣</span>
        </div>
        <div className="checkin-can__meta">{answered}/5 ข้อ</div>
        {pouring && (
          <div className="checkin-can__stream" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.08}s`, left: `${44 + (i % 3) * 5}%` }}>💧</span>
            ))}
          </div>
        )}
      </div>

      {QUESTIONS.map((q, i) => (
        <div className="qg-card" key={q.key}>
          <span className="qg-label">{i + 1}. {q.text}</span>
          <div className="qg-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={star <= (scores[q.key] ?? 0) ? 'is-on' : ''}
                onClick={() => setScore(q.key, star)}
                aria-label={`${q.text} ให้ ${star} ดาว`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="qg-card">
        <label className="qg-label" htmlFor="dc-bonus">คำถามโบนัส (ไม่บังคับ) — พรุ่งนี้อยากปรับอะไรให้ดีขึ้น</label>
        <input
          id="dc-bonus" className="qg-input" value={bonusNote} onChange={(e) => setBonusNote(e.target.value)}
          placeholder="เช่น เริ่มเรียนเร็วขึ้น 30 นาที"
        />
        <p className="qg-hint" style={{ marginTop: 6 }}>ข้อความนี้จะถูกแปะเป็นโพสต์อิทบนมุมหน้าจอให้อ่านย้อนในวันพรุ่งนี้</p>
      </div>

      {needsBreeze && (
        <span className="qg-tag qg-tag--warn">
          สมาธิและการพักผ่อนวันนี้ค่อนข้างต่ำ — ลองไปทำเควส "ทอดสมอใจ" (ฝึกหายใจ) ต่อดูนะ
        </span>
      )}

      <button className="qg-btn" disabled={!allAnswered || pouring} onClick={handleSubmit}>
        {pouring ? 'กำลังรดน้ำลำต้น...' : 'เทบัวรดน้ำลงลำต้น'}
      </button>
    </div>
  )
}