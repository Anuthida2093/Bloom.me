import { useState } from 'react'

/*============================================================================*\
  HudDelta — ตัวเลข "+N" ลอยขึ้นบนแคปซูล HUD เมื่อค่าเพิ่ม (เหรียญจากเควส/กล่องสำรวจ/ของที่เพื่อนมอบให้,
  เลเวลอัป) ให้ผู้เล่นเห็นทันทีว่าได้อะไรจากไหน ไม่ต้องจำตัวเลขเดิมเอง
  ready=false (กำลังโหลดข้อมูลผู้ใช้) → อัปเดตฐานเงียบๆ ไม่ลอย (กันเด้ง "+1,250" ตอนเปิดแอป)
\*============================================================================*/

interface HudDeltaProps {
  value: number
  ready: boolean
  /** ข้อความที่แสดง เช่น n => `+${n}` */
  format?: (n: number) => string
}

export default function HudDelta({ value, ready, format = (n) => `+${n.toLocaleString()}` }: HudDeltaProps) {
  const [prev, setPrev] = useState(value)
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null)

  // ปรับ state ระหว่าง render ตามค่าที่เปลี่ยน (แพทเทิร์นที่ React แนะนำแทน useEffect + setState)
  if (value !== prev) {
    setPrev(value)
    if (ready && value > prev) setDelta({ n: value - prev, key: value })
  }

  if (!delta) return null
  return (
    <span key={delta.key} className="hud-delta" aria-hidden="true" onAnimationEnd={() => setDelta(null)}>
      {format(delta.n)}
    </span>
  )
}
