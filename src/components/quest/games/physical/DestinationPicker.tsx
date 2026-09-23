import { useState } from 'react'
import { JOURNEY_MAPS } from '../../../../config/journeyMaps'
import type { MapDef } from '../../../../types.journey'
import './DestinationPicker.css'

/*============================================================================*\
  DestinationPicker.tsx — การ์ดเลือกจุดหมาย 8 แผนที่ของเควส Step Journey
  ────────────────────────────────────────────────────────────────────────────
  โปรเจกต์นี้ไม่มี carousel component กลางที่ reuse ได้ (grep แล้วเจอแค่ overflow-x:auto
  แบบตรงๆ ในไม่กี่จุด ไม่ใช่ component แยก) จึงทำ layout แบบเดียวกัน — scroll แนวนอน +
  scroll-snap ในไฟล์นี้เอง ไม่ใช่ component กลางใหม่ (ไม่มีที่อื่นต้องใช้ซ้ำตอนนี้)

  ใช้ภาพแผนที่จริง (mapDef.artAsset) เป็นรูปย่อการ์ดแล้ว — ไม่ใช้ emoji แทนแบบเฟสก่อนหน้า
\*============================================================================*/

interface DestinationPickerProps {
  onPicked: (mapId: string) => void
}

export default function DestinationPicker({ onPicked }: DestinationPickerProps) {
  const [pickingId, setPickingId] = useState<string | null>(null)

  const handlePick = (map: MapDef) => {
    if (pickingId) return
    setPickingId(map.id)
    onPicked(map.id)
  }

  const sortedMaps = [...JOURNEY_MAPS].sort((a, b) => a.order - b.order)

  return (
    <div className="destination-picker">
      <h2 className="destination-picker__title">เลือกจุดหมายทริปเดินของคุณ</h2>
      <p className="destination-picker__flavor">เลือกแผนที่ที่อยากไปถึง แล้วเริ่มสะสมก้าวเดินไปด้วยกัน</p>
      <div className="destination-picker__row">
        {sortedMaps.map((map) => (
          <button
            key={map.id}
            className="destination-picker__card"
            onClick={() => handlePick(map)}
            disabled={pickingId !== null}
          >
            <img src={map.artAsset} alt="" className="destination-picker__card-art" />
            <div className="destination-picker__card-info">
              <span className="destination-picker__card-order">แผนที่ {map.order}</span>
              <span className="destination-picker__card-name">{map.name}</span>
            </div>
            {pickingId === map.id && <span className="destination-picker__card-loading">กำลังเริ่ม...</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
