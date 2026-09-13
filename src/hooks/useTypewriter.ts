import { useEffect, useRef, useState } from 'react'

/**
 * useTypewriter — เผยข้อความทีละตัวอักษรแบบพิมพ์ดีด (ใช้กับข้อความสรุปจาก AI mock)
 * รีเซ็ตตัวเองอัตโนมัติทุกครั้งที่ `text` เปลี่ยน (เช่น สุ่มไพ่ใหม่/เขียนบันทึกใหม่)
 *
 * [ใหม่] onCharacterReveal — callback เรียกทุกครั้งที่มีตัวอักษรใหม่โผล่ ใช้เล่นเสียง
 * keypress.mp3 ประกอบ (ดู audioPlayer.ts) — throttle ไว้ที่ "ทุก 2 ตัวอักษร" ในตัว hook เอง
 * (ไม่ปล่อยให้ผู้เรียกใช้ throttle เอง) เพราะถ้าเรียกทุกตัวอักษรจริงๆ ที่ความเร็ว ~22-26ms/ตัว
 * จะกลายเป็นเสียงรัวถี่คล้ายปืนกล ฟังดูรำคาญมากกว่าเสียงพิมพ์ดีดจริง
 */
export function useTypewriter(
  text: string,
  speedMs = 26,
  startDelayMs = 200,
  onCharacterReveal?: () => void
): { displayedText: string; isDone: boolean } {
  const [prevText, setPrevText] = useState(text)
  const [displayedText, setDisplayedText] = useState('')
  const [isDone, setIsDone] = useState(text.length === 0)
  const indexRef = useRef(0)
  const onCharacterRevealRef = useRef(onCharacterReveal)

  // เก็บ callback ล่าสุดไว้ใน ref ผ่าน effect (แทนการเขียน ref ตรงๆ ระหว่าง render)
  // กัน stale closure โดยไม่ต้องใส่เป็น dependency ของ effect หลักด้านล่าง
  useEffect(() => {
    onCharacterRevealRef.current = onCharacterReveal
  })

  // [แก้] รีเซ็ตข้อความ/สถานะ "ระหว่าง render" ทันทีที่ text เปลี่ยน แทนการ setState
  // แบบ synchronous ตอนเริ่ม effect (react-hooks/set-state-in-effect) — ส่วนตัวจับเวลาจริง
  // (setTimeout/setInterval) ยังอยู่ใน effect ด้านล่างเหมือนเดิม เพราะเป็นการเชื่อมกับ
  // external system จริงๆ ไม่ใช่แค่ derive state จาก prop
  if (text !== prevText) {
    setPrevText(text)
    setDisplayedText('')
    setIsDone(text.length === 0)
  }

  useEffect(() => {
    indexRef.current = 0

    // ค่า isDone ของกรณี text ว่างถูกตั้งไว้แล้วตอน render (ทั้งตอน mount ครั้งแรกและ
    // ตอน text เปลี่ยนด้านบน) จึงไม่ต้อง setState ซ้ำตรงนี้
    if (!text) return

    let intervalId: number
    const startTimeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        indexRef.current += 1
        setDisplayedText(text.slice(0, indexRef.current))
        // Throttle: เล่นเสียงแค่ทุก 2 ตัวอักษร
        if (indexRef.current % 2 === 0) {
          onCharacterRevealRef.current?.()
        }
        if (indexRef.current >= text.length) {
          window.clearInterval(intervalId)
          setIsDone(true)
        }
      }, speedMs)
    }, startDelayMs)

    return () => {
      window.clearTimeout(startTimeoutId)
      window.clearInterval(intervalId)
    }
  }, [text, speedMs, startDelayMs])

  return { displayedText, isDone }
}