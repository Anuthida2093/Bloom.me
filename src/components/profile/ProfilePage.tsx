import { useState } from 'react'
import {
  DEFAULT_USER_DATA,
  type UserData,
  type QuestLogEntry,
  type MoodEntryData,
  type JournalEntryRecord,
  type InventoryItem,
  type PlacedItem,
  type BodyType,
} from '../../types'
import { DECORATION_ITEM_META, type DecorationCategory } from '../../config/decorationItems'
import { findQuestByCode } from '../../config/questCatalog'
import { BADGE_CATALOG } from '../../config/badgeCatalog'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { BADGE_ICONS, ITEM_ICONS, QUEST_ICONS } from '../../config/iconAssets'
import { computeBmi, computeBodyType } from '../../utils/bmi'
import { getBodyTypeImagePath } from '../../config/bodyTypeAssets'
// [ย้ายตามที่ระบุ — ข้อ 12] ปุ่ม "ประวัติสมุดบันทึกรากไม้เรืองแสง"/"ประวัติเกราะแห่งความ
// ขอบคุณ" ย้ายจากป้ายลอยมุมซ้ายบนของ ReframerJournalPage.tsx/GratitudeShieldPage.tsx มาไว้
// ที่นี่แทน — reuse JournalHistoryModal ตัวเดิมเป๊ะ (ย้ายจุดเรียกใช้ ไม่เขียน UI แสดงผลใหม่)
import JournalHistoryModal from '../quest/mental/shared/JournalHistoryModal'

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

/** [แก้ตามที่ระบุ — เอาตาม backend] เดิมมี 4 ระดับ (ผอม/ปกติ/เกิน/อ้วน) คำนวณจาก bmi ตรงๆ
 *  แยกจาก userData.bodyType อย่างสิ้นเชิง (ฟิลด์นั้นไม่เคยถูกอ่าน/เขียนที่ไหนเลย) — ตอนนี้ยุบ
 *  เหลือ 3 ระดับให้ตรงกับ BodyType enum จริงของ backend (THIN/AVERAGE/OVERWEIGHT) คีย์เป็น
 *  BodyType ตรงๆ ใช้พารามิเตอร์ทรงของระดับ "อ้วน" เดิมสำหรับ OVERWEIGHT (เห็นความต่างจาก
 *  AVERAGE ชัดกว่าใช้ทรง "น้ำหนักเกิน" เดิมที่ใกล้เคียง AVERAGE เกินไป) ดูเกณฑ์ตัวเลขที่
 *  src/utils/bmi.ts (computeBodyType) */
const BMI_AVATAR_LEVELS: Record<BodyType, { label: string; color: string; headR: number; bodyRx: number; bodyRy: number; armW: number; legW: number }> = {
  THIN: { label: 'น้ำหนักน้อย', color: 'var(--blue)', headR: 10, bodyRx: 11, bodyRy: 24, armW: 8, legW: 9 },
  AVERAGE: { label: 'ปกติ', color: 'var(--g600)', headR: 11, bodyRx: 14, bodyRy: 25, armW: 9, legW: 10.5 },
  OVERWEIGHT: { label: 'น้ำหนักเกิน', color: 'var(--red)', headR: 13, bodyRx: 22, bodyRy: 26, armW: 13, legW: 14.5 },
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
  /** [เพิ่มตามที่ระบุ] code ของ badge ที่ปลดล็อกแล้ว (MentalContext.earnedBadges) — แสดงใน
   *  การ์ด "ความสำเร็จ" ใหม่ด้านล่าง */
  earnedBadges?: string[]
  onPlace?: (itemId: string, zone: PlacedItem['zone']) => void
  onClose?: () => void
}

export default function ProfilePage({
  userData = DEFAULT_USER_DATA,
  questLogs = [],
  moodEntries = [],
  journalEntries = [],
  inventoryData = [],
  earnedBadges = [],
  onPlace = () => {},
  onClose = () => {},
}: ProfilePageProps) {
  useLockBodyScroll()
  useEscapeKey(onClose)

  const [sparkleId, setSparkleId] = useState<string | null>(null)
  /** [ย้ายตามที่ระบุ — ข้อ 12] เปิด JournalHistoryModal ของเควสไหน — null = ปิดอยู่ */
  const [openHistoryFor, setOpenHistoryFor] = useState<'ment-reframer-journal' | 'ment-gratitude-shield' | null>(null)
  /** [เพิ่มตามที่ระบุ — ข้อ 15] แท็บกรองหมวดหมู่คลังไอเทม — pattern เดียวกับ shopCategory ใน
   *  ShopSection.tsx ('all' เพิ่มเข้ามาเป็นค่าเริ่มต้นเพื่อไม่ให้พฤติกรรมเดิม "เห็นทุกหมวด
   *  พร้อมกัน" หายไปทันทีที่อัปเดต — ผู้ใช้กดเลือกหมวดเพื่อกรองดูทีละหมวดได้เพิ่มเข้ามา) */
  const [inventoryFilter, setInventoryFilter] = useState<DecorationCategory | 'all'>('all')
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(toDateStr(today))
  const isToday = selectedDate === toDateStr(today)

  // ── โซนกลาง: อวตาร BMI ──
  const height = userData.height ?? 170
  const weight = userData.weight ?? 60
  const bmi = userData.bmi ?? computeBmi(height, weight)
  const bodyType = userData.bodyType ?? computeBodyType(bmi)
  const avatar = BMI_AVATAR_LEVELS[bodyType]
  // [ใหม่] เพศ+BMI → รูปจริง (แทนอวตาร SVG สีเขียวเดิมด้านล่าง) — derived สดจาก userData ตรงๆ
  // ทุก render (ไม่ใช่ state แยก) ให้เปลี่ยนทันทีถ้าแก้ส่วนสูง/น้ำหนัก/เพศแล้วกลับมาหน้านี้
  const gender = userData.gender ?? 'FEMALE'
  const bodyTypeImageUrl = getBodyTypeImagePath(gender, bmi)

  // ── โซนขวา: กิจกรรมของวันที่เลือก (ค่าเริ่มต้น = วันนี้) ──
  const moodOfDay = moodEntries.find((m) => dateOfIso(m.createdAt) === selectedDate)
  const journalOfDay = journalEntries.find((j) => j.questCode === 'ment-reframer-journal' && dateOfIso(j.createdAt) === selectedDate)
  const gratitudeOfDay = journalEntries.find((j) => j.questCode === 'ment-gratitude-shield' && dateOfIso(j.createdAt) === selectedDate)

  const completedLogsOfDay = questLogs.filter((l) => l.status === 'COMPLETED' && dateOfLog(l) === selectedDate)
  const activeFocusLog = completedLogsOfDay.find((l) => l.quest?.code === 'know-active-focus')
  // [แก้ตามที่ระบุ] เปลี่ยนตาม code ใหม่ที่ sync กับ backend (ดู questCatalog.ts ข้อ 1)
  const contentReviewLog = completedLogsOfDay.find((l) => l.quest?.code === 'know-content-review')
  const waterCount = completedLogsOfDay.filter((l) => l.quest?.code === 'phys-hydration-drop').length

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
  /** [เพิ่มตามที่ระบุ — ข้อ 15] 'all' โชว์ทุกหมวด (พฤติกรรมเดิม) เลือกหมวดใดหมวดหนึ่ง = กรอง
   *  เหลือเฉพาะหมวดนั้น เหมือนแท็บหมวดหมู่ของ ShopSection.tsx */
  const visibleInventoryGroups = inventoryFilter === 'all'
    ? groupedInventory
    : groupedInventory.filter((g) => g.category === inventoryFilter)

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
          <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-3xl)', color: 'var(--heading-accent)' }}>👤 {userData.username || 'ผู้ใช้'}</div>
          {/* [แก้ตามที่ระบุ — ข้อ 7] ขยาย MBTI/Lv./เหรียญ ให้เด่นชัดขึ้น (เดิม fs-sm เท่าตัวหนังสือรองทั่วไป) ใช้ --fs-md + ตัวหนา แทนตัวเลขแบนราบเดิม */}
          <p style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text-sub)', marginTop: 4 }}>
            {userData.mbtiType ?? '—'} · เลเวล {userData.level} · <img src={BADGE_ICONS.coins} className="icon-img" alt="" /> {userData.coins.toLocaleString()}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>

          {/* ═══ โซนซ้าย: คลังไอเทม ═══ */}
          <div className="card" style={{ padding: 22, maxHeight: 640, overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-xl)', color: 'var(--heading-accent)', marginBottom: 4 }}><img src={BADGE_ICONS.item} className="icon-img" alt="" /> คลังไอเทม</div>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>กดไอเทมเพื่อวางบนต้นไม้ กดซ้ำเพื่อถอด</p>

            {groupedInventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                <div style={{ fontSize: 'calc(var(--fs-3xl) * 1.3)', marginBottom: 8 }}>📦</div>
                ยังไม่มีไอเทมในคลัง — ไปซื้อจากร้านค้าได้เลย!
              </div>
            ) : (
              <>
                {/* [เพิ่มตามที่ระบุ — ข้อ 15] แท็บกรองหมวดหมู่ — เฉพาะหมวดที่มีไอเทมจริงเท่านั้น */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button
                    onClick={() => setInventoryFilter('all')}
                    className="tag"
                    style={{
                      cursor: 'pointer', border: 'none',
                      background: inventoryFilter === 'all' ? 'var(--g600)' : 'var(--n100)',
                      color: inventoryFilter === 'all' ? 'var(--fixed-white)' : 'var(--text-muted)',
                    }}
                  >
                    ทั้งหมด
                  </button>
                  {groupedInventory.map((group) => (
                    <button
                      key={group.category}
                      onClick={() => setInventoryFilter(group.category)}
                      className="tag"
                      style={{
                        cursor: 'pointer', border: 'none',
                        background: inventoryFilter === group.category ? 'var(--g600)' : 'var(--n100)',
                        color: inventoryFilter === group.category ? 'var(--fixed-white)' : 'var(--text-muted)',
                      }}
                    >
                      {CATEGORY_LABELS[group.category]}
                    </button>
                  ))}
                </div>
                {visibleInventoryGroups.map((group) => (
                <div key={group.category} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text-sub)', marginBottom: 8 }}>
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
                          <div style={{ fontSize: 'var(--fs-3xl)', marginBottom: 4 }}>
                            {ITEM_ICONS[item.shopItemId]
                              ? <img src={ITEM_ICONS[item.shopItemId]} alt={meta?.nameTh ?? ''} style={{ width: 36, height: 36, objectFit: 'contain', margin: '0 auto' }} />
                              : meta?.emoji}
                          </div>
                          <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-xs)', color: 'var(--text)' }}>{meta?.nameTh}</div>
                          <span
                            className="tag"
                            style={{
                              marginTop: 4,
                              background: item.isEquipped ? 'var(--g100)' : 'var(--n100)',
                              color: item.isEquipped ? 'var(--g700)' : 'var(--text-muted)',
                              fontSize: 'var(--fs-xs)',
                            }}
                          >
                            {item.isEquipped ? '✓ ' : ''}{ZONE_LABELS[meta?.zone ?? 'pot']}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              </>
            )}
          </div>

          {/* ═══ โซนกลาง: อวตาร BMI ═══ */}
          <div className="card" style={{ padding: 22, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-xl)', color: 'var(--heading-accent)', marginBottom: 16 }}>📊 รูปร่างของคุณ</div>

            {/* [แก้ — ตามที่ระบุ] เดิมเป็นอวตาร SVG วาดเองสีเขียวเดียวไม่แยกเพศ (ดู avatar.color
                ด้านบน ยังใช้อยู่กับแท็ก/หมุดสไลเดอร์ด้านล่าง แค่ตัวรูปคนเปลี่ยนเป็นภาพจริงตาม
                เพศ+BMI แทน — key={bodyTypeImageUrl} ให้ <img> remount ทันทีที่ path เปลี่ยน
                (เพศ/BMI เปลี่ยน) กันรูปเก่าค้างจากปัญหา browser cache ตัวเดียวกับ URL เดิม) */}
            <img
              key={bodyTypeImageUrl}
              src={bodyTypeImageUrl}
              alt={`รูปร่างตาม BMI ${bmi.toFixed(1)}`}
              style={{ width: '100%', maxWidth: 200, aspectRatio: '1 / 1', objectFit: 'contain', margin: '0 auto', display: 'block' }}
            />

            <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-3xl)', color: avatar.color, marginTop: 8 }}>{bmi.toFixed(1)}</div>
            <span className="tag" style={{ background: `color-mix(in srgb, ${avatar.color} 18%, transparent)`, color: avatar.color, fontSize: 'var(--fs-sm)' }}>
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
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>ส่วนสูง <b>{height} ซม.</b> · น้ำหนัก <b>{weight} กก.</b></div>
          </div>

          {/* ═══ โซนขวา: กิจกรรม + ปฏิทิน ═══ */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-xl)', color: 'var(--heading-accent)', marginBottom: 4 }}>
              📋 {isToday ? 'กิจกรรมวันนี้' : `กิจกรรมวันที่ ${selectedDate}`}
            </div>

            {!hasAnyActivity ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                ยังไม่มีบันทึกกิจกรรมของวันนี้ — ลองไปทำเควสหรือเช็คอินอารมณ์ดูสิ
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {moodOfDay && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 'var(--fs-sm)' }}>
                    <b>{MOOD_EMOJI[moodOfDay.mood]} อารมณ์วันนั้น</b>
                    {moodOfDay.note && <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{moodOfDay.note}</div>}
                  </div>
                )}
                {activeFocusLog && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 'var(--fs-sm)' }}>
                    <b>🎯 เป้าหมายการเรียนรู้</b>
                    <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{String(activeFocusLog.payload?.skill ?? '—')}</div>
                  </div>
                )}
                {contentReviewLog && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 'var(--fs-sm)' }}>
                    <b>📅 แคปซูลเวลา — นัดทบทวนวันที่</b>
                    <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{String(contentReviewLog.payload?.scheduledReviewDate ?? '—')}</div>
                  </div>
                )}
                {waterCount > 0 && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 'var(--fs-sm)' }}>
                    <b><img src={BADGE_ICONS.water} className="icon-img" alt="" /> ดื่มน้ำ</b> — {waterCount} แก้ว
                  </div>
                )}
                {journalOfDay && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 'var(--fs-sm)' }}>
                    <b>📖 สมุดบันทึกรากไม้เรืองแสง</b>
                    <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{journalOfDay.title}</div>
                  </div>
                )}
                {gratitudeOfDay && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 'var(--fs-sm)' }}>
                    <b>🛡️ เกราะแห่งความขอบคุณ</b>
                    <div style={{ marginTop: 2, color: 'var(--text-sub)' }}>{gratitudeOfDay.originalText}</div>
                  </div>
                )}
                {activityList.length > 0 && (
                  <div style={{ background: 'var(--n50)', borderRadius: 12, padding: '10px 12px', fontSize: 'var(--fs-sm)' }}>
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

            {/* ปฏิทิน — [แก้ตามที่ระบุ — ข้อ 7] ขยายตัวเลข/หัวคอลัมน์ + เพิ่ม gap ให้โปร่งขึ้น
                (เดิม gap 2-3px แน่นจนอ่านยาก, ตัวอักษร 10px เล็กเกินไปเทียบกับพื้นที่การ์ด) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', fontSize: 'var(--fs-lg)', cursor: 'pointer', color: 'var(--text-sub)' }}>←</button>
              <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-md)', color: 'var(--heading-accent)' }}>📅 {MONTH_NAMES_TH[calMonth]} {calYear}</div>
              <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', fontSize: 'var(--fs-lg)', cursor: 'pointer', color: 'var(--text-sub)' }}>→</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
              {DAYS_TH.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
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
                      fontSize: 'var(--fs-xs)', fontWeight: isTodayCell ? 700 : 500, color: isTodayCell ? 'var(--g700)' : 'var(--text-sub)',
                      padding: 2,
                    }}
                  >
                    <span>{day}</span>
                    {mood && <span style={{ fontSize: 'var(--fs-sm)', lineHeight: 1 }}>{MOOD_EMOJI[mood.mood]}</span>}
                    {hasActivity && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--g500)' }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ═══ [ย้ายตามที่ระบุ — ข้อ 12] ประวัติการเขียนบันทึก — เดิมเป็นป้ายลอยมุมซ้ายบน
              ของ ReframerJournalPage.tsx/GratitudeShieldPage.tsx ย้ายมาเป็นการ์ดที่นี่แทน
              กดแล้วเปิด JournalHistoryModal ตัวเดิม (reuse component/logic เดิมทั้งหมด
              ไม่ได้เขียน UI แสดงผลประวัติใหม่) ═══ */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-xl)', color: 'var(--heading-accent)', marginBottom: 4 }}>
              📜 ประวัติการเขียนบันทึก
            </div>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>ย้อนดูสิ่งที่เคยเขียนไว้ทั้งหมด</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => setOpenHistoryFor('ment-reframer-journal')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--n50)', cursor: 'pointer', textAlign: 'left' }}
              >
                {QUEST_ICONS['ment-reframer-journal']
                  ? <img src={QUEST_ICONS['ment-reframer-journal']} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  : <span style={{ fontSize: 28, lineHeight: 1 }}>📖</span>}
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text)' }}>ประวัติสมุดบันทึกรากไม้เรืองแสง</span>
              </button>
              <button
                onClick={() => setOpenHistoryFor('ment-gratitude-shield')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--n50)', cursor: 'pointer', textAlign: 'left' }}
              >
                {QUEST_ICONS['ment-gratitude-shield']
                  ? <img src={QUEST_ICONS['ment-gratitude-shield']} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  : <span style={{ fontSize: 28, lineHeight: 1 }}>🛡️</span>}
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text)' }}>ประวัติเกราะแห่งความขอบคุณ</span>
              </button>
            </div>
          </div>

          {/* ═══ [เพิ่มตามที่ระบุ] โซนความสำเร็จ — badge/achievement ตัวแรกที่มีจริงใน frontend
              เทียบกับ backend badges ใน seed.ts (BADGE_CATALOG ตอนนี้มีแค่ 2 ตัวที่ตัดสินใจ
              ให้สร้างแล้ว — Strategic Delay กับ Mirror of Truth ดู MentalContext.earnedBadges) */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontFamily: 'Fredoka One', fontSize: 'var(--fs-xl)', color: 'var(--heading-accent)', marginBottom: 4 }}>
              🏅 ความสำเร็จ
            </div>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>ปลดล็อกอัตโนมัติเมื่อทำเงื่อนไขสำเร็จ</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BADGE_CATALOG.map((badge) => {
                const earned = earnedBadges.includes(badge.code)
                return (
                  <div
                    key={badge.code}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: earned ? 'var(--g50)' : 'var(--n50)',
                      border: `1.5px solid ${earned ? 'var(--g300)' : 'var(--border)'}`,
                      borderRadius: 14, padding: '10px 14px',
                      opacity: earned ? 1 : 0.55,
                    }}
                  >
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{badge.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text)' }}>{badge.titleTh}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{badge.description}</div>
                    </div>
                    <span
                      className="tag"
                      style={{
                        background: earned ? 'var(--g100)' : 'var(--n100)',
                        color: earned ? 'var(--g700)' : 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      {earned ? '✓ ปลดล็อกแล้ว' : 'ยังไม่ปลดล็อก'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {openHistoryFor === 'ment-reframer-journal' && (
        <JournalHistoryModal
          theme="mystic"
          accent="#9B59D0"
          title="ประวัติสมุดบันทึกรากไม้เรืองแสง"
          entries={journalEntries.filter((e) => e.questCode === 'ment-reframer-journal')}
          onClose={() => setOpenHistoryFor(null)}
        />
      )}
      {openHistoryFor === 'ment-gratitude-shield' && (
        <JournalHistoryModal
          theme="golden"
          accent="#FFB020"
          title="ประวัติเกราะแห่งความขอบคุณ"
          entries={journalEntries.filter((e) => e.questCode === 'ment-gratitude-shield')}
          onClose={() => setOpenHistoryFor(null)}
        />
      )}
    </div>
  )
}
