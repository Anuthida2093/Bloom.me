import { useState, useRef } from 'react'
import { JOURNEY_MAPS } from '../../../../config/journeyMaps'
import './DestinationPicker.css'

interface DestinationPickerProps {
  onPicked: (mapId: string) => void
}

export default function DestinationPicker({ onPicked }: DestinationPickerProps) {
  const [pickingId, setPickingId] = useState<string | null>(null)
  
  // ตัวแปรสำหรับทำระบบลากด้วยเมาส์ (Mouse Drag to Scroll)
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const dragDistance = useRef(0)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return
    isDragging.current = true
    dragDistance.current = 0
    startX.current = e.pageX - sliderRef.current.offsetLeft
    scrollLeft.current = sliderRef.current.scrollLeft
    sliderRef.current.style.scrollSnapType = 'none' // ปิด snap ตอนลากให้สมูท
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !sliderRef.current) return
    e.preventDefault()
    const x = e.pageX - sliderRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5 // ความเร็วตอนปัด
    sliderRef.current.scrollLeft = scrollLeft.current - walk
    dragDistance.current += Math.abs(walk)
  }

  const handlePointerUp = () => {
    isDragging.current = false
    if (sliderRef.current) {
      sliderRef.current.style.scrollSnapType = 'x mandatory' // เปิด snap กลับมาเมื่อปล่อยนิ้ว
    }
  }

  const handlePick = (id: string) => {
    // ถ้ายกนิ้ว/เมาส์แล้วพบว่าเป็นการลาก (ไม่ได้ตั้งใจคลิก) ให้ข้ามการเลือกไป
    if (dragDistance.current > 10) return
    
    setPickingId(id)
    onPicked(id)
  }

  return (
    <div className="destination-picker">
      <div className="destination-picker__header">
        <h2>เลือกจุดหมายทริปเดินของคุณ</h2>
        <p>เลือกแผนที่ที่อยากไปถึง แล้วเริ่มสะสมก้าวเดินไปด้วยกัน</p>
      </div>
      
      <div 
        className="destination-picker__slider"
        ref={sliderRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="destination-picker__track">
          {JOURNEY_MAPS.map((m) => (
            <button
              key={m.id}
              className={`destination-picker__item ${pickingId === m.id ? 'destination-picker__item--picking' : ''}`}
              onClick={() => handlePick(m.id)}
              disabled={pickingId !== null}
            >
              <div className="destination-picker__img-wrapper">
                <img src={m.artAsset} alt="" className="destination-picker__img" loading="lazy" />
              </div>
              <div className="destination-picker__info">
                <span className="destination-picker__order">แผนที่ {m.order}</span>
                <span className="destination-picker__name">{m.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}