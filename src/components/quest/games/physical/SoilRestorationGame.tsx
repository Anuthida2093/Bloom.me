import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { useAudio } from '../../../../context/AudioContext'
import '../games.css'
import './SoilRestorationGame.css'
import { setSfxSuppressed } from '../../../../utils/sfxGate'

/*  ความสำเร็จ Soil Restoration (ฟื้นฟูหน้าดิน / คลิปกล่อมนอน)
    ทฤษฎี: Blue Light & Melatonin Suppression + Sleep-inducing Soundscapes
    ─────────────────────────────────────────────────────────────
    [แก้ตามที่ระบุ] เดิมให้ตั้งเวลานอน/ตัดจอ → เปลี่ยนเป็น "เวลานอน" จริง:
    เลือกคลิปวิว + เลือกเสียงกล่อมนอน + เลือกระยะเวลา (อย่างต่ำ 30 นาที)
    แล้วเปิดเต็มจอ ภาพวนซ้ำไปเรื่อยๆ พร้อมเสียงเบาๆ — ครบเวลาแล้วเสียงค่อยๆ เบาลง
    ภารกิจสำเร็จอัตโนมัติ และหน้าจอปิดเอง (finishAndClose — ไม่ต้องตื่นมากดรับรางวัล)
    - นับเวลาจากเวลาจริง (endAt) ไม่ใช่นับ tick → แท็บถูกพักไว้เบื้องหลังก็ยังจบตรงเวลา
    - ขอ Screen Wake Lock ระหว่างเล่น (ถ้าเบราว์เซอร์รองรับ) ไม่ให้จอดับกลางคลิป
    - พัก BGM ของแอประหว่างเล่น ไม่ให้เสียงซ้อนกัน */

const CLIP_BASE = '/assets/videos/quest-physical/Soil Restoration/'
const CLIPS = [
  { key: 'Grassland', label: 'ทุ่งหญ้ายามค่ำ' },
  { key: 'Lake', label: 'ทะเลสาบสงบ' },
  { key: 'Sea', label: 'ทะเลกว้าง' },
] as const
type ClipKey = typeof CLIPS[number]['key']

const SOUNDS = [
  { key: 'forest', label: 'เสียงป่าผ่อนคลาย' },
  { key: 'rain', label: 'เสียงฝนพรำ' },
  { key: 'waves', label: 'เสียงคลื่นซัดฝั่ง' },
  { key: 'none', label: 'ไม่มีเสียง' },
] as const
type SoundKey = typeof SOUNDS[number]['key']

/** ระยะเวลาที่เลือกได้ (นาที) — อย่างต่ำ 30 นาทีตามที่ระบุ */
const DURATIONS = [30, 45, 60, 90] as const
/** ช่วงท้ายที่เสียงค่อยๆ เบาลงจนเงียบ */
const FADE_OUT_MS = 60_000
/** ซ่อนตัวนับเวลา/ปุ่มเองหลังไม่ได้แตะจอกี่ ms */
const CONTROLS_IDLE_MS = 4000

/* ── เสียงกล่อมนอน ── ป่า = ไฟล์ mp3 / ฝน+คลื่น = สังเคราะห์สดด้วย Web Audio (ไม่ต้องมีไฟล์) */
interface SleepSound { setVolume: (v: number) => void; stop: () => void }

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  // brown-ish noise (นุ่มกว่า white noise) ยาว 4 วินาทีวนซ้ำ
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  return buffer
}

function startSynthSound(kind: 'rain' | 'waves', volume: number): SleepSound | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  const ctx = new Ctor()
  const src = ctx.createBufferSource()
  src.buffer = createNoiseBuffer(ctx)
  src.loop = true
  const master = ctx.createGain()
  master.gain.value = volume
  const filter = ctx.createBiquadFilter()

  if (kind === 'rain') {
    // ฝน: กรองให้เหลือย่านกลาง-สูงนุ่มๆ
    filter.type = 'lowpass'
    filter.frequency.value = 2400
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 300
    src.connect(hp).connect(filter).connect(master)
  } else {
    // คลื่น: ย่านต่ำ + LFO ช้าๆ ~9 วินาทีต่อลูก ให้เสียงดังขึ้นลงเหมือนคลื่นซัด
    filter.type = 'lowpass'
    filter.frequency.value = 700
    const swell = ctx.createGain()
    swell.gain.value = 0.55
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 1 / 9
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.45
    lfo.connect(lfoDepth).connect(swell.gain)
    lfo.start()
    src.connect(filter).connect(swell).connect(master)
  }
  master.connect(ctx.destination)
  src.start()
  return {
    setVolume: (v) => { master.gain.setTargetAtTime(v, ctx.currentTime, 0.3) },
    stop: () => { try { src.stop() } catch { /* already stopped */ } void ctx.close() },
  }
}

function startSleepSound(kind: SoundKey, volume: number): SleepSound | null {
  if (kind === 'none') return null
  if (kind === 'forest') {
    const audio = new Audio('/assets/sounds/bgm-relaxing-forest.mp3')
    audio.loop = true
    audio.volume = volume
    audio.play().catch(() => {})
    return {
      setVolume: (v) => { audio.volume = Math.min(1, Math.max(0, v)) },
      stop: () => { audio.pause(); audio.src = '' },
    }
  }
  return startSynthSound(kind, volume)
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

type WakeLockSentinelLike = { release: () => Promise<void> }

export default function SoilRestorationGame({ finishAndClose }: QuestGameProps) {
  const { logActivity } = useAppContext()
  const { setBgmSuspended } = useAudio()

  const [clip, setClip] = useState<ClipKey>('Lake')
  const [sound, setSound] = useState<SoundKey>('rain')
  const [minutes, setMinutes] = useState<number>(30)
  const [volume, setVolume] = useState(0.6)

  const [endAt, setEndAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [showControls, setShowControls] = useState(true)
  const [confirmStop, setConfirmStop] = useState(false)

  const soundRef = useRef<SleepSound | null>(null)
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  const releaseEverything = () => {
    soundRef.current?.stop()
    soundRef.current = null
    void wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    setBgmSuspended(false)
    setSfxSuppressed(false)
  }

  // ออกจากหน้าเควสกลางคัน (ปิดแท็บ/เปลี่ยนหน้า) → หยุดเสียง คืนจอ คืน BGM
  useEffect(() => () => releaseEverything(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const pokeControls = () => {
    setShowControls(true)
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => setShowControls(false), CONTROLS_IDLE_MS)
  }

  const handleStart = () => {
    const start = Date.now()
    finishedRef.current = false
    setBgmSuspended(true)
    // [แก้ตามที่ระบุ] เริ่มกล่อมนอน → ปิดเสียงเกม/เสียงคลิกทั้งหมด เหลือแค่เสียงกล่อมนอน
    setSfxSuppressed(true)
    soundRef.current = startSleepSound(sound, volume)
    // ต้องเรียกใน user gesture — ขอเต็มจอ + กันจอดับ (ไม่รองรับก็เล่นต่อได้ปกติ)
    void document.documentElement.requestFullscreen?.().catch(() => {})
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock
    wakeLock?.request('screen').then((s) => { wakeLockRef.current = s }).catch(() => {})
    setNow(start)
    setEndAt(start + minutes * 60_000)
    pokeControls()
  }

  // นาฬิกานับถอยหลัง + ค่อยๆ ลดเสียงช่วงท้าย + จบอัตโนมัติ
  useEffect(() => {
    if (endAt === null) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      const left = endAt - t
      if (left <= FADE_OUT_MS) soundRef.current?.setVolume(volume * Math.max(0, left / FADE_OUT_MS))
      if (left <= 0 && !finishedRef.current) {
        finishedRef.current = true
        window.clearInterval(id)
        releaseEverything()
        logActivity({ activityType: 'SCREEN_CURFEW', durationSeconds: minutes * 60, meta: { mode: 'sleep-soundscape', clip, sound } })
        finishAndClose({ clip, sound, minutes })
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [endAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // ปรับความดังระหว่างเล่น (ก่อนเข้าช่วงค่อยๆ เบาลง)
  useEffect(() => {
    if (endAt !== null && endAt - Date.now() > FADE_OUT_MS) soundRef.current?.setVolume(volume)
  }, [volume, endAt])

  /** [แก้ตามที่ระบุ] หยุดก่อนเวลา → กลับไปหน้าเลือกวิว/เสียง/เวลา (ไม่ออกจากเควส) ภารกิจยังไม่นับว่าสำเร็จ */
  const handleStopEarly = () => {
    releaseEverything()
    setEndAt(null)
    setConfirmStop(false)
    setShowControls(true)
  }

  if (endAt !== null) {
    const remaining = endAt - now
    return createPortal(
      <div className={`soil-sleep${showControls ? '' : ' is-idle'}`} onPointerDown={pokeControls} onPointerMove={pokeControls}>
        <video className="soil-sleep__video" src={`${CLIP_BASE}${clip}.mp4`} autoPlay loop muted playsInline />
        <div className="soil-sleep__dim" aria-hidden="true" />

        <div className="soil-sleep__hud">
          <div className="soil-sleep__time" aria-live="off">{formatRemaining(remaining)}</div>
          <div className="soil-sleep__sub">หลับตาแล้วปล่อยตัวให้สบาย ครบเวลาแล้วหน้าจอจะปิดเอง</div>
          <label className="soil-sleep__volume">
            <span>เสียง</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="ความดังเสียง" />
          </label>
          <button className="soil-sleep__stop" onClick={() => setConfirmStop(true)}>หยุดก่อนเวลา</button>
        </div>

        {confirmStop && (
          <div className="soil-sleep__confirm" onPointerDown={(e) => e.stopPropagation()}>
            <div className="lb-card soil-sleep__confirm-card">
              <p className="lb-text">ถ้าหยุดตอนนี้ ภารกิจจะยังไม่สำเร็จนะ</p>
              <div className="soil-sleep__confirm-actions">
                <button className="lb-btn" onClick={() => setConfirmStop(false)}>ฟังต่อ</button>
                <button className="lb-btn lb-btn--ghost" onClick={handleStopEarly}>หยุด</button>
              </div>
            </div>
          </div>
        )}
      </div>,
      document.body,
    )
  }

  return (
    <div className="qg soil-setup">
      <div className="lb-card soil-setup__card">
        <span className="soil-setup__label">เลือกวิวก่อนนอน</span>
        <div className="soil-setup__clips">
          {CLIPS.map((c) => (
            <button key={c.key} className={`soil-setup__clip${clip === c.key ? ' is-active' : ''}`} onClick={() => setClip(c.key)}>
              <video src={`${CLIP_BASE}${c.key}.mp4#t=1`} muted playsInline preload="metadata" />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="lb-card soil-setup__card">
        <span className="soil-setup__label">เลือกเสียงกล่อมนอน</span>
        <div className="soil-setup__chips">
          {SOUNDS.map((s) => (
            <button key={s.key} className={`soil-setup__chip${sound === s.key ? ' is-active' : ''}`} onClick={() => setSound(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lb-card soil-setup__card">
        <span className="soil-setup__label">เปิดเล่นนานเท่าไร (อย่างต่ำ 30 นาที)</span>
        <div className="soil-setup__chips">
          {DURATIONS.map((m) => (
            <button key={m} className={`soil-setup__chip${minutes === m ? ' is-active' : ''}`} onClick={() => setMinutes(m)}>
              {m} นาที
            </button>
          ))}
        </div>
        <p className="soil-setup__hint">
          วางโทรศัพท์ไว้ข้างตัว หรี่แสงหน้าจอลง แล้วหลับตาฟังเสียงเบาๆ
          เมื่อครบเวลา เสียงจะค่อยๆ เบาลง ภารกิจสำเร็จเอง และหน้าจอจะปิดให้อัตโนมัติ
        </p>
      </div>

      <button className="lb-btn lb-btn--wide" onClick={handleStart}>เริ่มกล่อมนอน</button>
    </div>
  )
}
