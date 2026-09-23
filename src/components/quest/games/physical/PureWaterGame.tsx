import { useState } from 'react'
import CameraCapture from '../../shared/CameraCapture'
import type { QuestGameProps } from '../../../../types.mental'
import './PureWaterGame.css'

export default function PureWaterGame({ finish, exit }: QuestGameProps) {
  // สเตทสำหรับจัดการหน้าจอ: 'intro' (หน้าหลัก) | 'camera-before' (กล้องถ่ายก่อนดื่ม) | 'camera-after' (กล้องถ่ายหลังดื่ม)
  const [step, setStep] = useState<'intro' | 'camera-before' | 'camera-after'>('intro')
  
  // สเตทเก็บรูปภาพ
  const [photoBefore, setPhotoBefore] = useState<string | null>(null)
  const [photoAfter, setPhotoAfter] = useState<string | null>(null)
  
  // สมมติรอบที่ทำไปแล้ว (หากระบบจริงมีดึงจาก Backend ให้ใช้ค่าจาก Context แทนได้เลยครับ)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [roundsCompleted, setRoundsCompleted] = useState(0) 
  const maxRounds = 10

  // เมื่อถ่ายรูป "ก่อนดื่ม" เสร็จ
  const handleSaveBefore = (imgSrc: string) => {
    setPhotoBefore(imgSrc)
    setStep('intro') // กลับมาหน้าหลักของเควส
  }

  // เมื่อถ่ายรูป "หลังดื่ม" เสร็จ
  const handleSaveAfter = (imgSrc: string) => {
    setPhotoAfter(imgSrc)
    setStep('intro') // กลับมาหน้าหลักของเควส
  }

  // เมื่อกดยืนยันบันทึก
  const handleSubmit = () => {
    if (photoBefore && photoAfter) {
      // เรียกฟังก์ชัน finish เพื่อจบรอบและรับรางวัล
      finish({
        status: 'COMPLETED',
        steps: 1 
      })
      // หากต้องการให้ผู้เล่นทำรอบต่อไปได้โดยไม่ต้องปิดป๊อปอัป ให้เปิดคอมเมนต์ด้านล่างครับ:
      // setRoundsCompleted(prev => prev + 1)
      // setPhotoBefore(null)
      // setPhotoAfter(null)
    }
  }

  // ==========================================
  // โหมดหน้าจอกล้องถ่ายรูป (ซ้อนทับด้วย Portal จาก CameraCapture)
  // ==========================================
  if (step === 'camera-before') {
    // onCancel คือหัวใจสำคัญ: เมื่อกดปุ่มกลับซ้ายบน ให้กลับไปหน้า 'intro'
    return <CameraCapture onSave={handleSaveBefore} onCancel={() => setStep('intro')} />
  }

  if (step === 'camera-after') {
    return <CameraCapture onSave={handleSaveAfter} onCancel={() => setStep('intro')} />
  }

  // ==========================================
  // โหมดหน้าหลักของเควสน้ำพุหล่อเลี้ยงราก
  // ==========================================
  const progressPct = (roundsCompleted / maxRounds) * 100
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPct / 100) * circumference

  return (
    <div className="pure-water-game">
      <h2 className="pure-water-title">น้ำพุหล่อเลี้ยงราก</h2>
      <p className="pure-water-desc">
        ถ่ายรูปแก้วน้ำเต็ม แล้วถ่ายอีกครั้งตอนดื่มหมดแก้ว เพื่อยืนยันว่าดื่มน้ำจริง
      </p>

      {/* วงกลมแสดงเปอร์เซ็นต์ */}
      <div className="pure-water-progress-container">
        <svg className="pure-water-progress-ring" viewBox="0 0 100 100">
          <circle className="pure-water-ring-bg" cx="50" cy="50" r={radius} />
          <circle
            className="pure-water-ring-fill"
            cx="50"
            cy="50"
            r={radius}
            style={{ 
              strokeDasharray: circumference, 
              strokeDashoffset: strokeDashoffset 
            }}
          />
        </svg>
        <div className="pure-water-progress-text">
          <span className="pure-water-progress-current">{roundsCompleted}</span>
          <span className="pure-water-progress-max">/{maxRounds}</span>
        </div>
      </div>

      {/* กรอบสี่เหลี่ยม 2 กรอบสำหรับถ่ายรูป */}
      <div className="pure-water-frames-row">
        {/* กรอบที่ 1: ก่อนดื่ม */}
        <div className="pure-water-frame-box" onClick={() => setStep('camera-before')}>
          {photoBefore ? (
            <img src={photoBefore} alt="ก่อนดื่ม" className="pure-water-photo" />
          ) : (
            <div className="pure-water-frame-empty">
              <span className="pure-water-frame-icon">💧</span>
              <span className="pure-water-frame-label">ยังไม่ดื่ม (เต็มแก้ว)</span>
            </div>
          )}
        </div>

        {/* กรอบที่ 2: หลังดื่ม */}
        <div className="pure-water-frame-box" onClick={() => setStep('camera-after')}>
          {photoAfter ? (
            <img src={photoAfter} alt="หลังดื่ม" className="pure-water-photo" />
          ) : (
            <div className="pure-water-frame-empty">
              <span className="pure-water-frame-icon">🫙</span>
              <span className="pure-water-frame-label">ดื่มแล้ว (หมดแก้ว)</span>
            </div>
          )}
        </div>
      </div>

      {/* ปุ่มบันทึก จะโชว์ก็ต่อเมื่อถ่ายครบทั้ง 2 รูปแล้ว */}
      {photoBefore && photoAfter ? (
        <button className="pure-water-submit-btn" onClick={handleSubmit}>
          บันทึก (รับรางวัล)
        </button>
      ) : (
        <button className="pure-water-cancel-btn" onClick={exit}>
          ปิด
        </button>
      )}
    </div>
  )
}