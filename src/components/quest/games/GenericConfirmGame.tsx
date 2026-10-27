import { useState } from 'react'
import type { QuestGameProps } from '../../../types.mental'
import './games.css'

/*  GenericConfirmGame — หน้าจอสำรองสำหรับเควสที่ยังไม่มีไฟล์เกมของตัวเอง
    ไม่ใช่ปุ่ม "ทำสำเร็จ" ลอยๆ แต่บังคับให้ผู้ใช้ยืนยันว่าทำจริงก่อน (accountability)
    ถ้าเพิ่มเควสใหม่แล้วยังไม่ได้เขียนไฟล์เกม ระบบจะตกมาที่หน้านี้แทนการพัง          */

export default function GenericConfirmGame({ finish }: QuestGameProps) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="qg">
      <div className="qg-card">
        <label className="qg-row" style={{ cursor: 'pointer', alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--game-accent)' }}
          />
          <span className="qg-hint" style={{ color: 'var(--glass-w-85)', flex: 1 }}>
            ฉันได้ทำภารกิจนี้จริงตามขั้นตอนด้านบนแล้ว
          </span>
        </label>
      </div>
      <button className="qg-btn" disabled={!confirmed} onClick={() => finish({ confirmed: true })}>
        ยืนยันว่าทำสำเร็จ
      </button>
    </div>
  )
}