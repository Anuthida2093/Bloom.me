import { useCallback, useMemo, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react'

interface Point { x: number; y: number }
interface Size { width: number; height: number }
/** ระยะเว้นจากขอบกรอบ (px) ในโหมด fit — เหลือที่ให้กรอบแผนที่/ป้ายชื่อ/การ์ดด้านล่าง */
export interface FitInset { top: number; right: number; bottom: number; left: number }
const NO_INSET: FitInset = { top: 0, right: 0, bottom: 0, left: 0 }

/** ระยะเว้นรอบแผนที่ที่มีกรอบ (MapFrame) — [แก้ตามที่ระบุ] ข้างเว้นน้อยลง กรอบ/แผนที่ใหญ่ขึ้น
 *  บนเผื่อป้ายชื่อ/ปุ่มปิด · ล่าง = ความสูงแถบข้อความด้านล่างที่วัดจริง (useBottomReserve) ไม่ให้บังแผนที่ */
export function mapFrameInset(bottomReserve: number) {
  return ({ height }: Size): FitInset => ({ top: 58, left: 12, right: 12, bottom: Math.min(height * 0.45, Math.max(100, bottomReserve)) })
}

/** ระยะจากขอบบนของแถบล่าง (การ์ด/ป้าย) ถึงขอบล่างของกรอบเกม + ช่องไฟ — ไม่มีแถบ = 0 */
export function useBottomReserve(barRef: { current: HTMLElement | null }, deps: unknown[] = []): number {
  const [reserve, setReserve] = useState(0)
  useEffect(() => {
    const bar = barRef.current
    const parent = bar?.offsetParent as HTMLElement | null
    if (!bar || !parent) { setReserve(0); return }
    const measure = () => setReserve(Math.max(0, parent.getBoundingClientRect().bottom - bar.getBoundingClientRect().top + 14))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(bar)
    ro.observe(parent)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- วัดใหม่เมื่อแถบโผล่/หาย (deps จากผู้เรียก)
  }, deps)
  return reserve
}

const CAMERA_FOCUS_DURATION_MS = 600

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** fit = เห็นภาพทั้งใบในกรอบ (contain — ใช้ตอนเดินถึงเป้าแล้ว ให้เห็นเส้นทางครบทั้งเส้น)
 *  ไม่ใส่ = เต็มกรอบ (cover — ตอนกำลังเดิน ไม่เหลือขอบ) */
export function useMapPanZoom(nativeSize: Size, options: {
  fit?: boolean
  fitInset?: (container: Size) => FitInset
  portraitZoom?: number
  /** [แก้ตามที่ระบุ] ขนาดที่ใช้คิดซูมแบบเต็มกรอบ (ค่าเริ่ม = nativeSize) — แผนที่ใหญ่ (2048) ใส่ 1024
   *  → ซูมเท่าแผนที่ปกติ ภาพเลยใหญ่เกินจอทั้งสองแกน ลากเลื่อนซ้าย-ขวา ขึ้น-ลงได้ */
  coverSize?: Size
  /** จุดที่ให้อยู่กลางจอตอนเริ่ม (% ของแผนที่) เช่นตำแหน่งนกฮูก — ไม่ใส่ = กลางล่างของภาพ (จุดเริ่มเส้นทาง) */
  initialFocusPct?: { x: number; y: number }
} = {}) {
  const fit = options.fit ?? false
  const coverSize = options.coverSize ?? nativeSize
  const focusRef = useRef(options.initialFocusPct)
  // ประกาศก่อน effect จัดภาพเริ่มต้น → อัปเดตก่อนในรอบ commit เดียวกัน
  useEffect(() => { focusRef.current = options.initialFocusPct })
  /** [แก้ตามที่ระบุ] จอแนวตั้ง (มือถือ) ขยายแผนที่เกินจอทั้งสองแกน → ลากเลื่อนขึ้นลงได้แบบแผนที่การเรียนรู้ */
  const portraitZoom = options.portraitZoom ?? 1
  const fitInsetFn = options.fitInset
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 })
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const hasCapturedPointerRef = useRef(false)
  const dragMovedRef = useRef(0)
  const visualTransformRef = useRef({ originX: 0, originY: 0, scale: 1 })
  const rafIdRef = useRef<number | null>(null)
  const lastTapRef = useRef<number>(0)
  const cameraAnimRef = useRef<number | null>(null)

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
    if (!el) return
    const observer = new ResizeObserver(() => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function measureVisualTransform(el: HTMLElement, layoutW: number, layoutH: number) {
    const rect = el.getBoundingClientRect()
    const s = layoutW > 0 && layoutH > 0 ? (rect.width / layoutW + rect.height / layoutH) / 2 : 1
    return { originX: rect.left, originY: rect.top, scale: s > 0 ? s : 1 }
  }

  // ปกติซูมเต็มจอ (cover) ไม่ให้เหลือขอบสีเขียว · fit = ทั้งภาพอยู่ในกรอบ (contain)
  // inset คำนวณจากขนาดกรอบ (เฉพาะโหมด fit) — ไม่ใส่ = ไม่เว้นขอบ
  // คิดทุก render (ฟังก์ชัน inline อาจอิงค่าที่วัดได้ใหม่ เช่นความสูงแถบล่าง) แต่คงอ็อบเจกต์เดิมถ้าตัวเลขไม่เปลี่ยน
  const rawInset = fit && fitInsetFn && containerSize.width > 0 ? fitInsetFn(containerSize) : NO_INSET
  const inset = useMemo<FitInset>(
    () => ({ top: rawInset.top, right: rawInset.right, bottom: rawInset.bottom, left: rawInset.left }),
    [rawInset.top, rawInset.right, rawInset.bottom, rawInset.left],
  )

  /* [แก้ตามที่ระบุ] แถบเมนูล่าง (ActionMenuBar) ลอยทับขอบล่างของกรอบแผนที่ — โหมดเต็มกรอบ (cover) จึงให้
     ลากเลยขอบล่างของภาพได้อีกเท่าส่วนที่แถบบัง (วัดจริงทุกครั้งที่กรอบเปลี่ยนขนาด) เลื่อนลงสุดแล้ว
     ขอบล่างของแผนที่ (จุด Start) ขึ้นมาอยู่เหนือแถบพอดี */
  const [barOverlap, setBarOverlap] = useState(0)
  useEffect(() => {
    const el = containerRef.current
    if (!el || containerSize.height === 0) return
    const measure = () => {
      const nav = document.querySelector('.action-menu-container')?.getBoundingClientRect()
      const box = el.getBoundingClientRect()
      setBarOverlap(nav && nav.height > 0 ? Math.max(0, Math.round(box.bottom - nav.top + 8)) : 0)
    }
    const t = window.setTimeout(measure, 0)
    return () => window.clearTimeout(t)
  }, [containerSize])

  const getBaseZoom = useCallback((w: number, h: number) => {
    if (w <= 0 || h <= 0 || nativeSize.width <= 0 || nativeSize.height <= 0) return 1
    if (!fit) return Math.max(w / coverSize.width, h / coverSize.height) * (h > w ? portraitZoom : 1)
    const iw = Math.max(1, w - inset.left - inset.right), ih = Math.max(1, h - inset.top - inset.bottom)
    return Math.min(iw / nativeSize.width, ih / nativeSize.height)
  }, [nativeSize, coverSize.width, coverSize.height, fit, inset, portraitZoom])

  // ล็อกการลากให้ติดเป๊ะแค่ขอบภาพ ห้ามลากทะลุ
  const clampPanValue = useCallback((px: number, py: number, z: number) => {
    const scaledW = nativeSize.width * z
    const scaledH = nativeSize.height * z
    const vw = containerSize.width
    const vh = containerSize.height

    const minX = Math.min(0, vw - scaledW)
    const minY = Math.min(0, vh - scaledH - barOverlap)

    // ภาพเล็กกว่าพื้นที่ (โหมด fit) → จัดกึ่งกลางในพื้นที่หลังเว้นขอบ (inset) ไม่ลากออกนอก
    const iw = vw - inset.left - inset.right, ih = vh - inset.top - inset.bottom
    return {
      x: scaledW <= iw ? inset.left + (iw - scaledW) / 2 : scaledW <= vw ? (vw - scaledW) / 2 : Math.min(0, Math.max(minX, px)),
      // ภาพสูงเท่ากรอบพอดี (cover บนจอแนวตั้ง) ยังเลื่อนลงได้เท่าส่วนที่แถบเมนูบัง (minY)
      y: scaledH <= ih ? inset.top + (ih - scaledH) / 2 : scaledH < vh - 0.5 ? (vh - scaledH) / 2 : Math.min(0, Math.max(minY, py)),
    }
  }, [containerSize, nativeSize, inset, barOverlap])

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current != null) return
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null
      setPan({ x: panRef.current.x, y: panRef.current.y })
      setScale(scaleRef.current)
    })
  }, [])

  // เริ่มต้นจัดภาพให้อยู่ตรงกลาง
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0 || nativeSize.width === 0 || nativeSize.height === 0) return

    const bZ = getBaseZoom(containerSize.width, containerSize.height)
    const scaledW = nativeSize.width * bZ
    const scaledH = nativeSize.height * bZ
    
    const initX = (containerSize.width - scaledW) / 2
    // เริ่มต้นที่ด้านล่างสุดของภาพ (จุดเริ่มเส้นทาง) · โหมด fit จัดกึ่งกลางในพื้นที่หลังเว้นขอบ
    const initY = containerSize.height - scaledH - barOverlap

    scaleRef.current = bZ
    const focus = focusRef.current
    panRef.current = fit
      ? clampPanValue(initX, 0, bZ)
      : focus
        ? clampPanValue(containerSize.width / 2 - (focus.x / 100) * scaledW, containerSize.height / 2 - (focus.y / 100) * scaledH, bZ)
        : { x: initX, y: initY }
    
    // ใช้ Timeout เพื่อป้องกัน Error: set-state-in-effect
    const timer = setTimeout(() => scheduleFlush(), 0)
    return () => clearTimeout(timer)
  }, [containerSize, nativeSize, getBaseZoom, scheduleFlush, fit, clampPanValue, barOverlap])

  // ระบบแอนิเมชันสำหรับซูมและเลื่อนกล้อง
  const startFocus = useCallback((targetXPct: number, targetYPct: number, targetZoom: number) => {
    if (cameraAnimRef.current) cancelAnimationFrame(cameraAnimRef.current)
    
    const w = containerSize.width
    const h = containerSize.height
    if (w <= 0 || h <= 0) return

    const fromZ = scaleRef.current
    const fromX = panRef.current.x
    const fromY = panRef.current.y

    const targetWorldX = (targetXPct / 100) * nativeSize.width
    const targetWorldY = (targetYPct / 100) * nativeSize.height
    
    const toUnclampedX = w / 2 - targetWorldX * targetZoom
    const toUnclampedY = h / 2 - targetWorldY * targetZoom
    const to = clampPanValue(toUnclampedX, toUnclampedY, targetZoom)

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / CAMERA_FOCUS_DURATION_MS))
      const eased = easeInOutCubic(t)
      scaleRef.current = fromZ + (targetZoom - fromZ) * eased
      panRef.current.x = fromX + (to.x - fromX) * eased
      panRef.current.y = fromY + (to.y - fromY) * eased
      scheduleFlush()
      
      if (t < 1) cameraAnimRef.current = requestAnimationFrame(tick)
      else cameraAnimRef.current = null
    }
    cameraAnimRef.current = requestAnimationFrame(tick)
  }, [containerSize, nativeSize, clampPanValue, scheduleFlush])

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (cameraAnimRef.current) cancelAnimationFrame(cameraAnimRef.current)
    
    const now = Date.now()
    // ดับเบิลคลิกเพื่อซูมเข้า หรือ ซูมออก
    if (now - lastTapRef.current < 300) {
      const bZ = getBaseZoom(containerSize.width, containerSize.height)
      const isZoomedIn = scaleRef.current > bZ * 1.2
      
      if (isZoomedIn) {
        // ซูมออกกลับมาที่ตรงกลาง
        startFocus(50, 50, bZ)
      } else {
        // ซูมเข้า ณ ตำแหน่งที่ผู้ใช้นิ้วกด
        const targetZ = bZ * 2.5
        const rect = e.currentTarget.getBoundingClientRect()
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top
        const worldX = ((px - panRef.current.x) / scaleRef.current) / nativeSize.width * 100
        const worldY = ((py - panRef.current.y) / scaleRef.current) / nativeSize.height * 100
        
        startFocus(worldX, worldY, targetZ)
      }
      lastTapRef.current = 0
      return
    }
    
    lastTapRef.current = now
    hasCapturedPointerRef.current = false
    dragMovedRef.current = 0
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: panRef.current.x, panY: panRef.current.y }
    
    if (containerRef.current) {
      visualTransformRef.current = measureVisualTransform(containerRef.current, containerSize.width, containerSize.height)
    }
  }, [containerSize, nativeSize, startFocus, getBaseZoom])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    
    const dxVisual = e.clientX - dragRef.current.startX
    const dyVisual = e.clientY - dragRef.current.startY
    dragMovedRef.current += Math.hypot(dxVisual, dyVisual)

    if (!hasCapturedPointerRef.current && dragMovedRef.current > 5) {
      hasCapturedPointerRef.current = true
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }

    const s = visualTransformRef.current.scale
    const dx = dxVisual / s
    const dy = dyVisual / s

    const clamped = clampPanValue(dragRef.current.panX + dx, dragRef.current.panY + dy, scaleRef.current)
    panRef.current = clamped
    scheduleFlush()
  }, [clampPanValue, scheduleFlush])

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }, [])

  return {
    containerRef: setContainerRef,
    scale,
    pan,
    handlers: { onPointerDown, onPointerMove, onPointerUp }
  }
}