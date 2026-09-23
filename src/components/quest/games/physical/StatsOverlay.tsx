import './StatsOverlay.css'

/*============================================================================*\
  StatsOverlay.tsx — แผงสถิติของฉากแผนที่ Step Journey — ก้าววันนี้/เป้าหมาย, ความคืบหน้า
  ทั้งทริป, และ BMI
  ────────────────────────────────────────────────────────────────────────────
  [แก้รอบก่อน — ปรับ layout เต็มจอ] ไม่ตั้งตำแหน่งตัวเอง (position:absolute) อีกต่อไป — เดิมล็อก
  มุมขวาบนของกล่องแผนที่ตายตัว ตอนนี้ parent (StepJourneyGame.tsx) เป็นคนจัดตำแหน่งทั้งคอลัมน์
  ขวา (สถิติ+ปุ่มควบคุม) แทน เพื่อให้ย้ายไปเรียงเป็นแถวแนวนอนตอนจอแคบได้ (ดู
  .step-journey-game__side-panel ใน StepJourneyGame.css) — รวมแถว "ความคืบหน้าทั้งทริป" (เดิม
  เป็นบรรทัดแยกอยู่ใต้แผนที่) เข้ามาในแผงเดียวกัน

  [แก้รอบนี้ — feedback รอบ 2: โดน action menu bar บัง] ขนาด ~6x10cm ตายตัวจากรอบก่อนสูงเกินไป
  จนพื้นที่เหลือให้ปุ่มควบคุมด้านล่างไม่พอ — เปลี่ยนเป็น content-sized กระชับแทน (ดู
  StatsOverlay.css) ตัด tile--compact modifier ทิ้งด้วยเพราะทุก tile กระชับเท่ากันหมดแล้ว
  ไม่ต้องแยก modifier อีกต่อไป
\*============================================================================*/

interface StatsOverlayProps {
  todaySteps: number
  dailyStepTarget: number
  /** null = ผู้เล่นยังไม่กรอกส่วนสูง/น้ำหนัก (ดู fallback เดียวกับที่เคยอยู่ใน
   *  PhysicalStatsView.tsx เดิม — ไฟล์นั้นไม่มีจุดเรียกใช้จริงแล้ว แต่ logic fallback ยังถูกต้อง) */
  bmi: number | null
  mapName: string
  mapProgressPct: number
}

export default function StatsOverlay({ todaySteps, dailyStepTarget, bmi, mapName, mapProgressPct }: StatsOverlayProps) {
  const dailyPct = dailyStepTarget > 0 ? Math.min(100, (todaySteps / dailyStepTarget) * 100) : 0
  const clampedTripPct = Math.min(100, Math.max(0, mapProgressPct))

  return (
    <div className="stats-overlay">
      <div className="stats-overlay__tile">
        <span className="stats-overlay__tile-icon" aria-hidden="true">🦶</span>
        <div className="stats-overlay__tile-body">
          <span className="stats-overlay__tile-label">ก้าววันนี้</span>
          <span className="stats-overlay__tile-value">
            {todaySteps.toLocaleString()}<span className="stats-overlay__tile-goal"> / {dailyStepTarget.toLocaleString()}</span>
          </span>
          <div className="stats-overlay__track">
            <div className="stats-overlay__fill" style={{ width: `${dailyPct}%` }} />
          </div>
        </div>
      </div>

      <div className="stats-overlay__tile">
        <span className="stats-overlay__tile-icon" aria-hidden="true">🗺️</span>
        <div className="stats-overlay__tile-body">
          <span className="stats-overlay__tile-label">{mapName}</span>
          <span className="stats-overlay__tile-value">{Math.round(clampedTripPct)}%</span>
          <div className="stats-overlay__track">
            <div className="stats-overlay__fill stats-overlay__fill--trip" style={{ width: `${clampedTripPct}%` }} />
          </div>
        </div>
      </div>

      <div className="stats-overlay__tile">
        <span className="stats-overlay__tile-icon" aria-hidden="true">⚖️</span>
        <div className="stats-overlay__tile-body">
          <span className="stats-overlay__tile-label">BMI</span>
          <span className="stats-overlay__tile-value">{bmi != null && Number.isFinite(bmi) ? bmi.toFixed(1) : '—'}</span>
        </div>
      </div>
    </div>
  )
}
