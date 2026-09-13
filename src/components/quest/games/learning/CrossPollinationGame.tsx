import { useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import '../games.css'

const C_1 = '#FFD9A8'
const C_2 = '#FFD9A8'

const TEXT_1 = C_1
const TEXT_2 = C_2

/*  เควส Cross-Pollination (ผสมเกสรข้ามศาสตร์)
    ทฤษฎี: Interleaved Practice (Rohrer, 2012)
    ─────────────────────────────────────────────────────────────
    การสลับหัวข้อช่วยให้สมองฝึก "แยกแยะคอนเซปต์" ได้ดีกว่าอัดเรื่องเดียวรวดเดียว
    เงื่อนไขตามเอกสาร: ต้องเรียนต่อเนื่องเกิน 2 ชั่วโมงก่อน ระบบถึงจะแนะนำให้สลับ
    และวิชาใหม่ต้อง "คนละหมวด" กับวิชาเดิม ไม่ใช่แค่เปลี่ยนบทในวิชาเดียวกัน       */

const DOMAINS = [
  { id: 'language', label: 'ภาษา', emoji: '🗣️' },
  { id: 'logic', label: 'คณิต / ตรรกะ', emoji: '🔢' },
  { id: 'science', label: 'วิทยาศาสตร์', emoji: '🔬' },
  { id: 'social', label: 'สังคม / ประวัติศาสตร์', emoji: '🏛️' },
  { id: 'skill', label: 'ทักษะปฏิบัติ / ศิลปะ', emoji: '🎨' },
]

export default function CrossPollinationGame({ finish }: QuestGameProps) {
  const { logActivity } = useAppContext()
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [hours, setHours] = useState(2)

  const sameDomain = from !== null && from === to
  const canSubmit = from !== null && to !== null && !sameDomain

  const handleSubmit = () => {
    logActivity({ activityType: 'REVIEW', durationSeconds: hours * 3600, meta: { from, to, hours, mode: 'interleaving' } })
    finish({ fromDomain: from, toDomain: to, continuousHours: hours })
  }

  return (
    <div className="qg">
      <div className="qg-card">
        <span className="qg-label">เรียนหัวข้อเดิมมาต่อเนื่องกี่ชั่วโมงแล้ว</span>
        <div className="qg-chips">
          {[1, 2, 3, 4].map((h) => (
            <button key={h} className={`qg-chip${hours === h ? ' is-active' : ''}`} onClick={() => setHours(h)}>
              {h} ชม.
            </button>
          ))}
        </div>
        {hours < 2 && (
          <p className="qg-hint" style={{ marginTop: 10, color: TEXT_1 }}>
            ยังไม่ถึง 2 ชั่วโมง สลับตอนนี้อาจตัดจังหวะที่กำลังลื่นไหลอยู่ — ทำต่อไปก่อนได้ แล้วค่อยกลับมา
          </p>
        )}
      </div>

      <div className="qg-card">
        <span className="qg-label">ชั่วโมงที่ผ่านมาเรียนหมวดไหน</span>
        <div className="qg-chips">
          {DOMAINS.map((d) => (
            <button key={d.id} className={`qg-chip${from === d.id ? ' is-active' : ''}`} onClick={() => setFrom(d.id)}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="qg-card">
        <span className="qg-label">ชั่วโมงต่อไปจะสลับไปหมวดไหน</span>
        <div className="qg-chips">
          {DOMAINS.map((d) => (
            <button key={d.id} className={`qg-chip${to === d.id ? ' is-active' : ''}`} onClick={() => setTo(d.id)}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
        {sameDomain && (
          <p className="qg-hint" style={{ marginTop: 10, color: TEXT_2 }}>
            หมวดเดิมไม่นับเป็นการสลับ — Interleaving ต้องข้ามศาสตร์ สมองถึงจะได้ฝึกแยกแยะคอนเซปต์
          </p>
        )}
      </div>

      <button className="qg-btn" disabled={!canSubmit} onClick={handleSubmit}>ผสมเกสรข้ามศาสตร์</button>
    </div>
  )
}