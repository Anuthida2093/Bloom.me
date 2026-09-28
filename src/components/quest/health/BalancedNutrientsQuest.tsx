import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../../../context/AppContext'
import { playSfx } from '../../../utils/audioPlayer'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { findQuestByCode } from '../../../config/questCatalog'
import { getBodyTypeImagePath } from '../../../config/bodyTypeAssets'
import CameraCapture from '../shared/CameraCapture'
import { analyzeFoodPhoto, describeFoodAnalysisError, isFoodPhotoAnalysisConfigured } from '../../../services/aiSummaryService'
import FoodMenuPicker, { type PickedFood } from './FoodMenuPicker'
import type { QuestPlayPayload } from '../../../types.mental'
import '../../leaderboard/leaderboardRow.css'
import './BalancedNutrientsQuest.css'
import { BADGE_ICONS } from '../../../config/iconAssets'
import { computeCalorieTarget, loadMeals, saveMeals, totalCalories, type MealLog } from '../../../utils/nutrition'

const QUEST_CODE = 'phys-balanced-nutrients'
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

/** เป้าหมายจำนวนมื้อต่อวันตั้งต้น (config.mealsPerDayGoal ทับได้) */
const DEFAULT_MEALS_GOAL = 3

/** ย่อรูปเหลือด้านยาวสุด 480px (JPEG) ก่อนเก็บ — รูปเต็มจากกล้องใหญ่เกินจะเก็บลงเครื่องหลายรูป */
function shrinkPhoto(dataUrl: string, maxSide = 480): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(dataUrl); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** ชื่อที่แสดงในรายการประวัติ — เมนูแรกที่เลือก (มีหลายเมนูต่อท้าย "และอีก n รายการ") */
function mealTitle(m: MealLog): string {
  if (m.items && m.items.length > 0) {
    return m.items.length > 1 ? `${m.items[0].name} และอีก ${m.items.length - 1} รายการ` : m.items[0].name
  }
  return m.description.split(',')[0].trim() || 'มื้ออาหาร'
}

function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(1)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`
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
  const { settings, userData, logActivity, questLogs } = useAppContext()
  const sfxOpts = useMemo(
    () => ({ volume: settings.sfxVolume, enabled: settings.soundEnabled }),
    [settings.sfxVolume, settings.soundEnabled],
  )

  const config = (findQuestByCode(QUEST_CODE)?.config ?? {}) as BalancedNutrientsConfig
  const mealsGoal = config.mealsPerDayGoal ?? DEFAULT_MEALS_GOAL
  const flavorText = config.flavorTextOnSubmit ?? 'จิบหยาดน้ำแห่งอรุณรุ่งเพื่อเติมพลังให้ผืนดิน'

  // [ตามที่ระบุ] reuse BMI ที่คำนวณไว้แล้วจาก userData.bmi — ไม่คำนวณ BMI ซ้ำในไฟล์นี้
  const calorieTarget = useMemo(
    () => computeCalorieTarget(userData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userData.height, userData.weight, userData.bmi, userData.birthDate, userData.gender],
  )

  // [ตามที่ระบุ] reuse getBodyTypeImagePath เดียวกับฟีเจอร์ "รูปร่างของคุณ" ในหน้าโปรไฟล์
  const bodyTypeImage = getBodyTypeImagePath(userData.gender, userData.bmi ?? 0)

  const [meals, setMeals] = useState<MealLog[]>(() => loadMeals(userData.id))
  const [cameraOpen, setCameraOpen] = useState(false)
  /** [ใหม่ — ใช้งานฟรี] รูปที่เพิ่งถ่าย รอผู้ใช้เลือก/พิมพ์เมนู (ใช้เมื่อไม่ได้ตั้งค่า AI วิเคราะห์รูป) */
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  /** รูปเต็มก่อนย่อ — ใช้ตอนกด "กลับไปหน้ารูป" จากหน้าเลือกเมนู (เปิดหน้าตรวจรูปเดิมอีกครั้ง) */
  const [rawPhoto, setRawPhoto] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  /** มื้อที่แตะดูรูปเต็มในหน้าประวัติวันนี้ */
  const [viewingMeal, setViewingMeal] = useState<MealLog | null>(null)

  useEffect(() => { saveMeals(userData.id, meals) }, [meals, userData.id])

  /** ทำเควสนี้สำเร็จไปแล้ววันนี้ — ยังถ่ายบันทึกมื้อต่อได้ แต่ไม่มีปุ่มรับรางวัลซ้ำ */
  const completedToday = questLogs.some((l) =>
    l.quest?.code === QUEST_CODE && l.status === 'COMPLETED' && !!l.completedAt &&
    new Date(l.completedAt).toDateString() === new Date().toDateString())
  const [toast, setToast] = useState<string | null>(null)
  /** [ใหม่ — เลิก mock auto-approve] error จาก analyzeFoodPhoto() จริง (ไม่พบอาหารในรูป/
   * เรียก AI ไม่สำเร็จ) — แสดงเป็น banner แยกจาก toast ปกติ (สีเตือน ไม่หายเองเร็วเท่า toast) */
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const mealsLoggedCount = meals.length
  const mealsDone = mealsLoggedCount >= mealsGoal && !completedToday

  // [แก้รอบนี้ — เลิก mock auto-approve] รวมแคลอรี่จริงที่ AI ประเมินแต่ละมื้อ (ไม่ใช่หารเท่าๆ
  // กันต่อมื้อแบบเดิมแล้ว)
  const loggedCalories = totalCalories(meals)
  /** [แก้ตามที่ระบุ] ทานเกินเป้าหมาย → แสดง "จำนวนที่เกิน" สีแดงกะพริบเตือน */
  const overCalories = calorieTarget !== null ? Math.max(0, loggedCalories - calorieTarget) : 0
  const ringPct = calorieTarget ? Math.min(100, (loggedCalories / calorieTarget) * 100) : 0

  useEscapeKey(onClose)

  /** [แก้ตามที่ระบุ] กากบาท/ปุ่มกลับบนหน้าเลือกเมนู → กลับไปหน้ารูปที่เพิ่งถ่าย (ถ่ายใหม่ หรือบันทึกรูปเดิม) */
  const handleBackToPhoto = () => {
    setPendingPhoto(null)
    setCameraOpen(true)
  }

  const handleOpenCamera = () => {
    // [เพิ่มรอบนี้ — ตามสเปกใหม่] เล่นเสียงชัตเตอร์ตอนกดเปิดกล้องจากการ์ดมื้ออาหาร (ไฟล์มีจริง
    // ดูสรุปท้ายบทสนทนา) — CameraCapture.tsx เองก็เล่นเสียงเดียวกันซ้ำอีกครั้งตอนกดถ่ายจริง
    // ข้างในเป็นปกติ ไม่ใช่บั๊ก
    playSfx('CAMERA_SHUTTER', sfxOpts)
    setAnalysisError(null)
    setRawPhoto(null)
    setCameraOpen(true)
  }

  /** [แก้รอบนี้ — เลิก mock auto-approve] เรียก analyzeFoodPhoto() จริง ไม่ใช่หน่วงเวลาแล้ว
   * approve เสมอแบบเดิม — isFood=false ไม่บันทึกมื้อนี้ (ให้ถ่ายใหม่) isFood=true บวกแคลอรี่
   * ที่ AI ประเมินจริงเข้าหลอด error/timeout แจ้งชัดเจนให้ลองใหม่ ไม่ auto-approve เงียบๆ */
  const handlePhotoConfirm = async (dataUrl: string) => {
    setCameraOpen(false)
    setAnalysisError(null)
    // [แก้ตามที่ระบุ — ใช้งานฟรีก่อน] ไม่ได้ตั้งค่า AI วิเคราะห์รูป → ให้ผู้ใช้เลือก/พิมพ์เมนูที่ทานเอง
    // (FoodMenuPicker + ตาราง config/foodCalories.ts) — ตั้งค่า AI ภายหลังก็กลับมาใช้ทางเดิมอัตโนมัติ
    if (!isFoodPhotoAnalysisConfigured()) {
      setRawPhoto(dataUrl)
      setPendingPhoto(await shrinkPhoto(dataUrl))
      return
    }
    setVerifying(true)

    try {
      const analysis = await analyzeFoodPhoto(dataUrl)
      if (!analysis.isFood) {
        setVerifying(false)
        setAnalysisError(
          analysis.foodDescription
            ? `ไม่พบอาหารในรูป (AI เห็นว่า: ${analysis.foodDescription}) — ลองถ่ายรูปมื้ออาหารใหม่อีกครั้ง`
            : 'ไม่พบอาหารในรูป — ลองถ่ายรูปมื้ออาหารใหม่อีกครั้ง',
        )
        return
      }
      const photo = await shrinkPhoto(dataUrl)
      setMeals((prev) => [
        ...prev,
        {
          id: `meal-${Date.now()}`,
          photo,
          approvedAt: new Date().toISOString(),
          calories: analysis.estimatedCalories,
          description: analysis.foodDescription,
        },
      ])
      setVerifying(false)
      setToast(`${flavorText} — AI เห็นว่า: ${analysis.foodDescription} (~${analysis.estimatedCalories.toLocaleString()} kcal)`)
      playSfx('SPARKLE_CHIME', sfxOpts)
      window.setTimeout(() => setToast(null), 3200)
    } catch (err) {
      setVerifying(false)
      setAnalysisError(describeFoodAnalysisError(err))
    }
  }

  const handlePickFood = (food: PickedFood) => {
    if (!pendingPhoto) return
    const photo = pendingPhoto
    setPendingPhoto(null)
    setRawPhoto(null)
    setMeals((prev) => [
      ...prev,
      { id: `meal-${Date.now()}`, photo, approvedAt: new Date().toISOString(), calories: food.calories, description: food.name, items: food.items },
    ])
    setToast(`${flavorText} — ${food.name} (~${food.calories.toLocaleString()} kcal)`)
    playSfx('SPARKLE_CHIME', sfxOpts)
    window.setTimeout(() => setToast(null), 3200)
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
      {/* [แก้ตามที่ระบุ] เปิดหน้าเลือกเมนูอยู่ → มีกากบาทแค่บนป็อปอัพ (ซ่อนกากบาทของหน้าเควสด้านหลัง) */}
      {!pendingPhoto && <button onClick={onClose} title="ปิด" className="balanced-nutrients__close" aria-label="ปิดเควสแคลอรี่ตาม BMI"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>}

      {/* [แก้ตามที่ระบุ] ป้ายชื่อเควสลอยกึ่งกลางด้านบนแบบกระดานจัดอันดับ เหมือนเควสอื่น (GameShell) */}
      {!cameraOpen && !pendingPhoto && (
        <div className="balanced-nutrients__pill lb-banner top-center-pill">
          <span aria-hidden="true">🥗</span>
          <span>แคลอรี่ตาม BMI</span>
        </div>
      )}

      {/* [แก้ตามที่ระบุ] ระหว่างถ่าย/ตรวจรูป แสดงแค่หน้ากล้อง-หน้าตรวจรูป กด "บันทึก" แล้วค่อยกลับมาหน้านี้ */}
      {!cameraOpen && !pendingPhoto && (
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
          overCalories > 0 ? (
            <div className="balanced-nutrients__calorie-value balanced-nutrients__calorie-value--over" role="status">
              เกิน {overCalories.toLocaleString()} <span>kcal</span>
            </div>
          ) : (
            <div className="balanced-nutrients__calorie-value balanced-nutrients__calorie-value--ok">
              {loggedCalories.toLocaleString()} <span>/ {calorieTarget.toLocaleString()} kcal</span>
            </div>
          )
        ) : (
          <div className="balanced-nutrients__calorie-missing">
            ยังคำนวณไม่ได้ — กรุณากรอกส่วนสูง/น้ำหนัก ให้ครบในหน้าโปรไฟล์ก่อน
          </div>
        )}
        <div className="balanced-nutrients__calorie-note">
          ประมาณจากสูตร Mifflin-St Jeor ปรับตามเกณฑ์ BMI ของคุณ (ยังไม่รวมระดับกิจกรรมจริง — ดูสรุปท้าย)
        </div>

        {/* [แก้ตามที่ระบุ] กรอบรูปไม่แสดงรูปที่ถ่าย — ตัวกรอบคือปุ่มถ่ายภาพ แตะแล้วไปหน้ากล้องทันที
            ถ่ายได้เรื่อยๆ ทั้งวัน ด้านล่างเป็นลิงก์ "ประวัติวันนี้" แบบไม่เน้น */}
        <button
          type="button"
          className="balanced-nutrients__photo-frame balanced-nutrients__photo-frame--button"
          onClick={handleOpenCamera}
          disabled={verifying}
          aria-label="ถ่ายภาพมื้ออาหาร"
        >
          {verifying ? (
            <span className="balanced-nutrients__verifying-spinner" aria-hidden="true" />
          ) : (
            <span className="balanced-nutrients__photo-empty" aria-hidden="true">📷</span>
          )}
          <span className="balanced-nutrients__meal-label">{verifying ? '🔎 กำลังวิเคราะห์...' : 'ถ่ายภาพ'}</span>
        </button>
        <button className="balanced-nutrients__history-link" onClick={() => setShowHistory(true)}>
          ประวัติวันนี้
        </button>

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

      </div>
      )}

      {cameraOpen && (
        <CameraCapture
          initialImage={rawPhoto}
          onSave={(dataUrl) => { void handlePhotoConfirm(dataUrl) }}
          onCancel={() => { setCameraOpen(false); setRawPhoto(null) }}
        />
      )}

      {pendingPhoto && (
        <FoodMenuPicker photo={pendingPhoto} userId={userData.id} onConfirm={handlePickFood} onBack={handleBackToPhoto} />
      )}

      {showHistory && (
        <div className="balanced-nutrients__history" onClick={() => { setShowHistory(false); setViewingMeal(null) }}>
          <div className="balanced-nutrients__history-card lb-card" role="dialog" aria-label="ประวัติวันนี้" onClick={(e) => e.stopPropagation()}>
            <div className="lb-banner balanced-nutrients__history-banner">ประวัติวันนี้</div>
            <button className="balanced-nutrients__history-close" onClick={() => { setShowHistory(false); setViewingMeal(null) }} title="ปิด" aria-label="ปิด">
              <img src={BADGE_ICONS.close} alt="" />
            </button>
            <div className="balanced-nutrients__history-total">
              รวมวันนี้ <strong>{loggedCalories.toLocaleString()}</strong>{calorieTarget !== null ? ` / ${calorieTarget.toLocaleString()}` : ''} kcal
            </div>
            {meals.length === 0 ? (
              <p className="balanced-nutrients__history-empty">ยังไม่มีมื้ออาหารที่บันทึกวันนี้</p>
            ) : (
              <div className="balanced-nutrients__history-list">
                {[...meals].reverse().map((m) => (
                  <button key={m.id} className="balanced-nutrients__history-row" onClick={() => setViewingMeal(m)} aria-label={`ดูรายละเอียดมื้อเวลา ${formatTime(m.approvedAt)}`}>
                    <img src={m.photo} alt="" />
                    <span className="balanced-nutrients__history-info">
                      <span className="balanced-nutrients__history-name">
                        {mealTitle(m)} - {m.calories.toLocaleString()} kcal
                      </span>
                      <span className="balanced-nutrients__history-meta">{formatTime(m.approvedAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button className="lb-btn lb-btn--wide" onClick={() => { setShowHistory(false); setViewingMeal(null) }}>ปิด</button>

            {viewingMeal && (
              <div className="balanced-nutrients__meal-detail" role="dialog" aria-label="รายละเอียดมื้ออาหาร">
                <img src={viewingMeal.photo} alt="รูปมื้ออาหาร" className="balanced-nutrients__meal-detail-photo" />
                <div className="balanced-nutrients__history-meta">ถ่ายเมื่อ {formatTime(viewingMeal.approvedAt)}</div>
                <ul className="balanced-nutrients__meal-detail-list">
                  {(viewingMeal.items && viewingMeal.items.length > 0
                    ? viewingMeal.items
                    : [{ name: viewingMeal.description, qty: 1, unit: '', kcal: viewingMeal.calories }]
                  ).map((it, idx) => (
                    <li key={`${it.name}-${idx}`}>
                      <span>{it.name}{it.unit ? ` ${formatQty(it.qty)} ${it.unit}` : ''}</span>
                      <span>{it.kcal.toLocaleString()} kcal</span>
                    </li>
                  ))}
                </ul>
                <div className="balanced-nutrients__meal-detail-total">
                  รวมจานนี้ <strong>{viewingMeal.calories.toLocaleString()}</strong> kcal
                </div>
                <button className="lb-btn lb-btn--ghost lb-btn--wide" onClick={() => setViewingMeal(null)}>กลับไปรายการ</button>
              </div>
            )}
          </div>
        </div>
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
