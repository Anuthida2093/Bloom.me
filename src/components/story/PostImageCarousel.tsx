import { useRef, useState } from 'react'

/*============================================================================*\
  PostImageCarousel — [ใหม่ตามที่ระบุ] รูปหลายรูปในโพสต์ เลื่อนซ้าย-ขวาดูได้แบบ IG
  ปัด (มือถือ) / ลาก-เลื่อน (ทัชแพด) ผ่าน scroll-snap · ปุ่มลูกศรซ้าย/ขวา · จุดบอกตำแหน่ง + ตัวเลข 1/5
  รูปแรกกำหนดสัดส่วนกรอบ รูปถัดไปแสดงเต็มกรอบแบบไม่ตัด (contain)
\*============================================================================*/
/* [แก้ตามที่ระบุ — แบบ IG] ทุกโพสต์ใช้กรอบ 4:5 เต็มกว้างการ์ด (รูปเดียวก็เหมือนกัน) — รูปแสดงครบไม่ครอป
   (contain) ช่องว่างรอบรูปเติมด้วยรูปเดียวกันแบบเบลอ (ไม่เป็นแถบดำ) · จุดบอกตำแหน่งย้ายมาอยู่ "ใต้รูป"
   · แตะรูปสองครั้ง = ถูกใจ (onDoubleTap) */
function Slide({ src, eager }: { src: string; eager: boolean }) {
  return (
    <>
      <img className="story-carousel__backdrop" src={src} alt="" aria-hidden="true" loading={eager ? 'eager' : 'lazy'} draggable={false} />
      <img className="story-carousel__img" src={src} alt="" loading={eager ? 'eager' : 'lazy'} draggable={false} />
    </>
  )
}

export default function PostImageCarousel({ images, onDoubleTap }: { images: string[]; onDoubleTap?: () => void }) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)

  if (images.length === 0) return null
  if (images.length === 1) {
    return (
      <div className="story-carousel story-carousel--single" onDoubleClick={onDoubleTap}>
        <div className="story-carousel__slide"><Slide src={images[0]} eager={false} /></div>
      </div>
    )
  }

  const goTo = (i: number) => {
    const track = trackRef.current
    if (!track) return
    const next = Math.max(0, Math.min(images.length - 1, i))
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  return (
    <div className="story-carousel" aria-roledescription="carousel" onDoubleClick={onDoubleTap}>
      <div className="story-carousel__track" ref={trackRef} onScroll={handleScroll}>
        {images.map((src, i) => (
          <div key={i} className="story-carousel__slide" aria-label={`รูปที่ ${i + 1} จาก ${images.length}`}>
            <Slide src={src} eager={i === 0} />
          </div>
        ))}
      </div>

      <span className="story-carousel__counter">{index + 1}/{images.length}</span>
      {index > 0 && (
        <button type="button" className="story-carousel__nav story-carousel__nav--prev" onClick={() => goTo(index - 1)} aria-label="รูปก่อนหน้า">‹</button>
      )}
      {index < images.length - 1 && (
        <button type="button" className="story-carousel__nav story-carousel__nav--next" onClick={() => goTo(index + 1)} aria-label="รูปถัดไป">›</button>
      )}
      <div className="story-carousel__dots story-carousel__dots--below" aria-hidden="true">
        {images.map((_, i) => <span key={i} className={i === index ? 'is-active' : ''} />)}
      </div>
    </div>
  )
}
