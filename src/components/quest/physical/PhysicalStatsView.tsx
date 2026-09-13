import type { QuestDef } from '../../../config/questCatalog'
import type { UserData } from '../../../types'

const C_4 = '#E8A020'

interface PhysicalStatsViewProps {
  userData: UserData
  pathQuests: QuestDef[]
  sideQuests: QuestDef[]
  isCompleted: (questCode: string) => boolean
  accent: string
}

/**
 * PhysicalStatsView — [ย้ายมาจาก GameplayFrame.tsx ตามโครงสร้างใหม่: quest/physical/]
 * default view ของหมวดสุขภาพกาย แสดง: ส่วนสูง, น้ำหนัก, BMI (ตัวแปรตรงกับ backend:
 * userData.height/weight/bmi — nullable ใช้ fallback คำนวณเองแบบเดียวกับ UserProfile.tsx
 * เดิม) + progress bar % เควสสุขภาพที่ทำสำเร็จ
 *
 * [ตัวแปรตรง backend] "แคลอรี่ที่บริโภค" ไม่มี field แบบนี้อยู่ใน User model เลย (ดู
 * docs/DATA_DICTIONARY.md — มีแค่ height/weight/bmi/bodyType) จึงไม่ใส่ตัวเลขแคลอรี่ปลอมๆ
 * ลงไป — ถ้า backend เพิ่ม field นี้จริงในอนาคตค่อยเติมการ์ดใหม่ตรงนี้ได้เลย
 */
export default function PhysicalStatsView({ userData, pathQuests, sideQuests, isCompleted, accent }: PhysicalStatsViewProps) {
  const height = userData.height ?? 170
  const weight = userData.weight ?? 60
  const bmi = userData.bmi ?? weight / (height / 100) ** 2
  const bmiLabel = bmi < 18.5 ? 'น้ำหนักน้อย' : bmi < 23 ? 'ปกติ' : bmi < 25 ? 'น้ำหนักเกิน' : 'อ้วน'
  const bmiColor = bmi < 18.5 ? 'var(--blue)' : bmi < 23 ? 'var(--g600)' : bmi < 25 ? C_4 : 'var(--red)'

  const allPhysicalQuests = [...pathQuests, ...sideQuests]
  const completedCount = allPhysicalQuests.filter((q) => isCompleted(q.code)).length
  const pct = allPhysicalQuests.length > 0 ? Math.round((completedCount / allPhysicalQuests.length) * 100) : 0

  return (
    <div className="physical-stats-view">
      <div className="physical-stats-view__title">💪 สถิติสุขภาพของคุณ</div>

      <div className="physical-stats-view__cards">
        <div className="physical-stats-view__card">
          <div className="physical-stats-view__card-icon">📏</div>
          <div className="physical-stats-view__card-value">{height} ซม.</div>
          <div className="physical-stats-view__card-label">ส่วนสูง</div>
        </div>
        <div className="physical-stats-view__card">
          <div className="physical-stats-view__card-icon">⚖️</div>
          <div className="physical-stats-view__card-value">{weight} กก.</div>
          <div className="physical-stats-view__card-label">น้ำหนัก</div>
        </div>
        <div className="physical-stats-view__card" style={{ gridColumn: 'span 2' }}>
          <div className="physical-stats-view__card-icon">📊</div>
          <div className="physical-stats-view__card-value" style={{ color: bmiColor }}>{bmi.toFixed(1)}</div>
          <div className="physical-stats-view__card-label">BMI · {bmiLabel}</div>
        </div>
      </div>

      <div className="physical-stats-view__progress-block">
        <div className="physical-stats-view__progress-header">
          <span>🏃 ความคืบหน้าเควสสุขภาพวันนี้</span>
          <span style={{ color: accent, fontWeight: 800 }}>{completedCount}/{allPhysicalQuests.length} · {pct}%</span>
        </div>
        <div className="physical-stats-view__progress-track">
          <div className="physical-stats-view__progress-fill" style={{ width: `${pct}%`, background: accent }} />
        </div>
      </div>

      <style>{`
        .physical-stats-view {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  --lc-bg-1: #D05F2E;
  --lc-bg-2: #8B3A17;
  --lc-bg-3: #4A1E0B;
  background: linear-gradient(160deg, var(--lc-bg-1) 0%, var(--lc-bg-2) 60%, var(--lc-bg-3) 100%);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
        .physical-stats-view__title { font-family: 'Fredoka One'; font-size: 22px; color: var(--fixed-white); margin-bottom: 24px; text-shadow: 0 2px 8px var(--glass-b-30); }
        .physical-stats-view__cards {
          display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; max-width: 380px; margin-bottom: 28px;
        }
        .physical-stats-view__card {
          background: var(--glass-w-95); border-radius: 20px; padding: 18px 14px; text-align: center;
          box-shadow: 0 10px 26px var(--glass-b-25);
        }
        .physical-stats-view__card-icon { font-size: 26px; margin-bottom: 4px; }
        .physical-stats-view__card-value { font-family: 'Fredoka One'; font-size: 20px; color: var(--n900); }
        .physical-stats-view__card-label { font-size: 11px; color: var(--n300); font-weight: 700; margin-top: 2px; }

        .physical-stats-view__progress-block {
          width: 100%; max-width: 380px; background: var(--glass-w-14); border-radius: 18px;
          padding: 16px 18px; backdrop-filter: blur(6px);
        }
        .physical-stats-view__progress-header {
          display: flex; justify-content: space-between; font-size: 12.5px; color: var(--fixed-white); margin-bottom: 8px; font-weight: 700;
        }
        .physical-stats-view__progress-track { height: 10px; background: var(--glass-w-20); border-radius: 99px; overflow: hidden; }
        .physical-stats-view__progress-fill { height: 100%; border-radius: 99px; transition: width .6s cubic-bezier(.22,1,.36,1); }
      `}</style>
    </div>
  )
}