/**
 * uiSounds.ts
 * ────────────
 * [Method 1: Web Audio API] เสียง UI ทั่วไปที่ "สังเคราะห์สด" ด้วย oscillator ไม่พึ่งไฟล์
 * เสียงเลย (ต่างจาก audioPlayer.ts ที่เล่นไฟล์ .mp3 จริง) เหมาะกับเสียงคลิก/ปุ่มสั้นๆ ที่ไม่
 * คุ้มจะโหลดไฟล์แยก — เบา เร็ว ไม่มี network request
 *
 * เป็น util ล้วนๆ ไม่ผูกกับ React ใดๆ (เรียกได้จากทุกที่) — เช็ค mute state ผ่าน flag
 * ภายในไฟล์นี้เอง (setUiSoundsMuted) แทนที่จะให้ผู้เรียกใช้ต้องส่ง mute เข้ามาเองทุกครั้ง —
 * AudioContext.tsx เป็นคนซิงค์ค่านี้ให้อัตโนมัติทุกครั้งที่ settings.soundEnabled เปลี่ยน
 */

let isMuted = false

/** เรียกจาก AudioContext.tsx ทุกครั้งที่ settings.soundEnabled เปลี่ยน — ไม่ต้องเรียกเองตรงๆ */
export function setUiSoundsMuted(muted: boolean): void {
  isMuted = muted
}

let sharedCtx: AudioContext | null = null

/** สร้าง AudioContext แบบ lazy — เบราว์เซอร์ส่วนใหญ่ต้องรอ user gesture ก่อนถึงจะสร้าง/
 *  resume ได้ ฟังก์ชันนี้เลยไม่ถูกเรียกตอน module โหลด แต่รอถึงตอนมีเสียงจริงต้องเล่นก่อน */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!sharedCtx) sharedCtx = new AudioContextCtor()
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {})
  return sharedCtx
}

interface ToneOptions {
  frequency: number
  duration: number
  type?: OscillatorType
  volume?: number
  /** ไล่ความถี่จากค่าเริ่มต้นไปยังค่านี้ตลอดช่วงเสียง (ทำให้ได้เสียง "ป๊อบ"/"สไลด์" แทนเสียงนิ่งๆ) */
  frequencyEnd?: number
}

function playTone({ frequency, duration, type = 'sine', volume = 0.12, frequencyEnd }: ToneOptions): void {
  if (isMuted) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    if (frequencyEnd !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, frequencyEnd), ctx.currentTime + duration)
    }

    // Envelope แบบ exponential decay ให้เสียงจางหายลื่นๆ ไม่ตัดห้วน
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // no-op — กันแอปพังถ้า Web Audio API ใช้ไม่ได้ในบางสภาพแวดล้อม (เช่น เบราว์เซอร์เก่ามาก)
  }
}

/**
 * uiSounds — เรียกใช้ตรงๆ จากทุก component ได้เลย เช่น `uiSounds.click()` ตอนกดปุ่มยืนยัน
 * ทั่วไป ไม่ต้อง import AudioContext หรือเช็ค mute เอง (เช็คให้อัตโนมัติในไฟล์นี้แล้ว)
 */
export const uiSounds = {
  /** เสียงคลิกสั้นๆ กลางๆ — ใช้กับปุ่มทั่วไป, ปุ่มยืนยันใน Modal */
  click: (): void => playTone({ frequency: 660, duration: 0.09, type: 'sine', volume: 0.1 }),

  /** เสียง "ป๊อบ" สูงขึ้นเล็กน้อย — ใช้ตอนเปิดอะไรใหม่ๆ ขึ้นมา (เปิด modal, เลือกไอเทม) */
  pop: (): void => playTone({ frequency: 520, frequencyEnd: 880, duration: 0.14, type: 'triangle', volume: 0.12 }),

  /** เสียงยกเลิก/ปิด — โทนต่ำลง สั้น ให้ความรู้สึก "ถอยออก" */
  cancel: (): void => playTone({ frequency: 400, frequencyEnd: 220, duration: 0.16, type: 'sawtooth', volume: 0.08 }),
}