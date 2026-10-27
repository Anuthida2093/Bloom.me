import { useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { BASE_DOMAINS, addCustomDomain, domainLabel, loadCustomDomains, removeCustomDomain } from '../../../../config/learningDomains'
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
    และวิชาใหม่ต้อง "คนละหมวด" กับวิชาเดิม ไม่ใช่แค่เปลี่ยนบทในวิชาเดียวกัน
    [เพิ่มตามที่ระบุ] เพิ่มชื่อวิชาเองได้ (config/learningDomains.ts — เก็บในเครื่องแยกตามบัญชี)       */

export default function CrossPollinationGame({ finish }: QuestGameProps) {
  const { logActivity, userData } = useAppContext()
  const [customDomains, setCustomDomains] = useState(() => loadCustomDomains(userData.id))
  const [newSubject, setNewSubject] = useState('')
  const domains = [...BASE_DOMAINS, ...customDomains]
  const addSubject = () => {
    const name = newSubject.trim()
    if (!name) return
    setCustomDomains(addCustomDomain(userData.id, name))
    setNewSubject('')
  }
  const removeSubject = (id: string) => {
    setCustomDomains(removeCustomDomain(userData.id, id))
    if (from === id) setFrom(null)
    if (to === id) setTo(null)
  }
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)
  const [hours, setHours] = useState(2)

  const sameDomain = from !== null && from === to
  const canSubmit = from !== null && to !== null && !sameDomain

  const handleSubmit = () => {
    logActivity({ activityType: 'REVIEW', durationSeconds: hours * 3600, meta: { from, to, hours, mode: 'interleaving' } })
    // เก็บชื่อที่แสดงไว้ด้วย (วิชาที่ตั้งเองอ่านย้อนหลังได้ในปฏิทินป่าแห่งสิบปี)
    finish({ fromDomain: from, toDomain: to, fromLabel: domainLabel(from), toLabel: domainLabel(to), continuousHours: hours })
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
            ยังไม่ถึง 2 ชั่วโมง สลับตอนนี้อาจตัดจังหวะที่กำลังลื่นไหลอยู่ ทำต่อไปก่อนได้ แล้วค่อยกลับมา
          </p>
        )}
      </div>

      <div className="qg-card">
        <span className="qg-label">ชั่วโมงที่ผ่านมาเรียนหมวดไหน</span>
        <div className="qg-chips">
          {domains.map((d) => (
            <button key={d.id} className={`qg-chip${from === d.id ? ' is-active' : ''}`} onClick={() => setFrom(d.id)}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="qg-card">
        <span className="qg-label">ชั่วโมงต่อไปจะสลับไปหมวดไหน</span>
        <div className="qg-chips">
          {domains.map((d) => (
            <button key={d.id} className={`qg-chip${to === d.id ? ' is-active' : ''}`} onClick={() => setTo(d.id)}>
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
        {sameDomain && (
          <p className="qg-hint" style={{ marginTop: 10, color: TEXT_2 }}>
            หมวดเดิมไม่นับเป็นการสลับ Interleaving ต้องข้ามศาสตร์ สมองถึงจะได้ฝึกแยกแยะคอนเซปต์
          </p>
        )}
      </div>

      <div className="qg-card">
        <span className="qg-label">เพิ่มชื่อวิชาเอง</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="qg-input"
            value={newSubject}
            maxLength={40}
            placeholder="เช่น ฟิสิกส์ ม.5, เปียโน, การตลาด"
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addSubject() }}
            aria-label="ชื่อวิชาที่ต้องการเพิ่ม"
          />
          <button type="button" className="qg-chip is-active" style={{ flexShrink: 0 }} onClick={addSubject} disabled={!newSubject.trim()}>+ เพิ่ม</button>
        </div>
        {customDomains.length > 0 && (
          <div className="qg-chips" style={{ marginTop: 10 }}>
            {customDomains.map((d) => (
              <button key={d.id} type="button" className="qg-chip" onClick={() => removeSubject(d.id)} aria-label={`ลบวิชา ${d.label}`}>
                {d.emoji} {d.label} ✕
              </button>
            ))}
          </div>
        )}
        <p className="qg-hint" style={{ marginTop: 8 }}>วิชาที่เพิ่มจะขึ้นในตัวเลือกด้านบนทั้งสองช่อง กดที่ชื่อด้านบนนี้เพื่อลบ</p>
      </div>

      <button className="qg-btn" disabled={!canSubmit} onClick={handleSubmit}>ผสมเกสรข้ามศาสตร์</button>
    </div>
  )
}