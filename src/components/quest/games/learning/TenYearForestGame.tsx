import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import '../games.css'

/*  ความสำเร็จ Ten-Year Forest (ป่าแห่งสิบปี)  — เควสแบบ passive
    ทฤษฎี: The 10-Year Rule (Ericsson et al., 1993)
    ─────────────────────────────────────────────────────────────
    ความเป็นเลิศมาจากการสะสมการฝึกอย่างจงใจนับสิบปี ไม่ใช่พรสวรรค์
    หน้านี้แสดงปฏิทิน streak 28 วันล่าสุด + วงปีที่สะสมได้ (1 วงปี = 30 วันต่อเนื่อง)  */

export default function TenYearForestGame({ finish }: QuestGameProps) {
  const { userData, questLogs } = useAppContext()
  const streak = userData.streak
  const rings = Math.floor(streak / 30)

  // วาดปฏิทิน 28 ช่องล่าสุด — ช่องที่ทำเควสสำเร็จจะสว่าง
  const completedDates = new Set(
    questLogs
      .filter((l) => l.status === 'COMPLETED' && l.completedAt)
      .map((l) => new Date(l.completedAt as string).toDateString()),
  )
  const days = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (27 - i))
    return { key: d.toDateString(), label: d.getDate(), active: completedDates.has(d.toDateString()) }
  })

  return (
    <div className="qg">
      <div className="qg-stat-grid">
        <div className="qg-stat"><strong>{streak}</strong><span>วันต่อเนื่อง</span></div>
        <div className="qg-stat"><strong>{rings}</strong><span>วงปีที่สะสมได้</span></div>
        <div className="qg-stat"><strong>{completedDates.size}</strong><span>วันที่มีการฝึก</span></div>
      </div>

      <div className="qg-card">
        <div className="qg-title">28 วันล่าสุด</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 10 }}>
          {days.map((d) => (
            <div
              key={d.key}
              title={d.key}
              style={{
                aspectRatio: '1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                background: d.active ? 'var(--game-accent)' : 'var(--glass-w-7)',
                color: d.active ? 'var(--fixed-white)' : 'var(--glass-w-35)',
                border: '1px solid var(--glass-w-12)',
              }}
            >
              {d.label}
            </div>
          ))}
        </div>
        <p className="qg-hint" style={{ marginTop: 12 }}>
          ไม่จำเป็นต้องทำเยอะทุกวัน แต่ต้องไม่ขาด — วงปีของลำต้นเพิ่มขึ้น 1 วงต่อการต่อเนื่องครบ 30 วัน
        </p>
      </div>

      <button className="qg-btn qg-btn--ghost" onClick={() => finish({ streak, rings })}>ปิดหน้านี้</button>
    </div>
  )
}