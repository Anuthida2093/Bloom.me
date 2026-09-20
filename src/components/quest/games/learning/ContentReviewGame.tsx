import { useMemo, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import '../games.css'

/*============================================================================*\
  ContentReviewGame — [ไฟล์ใหม่ตามที่ระบุ] แทนที่ StrategicDelayGame.tsx เดิม

  ────────────────────────────────────────────────────────────────────────────
  ก่อนหน้านี้เควส "กลยุทธ์การรอคอย" (know-strategic-delay) รวม Time Capsule เดิมเข้ามา
  เป็นฟอร์มวางแผนทบทวน 3 รอบตามสัดส่วน % ของช่วงเวลา — ตอนนี้แยกกลับตามที่ backend
  (seed.ts) ออกแบบไว้จริง: เควส "content-review" (title "Time Capsule") ให้เลือก "วันเดียว"
  (1-30 วันข้างหน้า ตรงกับ config.minDaysAhead/maxDaysAhead ของ backend) เพื่อกลับมาทบทวน
  เป้าหมาย Active Focus ของวันนี้อีกครั้ง — ส่วน "กลยุทธ์การรอคอย" ไม่ใช่เควสอีกต่อไปแล้ว
  กลายเป็น badge ที่ปลดล็อกจากการทำเควสนี้ต่อเนื่องรายเดือน 3 รอบ (ดู
  src/config/badgeCatalog.ts + MentalContext.earnedBadges)

  ทฤษฎี: Spacing Effect (Cepeda et al., 2008)
\*============================================================================*/

const MIN_DAYS_AHEAD = 1
const MAX_DAYS_AHEAD = 30

function isoDateDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function ContentReviewGame({ finish }: QuestGameProps) {
  const { logActivity, questLogs } = useAppContext()
  const minDate = isoDateDaysFromNow(MIN_DAYS_AHEAD)
  const maxDate = isoDateDaysFromNow(MAX_DAYS_AHEAD)
  const [reviewDate, setReviewDate] = useState(minDate)

  /** เป้าหมาย Active Focus ที่ทำสำเร็จวันนี้ (ถ้ามี) — โชว์ให้เห็นว่ากำลังนัดทบทวนอะไร
   *  ตรงกับ QuestLog.sourceQuestLogId ที่ backend เตรียมไว้ (ดู schema.prisma) */
  const todaysGoalLog = useMemo(() => {
    const todayStr = new Date().toDateString()
    return questLogs.find((l) =>
      l.quest?.code === 'know-active-focus' && l.status === 'COMPLETED' &&
      l.completedAt && new Date(l.completedAt).toDateString() === todayStr,
    )
  }, [questLogs])

  const goalSkill = typeof todaysGoalLog?.payload?.skill === 'string' ? todaysGoalLog.payload.skill : null

  const canSubmit = reviewDate >= minDate && reviewDate <= maxDate

  const handleSubmit = () => {
    logActivity({
      activityType: 'REVIEW',
      durationSeconds: 0,
      meta: { scheduledReviewDate: reviewDate, sourceQuestLogId: todaysGoalLog?.id ?? null, mode: 'content-review' },
    })
    finish({ scheduledReviewDate: reviewDate, sourceQuestLogId: todaysGoalLog?.id ?? null })
  }

  return (
    <div className="qg">
      <div className="qg-card">
        <span className="qg-label">เป้าหมายวันนี้ที่จะกลับมาทบทวน</span>
        {goalSkill ? (
          <p className="qg-hint" style={{ marginTop: 6 }}>🎯 {goalSkill}</p>
        ) : (
          <p className="qg-hint" style={{ marginTop: 6 }}>ยังไม่ได้ตั้งเป้าหมาย "เพ่งสมาธิ" ของวันนี้ — ทบทวนแบบทั่วไปแทนได้เลย</p>
        )}
      </div>

      <div className="qg-card">
        <label className="qg-label" htmlFor="cr-date">อยากกลับมาทบทวนวันไหน</label>
        <input
          id="cr-date" className="qg-input" type="date"
          min={minDate} max={maxDate}
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
        />
        <p className="qg-hint" style={{ marginTop: 6 }}>
          เลือกได้ตั้งแต่พรุ่งนี้ถึง 30 วันข้างหน้า — ห่างกว่านี้จะลืม ถี่กว่านี้จะเสียเวลาเปล่า (ระบบจะเตือนเมื่อถึงวันนั้น)
        </p>
      </div>

      {canSubmit && (
        <div className="qg-card">
          <div className="qg-title">นัดทบทวนวันที่</div>
          <div className="qg-stat-grid">
            <div className="qg-stat">
              <strong>{formatThaiDate(reviewDate)}</strong>
              {/* [แก้ react-hooks/purity] เลี่ยงเรียก Date.now() ระหว่าง render — คำนวณจำนวนวัน
                  จากส่วนต่างระหว่าง reviewDate กับ minDate (ค่าที่คงที่แล้วใน state/scope นี้)
                  บวกกลับด้วย MIN_DAYS_AHEAD แทน ได้ผลลัพธ์เดียวกันโดยไม่พึ่งเวลา "ตอนนี้" ตรงๆ */}
              <span>อีก {Math.round((new Date(reviewDate).getTime() - new Date(minDate).getTime()) / 86_400_000) + MIN_DAYS_AHEAD} วัน</span>
            </div>
          </div>
        </div>
      )}

      <button className="qg-btn" disabled={!canSubmit} onClick={handleSubmit}>เปิดแคปซูลเวลานี้</button>
    </div>
  )
}
