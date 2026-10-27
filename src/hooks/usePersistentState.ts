import { useCallback, useEffect, useRef, useState } from 'react'

/*============================================================================*\
  usePersistentState — [ไฟล์ใหม่] state ที่รอดจากการรีเฟรชหน้า
  ────────────────────────────────────────────────────────────────────────────
  ทั้งโปรเจกต์เดิมไม่มีการเก็บอะไรลง localStorage เลยแม้แต่จุดเดียว → รีเฟรชทีเดียว
  ผู้ใช้เสียทุกอย่าง แม้แต่การตั้งค่าเสียงและโหมดมืดที่ควรอยู่ฝั่งเครื่องผู้ใช้อยู่แล้ว

  ใช้เฉพาะกับ "client state" จริงๆ เท่านั้น (ตั้งค่า, ตำแหน่งไอเทมที่ลากเอง,
  แท็บที่เปิดค้างไว้) — ข้อมูลที่เป็นของ backend (เควส อารมณ์ เหรียญ) ห้ามเก็บที่นี่
  เพราะจะกลายเป็นแหล่งความจริงคู่ขนานที่ขัดกับเซิร์ฟเวอร์
\*============================================================================*/

export function usePersistentState<T>(key: string, initialValue: T) {
  const storageKey = `bloom:${key}`
  const isFirstRender = useRef(true)

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      return raw !== null ? (JSON.parse(raw) as T) : initialValue
    } catch {
      // โหมดส่วนตัวของ Safari โยน error ตอนเขียน localStorage — ต้องไม่ทำให้แอปพัง
      return initialValue
    }
  })

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch { /* เขียนไม่ได้ก็ปล่อยผ่าน ไม่ใช่เรื่องคอขาดบาดตาย */ }
  }, [storageKey, value])

  const clear = useCallback(() => {
    try { window.localStorage.removeItem(storageKey) } catch { /* noop */ }
    setValue(initialValue)
  }, [storageKey, initialValue])

  return [value, setValue, clear] as const
}