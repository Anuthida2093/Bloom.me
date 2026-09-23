import { useCallback, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react'

interface Point { x: number; y: number }
interface Size { width: number; height: number }

const CAMERA_FOCUS_DURATION_MS = 600

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function useMapPanZoom(nativeSize: Size) {
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

  // บังคับให้ซูมเต็มจอ (Cover) เพื่อไม่ให้เหลือขอบสีเขียว
  const getBaseZoom = useCallback((w: number, h: number) => {
    if (w <= 0 || h <= 0 || nativeSize.width <= 0 || nativeSize.height <= 0) return 1
    return Math.max(w / nativeSize.width, h / nativeSize.height)
  }, [nativeSize])

  // ล็อกการลากให้ติดเป๊ะแค่ขอบภาพ ห้ามลากทะลุ
  const clampPanValue = useCallback((px: number, py: number, z: number) => {
    const scaledW = nativeSize.width * z
    const scaledH = nativeSize.height * z
    const vw = containerSize.width
    const vh = containerSize.height

    const minX = Math.min(0, vw - scaledW)
    const minY = Math.min(0, vh - scaledH)

    return {
      x: Math.min(0, Math.max(minX, px)),
      y: Math.min(0, Math.max(minY, py))
    }
  }, [containerSize, nativeSize])

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
    // เริ่มต้นที่ด้านล่างสุดของภาพเสมอ
    const initY = containerSize.height - scaledH 

    scaleRef.current = bZ
    panRef.current = { x: initX, y: initY }
    
    // ใช้ Timeout เพื่อป้องกัน Error: set-state-in-effect
    const timer = setTimeout(() => scheduleFlush(), 0)
    return () => clearTimeout(timer)
  }, [containerSize, nativeSize, getBaseZoom, scheduleFlush])

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