import { useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import '../games.css'

const C_1 = '#FFD9A8'

const TEXT_1 = C_1

/*  เควส Active Focus (เพ่งสมาธิ / ตั้งเป้าหมาย)
    ทฤษฎี: Deliberate Practice (Ericsson et al., 1993)
    ─────────────────────────────────────────────────────────────
    หัวใจของทฤษฎีคือ "เป้าหมายต้องเฉพาะเจาะจงและท้าทายเกินระดับที่ทำได้อยู่แล้ว"
    เกมนี้จึงไม่ใช่แค่ช่องพิมพ์เปล่าๆ แต่บังคับ 3 อย่างตามงานวิจัย:
      1. ระบุทักษะที่จะฝึก (specific)
      2. ระบุว่าจะทำให้ "ดีขึ้นกว่าเดิม" อย่างไร (improvement goal)
      3. ประเมินระดับความท้าทาย — ถ้าต่ำกว่า 3 ถือว่าอยู่ใน comfort zone
         ระบบจะไม่ให้ผ่าน พร้อมอธิบายเหตุผล                                     */

const CHALLENGE_LABELS = ['สบายมาก', 'ค่อนข้างง่าย', 'กำลังดี', 'ท้าทาย', 'ท้าทายมาก']

export default function ActiveFocusGame({ finish }: QuestGameProps) {
  const { logActivity } = useAppContext()
  const [skill, setSkill] = useState('')
  const [improvement, setImprovement] = useState('')
  const [challenge, setChallenge] = useState(3)

  const tooEasy = challenge < 3
  const canSubmit = skill.trim().length >= 3 && improvement.trim().length >= 5 && !tooEasy

  const handleSubmit = () => {
    logActivity({ activityType: 'CHECKIN', durationSeconds: 0, meta: { skill, improvement, challenge } })
    finish({ skill, improvement, challengeLevel: challenge })
  }

  return (
    <div className="qg">
      <div className="qg-card">
        <label className="qg-label" htmlFor="af-skill">วันนี้จะฝึกอะไรให้เก่งขึ้น</label>
        <input
          id="af-skill" className="qg-input" value={skill} onChange={(e) => setSkill(e.target.value)}
          placeholder="เช่น เขียน SQL join หลายตาราง"
        />
        <p className="qg-hint" style={{ marginTop: 6 }}>ระบุให้แคบที่สุด — "อ่านหนังสือ" กว้างเกินกว่าที่สมองจะจับจุดพัฒนาได้</p>
      </div>

      <div className="qg-card">
        <label className="qg-label" htmlFor="af-improve">จะทำให้ดีขึ้นกว่าเดิมยังไง</label>
        <textarea
          id="af-improve" className="qg-textarea" value={improvement} onChange={(e) => setImprovement(e.target.value)}
          placeholder="เช่น เขียน query เอง 5 ข้อโดยไม่เปิดเฉลย แล้วตรวจทีละข้อ"
        />
      </div>

      <div className="qg-card">
        <span className="qg-label">งานนี้ท้าทายแค่ไหนสำหรับคุณตอนนี้</span>
        <div className="qg-chips">
          {CHALLENGE_LABELS.map((label, i) => (
            <button
              key={label}
              className={`qg-chip${challenge === i + 1 ? ' is-active' : ''}`}
              onClick={() => setChallenge(i + 1)}
            >
              {label}
            </button>
          ))}
        </div>
        {tooEasy && (
          <p className="qg-hint" style={{ marginTop: 10, color: TEXT_1 }}>
            งานที่ทำได้สบายอยู่แล้วไม่ทำให้เก่งขึ้น Deliberate Practice ต้องอยู่เหนือระดับที่ทำได้ในปัจจุบันเล็กน้อย —
            ลองเพิ่มความยากหรือลดเวลาที่ให้ตัวเองดู
          </p>
        )}
      </div>

      <button className="qg-btn" disabled={!canSubmit} onClick={handleSubmit}>
        ปักธงเป้าหมายวันนี้
      </button>
    </div>
  )
}