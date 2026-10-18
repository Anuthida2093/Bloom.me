import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { StepDayRecord } from '../../../../services/api/progression.api'
import { JOURNEY_MAPS } from '../../../../config/journeyMaps'
import { useEscapeKey } from '../../../../hooks/useEscapeKey'
import { MAP_NATIVE_SIZE } from './journeyPathMath'
import MapPathRenderer from './MapPathRenderer'
import CatCompanion from './CatCompanion'
import '../../../shop/ShopItemDialog.css'
import './CompletedJourneyMap.css'

/*============================================================================*\
  CompletedJourneyMap — ดูแผนที่ทริปที่เดินสำเร็จของ "วันนั้น" (เส้นทางเต็ม + ตัวละครที่ปลายทาง) เปิดจากสถานะ "✅ … ก้าว · สำเร็จ" ในรายการเควส / ปฏิทินโปรไฟล์
\*============================================================================*/

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CompletedJourneyMap({ day, onClose }: { day: StepDayRecord; onClose: () => void }) {
  useEscapeKey(onClose)
  const mapDef = JOURNEY_MAPS.find((m) => m.id === day.mapId) ?? null
  const routePct = day.goalMet ? 100 : Math.min(100, (day.steps / Math.max(1, day.goal)) * 100)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(0.4)

  // ย่อแผนที่ขนาดจริง 1024px ให้พอดีกรอบ (กรอบกว้างตามจอ)
  useLayoutEffect(() => {
    const el = frameRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / MAP_NATIVE_SIZE.width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return createPortal(
    <div className="shop-dialog" role="dialog" aria-modal="true" aria-labelledby="completed-journey-title" onClick={onClose}>
      <div className="shop-dialog__card completed-journey" onClick={(e) => e.stopPropagation()}>
        <h2 id="completed-journey-title" className="shop-dialog__title">{mapDef?.name ?? 'ทริปการเดิน'}</h2>
        <p className="shop-dialog__sub">{formatDay(day.date)}</p>
        <div className={`completed-journey__status${day.goalMet ? '' : ' completed-journey__status--partial'}`}>
          <span aria-hidden="true">{day.goalMet ? '✅' : '🦶'}</span>
          <span>
            {/* ก้าวจริงที่เดินได้ (ไม่ใช่ตัวเลขเป้า) */}
            <b>{day.steps.toLocaleString()} ก้าว</b> · {day.goalMet ? 'สำเร็จ' : `เป้า ${day.goal.toLocaleString()} ก้าว`}
          </span>
        </div>
        <div ref={frameRef} className="completed-journey__frame">
          {mapDef ? (
            <div
              className="completed-journey__canvas"
              style={{ width: MAP_NATIVE_SIZE.width, height: MAP_NATIVE_SIZE.height, transform: `scale(${scale})` }}
            >
              <MapPathRenderer mapDef={mapDef} progressPct={routePct} />
              <CatCompanion mapDef={mapDef} progressPct={routePct} />
            </div>
          ) : (
            <p className="shop-dialog__hint">ไม่มีข้อมูลแผนที่ของวันนี้</p>
          )}
        </div>
        <div className="shop-dialog__actions">
          <button type="button" className="soft-btn soft-btn--gold" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
