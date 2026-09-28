import { useRef, useState } from 'react'
import type { PostItData } from '../../types'

/*============================================================================*\
  PostItLayer — [แก้ตามที่ระบุ] โพสอิทบันทึกความรู้สึก ลอยอยู่บนหน้าจอหลัก
  ────────────────────────────────────────────────────────────────────────────
  เดิมโพสอิทติดอยู่ในกล่องต้นไม้ (TreeOfLife) ขยับไม่ได้ — ตอนนี้:
    • โพสอิทใหม่ขึ้น "กลางจอ/กลางต้นไม้" (ดูตำแหน่งตั้งต้นใน MentalContext.tsx)
    • ลากไปวางตรงไหนก็ได้บนจอ (เมาส์/นิ้ว) — ตำแหน่งเก็บเป็น % ของจอ จึงอยู่ที่เดิม
      เมื่อหมุนจอ/ย่อขยายหน้าต่าง และบันทึกขึ้นเซิร์ฟเวอร์ (PATCH /api/postit/:id)
    • แตะเฉยๆ (ไม่ได้ลาก) = เปิดอ่านเต็ม เหมือนเดิม
\*============================================================================*/

interface PostItLayerProps {
  postIts: PostItData[]
  onOpen: (postIt: PostItData) => void
  onMove: (id: string, positionX: number, positionY: number) => void
}

/** ขยับเกินเท่านี้ (px) ถือว่า "ลาก" ไม่ใช่ "แตะเปิดอ่าน" */
const DRAG_THRESHOLD_PX = 6
/** กันโพสอิทหลุดขอบจอ (% ของจอ) */
const clamp = (v: number) => Math.min(96, Math.max(4, v))

export default function PostItLayer({ postIts, onOpen, onMove }: PostItLayerProps) {
  const dragRef = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null)
  /** ตำแหน่งระหว่างลาก (ยังไม่บันทึก) — ปล่อยนิ้วแล้วค่อยส่ง onMove ครั้งเดียว */
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)
  /** โพสอิทที่ถูกแตะ/ลากล่าสุดขึ้นมาอยู่บนสุด */
  const [topId, setTopId] = useState<string | null>(null)

  const toPercent = (clientX: number, clientY: number) => ({
    x: clamp((clientX / window.innerWidth) * 100),
    y: clamp((clientY / window.innerHeight) * 100),
  })

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, p: PostItData) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { id: p.id, startX: e.clientX, startY: e.clientY, moved: false }
    setTopId(p.id)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD_PX) return
    drag.moved = true
    const { x, y } = toPercent(e.clientX, e.clientY)
    setDragPos({ id: drag.id, x, y })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>, p: PostItData) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (drag.moved) {
      const { x, y } = toPercent(e.clientX, e.clientY)
      onMove(p.id, Math.round(x), Math.round(y))
      setDragPos(null)
    } else {
      onOpen(p)
    }
  }

  if (postIts.length === 0) return null

  return (
    <div className="postit-layer" aria-label="โพสอิทบันทึกความรู้สึก">
      {postIts.map((p, i) => {
        const dragging = dragPos?.id === p.id
        const x = dragging ? dragPos.x : clamp(p.positionX)
        const y = dragging ? dragPos.y : clamp(p.positionY)
        return (
          <button
            key={p.id}
            type="button"
            className={`postit-layer__note${dragging ? ' is-dragging' : ''}`}
            title={`${p.content}\n(ลากเพื่อย้าย · แตะเพื่ออ่าน)`}
            aria-label={`โพสอิท: ${p.content} — แตะเพื่ออ่าน ลากเพื่อย้าย`}
            onPointerDown={(e) => handlePointerDown(e, p)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, p)}
            onPointerCancel={() => { dragRef.current = null; setDragPos(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p) } }}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              background: p.color,
              zIndex: topId === p.id || dragging ? 2 : 1,
              ['--postit-tilt' as string]: `${((i * 37) % 13) - 6}deg`,
              animationDelay: `${Math.min(i, 8) * 120}ms`,
            }}
          >
            {p.content.length > 18 ? `${p.content.slice(0, 18)}…` : p.content}
          </button>
        )
      })}
    </div>
  )
}
