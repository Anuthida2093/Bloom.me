import { useCallback, useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'

/*============================================================================*\
  useHorizontalPan — ลากซ้าย-ขวาเพื่อเลื่อนดูฉาก (หน้า Home: ต้นไม้ + แปลงหญ้า)
  ────────────────────────────────────────────────────────────────────────────
  แนวทางเดียวกับ useMapPanZoom (แผนที่เควสก้าวเพื่อสุขภาพ): เก็บตำแหน่งใน ref + รวบการอัปเดต
  ด้วย requestAnimationFrame, จำกัดไม่ให้ลากเลยขอบฉาก, แก้ค่าตาม CSS scale ของ ancestor
  ต่างกันที่: เลื่อนแนวนอนอย่างเดียว ไม่มีซูม/ดับเบิลแตะ และไม่ setState ระหว่างลากเลย —
  ส่งค่าให้ผู้เรียกไปใส่ transform ตรงๆ (ต้นไม้ทั้งต้นไม่ re-render ทุกเฟรมที่ลาก)

  pan อยู่ในช่วง [-range, 0] — 0 = ชิดขอบซ้ายของฉาก, -range = ชิดขอบขวา, เริ่มต้นกึ่งกลาง
  ลากเกิน DRAG_THRESHOLD_PX ถึงนับเป็นการลาก (แตะเฉยๆ ยังเป็นคลิกปกติ) — ลากแล้วกลืนคลิกที่ตามมา
  (ไม่ให้เปิดบทความสรุปต้นไม้โดยไม่ตั้งใจตอนปล่อยนิ้ว)
\*============================================================================*/

const DRAG_THRESHOLD_PX = 6

export function useHorizontalPan(range: number, apply: (pan: number, range: number) => void) {
  const panRef = useRef(-range / 2)
  const rangeRef = useRef(range)
  const applyRef = useRef(apply)
  const dragRef = useRef<{ startX: number; startPan: number; scale: number; dragging: boolean } | null>(null)
  const swallowClickRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    applyRef.current = apply
  }, [apply])

  const flush = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      applyRef.current(panRef.current, rangeRef.current)
    })
  }, [])

  // ฉากเปลี่ยนขนาด (หมุนจอ/ย่อหน้าต่าง) → กลับมากึ่งกลาง
  useEffect(() => {
    rangeRef.current = range
    panRef.current = -range / 2
    flush()
  }, [range, flush])

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
  }, [])

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (rangeRef.current <= 0 || (e.pointerType === 'mouse' && e.button !== 0)) return
    const el = e.currentTarget
    // CSS scale ของ ancestor (ถ้ามี) — ระยะลากบนจอ ÷ scale = ระยะในฉาก
    const scale = el.offsetWidth > 0 ? el.getBoundingClientRect().width / el.offsetWidth : 1
    dragRef.current = { startX: e.clientX, startPan: panRef.current, scale: scale > 0 ? scale : 1, dragging: false }
    swallowClickRef.current = false
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = (e.clientX - d.startX) / d.scale
    if (!d.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
      d.dragging = true
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    panRef.current = Math.min(0, Math.max(-rangeRef.current, d.startPan + dx))
    flush()
  }, [flush])

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d?.dragging) return
    swallowClickRef.current = true
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }, [])

  /** ใส่เป็น onClickCapture — กลืนคลิกที่เกิดจากการปล่อยนิ้วหลังลาก */
  const onClickCapture = useCallback((e: ReactMouseEvent<HTMLElement>) => {
    if (!swallowClickRef.current) return
    swallowClickRef.current = false
    e.stopPropagation()
    e.preventDefault()
  }, [])

  return {
    panRef,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
  }
}
