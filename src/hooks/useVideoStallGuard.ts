import { useEffect, useState, type RefObject } from 'react'

/*============================================================================*\
  useVideoStallGuard — [แก้ตามที่ระบุ] เน็ตไม่ดี วิดีโอพื้นหลังต้องไม่ค้าง
  ────────────────────────────────────────────────────────────────────────────
  - เน็ตช้ามาก/เปิดโหมดประหยัดข้อมูล (navigator.connection) → ไม่ใช้วิดีโอเลย ใช้ฉากสำรอง
  - ยังไม่ได้เฟรมพร้อมเล่นภายใน START_TIMEOUT_MS → ใช้ฉากสำรอง (ไม่โชว์ภาพแรกค้างครึ่งๆ กลางๆ)
  - เล่นอยู่แล้วกระตุกรอโหลด (waiting/stalled) นานเกิน STALL_TIMEOUT_MS → ซ่อนวิดีโอ เห็นฉากสำรองแทน
    โหลดต่อได้แล้ว (playing) → ค่อยๆ กลับมาแสดงวิดีโอ
  คืน { ready, failed }: ready = แสดงวิดีโอได้ (ให้ผู้เรียกจางวิดีโอเข้า/ออก) · failed = เลิกใช้วิดีโอถาวรรอบนี้
\*============================================================================*/

const START_TIMEOUT_MS = 8000
const STALL_TIMEOUT_MS = 2500

interface NetworkInformationLike { saveData?: boolean; effectiveType?: string }

/** เน็ตช้าเกินจะเล่นวิดีโอพื้นหลังลื่นๆ */
export function isSlowConnection(): boolean {
  const c = (navigator as Navigator & { connection?: NetworkInformationLike }).connection
  return !!c && (c.saveData === true || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')
}

export function useVideoStallGuard(videoRef: RefObject<HTMLVideoElement | null>, key: unknown = null) {
  const [state, setState] = useState<{ key: unknown; ready: boolean; failed: boolean }>(
    () => ({ key, ready: false, failed: isSlowConnection() }),
  )
  // ไฟล์ใหม่ (key เปลี่ยน) → เริ่มนับใหม่ (ปรับ state ระหว่าง render)
  if (state.key !== key) setState({ key, ready: false, failed: isSlowConnection() })

  useEffect(() => {
    const v = videoRef.current
    if (!v || state.failed) return
    let stallTimer = 0
    const startTimer = window.setTimeout(() => {
      if (v.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setState((s) => ({ ...s, failed: true }))
    }, START_TIMEOUT_MS)
    const onPlaying = () => {
      window.clearTimeout(stallTimer)
      window.clearTimeout(startTimer)
      setState((s) => (s.ready ? s : { ...s, ready: true }))
    }
    const onWaiting = () => {
      window.clearTimeout(stallTimer)
      stallTimer = window.setTimeout(() => setState((s) => ({ ...s, ready: false })), STALL_TIMEOUT_MS)
    }
    const onError = () => setState((s) => ({ ...s, failed: true }))
    if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !v.paused) onPlaying()
    v.addEventListener('playing', onPlaying)
    v.addEventListener('canplay', onPlaying)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('stalled', onWaiting)
    v.addEventListener('error', onError)
    return () => {
      window.clearTimeout(stallTimer)
      window.clearTimeout(startTimer)
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('canplay', onPlaying)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('stalled', onWaiting)
      v.removeEventListener('error', onError)
    }
  }, [videoRef, state.failed, key])

  /** ให้ผู้เรียกแจ้งว่าโหลดไม่ได้ (error ของ <source> ไม่ยิงที่ <video>) */
  const fail = () => setState((s) => (s.failed ? s : { ...s, failed: true }))
  return { ready: state.ready && !state.failed, failed: state.failed, fail }
}
