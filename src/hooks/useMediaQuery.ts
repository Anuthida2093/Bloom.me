import { useEffect, useState } from 'react'

/*============================================================================*\
  useMediaQuery — [ไฟล์ใหม่] อ่านผล media query แบบ reactive
  ────────────────────────────────────────────────────────────────────────────
  จำเป็นสำหรับงานที่ CSS อย่างเดียวแก้ไม่ได้ เช่น "บนมือถือให้ปั๊มใบไม้แค่ 28 ใบ
  แทน 70 ใบ" — เรื่องจำนวน DOM node ต้องตัดสินใจใน JS ไม่ใช่ซ่อนด้วย CSS
  (ซ่อนด้วย CSS = สร้าง element ครบแล้วค่อยซ่อน ซึ่งเสียค่าใช้จ่ายไปแล้ว)
\*============================================================================*/

export function useMediaQuery(query: string): boolean {
  // [แก้] ย้าย state ตาม query ที่เปลี่ยนออกจาก effect (react-hooks/set-state-in-effect)
  // ใช้แพทเทิร์นที่ React เอกสารแนะนำ — "ปรับ state ระหว่าง render" เมื่อ prop เปลี่ยน
  // แทนที่จะ setState ใน effect หลัง mount (ดู react.dev/learn/you-might-not-need-an-effect)
  const [prevQuery, setPrevQuery] = useState(query)
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  if (query !== prevQuery) {
    setPrevQuery(query)
    setMatches(typeof window !== 'undefined' ? window.matchMedia(query).matches : false)
  }

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** จอเล็ก — ใช้ลดจำนวนเอฟเฟกต์และปิดวิดีโอพื้นหลัง */
export const useIsSmallScreen = () => useMediaQuery('(max-width: 640px)')

/** ผู้ใช้ขอให้ลดการเคลื่อนไหว — ต้องเคารพเสมอ ไม่ใช่ทางเลือก */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

/** เครื่องกำลังประหยัดแบตหรือเน็ตช้า — ลดภาระให้อัตโนมัติ */
export function useIsLowPowerMode(): boolean {
  const smallScreen = useIsSmallScreen()
  const reducedMotion = usePrefersReducedMotion()
  return smallScreen || reducedMotion
}