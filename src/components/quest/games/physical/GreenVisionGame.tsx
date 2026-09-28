import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { playSfx } from '../../../../utils/audioPlayer'
import '../games.css'
import '../../../leaderboard/leaderboardRow.css'
import './GreenVisionGame.css'

/*  เควส Green Vision (พักสายตา / ถนอมใบไม้)
    ทฤษฎี: กฎ 20-20-20 (American Optometric Association)
    ─────────────────────────────────────────────────────────────
    จ้องจอนานทำให้เกิด Digital Eye Strain — ทุก 20 นาที ให้มองไกล 20 ฟุต 20 วินาที
    เกมนี้ทำสิ่งที่หน้าจอควรทำจริงๆ คือ "หรี่ตัวเองลง" ระหว่างนับถอยหลัง เพื่อไม่ให้
    ผู้ใช้จ้องจอต่อระหว่างพักสายตา แล้วสั่นกริ๊งเตือนเมื่อครบ 20 วินาที               */

const HOLD_SECONDS = 20

/** [แก้ตามที่ระบุ] โหมดพักสายตา: 'screen-off' = จอดำเต็มจอ (เว็บปิดจอจริงไม่ได้ จึงทำจอดำสนิทแทน) · 'normal' = จอหรี่แบบเดิม */
type RestMode = 'screen-off' | 'normal'

export default function GreenVisionGame({ finish, strictMode, skip }: QuestGameProps) {
  const { logActivity, settings } = useAppContext()
  const [seconds, setSeconds] = useState(HOLD_SECONDS)
  const [started, setStarted] = useState(false)
  const done = started && seconds === 0
  const [chooseMode, setChooseMode] = useState(false)
  const [mode, setMode] = useState<RestMode>('normal')
  const [notifyWhenDone, setNotifyWhenDone] = useState(true)
  const [blackout, setBlackout] = useState(false)
  const notifyRef = useRef(true)

  useEffect(() => {
    if (!started || seconds === 0) return
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [started, seconds])

  useEffect(() => {
    if (!done) return
    if (mode === 'screen-off') {
      // [แก้ตามที่ระบุ] ปิดจอแล้วครบเวลา: เปิดแจ้งเตือนไว้ → เสียง + สั่น + แจ้งเตือนของระบบ แล้วกลับมาหน้าจอปกติ
      //                 ปิดแจ้งเตือน → เงียบ จอดำค้างไว้จนกว่าจะแตะเอง
      if (!notifyRef.current) return
      playSfx('REWARD_CLAIM', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
      navigator.vibrate?.([200, 120, 200])
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('พักสายตาครบ 20 วินาทีแล้ว 🍃', { body: 'กลับมาที่หน้าจอได้เลย ดวงตาได้พักแล้ว' })
        }
      } catch { /* บางเบราว์เซอร์ (เช่น Android) สร้าง Notification ตรงๆ ไม่ได้ — มีเสียง/สั่นแทนแล้ว */ }
      exitBlackout()
      return
    }
    playSfx('SPARKLE_CHIME', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  // ออกจากเควสกลางคัน → คืนจอจากโหมดเต็มจอ
  useEffect(() => () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}) }, [])

  function exitBlackout() {
    setBlackout(false)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  }

  const startRest = (m: RestMode) => {
    setChooseMode(false)
    setMode(m)
    notifyRef.current = notifyWhenDone
    if (m === 'screen-off') {
      setBlackout(true)
      // ต้องเรียกใน user gesture — เต็มจอ + ขอสิทธิ์แจ้งเตือน (ไม่รองรับ/ไม่อนุญาตก็ยังมีเสียง/สั่น)
      void document.documentElement.requestFullscreen?.().catch(() => {})
      if (notifyWhenDone && 'Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission().catch(() => {})
      }
    }
    setStarted(true)
  }

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
            <button className="qg-btn" onClick={() => setChooseMode(true)}>เริ่มพักสายตา 20 วินาที</button>
          </>
        )}

        {started && !done && (
          <>
            <div className="green-vision__count">{seconds}</div>
            <p className="green-vision__whisper">ละสายตาจากจอ หายใจเข้าออกช้าๆ กะพริบตาบ่อยๆ</p>
            {mode === 'screen-off' && !blackout && (
              <button className="qg-btn qg-btn--ghost" onClick={() => setBlackout(true)}>ปิดหน้าจออีกครั้ง</button>
            )}
            {!strictMode && (
              <button className="qg-btn qg-btn--ghost" onClick={handleSkip}>ข้ามตัวจับเวลา (ได้รางวัลครึ่งเดียว)</button>
            )}
          </>
        )}

        {done && !blackout && (
          <>
            <div style={{ fontSize: 48 }}>🍃</div>
            <div className="qg-title">ดวงตาได้พักแล้ว</div>
            <p className="qg-hint">กล้ามเนื้อตาคลายจากการเพ่งระยะใกล้ พร้อมสำหรับรอบจดจ่อถัดไป</p>
            <button className="qg-btn" onClick={handleFinish}>กลับมาแล้ว</button>
          </>
        )}
      </div>

      {/* [แก้ตามที่ระบุ] ป็อปอัพเลือกวิธีพักสายตาก่อนเริ่ม */}
      {chooseMode && (
        <div className="green-vision__choose" role="dialog" aria-modal="true" aria-labelledby="gv-choose-title" onClick={() => setChooseMode(false)}>
          <div className="green-vision__choose-card lb-card" onClick={(e) => e.stopPropagation()}>
            <div className="lb-banner green-vision__choose-banner" id="gv-choose-title">พักสายตา 20 วินาที</div>
            <p className="green-vision__choose-text">ต้องการปิดหน้าจอระหว่างพักสายตาไหม?</p>
            <button className="lb-btn lb-btn--wide" onClick={() => startRest('screen-off')}>🌑 ปิดหน้าจอ</button>
            <label className="green-vision__notify">
              <input type="checkbox" checked={notifyWhenDone} onChange={(e) => setNotifyWhenDone(e.target.checked)} />
              <span>แจ้งเตือนเมื่อครบเวลา (เสียง/สั่น)</span>
            </label>
            <button className="lb-btn lb-btn--wide lb-btn--ghost" onClick={() => startRest('normal')}>ไม่ต้อง — พักแบบปกติ (จอหรี่)</button>
            <button className="green-vision__choose-cancel" onClick={() => setChooseMode(false)}>ยกเลิก</button>
          </div>
        </div>
      )}

      {/* จอดำเต็มจอระหว่างพัก — แตะเพื่อกลับมาดูหน้าจอ (ตัวจับเวลายังเดินต่อ) */}
      {blackout && createPortal(
        <div className="green-vision__blackout" onClick={exitBlackout} role="button" aria-label="แตะเพื่อเปิดหน้าจอ">
          <span className="green-vision__blackout-hint">{done ? 'ครบเวลาแล้ว แตะเพื่อกลับ' : 'แตะเพื่อเปิดหน้าจอ'}</span>
        </div>,
        document.body,
      )}
    </div>
  )
}