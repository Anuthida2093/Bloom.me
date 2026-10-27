import { useEffect, useRef } from 'react'

/**
 * useEscapeKey — เรียก callback เมื่อผู้ใช้กดปุ่ม Escape ขณะ modal/panel เปิดอยู่
 * ใช้แทนการเขียน `window.addEventListener('keydown', ...)` ซ้ำๆ ในทุก modal — เรียกครั้งเดียว
 * ในแต่ละ modal component พร้อม callback ปิดของตัวเอง (เช่น `useEscapeKey(onClose)`)
 *
 * [แก้บั๊ก] เดิมทุก modal ที่เปิดซ้อนกันได้ Escape พร้อมกันหมด — กด Esc ในป็อปอัปเดียว ปิดทั้งหน้าที่อยู่ข้างใต้
 * ไปด้วย (เช่น ป็อปอัปเลือกพื้นหลัง → หน้าตั้งค่าปิดตาม) ตอนนี้เป็น "สแตก": Esc ปิดเฉพาะชั้นบนสุด
 * (ตัวที่เปิดใช้งานล่าสุด) ทีละชั้น · callback อ่านค่าล่าสุดเสมอ แต่ลำดับในสแตกไม่เปลี่ยนตอน re-render
 * active = false → ไม่อยู่ในสแตก (ใช้กับ component ที่ mount ค้างไว้แต่ป็อปอัปยังไม่เปิด)
 */

const stack: { fire: () => void }[] = []
let listening = false

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || stack.length === 0) return
  stack[stack.length - 1].fire()
}

export function useEscapeKey(onEscape: () => void, active = true): void {
  const latest = useRef(onEscape)
  useEffect(() => { latest.current = onEscape })

  useEffect(() => {
    if (!active) return
    const entry = { fire: () => latest.current() }
    stack.push(entry)
    if (!listening) { window.addEventListener('keydown', handleKeyDown); listening = true }
    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      if (stack.length === 0 && listening) { window.removeEventListener('keydown', handleKeyDown); listening = false }
    }
  }, [active])
}
