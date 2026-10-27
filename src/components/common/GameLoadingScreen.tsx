import { useEffect, useRef, useState } from 'react'
import './GameLoadingScreen.css'

/*============================================================================*\
  GameLoadingScreen — หน้าโหลดเต็มจอแบบเกม (พื้นเขียว + แถบความคืบหน้า + เปอร์เซ็นต์จริง)
  ────────────────────────────────────────────────────────────────────────────
  - ไม่โผล่เลยถ้าพร้อมภายใน SHOW_DELAY_MS (กันกะพริบ) · ถ้าโผล่แล้วอยู่อย่างน้อย MIN_VISIBLE_MS แล้วค่อยจางหาย
  - เปอร์เซ็นต์มาจาก progressTracker ของผู้เรียก (งานจริง ไม่ใช่ตัวจับเวลา · ไม่ถอยหลัง)
  - ใช้ซ้ำได้ (ตอนนี้ใช้กับเควสก้าวเพื่อสุขภาพ — วิดีโอเควสการเรียนรู้นำไปใช้ต่อได้)
\*============================================================================*/

export const SHOW_DELAY_MS = 200
export const MIN_VISIBLE_MS = 300
const FADE_MS = 260

interface Props {
  /** true = กำลังโหลด (ยังไม่พร้อมวาดฉาก) */
  loading: boolean
  /** 0..1 */
  progress: number
  hint?: string
}

export default function GameLoadingScreen({ loading, progress, hint }: Props) {
  const [phase, setPhase] = useState<'hidden' | 'shown' | 'fading'>('hidden')
  const shownAt = useRef(0)

  useEffect(() => {
    if (loading) {
      if (phase === 'shown') return
      // ยังไม่โผล่ → รอ SHOW_DELAY_MS ก่อน (พร้อมเร็ว = ไม่เห็นหน้าโหลดเลย) · กำลังจาง → กลับมาแสดงทันที
      const t = window.setTimeout(() => { shownAt.current = performance.now(); setPhase('shown') }, phase === 'fading' ? 0 : SHOW_DELAY_MS)
      return () => window.clearTimeout(t)
    }
    if (phase === 'hidden') return
    // พร้อมแล้ว: แสดงอยู่ → อยู่ให้ครบ MIN_VISIBLE_MS แล้วจาง · กำลังจาง → ถอดออกเมื่อจางเสร็จ
    const wait = phase === 'shown' ? Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt.current)) : FADE_MS
    const t = window.setTimeout(() => setPhase(phase === 'shown' ? 'fading' : 'hidden'), wait)
    return () => window.clearTimeout(t)
  }, [loading, phase])

  if (phase === 'hidden') return null
  const pct = Math.round((loading ? Math.min(1, progress) : 1) * 100)
  return (
    <div className={`game-loading${phase === 'fading' ? ' is-fading' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="กำลังโหลด">
      <div className="game-loading__box">
        <div className="game-loading__bar"><div className="game-loading__fill" style={{ width: `${pct}%` }} /></div>
        <div className="game-loading__pct">{pct}%</div>
        {hint && <div className="game-loading__hint">{hint}</div>}
      </div>
    </div>
  )
}
