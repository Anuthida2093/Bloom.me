import { useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import '../games.css'

/*  ความสำเร็จ Strategic Delay (กลยุทธ์รอคอย)
    ทฤษฎี: Spacing Effect (Cepeda et al., 2008)
    ─────────────────────────────────────────────────────────────
    วางแผนทบทวน "รายเดือน" ไม่ใช่รายสัปดาห์ — เกมนี้ให้ผู้ใช้ตั้งเป้าหมายระยะยาว
    แล้วระบบคำนวณตารางทบทวน 3 รอบให้อัตโนมัติตามสัดส่วน 5-10% ของช่วงเวลา       */

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function StrategicDelayGame({ finish }: QuestGameProps) {
  const { logActivity } = useAppContext()
  const [topic, setTopic] = useState('')
  const [horizonMonths, setHorizonMonths] = useState(6)

  const gapDays = Math.round((horizonMonths * 30) * 0.08) // ~8% ของช่วงเวลาทั้งหมด
  const schedule = [gapDays, gapDays * 2, gapDays * 3]
  const canSubmit = topic.trim().length >= 2

  const handleSubmit = () => {
    logActivity({ activityType: 'REVIEW', durationSeconds: 0, meta: { topic, horizonMonths, gapDays, mode: 'strategic-delay' } })
    finish({ topic, horizonMonths, gapDays, schedule })
  }

  return (
    <div className="qg">
      <div className="qg-card">
        <label className="qg-label" htmlFor="sd-topic">เรื่องที่อยากจำให้ได้ยาวๆ</label>
        <input id="sd-topic" className="qg-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="เช่น คำศัพท์ TOEIC ชุดที่ 1" />
      </div>

      <div className="qg-card">
        <span className="qg-label">อยากให้จำได้นานแค่ไหน</span>
        <div className="qg-chips">
          {[3, 6, 12].map((m) => (
            <button key={m} className={`qg-chip${horizonMonths === m ? ' is-active' : ''}`} onClick={() => setHorizonMonths(m)}>
              {m} เดือน
            </button>
          ))}
        </div>
      </div>

      <div className="qg-card">
        <div className="qg-title">ตารางทบทวนที่ระบบวางให้</div>
        <p className="qg-hint" style={{ marginBottom: 10 }}>
          เว้นระยะห่างรอบละ {gapDays} วัน (ราว 8% ของ {horizonMonths} เดือน) — ห่างกว่านี้จะลืม ถี่กว่านี้จะเสียเวลาเปล่า
        </p>
        <div className="qg-stat-grid">
          {schedule.map((d, i) => (
            <div className="qg-stat" key={d}>
              <strong>{addDays(d)}</strong>
              <span>รอบที่ {i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="qg-btn" disabled={!canSubmit} onClick={handleSubmit}>ตั้งตารางรอคอยนี้</button>
    </div>
  )
}