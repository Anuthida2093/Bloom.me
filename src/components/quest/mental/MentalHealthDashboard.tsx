import { useMemo, useState, type ReactNode } from 'react'
import { useAppContext } from '../../../context/AppContext'
import { MOOD_POTION_COLORS, findMoodColor, dateKeyDaysAgo } from '../../../config/moodPotion'
import { RISK_PLANS, NEGATIVE_STREAK_TRIGGER } from '../../../config/screening'
import './MentalHealthDashboard.css'

/*============================================================================*\
  MentalHealthDashboard — หน้าหลักของหมวดสุขภาพจิต  [แทนที่ต้นไม้แบบเดิม]
  ────────────────────────────────────────────────────────────────────────────
  ตามที่ระบุ: "ในหน้าหลักของเควสสุขภาพจิตให้เปลี่ยนเป็นแดชบอร์ดแสดงข้อมูลของ
  สุขภาพจิตแทนอันเดิม" — ของเดิมกรอบเขียวหมวดนี้เรนเดอร์ <TreeOfLife> ซ้ำกับ
  ต้นไม้ใหญ่บนหน้า Dashboard หลักอยู่แล้ว จึงไม่ได้ให้ข้อมูลอะไรเพิ่ม

  แดชบอร์ดนี้แสดงข้อมูลจริงทั้งหมดจาก AppContext (ไม่มีเลขปลอมสักตัว):
    • ระดับความเสี่ยงล่าสุด + สถานะต้นไม้ตามผลประเมิน
    • แถบสีอารมณ์ 14 วันย้อนหลัง จากเควสปรุงน้ำยาสำรวจใจ
    • ตัวนับ "เศร้า/หมดไฟติดกันกี่วัน" พร้อมเตือนล่วงหน้าก่อนถึงเกณฑ์ 3 วัน
    • สถิติกิจกรรมฟื้นฟู 7 วัน (นาทีฝึกหายใจ / ความคิดที่เผา / ไพ่ที่เปิด / บันทึก)
    • ความคืบหน้าเกราะแห่งความขอบคุณ x/14 วัน
    • ประวัติแบบประเมิน + วันครบกำหนดรอบถัดไป
  ยังดูต้นไม้ได้อยู่ผ่านปุ่มสลับมุมมองด้านบนขวา (renderTree)
\*============================================================================*/

interface MentalHealthDashboardProps {
  /** ปุ่ม "ดูต้นไม้" จะสลับมาเรนเดอร์อันนี้แทน */
  renderTree: () => ReactNode
  onRequestScreening: () => void
  onOpenSafetyNet: () => void
  onOpenQuest: (questCode: string) => void
}

const GRATITUDE_TARGET = 14

export default function MentalHealthDashboard({ renderTree, onRequestScreening, onOpenSafetyNet, onOpenQuest }: MentalHealthDashboardProps) {
  const {
    userData,
    moodPotionLogs,
    screeningResults,
    activityLogs,
    journalEntries,
    consecutiveNegativeDays,
    gratitudeStreak,
    nextScreeningDueAt,
  } = useAppContext()

  const [view, setView] = useState<'dashboard' | 'tree'>('dashboard')

  const risk = userData.currentRiskLevel
  const plan = RISK_PLANS[risk]
  const latestScreening = screeningResults[screeningResults.length - 1] ?? null

  // ── แถบอารมณ์ 14 วันล่าสุด ──
  const moodByDate = new Map(moodPotionLogs.map((m) => [m.logDate, m]))
  const strip = Array.from({ length: 14 }).map((_, i) => {
    const key = dateKeyDaysAgo(13 - i)
    const log = moodByDate.get(key)
    return { key, log, color: log ? findMoodColor(log.colorCode) : null }
  })

  // ── สถิติกิจกรรม 7 วันล่าสุด ──
  // ตรึงเวลาไว้ตอน mount ด้วย useMemo([]) — ยังต้อง disable react-hooks/purity เพราะกฎนี้
  // ห้ามเรียก Date.now() จากทุกจุดที่ reachable ระหว่าง render รวมถึงใน factory ของ useMemo ด้วย
  // eslint-disable-next-line react-hooks/purity
  const weekAgo = useMemo(() => Date.now() - 7 * 24 * 60 * 60 * 1000, [])
  const recent = activityLogs.filter((a) => new Date(a.completedAt).getTime() >= weekAgo)
  const breathSeconds = recent.filter((a) => a.activityType === 'BREATHING').reduce((s, a) => s + a.durationSeconds, 0)
  const burnedCount = recent.filter((a) => a.activityType === 'INCINERATOR').length
  const oracleCount = recent.filter((a) => a.activityType === 'ORACLE').length
  const journalCount = journalEntries.filter((j) => new Date(j.createdAt).getTime() >= weekAgo).length

  // ── สัดส่วนสีอารมณ์ 14 วัน ──
  const distribution = MOOD_POTION_COLORS.map((c) => ({
    color: c,
    count: strip.filter((s) => s.log?.colorCode === c.code).length,
  })).filter((d) => d.count > 0)
  const loggedDays = strip.filter((s) => s.log).length

  const dueLabel = nextScreeningDueAt
    ? new Date(nextScreeningDueAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    : 'ยังไม่เคยทำแบบประเมิน'

  if (view === 'tree') {
    return (
      <div className="mh-dash__tree-view">
        {renderTree()}
        <button className="mh-dash__view-toggle mh-dash__view-toggle--floating" onClick={() => setView('dashboard')}>
          กลับไปแดชบอร์ด
        </button>
      </div>
    )
  }

  return (
    <div className={`mh-dash mh-dash--${risk.toLowerCase()}`} style={{ '--risk-accent': plan.accent } as React.CSSProperties}>
      <div className="mh-dash__scroll">
        <header className="mh-dash__header">
          <div>
            <h1>สุขภาพใจของคุณ</h1>
            <p>สรุปจากสิ่งที่คุณบันทึกไว้จริงในช่วง 14 วันที่ผ่านมา</p>
          </div>
          <button className="mh-dash__view-toggle" onClick={() => setView('tree')}>ดูต้นไม้</button>
        </header>

        {/* ── การ์ดสถานะหลัก ── */}
        <section className="mh-dash__status">
          <div className="mh-dash__status-emoji">{plan.emoji}</div>
          <div className="mh-dash__status-text">
            <span className="mh-dash__status-badge">{plan.headline}</span>
            <div className="mh-dash__status-tree">ต้นไม้: {plan.treeStatus}</div>
            <p>{plan.advice}</p>
          </div>
        </section>

        {risk === 'HIGH' && (
          <button className="mh-dash__safety-cta" onClick={onOpenSafetyNet}>
            🧰 เปิดกล่องพยาบาล · สายด่วนสุขภาพจิต 1323
          </button>
        )}

        {/* ── เตือนอารมณ์ลบติดต่อกัน ── */}
        {consecutiveNegativeDays > 0 && (
          <div className={`mh-dash__alert${consecutiveNegativeDays >= NEGATIVE_STREAK_TRIGGER ? ' mh-dash__alert--strong' : ''}`}>
            <strong>รู้สึกแย่ติดกันมา {consecutiveNegativeDays} วันแล้ว</strong>
            <p>
              {consecutiveNegativeDays >= NEGATIVE_STREAK_TRIGGER
                ? 'ถึงเกณฑ์ที่ระบบควรชวนคุยด้วยแบบสำรวจสั้นๆ 5 ข้อแล้ว ใช้เวลาไม่ถึง 2 นาที'
                : `อีก ${NEGATIVE_STREAK_TRIGGER - consecutiveNegativeDays} วันที่รู้สึกแบบนี้ ระบบจะชวนทำแบบสำรวจสั้นๆ ให้`}
            </p>
            <div className="mh-dash__alert-actions">
              <button onClick={onRequestScreening}>ทำแบบสำรวจตอนนี้</button>
              <button className="is-ghost" onClick={() => onOpenQuest('ment-mindful-anchor')}>ทอดสมอใจ 2 นาที</button>
            </div>
          </div>
        )}

        {/* ── แถบสีอารมณ์ 14 วัน ── */}
        <section className="mh-dash__card">
          <div className="mh-dash__card-head">
            <h2>สีอารมณ์ 14 วันล่าสุด</h2>
            <span>{loggedDays}/14 วันที่บันทึก</span>
          </div>
          <div className="mh-dash__strip">
            {strip.map((s) => (
              <div
                key={s.key}
                className={`mh-dash__strip-cell${s.log ? '' : ' is-empty'}`}
                style={s.color ? { background: s.color.hex, boxShadow: `0 0 12px ${s.color.glow}` } : undefined}
                title={s.log ? `${s.key} · ${s.color?.label}` : `${s.key} · ไม่ได้บันทึก`}
              />
            ))}
          </div>
          {distribution.length > 0 ? (
            <div className="mh-dash__legend">
              {distribution.map((d) => (
                <span key={d.color.code}>
                  <i style={{ background: d.color.hex }} />
                  {d.color.emoji} {d.color.label} · {d.count} วัน
                </span>
              ))}
            </div>
          ) : (
            <div className="mh-dash__empty">
              ยังไม่มีข้อมูลอารมณ์ — เริ่มจากเควสสมุดบันทึกรากไม้เรืองแสง ใช้เวลาไม่ถึงนาที
              <button onClick={() => onOpenQuest('ment-reframer-journal')}>ไปเขียนบันทึก</button>
            </div>
          )}
        </section>

        {/* ── สถิติกิจกรรมฟื้นฟู 7 วัน ── */}
        <section className="mh-dash__card">
          <div className="mh-dash__card-head">
            <h2>กิจกรรมฟื้นฟูใน 7 วัน</h2>
          </div>
          <div className="mh-dash__stats">
            <div><strong>{Math.round(breathSeconds / 60)}</strong><span>นาทีฝึกหายใจ</span></div>
            <div><strong>{burnedCount}</strong><span>ความคิดที่เผาทิ้ง</span></div>
            <div><strong>{oracleCount}</strong><span>ไพ่ทิพย์ที่เปิด</span></div>
            <div><strong>{journalCount}</strong><span>บันทึกที่เขียน</span></div>
          </div>
        </section>

        {/* ── เกราะแห่งความขอบคุณ ── */}
        <section className="mh-dash__card">
          <div className="mh-dash__card-head">
            <h2>เกราะแห่งความขอบคุณ</h2>
            <span>{gratitudeStreak}/{GRATITUDE_TARGET} วัน</span>
          </div>
          <div className="mh-dash__gratitude">
            {Array.from({ length: GRATITUDE_TARGET }).map((_, i) => (
              <span key={i} className={i < gratitudeStreak ? 'is-on' : ''} />
            ))}
          </div>
          <p className="mh-dash__note">
            {gratitudeStreak >= GRATITUDE_TARGET
              ? 'ปลดล็อกออร่าเรืองแสงรอบต้นไม้แล้ว รักษาไว้ด้วยการบันทึกต่อทุกคืน'
              : `อีก ${GRATITUDE_TARGET - gratitudeStreak} คืนติดต่อกัน จะปลดล็อกออร่าเรืองแสงรอบต้นไม้`}
          </p>
        </section>

        {/* ── ประวัติแบบประเมิน ── */}
        <section className="mh-dash__card">
          <div className="mh-dash__card-head">
            <h2>ผลคัดกรองสุขภาพใจ</h2>
            <span>รอบถัดไป: {dueLabel}</span>
          </div>
          {latestScreening ? (
            <div className="mh-dash__screening-row">
              <div>
                <strong>{latestScreening.totalScore}/15</strong>
                <span>{new Date(latestScreening.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
              </div>
              <span className="mh-dash__screening-risk">{RISK_PLANS[latestScreening.riskLevel].headline}</span>
            </div>
          ) : (
            <p className="mh-dash__note">ยังไม่เคยทำแบบประเมิน — ทำครั้งแรกเพื่อให้ระบบปรับเควสให้เหมาะกับคุณ</p>
          )}
          <button className="mh-dash__ghost-btn" onClick={onRequestScreening}>ทำแบบประเมินตอนนี้</button>
        </section>

        <p className="mh-dash__foot">
          แบบประเมินดัดแปลงจาก PHQ-2/PHQ-9 และแบบคัดกรอง 2Q/9Q ของกรมสุขภาพจิต ·
          เป็นเครื่องมือดูแลเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์
        </p>
      </div>
    </div>
  )
}