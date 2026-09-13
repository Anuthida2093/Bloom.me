import { useCallback, useEffect, useRef, useState } from 'react'

/*============================================================================*\
  useCountdown — [ไฟล์ใหม่] นาฬิกาจับเวลาที่อิง "เวลาจริง" ไม่ใช่การนับวินาที
  ────────────────────────────────────────────────────────────────────────────
  ปัญหาของรูปแบบเดิมที่ใช้กันหลายเควส:

      setInterval(() => setSeconds(s => s - 1), 1000)

  เบราว์เซอร์ทุกตัวจะ "หน่วง" timer ลงเหลือเรียกครั้งละ 1 ครั้งต่อนาที (หรือหยุดเลย)
  เมื่อแท็บไม่ได้อยู่หน้าจอ — เควส The Deep Root ที่จับเวลา 90 นาที จะเพี้ยนหลายนาที
  ผู้ใช้ที่ตั้งใจโฟกัสแล้วนาฬิกาไม่ตรง จะเลิกเชื่อแอปทันที

  ตัวนี้เก็บแค่ "เวลาที่เริ่ม" แล้วคำนวณเวลาที่เหลือจาก Date.now() ทุกครั้งที่ tick
  ต่อให้เบราว์เซอร์ข้าม tick ไปกี่ครั้ง ตัวเลขก็ยังตรงเป๊ะเสมอ

  autoPauseOnHidden: หยุดนับเมื่อสลับแท็บ (เหมาะกับเควสที่ต้อง "อยู่กับมันจริงๆ"
  เช่นฝึกหายใจ) — ตั้งเป็น false ถ้าอยากให้เดินต่อแม้ย่อหน้าต่างไป
\*============================================================================*/

interface UseCountdownOptions {
  totalSeconds: number
  onFinish?: () => void
  autoPauseOnHidden?: boolean
  /** เรียกทุกครั้งที่วินาทีเปลี่ยน — ใช้เล่นเสียงติ๊ก/เตือนช่วงท้าย */
  onTick?: (secondsLeft: number) => void
}

export function useCountdown({
  totalSeconds, onFinish, autoPauseOnHidden = false, onTick,
}: UseCountdownOptions) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [running, setRunning] = useState(false)

  const startedAtRef = useRef(0)        // performance.now() ตอนกดเริ่ม/นับต่อ
  const consumedMsRef = useRef(0)       // เวลาที่ผ่านไปแล้วก่อนหน้านี้ (สะสมข้ามการพัก)
  const rafRef = useRef<number | null>(null)
  const lastSecondRef = useRef(totalSeconds)
  const finishedRef = useRef(false)

  // เก็บ callback ไว้ใน ref เพื่อไม่ให้ลูปรีสตาร์ตทุกครั้งที่พาเรนต์ re-render
  const onFinishRef = useRef(onFinish)
  const onTickRef = useRef(onTick)
  useEffect(() => { onFinishRef.current = onFinish; onTickRef.current = onTick })

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (finishedRef.current) return
    startedAtRef.current = performance.now()
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    if (!running) return
    consumedMsRef.current += performance.now() - startedAtRef.current
    setRunning(false)
  }, [running])

  const reset = useCallback((nextTotal = totalSeconds) => {
    stopLoop()
    consumedMsRef.current = 0
    startedAtRef.current = 0
    finishedRef.current = false
    lastSecondRef.current = nextTotal
    setSecondsLeft(nextTotal)
    setRunning(false)
  }, [stopLoop, totalSeconds])

  useEffect(() => {
    if (!running) { stopLoop(); return }

    const tick = () => {
      const elapsedMs = consumedMsRef.current + (performance.now() - startedAtRef.current)
      const left = Math.max(0, Math.ceil(totalSeconds - elapsedMs / 1000))

      if (left !== lastSecondRef.current) {
        lastSecondRef.current = left
        setSecondsLeft(left)
        onTickRef.current?.(left)
      }

      if (left <= 0) {
        finishedRef.current = true
        setRunning(false)
        onFinishRef.current?.()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return stopLoop
  }, [running, totalSeconds, stopLoop])

  // หยุดอัตโนมัติเมื่อสลับแท็บ
  useEffect(() => {
    if (!autoPauseOnHidden) return
    const onVisibility = () => { if (document.hidden) pause() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [autoPauseOnHidden, pause])

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return {
    secondsLeft, running, progress, label: `${mm}:${ss}`,
    isFinished: secondsLeft <= 0,
    start, pause, reset,
  }
}