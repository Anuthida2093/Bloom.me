import { useEffect, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { playSfx } from '../../../../utils/audioPlayer'
import '../games.css'
import './GreenVisionGame.css'

/*  เควส Green Vision (พักสายตา / ถนอมใบไม้)
    ทฤษฎี: กฎ 20-20-20 (American Optometric Association)
    ─────────────────────────────────────────────────────────────
    จ้องจอนานทำให้เกิด Digital Eye Strain — ทุก 20 นาที ให้มองไกล 20 ฟุต 20 วินาที
    เกมนี้ทำสิ่งที่หน้าจอควรทำจริงๆ คือ "หรี่ตัวเองลง" ระหว่างนับถอยหลัง เพื่อไม่ให้
    ผู้ใช้จ้องจอต่อระหว่างพักสายตา แล้วสั่นกริ๊งเตือนเมื่อครบ 20 วินาที               */

const HOLD_SECONDS = 20

export default function GreenVisionGame({ finish, strictMode, skip }: QuestGameProps) {
  const { logActivity, settings } = useAppContext()
  const [seconds, setSeconds] = useState(HOLD_SECONDS)
  const [started, setStarted] = useState(false)
  const done = started && seconds === 0

  useEffect(() => {
    if (!started || seconds === 0) return
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [started, seconds])

  useEffect(() => {
    if (done) playSfx('SPARKLE_CHIME', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
  }, [done, settings.sfxVolume, settings.soundEnabled])

  const handleFinish = () => {
    logActivity({ activityType: 'GREEN_VISION', durationSeconds: HOLD_SECONDS, meta: { rule: '20-20-20' } })
    finish({ seconds: HOLD_SECONDS })
  }

  /** [เพิ่มรอบนี้ — โหมดเคร่งครัด] ข้ามตัวจับเวลากลางคัน จบทันทีด้วยรางวัลครึ่งเดียว */
  const handleSkip = () => {
    const elapsed = HOLD_SECONDS - seconds
    logActivity({ activityType: 'GREEN_VISION', durationSeconds: elapsed, meta: { rule: '20-20-20', skipped: true } })
    skip({ seconds: elapsed })
  }

  return (
    <div className={`qg qg-center green-vision${started && !done ? ' green-vision--resting' : ''}`}>
      <div className="green-vision__veil" aria-hidden="true" />

      <div className="green-vision__content">
        {!started && (
          <>
            <div style={{ fontSize: 48 }}>👀</div>
            <div className="qg-title">มองหาอะไรที่อยู่ไกลราว 6 เมตร</div>
            <p className="qg-hint">นอกหน้าต่าง ปลายทางเดิน หรือต้นไม้ไกลๆ ก็ได้ — พอกดเริ่ม จอจะหรี่ลงเองเพื่อไม่ให้คุณเผลอจ้องต่อ</p>
            <button className="qg-btn" onClick={() => setStarted(true)}>เริ่มพักสายตา 20 วินาที</button>
          </>
        )}

        {started && !done && (
          <>
            <div className="green-vision__count">{seconds}</div>
            <p className="green-vision__whisper">ละสายตาจากจอ หายใจเข้าออกช้าๆ กะพริบตาบ่อยๆ</p>
            {!strictMode && (
              <button className="qg-btn qg-btn--ghost" onClick={handleSkip}>ข้ามตัวจับเวลา (ได้รางวัลครึ่งเดียว)</button>
            )}
          </>
        )}

        {done && (
          <>
            <div style={{ fontSize: 48 }}>🍃</div>
            <div className="qg-title">ดวงตาได้พักแล้ว</div>
            <p className="qg-hint">กล้ามเนื้อตาคลายจากการเพ่งระยะใกล้ พร้อมสำหรับรอบจดจ่อถัดไป</p>
            <button className="qg-btn" onClick={handleFinish}>กลับมาแล้ว</button>
          </>
        )}
      </div>
    </div>
  )
}