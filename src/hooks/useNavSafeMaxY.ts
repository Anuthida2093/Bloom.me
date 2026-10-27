import { useLayoutEffect, useState } from 'react'

/** ตำแหน่ง y สูงสุด (% ของความสูงจอ) ที่ของลอยบนหน้า Home วางได้โดยไม่ไปอยู่ใต้แถบเมนูล่าง (ActionMenuBar)
 *  reservePx = ระยะเผื่อเพิ่ม (เช่น ครึ่งความสูงของชิ้นที่วาง) */
export function useNavSafeMaxY(reservePx: number): number {
  const [maxY, setMaxY] = useState(96)
  useLayoutEffect(() => {
    const measure = () => {
      const nav = document.querySelector('.action-menu-container')?.getBoundingClientRect()
      if (!nav || nav.height <= 0 || window.innerHeight <= 0) { setMaxY(96); return }
      const limit = ((nav.top - nav.height / 2 - reservePx) / window.innerHeight) * 100
      setMaxY(Math.max(30, Math.min(96, limit)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [reservePx])
  return maxY
}
