import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import type { JourneyRecord, JourneyStatus } from '../../../../types.journey'
import { useAppContext } from '../../../../context/AppContext'
import { useStepTracker } from '../../../../hooks/useStepTracker'
import { useMapPanZoom } from '../../../../hooks/useMapPanZoom'
import { JOURNEY_MAPS } from '../../../../config/journeyMaps'
import { calcDailyStepTarget, calcMapTotalStepsTarget } from '../../../../config/journeyRules'
import { getMockWeather } from '../../../../config/weatherMock'
import { getActiveJourney, startJourney, addSteps } from '../../../../services/api/journey.api'
import {
  type StepDataSource,
  isGoogleFitConfigured,
  isDeviceMotionSupported,
  syncStepsFromGoogleFit,
  startDeviceMotionTracking,
  describeStepSyncError,
} from '../../../../services/stepTracking'
import { getPointAtProgress, MAP_NATIVE_SIZE } from './journeyPathMath'
import MapPathRenderer from './MapPathRenderer'
import CatCompanion from './CatCompanion'
import WeatherEffectLayer from './WeatherEffectLayer'
import StatsOverlay from './StatsOverlay'
import MapFogTransition from './MapFogTransition'
import DestinationPicker from './DestinationPicker'
import '../games.css'
import './StepJourneyGame.css'

/*============================================================================*\
  StepJourneyGame.tsx — เควส "ก้าวเพื่อสุขภาพ" โฉมใหม่ — เลือกแผนที่ปลายทางจาก 8 ใบ แล้วเดินไป
  ถึงตามจำนวนก้าวที่เดินจริง (หรือกรอกเอง)
  ────────────────────────────────────────────────────────────────────────────
  [สถาปัตยกรรม] ผ่าน questGameRegistry.ts (gameKey: 'step-journey') เหมือนเกมอื่นในระบบทุกจุด
  เล่นอยู่ใน .game-shell__stage (ไม่ใช่หน้าเต็มจอแบบ SPECIAL_QUEST อีกต่อไป — ของเดิมที่เข้าใจว่า
  QuestPlayModal เป็นการ์ดเล็ก 460px นั้นล้าสมัยแล้ว จริงๆ GameShell ให้พื้นที่เต็มกรอบเขียวอยู่แล้ว
  แค่ถูกจำกัดความกว้างที่ 620px + มี header/reward screen ให้แล้วในตัว จึงไม่ต้องทำหน้าจอ/ฉาก
  รับรางวัลของตัวเองซ้ำ — เรียก finish() ครั้งเดียวตอนถึงจุดหมายแล้ว GameShell จัดการที่เหลือ)

  [reward cadence] ทริปนี้ใช้เวลาหลายวันกว่าจะถึงจุดหมาย ไม่ใช่ session เดียวจบเหมือนเควสอื่น —
  finish() จะถูกเรียกก็ต่อเมื่อ "ถึงจุดหมายจริง" เท่านั้น (progressOnCurrentMapSteps ครบตาม
  calcMapTotalStepsTarget) เปิดเกมระหว่างทาง/ตอนยังไม่เลือกปลายทาง จะปิดด้วย exit() ของ GameShell
  เฉยๆ (ปุ่ม ✕ มุมขวาบนของ header) ไม่มีผลอะไรกับทริปที่เดินค้างอยู่ — journey ยังคงอยู่ใน mockDb
  รอเปิดเกมใหม่มาเดินต่อได้ ทริปที่เลย deadline ไปแล้วโดยไม่ถึงจุดหมาย (FAILED) ไม่ได้รางวัลเลย
  (ไม่เรียก finish()) แค่เด้งกลับไปเลือกปลายทางใหม่ได้ทันที

  [เหตุผลที่ตั้ง maxPerDay:1 + isRepeatable:true ใน questCatalog.ts] isCompleted() ของระบบ
  ปัจจุบัน (QuestSection.tsx) เช็ค "เคยสำเร็จหรือยังทุกครั้งที่ผ่านมา" แบบไม่กรองวันที่เลย — เควส
  ที่ไม่มี maxPerDay จะเล่นซ้ำไม่ได้อีกเลยหลังสำเร็จครั้งแรก (ดูสรุปท้ายบทสนทนา) ทริปนี้ต้องเริ่ม
  ใหม่ได้เรื่อยๆ ทุกครั้งที่ถึงจุดหมาย จึงต้องมี maxPerDay กำกับไว้ (ในทางปฏิบัติจะไม่มีทาง "สำเร็จ
  เกิน 1 ครั้ง/วัน" อยู่แล้วเพราะทริปนึงใช้เวลาหลายวัน — maxPerDay:1 แค่ใช้ปลดล็อกเงื่อนไข "เคย
  สำเร็จแล้วเล่นซ้ำไม่ได้" เท่านั้น ไม่ได้คาดหวังว่าจะสำเร็จวันละครั้งจริงๆ)
\*============================================================================*/

const BASE_DAILY_STEP_TARGET = 8000

export default function StepJourneyGame({ finish, exit }: QuestGameProps) {
  const { userData, logActivity } = useAppContext()

  const [journey, setJourney] = useState<JourneyRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [failedNotice, setFailedNotice] = useState(false)
  const [arrivalStatus, setArrivalStatus] = useState<JourneyStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const active = await getActiveJourney()
      if (!cancelled) { setJourney(active); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const mapDef = useMemo(() => {
    if (!journey) return null
    return JOURNEY_MAPS.find((m) => m.id === journey.currentMapId) ?? null
  }, [journey])

  const bmi = userData.bmi
  const dailyStepTarget = calcDailyStepTarget(bmi ?? 0)
  const mapTotalStepsTarget = calcMapTotalStepsTarget(bmi ?? 0)
  const mapProgressPct = journey ? Math.min(100, (journey.progressOnCurrentMapSteps / mapTotalStepsTarget) * 100) : 0

  // สภาพอากาศสุ่มครั้งเดียวต่อทริป (ไม่ใช่ทุก render) — journey?.id ใช้เป็น "คีย์" ให้คำนวณใหม่
  // เฉพาะตอนเริ่มทริปใหม่จริงๆ เท่านั้น (ไม่ได้ถูกใช้ในตัวฟังก์ชันเองเลย eslint จึงมองว่าเป็น
  // dependency ที่ "ไม่จำเป็น" แต่จริงๆ จำเป็นสำหรับ invalidate cache ตามที่ตั้งใจ)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weather = useMemo(() => getMockWeather(), [journey?.id])

  const catPct = useMemo(
    () => (mapDef ? getPointAtProgress(mapDef, mapProgressPct) : { x: 50, y: 50 }),
    [mapDef, mapProgressPct],
  )
  const { containerRef, zoom, pan, autoFollow, refollow, handlers } = useMapPanZoom(catPct, MAP_NATIVE_SIZE)

  const handlePickDestination = (mapId: string) => {
    setFailedNotice(false)
    setTransitioning(true)
    startJourney(mapId).then(setJourney)
  }

  // ── ระบบซิงก์ก้าว — เรียงลำดับ fallback เดียวกับเฟส 3 (ก้าวเพื่อสุขภาพเดิม): Google Fit →
  // Health Connect/HealthKit (native) → DeviceMotion → กรอกมือ ──
  const { nativePlatform, requestNativeSteps } = useStepTracker()
  const [dataSource, setDataSource] = useState<StepDataSource>(() => {
    if (isGoogleFitConfigured()) return 'google-fit'
    if (nativePlatform) return nativePlatform
    if (isDeviceMotionSupported()) return 'device-motion'
    return 'manual'
  })
  const [stepsInput, setStepsInput] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCountingMotion, setIsCountingMotion] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const stopDeviceMotionRef = useRef<(() => void) | null>(null)
  /** ก้าวสะสม "ในเซสชันนี้" ล่าสุดที่ถูกส่งเข้า addSteps() ไปแล้ว — ใช้คำนวณส่วนต่าง (delta)
   *  ก่อนส่งเพิ่ม กัน addSteps() ถูกเรียกซ้ำด้วยยอดสะสมเดิมทุกครั้งที่ dataSource คืนค่ายอดรวม */
  const lastSyncedStepsRef = useRef(0)
  const sessionSteps = Number(stepsInput) || 0

  useEffect(() => {
    return () => stopDeviceMotionRef.current?.()
  }, [])

  const pushStepsDelta = (absoluteSessionSteps: number) => {
    if (!journey) return
    const delta = absoluteSessionSteps - lastSyncedStepsRef.current
    if (delta <= 0) return
    lastSyncedStepsRef.current = absoluteSessionSteps
    logActivity({ activityType: 'STEPS', durationSeconds: 0, meta: { steps: delta, mapId: journey.currentMapId } })
    addSteps(journey.id, delta).then((updated) => {
      if (updated.status === 'FAILED') {
        setJourney(null)
        setFailedNotice(true)
        return
      }
      setJourney(updated)
      if (updated.status !== 'IN_PROGRESS') setArrivalStatus(updated.status)
    })
  }

  const handleStepsChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '')
    setStepsInput(digitsOnly)
    pushStepsDelta(Number(digitsOnly) || 0)
  }

  const handleSyncClick = async () => {
    setSyncError(null)

    if (dataSource === 'google-fit') {
      setIsSyncing(true)
      try {
        const reading = await syncStepsFromGoogleFit()
        setStepsInput(String(reading.steps))
        pushStepsDelta(reading.steps)
      } catch (err) {
        setDataSource(isDeviceMotionSupported() ? 'device-motion' : 'manual')
        setSyncError(describeStepSyncError(err))
      } finally {
        setIsSyncing(false)
      }
      return
    }

    if (dataSource === 'health-connect' || dataSource === 'healthkit') {
      setIsSyncing(true)
      try {
        const reading = await requestNativeSteps()
        if (!reading) throw new Error('NATIVE_HEALTH_QUERY_FAILED')
        setStepsInput(String(reading.steps))
        pushStepsDelta(reading.steps)
      } catch (err) {
        setDataSource(isDeviceMotionSupported() ? 'device-motion' : 'manual')
        setSyncError(describeStepSyncError(err))
      } finally {
        setIsSyncing(false)
      }
      return
    }

    if (dataSource === 'device-motion') {
      if (isCountingMotion) {
        stopDeviceMotionRef.current?.()
        stopDeviceMotionRef.current = null
        setIsCountingMotion(false)
        return
      }
      setIsSyncing(true)
      try {
        const stop = await startDeviceMotionTracking((count) => {
          setStepsInput(String(count))
          pushStepsDelta(count)
        })
        stopDeviceMotionRef.current = stop
        setIsCountingMotion(true)
      } catch (err) {
        setDataSource('manual')
        setSyncError(describeStepSyncError(err))
      } finally {
        setIsSyncing(false)
      }
    }
  }

  // useCallback กันปัญหา identity เปลี่ยนทุก render (เช่นตอน useMapPanZoom อัปเดต size จาก
  // ResizeObserver) ทำให้ MapFogTransition (ผูก effect กับ [onDone]) เริ่มนับเวลาใหม่ซ้ำๆ จน
  // หมอกไม่จางออกสักที — dependency array อ้างค่าที่ "ไม่เปลี่ยนระหว่างที่หมอกกำลังแสดงอยู่" จริง
  const handleTransitionFogDone = useCallback(() => setTransitioning(false), [])
  const handleArrivalFogDone = useCallback(() => {
    if (!journey || !arrivalStatus) return
    finish({ destinationMapId: journey.destinationMapId, mapId: journey.currentMapId, status: arrivalStatus, steps: journey.progressOnCurrentMapSteps })
  }, [journey, arrivalStatus, finish])

  if (loading) {
    return (
      <div className="step-journey-game step-journey-game--center">
        <div className="qg-center step-journey-game__loading">กำลังโหลดทริปของคุณ...</div>
      </div>
    )
  }

  if (!journey || !mapDef) {
    return (
      <div className="step-journey-game step-journey-game--center">
        {failedNotice && (
          <div className="qg-tag qg-tag--warn step-journey-game__failed-notice">
            ⏱️ ทริปก่อนหน้าหมดเวลาแล้ว ลองเลือกจุดหมายใหม่ได้เลย
          </div>
        )}
        <DestinationPicker onPicked={handlePickDestination} />
        {transitioning && <MapFogTransition onDone={handleTransitionFogDone} />}
      </div>
    )
  }

  return (
    <div className="step-journey-game step-journey-game--map">
      <div
        className="step-journey-game__map-viewport"
        ref={containerRef}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
      >
        <div
          className="step-journey-game__map-zoom"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <MapPathRenderer mapDef={mapDef} progressPct={mapProgressPct} />
          <CatCompanion mapDef={mapDef} progressPct={mapProgressPct} />
          <WeatherEffectLayer weather={weather} />
        </div>

        {!autoFollow && (
          <button className="step-journey-game__refollow-btn" onClick={refollow}>📍 กลับไปตามแมว</button>
        )}

        {(transitioning || arrivalStatus) && (
          <MapFogTransition onDone={transitioning ? handleTransitionFogDone : handleArrivalFogDone} />
        )}
      </div>

      {/* [แก้รอบนี้ — ปรับ layout] แผงสถิติ+ปุ่มควบคุมชิดขวา แนวเดียวกัน (เดิมเป็นบล็อกเต็มความ
          กว้างลอยอยู่ใต้แผนที่ทั้งหมด) — ดู step-journey-game__side-panel ใน .css สำหรับ
          breakpoint มือถือ (สลับมาเรียงเต็มความกว้างใต้แผนที่แทนการวางทับขวาบน) */}
      <div className="step-journey-game__side-panel">
        <StatsOverlay
          todaySteps={sessionSteps}
          dailyStepTarget={dailyStepTarget}
          bmi={bmi}
          mapName={mapDef.name}
          mapProgressPct={mapProgressPct}
        />

        <div className="step-journey-game__controls">
          {/* [แก้รอบนี้ — feedback รอบ 2: แผงถูก action menu bar บัง] ย่อ layout ให้กระชับขึ้น
              ตามที่ระบุ — ปุ่มซิงก์ + ช่องกรอกก้าวอยู่แถวเดียวกัน (ปุ่มเหลือแค่ไอคอน ใช้ title/
              aria-label บอกความหมายแทนข้อความยาวเดิม) และตัดพารากราฟอธิบายแหล่งข้อมูลที่แสดง
              ตลอดเวลาออก (โชว์เฉพาะตอน error จริงๆ) — ประหยัดพื้นที่แนวตั้งไปมากพอที่จะไม่โดน
              action menu bar บังแล้วในทุกความสูงจอที่ทดสอบ */}
          <div className="step-journey-game__sync-row">
            {dataSource !== 'manual' && (
              <button
                className="step-journey-game__sync-btn"
                onClick={handleSyncClick}
                disabled={isSyncing}
                title={
                  isSyncing ? 'กำลังซิงก์...'
                    : dataSource === 'google-fit' ? 'ซิงก์จาก Google Fit'
                    : dataSource === 'health-connect' ? 'ซิงก์จาก Health Connect'
                    : dataSource === 'healthkit' ? 'ซิงก์จาก Apple Health'
                    : isCountingMotion ? 'หยุดนับก้าว' : 'เริ่มนับก้าวจากเซ็นเซอร์'
                }
              >
                {isSyncing ? '⏳' : dataSource === 'device-motion' ? (isCountingMotion ? '⏸️' : '▶️') : '🔄'}
              </button>
            )}
            <input
              id="step-journey-input"
              type="text"
              inputMode="numeric"
              value={stepsInput}
              onChange={(e) => handleStepsChange(e.target.value)}
              placeholder={`ก้าววันนี้ เช่น ${BASE_DAILY_STEP_TARGET}`}
              aria-label="กรอกจำนวนก้าวที่เดินได้วันนี้"
              className="qg-input step-journey-game__step-input"
            />
          </div>

          {syncError && <p className="qg-tag qg-tag--danger step-journey-game__sync-error">⚠️ {syncError}</p>}

          <button className="step-journey-game__exit-btn" onClick={exit}>ออกก่อน (เดินต่อทีหลังได้)</button>
        </div>
      </div>
    </div>
  )
}
