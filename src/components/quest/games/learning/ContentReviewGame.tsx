import { useMemo, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { addTimeCapsules } from '../../../../utils/timeCapsules'
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
/** ตั้งนัดทบทวนได้หลายครั้ง (เว้นระยะแบบ Spacing Effect เช่น 1 / 7 / 30 วัน) */
const MAX_REVIEWS = 3
const DEFAULT_TIME = '19:00'
/** ระยะห่างแนะนำของนัดที่ 1, 2, 3 */
const SUGGESTED_GAPS = [1, 7, 30]

interface ReviewSlot { date: string; time: string }

function isoDateDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function ContentReviewGame({ finish }: QuestGameProps) {
  const { logActivity, questLogs, userData } = useAppContext()
  const minDate = isoDateDaysFromNow(MIN_DAYS_AHEAD)
  const maxDate = isoDateDaysFromNow(MAX_DAYS_AHEAD)
  const [slots, setSlots] = useState<ReviewSlot[]>([{ date: minDate, time: DEFAULT_TIME }])
  const reviewDate = slots[0].date
  const updateSlot = (i: number, patch: Partial<ReviewSlot>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  const addSlot = () => setSlots((prev) => {
    const gap = SUGGESTED_GAPS[prev.length] ?? MAX_DAYS_AHEAD
    return [...prev, { date: isoDateDaysFromNow(Math.min(MAX_DAYS_AHEAD, gap)), time: prev[prev.length - 1]?.time ?? DEFAULT_TIME }]
  })
  const removeSlot = (i: number) => setSlots((prev) => prev.filter((_, idx) => idx !== i))

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

  /** [เชื่อมเควสเสริม] หัวข้อที่ "ลืม" จากเควสเทกระเป๋าความจำผ่านเสียงวันนี้ (BrainDumpGame ส่ง
   *  missedTopics มาใน payload) — นัดทบทวนหัวข้อเหล่านี้ไปพร้อมกันในแคปซูลเวลา */
  const reviewTopics = useMemo(() => {
    const todayStr = new Date().toDateString()
    const topics = new Set<string>()
    for (const l of questLogs) {
      if (l.quest?.code !== 'know-brain-dump' || l.status !== 'COMPLETED' || !l.completedAt) continue
      if (new Date(l.completedAt).toDateString() !== todayStr) continue
      const missed = l.payload?.missedTopics
      if (Array.isArray(missed)) for (const t of missed) if (typeof t === 'string' && t.trim()) topics.add(t.trim())
    }
    return [...topics]
  }, [questLogs])

  const canSubmit = slots.every((s) => s.date >= minDate && s.date <= maxDate && /^\d{2}:\d{2}$/.test(s.time))

  const handleSubmit = () => {
    // เวลาในเครื่องของผู้ใช้ → ISO (ระบบเตือนเทียบกับเวลาเครื่องเหมือนกัน)
    const reviewSchedule = slots
      .map((s) => new Date(`${s.date}T${s.time}:00`).toISOString())
      .sort()
    addTimeCapsules(userData.id, reviewSchedule.map((at) => ({ at, goal: goalSkill, topics: reviewTopics })))
    logActivity({
      activityType: 'REVIEW',
      durationSeconds: 0,
      meta: { scheduledReviewDate: reviewDate, reviewSchedule, sourceQuestLogId: todaysGoalLog?.id ?? null, mode: 'content-review', reviewTopics },
    })
    finish({ scheduledReviewDate: reviewDate, reviewSchedule, sourceQuestLogId: todaysGoalLog?.id ?? null, reviewTopics })
  }

  return (
    <div className="qg">
      <div className="qg-card">
        <span className="qg-label">เป้าหมายวันนี้ที่จะกลับมาทบทวน</span>
        {goalSkill ? (
          <p className="qg-hint" style={{ marginTop: 6 }}>🎯 {goalSkill}</p>
        ) : (
          <p className="qg-hint" style={{ marginTop: 6 }}>ยังไม่ได้ตั้งเป้าหมาย "เพ่งสมาธิ" ของวันนี้ ทบทวนแบบทั่วไปแทนได้เลย</p>
        )}
      </div>

      {reviewTopics.length > 0 && (
        <div className="qg-card">
          <span className="qg-label">หัวข้อที่ลืมจาก "เทกระเป๋าความจำผ่านเสียง" วันนี้</span>
          <div className="qg-chips" style={{ marginTop: 6 }}>
            {reviewTopics.map((t) => <span key={t} className="qg-chip">{t}</span>)}
          </div>
          <p className="qg-hint" style={{ marginTop: 6 }}>หัวข้อเหล่านี้จะถูกนัดทบทวนไปพร้อมกันในแคปซูลเวลานี้</p>
        </div>
      )}

      <div className="qg-card">
        <span className="qg-label">อยากกลับมาทบทวนวันไหน เวลาไหน (ตั้งได้ {MAX_REVIEWS} ครั้ง)</span>
        {slots.map((slot, i) => (
          <div key={i} className="qg-row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="qg-tag">ครั้งที่ {i + 1}</span>
            <input
              className="qg-input" type="date" aria-label={`วันทบทวนครั้งที่ ${i + 1}`}
              min={minDate} max={maxDate} value={slot.date}
              onChange={(e) => updateSlot(i, { date: e.target.value })}
              style={{ flex: '1 1 140px', minWidth: 0 }}
            />
            <input
              className="qg-input" type="time" aria-label={`เวลาทบทวนครั้งที่ ${i + 1}`}
              value={slot.time}
              onChange={(e) => updateSlot(i, { time: e.target.value })}
              style={{ flex: '0 1 110px', minWidth: 0 }}
            />
            {slots.length > 1 && (
              <button type="button" className="qg-btn qg-btn--ghost" onClick={() => removeSlot(i)} aria-label={`ลบนัดครั้งที่ ${i + 1}`} style={{ padding: '6px 12px' }}>ลบ</button>
            )}
          </div>
        ))}
        {slots.length < MAX_REVIEWS && (
          <button type="button" className="qg-btn qg-btn--ghost" onClick={addSlot} style={{ marginTop: 10 }}>
            + เพิ่มนัดทบทวน (แนะนำ {SUGGESTED_GAPS[slots.length]} วันข้างหน้า)
          </button>
        )}
        <p className="qg-hint" style={{ marginTop: 6 }}>
          เลือกได้ตั้งแต่พรุ่งนี้ถึง 30 วันข้างหน้า ถึงเวลาแล้วระบบจะเด้งป็อปอัพเตือนทันทีที่เข้าแอป
        </p>
      </div>

      {canSubmit && (
        <div className="qg-card">
          <div className="qg-title">นัดทบทวน</div>
          <div className="qg-stat-grid">
            {slots.map((slot, i) => (
              <div key={i} className="qg-stat">
                <strong>{formatThaiDate(slot.date)} · {slot.time} น.</strong>
                <span>อีก {Math.round((new Date(slot.date).getTime() - new Date(minDate).getTime()) / 86_400_000) + MIN_DAYS_AHEAD} วัน</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="qg-btn" disabled={!canSubmit} onClick={handleSubmit}>เปิดแคปซูลเวลานี้</button>
    </div>
  )
}
