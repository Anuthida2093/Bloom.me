import { useEffect } from 'react'

/**
 * useEscapeKey — เรียก callback เมื่อผู้ใช้กดปุ่ม Escape ขณะ modal/panel เปิดอยู่
 * ใช้แทนการเขียน `window.addEventListener('keydown', ...)` ซ้ำๆ ในทุก modal — เรียกครั้งเดียว
 * ในแต่ละ modal component พร้อม callback ปิดของตัวเอง (เช่น `useEscapeKey(onClose)`)
 *
 * ปลอดภัยต่อการเรียกซ้อนกันหลาย modal พร้อมกัน (เช่น QuestConfirmModal ซ้อนอยู่บน
 * QuestPathMap ที่เป็น full-screen) เพราะ listener ผูกกับ instance ของ modal นั้นๆ เอง
 * ผ่าน closure — ปิดจากบนสุดไปหาล่างสุดตามลำดับที่ React mount จริง (React เรียก effect
 * ของ component ที่ mount ทีหลังก่อน ตอน event bubble เดียวกันมาถึงพร้อมกัน)
 */
export function useEscapeKey(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onEscape, active])
}