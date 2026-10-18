import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BrainDumpRecord, QuestGameProps } from '../../../../types.mental'
import type { QuestLogEntry } from '../../../../types'
import { useAppContext } from '../../../../context/AppContext'
import { getBrainDumpSessions } from '../../../../services/api/brainDump.api'
import { findQuestByCode } from '../../../../config/questCatalog'
import { loadTimeCapsules, type TimeCapsule } from '../../../../utils/timeCapsules'
import { useEscapeKey } from '../../../../hooks/useEscapeKey'
import { BADGE_ICONS } from '../../../../config/iconAssets'
import { domainLabel } from '../../../../config/learningDomains'
import { isQuestDoneNow } from '../../../../utils/questCompletion'
import '../games.css'
import './TenYearForest.css'

/*  ป่าแห่งสิบปี (Ten-Year Forest) → "ปฏิทินการเรียนรู้" ของแต่ละคน
    ─────────────────────────────────────────────────────────────
    ปฏิทินรายเดือน: วันที่มีการเรียนรู้มีจุดสี (เป้าหมาย/บันทึกความรู้/ทบทวน) · วันที่มีนัดทบทวนล่วงหน้ามีจุดทอง
    กดวันไหน → [แก้ตามที่ระบุ] ป็อปอัปแสดงสิ่งที่บันทึกไว้วันนั้น (เดิมแสดงเป็นการ์ดใต้ปฏิทิน):
      🎯 เป้าหมาย (เพ่งสมาธิ) · 🧠 บันทึกความรู้ (หัวข้อ/หมวดหมู่/เนื้อหา + จำได้จริงกี่หัวข้อ)
      🔀 สลับวิชา · 📅 ทบทวน (ทบทวนจริงไหม) · 🪞 กระจกแห่งความจริง (ความรู้สึกจริงหลังเรียน)
      วันในอนาคต → นัดทบทวนที่วางแผนไว้
    [แก้ตามที่ระบุ] รางวัล: streak ต่อเนื่องครบ 21 วันขึ้นไป → กดรับรางวัลได้วันละครั้ง (เควสรายวัน)
    ทฤษฎี: The 10-Year Rule (Ericsson et al., 1993)                                                   */

/** streak ขั้นต่ำที่เริ่มรับรางวัลรายวันได้ */
const TEN_YEAR_FOREST_STREAK_DAYS = 21

const REACTION_EMOJI = { good: '👍', neutral: '😐', bad: '👎' } as const
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const dayKey = (iso: string | Date) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const formatDayLong = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

interface DayEntry {
  goals: { skill: string; improvement: string | null }[]
  notes: { topics: string[]; category: string; content: string; recalled: number; total: number }[]
  switches: { from: string; to: string }[]
  reviews: { capsule: TimeCapsule; state: 'done' | 'missed' | 'planned' }[]
  feelings: { quest: string; reaction: keyof typeof REACTION_EMOJI }[]
}

function completedOn(logs: QuestLogEntry[], code: string, key: string) {
  return logs.filter((l) => l.quest?.code === code && l.status === 'COMPLETED' && l.completedAt && dayKey(l.completedAt) === key)
}

export default function TenYearForestGame({ exit, finish }: QuestGameProps) {
  const { userData, questLogs, questFeedbackLogs } = useAppContext()
  const [dumps, setDumps] = useState<BrainDumpRecord[]>([])
  const capsules = useMemo(() => loadTimeCapsules(userData.id), [userData.id])
  // eslint-disable-next-line react-hooks/purity -- เวลาตอนเปิดหน้า ใช้แยกอดีต/อนาคตและวันนี้
  const now = useMemo(() => Date.now(), [])
  const todayKey = dayKey(new Date(now))
  const [month, setMonth] = useState(() => { const d = new Date(now); return { y: d.getFullYear(), m: d.getMonth() } })
  /** วันที่กดดูอยู่ (null = ปิดป็อปอัป) */
  const [selected, setSelected] = useState<string | null>(null)
  /** [เพิ่มตามที่ระบุ] ป็อปอัป "เป้าหมาย" / "สิ่งที่จะทบทวน" + เป้าหมายที่กดดูรายละเอียดอยู่ */
  const [panel, setPanel] = useState<'goals' | 'reviews' | null>(null)
  const [openGoal, setOpenGoal] = useState<string | null>(null)
  useEscapeKey(() => { setSelected(null); setPanel(null); setOpenGoal(null) }, !!selected || !!panel)

  useEffect(() => {
    let cancelled = false
    getBrainDumpSessions().then((list) => { if (!cancelled) setDumps(list) }).catch(() => { /* ไม่มีบันทึกเสียงก็ยังเห็นส่วนอื่น */ })
    return () => { cancelled = true }
  }, [])

  const entryFor = (key: string): DayEntry => {
    const switches = completedOn(questLogs, 'know-cross-pollination', key)
      .map((l) => ({ from: str(l.payload?.fromLabel) ?? domainLabel(str(l.payload?.fromDomain)), to: str(l.payload?.toLabel) ?? domainLabel(str(l.payload?.toDomain)) }))
    const category = switches.length ? [...new Set(switches.flatMap((s) => [s.from, s.to]))].join(' · ') : 'ทั่วไป'
    return {
      goals: completedOn(questLogs, 'know-active-focus', key)
        .map((l) => ({ skill: str(l.payload?.skill) ?? 'ตั้งเป้าหมายการเรียน', improvement: str(l.payload?.improvement) })),
      notes: dumps.filter((b) => dayKey(b.createdAt) === key).map((b) => ({
        topics: b.topics, category,
        content: b.transcript.length > 160 ? `${b.transcript.slice(0, 160)}…` : b.transcript,
        recalled: b.recalledTopics.length, total: b.topics.length,
      })),
      switches,
      reviews: capsules.filter((c) => dayKey(c.at) === key).map((c) => ({
        capsule: c,
        state: c.doneAt ? 'done' : new Date(c.at).getTime() <= now ? 'missed' : 'planned',
      })),
      feelings: questFeedbackLogs
        .filter((f) => f.questCode.startsWith('know-') && dayKey(f.completedAt) === key)
        .map((f) => ({ quest: findQuestByCode(f.questCode)?.titleTh ?? f.questCode, reaction: f.reaction })),
    }
  }

  // จุดบนปฏิทิน: วันไหนมีอะไรบ้าง
  const marks = useMemo(() => {
    const m = new Map<string, Set<'learn' | 'review' | 'plan'>>()
    const add = (key: string, k: 'learn' | 'review' | 'plan') => { if (!m.has(key)) m.set(key, new Set()); m.get(key)!.add(k) }
    for (const l of questLogs) {
      if (l.status === 'COMPLETED' && l.completedAt && l.quest?.code?.startsWith('know-')) add(dayKey(l.completedAt), 'learn')
    }
    for (const b of dumps) add(dayKey(b.createdAt), 'learn')
    for (const c of capsules) add(dayKey(c.at), new Date(c.at).getTime() > now && !c.doneAt ? 'plan' : 'review')
    return m
  }, [questLogs, dumps, capsules, now])

  const cells = useMemo(() => {
    const first = new Date(month.y, month.m, 1)
    const daysIn = new Date(month.y, month.m + 1, 0).getDate()
    const out: (string | null)[] = Array(first.getDay()).fill(null)
    for (let d = 1; d <= daysIn; d++) out.push(dayKey(new Date(month.y, month.m, d)))
    return out
  }, [month])

  const shiftMonth = (delta: number) => setMonth(({ y, m }) => {
    const d = new Date(y, m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const entry = selected ? entryFor(selected) : null
  const empty = !entry || (!entry.goals.length && !entry.notes.length && !entry.switches.length && !entry.reviews.length && !entry.feelings.length)
  const reviewed = capsules.filter((c) => c.doneAt).length

  /* เป้าหมายทั้งหมด (ใหม่สุดก่อน) — รายละเอียดของแต่ละเป้า = สิ่งที่ทำหลังตั้งเป้านั้นจนถึงเป้าถัดไป (วันเดียวกัน):
     บันทึกเสียง (เทกระเป๋าความจำ) + หมวด/วิชาที่สลับเรียน (ผสมเกสรข้ามศาสตร์) */
  const goals = useMemo(() => {
    const list = questLogs
      .filter((l) => l.quest?.code === 'know-active-focus' && l.status === 'COMPLETED' && l.completedAt)
      .map((l) => ({ id: l.id, at: l.completedAt as string, skill: str(l.payload?.skill) ?? 'ตั้งเป้าหมายการเรียน', improvement: str(l.payload?.improvement) }))
      .sort((a, b) => a.at.localeCompare(b.at))
    return list.map((g, i) => {
      const next = list[i + 1]?.at
      const inWindow = (iso: string) => iso >= g.at && (!next || iso < next) && dayKey(iso) === dayKey(g.at)
      return {
        ...g,
        notes: dumps.filter((b) => inWindow(b.createdAt)),
        subjects: questLogs
          .filter((l) => l.quest?.code === 'know-cross-pollination' && l.status === 'COMPLETED' && l.completedAt && inWindow(l.completedAt))
          .map((l) => ({ from: str(l.payload?.fromLabel) ?? domainLabel(str(l.payload?.fromDomain)), to: str(l.payload?.toLabel) ?? domainLabel(str(l.payload?.toDomain)) })),
      }
    }).reverse()
  }, [questLogs, dumps])

  /* สิ่งที่จะทบทวน: แคปซูลที่ตั้งพร้อมกัน = ชุดเดียวกัน เรียงด่านตามวันนัด (ด่าน 1 → 2 → 3) ชุดที่ตั้งล่าสุดอยู่บน */
  const reviewSets = useMemo(() => {
    const byBatch = new Map<string, TimeCapsule[]>()
    for (const c of capsules) byBatch.set(c.createdAt, [...(byBatch.get(c.createdAt) ?? []), c])
    return [...byBatch.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([createdAt, list]) => ({ createdAt, stages: [...list].sort((a, b) => a.at.localeCompare(b.at)) }))
  }, [capsules])
  const closePanel = () => { setPanel(null); setOpenGoal(null) }
  const dueReviews = capsules.filter((c) => c.doneAt || new Date(c.at).getTime() <= now).length

  const claimedToday = isQuestDoneNow(questLogs, 'know-ten-year-forest')
  const streakReady = userData.streak >= TEN_YEAR_FOREST_STREAK_DAYS

  return (
    <div className="qg">
      {/* [แก้ตามที่ระบุ] รางวัลรายวันของป่าแห่งสิบปี — streak ครบ 21 วันขึ้นไป กดรับได้วันละครั้ง */}
      <div className={`qg-card tyf-reward${streakReady && !claimedToday ? ' tyf-reward--ready' : ''}`}>
        <div className="tyf-reward__text">
          <b><img src={streakReady ? BADGE_ICONS.tree : BADGE_ICONS.seed} className="icon-img" alt="" /> {claimedToday ? 'รับรางวัลวันนี้แล้ว' : streakReady ? 'รางวัลป่าแห่งสิบปีพร้อมแล้ว!' : 'เข้าแอปต่อเนื่องให้ครบ 21 วัน'}</b>
          <small>
            {claimedToday
              ? 'กลับมารับใหม่พรุ่งนี้ — อย่าให้ streak ขาดนะ'
              : streakReady
                ? `ต่อเนื่องมาแล้ว ${userData.streak} วัน รับรางวัลได้วันละครั้ง`
                : `ตอนนี้ ${userData.streak}/${TEN_YEAR_FOREST_STREAK_DAYS} วัน — ครบแล้วรับรางวัลได้ทุกวัน`}
          </small>
          {!streakReady && (
            <div className="tyf-reward__track" aria-hidden="true">
              <div className="tyf-reward__fill" style={{ width: `${Math.min(100, (userData.streak / TEN_YEAR_FOREST_STREAK_DAYS) * 100)}%` }} />
            </div>
          )}
        </div>
        {streakReady && !claimedToday && (
          <button type="button" className="qg-btn tyf-reward__btn" onClick={() => finish({ streakDays: userData.streak })}>
            รับรางวัล
          </button>
        )}
      </div>

      <div className="qg-stat-grid">
        <div className="qg-stat"><strong>{userData.streak}</strong><span>วันต่อเนื่อง</span></div>
        <div className="qg-stat"><strong>{[...marks.values()].filter((s) => s.has('learn')).length}</strong><span>วันที่เรียนรู้</span></div>
        <div className="qg-stat"><strong>{reviewed}/{dueReviews}</strong><span>ทบทวนจริง</span></div>
      </div>

      {/* [เพิ่มตามที่ระบุ] เป้าหมาย / สิ่งที่จะทบทวน — กดแล้วขึ้นป็อปอัป */}
      <div className="tyf-shortcuts">
        <button type="button" className="tyf-shortcut" onClick={() => setPanel('goals')}>
          <span aria-hidden="true">🎯</span><b>เป้าหมาย</b><small>{goals.length} เป้า</small>
        </button>
        <button type="button" className="tyf-shortcut" onClick={() => setPanel('reviews')}>
          <span aria-hidden="true">📅</span><b>สิ่งที่จะทบทวน</b><small>{capsules.filter((c) => !c.doneAt).length} รายการรอทบทวน</small>
        </button>
      </div>

      <div className="qg-card tyf-cal">
        <div className="tyf-cal__head">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="เดือนก่อน">‹</button>
          <span>{new Date(month.y, month.m, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="เดือนถัดไป">›</button>
        </div>
        <div className="tyf-cal__grid" role="grid">
          {WEEKDAYS.map((w) => <span key={w} className="tyf-cal__wd">{w}</span>)}
          {cells.map((key, i) => {
            if (!key) return <span key={`e${i}`} />
            const k = marks.get(key)
            return (
              <button
                key={key}
                type="button"
                className={`tyf-cal__day${key === selected ? ' is-selected' : ''}${key === todayKey ? ' is-today' : ''}${k ? ' has-data' : ''}`}
                onClick={() => setSelected(key)}
                aria-pressed={key === selected}
                aria-label={formatDayLong(key)}
              >
                {Number(key.slice(8))}
                {k && (
                  <span className="tyf-cal__dots" aria-hidden="true">
                    {k.has('learn') && <i className="tyf-dot tyf-dot--learn" />}
                    {k.has('review') && <i className="tyf-dot tyf-dot--review" />}
                    {k.has('plan') && <i className="tyf-dot tyf-dot--plan" />}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="tyf-cal__legend">
          <span><i className="tyf-dot tyf-dot--learn" /> เรียนรู้</span>
          <span><i className="tyf-dot tyf-dot--review" /> ทบทวน</span>
          <span><i className="tyf-dot tyf-dot--plan" /> แพลนทบทวน</span>
        </div>
      </div>

      {selected && entry && createPortal(
        <div className="tyf-popup" role="dialog" aria-modal="true" aria-labelledby="tyf-popup-date" onClick={() => setSelected(null)}>
          <div className="tyf-popup__card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="tyf-popup__close" onClick={() => setSelected(null)} aria-label="ปิด">
              <img src={BADGE_ICONS.close} className="icon-img" alt="" />
            </button>
            <div id="tyf-popup-date" className="tyf-day__date">{formatDayLong(selected)}</div>
            {empty ? (
              <p className="qg-hint">{selected > todayKey ? 'ยังไม่มีแพลนทบทวนในวันนี้' : 'วันนี้ยังไม่มีบันทึกการเรียนรู้'}</p>
            ) : (
              <div className="tyf-day__body">
                {entry.goals.map((g, i) => (
                  <div key={`g${i}`} className="tyf-row"><span>🎯</span><span><b>เป้าหมาย:</b> {g.skill}{g.improvement ? ` — ${g.improvement}` : ''}</span></div>
                ))}
                {entry.notes.map((n, i) => (
                  <div key={`n${i}`} className="tyf-row tyf-row--note">
                    <span>🧠</span>
                    <span>
                      <b>บันทึกความรู้</b> · หมวด {n.category}<br />
                      หัวข้อ: {n.topics.join(', ') || '—'}<br />
                      {n.content && <span className="tyf-quote">“{n.content}”</span>}
                      {n.total > 0 && <span className={`tyf-truth${n.recalled < n.total ? ' tyf-truth--warn' : ''}`}>จำได้จริง {n.recalled}/{n.total} หัวข้อ</span>}
                    </span>
                  </div>
                ))}
                {entry.switches.map((s, i) => (
                  <div key={`s${i}`} className="tyf-row"><span>🔀</span><span>สลับวิชา {s.from} → {s.to}</span></div>
                ))}
                {entry.reviews.map(({ capsule, state }) => (
                  <div key={capsule.id} className="tyf-row">
                    <span>{state === 'done' ? '✅' : state === 'missed' ? '⚠️' : '📅'}</span>
                    <span>
                      <b>{state === 'planned' ? `นัดทบทวน ${formatTime(capsule.at)}` : 'ทบทวน'}</b> {capsule.goal ?? (capsule.topics.join(', ') || 'เนื้อหาที่นัดไว้')}
                      {' · '}{state === 'done' ? 'ทบทวนจริงแล้ว' : state === 'missed' ? 'ถึงกำหนดแต่ยังไม่ได้ทบทวน' : 'รออยู่'}
                    </span>
                  </div>
                ))}
                {entry.feelings.length > 0 && (
                  // กระจกแห่งความจริง — ความรู้สึกที่ตอบตรงๆ หลังเรียน ไม่ใช่แค่ "ทำเควสแล้ว"
                  <div className="tyf-row tyf-row--mirror">
                    <span>🪞</span>
                    <span><b>กระจกแห่งความจริง:</b> {entry.feelings.map((f) => `${f.quest} ${REACTION_EMOJI[f.reaction]}`).join(' · ')}</span>
                  </div>
                )}
              </div>
            )}
            <button type="button" className="tyf-popup__ok" onClick={() => setSelected(null)}>ปิด</button>
          </div>
        </div>,
        document.body,
      )}

      {panel && createPortal(
        <div className="tyf-popup" role="dialog" aria-modal="true" aria-labelledby="tyf-panel-title" onClick={closePanel}>
          <div className="tyf-popup__card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="tyf-popup__close" onClick={closePanel} aria-label="ปิด">
              <img src={BADGE_ICONS.close} className="icon-img" alt="" />
            </button>
            <div id="tyf-panel-title" className="tyf-day__date">{panel === 'goals' ? '🎯 เป้าหมายของฉัน' : '📅 สิ่งที่จะทบทวน'}</div>

            {panel === 'goals' && (goals.length === 0 ? (
              <p className="qg-hint">ยังไม่มีเป้าหมาย — ตั้งเป้าในเควส "เพ่งสมาธิ / ตั้งเป้าหมาย"</p>
            ) : (
              <div className="tyf-list">
                {goals.map((g) => {
                  const open = openGoal === g.id
                  return (
                    <div key={g.id} className={`tyf-goal${open ? ' is-open' : ''}`}>
                      {/* กดชื่อเป้าหมาย → รายละเอียดที่บันทึกเสียง + หมวด/วิชา */}
                      <button type="button" className="tyf-goal__head" onClick={() => setOpenGoal(open ? null : g.id)} aria-expanded={open}>
                        <span className="tyf-goal__name">{g.skill}</span>
                        <span className="tyf-goal__date">{new Date(g.at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} {open ? '▴' : '▾'}</span>
                      </button>
                      {open && (
                        <div className="tyf-day__body">
                          {g.improvement && <div className="tyf-row"><span>✨</span><span><b>อยากพัฒนา:</b> {g.improvement}</span></div>}
                          {g.notes.length === 0 && <div className="tyf-row"><span>🎙️</span><span>ยังไม่มีบันทึกเสียงหลังตั้งเป้านี้</span></div>}
                          {g.notes.map((n) => (
                            <div key={n.id} className="tyf-row tyf-row--note">
                              <span>🎙️</span>
                              <span>
                                <b>บันทึกเสียง</b> · {formatTime(n.createdAt)} · {Math.round(n.durationSec / 60) || 1} นาที<br />
                                หัวข้อ: {n.topics.join(', ') || '—'}<br />
                                {n.transcript && <span className="tyf-quote">“{n.transcript.length > 240 ? `${n.transcript.slice(0, 240)}…` : n.transcript}”</span>}
                                {n.topics.length > 0 && (
                                  <span className={`tyf-truth${n.recalledTopics.length < n.topics.length ? ' tyf-truth--warn' : ''}`}>
                                    จำได้จริง {n.recalledTopics.length}/{n.topics.length} หัวข้อ{n.missedTopics.length ? ` · ลืม: ${n.missedTopics.join(', ')}` : ''}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                          {g.subjects.length > 0 && (
                            <div className="tyf-row"><span>🔀</span><span><b>หมวด/วิชา:</b> {g.subjects.map((x) => `${x.from} → ${x.to}`).join(' · ')}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {panel === 'reviews' && (reviewSets.length === 0 ? (
              <p className="qg-hint">ยังไม่มีนัดทบทวน — ตั้งได้ในเควส "แคปซูลเวลา"</p>
            ) : (
              <div className="tyf-list">
                {reviewSets.map((set) => {
                  const first = set.stages[0]
                  return (
                    <div key={set.createdAt} className="tyf-review">
                      <div className="tyf-review__what">
                        <b>{first.goal ?? 'เนื้อหาที่นัดทบทวน'}</b>
                        {first.topics.length > 0 && <span> · หัวข้อ: {first.topics.join(', ')}</span>}
                      </div>
                      {/* ด่านทบทวนตามลำดับ (ด่าน 1 → 2 → 3 ตามวันนัด) */}
                      <ol className="tyf-review__stages">
                        {set.stages.map((c, i) => {
                          const state = c.doneAt ? 'done' : new Date(c.at).getTime() <= now ? 'missed' : 'planned'
                          return (
                            <li key={c.id} className={`tyf-stage tyf-stage--${state}`}>
                              <span className="tyf-stage__num">ด่าน {i + 1}</span>
                              <span className="tyf-stage__when">{formatDayLong(dayKey(c.at))} {formatTime(c.at)}</span>
                              <span className="tyf-stage__state">{state === 'done' ? '✅ ทบทวนแล้ว' : state === 'missed' ? '⚠️ ถึงกำหนดแล้ว' : '⏳ รออยู่'}</span>
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  )
                })}
              </div>
            ))}

            <button type="button" className="tyf-popup__ok" onClick={closePanel}>ปิด</button>
          </div>
        </div>,
        document.body,
      )}

      {/* เควส passive: หน้าข้อมูลอย่างเดียว ปิดด้วย exit (ไม่ให้รางวัลซ้ำ) */}
      <button className="qg-btn qg-btn--ghost" onClick={exit}>ปิดหน้านี้</button>
    </div>
  )
}
