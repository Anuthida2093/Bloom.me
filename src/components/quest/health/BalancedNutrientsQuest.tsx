import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../../../context/AppContext'
import { playSfx } from '../../../utils/audioPlayer'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { findQuestByCode } from '../../../config/questCatalog'
import { getBodyTypeImagePath } from '../../../config/bodyTypeAssets'
import CameraCapture from '../shared/CameraCapture'
import { analyzeFoodPhoto, describeFoodAnalysisError } from '../../../services/aiSummaryService'
import type { QuestPlayPayload } from '../../../types.mental'
import type { Gender } from '../../../types'
import './BalancedNutrientsQuest.css'

const QUEST_CODE = 'phys-balanced-nutrients'
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

type MealSlotKey = 'breakfast' | 'lunch' | 'dinner'
const MEAL_SLOTS: { key: MealSlotKey; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'เช้า', emoji: '🌅' },
  { key: 'lunch', label: 'เที่ยง', emoji: '☀️' },
  { key: 'dinner', label: 'เย็น', emoji: '🌙' },
]

interface MealLog {
  photo: string
  approvedAt: string
  /** [แก้รอบนี้ — เชื่อม AI วิเคราะห์รูปจริง] แคลอรี่ที่ AI ประเมินจริงจากรูปนี้ (ไม่ใช่ค่า
   * หารเท่าๆ กันแบบเดิมแล้ว) */
  calories: number
  /** คำอธิบายสั้นๆ ว่า AI เห็นอะไรในรูป (ภาษาไทย) — โชว์ให้ผู้ใช้เห็นว่าระบบตีความรูปว่าอย่างไร */
  description: string
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

/** [ตามที่ระบุ] ปรับเป้าหมายแคลอรี่ตามเกณฑ์ BMI: ผอม→เกิน, ปกติ→รักษาสมดุล, เกิน→ลด */
function adjustCaloriesByBmi(tdee: number, bmi: number): number {
  if (bmi < 18.5) return tdee + 300
  if (bmi < 23) return tdee
  return tdee - 300
}

/**
 * BalancedNutrientsQuest — เควส "แคลอรี่ตาม BMI" (Balanced Nutrients)   [ไฟล์ใหม่]
 * ────────────────────────────────────────────────────────────────────────────
 * เปิดเป็นหน้าเต็มกรอบผ่าน SPECIAL_QUEST_CODES pattern เดียวกับเควสสุขภาพจิต — คำนวณ
 * เป้าหมายแคลอรี่วันนี้จาก TDEE (Mifflin-St Jeor) ปรับตามเกณฑ์ BMI แล้วให้ถ่ายรูปมื้ออาหาร
 * เช้า/เที่ยง/เย็น ก่อนทานให้ครบ 3 มื้อถึงจะปิดเควสได้
 *
 * [แก้รอบนี้ — ตามสเปกใหม่] เปลี่ยนแค่ titleTh + เนื้อหาภายในหน้า (รูป body type + วงแหวน
 * แคลอรี่ + การ์ดมื้ออาหาร 3 มื้อแยกช่อง) — โครงหน้าจอยังเป็น SPECIAL_QUEST full-screen
 * component เดิมทุกประการ ไม่ใช่ layout ใหม่แบบ navbar+sidebar ตามเอกสารต้นทาง
 *
 * [แก้รอบนี้ — เลิก mock auto-approve แล้ว] เดิม mock หน่วงเวลาแล้ว auto-approve เป็น
 * APPROVED เสมอ ไม่ตรวจสอบเนื้อหารูปจริงเลย — ตอนนี้เรียก analyzeFoodPhoto() จาก
 * aiSummaryService.ts จริง (AI vision วิเคราะห์รูปจริง) isFood=false ไม่อนุมัติ (ให้ถ่ายใหม่)
 * isFood=true บวก estimatedCalories ที่ AI ประเมินจริงเข้าหลอด (ไม่ใช่หารเท่าๆ กันแบบเดิมแล้ว)
 * error/timeout แจ้งผู้ใช้ชัดเจนให้ลองใหม่ ไม่ auto-approve เงียบๆ อีกต่อไป
 * [ข้อจำกัดที่ต้องแจ้ง — ดูสรุปท้ายบทสนทนา] analyzeFoodPhoto() เรียก OpenAI ตรงจากฝั่ง client
 * (ยังไม่มี backend proxy) ต้องตั้งค่า VITE_AI_VISION_API_KEY ใน .env ก่อนถึงจะใช้งานได้จริง
 * ไม่ตั้งค่า = ทุกครั้งที่ถ่ายรูปจะเจอ error "ตรวจสอบไม่ได้ตอนนี้" (ของจริง ไม่ใช่ auto-approve)
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
  const mealsGoal = config.mealsPerDayGoal ?? MEAL_SLOTS.length
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

  // [ตามที่ระบุ] reuse getBodyTypeImagePath เดียวกับฟีเจอร์ "รูปร่างของคุณ" ในหน้าโปรไฟล์
  const bodyTypeImage = getBodyTypeImagePath(userData.gender, userData.bmi ?? 0)

  const [meals, setMeals] = useState<Partial<Record<MealSlotKey, MealLog>>>({})
  const [activeSlot, setActiveSlot] = useState<MealSlotKey | null>(null)
  const [verifyingSlot, setVerifyingSlot] = useState<MealSlotKey | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  /** [ใหม่ — เลิก mock auto-approve] error จาก analyzeFoodPhoto() จริง (ไม่พบอาหารในรูป/
   * เรียก AI ไม่สำเร็จ) — แสดงเป็น banner แยกจาก toast ปกติ (สีเตือน ไม่หายเองเร็วเท่า toast) */
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const mealsLoggedCount = MEAL_SLOTS.filter((s) => meals[s.key]).length
  const mealsDone = mealsLoggedCount >= mealsGoal

  // [แก้รอบนี้ — เลิก mock auto-approve] รวมแคลอรี่จริงที่ AI ประเมินแต่ละมื้อ (ไม่ใช่หารเท่าๆ
  // กันต่อมื้อแบบเดิมแล้ว)
  const loggedCalories = MEAL_SLOTS.reduce((sum, s) => sum + (meals[s.key]?.calories ?? 0), 0)
  const ringPct = calorieTarget ? Math.min(100, (loggedCalories / calorieTarget) * 100) : 0

  useEscapeKey(onClose)

  const handleOpenCamera = (slot: MealSlotKey) => {
    // [เพิ่มรอบนี้ — ตามสเปกใหม่] เล่นเสียงชัตเตอร์ตอนกดเปิดกล้องจากการ์ดมื้ออาหาร (ไฟล์มีจริง
    // ดูสรุปท้ายบทสนทนา) — CameraCapture.tsx เองก็เล่นเสียงเดียวกันซ้ำอีกครั้งตอนกดถ่ายจริง
    // ข้างในเป็นปกติ ไม่ใช่บั๊ก
    playSfx('CAMERA_SHUTTER', sfxOpts)
    setAnalysisError(null)
    setActiveSlot(slot)
  }

  /** [แก้รอบนี้ — เลิก mock auto-approve] เรียก analyzeFoodPhoto() จริง ไม่ใช่หน่วงเวลาแล้ว
   * approve เสมอแบบเดิม — isFood=false ไม่บันทึกมื้อนี้ (ให้ถ่ายใหม่) isFood=true บวกแคลอรี่
   * ที่ AI ประเมินจริงเข้าหลอด error/timeout แจ้งชัดเจนให้ลองใหม่ ไม่ auto-approve เงียบๆ */
  const handlePhotoConfirm = async (dataUrl: string) => {
    const slot = activeSlot
    setActiveSlot(null)
    if (!slot) return
    setVerifyingSlot(slot)
    setAnalysisError(null)

    try {
      const analysis = await analyzeFoodPhoto(dataUrl)
      if (!analysis.isFood) {
        setVerifyingSlot(null)
        setAnalysisError(
          analysis.foodDescription
            ? `ไม่พบอาหารในรูป (AI เห็นว่า: ${analysis.foodDescription}) — ลองถ่ายรูปมื้ออาหารใหม่อีกครั้ง`
            : 'ไม่พบอาหารในรูป — ลองถ่ายรูปมื้ออาหารใหม่อีกครั้ง',
        )
        return
      }
      setMeals((prev) => ({
        ...prev,
        [slot]: {
          photo: dataUrl,
          approvedAt: new Date().toISOString(),
          calories: analysis.estimatedCalories,
          description: analysis.foodDescription,
        },
      }))
      setVerifyingSlot(null)
      setToast(`${flavorText} — AI เห็นว่า: ${analysis.foodDescription} (~${analysis.estimatedCalories.toLocaleString()} kcal)`)
      playSfx('SPARKLE_CHIME', sfxOpts)
      window.setTimeout(() => setToast(null), 3200)
    } catch (err) {
      setVerifyingSlot(null)
      setAnalysisError(describeFoodAnalysisError(err))
    }
  }

  const handleFinish = () => {
    if (!mealsDone) return
    // [แก้รอบนี้ — ตามสเปกใหม่] เล่น reward-claim.mp3 ตอนครบเงื่อนไข (ไฟล์มีจริง ดูสรุปท้าย)
    playSfx('REWARD_CLAIM', sfxOpts)
    logActivity({ activityType: 'NUTRITION', durationSeconds: 0, meta: { meals: mealsLoggedCount, calorieTarget } })
    // [ตามที่ระบุ] แอนิเมชันบัวรดน้ำเล่นตอนกลับมา Dashboard หลังปิดเควส ไม่ใช่ในหน้านี้ — ผูกกับ
    // treeGrowthPulse.questCode === QUEST_CODE (ดู WateringCanFx.tsx + ProgressContext.tsx)
    onComplete({ meals: mealsLoggedCount, calorieTarget })
    onClose()
  }

  // วงแหวนแคลอรี่ (SVG stroke-dasharray) — รัศมี 54, เส้นรอบวง ~339.3
  const ringRadius = 54
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - ringPct / 100)

  return (
    <div className="balanced-nutrients">
      <button onClick={onClose} title="ปิด" className="balanced-nutrients__close" aria-label="ปิดเควสแคลอรี่ตาม BMI">✕</button>

      <div className="balanced-nutrients__content">
        <h1 className="balanced-nutrients__title">แคลอรี่ตาม BMI</h1>
        <p className="balanced-nutrients__flavor">
          เติมเต็มสารอาหารที่พอดี เพื่อให้ผืนดินอุดมสมบูรณ์และรากไม้เติบโตอย่างยั่งยืน
        </p>

        {/* [เพิ่มรอบนี้ — ตามสเปกใหม่] รูป body type จริงของผู้ใช้ ล้อมรอบด้วยวงแหวนแคลอรี่ */}
        <div className="balanced-nutrients__ring-wrap">
          <svg viewBox="0 0 120 120" className="balanced-nutrients__ring-svg">
            <circle cx="60" cy="60" r={ringRadius} className="balanced-nutrients__ring-track" />
            <circle
              cx="60" cy="60" r={ringRadius}
              className="balanced-nutrients__ring-fill"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
            />
          </svg>
          <img src={bodyTypeImage} alt="รูปร่างของคุณ" className="balanced-nutrients__body-img" />
        </div>

        {calorieTarget !== null ? (
          <div className="balanced-nutrients__calorie-value">
            {loggedCalories.toLocaleString()} <span>/ {calorieTarget.toLocaleString()} kcal</span>
          </div>
        ) : (
          <div className="balanced-nutrients__calorie-missing">
            ยังคำนวณไม่ได้ — กรุณากรอกส่วนสูง/น้ำหนัก ให้ครบในหน้าโปรไฟล์ก่อน
          </div>
        )}
        <div className="balanced-nutrients__calorie-note">
          ประมาณจากสูตร Mifflin-St Jeor ปรับตามเกณฑ์ BMI ของคุณ (ยังไม่รวมระดับกิจกรรมจริง — ดูสรุปท้าย)
        </div>

        {/* [เพิ่มรอบนี้ — ตามสเปกใหม่] การ์ดมื้ออาหาร เช้า/เที่ยง/เย็น แยกช่องชัดเจน */}
        <div className="balanced-nutrients__meals">
          {MEAL_SLOTS.map((slot) => {
            const meal = meals[slot.key]
            return (
              <div key={slot.key} className={`balanced-nutrients__meal-card${meal ? ' is-done' : ''}`}>
                {meal ? (
                  <img
                    src={meal.photo}
                    alt={`มื้อ${slot.label}`}
                    title={meal.description}
                    className="balanced-nutrients__meal-photo"
                  />
                ) : verifyingSlot === slot.key ? (
                  <span className="balanced-nutrients__verifying-spinner" aria-hidden="true" />
                ) : (
                  <button
                    className="balanced-nutrients__meal-cam-btn"
                    onClick={() => handleOpenCamera(slot.key)}
                    title={`ถ่ายรูปมื้อ${slot.label}`}
                    aria-label={`ถ่ายรูปมื้อ${slot.label}`}
                  >
                    📷
                  </button>
                )}
                {/* [แก้รอบนี้ — เลิก mock auto-approve] ระหว่างรอผล AI แสดง "กำลังวิเคราะห์..."
                    ชัดเจนแทนป้ายมื้อปกติ ตามที่ระบุ */}
                <span className="balanced-nutrients__meal-label">
                  {verifyingSlot === slot.key ? '🔎 กำลังวิเคราะห์...' : `${slot.emoji} ${slot.label}`}
                </span>
                {/* [แก้รอบนี้] โชว์ foodDescription + แคลอรี่จริงที่ AI ประเมิน ให้ผู้ใช้เห็นว่า
                    ระบบตีความรูปว่าเป็นอาหารอะไร (ไม่ใช่แค่ "บันทึกแล้ว" เฉยๆ แบบเดิม) */}
                {meal && (
                  <span className="balanced-nutrients__meal-done-badge">
                    ✅ ~{meal.calories.toLocaleString()} kcal
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* [ใหม่ — เลิก mock auto-approve] error จาก analyzeFoodPhoto() จริง (ไม่พบอาหารในรูป/
            เรียก AI ไม่สำเร็จ) — ค้างจนกว่าจะถ่ายรูปใหม่สำเร็จ ไม่หายเองเร็วเท่า toast ปกติ */}
        {analysisError && (
          <p className="balanced-nutrients__analysis-error">⚠️ {analysisError}</p>
        )}

        {mealsDone && (
          <button className="balanced-nutrients__btn balanced-nutrients__btn--primary" onClick={handleFinish}>
            🌾 เสร็จสิ้นภารกิจวันนี้
          </button>
        )}

        <p className="balanced-nutrients__hint">{mealsLoggedCount}/{mealsGoal} มื้อที่บันทึกวันนี้</p>
      </div>

      {activeSlot && (
        <CameraCapture
          hint={`ถ่ายรูปมื้อ${MEAL_SLOTS.find((s) => s.key === activeSlot)?.label}ก่อนทาน`}
          onConfirm={handlePhotoConfirm}
          onSkip={() => setActiveSlot(null)}
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
