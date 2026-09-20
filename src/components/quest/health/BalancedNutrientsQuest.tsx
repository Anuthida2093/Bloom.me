import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../../../context/AppContext'
import { playSfx } from '../../../utils/audioPlayer'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { findQuestByCode } from '../../../config/questCatalog'
import CameraCapture from '../shared/CameraCapture'
import type { QuestPlayPayload } from '../../../types.mental'
import type { Gender } from '../../../types'
import './BalancedNutrientsQuest.css'

const QUEST_CODE = 'phys-balanced-nutrients'
/** ระยะเวลาจำลอง "กำลังตรวจสอบรูป" ก่อน auto-approve (มิลลิวินาที) */
const MOCK_VERIFY_MS = 1500
/** [ตามที่ระบุ] สมมติ activity level ระดับ "ออกแรงเบาถึงปานกลาง" ไปก่อน — ระบบยังไม่มีข้อมูล
 * activity level จริงของผู้ใช้เก็บไว้ (ไม่มีฟิลด์นี้ใน UserData เลย) */
const ACTIVITY_FACTOR = 1.375
/** อายุสมมติเมื่อไม่มี birthDate ให้คำนวณ (สูตร Mifflin-St Jeor ต้องใช้อายุ) */
const FALLBACK_AGE = 30

interface BalancedNutrientsConfig {
  verificationMethod?: 'PHOTO'
  requiresPhotos?: number
  photoLabels?: string[]
  calorieTargetRule?: 'BMI_BASED'
  flavorTextOnSubmit?: string
  mealsPerDayGoal?: number
}

interface BalancedNutrientsQuestProps {
  onComplete: (payload?: QuestPlayPayload) => void
  onClose: () => void
}

interface MealLog {
  id: string
  photo: string
  approvedAt: string
}

function computeAge(birthDate: string | null): number {
  if (!birthDate) return FALLBACK_AGE
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return FALLBACK_AGE
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return Math.max(1, age)
}

/** สูตร Mifflin-St Jeor — ประมาณ BMR แบบพื้นฐาน (ยังไม่รวม activity level จริงของผู้ใช้) */
function computeBmr(heightCm: number, weightKg: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return gender === 'MALE' ? base + 5 : base - 161
}

/** [ตามที่ระบุ — ข้อ 3] ปรับเป้าหมายแคลอรี่ตามเกณฑ์ BMI: ผอม→เกิน, ปกติ→รักษาสมดุล, เกิน→ลด */
function adjustCaloriesByBmi(tdee: number, bmi: number): number {
  if (bmi < 18.5) return tdee + 300
  if (bmi < 23) return tdee
  return tdee - 300
}

/**
 * BalancedNutrientsQuest — เควส "สารอาหารแห่งผืนดิน" (Balanced Nutrients)   [ไฟล์ใหม่]
 * ────────────────────────────────────────────────────────────────────────────
 * เปิดเป็นหน้าเต็มกรอบผ่าน SPECIAL_QUEST_CODES pattern เดียวกับเควสสุขภาพจิต — คำนวณ
 * เป้าหมายแคลอรี่วันนี้จาก TDEE (Mifflin-St Jeor) ปรับตามเกณฑ์ BMI แล้วให้ถ่ายรูปมื้ออาหาร
 * ก่อนทานให้ครบตามจำนวนมื้อที่กำหนด (ค่าเริ่มต้น 3 มื้อ/วัน) ถึงจะปิดเควสได้
 *
 * [Mock AI verification — ข้อจำกัดที่ต้องแจ้ง] TODO: ต่อ AI image recognition backend จริง
 * ตรงจุดตรวจสอบรูป (เช็คว่าเป็นภาพอาหารจริง + ประมาณแคลอรี่จากรูป) ตอนนี้ mock หน่วงเวลาแล้ว
 * auto-approve เป็น APPROVED เสมอ ไม่ได้ตรวจสอบเนื้อหารูปจริงเลย
 *
 * [ข้ามไปก่อนตามที่ระบุ] รางวัลไอเทมพิเศษจาก "BMI เปลี่ยนแปลงดีขึ้นต่อเนื่อง" ต้องมีระบบเก็บ
 * ประวัติ BMI ย้อนหลังที่ระบบยังไม่มี (UserData มีแค่ bmi ปัจจุบันค่าเดียว) — ไม่ได้ทำในรอบนี้
 * เพราะจะต้องเพิ่มโครงสร้างข้อมูล user ใหม่ ซึ่งเสี่ยงกระทบระบบเดิมโดยไม่ได้รับอนุญาต
 */
export default function BalancedNutrientsQuest({ onComplete, onClose }: BalancedNutrientsQuestProps) {
  useLockBodyScroll()
  const { settings, userData, logActivity } = useAppContext()
  const sfxOpts = useMemo(
    () => ({ volume: settings.sfxVolume, enabled: settings.soundEnabled }),
    [settings.sfxVolume, settings.soundEnabled],
  )

  const config = (findQuestByCode(QUEST_CODE)?.config ?? {}) as BalancedNutrientsConfig
  const mealsGoal = config.mealsPerDayGoal ?? 3
  const flavorText = config.flavorTextOnSubmit ?? 'จิบหยาดน้ำแห่งอรุณรุ่งเพื่อเติมพลังให้ผืนดิน'

  // [ตามที่ระบุ] reuse BMI ที่คำนวณไว้แล้วจาก userData.bmi — ไม่คำนวณ BMI ซ้ำในไฟล์นี้
  const calorieTarget = useMemo(() => {
    const height = userData.height ?? 0
    const weight = userData.weight ?? 0
    const bmi = userData.bmi
    if (!height || !weight || bmi === null) return null
    const age = computeAge(userData.birthDate)
    const bmr = computeBmr(height, weight, age, userData.gender)
    const tdee = bmr * ACTIVITY_FACTOR
    return Math.round(adjustCaloriesByBmi(tdee, bmi) / 10) * 10
  }, [userData.height, userData.weight, userData.bmi, userData.birthDate, userData.gender])

  const [meals, setMeals] = useState<MealLog[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const [verifyingPhoto, setVerifyingPhoto] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const mealsDone = meals.length >= mealsGoal

  useEscapeKey(onClose)

  const handlePhotoConfirm = (dataUrl: string) => {
    setShowCamera(false)
    setVerifyingPhoto(dataUrl)
    // [Mock AI verification] หน่วงเวลาจำลองการตรวจสอบรูป — ของจริงต้องยิงไป backend/โมเดล
    // ตรวจจับภาพอาหารตรงนี้ (ดู comment TODO ที่หัวไฟล์)
    window.setTimeout(() => {
      const entry: MealLog = { id: `meal-${Date.now()}`, photo: dataUrl, approvedAt: new Date().toISOString() }
      setMeals((prev) => [...prev, entry])
      setVerifyingPhoto(null)
      setToast(flavorText)
      playSfx('SPARKLE_CHIME', sfxOpts)
      window.setTimeout(() => setToast(null), 2600)
    }, MOCK_VERIFY_MS)
  }

  const handleFinish = () => {
    if (!mealsDone) return
    playSfx('WATER_DROP', sfxOpts)
    logActivity({ activityType: 'NUTRITION', durationSeconds: 0, meta: { meals: meals.length, calorieTarget } })
    // [ตามที่ระบุ — ข้อ 3] แอนิเมชันบัวรดน้ำเล่นตอนกลับมา Dashboard หลังปิดเควส ไม่ใช่ในหน้านี้
    // (ดู WateringCanFx.tsx — ผูกกับ treeGrowthPulse.questCode === QUEST_CODE)
    onComplete({ meals: meals.length, calorieTarget })
    onClose()
  }

  return (
    <div className="balanced-nutrients">
      <button onClick={onClose} title="ปิด" className="balanced-nutrients__close" aria-label="ปิดเควสสารอาหารแห่งผืนดิน">✕</button>

      <div className="balanced-nutrients__content">
        <div className="balanced-nutrients__icon">🍽️</div>
        <h1 className="balanced-nutrients__title">สารอาหารแห่งผืนดิน</h1>
        <p className="balanced-nutrients__subtitle">ถ่ายรูปมื้ออาหารก่อนทาน ให้ครบ {mealsGoal} มื้อวันนี้</p>

        <div className="balanced-nutrients__calorie-card">
          <div className="balanced-nutrients__calorie-label">เป้าหมายแคลอรี่วันนี้ของคุณ</div>
          {calorieTarget !== null ? (
            <div className="balanced-nutrients__calorie-value">{calorieTarget.toLocaleString()} <span>kcal</span></div>
          ) : (
            <div className="balanced-nutrients__calorie-missing">
              ยังคำนวณไม่ได้ — กรุณากรอกส่วนสูง/น้ำหนัก/BMI ให้ครบในหน้าโปรไฟล์ก่อน
            </div>
          )}
          <div className="balanced-nutrients__calorie-note">
            ประมาณจากสูตร Mifflin-St Jeor ปรับตามเกณฑ์ BMI ของคุณ (ยังไม่รวมระดับกิจกรรมจริง — ดูสรุปท้าย)
          </div>
        </div>

        <div className="balanced-nutrients__meals">
          {Array.from({ length: mealsGoal }).map((_, i) => (
            <div key={i} className={`balanced-nutrients__meal-slot${i < meals.length ? ' is-done' : ''}`}>
              {i < meals.length ? (
                <img src={meals[i].photo} alt={`มื้อที่ ${i + 1}`} />
              ) : (
                <span>มื้อ {i + 1}</span>
              )}
            </div>
          ))}
        </div>

        {verifyingPhoto && (
          <div className="balanced-nutrients__verifying">
            <span className="balanced-nutrients__verifying-spinner" aria-hidden="true" />
            กำลังตรวจสอบรูป...
          </div>
        )}

        {!mealsDone ? (
          <button className="balanced-nutrients__btn balanced-nutrients__btn--primary" onClick={() => setShowCamera(true)} disabled={!!verifyingPhoto}>
            📸 ถ่ายรูปมื้ออาหารก่อนทาน
          </button>
        ) : (
          <button className="balanced-nutrients__btn balanced-nutrients__btn--primary" onClick={handleFinish}>
            🌾 เสร็จสิ้นภารกิจวันนี้
          </button>
        )}

        <p className="balanced-nutrients__hint">{meals.length}/{mealsGoal} มื้อที่บันทึกวันนี้</p>
      </div>

      {showCamera && (
        <CameraCapture
          hint="ถ่ายรูปมื้ออาหารก่อนทาน"
          onConfirm={handlePhotoConfirm}
          onSkip={() => setShowCamera(false)}
          skipLabel="ยกเลิก"
          onExit={onClose}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="balanced-nutrients__toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            🌿 {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
