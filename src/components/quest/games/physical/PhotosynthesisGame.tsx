import { useState } from 'react'
import CameraCapture from '../../shared/CameraCapture'
import type { QuestGameProps } from '../../../../types.mental'
import './PhotosynthesisGame.css'

export default function PhotosynthesisGame({ finish, exit }: QuestGameProps) {
  // สเตทสำหรับสลับหน้าจอระหว่าง 'intro' (หน้าหลัก) และ 'camera' (หน้ากล้อง)
  const [step, setStep] = useState<'intro' | 'camera'>('intro')
  
  // สเตทเก็บรูปภาพ 1 รูป
  const [photo, setPhoto] = useState<string | null>(null)

  // เมื่อถ่ายรูปเสร็จ
  const handleSavePhoto = (imgSrc: string) => {
    setPhoto(imgSrc)
    setStep('intro') // กลับมาหน้าหลักของเควส
  }

  // เมื่อกดยืนยันบันทึก
  const handleSubmit = () => {
    if (photo) {
      // จบเควสและส่งผลลัพธ์รับรางวัล
      finish({
        status: 'COMPLETED',
        steps: 1 
      })
    }
  }

  // ==========================================
  // โหมดหน้าจอกล้องถ่ายรูป
  // ==========================================
  if (step === 'camera') {
    // onCancel ให้กลับไปหน้า 'intro'
    return <CameraCapture onSave={handleSavePhoto} onCancel={() => setStep('intro')} />
  }

  // ==========================================
  // โหมดหน้าหลักของเควสสังเคราะห์แสง
  // ==========================================
  return (
    <div className="photosynthesis-game">
      <h2 className="photosynthesis-title">สังเคราะห์แสง / รับแดดยามเช้า</h2>
      <p className="photosynthesis-desc">
        รับแสงแดดอ่อนๆ ในยามเช้า ถ่ายรูปวิวแสงแดด 1 รูป เพื่อสะสมพลังงานให้ต้นไม้ของคุณ
      </p>

      {/* กรอบสี่เหลี่ยมสำหรับถ่ายรูป (ขนาดใหญ่) */}
      <div className="photosynthesis-frame-box" onClick={() => setStep('camera')}>
        {photo ? (
          <img src={photo} alt="แสงแดดยามเช้า" className="photosynthesis-photo" />
        ) : (
          <div className="photosynthesis-frame-empty">
            <span className="photosynthesis-frame-icon">☀️</span>
            <span className="photosynthesis-frame-label">แตะเพื่อถ่ายรูปยามเช้า</span>
          </div>
        )}
      </div>

      {/* ปุ่มบันทึก จะโชว์ก็ต่อเมื่อถ่ายรูปแล้ว */}
      {photo ? (
        <button className="photosynthesis-submit-btn" onClick={handleSubmit}>
          บันทึก (รับรางวัล)
        </button>
      ) : (
        <button className="photosynthesis-cancel-btn" onClick={exit}>
          ปิด
        </button>
      )}
    </div>
  )
}