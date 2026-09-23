import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/*============================================================================*\
  useMapPanZoom.ts — กล้อง auto-follow ตัวละครบนแผนที่ Step Journey แบบง่าย
  ────────────────────────────────────────────────────────────────────────────
  [แก้รอบนี้ — ปรับ layout เต็มจอ] เดิม hook นี้สมมติว่า viewport เป็นสี่เหลี่ยมจัตุรัส (มาจาก
  .step-journey-game__map-viewport ที่ตั้ง aspect-ratio:1/1 ตายตัว) จึงใช้ "โลก" (world) ขนาด
  เท่า viewport เอง — พอ layout ใหม่ต้องให้แผนที่เต็มพื้นที่ที่เหลือทั้งหมด (ไม่ใช่จัตุรัสอีก
  ต่อไป) ต้องแยก "ขนาดภาพจริง" (nativeSize — ภาพแผนที่ทุกใบเป็นจัตุรัส 1024x1024px จริง เช็คแล้ว)
  ออกจาก "ขนาด viewport" (ไม่จัตุรัสแล้ว) — คำนวณ base zoom แบบเดียวกับหลักการ object-fit:cover
  (เหมือน getZoomBounds() ใน LearningQuestMap.tsx: max(viewportW/nativeW, viewportH/nativeH))
  วิธีนี้กันบั๊กพิกัดเพี้ยนที่จะเกิดถ้าใช้ <img object-fit:cover> ตรงๆ บนกล่องไม่จัตุรัส (เส้นทาง/
  ตัวละครที่วางด้วย % จะไม่ตรงกับตำแหน่งจริงบนภาพที่ถูกครอบตัดแบบไม่สมมาตร) — ที่นี่ภาพ+เส้นทาง+
  ตัวละครทั้งหมดอยู่ในเลเยอร์เดียวกันขนาดคงที่เท่าภาพจริงเสมอ (ดู MapPathRenderer.tsx) แล้วให้
  transform เดียวกันนี้ย่อ/ขยาย/เลื่อนทั้งเลเยอร์พร้อมกัน จึงตรงกันเสมอไม่ว่า viewport จะเป็น
  สัดส่วนไหน

  [แก้รอบนี้ — feedback รอบ 2: ภาพถูกซูม/ครอบตัดแน่นเกินไป] เดิมคูณ base cover-zoom ด้วย
  FOLLOW_ZOOM_MULTIPLIER (1.3) เพิ่มอีกชั้นเพื่อเอฟเฟกต์ "ซูมตามตัวละคร" — ผลคือมองเห็นภาพแคบกว่า
  ที่จำเป็นจริง (รายละเอียดรอบข้างหายไปเยอะเกินไปตามที่ระบุ) ตัดตัวคูณนี้ทิ้งแล้ว (zoom = cover
  ล้วนๆ ไม่มีซูมเพิ่ม) — นี่คือ zoom ที่ "น้อยที่สุดเท่าที่จำเป็น" เพื่อไม่ให้เกิดพื้นที่ว่างรอบภาพ
  (ยังคง "cover" ไม่ใช่ "contain" เพราะถ้าใช้ contain ล้วนๆ ภาพทั้งใบจะเห็นครบเสมอไม่มีอะไรให้ลาก
  pan ดูเพิ่มเลย ขัดกับ requirement ที่ต้อง "เลื่อนดูส่วนที่พ้นจอได้จริง") ด้วย zoom=cover เพียวๆ
  นี้ ทุกพิกเซลของภาพยังคง "ลากดูได้เสมอ" ไม่มีจุดไหนเข้าถึงไม่ได้เลย (ต่างจากตอนมี multiplier
  ที่ยิ่งคูณเยอะ พื้นที่ที่มองเห็นได้ในหน้าจอเดียวยิ่งแคบลงเรื่อยๆ) — สรุป: ไม่มีทางเลี่ยงที่จะ
  "ไม่ครอบตัดเนื้อหาเลยแม้แต่ชั่วขณะเดียว" ได้ 100% สำหรับภาพจัตุรัสในกล่องที่ไม่ใช่จัตุรัส (ต้อง
  เลือกระหว่างพื้นที่ว่างกับพื้นที่ที่มองไม่เห็น ณ ขณะหนึ่ง) — ตัวเลือกนี้คือ "ครอบตัด ณ ขณะหนึ่ง
  น้อยที่สุดเท่าที่เป็นไปได้ โดยทุกอย่างยังลากดูได้เสมอ ไม่มีอะไรหายไปถาวร"

  ต่างจาก pan/zoom เต็มรูปแบบของ LearningQuestMap.tsx (pinch-zoom สองนิ้ว/กล้องโฟกัสต่อโหนด/
  native wheel listener/camera tween ฯลฯ) ซึ่งซับซ้อนเกินความจำเป็นของเควสนี้ — ที่นี่ไม่มีท่าทาง
  ซูมให้ผู้เล่นปรับเอง กล้องจะโฟกัสอัตโนมัติไปตามตำแหน่ง (focusPct) ที่ parent ส่งเข้ามา
  (ตำแหน่งตัวละครบนเส้นทาง) จนกว่าผู้เล่นจะลากจอเอง (autoFollow ปิดทันที) แล้วกดปุ่ม
  "กลับไปตามแมว" (เรียก refollow()) เพื่อกลับไปโหมดตามอัตโนมัติอีกครั้ง

  [react-hooks/set-state-in-effect] ตอน autoFollow เปิดอยู่ ตำแหน่งกล้อง "ตาม" focusPct ล้วนๆ
  จึงคำนวณเป็นค่า derived ระหว่าง render ตรงๆ (useMemo) แทนการ setState ใน effect ทุกครั้งที่
  focusPct เปลี่ยน — ต่างจาก manualPan (ตำแหน่งตอนผู้เล่นลากเอง) ที่ต้องเป็น state จริงเพราะมาจาก
  pointer event handler โดยตรง
\*============================================================================*/

/** ลากไม่เกินระยะนี้ (px) ถือว่าเป็นการแตะเฉยๆ ไม่ใช่การลาก — กัน autoFollow หลุดเองตอนแค่แตะจอ */
const DRAG_THRESHOLD_PX = 3

interface Point { x: number; y: number }
interface Size { width: number; height: number }

function getCoverZoom(viewport: Size, native: Size): number {
  if (viewport.width <= 0 || viewport.height <= 0 || native.width <= 0 || native.height <= 0) return 1
  return Math.max(viewport.width / native.width, viewport.height / native.height)
}

function clampPan(pan: Point, zoom: number, viewport: Size, native: Size): Point {
  if (viewport.width <= 0 || viewport.height <= 0) return pan
  const scaledW = native.width * zoom
  const scaledH = native.height * zoom
  const minX = Math.min(0, viewport.width - scaledW)
  const minY = Math.min(0, viewport.height - scaledH)
  return {
    x: Math.min(0, Math.max(minX, pan.x)),
    y: Math.min(0, Math.max(minY, pan.y)),
  }
}

export interface UseMapPanZoomResult {
  /** [แก้บั๊ก] เป็น callback ref ไม่ใช่ RefObject ธรรมดา — .step-journey-game__map-viewport
   *  ไม่ได้อยู่ใน DOM ตั้งแต่ StepJourneyGame mount ครั้งแรก (ตอนนั้นยังเป็นหน้า loading/picker
   *  อยู่ ยังไม่มี journey) ถ้าใช้ useRef + useLayoutEffect(deps:[]) แบบเดิม ตอน effect รันครั้ง
   *  แรก containerRef.current จะเป็น null เสมอ (element ยังไม่ mount) ทำให้ ResizeObserver ไม่ถูก
   *  ผูกเลยตลอดอายุ component — callback ref นี้ถูกเรียกทุกครั้งที่ element จริง mount/unmount
   *  จึงผูก/เลิกผูก observer ได้ถูกจังหวะเสมอ */
  containerRef: (el: HTMLDivElement | null) => void
  /** ขนาดจริงของ "โลก" (ภาพแผนที่) เป็น px — เอาไปตั้ง width/height ของเลเยอร์ที่ถูก transform
   *  (MapPathRenderer ต้องเป็นขนาดนี้ตายตัวเสมอ ไม่ใช่ width:100% ของ viewport อีกต่อไป) */
  nativeSize: Size
  zoom: number
  pan: Point
  autoFollow: boolean
  /** เรียกกลับไปโหมดตามอัตโนมัติ — ใช้กับปุ่ม "กลับไปตามแมว" */
  refollow: () => void
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
  }
}

/** @param nativeSize ขนาดจริงของภาพแผนที่เป็น px (ทุกใบเป็นจัตุรัส 1024x1024 จริง — เช็คแล้ว) */
export function useMapPanZoom(focusPct: Point, nativeSize: Size): UseMapPanZoomResult {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [manualPan, setManualPan] = useState<Point>({ x: 0, y: 0 })
  const [autoFollow, setAutoFollow] = useState(true)
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    observerRef.current = observer
  }, [])

  const zoom = useMemo(() => getCoverZoom(size, nativeSize), [size, nativeSize])

  const pan = useMemo(() => {
    if (!autoFollow) return manualPan
    const worldX = (focusPct.x / 100) * nativeSize.width
    const worldY = (focusPct.y / 100) * nativeSize.height
    const targetX = size.width / 2 - worldX * zoom
    const targetY = size.height / 2 - worldY * zoom
    return clampPan({ x: targetX, y: targetY }, zoom, size, nativeSize)
  }, [autoFollow, manualPan, focusPct.x, focusPct.y, size, nativeSize, zoom])

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [pan.x, pan.y])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) setAutoFollow(false)
    setManualPan(clampPan({ x: drag.panX + dx, y: drag.panY + dy }, zoom, size, nativeSize))
  }, [size, nativeSize, zoom])

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }, [])

  const refollow = useCallback(() => setAutoFollow(true), [])

  return {
    containerRef,
    nativeSize,
    zoom,
    pan,
    autoFollow,
    refollow,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  }
}
