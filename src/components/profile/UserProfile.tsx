import { useState } from 'react'
import {
  MBTI_TREE_THEME,
  DEFAULT_USER_DATA,
  type UserData,
  type MbtiType,
  type MoodEntryData,
  type QuestLogEntry,
} from '../../types'

const C_1 = '#FFE8EE'
const C_2 = '#FFF4EE'
const TEXT_3 = '#8B6000'
const C_4 = '#FFF9C4'
const BG_5 = '#E8A020'
const C_6 = '#E8A020'

const DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

interface UserProfileProps {
  userData?: UserData
  moodEntries?: MoodEntryData[]
  questLogs?: QuestLogEntry[]
}

// [ตัวแปรตรง backend] MoodEntry.category ใน docs/DATA_DICTIONARY.md เป็น POSITIVE/NEGATIVE/NEUTRAL
// ไม่ใช่ good/neutral/bad ที่ LegacyState เคยแปลงให้ — ใช้ literal จริงตรงๆ ในนี้เลย
const moodEmoji: Record<MoodEntryData['category'], string> = { POSITIVE: '😊', NEUTRAL: '😐', NEGATIVE: '😔' }
const moodColor: Record<MoodEntryData['category'], string> = { POSITIVE: 'var(--g100)', NEUTRAL: 'var(--b50)', NEGATIVE: C_1 }

export default function UserProfile({ userData = DEFAULT_USER_DATA, moodEntries = [], questLogs = [] }: UserProfileProps) {
  const theme = MBTI_TREE_THEME[userData.mbtiType as MbtiType] ?? MBTI_TREE_THEME.INFP
  // height/weight เป็น nullable ใน backend (ผู้ใช้อาจยังไม่กรอกตอนสมัคร) — ใช้ค่ากลาง
  // เป็น fallback แค่สำหรับคำนวณแสดงผล ไม่ได้เขียนทับค่าจริงใน userData
  const height = userData.height ?? 170
  const weight = userData.weight ?? 60
  const bmi = weight / ((height / 100) ** 2)
  const bmiLabel = bmi < 18.5 ? 'น้ำหนักน้อย' : bmi < 23 ? 'ปกติ' : bmi < 25 ? 'น้ำหนักเกิน' : 'อ้วน'
  const bmiColor = bmi < 18.5 ? 'var(--blue)' : bmi < 23 ? 'var(--g600)' : bmi < 25 ? C_6 : 'var(--red)'

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  const getMoodForDate = (dateStr: string): MoodEntryData | undefined =>
    moodEntries.find(m => (m.createdAt ?? '').split('T')[0] === dateStr)

  const selectedEntry = selectedDay ? getMoodForDate(selectedDay) : undefined

  const completedTotal = questLogs.filter((l) => l.status === 'COMPLETED').length
  const bodyLean = userData.healthStack > 250 || completedTotal > 10

  return (
    <section id="profile" style={{ padding: '48px 20px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h2 style={{ fontFamily: 'Fredoka One', fontSize: 34, color: 'var(--g800)' }}>👤 ข้อมูลของคุณ</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>

        {/* User card */}
        <div className="card" style={{ padding: '24px', border: `2px solid ${theme.accent}33` }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: `linear-gradient(135deg, ${theme.accent}, ${theme.leaves[1] ?? theme.leaves[0]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka One', fontSize: 28, color: 'var(--fixed-white)', boxShadow: `0 4px 16px ${theme.accent}44` }}>
              {userData.username.slice(0, 1) || '🌱'}
            </div>
            <div>
              <div style={{ fontFamily: 'Fredoka One', fontSize: 22, color: 'var(--n900)' }}>{userData.username || 'ผู้ใช้'}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span className="tag" style={{ background: theme.accent + '22', color: theme.accent, border: `1px solid ${theme.accent}44` }}>{userData.mbtiType}</span>
                <span className="tag" style={{ background: 'var(--g50)', color: 'var(--g700)', border: '1px solid var(--g200)' }}>🌳 Lv.{userData.level}</span>
              </div>
            </div>
          </div>

          {/* Stats grid — [ตัวแปรตรง backend] เดิมโชว์ learningHours/stepsTotal ที่ไม่มี field
              แบบนี้ใน backend เลย เปลี่ยนมาโชว์ knowledgeStack/healthStack/streak/coins ที่มีจริง */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'ความรู้สะสม', val: userData.knowledgeStack.toLocaleString(), icon: '📚', color: 'var(--g600)', bg: 'var(--g50)' },
              { label: 'สุขภาพสะสม', val: userData.healthStack.toLocaleString(), icon: '💪', color: 'var(--b500)', bg: 'var(--b50)' },
              { label: 'Streak', val: userData.streak + ' วัน', icon: '🔥', color: 'var(--orange)', bg: C_2 },
              { label: 'เหรียญ', val: userData.coins.toLocaleString(), icon: '🪙', color: TEXT_3, bg: C_4 },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--r-md)', padding: '12px', border: `1px solid ${s.color}22` }}>
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Fredoka One', fontSize: 18, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--n300)', fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* BMI + Body silhouette — bmi คำนวณฝั่ง backend เป็นหลัก (userData.bmi) แต่ยังไม่มี
            ค่าจริงส่งมาตอนนี้ จึงคำนวณสำรองฝั่งนี้จาก height/weight เพื่อแสดงผลไปพลางก่อน */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ fontFamily: 'Fredoka One', fontSize: 18, color: 'var(--g800)', marginBottom: 16 }}>📊 ดัชนีมวลกาย (BMI)</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* BMI gauge */}
            <div style={{ flex: 1 }}>
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div style={{ fontFamily: 'Fredoka One', fontSize: 42, color: bmiColor }}>{(userData.bmi ?? bmi).toFixed(1)}</div>
                <div className="tag" style={{ background: bmiColor + '22', color: bmiColor }}>{bmiLabel}</div>
              </div>
              {/* Gradient bar */}
              <div style={{ height: 12, background: `linear-gradient(90deg, var(--blue) 0%, var(--g600) 30%, ${BG_5} 60%, var(--red) 100%)`, borderRadius: 99, position: 'relative', marginBottom: 6 }}>
                <div style={{
                  position: 'absolute', top: -4, width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--fixed-white)', border: `3px solid ${bmiColor}`,
                  left: `${Math.min(95, Math.max(0, (bmi - 15) / 20 * 100))}%`,
                  transform: 'translateX(-50%)',
                  boxShadow: `0 2px 8px ${bmiColor}88`, transition: 'left .5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--n300)', fontWeight: 700 }}>
                <span>ผอม (18.5)</span><span>ปกติ (23)</span><span>อ้วน (30)</span>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--n500)' }}>
                ส่วนสูง: <b>{height} ซม.</b> · น้ำหนัก: <b>{weight} กก.</b>
              </div>
            </div>

            {/* Body silhouette */}
            <div style={{ flexShrink: 0 }}>
              <svg viewBox="0 0 60 120" width={60} height={120}>
                {/* Head */}
                <circle cx="30" cy="14" r={bodyLean ? 10 : 12} fill={theme.accent} />
                <circle cx="26" cy="12" r={3} fill="var(--glass-w-30)" />
                {/* Neck */}
                <rect x={bodyLean ? 26 : 24} y="23" width={bodyLean ? 8 : 12} height="8" rx="3" fill={theme.accent} />
                {/* Body */}
                <ellipse cx="30" cy="58" rx={bodyLean ? 13 : 18} ry={bodyLean ? 22 : 25} fill={theme.accent} />
                <ellipse cx="22" cy="52" rx="5" ry="3" fill="var(--glass-w-18)" />
                {/* Arms */}
                <rect x={bodyLean ? 4 : 1} y="32" width="10" height={bodyLean ? 28 : 32} rx="5" fill={theme.accent} transform="rotate(-8 14 50)" />
                <rect x={bodyLean ? 46 : 49} y="32" width="10" height={bodyLean ? 28 : 32} rx="5" fill={theme.accent} transform="rotate(8 46 50)" />
                {/* Legs */}
                <rect x="21" y="78" width={bodyLean ? 10 : 12} height="35" rx="5" fill={theme.accent} transform="rotate(-3 25 95)" />
                <rect x="32" y="78" width={bodyLean ? 10 : 12} height="35" rx="5" fill={theme.accent} transform="rotate(3 35 95)" />
              </svg>
              <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--n300)', fontWeight: 700, marginTop: 4 }}>
                {bodyLean ? '💪 ฟิต!' : '🌿 กำลังพัฒนา'}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="card" style={{ padding: '24px', gridColumn: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, color: 'var(--n500)' }}>←</button>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 17, color: 'var(--g800)' }}>
              📅 {MONTH_NAMES_TH[calMonth]} {calYear}
            </div>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, color: 'var(--n500)' }}>→</button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--n300)', padding: '4px 0' }}>{d}</div>)}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const entry = getMoodForDate(dateStr)
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSelected = selectedDay === dateStr
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    aspectRatio: '1', borderRadius: 8, border: isToday ? `2px solid ${theme.accent}` : isSelected ? '2px solid var(--g600)' : '1.5px solid transparent',
                    background: entry ? moodColor[entry.category] : isToday ? theme.accent + '11' : 'var(--n50)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0,
                    fontSize: 10, fontWeight: isToday ? 700 : 500, color: isToday ? theme.accent : 'var(--n700)',
                    transition: 'transform .12s',
                    padding: 2,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  <span>{day}</span>
                  {entry && <span style={{ fontSize: 12, lineHeight: 1 }}>{moodEmoji[entry.category]}</span>}
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && selectedEntry && (
            <div style={{ marginTop: 14, background: moodColor[selectedEntry.category], borderRadius: 12, padding: '12px 14px', border: `1.5px solid var(--glass-b-7)` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n700)', marginBottom: 4 }}>
                {moodEmoji[selectedEntry.category]} บันทึก {selectedDay}
              </div>
              <div style={{ fontSize: 12, color: 'var(--n700)', lineHeight: 1.5 }}>{selectedEntry.note}</div>
            </div>
          )}
          {selectedDay && !selectedEntry && (
            <div style={{ marginTop: 14, background: 'var(--n50)', borderRadius: 12, padding: '12px 14px', textAlign: 'center', fontSize: 12, color: 'var(--n300)' }}>
              ไม่มีบันทึกสำหรับวันนี้
            </div>
          )}
        </div>
      </div>
    </section>
  )
}