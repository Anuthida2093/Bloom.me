import { useCallback, useRef, useState } from 'react'
import { JOURNEY_MAPS } from '../../../../config/journeyMaps'
import { BADGE_ICONS } from '../../../../config/iconAssets'
import { recordStepDay, type StepDayRecord } from '../../../../services/api/progression.api'
import { mapFrameInset, useBottomReserve, useMapPanZoom } from '../../../../hooks/useMapPanZoom'
import { useStepChest } from '../../../../hooks/useStepChest'
import { MAP_NATIVE_SIZE } from './journeyPathMath'
import MapPathRenderer from './MapPathRenderer'
import { StepChestMarker, StepChestPopup } from './StepChest'
import MapFrame, { MapStars } from './MapFrame'
import CatCompanion from './CatCompanion'
import './StepJourneyGame.css'

/*============================================================================*\
  CompletedTripView — เปิดเควสก้าวเพื่อสุขภาพอีกครั้งหลังเดินถึงเป้าวันนี้แล้ว
  ────────────────────────────────────────────────────────────────────────────
  แสดง "แผนที่เดิมที่ผู้เล่นเลือกไว้" ย่อพอดีจอทั้งแผ่นในกรอบ เส้นทางเรืองทองเดินครบถึงเส้นชัย
  ตัวละครยืนที่ปลายทาง + ก้าวจริงทั้งหมดของวันนี้ (ไม่ตัดที่เป้า — เดินเกินก็เห็นตัวเลขจริง)
  [แก้ตามที่ระบุ] แถบล่างไม่มีช่องกรอกก้าวแล้ว — ปุ่ม [กลับ] (ปิดเควส) กับ [ดูแผนที่] (แผนที่ใหญ่เต็มจอ ลาก/ซูมได้)
\*============================================================================*/

export default function CompletedTripView({ day, onClose }: { day: StepDayRecord; onClose: () => void }) {
  const mapDef = JOURNEY_MAPS.find((m) => m.id === day.mapId) ?? null
  /** ดูแผนที่ใหญ่: เต็มจอ (cover) ไม่มีกรอบ/การ์ด */
  const [bigMap, setBigMap] = useState(false)
  // แผนที่ย่อพอดีพื้นที่เหนือการ์ดล่าง (วัดความสูงการ์ดจริง) — การ์ดไม่บังแผนที่
  const cardRef = useRef<HTMLDivElement | null>(null)
  const bottomReserve = useBottomReserve(cardRef, [bigMap])
  const { containerRef, scale, pan, handlers } = useMapPanZoom(MAP_NATIVE_SIZE, { fit: !bigMap, fitInset: mapFrameInset(bottomReserve) })

  // หีบของวันนี้ยังไม่ได้เปิด (เช่นปิดเควสก่อนแตะหีบ) — เปิดต่อที่นี่ได้ 1 ครั้ง
  const confirmDay = useCallback(() => recordStepDay(day.date, day.steps, day.goal), [day.date, day.steps, day.goal])
  const chest = useStepChest(day.date, day.goalMet, confirmDay)
  const over = Math.max(0, day.steps - day.goal)

  return (
    <div
      className={`step-journey-game is-route-complete${bigMap ? '' : ' is-map-framed'}`}
      ref={containerRef}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
    >
      {!bigMap && <MapStars />}
      {mapDef && (
        <div
          className="step-journey-game__map-canvas"
          style={{
            width: MAP_NATIVE_SIZE.width, height: MAP_NATIVE_SIZE.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            '--mf-radius': `${16 / Math.max(scale, 0.01)}px`,
          } as React.CSSProperties}
        >
          <div className="sjg-map-layer">
            <MapPathRenderer mapDef={mapDef} progressPct={100} />
            <CatCompanion mapDef={mapDef} progressPct={100} />
            {chest.ready && <StepChestMarker mapDef={mapDef} onOpen={() => { void chest.open() }} disabled={chest.popupOpen} />}
          </div>
        </div>
      )}

      {mapDef && !bigMap && <MapFrame pan={pan} scale={scale} title={mapDef.name} />}

      {bigMap ? (
        <button type="button" className="sjg-bigmap-back" onPointerDown={(e) => e.stopPropagation()} onClick={() => setBigMap(false)}>‹ กลับ</button>
      ) : (
        <div ref={cardRef} className="sjg-done-card" onPointerDown={(e) => e.stopPropagation()}>
          <div className="sjg-done-card__title">✅ เดินถึงเส้นชัยแล้ว{mapDef ? ` · ${mapDef.name}` : ''}</div>
          <div className="sjg-done-card__steps">
            {/* ก้าวจริงทั้งหมดของวันนี้ ไม่ใช่ตัวเลขเป้า */}
            <b>{day.steps.toLocaleString()}</b> ก้าว
            {over > 0 && <span className="sjg-done-card__over">เกินเป้า +{over.toLocaleString()}</span>}
          </div>
          <div className="sjg-done-card__goal">เป้าวันนี้ {day.goal.toLocaleString()} ก้าว · พรุ่งนี้มาเลือกแผนที่ใหม่กันนะ</div>
          <div className="sjg-done-card__actions">
            <button type="button" className="sjg-done-card__btn sjg-done-card__btn--ghost" onClick={onClose}>กลับ</button>
            <button type="button" className="sjg-done-card__btn" onClick={() => setBigMap(true)} disabled={!mapDef}>🗺️ ดูแผนที่</button>
          </div>
        </div>
      )}

      {chest.popupOpen && (
        <StepChestPopup reward={chest.popupReward} error={chest.error} onClose={chest.closePopup} onRetry={() => { void chest.open() }} />
      )}

      <button className="step-journey-game__close-btn" onClick={onClose} title="ปิด" aria-label="ปิด"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>
    </div>
  )
}
