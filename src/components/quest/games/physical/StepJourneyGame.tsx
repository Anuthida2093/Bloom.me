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
import '../games.css'
import './StepJourneyGame.css'

export default function StepJourneyGame({ finish, exit }: QuestGameProps) {
  const { userData, logActivity, updateProfile } = useAppContext()

  const [journey, setJourney] = useState<JourneyRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [failedNotice, setFailedNotice] = useState(false)
  
  const [visualMapIndex, setVisualMapIndex] = useState(0)
  const [isFogging, setIsFogging] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const active = await getActiveJourney()
      if (!cancelled) {
        setJourney(active)
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
  const sessionSteps = Number(stepsInput) || 0

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
    addSteps(journey.id, delta).then((updated) => {
      setJourney(updated)
      if (updated.status !== 'IN_PROGRESS') setShowSummary(true)
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
    setTransitioning(true)
    startJourney(mapId).then(setJourney)
  }

  const handleClaimRewards = () => {
    if (!journey) return
    const rewards = calcProportionalRewards(journey.progressOnCurrentMapSteps, totalStepsTarget3Days)
    
    updateProfile({ 
      waterDrops: (userData.waterDrops || 0) + rewards.waterDrops,
      coins: (userData.coins || 0) + rewards.coins 
    })
    
    const currentMapId = journey.routeMapIds?.[activeMapIndex] || journey.destinationMapId
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
        {transitioning && <MapFogTransition onDone={() => setTransitioning(false)} />}
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

      <div className="step-journey-game__pill-header">
        <span aria-hidden="true">🚶</span>
        <span>ก้าวเพื่อสุขภาพ</span>
      </div>

      {(transitioning || isFogging) && (
        <MapFogTransition onDone={() => { if (transitioning) setTransitioning(false) }} />
      )}

      {!showSummary && (
        <div className="step-journey-game__side-panel">
          <StatsOverlay
            todaySteps={sessionSteps}
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
            onClick={() => {
              if (window.confirm('คุณต้องการยกเลิกทริปนี้และเลือกจุดหมายใหม่หรือไม่? ความคืบหน้าจะหายไป')) {
                setJourney(null)
              }
            }}
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

      {!showSummary && <button className="step-journey-game__close-btn" onClick={exit}>✕</button>}
    </div>
  )
}