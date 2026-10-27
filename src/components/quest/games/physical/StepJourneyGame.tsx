import { API_MODE } from '../../../../services/http'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { QuestGameProps } from '../../../../types.mental'
import type { JourneyRecord } from '../../../../types.journey'
import { useAppContext } from '../../../../context/AppContext'
import { useStepTracker } from '../../../../hooks/useStepTracker'
import { mapFrameInset, useBottomReserve, useMapPanZoom } from '../../../../hooks/useMapPanZoom'
import { isMapUnlocked, JOURNEY_MAPS } from '../../../../config/journeyMaps'
import { calcDailyStepTarget, calcMapTotalStepsTarget, calcProportionalRewards } from '../../../../config/journeyRules'
import { getMockWeather } from '../../../../config/weatherMock'
import { getActiveJourney, startJourney, addSteps, abandonJourney, clearPendingJourneyClaim } from '../../../../services/api/journey.api'
import { getStepHistory, localDateKey, recordStepDay, type StepDayRecord } from '../../../../services/api/progression.api'
import { queryKeys } from '../../../../services/queryKeys'
import { useProgression } from '../../../../hooks/useProgression'
import {
  type StepDataSource,
  isGoogleFitConfigured,
  isDeviceMotionSupported,
  syncStepsFromGoogleFit,
  startDeviceMotionTracking,
  describeStepSyncError,
} from '../../../../services/stepTracking'
import { MAP_NATIVE_SIZE, mapNativeSize, poseAtPathPct, samplePath, withLivePath } from './journeyPathMath'
import MapPathRenderer from './MapPathRenderer'
import CatCompanion from './CatCompanion'
import { OWL_AVATAR_ICON } from '../../../../config/iconAssets'
import MiniMap from './MiniMap'
import WeatherEffectLayer from './WeatherEffectLayer'
import MapScenery, { MapAmbience } from './MapScenery'
import StatsOverlay from './StatsOverlay'
import MapFogTransition from './MapFogTransition'
import DestinationPicker from './DestinationPicker'
import { StepChestMarker, StepChestPopup } from './StepChest'
import MapFrame, { MapStars } from './MapFrame'
import DiaryRewardScroll from './DiaryRewardScroll'
import CompletedJourneyMap from './CompletedJourneyMap'
import CompletedTripView from './CompletedTripView'
import { useStepChest } from '../../../../hooks/useStepChest'
import { holdStepSettlement, waitForStepSettlement } from '../../../../services/stepSettlement'
import { getJourneyDaySteps, getTodayJourneySteps, recordJourneySteps, resetStepJourneyDays } from '../../../../utils/stepJourneyDays'
import { calculateStepReward, getDailyStepGoal, STEP_BONUS_LABEL, classifyStepBmiTier } from '../../../../config/stepGoalByBmi'
import { formatDistance, stepsToDistanceMeters } from '../../../../utils/strideDistance'
import GameLoadingScreen from '../../../common/GameLoadingScreen'
import { createProgressTracker } from '../../../../utils/progressTracker'
import { generatedArtSize, isMapArtReady, stopMapArtListener, warmMapArt } from './mapArtLoader'
import { stopMapArtProgress } from './mapgen/renderMapArt'
import { readJourneySnapshot, writeJourneySnapshot } from './stepQuestWarmup'
import '../games.css'
import './StepJourneyGame.css'
import '../../../leaderboard/leaderboardRow.css'

const PANEL_OPEN_KEY = 'bloom.stepJourney.panelOpen'

/** ชื่อปุ่มซิงค์ตามแหล่งข้อมูลก้าว */
const SYNC_LABEL: Record<StepDataSource, string> = {
  'google-fit': 'ซิงค์ก้าวจาก Google Fit',
  healthkit: 'ซิงค์ก้าวจาก Apple Health',
  'health-connect': 'ซิงค์ก้าวจาก Health Connect',
  'device-motion': 'เริ่มนับก้าวด้วยเซนเซอร์',
  manual: 'กรอกก้าวเอง',
}

/*  ทริปรายวัน: 1 วัน = 1 ทริป = 1 แผนที่ เป้าหมาย = ก้าวรายวันตาม BMI
    ถึงเป้า → แผนที่ย่อพอดีจอ + หีบสมบัติ 1 ใบที่เส้นชัย (แตะเปิด ผลสุ่มจากเซิร์ฟเวอร์ — StepChest.tsx)
    เปิดหีบแล้ว/หมดวัน → ม้วนกระดาษไดอะรี่สรุปรางวัลวันนี้ (DiaryRewardScroll) วันที่ถึงเป้าบันทึกเข้าบัญชี
    (progression.api) สะสมไปหา 21 วัน — หลังจากนั้นเปิดม้วนกระดาษมีโอกาสได้ไอเทมแลกซื้อ */
export default function StepJourneyGame({ finish, exit }: QuestGameProps) {
  const { userData, logActivity, updateProfile, settings } = useAppContext()
  const queryClient = useQueryClient()
  const progression = useProgression()

  /** [แก้ตามที่ระบุ] ยืนยันเปลี่ยนจุดหมาย — การ์ดกลางจอแบบกระดานจัดอันดับ แทน window.confirm ของเบราว์เซอร์ */
  const [confirmReset, setConfirmReset] = useState(false)
  /** [แก้ตามที่ระบุ — เปิดเควสทันที] วาดจากสแนปช็อตทริปในเครื่องก่อน แล้วค่อยอัปเดตเมื่อเซิร์ฟเวอร์ตอบ
   *  (stale-while-revalidate) — ไม่ต้องรอเน็ตก่อนเห็นแผนที่ */
  const [journey, setJourney] = useState<JourneyRecord | null>(() => readJourneySnapshot(userData.id))
  const [loading, setLoading] = useState(() => readJourneySnapshot(userData.id) === null)
  /** เปอร์เซ็นต์โหลดจริง: ทริป (น้ำหนัก 1) + ภาพแผนที่ (น้ำหนัก 7 — ดาวน์โหลด/ถอดรหัส หรือวาดแผนที่โค้ด) */
  const [loadTracker] = useState(() => {
    const t = createProgressTracker({ journey: 1, art: 7 })
    if (!loading) t.set('journey', 1)
    return t
  })
  const [loadPct, setLoadPct] = useState(() => loadTracker.value())
  const [artReadyFor, setArtReadyFor] = useState<string | null>(null)
  /** วันนี้เดินถึงเป้าและรับรางวัลแล้ว — เปิดเควสซ้ำจะเห็นแผนที่เดิม (CompletedTripView) */
  const [completedToday, setCompletedToday] = useState<StepDayRecord | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [failedNotice, setFailedNotice] = useState(false)
  /** [ใหม่] ทริปค้างบนแผนที่ที่ยังไม่ถึงเลเวลปลดล็อก → ปิดทริปแล้วให้เลือกแผนที่ใหม่ (ผู้ใช้เลือก: ล็อกทันที) */
  const [lockedNotice, setLockedNotice] = useState<string | null>(null)

  const [visualMapIndex, setVisualMapIndex] = useState(0)
  const [isFogging, setIsFogging] = useState(false)
  /** ผลซิงค์ล่าสุด — โชว์สถานะใต้ปุ่มซิงค์ */
  const [lastSync, setLastSync] = useState<{ at: Date; added: number } | null>(null)
  /** แถบด้านขวา (สถิติ + ปุ่มซิงค์ก้าว) เปิด/ปิดได้ — จำค่าไว้ในเครื่อง เปิดเควสครั้งหน้าคงสถานะเดิม
   *  [แก้ตามที่ระบุ] ค่าเริ่มต้น = ปิด (เห็นแค่ปุ่มรูป OwlAvatar) แบบเดียวกับแผงข้อมูลต้นไม้ ทุกขนาดจอ */
  const [panelOpen, setPanelOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_OPEN_KEY) === '1' } catch { return false }
  })
  const togglePanel = () => setPanelOpen((open) => {
    try { localStorage.setItem(PANEL_OPEN_KEY, open ? '0' : '1') } catch { /* storage ปิดอยู่ */ }
    return !open
  })
  const [todaySteps, setTodaySteps] = useState(0)

  useEffect(() => {
    let cancelled = false
    // หน้าเควสเปิดอยู่ = ผู้เล่นรับรางวัลเอง ระบบไม่ปิดรอบอัตโนมัติแทน (services/stepSettlement.ts)
    const release = holdStepSettlement()
    ;(async () => {
      // ปิดรอบทริปเมื่อวาน (เปิดแอปแล้วกดเข้าเควสทันที) ให้เสร็จก่อน — กันรับรางวัลทริปเดียวกันซ้ำ
      await waitForStepSettlement().catch(() => {})
      const active = await getActiveJourney()
      // ไม่มีทริปค้าง แต่วันนี้เดินถึงเป้าไปแล้ว → เปิดแผนที่เดิมของวันนี้ (สำเร็จ) แทนหน้าเลือกแผนที่ใหม่
      const today = active ? null : await getStepHistory()
        .then((list) => list.find((d) => d.date === localDateKey() && d.goalMet && d.mapId) ?? null)
        .catch(() => null)
      if (!cancelled) {
        setJourney(active)
        setCompletedToday(today)
        if (active) setTodaySteps(getTodayJourneySteps(active.id))
        setLoading(false)
        setLoadPct(loadTracker.set('journey', 1))
      }
    })()
    return () => { cancelled = true; release() }
  }, [loadTracker])

  const bmi = userData.bmi ?? 0
  const dailyStepTarget = calcDailyStepTarget(bmi)
  const tripStepTarget = calcMapTotalStepsTarget(bmi)

  // ทริปรายวันมีแผนที่เดียว (ทริปเก่าก่อนเปลี่ยนเป็นรายวันอาจมี 3 แผนที่ — แบ่งความคืบหน้าเท่าๆ กัน)
  const routeLength = Math.max(1, journey?.routeMapIds?.length ?? 1)
  const segmentPct = 100 / routeLength
  const totalProgressPct = journey ? Math.min(100, (journey.progressOnCurrentMapSteps / tripStepTarget) * 100) : 0
  const activeMapIndex = Math.min(routeLength - 1, Math.floor(totalProgressPct / segmentPct))
  const localProgressPct = Math.min(100, (totalProgressPct - activeMapIndex * segmentPct) * routeLength)
  const reachedGoal = totalProgressPct >= 100

  const visualMapDef = useMemo(() => {
    if (!journey || !journey.routeMapIds) return null
    const mapId = journey.routeMapIds[visualMapIndex]
    return JOURNEY_MAPS.find((m) => m.id === mapId) ?? null
  }, [journey, visualMapIndex])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weather = useMemo(() => getMockWeather(), [journey?.id, visualMapIndex])

  // เก็บสแนปช็อตทริปล่าสุดไว้วาดทันทีครั้งหน้า
  useEffect(() => { if (!loading) writeJourneySnapshot(userData.id, journey) }, [journey, loading, userData.id])

  /* [แก้ตามที่ระบุ — ไม่มีสถานะครึ่งๆ] ภาพแผนที่ยังไม่พร้อม → หน้าโหลดเขียวเต็มจอ + เปอร์เซ็นต์จริง
     ไม่แสดงนกฮูก/แถบข้อมูลลอยบนพื้นเขียว · พร้อมแล้วฉากโผล่ทั้งฉากพร้อมกัน */
  const artReady = !!visualMapDef && (artReadyFor === visualMapDef.id || isMapArtReady(visualMapDef))
  useEffect(() => {
    if (!visualMapDef || isMapArtReady(visualMapDef)) return
    let alive = true
    const onProgress = (p: number) => { if (alive) setLoadPct(loadTracker.set('art', p)) }
    void warmMapArt(visualMapDef, onProgress).then(() => {
      if (!alive) return
      setLoadPct(loadTracker.set('art', 1))
      setArtReadyFor(visualMapDef.id)
    })
    return () => {
      alive = false
      stopMapArtListener(visualMapDef, onProgress)
      if (visualMapDef.generated) stopMapArtProgress(visualMapDef.generated, generatedArtSize('scene'), onProgress)
    }
  }, [visualMapDef, loadTracker])

  const tripDate = journey ? localDateKey(new Date(journey.startedAt)) : null
  /** ยืนยันก้าวของวันทริปเข้าบัญชีก่อนเปิดหีบ — เซิร์ฟเวอร์ตรวจว่าวันนั้นถึงเป้าจริงจากค่านี้ */
  const confirmTripDay = useCallback(async () => {
    if (!journey || !tripDate) return
    const steps = Math.max(getJourneyDaySteps(journey.id, tripDate), journey.progressOnCurrentMapSteps)
    await recordStepDay(tripDate, steps, dailyStepTarget, { mapId: journey.destinationMapId, journeyId: journey.id })
  }, [journey, tripDate, dailyStepTarget])
  // หีบสมบัติ 1 ใบต่อวันที่ถึงเป้า (แทนกล่อง/จุดสำรวจรายจุดเดิม) — ไม่ถึงเป้า = ไม่มีหีบ
  const chest = useStepChest(tripDate, reachedGoal, confirmTripDay)
  /* หน้าสรุปรางวัลประจำวัน: ทริปจบแล้ว + (ถ้าถึงเป้า) เปิดหีบแล้วและปิดป็อปอัปผลแล้ว
     ถึงเป้าแต่ยังไม่เปิดหีบ → ค้างที่แผนที่ (ย่อพอดีจอ) ให้ผู้เล่นแตะหีบก่อน */
  const journeyFinished = !!journey && journey.status !== 'IN_PROGRESS'
  const showSummary = journeyFinished && chest.loaded && !chest.ready && !chest.popupOpen

  // ถึงเป้าแล้ว → ย่อแผนที่ให้เห็นทั้งแผ่น (เส้นทางเต็ม + ตัวละครที่เส้นชัย + หีบ) ในกรอบน่ารัก
  // เว้นด้านล่างให้ป้ายชวนเปิดหีบ + แถบเมนู
  const chestPromptRef = useRef<HTMLDivElement | null>(null)
  const showChestPrompt = chest.ready && !chest.popupOpen
  const bottomReserve = useBottomReserve(chestPromptRef, [showChestPrompt])
  // [แก้ตามที่ระบุ] แผนที่ 9 ใหญ่ 2 เท่า (ลากได้ทุกทิศ) — เปิดมาให้นกฮูกอยู่กลางจอ (ทางเริ่มอยู่ซ้ายล่าง ไม่ใช่กลางล่าง)
  const nativeSize = mapNativeSize(visualMapDef)
  const owlFocusPct = useMemo(() => {
    if (!visualMapDef?.generated) return undefined
    const p = poseAtPathPct(samplePath(withLivePath(visualMapDef)), localProgressPct)
    return { x: p.x, y: p.y }
  }, [visualMapDef, localProgressPct])
  const { containerRef, scale, pan, handlers } = useMapPanZoom(nativeSize, {
    fit: reachedGoal, fitInset: mapFrameInset(bottomReserve), portraitZoom: 1.45, coverSize: MAP_NATIVE_SIZE, initialFocusPct: owlFocusPct,
  })

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
  /** DeviceMotion นับจาก 0 ทุกครั้งที่เริ่มนับ — จำค่าที่ส่งไปแล้วของรอบนับนี้ */
  const motionSentRef = useRef(0)

  useEffect(() => {
    return () => stopDeviceMotionRef.current?.()
  }, [])

  // เปิดเควสค้างไว้จนข้ามเที่ยงคืน — เช็คทุกนาที ถ้าหมดเวลาให้ getActiveJourney ปิดทริปแล้วโชว์หน้าสรุป
  useEffect(() => {
    if (!journey || journey.status !== 'IN_PROGRESS') return
    const id = window.setInterval(() => {
      if (Date.now() <= new Date(journey.deadlineAt).getTime()) return
      getActiveJourney()
        .then((j) => { if (j && j.status !== 'IN_PROGRESS') setJourney(j) })
        .catch(() => { /* ลองใหม่รอบถัดไป */ })
    }, 60_000)
    return () => window.clearInterval(id)
  }, [journey])

  const pushSteps = (delta: number) => {
    if (!journey || delta <= 0) return
    const currentMapId = journey.routeMapIds?.[activeMapIndex] || journey.destinationMapId

    logActivity({ activityType: 'STEPS', durationSeconds: 0, meta: { steps: delta, mapId: currentMapId } })
    // นับเข้าทริปได้ไม่เกินเป้าหมายของวัน (เดินเกินไม่ทำให้แผนที่ทะลุ)
    const { countable } = recordJourneySteps(journey.id, delta, tripStepTarget)
    const todayTotal = getTodayJourneySteps(journey.id)
    setTodaySteps(todayTotal)
    setLastSync({ at: new Date(), added: delta })
    // บันทึกก้าวของวันเข้าบัญชีพร้อมแผนที่ของวันนี้ (เซิร์ฟเวอร์นับวันถึงเป้าเอง — ไม่หายเมื่อเปลี่ยนเครื่อง)
    recordStepDay(localDateKey(), todayTotal, dailyStepTarget, { mapId: journey.destinationMapId, journeyId: journey.id })
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.progression }))
      .catch(() => { /* ส่งใหม่ตอนซิงค์รอบหน้า (เก็บค่ามากสุดฝั่งเซิร์ฟเวอร์) */ })
    if (countable <= 0) return
    addSteps(journey.id, countable)
      .then((updated) => setJourney(updated))
      .catch(() => setSyncError('บันทึกก้าวเข้าทริปไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วกดซิงค์อีกครั้ง'))
  }

  /** Google Fit / Health Connect / HealthKit / ช่องกรอกมือ ให้ "ก้าวรวมทั้งวัน" — นับเฉพาะส่วนที่เกินจาก
   *  ที่บันทึกเข้าทริปไปแล้ววันนี้ (เดิมเทียบกับตัวนับที่เริ่ม 0 ทุกครั้งที่เปิดเควส → ซิงค์ซ้ำ = นับก้าวเดิมซ้ำ) */
  const pushTodayTotal = (todayTotal: number) => {
    if (!journey) return
    pushSteps(todayTotal - getTodayJourneySteps(journey.id))
  }

  /** ช่องกรอกมือ: บันทึกตอนกด Enter/ออกจากช่อง — เดิมยิง API ทุกครั้งที่พิมพ์ตัวเลข 1 ตัว */
  const commitManualSteps = () => {
    const total = Number(stepsInput)
    if (total > 0) pushTodayTotal(total)
  }

  const handleSyncClick = async () => {
    setSyncError(null)

    if (dataSource === 'google-fit') {
      setIsSyncing(true)
      try {
        const reading = await syncStepsFromGoogleFit()
        setStepsInput(String(reading.steps))
        pushTodayTotal(reading.steps)
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
        pushTodayTotal(reading.steps)
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
      motionSentRef.current = 0
      try {
        const stop = await startDeviceMotionTracking((count) => {
          const delta = count - motionSentRef.current
          motionSentRef.current = count
          pushSteps(delta)
          if (journey) setStepsInput(String(getTodayJourneySteps(journey.id)))
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

  // แอป native: ซิงค์ก้าวจาก Health Connect/HealthKit อัตโนมัติครั้งเดียวต่อทริปตอนเปิดเควส
  // (แทน effect เดิมใน useStepTracker ที่ addSteps ก้าวทั้งวันตรงๆ โดยไม่ผ่านเพดานรายวัน)
  const autoSyncedJourneyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!journey || journey.status !== 'IN_PROGRESS' || autoSyncedJourneyRef.current === journey.id) return
    if (dataSource !== 'health-connect' && dataSource !== 'healthkit') return
    const journeyId = journey.id
    const timer = window.setTimeout(() => {
      autoSyncedJourneyRef.current = journeyId
      void handleSyncClick()
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ตั้งใจรันครั้งเดียวต่อทริป
  }, [journey?.id])

  const handlePickDestination = (mapId: string) => {
    setFailedNotice(false)
    setLockedNotice(null)
    // [แก้ตามที่ระบุ] หมอกขาวเล่นครั้งเดียว — เดิมเล่นที่หน้าเลือกจุดหมายรอบหนึ่ง แล้วพอแผนที่ขึ้นก็เล่นซ้ำอีกรอบ
    // (คนละ element กัน) ตอนนี้เล่นแค่ตอนแผนที่ขึ้น
    setTransitioning(true)
    startJourney(mapId)
      .then((j) => {
        resetStepJourneyDays(j.id)
        setTodaySteps(0)
        setStepsInput('')
        setJourney(j)
      })
      .catch(() => { setTransitioning(false); setFailedNotice(true) })
  }

  /** "เปลี่ยนจุดหมาย" — ปิดทริปฝั่ง backend ด้วย (เดิมล้างแค่ state หน้าเว็บ ทริปเก่ายัง IN_PROGRESS
   *  ทำให้ POST /journeys ถัดไปโดน 409 JOURNEY_IN_PROGRESS เลือกจุดหมายใหม่ไม่ได้) */
  const handleAbandon = () => {
    setConfirmReset(false)
    stopDeviceMotionRef.current?.()
    stopDeviceMotionRef.current = null
    setIsCountingMotion(false)
    const id = journey?.id
    resetStepJourneyDays()
    setJourney(null)
    if (id) abandonJourney(id).catch(() => setFailedNotice(true))
  }

  // [แก้ตามที่ระบุ 2026-10-27] แผนที่ล็อกตามเลเวลมีผลทันที: ทริปที่ค้างอยู่บนแผนที่ที่ยังไม่ปลดล็อก
  // (เช่น แผนที่ 9 ก่อน Lv.50) ถูกปิด แล้วให้ผู้เล่นเลือกแผนที่ใหม่ พร้อมป้ายบอกเหตุผล
  const level = userData.level ?? 1
  useEffect(() => {
    if (loading || !journey || journey.status !== 'IN_PROGRESS') return
    const map = JOURNEY_MAPS.find((m) => m.id === journey.destinationMapId)
    if (!map || isMapUnlocked(map, level)) return
    // ทำหลัง effect (ไม่ setState ซ้อนใน effect)
    const t = window.setTimeout(() => {
      setLockedNotice(`แผนที่ "${map.name}" ปลดล็อกที่ Lv.${map.unlockLevel} — เลือกแผนที่ใหม่สำหรับวันนี้`)
      handleAbandon()
    }, 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ตรวจเมื่อทริป/เลเวลเปลี่ยน
  }, [loading, journey?.id, journey?.status, level])

  /** ก้าวจริงของวันทริป (ไม่ตัดที่เป้า) — เดิมตกไปใช้ความคืบหน้าทริปซึ่งถูกตัดที่เป้า (เดิน 9,120 แต่ขึ้น 8,000) */
  const tripActualSteps = journey && tripDate
    ? Math.max(getJourneyDaySteps(journey.id, tripDate), journey.progressOnCurrentMapSteps)
    : 0
  /** ดูแผนที่ทริปขนาดใหญ่จากหน้าสรุป */
  const [viewMap, setViewMap] = useState(false)
  // เปิดม้วนกระดาษ → ยืนยันก้าวของวันทริปเข้าบัญชีอีกครั้ง (กรณีทริปจบตอนปิดแอป) — การ์ดแลกซื้อ
  // สุ่มตกที่เซิร์ฟเวอร์ตอนกดรับรางวัล (finish → completeQuest) ไม่ใช่ที่นี่
  const recordedTripRef = useRef<string | null>(null)
  useEffect(() => {
    if (!showSummary || !journey || !tripDate || recordedTripRef.current === journey.id) return
    recordedTripRef.current = journey.id
    const steps = Math.max(getJourneyDaySteps(journey.id, tripDate), journey.progressOnCurrentMapSteps)
    recordStepDay(tripDate, steps, dailyStepTarget, { mapId: journey.destinationMapId, journeyId: journey.id })
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.progression }))
      .catch(() => { /* ไม่บล็อกการรับรางวัล */ })
  }, [showSummary, journey, tripDate, dailyStepTarget, queryClient])

  const handleClaimRewards = () => {
    if (!journey) return
    const rewards = calcProportionalRewards(journey.progressOnCurrentMapSteps, tripStepTarget)

    // หยดน้ำยังให้ตามสัดส่วนเหมือนเดิม — EXP/เหรียญคิดจากก้าวจริงตอนจบเควส (finish → completeQuest)
    // เดิมบวกเหรียญเองที่นี่ด้วย ซึ่งซ้ำกับรางวัลเควส จึงตัดออก
    // โหมด live: ปิดไว้ก่อน (backend ยังไม่ให้หยดน้ำตามสัดส่วนทริป รอตัดสินใจกติกา)
    if (API_MODE === 'mock') updateProfile({ waterDrops: (userData.waterDrops || 0) + rewards.waterDrops })

    const currentMapId = journey.routeMapIds?.[activeMapIndex] || journey.destinationMapId
    const consecutiveGoalDays = progression.goalStreakDays
    resetStepJourneyDays()
    clearPendingJourneyClaim()
    void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
    finish({
      destinationMapId: journey.destinationMapId, 
      mapId: currentMapId, 
      status: journey.status, 
      steps: journey.progressOnCurrentMapSteps,
      consecutiveGoalDays,
    })
  }

  const stepRewardPreview = journey
    ? calculateStepReward({ steps: journey.progressOnCurrentMapSteps, bmi, consecutiveGoalDays: progression.goalStreakDays })
    : null
  // การ์ด ×2 ที่ใช้อยู่ — รางวัลเควสจริงคูณที่เซิร์ฟเวอร์ ตรงนี้แค่แสดงให้ตรงกัน
  const rewardMultiplier = progression.doubleRewardActive ? 2 : 1

  const syncStatusText = isSyncing
    ? 'กำลังซิงค์…'
    : isCountingMotion
      ? 'กำลังนับก้าว เดินได้เลย แผนที่จะขยับเอง'
      : lastSync
        ? `ซิงค์ล่าสุด ${lastSync.at.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} · +${lastSync.added.toLocaleString()} ก้าว`
        : 'ยังไม่ได้ซิงค์ก้าวรอบนี้'

  if (loading) return <div className="step-journey-game"><GameLoadingScreen loading progress={loadPct} hint="กำลังเตรียมเส้นทางของคุณ…" /></div>

  if (!journey && completedToday) return <CompletedTripView day={completedToday} onClose={exit} />

  if (!journey || (!visualMapDef && !showSummary)) {
    return (
      <div className="step-journey-game step-journey-game--center">
        {failedNotice && <div className="qg-tag qg-tag--warn step-journey-game__failed-notice">เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองเลือกจุดหมายอีกครั้ง</div>}
        {lockedNotice && <div className="qg-tag qg-tag--warn step-journey-game__failed-notice">{lockedNotice}</div>}
        <DestinationPicker onPicked={handlePickDestination} playerLevel={userData.level ?? 1} />
      </div>
    )
  }

  return (
    <div
      className={`step-journey-game${reachedGoal ? ' is-route-complete is-map-framed' : ''}${artReady ? '' : ' is-art-pending'}`}
      ref={containerRef}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
    >
      <GameLoadingScreen loading={!artReady} progress={loadPct} hint="กำลังวาดแผนที่…" />
      {reachedGoal && <MapStars />}
      <div
        className="step-journey-game__map-canvas"
        style={{
          width: nativeSize.width,
          height: nativeSize.height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          ...(reachedGoal ? { '--mf-radius': `${16 / Math.max(scale, 0.01)}px` } : {}),
        } as React.CSSProperties}
      >
        {visualMapDef && (
          <div className="sjg-map-layer">
            <MapPathRenderer mapDef={visualMapDef} progressPct={localProgressPct} />
            {/* [แก้ตามที่ระบุ] ต้นไม้/หญ้าโยกไหว (ใต้แมว/หีบ) + ผีเสื้อ ใบไม้ปลิว เงาเมฆ (ชั้นบนสุด) */}
            <MapScenery mapId={visualMapDef.id} />
            <CatCompanion mapDef={visualMapDef} progressPct={localProgressPct} />
            {/* [แก้ตามที่ระบุ] หีบที่เส้นชัยเห็นตลอดทาง (มีแสงเรืองด้านหลัง) — กดเปิดได้เมื่อถึงเป้า · เปิดแล้วหายไป */}
            {chest.loaded && !chest.opened && (
              <StepChestMarker mapDef={visualMapDef} ready={chest.ready} onOpen={() => { void chest.open() }} disabled={chest.popupOpen} />
            )}
            <WeatherEffectLayer weather={weather} />
            <MapAmbience mapId={visualMapDef.id} />
          </div>
        )}
      </div>

      {reachedGoal && <MapFrame pan={pan} scale={scale} size={nativeSize} title={visualMapDef?.name} />}

      {showChestPrompt && (
        // ถึงเป้าแล้ว — ชวนแตะหีบที่เส้นชัย (ปุ่มนี้เปิดหีบได้เช่นกัน)
        <div ref={chestPromptRef} className="sjg-chest-prompt" role="status">
          <span>🎉 ถึงเส้นชัยแล้ว! แตะหีบสมบัติเพื่อเปิด</span>
          <button type="button" onClick={() => { void chest.open() }}>🎁 เปิดหีบ</button>
        </div>
      )}

      {chest.popupOpen && (
        <StepChestPopup reward={chest.popupReward} error={chest.error} onClose={chest.closePopup} onRetry={() => { void chest.open() }} />
      )}

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
              <button className="lb-btn" onClick={handleAbandon}>เริ่มใหม่</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* [แก้ตามที่ระบุ] ปุ่มเปิด/ปิดแถบข้อมูลเป็นรูป OwlAvatar (แบบปุ่มแผงข้อมูลต้นไม้) — ปิดอยู่เห็นแค่ปุ่มนกฮูก
          กดแล้วข้อมูลทั้งหมด + ปุ่มรีเฟรชก้าว/เปลี่ยนแผนที่ ค่อยแสดง · แถบเปิดอยู่ → ปุ่มนกฮูกมุมซ้ายบนของแถบไว้ปิด */}
      {/* [แก้ตามที่ระบุ] ปุ่มนกฮูกอยู่ "ใต้" ปุ่มกากบาทเสมอ (ตำแหน่งเดียวทั้งตอนเปิด/ปิด) และแถบข้อมูลเลื่อนเข้า-ออก
          แบบกระดานจัดอันดับหน้า Home — ไม่มีปุ่มนกฮูกตัวที่สองในแถบอีกแล้ว */}
      {/* [ใหม่ตามที่ระบุ] แผนที่ย่อมุมซ้ายบน (แทนปุ่มแผนที่ม้วน) — แตะเพื่อขยาย */}
      {!showSummary && visualMapDef && journey && (
        <MiniMap
          mapDef={visualMapDef}
          progressPct={localProgressPct}
          steps={journey.progressOnCurrentMapSteps}
          goalSteps={tripStepTarget}
          pan={pan}
          scale={scale}
        />
      )}

      {!showSummary && !reachedGoal && (
        <button
          type="button"
          className="step-journey-game__panel-toggle"
          onClick={togglePanel}
          aria-expanded={panelOpen}
          aria-controls="step-journey-side-panel"
          aria-label={panelOpen ? 'ซ่อนข้อมูลการเดินทาง' : 'แสดงข้อมูลการเดินทาง'}
          title={panelOpen ? 'ซ่อนข้อมูลการเดินทาง' : 'แสดงข้อมูลการเดินทาง'}
        >
          {/* [แก้ตามที่ระบุ] กลับไปใช้รูปนกฮูกเดิม (OwlAvatar.webp) */}
          <img src={OWL_AVATAR_ICON} alt="" className="step-journey-game__panel-toggle-img" />
        </button>
      )}

      {!showSummary && !reachedGoal && (
        <div
          className={`step-journey-game__side-panel${panelOpen ? ' step-journey-game__side-panel--open' : ''}`}
          id="step-journey-side-panel"
          aria-hidden={!panelOpen}
          inert={!panelOpen}
        >
          <StatsOverlay
            todaySteps={todaySteps}
            dailyStepTarget={dailyStepTarget}
            stretchStepTarget={getDailyStepGoal(bmi).max}
            bonusLabel={STEP_BONUS_LABEL[classifyStepBmiTier(bmi)]}
            todayDistance={(() => { const m = stepsToDistanceMeters(todaySteps, userData.height, userData.gender); return m == null ? null : formatDistance(m) })()}
            bmi={bmi}
            mapName={visualMapDef?.name || ''}
            mapProgressPct={totalProgressPct}
          />

          <div className="step-journey-game__controls">
            <span className="sjg-sync-label">อัปเดตก้าววันนี้</span>
            {dataSource !== 'manual' && (
              <button
                type="button"
                className={`sjg-sync-main${isCountingMotion ? ' sjg-sync-main--live' : ''}${isSyncing ? ' sjg-sync-main--busy' : ''}`}
                onClick={handleSyncClick}
                disabled={isSyncing}
                aria-busy={isSyncing}
              >
                <span className="sjg-sync-main__icon" aria-hidden="true">{isSyncing ? '⏳' : isCountingMotion ? '⏹️' : '🔄'}</span>
                <span>{isCountingMotion ? 'หยุดนับก้าว' : SYNC_LABEL[dataSource]}</span>
              </button>
            )}
            <p className="sjg-sync-status" role="status">{syncStatusText}</p>
            <div className="step-journey-game__sync-row">
              <input
                id="step-journey-input"
                type="text"
                inputMode="numeric"
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={commitManualSteps}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                placeholder={`ก้าววันนี้ เช่น ${dailyStepTarget}`}
                aria-label="จำนวนก้าวรวมของวันนี้"
                enterKeyHint="done"
                className="qg-input step-journey-game__step-input"
              />
              <button type="button" className="sjg-manual-save" onClick={commitManualSteps}>บันทึก</button>
            </div>
            {syncError && <p className="qg-tag qg-tag--danger step-journey-game__sync-error">⚠️ {syncError}</p>}
          </div>

          {/* [แก้ตามที่ระบุ] เปลี่ยนแผนที่ของวันได้เฉพาะก่อนนับก้าวแรกเข้าทริป */}
          <button
            className="step-journey-game__reset-btn"
            onClick={() => setConfirmReset(true)}
            disabled={tripActualSteps > 0}
          >
            {tripActualSteps > 0 ? 'เปลี่ยนแผนที่ได้เฉพาะก่อนเริ่มนับก้าว' : 'เปลี่ยนแผนที่วันนี้'}
          </button>
        </div>
      )}

      {showSummary && journey && (
        <DiaryRewardScroll
          reachedGoal={reachedGoal}
          steps={tripActualSteps}
          goal={tripStepTarget}
          exp={(stepRewardPreview?.exp ?? 0) * rewardMultiplier}
          coins={(stepRewardPreview?.coins ?? 0) * rewardMultiplier}
          waterDrops={API_MODE === 'mock' ? calcProportionalRewards(journey.progressOnCurrentMapSteps, tripStepTarget).waterDrops : null}
          doubled={rewardMultiplier > 1}
          chest={chest.opened}
          sfx={{ volume: settings.sfxVolume, enabled: settings.soundEnabled }}
          onClaim={handleClaimRewards}
          onViewMap={() => setViewMap(true)}
        />
      )}
      {viewMap && journey && tripDate && (
        <CompletedJourneyMap
          day={{ date: tripDate, steps: tripActualSteps, goal: tripStepTarget, goalMet: reachedGoal, mapId: journey.destinationMapId, journeyId: journey.id, chest: chest.opened }}
          onClose={() => setViewMap(false)}
        />
      )}

      {/* [แก้ตามที่ระบุ] ลบปุ่มกากบาทของเกมนี้ — ซ้อนกับปุ่มปิดลอยของ GameShell (เหลืออันเดียว) */}
    </div>
  )
}