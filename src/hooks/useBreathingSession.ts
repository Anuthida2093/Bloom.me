import { useCallback, useEffect, useRef, useState } from 'react'

/*============================================================================*\
  useBreathingSession — เครื่องยนต์กลางของการฝึกหายใจทั้งแอป
  ────────────────────────────────────────────────────────────────────────────
  ใช้โดยเควสทอดสมอใจ (4-7-8 นาน 2 นาที) — [แก้รอบหลัง] เดิมใช้ร่วมกับเควสสายลมแห่งสติ
  ด้วย แต่เควสนั้นถูกลบออกจากระบบแล้ว (ซ้ำกับทอดสมอใจ)

  [ทำไมต้องเขียนใหม่ ไม่ใช้ setTimeout ซ้อนกันแบบเดิม]
  โค้ดเดิมใน MindfulAnchorPage/QuestPlayModal ใช้ setTimeout เรียกตัวเองต่อกันเป็นทอดๆ
  ซึ่งมีปัญหาจริง 3 ข้อ:
    1. เบราว์เซอร์ throttle timer ของแท็บที่ไม่ได้ active → จังหวะหายใจเพี้ยนสะสม
    2. ตัวจับเวลารวมกับตัวเปลี่ยนเฟสเป็นคนละ effect กัน → พอ pause/resume แล้วเหลื่อมกัน
    3. ผู้ใช้ทำครบ 2 นาทีจริงหรือไม่ พิสูจน์ไม่ได้ เพราะนับจาก Date.now() ครั้งเดียวตอน mount
  ตัวนี้เปลี่ยนเป็น "สะสมเวลาจริงด้วย requestAnimationFrame" — เฟสและความคืบหน้าทั้งหมด
  derive จาก elapsedMs ตัวเดียว จึงตรงกันเสมอ และหยุดนับทันทีที่สลับแท็บ (นับเฉพาะเวลาที่
  ผู้ใช้อยู่กับหน้าจอจริงๆ ตรงตามเจตนาของ MBSR ที่ต้องอยู่กับลมหายใจ ไม่ใช่เปิดทิ้งไว้)
\*============================================================================*/

export type BreathPhase = 'inhale' | 'hold' | 'exhale'

export interface BreathStep {
  phase: BreathPhase
  ms: number
}

/** จังหวะ 4-7-8 ตาม MBSR (Jon Kabat-Zinn) — เข้า 4 วิ / กลั้น 7 วิ / ออก 8 วิ = 19 วิ/รอบ */
export const PATTERN_478: BreathStep[] = [
  { phase: 'inhale', ms: 4000 },
  { phase: 'hold', ms: 7000 },
  { phase: 'exhale', ms: 8000 },
]

export const PHASE_LABEL: Record<BreathPhase, string> = {
  inhale: 'หายใจเข้า',
  hold: 'กลั้นไว้',
  exhale: 'ผ่อนออก',
}

interface UseBreathingSessionOptions {
  /** ระยะเวลาทั้งเซสชัน (มิลลิวินาที) เช่น 120_000 = 2 นาที */
  totalMs: number
  pattern?: BreathStep[]
  /** เริ่มนับทันทีที่ mount หรือรอกดเริ่มเอง */
  autoStart?: boolean
  onPhaseChange?: (phase: BreathPhase) => void
  onFinish?: () => void
}

export interface BreathingSession {
  phase: BreathPhase
  /** 0-1 ความคืบหน้าภายในเฟสปัจจุบัน */
  phaseProgress: number
  /** วินาทีที่เหลือของเฟสปัจจุบัน (ปัดขึ้น) ใช้แสดงเลขนับถอยหลัง 4→3→2→1 */
  phaseRemainingSec: number
  /** จำนวนรอบหายใจที่ทำครบแล้ว */
  cycles: number
  elapsedMs: number
  remainingMs: number
  /** 0-1 ความคืบหน้าของทั้งเซสชัน */
  progress: number
  running: boolean
  /** true = หยุดชั่วคราวเพราะผู้ใช้สลับแท็บ/ย่อหน้าต่าง */
  autoPaused: boolean
  finished: boolean
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
}

export function useBreathingSession({
  totalMs,
  pattern = PATTERN_478,
  autoStart = false,
  onPhaseChange,
  onFinish,
}: UseBreathingSessionOptions): BreathingSession {
  const cycleMs = pattern.reduce((sum, s) => sum + s.ms, 0)

  const [elapsedMs, setElapsedMs] = useState(0)
  const [running, setRunning] = useState(autoStart)
  const [autoPaused, setAutoPaused] = useState(false)
  const [finished, setFinished] = useState(false)

  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number | null>(null)
  const lastPhaseRef = useRef<BreathPhase | null>(null)
  const finishedRef = useRef(false)

  // เก็บ callback ล่าสุดไว้ใน ref เพื่อไม่ให้ loop ถูกสร้างใหม่ทุก render
  const onPhaseChangeRef = useRef(onPhaseChange)
  const onFinishRef = useRef(onFinish)
  useEffect(() => { onPhaseChangeRef.current = onPhaseChange }, [onPhaseChange])
  useEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  // หยุดนับอัตโนมัติเมื่อผู้ใช้สลับแท็บ แล้วนับต่อเมื่อกลับมา
  useEffect(() => {
    const handler = () => {
      setAutoPaused(document.hidden)
      if (document.hidden) lastTickRef.current = null
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  useEffect(() => {
    if (!running || autoPaused || finished) {
      lastTickRef.current = null
      return
    }

    const tick = (now: number) => {
      const last = lastTickRef.current
      lastTickRef.current = now
      // กันกระโดด: ถ้าเฟรมห่างเกิน 1 วินาที (แท็บถูก throttle) ให้นับแค่ 1 วินาที
      const delta = last === null ? 0 : Math.min(now - last, 1000)

      setElapsedMs((prev) => {
        const next = prev + delta
        if (next >= totalMs && !finishedRef.current) {
          finishedRef.current = true
          setFinished(true)
          setRunning(false)
          onFinishRef.current?.()
          return totalMs
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [running, autoPaused, finished, totalMs])

  // ── derive เฟสปัจจุบันจาก elapsedMs ตัวเดียว ──
  const positionInCycle = elapsedMs % cycleMs
  let cursor = 0
  let phase: BreathPhase = pattern[0].phase
  let phaseElapsed = 0
  let phaseMs = pattern[0].ms
  for (const step of pattern) {
    if (positionInCycle < cursor + step.ms) {
      phase = step.phase
      phaseElapsed = positionInCycle - cursor
      phaseMs = step.ms
      break
    }
    cursor += step.ms
  }

  // แจ้งเตือนตอนเปลี่ยนเฟส (ใช้เล่นเสียงกริ๊งเบาๆ)
  useEffect(() => {
    if (!running) return
    if (lastPhaseRef.current !== phase) {
      lastPhaseRef.current = phase
      onPhaseChangeRef.current?.(phase)
    }
  }, [phase, running])

  const start = useCallback(() => {
    finishedRef.current = false
    setFinished(false)
    setRunning(true)
  }, [])

  const pause = useCallback(() => setRunning(false), [])
  const resume = useCallback(() => setRunning(true), [])

  const reset = useCallback(() => {
    finishedRef.current = false
    lastPhaseRef.current = null
    lastTickRef.current = null
    setElapsedMs(0)
    setFinished(false)
    setRunning(false)
  }, [])

  return {
    phase,
    phaseProgress: phaseMs > 0 ? phaseElapsed / phaseMs : 0,
    phaseRemainingSec: Math.max(1, Math.ceil((phaseMs - phaseElapsed) / 1000)),
    cycles: Math.floor(elapsedMs / cycleMs),
    elapsedMs,
    remainingMs: Math.max(0, totalMs - elapsedMs),
    progress: totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0,
    running,
    autoPaused,
    finished,
    start,
    pause,
    resume,
    reset,
  }
}