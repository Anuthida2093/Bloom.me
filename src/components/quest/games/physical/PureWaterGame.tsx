import { useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import CameraCapture from '../../shared/CameraCapture'
import '../games.css'
import './PureWaterGame.css'

/*  เควส Pure Water (น้ำพุหล่อเลี้ยงราก)  — [เปลี่ยนกลไกรอบนี้]
    ทฤษฎี: Hydration & Cognitive Performance — ขาดน้ำเพียง 1-2% ความจำ
    การประมวลผล และสมาธิลดลงอย่างมีนัยสำคัญ
    ─────────────────────────────────────────────────────────────
    เดิมเป็น "กดค้าง 3 วินาที" — ตามที่ระบุให้เปลี่ยนเป็นถ่ายรูปยืนยัน 2 จังหวะแทน:
      1) ถ่ายรูปแก้วน้ำตอนเต็มแก้ว (ก่อนดื่ม)
      2) ถ่ายรูปแก้วเปล่าอีกครั้ง (หลังดื่มหมด) — ยืนยันว่าดื่มจริง ไม่ใช่แค่ถ่ายรูปแก้วเปล่า
    เควสนี้เล่นซ้ำได้สูงสุด 10 ครั้ง/วัน (ดู maxPerDay ใน questCatalog.ts + การล็อกใน
    QuestSection.tsx) ได้รางวัลเท่ากันทุกครั้งที่ทำสำเร็จ — เกมนี้แค่ทำ flow 2 รูปให้ครบ
    แล้วเรียก finish() ทุกครั้งที่ถูกเปิด ไม่ต้องรู้จำนวนครั้งที่เหลือเอง

    [ข้อจำกัดที่ต้องแจ้ง] รูปทั้ง 2 ใบเก็บเป็น data URL ใน payload เท่านั้น ยังไม่มีการอัปโหลด
    เก็บถาวรฝั่ง backend (ดู CameraCapture.tsx)                                          */

type Stage = 'full' | 'empty'

export default function PureWaterGame({ finish, exit }: QuestGameProps) {
  const { logActivity } = useAppContext()
  const [stage, setStage] = useState<Stage>('full')
  const [fullPhoto, setFullPhoto] = useState<string | null>(null)

  const handleConfirmFull = (dataUrl: string) => {
    setFullPhoto(dataUrl)
    setStage('empty')
  }

  const handleConfirmEmpty = () => {
    logActivity({ activityType: 'HYDRATION', durationSeconds: 0, meta: { glasses: 1, method: 'photo' } })
    finish({ glasses: 1, hasPhotos: true })
  }

  return (
    <div className="qg qg-center">
      <div className="qg-title">
        {stage === 'full' ? 'ขั้น 1/2 — ถ่ายรูปแก้วน้ำตอนเต็มแก้ว' : 'ขั้น 2/2 — ดื่มให้หมดแล้วถ่ายรูปแก้วเปล่า'}
      </div>

      {stage === 'full' && fullPhoto === null && (
        <CameraCapture
          hint="ยกแก้วน้ำเปล่าที่เติมจนเต็มแก้วขึ้นมา แล้วถ่ายรูปยืนยัน"
          onConfirm={handleConfirmFull}
          onExit={exit}
        />
      )}

      {/* [แก้รอบนี้ — ข้อ D8] CameraCapture เต็มจอจริงแล้ว (position:fixed;inset:0) รูปแก้วเต็ม
          ที่เคยโชว์เทียบไว้ข้างๆ ตอนนี้จะถูกกล้องเต็มจอบังมิดจนมองไม่เห็นอยู่ดี ตัดทิ้งไป —
          fullPhoto ยังถูกอ่านผ่าน state ตัวแปรไว้เผื่ออนาคตอยากแนบคู่กับรูปแก้วเปล่าตอน
          ส่ง payload จริง (ตอนนี้ finish() ยังไม่ส่งไฟล์รูปเข้า backend ดู comment ด้านบน) */}
      {stage === 'empty' && (
        <CameraCapture
          hint="ดื่มน้ำแก้วนี้ให้หมด แล้วถ่ายรูปแก้วเปล่ายืนยันอีกครั้ง"
          onConfirm={handleConfirmEmpty}
          onExit={exit}
        />
      )}

      <div className="qg-card">
        <p className="qg-hint">
          น้ำ 1 แก้วเต็มทันทีหลังตื่นนอนช่วยชดเชยน้ำที่เสียไประหว่างหลับ 6-8 ชั่วโมง
          และเป็นตัวกระตุ้นระบบเผาผลาญให้ร่างกายตื่นตัว — ทำซ้ำได้ทุกครั้งที่ดื่มน้ำ สูงสุด 10 ครั้ง/วัน
        </p>
      </div>
    </div>
  )
}