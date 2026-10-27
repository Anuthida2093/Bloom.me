import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { pauseLoopingSfx, resumeLoopingSfx, stopAllSfx } from '../../utils/audioPlayer'

/*============================================================================*\
  RouteEffects — งานที่ต้องทำทุกครั้งที่เปลี่ยนหน้า (ไม่แสดงผลอะไร)
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ — 2.1] เปลี่ยน route แล้วเลื่อนกลับบนสุดเสมอ — เดิมไม่มีที่ไหนรีเซ็ตเลย หน้า Register
    ยาว ผู้ใช้เลื่อนลงไปกดสมัครที่ท้ายหน้า → navigate('/mbti') แล้วหน้าเลือก MBTI เปิดที่ตำแหน่งเลื่อน
    เดิม (เห็นการ์ดก่อนหัวข้อ "คุณเป็นคนแบบไหน?" และลิงก์ทำแบบทดสอบอยู่เหนือจอ)
  [แก้ตามที่ระบุ — 1.4] เปลี่ยน route → หยุดเสียงสั้นที่ค้างทุกตัว · ซ่อนแท็บ → หยุดเสียงสั้น + พักเสียงวน
    (กลับมาแล้วเล่นเสียงวนต่อ) ไม่ให้เสียงพิมพ์/เอฟเฟกต์ไหลข้ามไปหน้าถัดไป
\*============================================================================*/
export default function RouteEffects() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    stopAllSfx()
  }, [pathname])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopAllSfx()
        pauseLoopingSfx()
      } else {
        resumeLoopingSfx()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return null
}
