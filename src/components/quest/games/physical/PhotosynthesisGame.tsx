import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import CameraCapture from '../../shared/CameraCapture'
import '../games.css'

/*  เควส Photosynthesis (สังเคราะห์แสง / รับแดดยามเช้า)
    ทฤษฎี: Circadian Rhythm & Serotonin Hypothesis
    ─────────────────────────────────────────────────────────────
    [แก้รอบนี้ — ข้อ D7] เปลี่ยนจาก "จับเวลา 10-15 นาที" → "ถ่ายรูปยืนยัน" ครั้งเดียว
    (ตามที่ระบุ) แบบเดียวกับ phys-pure-water — ถ่ายรูปตัวเอง/บรรยากาศตอนอยู่กลางแดดจริง
    เกมนี้ยังตรวจ "ช่วงเวลาจริง" อยู่เหมือนเดิม (05:00-10:00 = ช่วงทอง) แต่เป็นแค่ข้อความ
    แจ้งเตือน ไม่ใช่เงื่อนไขบล็อกการถ่ายรูป (ถ่ายได้ทุกช่วงเวลา)                        */

export default function PhotosynthesisGame({ finish, exit }: QuestGameProps) {
  const { logActivity } = useAppContext()
  const hour = new Date().getHours()
  const isMorning = hour >= 5 && hour < 10

  const handleConfirm = (dataUrl: string) => {
    logActivity({ activityType: 'SUNLIGHT', durationSeconds: 0, meta: { startHour: hour, isMorning, method: 'photo' } })
    finish({ isMorning, hasPhoto: true, photo: dataUrl })
  }

  return (
    <CameraCapture
      hint={
        isMorning
          ? `ตอนนี้ ${hour}:00 น. — ช่วงเวลาทองของแสงเช้าพอดี ถ่ายรูปตอนอยู่กลางแดดเพื่อยืนยัน`
          : `ตอนนี้ ${hour}:00 น. — เลยช่วงเช้าแล้ว แสงยังดีต่อร่างกาย ถ่ายรูปตอนอยู่กลางแดดเพื่อยืนยันได้เลย`
      }
      onConfirm={handleConfirm}
      onExit={exit}
    />
  )
}
