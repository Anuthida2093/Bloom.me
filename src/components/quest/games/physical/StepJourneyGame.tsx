import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import type { JourneyRecord } from '../../../../types.journey'
import { useAppContext } from '../../../../context/AppContext'
import { useStepTracker } from '../../../../hooks/useStepTracker'
import { useMapPanZoom } from '../../../../hooks/useMapPanZoom'
import { JOURNEY_MAPS } from '../../../../config/journeyMaps'
import { calcDailyStepTarget, calcMapTotalStepsTarget, calcProportionalRewards } from '../../../../config/journeyRules'
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
import { MAP_NATIVE_SIZE } from './journeyPathMath'
import MapPathRenderer from './MapPathRenderer'
import CatCompanion from './CatCompanion'
import WeatherEffectLayer from './WeatherEffectLayer'
import StatsOverlay from './StatsOverlay'
import MapFogTransition from './MapFogTransition'
import DestinationPicker from './DestinationPicker'
import { BADGE_ICONS } from '../../../../config/iconAssets'
import { getStepJourneyDaysDone, getTodayJourneySteps, recordJourneySteps, resetStepJourneyDays, STEP_JOURNEY_DAYS } from '../../../../utils/stepJourneyDays'
import '../games.css'
import './StepJourneyGame.css'
import '../../../leaderboard/leaderboardRow.css'

export default function StepJourneyGame({ finish, exit }: QuestGameProps) {
  const { userData, logActivity, updateProfile } = useAppContext()

  /** [แก้ตามที่ระบุ] ยืนยันเปลี่ยนจุดหมาย — การ์ดกลางจอแบบกระดานจัดอันดับ แทน window.confirm ของเบราว์เซอร์ */
  const [confirmReset, setConfirmReset] = useState(false)
  const [journey, setJourney] = useState<JourneyRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [failedNotice, setFailedNotice] = useState(false)
  
  const [visualMapIndex, setVisualMapIndex] = useState(0)
  const [isFogging, setIsFogging] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  /** [แก้ตามที่ระบุ] ทริป 3 วัน — จำนวนวันที่เดินครบเป้าหมาย (0/3 → 3/3 = รับรางวัล) + ก้าวรวมของวันนี้ */
  const [daysDone, setDaysDone] = useState(0)
  const [todaySteps, setTodaySteps] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const active = await getActiveJourney()
      if (!cancelled) {
        setJourney(active)
        if (active) { setDaysDone(getStepJourneyDaysDone(active.id)); setTodaySteps(getTodayJourneySteps(active.id)) }
        setLoading(false)
        if (active && active.status !== 'IN_PROGRESS') setShowSummary(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const bmi = userData.bmi ?? 0
  const dailyStepTarget = calcDailyStepTarget(bmi)
  const totalStepsTarget3Days = calcMapTotalStepsTarget(bmi)
  
  const totalProgressPct = journey ? Math.min(100, (journey.progressOnCurrentMapSteps / totalStepsTarget3Days) * 100) : 0
  const activeMapIndex = Math.min(2, Math.floor(totalProgressPct / (100 / 3)))
  const localProgressPct = Math.min(100, (totalProgressPct - (activeMapIndex * (100 / 3))) * 3)

  const visualMapDef = useMemo(() => {
    if (!journey || !journey.routeMapIds) return null
    const mapId = journey.routeMapIds[visualMapIndex]
    return JOURNEY_MAPS.find((m) => m.id === mapId) ?? null
  }, [journey, visualMapIndex])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weather = useMemo(() => getMockWeather(), [journey?.id, visualMapIndex])

  // เรียกใช้ hook ตัวใหม่
  const { containerRef, scale, pan, handlers } = useMapPanZoom(MAP_NATIVE_SIZE)

  useEffect(() => {
    if (journey && activeMapIndex !== visualMapIndex && !isFogging) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFogging(true)
      const t1 = setTimeout(() => setVisualMapIndex(activeMapIndex), 900)
      const t2 = setTimeout(() => setIsFogging(false), 1800)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [activeMapIndex, visualMapIndex, isFogging, journey])

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
  const lastSyncedStepsRef = useRef(0)

  useEffect(() => {
    return () => stopDeviceMotionRef.current?.()
  }, [])

  const pushStepsDelta = (absoluteSessionSteps: number) => {
    if (!journey) return
    const delta = absoluteSessionSteps - lastSyncedStepsRef.current
    if (delta <= 0) return
    lastSyncedStepsRef.current = absoluteSessionSteps
    
    const currentMapId = journey.routeMapIds?.[activeMapIndex] || journey.destinationMapId

    logActivity({ activityType: 'STEPS', durationSeconds: 0, meta: { steps: delta, mapId: currentMapId } })
    // [แก้ตามที่ระบุ] นับเข้าทริปได้วันละไม่เกินเป้าหมายรายวัน → ทริปจบเมื่อสำเร็จครบ 3 วัน (3/3) เท่านั้น
    const { countable, daysDone: nextDays } = recordJourneySteps(journey.id, delta, dailyStepTarget)
    setDaysDone(nextDays)
    setTodaySteps(getTodayJourneySteps(journey.id))
    if (countable <= 0) return
    addSteps(journey.id, countable).then((updated) => {
      setJourney(updated)
      if (updated.status !== 'IN_PROGRESS' || nextDays >= STEP_JOURNEY_DAYS) setShowSummary(true)
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

  const handlePickDestination = (mapId: string) => {
    setFailedNotice(false)
    // [แก้ตามที่ระบุ] หมอกขาวเล่นครั้งเดียว — เดิมเล่นที่หน้าเลือกจุดหมายรอบหนึ่ง แล้วพอแผนที่ขึ้นก็เล่นซ้ำอีกรอบ
    // (คนละ element กัน) ตอนนี้เล่นแค่ตอนแผนที่ขึ้น
    setTransitioning(true)
    startJourney(mapId).then((j) => {
      resetStepJourneyDays(j.id)
      setDaysDone(0)
      setTodaySteps(0)
      setJourney(j)
    })
  }

  const handleClaimRewards = () => {
    if (!journey) return
    const rewards = calcProportionalRewards(journey.progressOnCurrentMapSteps, totalStepsTarget3Days)
    
    updateProfile({ 
      waterDrops: (userData.waterDrops || 0) + rewards.waterDrops,
      coins: (userData.coins || 0) + rewards.coins 
    })
    
    const currentMapId = journey.routeMapIds?.[activeMapIndex] || journey.destinationMapId
    resetStepJourneyDays()
    finish({ 
      destinationMapId: journey.destinationMapId, 
      mapId: currentMapId, 
      status: journey.status, 
      steps: journey.progressOnCurrentMapSteps 
    })
  }

  if (loading) return <div className="step-journey-game step-journey-game--center">กำลังโหลดทริปของคุณ...</div>

  if (!journey || (!visualMapDef && !showSummary)) {
    return (
      <div className="step-journey-game step-journey-game--center">
        {failedNotice && <div className="qg-tag qg-tag--warn step-journey-game__failed-notice">ลองเลือกจุดหมายใหม่ได้เลย</div>}
        <DestinationPicker onPicked={handlePickDestination} />
      </div>
    )
  }

  return (
    <div
      className="step-journey-game"
      ref={containerRef}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
    >
      <div
        className="step-journey-game__map-canvas"
        style={{
          width: MAP_NATIVE_SIZE.width,
          height: MAP_NATIVE_SIZE.height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`
        }}
      >
        {visualMapDef && (
          <>
            <MapPathRenderer mapDef={visualMapDef} progressPct={localProgressPct} />
            <CatCompanion mapDef={visualMapDef} progressPct={localProgressPct} />
            <WeatherEffectLayer weather={weather} />
          </>
        )}
      </div>

      {(transitioning || isFogging) && (
        <MapFogTransition onDone={() => { if (transitioning) setTransitioning(false) }} />
      )}

      {confirmReset && createPortal(
        <div className="sjg-confirm" role="dialog" aria-modal="true" aria-labelledby="sjg-confirm-text" onClick={() => setConfirmReset(false)}>
          <div className="sjg-confirm__card lb-card" onClick={(e) => e.stopPropagation()}>
            <div className="lb-banner sjg-confirm__banner">เปลี่ยนจุดหมาย</div>
            <div className="sjg-confirm__icon" aria-hidden="true">🗺️</div>
            <p id="sjg-confirm-text" className="sjg-confirm__text">ต้องการยกเลิกทริปนี้และเลือกจุดหมายใหม่หรือไม่?</p>
            <p className="sjg-confirm__sub">ความคืบหน้าของทริปนี้จะหายไป</p>
            <div className="sjg-confirm__actions">
              <button className="lb-btn lb-btn--ghost" onClick={() => setConfirmReset(false)}>เดินทางต่อ</button>
              <button className="lb-btn" onClick={() => { setConfirmReset(false); resetStepJourneyDays(); setJourney(null) }}>เริ่มใหม่</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {!showSummary && (
        <div className="step-journey-game__side-panel">
          <StatsOverlay
            todaySteps={todaySteps}
            daysDone={daysDone}
            totalDays={STEP_JOURNEY_DAYS}
            dailyStepTarget={dailyStepTarget}
            bmi={bmi}
            mapName={visualMapDef?.name || ''}
            mapProgressPct={totalProgressPct}
          />

          <div className="step-journey-game__controls">
            <div className="step-journey-game__sync-row">
              {dataSource !== 'manual' && (
                <button
                  className="step-journey-game__sync-btn"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                >
                  {isSyncing ? '⏳' : '🔄'}
                </button>
              )}
              <input
                id="step-journey-input"
                type="text"
                inputMode="numeric"
                value={stepsInput}
                onChange={(e) => handleStepsChange(e.target.value)}
                placeholder={`เช่น ${dailyStepTarget}`}
                className="qg-input step-journey-game__step-input"
              />
            </div>
            {syncError && <p className="qg-tag qg-tag--danger step-journey-game__sync-error">⚠️ {syncError}</p>}
          </div>

          <button 
            className="step-journey-game__reset-btn" 
            onClick={() => setConfirmReset(true)}
          >
            เปลี่ยนจุดหมาย (เริ่มใหม่)
          </button>
        </div>
      )}

      {showSummary && journey && (
        <div className="sjg-summary-overlay">
          <div className="sjg-summary-card">
            <h2 className="sjg-summary-title">🌟 สรุปทริปการเดินทาง 🌟</h2>
            <p className="sjg-summary-desc">คุณเดินทางมาถึงจุดหมายหรือครบกำหนดเวลาแล้ว!</p>
            
            <div className="sjg-summary-progress">
              <span>ความคืบหน้าภาพรวม</span>
              <div className="sjg-progress-bar">
                <div className="sjg-progress-fill" style={{ width: `${totalProgressPct}%` }}></div>
              </div>
              <span className="sjg-progress-text">{Math.round(totalProgressPct)}%</span>
            </div>

            <div className="sjg-reward-box">
              <span>ได้รับรางวัลตามสัดส่วน:</span>
              <div className="sjg-reward-items">
                <span className="sjg-reward-item">
                  <img src={BADGE_ICONS.water} alt="Water" className="icon-img--reward" /> 
                  +{calcProportionalRewards(journey.progressOnCurrentMapSteps, totalStepsTarget3Days).waterDrops}
                </span>
                <span className="sjg-reward-item">
                  <img src={BADGE_ICONS.coins} alt="Coins" className="icon-img--reward" /> 
                  +{calcProportionalRewards(journey.progressOnCurrentMapSteps, totalStepsTarget3Days).coins}
                </span>
              </div>
            </div>

            <button className="sjg-summary-btn" onClick={handleClaimRewards}>
              รับรางวัลและเลือกจุดหมายใหม่
            </button>
          </div>
        </div>
      )}

      {!showSummary && <button className="step-journey-game__close-btn" onClick={exit} title="ปิด" aria-label="ปิด"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>}
    </div>
  )
}