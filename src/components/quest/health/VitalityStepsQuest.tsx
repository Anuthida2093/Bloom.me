import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppContext } from '../../../context/AppContext'
import { playSfx, startLoopingSfx, stopLoopingSfx } from '../../../utils/audioPlayer'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { useIsLowPowerMode } from '../../../hooks/useMediaQuery'
import { useStepTracker } from '../../../hooks/useStepTracker'
import { OWL_AVATAR_ICON, BADGE_ICONS } from '../../../config/iconAssets'
import { findQuestByCode } from '../../../config/questCatalog'
import CameraCapture from '../shared/CameraCapture'
import type { QuestPlayPayload } from '../../../types.mental'
import {
  type StepDataSource,
  isGoogleFitConfigured,
  isDeviceMotionSupported,
  syncStepsFromGoogleFit,
  startDeviceMotionTracking,
  describeStepSyncError,
} from '../../../services/stepTracking'
import './VitalityStepsQuest.css'

const QUEST_CODE = 'phys-vitality-steps'
/** [ขั้นที่ 0 — เช็ค asset จริงแล้ว] มีไฟล์จริงที่ public/assets/videos/quest-learning/
 *  QuestPathMap.mp4 (โฟลเดอร์เดียวกับที่ใช้ในแผนที่เควสความรู้ — ยังไม่มีวิดีโอเส้นทางเฉพาะของ
 *  หมวดสุขภาพ ใช้ตัวนี้ไปก่อนตามที่ระบุ "ถ้ามีไฟล์จริงให้ใช้") */
const BG_VIDEO_SRC = '/assets/videos/quest-learning/QuestPathMap.mp4'

interface VitalityStepsConfig {
  verificationMethod?: 'PHOTO'
  baseStepGoal?: number
  bmiAdjustment?: { highBmiThreshold: number; highBmiExtraSteps: number }
  allowManualStepEntry?: boolean
}

interface VitalityStepsQuestProps {
  onComplete: (payload?: QuestPlayPayload) => void
  onClose: () => void
}

type Stage = 'walk' | 'camera' | 'done'

/**
 * [เลิกใช้แล้ว] ไม่มีจุดไหนเรียกใช้ component นี้อีกต่อไป — code 'phys-vitality-steps' เล่นผ่าน
 * StepJourneyGame.tsx (src/components/quest/games/physical/) ผ่าน questGameRegistry.ts
 * (gameKey: 'step-journey') แล้ว ไม่ใช่ SPECIAL_QUEST เต็มจอที่ GameplayFrame.tsx เรนเดอร์ตรง
 * แบบเดิมอีกต่อไป — เก็บไฟล์นี้ไว้เผื่อ rollback ไม่ได้ลบทิ้งทันที ถ้ามั่นใจว่าไม่ต้อง rollback
 * แล้วค่อยลบไฟล์นี้ + VitalityStepsQuest.css ทิ้งได้เลย
 *
 * VitalityStepsQuest — เควส "ก้าวเพื่อสุขภาพ" (Vitality Steps)   [ไฟล์ใหม่]
 * ────────────────────────────────────────────────────────────────────────────
 * เปิดเป็นหน้าเต็มกรอบผ่าน SPECIAL_QUEST_CODES pattern เดียวกับเควสสุขภาพจิต
 * (ดู GameplayFrame.tsx) เพราะมีฉาก/เสียง/VFX เป็นของตัวเอง — เดินสะสมก้าวให้ครบเป้าหมาย
 * (ปรับเพิ่มอัตโนมัติถ้า BMI สูง) นกฮูกเดินตามเส้นทางตามสัดส่วนก้าวที่กรอก/ถ่ายรูปยืนยัน
 *
 * [แก้รอบนี้ — ตามสเปกใหม่] เปลี่ยนแค่ titleTh ในหน้าจอ (questCatalog.ts) — โครงหน้าจอยังเป็น
 * SPECIAL_QUEST full-screen component เดิมทุกประการ ไม่ใช่ layout ใหม่แบบ navbar+sidebar
 * ตามเอกสารต้นทาง (เอกสารนั้นใช้อ้างอิงแค่เนื้อหา/ลำดับ action ภายในหน้าเท่านั้น)
 *
 * [แก้รอบนี้ — เชื่อมก้าวเดินจริง] ปุ่ม "ซิงค์ข้อมูลก้าวเดิน" ตอนนี้เรียก src/services/
 * stepTracking.ts จริง เรียงลำดับ fallback: Google Fit REST API (ต้องตั้งค่า OAuth client ID
 * ใน .env ก่อน — ดูคอมเมนต์หัวไฟล์ stepTracking.ts) → DeviceMotion API (ประมาณก้าวจากเซนเซอร์
 * เครื่องตรงๆ ใช้ได้ทันทีแต่แม่นยำต่ำกว่ามาก) → ถ้าทั้งสองทางใช้ไม่ได้เลย ตกกลับไปโหมดกรอกมือ/
 * ถ่ายรูปยืนยัน (allowManualStepEntry) แบบเดิม ระบบยังไม่ได้ตรวจสอบว่าตัวเลขที่กรอกเอง/ที่นับ
 * จาก DeviceMotion ตรงกับรูปที่แนบจริงหรือไม่ (ดูสรุปท้ายบทสนทนา)
 *
 * [แก้รอบนี้ — เฟส 3 Capacitor] ตอนรันเป็นแอป native (iOS/Android ผ่าน Capacitor) เพิ่มแหล่ง
 * Health Connect/HealthKit จริง (src/hooks/useStepTracker.ts) เข้ามาแทนที่ตำแหน่งเดิมของ
 * DeviceMotion ใน fallback chain — ลำดับใหม่: Google Fit (ถ้าตั้งค่าไว้ — ไม่เปลี่ยน) →
 * Health Connect/HealthKit (ถ้าเป็น native platform) → DeviceMotion (ถ้า native health ใช้
 * ไม่ได้/permission ถูกปฏิเสธ) → กรอกมือ ตามที่ระบุไว้ */
export default function VitalityStepsQuest({ onComplete, onClose }: VitalityStepsQuestProps) {
  useLockBodyScroll()
  const { settings, userData, logActivity } = useAppContext()
  const lowPower = useIsLowPowerMode()
  const sfxOpts = useMemo(
    () => ({ volume: settings.sfxVolume, enabled: settings.soundEnabled }),
    [settings.sfxVolume, settings.soundEnabled],
  )

  const questDef = findQuestByCode(QUEST_CODE)
  const config = (questDef?.config ?? {}) as VitalityStepsConfig
  const baseGoal = config.baseStepGoal ?? 8000
  const highBmiThreshold = config.bmiAdjustment?.highBmiThreshold ?? 23
  const highBmiExtraSteps = config.bmiAdjustment?.highBmiExtraSteps ?? 1500
  const allowManualStepEntry = config.allowManualStepEntry ?? true

  // [ตามที่ระบุ] reuse BMI ที่คำนวณไว้แล้วจากฟีเจอร์ "รูปร่างของคุณ" (userData.bmi) — ไม่คำนวณ
  // BMI ซ้ำแยกต่างหากในไฟล์นี้
  const stepGoal = useMemo(() => {
    const bmi = userData.bmi ?? 0
    return bmi >= highBmiThreshold ? baseGoal + highBmiExtraSteps : baseGoal
  }, [userData.bmi, baseGoal, highBmiThreshold, highBmiExtraSteps])

  const [stage, setStage] = useState<Stage>('walk')
  const [stepsInput, setStepsInput] = useState('')
  const [hasPhoto, setHasPhoto] = useState(false)

  // [เพิ่มรอบนี้ — เฟส 3 Capacitor] nativePlatform ไม่เปลี่ยนตลอดอายุแอป (ดู useStepTracker.ts)
  const { nativePlatform, requestNativeSteps } = useStepTracker()

  /** [ใหม่ — เชื่อมก้าวเดินจริง] แหล่งข้อมูลที่ "พร้อมใช้" ตอนนี้ — ตัดสินใจครั้งเดียวตอน mount
   * ผ่าน lazy initializer (ไม่ใช่ useEffect+setState เพราะ isGoogleFitConfigured/
   * isDeviceMotionSupported/nativePlatform เป็น capability check แบบ sync ล้วน อ่านค่าคงที่
   * ตลอดอายุ component ไม่ใช่การ subscribe ระบบภายนอกที่ต้องรอ effect) ไม่ได้ขอ OAuth/
   * permission จริงตรงนี้ (ต้องรอ user gesture ที่ปุ่มซิงค์เท่านั้น — ดูคอมเมนต์ใน
   * stepTracking.ts ว่าทำไม) [แก้รอบนี้ — เฟส 3] แทรก native health เข้ามาแทนตำแหน่งเดิมของ
   * DeviceMotion — DeviceMotion เลื่อนลงมาเป็น fallback ถัดไปแทน */
  const [dataSource, setDataSource] = useState<StepDataSource>(() => {
    if (isGoogleFitConfigured()) return 'google-fit'
    if (nativePlatform) return nativePlatform
    if (isDeviceMotionSupported()) return 'device-motion'
    return 'manual'
  })
  const [isSyncing, setIsSyncing] = useState(false)
  /** เฉพาะโหมด DeviceMotion — กำลังฟังเซนเซอร์นับก้าวสดอยู่หรือไม่ (ต่างจาก Google Fit ที่ดึง
   * ยอดสะสมทั้งวันครั้งเดียวจบ DeviceMotion ต้องฟังต่อเนื่องระหว่างที่ผู้เล่นเดินจริง) */
  const [isCountingMotion, setIsCountingMotion] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const stopDeviceMotionRef = useRef<(() => void) | null>(null)

  const steps = Number(stepsInput) || 0
  const progressPct = Math.min(100, (steps / stepGoal) * 100)
  const reachedGoal = steps >= stepGoal

  // เสียงนกฮูกเดินวนเบาๆ ตลอดเวลาที่อยู่หน้านี้ (หยุดตอนเข้าฉากถ่ายรูป/สำเร็จ)
  useEffect(() => {
    if (stage !== 'walk') return
    startLoopingSfx('OWL_WALK', { ...sfxOpts, volume: (sfxOpts.volume ?? 70) * 0.5 })
    return () => stopLoopingSfx('OWL_WALK')
  }, [stage, sfxOpts])

  // เลิกฟัง DeviceMotion เสมอตอนออกจากหน้านี้ กันเซนเซอร์ยังทำงานเบื้องหลังทั้งที่ปิดเควสไปแล้ว
  useEffect(() => {
    return () => stopDeviceMotionRef.current?.()
  }, [])

  useEscapeKey(onClose)

  const handleStepsChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '')
    setStepsInput(digitsOnly)
  }

  const handlePhotoConfirm = () => {
    setHasPhoto(true)
    setStage('walk')
  }

  /** [แก้รอบนี้ — เชื่อมก้าวเดินจริง] ปุ่ม "ซิงค์ข้อมูลก้าวเดิน" เรียกแหล่งที่ dataSource ชี้อยู่
   * จริง: Google Fit = ดึงยอดสะสมวันนี้ครั้งเดียวจบ, DeviceMotion = สลับเริ่ม/หยุดฟังเซนเซอร์สด
   * (ต้องเดินระหว่างที่ฟังอยู่ถึงจะนับเพิ่ม) ถ้าล้มเหลว (OAuth ปฏิเสธ/ไม่รองรับ/permission
   * ถูกปฏิเสธ) ตกกลับไปโหมดกรอกมือทันทีพร้อมข้อความอธิบายสาเหตุ ไม่ auto-approve เงียบๆ */
  const handleSyncClick = async () => {
    playSfx('CLICK', sfxOpts)
    setSyncError(null)

    if (dataSource === 'google-fit') {
      setIsSyncing(true)
      try {
        const reading = await syncStepsFromGoogleFit()
        setStepsInput(String(reading.steps))
      } catch (err) {
        setDataSource(isDeviceMotionSupported() ? 'device-motion' : 'manual')
        setSyncError(describeStepSyncError(err))
      } finally {
        setIsSyncing(false)
      }
      return
    }

    // [เพิ่มรอบนี้ — เฟส 3 Capacitor] เหมือน flow ของ google-fit ด้านบน (ดึงยอดสะสมวันนี้ครั้ง
    // เดียวจบ ไม่ใช่ฟังต่อเนื่องแบบ DeviceMotion) requestNativeSteps() ไม่ throw เอง (ดู
    // useStepTracker.ts) จึงสร้าง Error ขึ้นมาเองเพื่อใช้ describeStepSyncError ข้อความเดียวกัน
    if (dataSource === 'health-connect' || dataSource === 'healthkit') {
      setIsSyncing(true)
      try {
        const reading = await requestNativeSteps()
        if (!reading) throw new Error('NATIVE_HEALTH_QUERY_FAILED')
        setStepsInput(String(reading.steps))
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
        const stop = await startDeviceMotionTracking((count) => setStepsInput(String(count)))
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

  const handleSubmit = () => {
    if (!reachedGoal) return
    // [แก้รอบนี้ — ตามสเปกใหม่] เล่น water-drop.mp3 ก่อน แล้วตามด้วย tree-grow.mp3 "เรียงต่อกัน"
    // ไม่ใช่พร้อมกัน — เว้นจังหวะสั้นๆ ให้ฟังแยกออกจากกันชัดเจน (ทั้งสองไฟล์มีอยู่จริง ดูสรุปท้าย)
    playSfx('WATER_DROP', sfxOpts)
    window.setTimeout(() => playSfx('TREE_GROW', sfxOpts), 700)
    logActivity({ activityType: 'STEPS', durationSeconds: 0, meta: { steps, stepGoal, hasPhoto } })
    setStage('done')
    // ให้เวลาเห็น VFX ระยิบระยับสั้นๆ ก่อนส่งต่อให้ระบบฉลองรางวัลกลาง (QuestRewardCelebration
    // ใน QuestSection.tsx) ทำงานต่อ — ไม่สร้างระบบตัวเลขรางวัลซ้ำในไฟล์นี้
    window.setTimeout(() => {
      onComplete({ steps, stepGoal, hasPhoto })
      onClose()
    }, 1500)
  }

  return (
    <div className="vitality-steps">
      {!lowPower && (
        <video className="vitality-steps__bg-video" autoPlay muted loop playsInline>
          <source src={BG_VIDEO_SRC} type="video/mp4" />
        </video>
      )}
      <div className="vitality-steps__scrim" aria-hidden="true" />

      <button onClick={onClose} title="ปิด" className="vitality-steps__close" aria-label="ปิดเควสก้าวเพื่อสุขภาพ">✕</button>

      {stage !== 'done' && (
        <div className="vitality-steps__content">
          <div className="vitality-steps__header">
            <div className="vitality-steps__icon">🦶</div>
            <h1 className="vitality-steps__title">ก้าวเพื่อสุขภาพ</h1>
            <p className="vitality-steps__flavor">
              ทุกย่างก้าวของคุณ คือจังหวะชีวิตที่ช่วยรดน้ำให้รากไม้หยั่งลึกและผืนดินชุ่มชื้น
            </p>
            {stepGoal > baseGoal && (
              <p className="vitality-steps__bmi-note">
                ✨ BMI ของคุณสูงกว่า {highBmiThreshold} เป้าหมายจึงถูกปรับเพิ่มขึ้น {highBmiExtraSteps.toLocaleString()} ก้าวเพื่อผลลัพธ์ที่ดีขึ้น
              </p>
            )}
          </div>

          {/* [เพิ่มรอบนี้ — ตามสเปกใหม่] ตัวเลขก้าวเดิน "ปัจจุบัน / เป้าหมาย" ชัดเจนเหนือแถบนกฮูก */}
          <div className="vitality-steps__count">
            <span className="vitality-steps__count-current">{steps.toLocaleString()}</span>
            <span className="vitality-steps__count-sep">/</span>
            <span className="vitality-steps__count-goal">{stepGoal.toLocaleString()} ก้าว</span>
          </div>

          {/* เส้นทางเดิน — นกฮูกเลื่อนตามสัดส่วน steps/stepGoal
              // TODO(journey-map-phase-6): ส่วนนี้จะถูกแทนที่ด้วยระบบ StepJourneyGame ในเฟส 6 —
              อย่าลบจนกว่าเฟส 6 จะมี UI ทดแทนพร้อมใช้งานจริง */}
          <div className="vitality-steps__path">
            <div className="vitality-steps__path-track" />
            <div className="vitality-steps__path-fill" style={{ width: `${progressPct}%` }} />
            <img
              src={OWL_AVATAR_ICON}
              alt=""
              className="vitality-steps__owl"
              style={{ left: `${progressPct}%` }}
            />
            <span className="vitality-steps__path-flag vitality-steps__path-flag--start">🌱</span>
            <span className="vitality-steps__path-flag vitality-steps__path-flag--end">🏁</span>
          </div>
          <div className="vitality-steps__progress-label">{Math.round(progressPct)}% ของเป้าหมายวันนี้</div>

          {/* [แก้รอบนี้ — เชื่อมก้าวเดินจริง] ปุ่ม "ซิงค์ข้อมูลก้าวเดิน" โทน Soft Mint — เรียก
              แหล่งข้อมูลจริงตาม dataSource (ดู handleSyncClick) ป้าย/ข้อความด้านล่างบอกชัดเจน
              ว่ากำลังใช้แหล่งไหนอยู่ ไม่ใช่ affordance เฉยๆ แบบเดิมอีกต่อไป */}
          {dataSource !== 'manual' && (
            <button
              className="vitality-steps__sync-btn"
              onClick={handleSyncClick}
              disabled={isSyncing}
            >
              {dataSource === 'google-fit' && (isSyncing ? '⏳ กำลังซิงก์จาก Google Fit...' : '🔄 ซิงก์จาก Google Fit')}
              {dataSource === 'health-connect' && (isSyncing ? '⏳ กำลังซิงก์จาก Health Connect...' : '🔄 ซิงก์จาก Health Connect')}
              {dataSource === 'healthkit' && (isSyncing ? '⏳ กำลังซิงก์จาก Apple Health...' : '🔄 ซิงก์จาก Apple Health')}
              {dataSource === 'device-motion' && (isSyncing ? '⏳ กำลังขออนุญาตเซ็นเซอร์...' : isCountingMotion ? '⏸️ หยุดนับก้าว' : '▶️ เริ่มนับก้าวจากเซ็นเซอร์')}
            </button>
          )}
          <p className="vitality-steps__sync-note">
            {dataSource === 'google-fit' && 'แหล่งข้อมูล: ซิงก์จาก Google Fit'}
            {dataSource === 'health-connect' && 'แหล่งข้อมูล: ซิงก์จาก Health Connect (Android)'}
            {dataSource === 'healthkit' && 'แหล่งข้อมูล: ซิงก์จาก Apple Health (HealthKit)'}
            {dataSource === 'device-motion' && (isCountingMotion
              ? 'แหล่งข้อมูล: กำลังนับจากเซ็นเซอร์เครื่อง (ประมาณการ) — เดินต่อไปเรื่อยๆ แล้วกด "หยุดนับ" เมื่อพอ'
              : 'แหล่งข้อมูล: นับจากเซ็นเซอร์เครื่อง (ประมาณการ — ไม่แม่นยำเท่า pedometer จริง)')}
            {dataSource === 'manual' && 'แหล่งข้อมูล: กรอกด้วยตนเอง — เชื่อมต่อแหล่งข้อมูลอัตโนมัติไม่ได้ในเครื่อง/เบราว์เซอร์นี้'}
          </p>
          {syncError && <p className="vitality-steps__sync-error">⚠️ {syncError}</p>}

          {/* TODO(journey-map-phase-6): ส่วนนี้จะถูกแทนที่ด้วยระบบ StepJourneyGame ในเฟส 6 —
              อย่าลบจนกว่าเฟส 6 จะมี UI ทดแทนพร้อมใช้งานจริง */}
          {allowManualStepEntry && (
            <div className="vitality-steps__input-row">
              <label htmlFor="vitality-steps-input" className="vitality-steps__input-label">กรอกจำนวนก้าวที่เดินได้วันนี้</label>
              <input
                id="vitality-steps-input"
                type="text"
                inputMode="numeric"
                value={stepsInput}
                onChange={(e) => handleStepsChange(e.target.value)}
                placeholder="เช่น 8000"
                className="vitality-steps__input"
              />
            </div>
          )}

          <div className="vitality-steps__actions">
            <button className="vitality-steps__btn vitality-steps__btn--ghost" onClick={() => setStage('camera')}>
              📸 {hasPhoto ? 'ถ่ายรูปยืนยันอีกครั้ง' : 'แนบรูปยืนยัน (เช่นแอปนับก้าว)'}
            </button>
            {hasPhoto && <span className="vitality-steps__photo-badge">✅ แนบรูปแล้ว</span>}
          </div>

          {/* [เพิ่มรอบนี้ — ตามสเปกใหม่] แสดงรางวัลที่จะได้ก่อนกดยืนยัน */}
          {questDef && (
            <div className="vitality-steps__reward-row">
              <span><img src={BADGE_ICONS.water} className="icon-img" alt="" />น้ำแห่งความเพียร</span>
              {/* [แก้ตามที่ระบุรอบนี้ — ข้อ 7] ตัวเลขไว้หน้ารูป + รูปใหญ่ชัดเจนขึ้น (2 รายการนี้
                  มีจำนวนตัวเลขจริง ต่างจาก "น้ำแห่งความเพียร" ด้านบนที่เป็นป้ายไม่มีตัวเลข) */}
              <span>+{questDef.expReward} EXP <img src={BADGE_ICONS.exp} className="icon-img--reward" alt="" /></span>
              <span>+{questDef.coinReward} <img src={BADGE_ICONS.coins} className="icon-img--reward" alt="" /></span>
            </div>
          )}

          <button
            className="vitality-steps__submit"
            disabled={!reachedGoal}
            onClick={handleSubmit}
          >
            {reachedGoal ? '🌿 ส่งภารกิจ' : `เหลืออีก ${(stepGoal - steps).toLocaleString()} ก้าว`}
          </button>
        </div>
      )}

      {stage === 'camera' && (
        <CameraCapture
          hint="ถ่ายรูปยืนยันการเดิน (เช่น หน้าจอแอปนับก้าว หรือรองเท้าหลังเดินเสร็จ)"
          onConfirm={handlePhotoConfirm}
          onSkip={() => setStage('walk')}
          skipLabel="ข้าม"
          onExit={onClose}
        />
      )}

      {stage === 'done' && (
        <div className="vitality-steps__done">
          <div className="vitality-steps__done-sparkles" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.span
                key={i}
                className="vitality-steps__spark"
                style={{ left: `${(i * 6.4) % 100}%` }}
                initial={{ opacity: 0, y: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], y: -120 - (i % 4) * 20, scale: 1 }}
                transition={{ duration: 1.3 + (i % 3) * 0.2, delay: i * 0.04, ease: 'easeOut' }}
              >
                {/* [แก้ตามที่ระบุรอบนี้ — ข้อ 3] 💧 ตกแต่งจุดนี้เป็นอีก root cause ที่รอบก่อน
                    grep ไม่เจอ (จำกัดแค่จุดแสดงจำนวนรางวัล ไม่รวมเอฟเฟกต์ตกแต่งไม่มีตัวเลข) —
                    ✨ ไม่ใช่ 1 ใน 3 สัญลักษณ์ที่ระบุ (⭐/🪙/💧) จึงคงไว้ */}
                {i % 2 === 0 ? '✨' : <img src={BADGE_ICONS.water} alt="" className="vitality-steps__spark-img" />}
              </motion.span>
            ))}
          </div>
          <motion.div
            className="vitality-steps__done-icon"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            🌳
          </motion.div>
          <h2 className="vitality-steps__done-title">ถึงเป้าหมายแล้ว!</h2>
          <p className="vitality-steps__done-text">รากแก้วของคุณแข็งแรงขึ้นจากการเดินวันนี้</p>
        </div>
      )}
    </div>
  )
}
