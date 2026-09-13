import { useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import '../games.css'

/*  ความสำเร็จ Soil Restoration (ฟื้นฟูหน้าดิน / ตัดจอก่อนนอน)
    ทฤษฎี: Blue Light & Melatonin Suppression
    ─────────────────────────────────────────────────────────────
    แสงสีฟ้าจากจอยับยั้งการหลั่งเมลาโทนิน ทำให้ร่างกายไม่พร้อมพักผ่อน
    เกมนี้ให้ตั้ง "เวลานอนจริง" แล้วคำนวณเวลาเริ่มตัดจอ (ก่อนนอน 1-2 ชม.) ให้อัตโนมัติ
    ค่าที่ได้ถูกส่งเข้า setScreenCurfew() ซึ่ง QuestSection จะใช้ล็อกเควสเรียนช่วงดึก
    (ต้องเพิ่มคอลัมน์ users.bedtime + users.curfewHours — ดู docs/DB_CHANGES.md ข้อ 1) */

function shiftTime(hhmm: string, minusHours: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (h * 60 + m - minusHours * 60 + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function SoilRestorationGame({ finish }: QuestGameProps) {
  const { logActivity, setScreenCurfew } = useAppContext()
  const [bedtime, setBedtime] = useState('23:00')
  const [curfewHours, setCurfewHours] = useState(1)
  const curfewStart = shiftTime(bedtime, curfewHours)

  const handleSubmit = () => {
    setScreenCurfew({ bedtime, curfewHours })
    logActivity({ activityType: 'SCREEN_CURFEW', durationSeconds: curfewHours * 3600, meta: { bedtime, curfewStart } })
    finish({ bedtime, curfewHours, curfewStart })
  }

  return (
    <div className="qg">
      <div className="qg-card">
        <label className="qg-label" htmlFor="sr-bedtime">คืนนี้ตั้งใจจะเข้านอนกี่โมง</label>
        <input id="sr-bedtime" className="qg-input" type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
      </div>

      <div className="qg-card">
        <span className="qg-label">จะตัดจอก่อนนอนกี่ชั่วโมง</span>
        <div className="qg-chips">
          {[1, 2].map((h) => (
            <button key={h} className={`qg-chip${curfewHours === h ? ' is-active' : ''}`} onClick={() => setCurfewHours(h)}>
              {h} ชั่วโมง
            </button>
          ))}
        </div>
      </div>

      <div className="qg-card qg-center">
        <div className="qg-title">โหมดตัดจอเริ่ม {curfewStart} น.</div>
        <p className="qg-hint">
          ตั้งแต่เวลานี้เป็นต้นไป ระบบจะล็อกเควสเรียนที่ใช้พลังงานสูงและเตือนให้วางจอ
          เพื่อให้เมลาโทนินหลั่งได้ตามปกติ รากแก้วจะได้ฟื้นตัวตลอดคืน
        </p>
      </div>

      <button className="qg-btn" onClick={handleSubmit}>ตั้งเวลาตัดจอ</button>
    </div>
  )
}