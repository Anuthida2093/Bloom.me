import type { Gender } from '../types'

/*============================================================================*\
  nutrition.ts — ตัวคำนวณ/ที่เก็บข้อมูลของเควส "แคลอรี่ตาม BMI" ที่ใช้ร่วมกันหลายหน้า
  ────────────────────────────────────────────────────────────────────────────
  • computeCalorieTarget — เป้าหมายแคลอรี่ต่อวัน (Mifflin-St Jeor × activity ปรับตาม BMI)
  • มื้ออาหารของแต่ละวันเก็บในเครื่องแยกตามบัญชี (bloom.meals.<userId>.<ปี-เดือน-วัน>)
  • getOverCalorieStreak — ทานเกินเป้าติดต่อกันกี่วัน (หน้า Home ใช้วางก้อนหินบนพื้นดิน)
  ผู้ใช้: BalancedNutrientsQuest.tsx, QuestGateView.tsx (ตัวเลขแคลอรี่วันนี้ในรายการเควส),
         Dashboard.tsx (ก้อนหิน + ข้อความเตือน)
\*============================================================================*/

/** สมมติ activity level "ออกแรงเบาถึงปานกลาง" — ระบบยังไม่มีข้อมูล activity level จริงของผู้ใช้ */
const ACTIVITY_FACTOR = 1.375
/** อายุสมมติเมื่อไม่มี birthDate */
const FALLBACK_AGE = 30
/** ทานเกินเป้าติดต่อกันกี่วันถึงขึ้นก้อนหินบนพื้นดินหน้า Home */
export const OVER_CALORIE_STREAK_DAYS = 3

export interface MealItem {
  name: string
  qty: number
  unit: string
  /** แคลอรี่รวมของรายการนี้ (คูณจำนวนแล้ว) */
  kcal: number
}

export interface MealLog {
  id: string
  /** รูปย่อ (JPEG ขนาดเล็ก) */
  photo: string
  approvedAt: string
  /** แคลอรี่รวมของจานนี้ */
  calories: number
  /** ชื่อรวมของจาน (เช่น "ข้าวสวย ×2, ไก่ทอด") หรือคำอธิบายจาก AI */
  description: string
  /** รายการเมนูในจาน (บันทึกผ่านหน้าเลือกเมนู) — บันทึกเก่า/ผ่าน AI ไม่มีฟิลด์นี้ */
  items?: MealItem[]
}

interface CalorieProfile {
  height: number | null
  weight: number | null
  bmi: number | null
  birthDate: string | null
  gender: Gender
}

function computeAge(birthDate: string | null): number {
  if (!birthDate) return FALLBACK_AGE
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return FALLBACK_AGE
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const hadBirthday = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  if (!hadBirthday) age -= 1
  return Math.max(1, age)
}

/** สูตร Mifflin-St Jeor — BMR แบบพื้นฐาน */
function computeBmr(heightCm: number, weightKg: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return gender === 'MALE' ? base + 5 : base - 161
}

/** ปรับเป้าหมายตามเกณฑ์ BMI: ผอม→เพิ่ม, ปกติ→รักษาสมดุล, เกิน→ลด */
function adjustCaloriesByBmi(tdee: number, bmi: number): number {
  if (bmi < 18.5) return tdee + 300
  if (bmi < 23) return tdee
  return tdee - 300
}

/** เป้าหมายแคลอรี่ต่อวัน (ปัดหลักสิบ) — null = ยังไม่มีส่วนสูง/น้ำหนัก/BMI */
export function computeCalorieTarget(p: CalorieProfile): number | null {
  const height = p.height ?? 0
  const weight = p.weight ?? 0
  if (!height || !weight || p.bmi === null) return null
  const tdee = computeBmr(height, weight, computeAge(p.birthDate), p.gender) * ACTIVITY_FACTOR
  return Math.round(adjustCaloriesByBmi(tdee, p.bmi) / 10) * 10
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export function mealsStorageKey(userId: string, date: Date = new Date()): string {
  return `bloom.meals.${userId || 'guest'}.${dayKey(date)}`
}

export function loadMeals(userId: string, date: Date = new Date()): MealLog[] {
  try {
    const raw = JSON.parse(localStorage.getItem(mealsStorageKey(userId, date)) ?? '[]') as MealLog[]
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}

export function saveMeals(userId: string, meals: MealLog[], date: Date = new Date()): void {
  try {
    localStorage.setItem(mealsStorageKey(userId, date), JSON.stringify(meals))
    window.dispatchEvent(new CustomEvent(MEALS_CHANGED_EVENT))
  } catch { /* พื้นที่เต็ม — ยังใช้ได้ในรอบนี้ */ }
}

/** ยิงทุกครั้งที่บันทึกมื้ออาหาร — หน้าอื่น (รายการเควส/หน้า Home) ฟังเพื่ออัปเดตตัวเลขทันที */
export const MEALS_CHANGED_EVENT = 'bloom:meals-changed'

export function totalCalories(meals: MealLog[]): number {
  return meals.reduce((sum, m) => sum + m.calories, 0)
}

/**
 * ทานเกินเป้าติดต่อกันกี่วัน — นับย้อนจาก "เมื่อวาน" ทีละวัน (วันนี้นับด้วยถ้าเกินไปแล้ว)
 * วันที่ไม่ได้บันทึกเลย หรือทานไม่เกินเป้า = ตัดสตรีค
 */
export function getOverCalorieStreak(userId: string, target: number | null, maxDays = 14): number {
  if (target === null) return 0
  const today = new Date()
  let streak = totalCalories(loadMeals(userId, today)) > target ? 1 : 0
  for (let i = 1; i <= maxDays; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const meals = loadMeals(userId, d)
    if (meals.length === 0 || totalCalories(meals) <= target) break
    streak++
  }
  return streak
}
