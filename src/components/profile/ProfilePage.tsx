import { useState } from 'react'
import {
  DEFAULT_USER_DATA,
  type UserData,
  type QuestLogEntry,
  type MoodEntryData,
  type JournalEntryRecord,
  type InventoryItem,
  type PlacedItem,
} from '../../types'
import { DECORATION_ITEM_META, type DecorationCategory } from '../../config/decorationItems'
import { findQuestByCode } from '../../config/questCatalog'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/*============================================================================*\
  ProfilePage — [ไฟล์ใหม่] หน้าโปรไฟล์เต็มจอ เปิดจากปุ่ม "โปรไฟล์" ใน ActionMenuBar
  ────────────────────────────────────────────────────────────────────────────
  แทนที่ InventoryModal เดิม (คลังไอเทมย้ายมาเป็นโซนซ้ายของหน้านี้แทน) แบ่ง 3 โซนตามที่ระบุ:
    a) กลาง  — อวตารรูปร่างตาม BMI (ส่วนสูง/น้ำหนักจาก userData)
    b) ขวา   — กิจกรรมวันนี้ + ปฏิทิน (กดวันไหนดึงสรุปของวันนั้นมาแสดงแทน "วันนี้")
    c) ซ้าย  — ไอเทมที่ซื้อแล้ว จัดกลุ่มตามประเภทร้านค้า (รูปปั้น/ของแขวน/โพสอิท)

  รูปแบบ full-screen overlay (fixed inset:0, padding-top เว้น Navbar, เลื่อนได้) ยึดตาม
  ShopSection.tsx/InventoryModal.tsx เป๊ะ — ใช้ inline style + CSS var() token เดิมทั้งหมด
  ไม่มีสีใหม่/โทเคนใหม่ (ตามที่ระบุห้ามแตะธีมสีรอบนี้)
\*============================================================================*/

const CATEGORY_LABELS: Record<DecorationCategory, string> = {
  statues: '🗿 รูปปั้นกระถาง',
  hangings: '🎐 ของแขวนกิ่งไม้',
  postits: '🗒️ ลายโพสอิทสะสม',
  special: '🎁 รางวัลพิเศษ',
}
const CATEGORY_ORDER: DecorationCategory[] = ['statues', 'hangings', 'postits', 'special']

const ZONE_LABELS: Record<PlacedItem['zone'], string> = {
  pot: '🪴 กระถาง',
  'branch-left': '🌿 กิ่งซ้าย',
  'branch-right': '🌿 กิ่งขวา',
  crown: '🌳 ยอดไม้',
}

const MOOD_EMOJI: Record<MoodEntryData['mood'], string> = {
  HAPPY: '😊', ENERGETIC: '⚡', FOCUSED: '🎯', CALM: '😐',
  SAD: '😔', ANXIOUS: '😰', TIRED: '😴', ANGRY: '😠',
}

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTH_NAMES_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

/** BMI ระดับ 0-3 → พารามิเตอร์ SVG อวตาร (ผอม/ปกติ/ท้วม/อ้วน) — ยิ่งดัชนีสูงตัวยิ่งกว้าง */
const BMI_AVATAR_LEVELS = [
  { label: 'น้ำหนักน้อย', color: 'var(--blue)', headR: 10, bodyRx: 11, bodyRy: 24, armW: 8, legW: 9 },
  { label: 'ปกติ', color: 'var(--g600)', headR: 11, bodyRx: 14, bodyRy: 25, armW: 9, legW: 10.5 },
  { label: 'น้ำหนักเกิน', color: '#E8A020', headR: 12, bodyRx: 18, bodyRy: 25, armW: 11, legW: 12.5 },
  { label: 'อ้วน', color: 'var(--red)', headR: 13, bodyRx: 22, bodyRy: 26, armW: 13, legW: 14.5 },
] as const

function bmiLevelOf(bmi: number): 0 | 1 | 2 | 3 {
  if (bmi < 18.5) return 0
  if (bmi < 23) return 1
  if (bmi < 25) return 2
  return 3
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** วันที่ของ log เควส — ใช้ logDate ก่อน (ตั้งใจให้เป็นวันที่ล้วนไม่มีเวลา) ตกมาที่ completedAt ถ้าไม่มี */
function dateOfLog(log: QuestLogEntry): string | null {
  return log.logDate ?? (log.completedAt ? log.completedAt.split('T')[0] : null)
}
function dateOfIso(iso: string): string {
  return iso.split('T')[0]
}
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

interface ProfilePageProps {
  userData?: UserData
  questLogs?: QuestLogEntry[]
  moodEntries?: MoodEntryData[]
  journalEntries?: JournalEntryRecord[]
  inventoryData?: InventoryItem[]
  onPlace?: (itemId: string, zone: PlacedItem['zone']) => void
  onClose?: () => void
}

export default function ProfilePage({
  userData = DEFAULT_USER_DATA,
  questLogs = [],
  moodEntries = [],
  journalEntries = [],
  inventoryData = [],
  onPlace = () => {},
  onClose = () => {},
}: ProfilePageProps) {
  useLockBodyScroll()
  useEscapeKey(onClose)

  const [sparkleId, setSparkleId] = useState<string | null>(null)
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(toDateStr(today))
  const isToday = selectedDate === toDateStr(today)

  // ── โซนกลาง: อวตาร BMI ──
  const height = userData.height ?? 170
  const weight = userData.weight ?? 60
  const bmi = userData.bmi ?? weight / ((height / 100) ** 2)
  const bmiLevel = bmiLevelOf(bmi)
  const avatar = BMI_AVATAR_LEVELS[bmiLevel]

  // ── โซนขวา: กิจกรรมของวันที่เลือก (ค่าเริ่มต้น = วันนี้) ──
  const moodOfDay = moodEntries.find((m) => dateOfIso(m.createdAt) === selectedDate)
  const journalOfDay = journalEntries.find((j) => j.questCode === 'ment-reframer-journal' && dateOfIso(j.createdAt) === selectedDate)
  const gratitudeOfDay = journalEntries.find((j) => j.questCode === 'ment-gratitude-shield' && dateOfIso(j.createdAt) === selectedDate)

  const completedLogsOfDay = questLogs.filter((l) => l.status === 'COMPLETED' && dateOfLog(l) === selectedDate)
  const activeFocusLog = completedLogsOfDay.find((l) => l.quest?.code === 'know-active-focus')
  const strategicDelayLog = completedLogsOfDay.find((l) => l.quest?.code === 'know-strategic-delay')
  const waterCount = completedLogsOfDay.filter((l) => l.quest?.code === 'phys-pure-water').length

  const activityList = completedLogsOfDay
    .map((l) => ({ log: l, def: l.quest?.code ? findQuestByCode(l.quest.code) : undefined }))
    .filter((entry) => !!entry.def)

  const hasAnyActivity = completedLogsOfDay.length > 0 || !!moodOfDay || !!journalOfDay || !!gratitudeOfDay

  // ── ปฏิทิน ──
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const changeMonth = (delta: number) => {
    let m = calMonth + delta
    let y = calYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setCalMonth(m); setCalYear(y)
  }

  // ── โซนซ้าย: คลังไอเทม จัดกลุ่มตามประเภท ──
  const groupedInventory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: inventoryData.filter((item) => DECORATION_ITEM_META[item.shopItemId]?.category === cat),
  })).filter((g) => g.items.length > 0)

  const handlePlace = (item: InventoryItem) => {
    const meta = DECORATION_ITEM_META[item.shopItemId]
    if (!meta) return
    onPlace(item.shopItemId, meta.zone)
    setSparkleId(item.id)
    window.setTimeout(() => setSparkleId(null), 800)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', overflowY: 'auto' }}>
      <button
        onClick={onClose}
        title="ปิด"
        style={{
          position: 'fixed', top: 14, right: 14, zIndex: 20, width: 44, height: 44, borderRadius: 99,
          border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--sh-card)', color: 'var(--text)',
          cursor: 'pointer', fontSize: 16,
        }}
      >
        ✕
      </button>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '95px 20px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'Fredoka One', fontSize: 34, color: 'var(--g800)' }}>👤 {userData.username || 'ผู้ใช้'}</div>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>
            {userData.mbtiType ?? '—'} · เลเวล {userData.level} · 🪙 {userData.coins.toLocaleString()}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>

          {/* ═══ โซนซ้าย: คลังไอเทม ═══ */}
          <div className="card" style={{ padding: 22, maxHeight: 640, overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 18, color: 'var(--g800)', marginBottom: 4 }}>🎒 คลังไอเทม</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>กดไอเทมเพื่อวางบนต้นไม้ กดซ้ำเพื่อถอด</p>

            {groupedInventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                ยังไม่มีไอเทมในคลัง — ไปซื้อจากร้านค้าได้เลย!
              </div>
            ) : (
              groupedInventory.map((group) => (
                <div key={group.category} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-sub)', marginBottom: 8 }}>
                    {CATEGORY_LABELS[group.category]}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
                    {group.items.map((item) => {
                      const meta = DECORATION_ITEM_META[item.shopItemId]
                      const isSparkle = sparkleId === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => handlePlace(item)}
                          style={{
                            padding: '14px 8px',
                            border: `2px solid ${item.isEquipped ? 'var(--g600)' : 'var(--border-mid)'}`,
                            borderRadius: 16,
                            background: item.isEquipped ? 'var(--g50)' : 'var(--bg-card)',
                            cursor: 'pointer', textAlign: 'center', position: 'relative',
                            transition: 'transform .15s',
                          }}
                        >
                          {isSparkle && (
                            <span style={{
                              position: 'absolute', inset: -4, borderRadius: 18,
                              boxShadow: '0 0 0 3px var(--coin)', animation: 'sparkleRing .65s ease-out forwards',
                            }} />
                          )}
                          <div style={{ fontSize: 30, marginBottom: 4 }}>{meta?.emoji}</div>
                          <div style={{ fontFamily: 'Fredoka One', fontSize: 10.5, color: 'var(--text)' }}>{meta?.nameTh}</div>
                          <span
                            className="tag"
                            style={{
                              marginTop: 4,
                              background: item.isEquipped ? 'var(--g100)' : 'var(--n100)',
                              color: item.isEquipped ? 'var(--g700)' : 'var(--text-muted)',
                              fontSize: 8,
                            }}
                          >
                            {item.isEquipped ? '✓ ' : ''}{ZONE_LABELS[meta?.zone ?? 'pot']}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ═══ โซนกลาง: อวตาร BMI ═══ */}
          <div className="card" style={{ padding: 22, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 18, color: 'var(--g800)', marginBottom: 16 }}>📊 รูปร่างของคุณ</div>

            <svg viewBox="0 0 80 150" width={140} height={260} style={{ margin: '0 auto', display: 'block' }}>
              <circle cx="40" cy="20" r={avatar.headR} fill={avatar.color} />
              <circle cx="36" cy="17" r={3} fill="var(--glass-w-30)" />
              <rect x={40 - avatar.armW / 2} y="30" width={avatar.armW} height="10" rx="4" fill={avatar.color} />
              <ellipse cx="40" cy={30 + avatar.bodyRy * 0.62} rx={avatar.bodyRx} ry={avatar.bodyRy} fill={avatar.color} />
              <ellipse cx={40 - avatar.bodyRx * 0.35} cy={30 + avatar.bodyRy * 0.45} rx="6" ry="4" fill="var(--glass-w-18)" />
              <rect x={40 - avatar.bodyRx - avatar.armW * 0.4} y="46" width={avatar.armW} height={avatar.bodyRy * 1.15} rx="6"
                fill={avatar.color} transform={`rotate(-9 ${40 - avatar.bodyRx} 70)`} />
              <rect x={40 + avatar.bodyRx - avatar.armW * 0.6} y="46" width={avatar.armW} height={avatar.bodyRy * 1.15} rx="6"
                fill={avatar.color} transform={`rotate(9 ${40 + avatar.bodyRx} 70)`} />
              <rect x={40 - avatar.legW - 2} y={30 + avatar.bodyRy * 1.5} width={avatar.legW} height="42" rx="6"
                fill={avatar.color} transform={`rotate(-3 ${40 - avatar.legW - 2} ${30 + avatar.bodyRy * 1.5})`} />
              <rect x={40 + 2} y={30 + avatar.bodyRy * 1.5} width={avatar.legW} height="42" rx="6"
                fill={avatar.color} transform={`rotate(3 ${40 + 2} ${30 + avatar.bodyRy * 1.5})`} />
            </svg>

            <div style={{ fontFamily: 'Fredoka One', fontSize: 38, color: avatar.color, marginTop: 8 }}>{bmi.toFixed(1)}</div>
            <span className="tag" style={{ background: `color-mix(in srgb, ${avatar.color} 18%, transparent)`, color: avatar.color }}>
              BMI · {avatar.label}
            </span>

            <div style={{ height: 10, background: 'linear-gradient(90deg, var(--blue) 0%, var(--g600) 30%, #E8A020 60%, var(--red) 100%)', borderRadius: 99, position: 'relative', margin: '16px 0 6px' }}>
              <div style={{
                position: 'absolute', top: -3, width: 16, height: 16, borderRadius: '50%',
                background: 'var(--fixed-white)', border: `3px solid ${avatar.color}`,
                left: `${Math.min(96, Math.max(2, ((bmi - 15) / 20) * 100))}%`, transform: 'translateX(-50%)',
                boxShadow: `0 2px 8px ${avatar.color}88`,
              }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ส่วนสูง <b>{height} ซม.</b> · น้ำหนัก <b>{weight} กก.</b></div>
          </div>

          {/* ═══ โซนขวา: กิจกรรม + ปฏิทิน ═══ */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 18, color: 'var(--g800)', marginBottom: 4 }}>
              📋 {isToday ? 'กิจกรรมวันนี้' : `กิจกรรมวันที่ ${selectedDate}`}
            </div>

            {!hasAnyActivity ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12.5 }}>
                ยังไม่มีบันทึกกิจกรรมของวันนี้ — ลองไปทำเควสหรือเช็คอินอารมณ์ดูสิ
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {moodOfDay && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 }}>
                    <b>{MOOD_EMOJI[moodOfDay.mood]} อารมณ์วันนั้น</b>
                    {moodOfDay.note && <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{moodOfDay.note}</div>}
                  </div>
                )}
                {activeFocusLog && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 }}>
                    <b>🎯 เป้าหมายการเรียนรู้</b>
                    <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{String(activeFocusLog.payload?.skill ?? '—')}</div>
                  </div>
                )}
                {strategicDelayLog && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 }}>
                    <b>📅 ทบทวนเรื่อง</b>
                    <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{String(strategicDelayLog.payload?.topic ?? '—')}</div>
                  </div>
                )}
                {waterCount > 0 && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 }}>
                    <b>💧 ดื่มน้ำ</b> — {waterCount} แก้ว
                  </div>
                )}
                {journalOfDay && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 }}>
                    <b>📖 สมุดบันทึกรากไม้เรืองแสง</b>
                    <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{journalOfDay.title}</div>
                  </div>
                )}
                {gratitudeOfDay && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 }}>
                    <b>🛡️ เกราะแห่งความขอบคุณ</b>
                    <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{gratitudeOfDay.originalText}</div>
                  </div>
                )}
                {activityList.length > 0 && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 }}>
                    <b>✅ เควสที่ทำสำเร็จ ({activityList.length})</b>
                    <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {activityList.map(({ log, def }) => (
                        <span key={log.id} className="tag" style={{ background: 'var(--g100)', color: 'var(--g700)' }}>
                          {def?.icon} {def?.titleTh}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ปฏิทิน */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text-sub)' }}>←</button>
              <div style={{ fontFamily: 'Fredoka One', fontSize: 14, color: 'var(--g800)' }}>📅 {MONTH_NAMES_TH[calMonth]} {calYear}</div>
              <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--text-sub)' }}>→</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DAYS_TH.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const mood = moodEntries.find((m) => dateOfIso(m.createdAt) === dateStr)
                const hasActivity = !mood && questLogs.some((l) => l.status === 'COMPLETED' && dateOfLog(l) === dateStr)
                const isTodayCell = dateStr === toDateStr(today)
                const isSelected = selectedDate === dateStr
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      aspectRatio: '1', borderRadius: 8,
                      border: isSelected ? '2px solid var(--g600)' : isTodayCell ? '2px solid var(--g300)' : '1.5px solid transparent',
                      background: mood ? 'var(--g50)' : isTodayCell ? 'var(--g50)' : 'var(--n50)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: isTodayCell ? 700 : 500, color: isTodayCell ? 'var(--g700)' : 'var(--text-sub)',
                      padding: 2,
                    }}
                  >
                    <span>{day}</span>
                    {mood && <span style={{ fontSize: 11, lineHeight: 1 }}>{MOOD_EMOJI[mood.mood]}</span>}
                    {hasActivity && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--g500)' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
