import { useState } from 'react'
import type { QuestLogEntry, UserData } from '../../types'
import { computeCalorieTarget, loadMeals, totalCalories } from '../../utils/nutrition'
import { getDailyStepGoal } from '../../config/stepGoalByBmi'
import { useStepHistory } from '../../hooks/useProgression'
import { localDateKey } from '../../services/api/progression.api'
import { bangkokDateString } from '../../utils/progression'
import './HealthSummary.css'

/*============================================================================*\
  HealthSummary — [เพิ่มตามที่ระบุ] ข้อมูลสุขภาพครบถ้วนในการ์ด "รูปร่างของคุณ" หน้าโปรไฟล์
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ] แสดงเป็นปุ่ม 2 ปุ่ม กดแล้วค่อยกางข้อมูล:
    ข้อมูลร่างกาย → ส่วนสูง · น้ำหนัก · น้ำหนักที่เหมาะสม (BMI 18.5–22.9)
    พลังงาน & กิจกรรมวันนี้ → แคลอรี่วันนี้ · ก้าววันนี้ · ดื่มน้ำวันนี้ (30 มล./กก.) · ระดับความเสี่ยงสุขภาพ
  ทุกค่าคำนวณจากข้อมูลที่มีอยู่แล้ว (โปรไฟล์/บันทึกมื้ออาหาร/บันทึกก้าว/เควสดื่มน้ำ) ไม่สร้างข้อมูลใหม่
\*============================================================================*/

const RISK_LABEL: Record<UserData['currentRiskLevel'], { text: string; color: string }> = {
  LOW: { text: 'ต่ำ', color: '#2f9e5b' },
  MODERATE: { text: 'ปานกลาง', color: '#e8a020' },
  HIGH: { text: 'สูง', color: '#dc2626' },
}
const GLASS_ML = 250

function Stat({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }) {
  return (
    <div className="health-stat">
      <span className="health-stat__label">{label}</span>
      <span className="health-stat__value" style={color ? { color } : undefined}>{value}</span>
      {sub && <span className="health-stat__sub">{sub}</span>}
    </div>
  )
}

function Progress({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return <span className="health-stat__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
}

export default function HealthSummary({ userData, questLogs }: { userData: UserData; questLogs: QuestLogEntry[] }) {
  const stepHistory = useStepHistory()
  const [open, setOpen] = useState<{ body: boolean; today: boolean }>({ body: false, today: false })
  const toggle = (k: 'body' | 'today') => setOpen((o) => ({ ...o, [k]: !o[k] }))
  const { height, weight } = userData
  const hasBody = !!height && !!weight
  const hM = (height ?? 0) / 100
  const idealMin = hasBody ? Math.round(18.5 * hM * hM) : null
  const idealMax = hasBody ? Math.round(22.9 * hM * hM) : null
  const calorieTarget = computeCalorieTarget(userData)
  const caloriesToday = totalCalories(loadMeals(userData.id))
  const stepGoal = getDailyStepGoal(userData.bmi)
  const stepsToday = stepHistory.find((d) => d.date === localDateKey())?.steps ?? 0
  const waterTargetMl = hasBody ? Math.round((weight! * 30) / 50) * 50 : null
  const today = bangkokDateString()
  const glassesToday = questLogs.filter((l) =>
    l.quest?.code === 'phys-hydration-drop' && l.status === 'COMPLETED' && l.completedAt && bangkokDateString(new Date(l.completedAt)) === today).length
  const risk = RISK_LABEL[userData.currentRiskLevel] ?? RISK_LABEL.LOW

  return (
    <div className="health-summary">
      <button type="button" className={`health-summary__toggle${open.body ? ' is-open' : ''}`} onClick={() => toggle('body')} aria-expanded={open.body}>
        <span>📏 ข้อมูลร่างกาย</span><span aria-hidden="true">{open.body ? '▴' : '▾'}</span>
      </button>
      {open.body && (
        <div className="health-summary__grid">
          <Stat label="ส่วนสูง" value={height ? `${height} ซม.` : '-'} />
          <Stat label="น้ำหนัก" value={weight ? `${weight} กก.` : '-'} />
          <Stat label="น้ำหนักที่เหมาะสม" value={idealMin !== null ? `${idealMin}–${idealMax} กก.` : '-'} sub="BMI 18.5–22.9" />
        </div>
      )}

      <button type="button" className={`health-summary__toggle${open.today ? ' is-open' : ''}`} onClick={() => toggle('today')} aria-expanded={open.today}>
        <span>⚡ พลังงาน &amp; กิจกรรมวันนี้</span><span aria-hidden="true">{open.today ? '▴' : '▾'}</span>
      </button>
      {open.today && (
        <div className="health-summary__grid">
          <Stat
            label="แคลอรี่วันนี้"
            value={calorieTarget !== null ? `${caloriesToday.toLocaleString()} / ${calorieTarget.toLocaleString()}` : `${caloriesToday.toLocaleString()} kcal`}
            sub={calorieTarget !== null ? <Progress value={caloriesToday} target={calorieTarget} /> : 'ระบุส่วนสูง/น้ำหนักเพื่อคำนวณเป้า'}
          />
          <Stat
            label="ก้าววันนี้"
            value={`${stepsToday.toLocaleString()} / ${stepGoal.min.toLocaleString()}`}
            sub={<Progress value={stepsToday} target={stepGoal.min} />}
          />
          <Stat
            label="ดื่มน้ำวันนี้"
            value={waterTargetMl !== null ? `${glassesToday} / ${Math.ceil(waterTargetMl / GLASS_ML)} แก้ว` : `${glassesToday} แก้ว`}
            sub={waterTargetMl !== null ? <Progress value={glassesToday} target={Math.ceil(waterTargetMl / GLASS_ML)} /> : undefined}
          />
          <Stat label="ระดับความเสี่ยงสุขภาพ" value={risk.text} color={risk.color} />
        </div>
      )}
    </div>
  )
}
