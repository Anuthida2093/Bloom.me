import { memo, useCallback, useMemo, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react'
import { type PostItData, type MbtiType, type RiskLevel, type PlacedItem, type DecorationPositionMap, type QuestCategory } from '../../types'
import { DECORATION_EMOJI, DECORATION_ZONE_POSITION } from '../../config/decorationItems'
import { ITEM_ICONS } from '../../config/iconAssets'
import { useIsSmallScreen, usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { groundDryness } from '../../config/groundFertility'
import { buildTreeModel } from './procedural/buildTreeModel'
import ProceduralTreeCanvas from './procedural/ProceduralTreeCanvas'
import { toHealthPhase, type HealthPhase } from './treeHealth'
import { playSfx } from '../../utils/audioPlayer'
import { useAppContext } from '../../context/AppContext'
import { useHorizontalPan } from '../../hooks/useHorizontalPan'
import './TreeOfLife.css'

/**
 * ═══════════════════════════════════════════════════════════════════════
 * TreeOfLife — ต้นไม้ procedural วาด 2D + เลเยอร์พื้นดิน/เอฟเฟกต์/ไอเทมตกแต่ง
 * ═══════════════════════════════════════════════════════════════════════
 * [ต้นไม้ procedural + เนินดิน — 2026-09-26] ต้นไม้ทั้งต้น + พื้น วาดลง canvas 2D 3 ชั้นด้วย
 * procedural/ProceduralTreeCanvas.tsx จากข้อมูลของ procedural/buildTreeModel.ts:
 *   - ลำต้น/กิ่ง/ใบ: generateTree แตกกิ่งตามกลุ่ม MBTI โตตาม trunkBranchLevel, ใบวาดทีละใบในทรงพุ่มวงรี
 *   - ดอก: จำนวนตาม leafFlowerLevel
 *   - ทุ่งหญ้ามีมิติ: หนาแน่นตาม grassSoilLevel, ไม่ได้ทำเควสสุขภาพต่อเนื่อง → หญ้าเหี่ยว → แห้ง → ดินร้าง
 *     (config/groundFertility.ts — ดินแห้งทำให้เควสความรู้ได้คะแนนลำต้นน้อยลง ต้นไม้โตช้าลง)
 * filter ใบเหี่ยวใส่ที่ชั้นใบ — ส่วนที่เหลือของไฟล์นี้คงเดิม: growth pulse,
 * คราบหมอง, กลีบร่วง, ป้ายสายด่วน, ไอเทมตกแต่งลากวาง, tooltip
 *
 *
 * [แก้รอบนี้ — ประสิทธิภาพและความสม่ำเสมอของภาพ]
 *  1. จำนวนใบไม้ปรับตามขนาดจอ: มือถือ 28 ใบ / เดสก์ท็อป 70 ใบ
 *     เดิมปั๊มสูงสุด 84 <img> เท่ากันทุกเครื่อง ซึ่งบนมือถือคือจุดที่เฟรมตก
 *  2. ถอด `transition: filter` ออกจากเลเยอร์แม่ที่มีลูก 84 ตัว — filter บนพาเรนต์
 *     บังคับให้เบราว์เซอร์ประมวลผลลูกทั้งหมดใหม่ทุกเฟรมระหว่างที่ transition วิ่ง
 *     เปลี่ยนไปใช้เลเยอร์สีทับที่ fade ด้วย opacity แทน (composited ล้วน)
 *  3. ครอบด้วย memo() — เดิมต้นไม้ re-render ทุกครั้งที่ state ใดก็ตามในแอปเปลี่ยน
 *  4. เลิกใช้ emoji เป็นอาร์ตเวิร์ก (💨 🍂 🌸 🏥) เปลี่ยนเป็นรูปทรงที่วาดด้วย CSS
 *     และไอคอน SVG — emoji เรนเดอร์คนละแบบทุก OS ทำให้ภาพไม่นิ่งข้ามเครื่อง
 *  5. ไอเทมตกแต่งใช้ไฟล์ภาพจริงจาก ITEM_ICONS (config/iconAssets.ts) — จุดเดียวกับที่
 *     ShopSection.tsx/ProfilePage.tsx ใช้อยู่แล้ว โดยยังมี emoji เป็นตัวสำรองสำหรับชิ้น
 *     ที่ยังไม่มีไฟล์ภาพจริงให้ (ดู DecorationVisual ด้านล่าง)
 *
 * [รอบก่อน]
 *  - onTreeClick: คลิกที่ต้นไม้ (นอกเหนือจาก hotspot โคนต้นที่โชว์ tooltip เลเวล) →
 *    เปิด TreeSummaryModal (บทความ AI) ที่ Dashboard.tsx ควบคุม
 *  - decorationPositions/onDecorationMove: ไอเทมตกแต่งลากวางอิสระได้ทุกตำแหน่งรอบต้นไม้
 *    แทนที่จะติดอยู่กับโซนตายตัว 4 โซนแบบเดิม (ดู AppContext.tsx สำหรับ state ที่เก็บพิกัด)
 */

/** ขนาดกล่อง .tree-of-life จริง (วัดด้วย ResizeObserver) — ใช้คำนวณขนาดก้อนดินและจัดต้นไม้ให้พอดีกล่อง */
interface ContainerSize {
  w: number
  h: number
}

/** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 5] ตอน "dying" (ไม่ได้เล่นเควสหมวดจิตใจมานาน) ลด opacity ของ
 *  เลเยอร์ใบทั้งหมดลงมา ให้ความรู้สึก "ใบร่วงไปเยอะ บางลง" แบบง่ายๆ (คงพฤติกรรมเดิมจากรอบก่อน
 *  ไว้ — ไม่เปลี่ยน แค่ตอนนี้ครอบสำเนาใบเล็กหลายชิ้นแทนภาพก้อนเดียว) */
const LEAF_DYING_OPACITY = 0.25

/** ฉากเลื่อนได้กว้างกี่เท่าของจอ — จอแนวนอนเลื่อนได้ 60% ของจอ, แนวตั้ง (จอแคบ) เลื่อนได้มากกว่า */
const WORLD_FACTOR_LANDSCAPE = 1.6
const WORLD_FACTOR_PORTRAIT = 2.4

const RISK_FILTER: Record<RiskLevel, string> = {
  LOW: 'none',
  MODERATE: 'saturate(0.55) brightness(0.97) contrast(0.96)',
  HIGH: 'grayscale(0.85) sepia(0.25) brightness(0.85) contrast(0.92)',
}

/** ใบไม้ไล่สีเขียว→เหลือง/น้ำตาลอ่อนตอน wilting, เข้มขึ้นตอน dying — transition หลายวินาที
 *  (ใส่ที่ canvas ใบ — ดู .tree-of-life__canvas--foliage ใน .css) ให้ความรู้สึก "ค่อยๆ เหี่ยว" ไม่ใช่เปลี่ยนทันที */
const LEAF_HEALTH_FILTER: Record<HealthPhase, string> = {
  healthy: 'none',
  wilting: 'sepia(0.45) saturate(0.7) hue-rotate(-12deg) brightness(0.97)',
  dying: 'sepia(0.7) saturate(0.45) hue-rotate(-20deg) brightness(0.88)',
}

/** พิกัดกำหนดเอง (%) ของไอเทมตกแต่งแต่ละชิ้น — key = itemId (type อยู่ที่ types.ts ใช้ร่วมกับ AppContext.tsx) */

/** [แก้ตามที่ระบุ] ละอองดาวที่โปรยลงมาที่ต้นไม้ตอนทำเควสสำเร็จ — ตำแหน่ง/ขนาด/จังหวะคงที่ (ไม่สุ่มทุก render)
 *  x = % แนวนอนของแถบต้นไม้ (กระจุกรอบทรงพุ่มกลางจอ) · land = % ความสูงที่ละอองจางหาย (บนพุ่ม→โคนต้น) */
const STARDUST = Array.from({ length: 64 }, (_, i) => ({
  x: 32 + ((i * 37) % 37),
  // [แก้ตามที่ระบุ] ผงเล็กมากๆ ผสมดาวกับจุดกลม — จุด 1.5-3px / ดาว 4-6px
  star: i % 3 === 0,
  size: i % 3 === 0 ? 4 + (i % 3) : 1.5 + (i % 4) * 0.5,
  delay: (i * 29) % 900,
  duration: 1300 + ((i * 131) % 700),
  drift: ((i * 29) % 25) - 12,
  land: 38 + ((i * 17) % 44),
}))
/** ละอองโปรยก่อน แล้วต้นไม้ค่อยขยาย (ms หลังเริ่มเอฟเฟกต์) */
const TREE_GROW_DELAY_MS = 1000

/** [แก้ตามที่ระบุ] ก้อนหินบนพื้นดินรอบโคนต้น (ทานเกินแคลอรี่ติดต่อกันหลายวัน) — % ของแถบต้นไม้ */
const GROUND_ROCKS = [
  { left: 37, top: 88, size: 1 }, { left: 62, top: 89, size: 0.85 }, { left: 44, top: 91.5, size: 0.7 },
  { left: 56, top: 92, size: 1.1 }, { left: 30, top: 91, size: 0.8 }, { left: 69, top: 92.5, size: 0.95 },
]
const ROCK_IMAGE = '/assets/images/icons/Item/stone.png'

/** กอหญ้าหน้าก้อนหิน: 4-8 ใบหญ้า (จำนวน/ความสูง/ทิศเอนต่างกันต่อก้อน) — SVG ล้วน */
function GrassTuft({ seed }: { seed: number }) {
  const count = 4 + ((seed * 5 + 3) % 5)
  const blades = Array.from({ length: count }, (_, i) => {
    const x = 6 + (i + 0.5) * (88 / count) + (((seed + i) * 7) % 5) - 2
    const h = 16 + (((seed * 3 + i * 11) % 9) * 1.6)
    const lean = ((((seed + 1) * (i + 2) * 13) % 11) - 5) * 1.3
    const tone = ['#4f8f3a', '#5fa044', '#3f7a31', '#6db04d'][(seed + i) % 4]
    return { x, h, lean, tone }
  })
  return (
    <svg className="tree-of-life__rock-grass" viewBox="0 0 100 34" preserveAspectRatio="none">
      {blades.map((b, i) => (
        <path
          key={i}
          d={`M ${b.x - 3.2} 34 Q ${b.x - 1 + b.lean * 0.4} ${34 - b.h * 0.55} ${b.x + b.lean} ${34 - b.h} Q ${b.x + 1.2 + b.lean * 0.4} ${34 - b.h * 0.5} ${b.x + 3.2} 34 Z`}
          fill={b.tone}
        />
      ))}
    </svg>
  )
}

interface TreeOfLifeProps {
  /** จำนวนก้อนหินบนพื้นดิน (0 = ไม่มี) — Dashboard คำนวณจากสตรีคทานเกินแคลอรี่ (utils/nutrition.ts) */
  groundRocks?: number
  mbtiType?: MbtiType | null
  trunkBranchLevel?: number
  leafFlowerLevel?: number
  grassSoilLevel?: number
  riskLevel?: RiskLevel
  placedItems?: PlacedItem[]
  /** [ข้อกำหนดข้อ 3] พิกัดที่ผู้ใช้ลากปรับเองแล้ว (เก็บใน AppContext) — ถ้าไอเทมไหนยังไม่เคย
   *  ลาก จะ fallback ไปตำแหน่งโซนเริ่มต้น (DECORATION_ZONE_POSITION) เหมือนเดิม */
  decorationPositions?: DecorationPositionMap
  /** [ข้อกำหนดข้อ 3] เรียกทุกครั้งที่ลากไอเทมวางเสร็จ (pointer up) พร้อมพิกัด % ใหม่ */
  onDecorationMove?: (itemId: string, xPct: number, yPct: number) => void
  /** [ข้อกำหนดข้อ 2] คลิกที่ตัวต้นไม้ (นอกเหนือ hotspot โคนต้น) → เปิดบทความสรุปจาก AI */
  onTreeClick?: () => void
  /** [ใหม่] "แรงสั่นสะเทือนแห่งการเติบโต" — ยิงมาจาก AppContext ทุกครั้งที่ทำเควสสำเร็จจริง
   *  (ดู handleToggleQuest ใน AppContext.tsx) เพื่อให้ต้นไม้ "ตอบสนองทันที" ต่อการกระทำใน
   *  เควส ไม่ใช่แค่โตขึ้นแบบเนียนๆ ผ่านเลข level ที่เปลี่ยนไปเฉยๆ — key เปลี่ยนทุกครั้งแม้
   *  category จะซ้ำเดิม เพื่อบังคับให้ effect เล่นใหม่ได้เสมอ */
  growthPulse?: { category: QuestCategory; key: number } | null
  /** [ใหม่] เควสเตาเผาขยะความคิด "ไม่ทำ/ทำไม่สำเร็จ" → ใบไม้มีคราบหมองคล้ำ + ควันจางๆ
   *  ค้างอยู่จนกว่าจะทำเควสเดียวกันนี้สำเร็จ (ดู AppContext.tsx: hasSoot) */
  hasSoot?: boolean
  /** [ใหม่] จำนวนวันที่ไม่ได้สุ่มไพ่ทิพย์ (คำนวณจาก questLogs จริง ไม่ใช่ field ใน backend
   *  โดยตรง) — ตั้งแต่ 2 วันขึ้นไป จะมีใบไม้/กลีบดอกร่วงหล่นปลิวตามลมเบาๆ */
  daysSinceLastOracle?: number | null
  /** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 4] จำนวนวันตั้งแต่ทำเควสหมวด "จิตใจ" (EMOTION) สำเร็จ
   *  ล่าสุด (คำนวณจาก questLogs จริงใน Dashboard.tsx เหมือน daysSinceLastOracle) — N=5 ใบ
   *  เริ่มเหี่ยว (wilting), N=10 ใบเริ่มร่วง (dying) null = ไม่มีข้อมูล/ยังไม่เคยทำ → ถือว่า
   *  healthy (ไม่ลงโทษผู้เล่นใหม่ที่ยังไม่มีประวัติ) */
  daysSinceLastMentalQuest?: number | null
  /** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 3] เหมือนกันแต่ผูกกับหมวด "สุขภาพกาย" (HEALTH) — คุมการ
   *  จางหาย/เปลี่ยนสีของหญ้า (ground variant 2/3) แทนใบ */
  daysSinceLastPhysicalQuest?: number | null
  /** ฉากกว้างกว่าจอ กดค้างที่พื้นแล้วลากซ้าย-ขวาเพื่อเลื่อนดูได้ (หน้า Home) — ต้นไม้เริ่มกึ่งกลาง */
  pannable?: boolean
  /** แจ้งตำแหน่งเลื่อน (px, -range…0) ทุกครั้งที่ลาก — Dashboard ใช้เลื่อนวิดีโอพื้นหลังช้ากว่า (parallax) */
  onPanChange?: (pan: number, range: number) => void
  /** โพสอิท (บันทึกความรู้สึกประจำวันจากเช็คอินอารมณ์) ติดบนพุ่มต้นไม้ — positionX/Y เป็น % ของแถบต้นไม้ */
  postIts?: PostItData[]
  onPostItClick?: (postIt: PostItData) => void
  className?: string
}

function TreeOfLifeBase({
  mbtiType,
  trunkBranchLevel = 1,
  leafFlowerLevel = 1,
  grassSoilLevel = 1,
  riskLevel = 'LOW',
  placedItems = [],
  decorationPositions = {},
  onDecorationMove,
  onTreeClick,
  growthPulse,
  hasSoot = false,
  daysSinceLastOracle = null,
  daysSinceLastMentalQuest = null,
  daysSinceLastPhysicalQuest = null,
  pannable = false,
  onPanChange,
  postIts = [],
  groundRocks = 0,
  onPostItClick,
  className,
}: TreeOfLifeProps) {
  /* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 4] ใบเหี่ยว/ร่วงตามจำนวนวันที่ไม่ได้ทำเควสหมวดจิตใจ */
  const leafHealthPhase = useMemo(() => toHealthPhase(daysSinceLastMentalQuest), [daysSinceLastMentalQuest])

  /* หญ้าเหี่ยว → แห้ง → ดินร้าง ตามจำนวนวันที่ไม่ได้ทำเควสหมวดสุขภาพกาย (คนละหมวดกับใบซึ่งผูกหมวดจิตใจ)
     ไล่ต่อเนื่องทีละวัน — และดินแห้งทำให้ต้นไม้โตช้าลง (ดู config/groundFertility.ts) */
  const groundDry = useMemo(() => groundDryness(daysSinceLastPhysicalQuest), [daysSinceLastPhysicalQuest])

  /* target opacity ตาม healthVisualLevel (1: มีแค่ฐาน, 2: หญ้าเริ่มขึ้น, 3: หญ้า+ดอกหญ้าเต็ม)
     คูณด้วย decay multiplier (wilting ลดลงครึ่งหนึ่ง, dying จางจนเกือบหมด) — ค่อยๆ นุ่มนวล
     ด้วย CSS transition บน opacity/filter ที่ container (ดู render ด้านล่าง) ไม่กระตุก */
  /* จอเล็ก → ต้นไม้ใช้ใบ/ดอกน้อยลง + ก้อนดินน้อยลง (งานวาดน้อยลงบนเครื่องสเปกต่ำ) */
  const isSmallScreen = useIsSmallScreen()
  const reducedMotion = usePrefersReducedMotion()

  /* ต้นไม้ procedural: รูปทรงตาม MBTI, โตตาม trunkBranchLevel, ดอกตาม leafFlowerLevel (ดู buildTreeModel) */
  const treeModel = useMemo(
    () => buildTreeModel({ mbtiType, trunkBranchLevel, leafFlowerLevel, compact: isSmallScreen }),
    [mbtiType, trunkBranchLevel, leafFlowerLevel, isSmallScreen],
  )


  /* [แก้ตามที่ระบุรอบนี้] จำนวนก้อนดิน/หญ้าตามขนาดจอ — seed ผูกกับ folder เท่านั้น (ไม่ผูกกับ
     healthVisualLevel/variant อีกต่อไป เพราะตอนนี้ทั้ง 3 variant ใช้ตำแหน่ง "ชุดเดียวกัน"
     ซ้อนทับกันเป๊ะเสมอ — เปลี่ยนแค่ opacity ต่อ variant ไม่ใช่สลับตำแหน่งไปมา) */

  const rootRef = useRef<HTMLDivElement | null>(null)

  /* [ใหม่ — ตามที่ระบุรอบนี้] ต้องรู้ขนาดกล่อง .tree-of-life จริง (px) เพื่อจำลอง
     object-fit:contain ของภาพลำต้นให้แปลงพิกัด branch-tip ได้ถูกต้อง (ดู
     mapImagePointToContainerPct ด้านบน) — วัดจริงด้วย ResizeObserver แทนการเดา เพราะขนาด
     กล่องเปลี่ยนได้ตามอุปกรณ์/orientation จริง ไม่ใช่ค่าคงที่ */
  const [containerSize, setContainerSize] = useState<ContainerSize | null>(null)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ฉากกว้างกว่าจอ (pannable): ดิน/หญ้ากว้าง WORLD_FACTOR เท่าของจอ ต้นไม้อยู่กึ่งกลางฉาก
     ลากซ้าย-ขวาเลื่อนทั้งฉาก — ใส่ transform ตรงที่ DOM (ไม่ re-render ต้นไม้ทุกเฟรมที่ลาก) */
  const worldRef = useRef<HTMLDivElement | null>(null)
  const bandRef = useRef<HTMLDivElement | null>(null)
  const viewW = containerSize?.w ?? 0
  const worldW = pannable && containerSize
    ? Math.round(viewW * (containerSize.w > containerSize.h ? WORLD_FACTOR_LANDSCAPE : WORLD_FACTOR_PORTRAIT))
    : viewW
  const panRange = Math.max(0, worldW - viewW)
  const applyPan = useCallback((pan: number, range: number) => {
    if (worldRef.current) worldRef.current.style.transform = `translate3d(${pan}px, 0, 0)`
    onPanChange?.(pan, range)
  }, [onPanChange])
  const { panRef, handlers: panHandlers } = useHorizontalPan(panRange, applyPan)

  // [ใหม่] เล่น burst effect ทุกครั้งที่ growthPulse.key เปลี่ยน (เควสสำเร็จ) แล้วเคลียร์เอง
  // อัตโนมัติหลัง 1.8s — ไม่ต้องให้ AppContext เป็นคนจับเวลาเคลียร์ค่าทิ้ง กัน stale closure
  const [activePulse, setActivePulse] = useState<{ category: QuestCategory; key: number } | null>(null)
  const { settings: audioSettings } = useAppContext()

  // [แก้] เดิม setActivePulse(growthPulse) เรียกตรงๆ ตอนต้น effect (react-hooks/set-state-in-effect)
  // ย้ายมาตั้งค่า "ระหว่าง render" ทันทีที่ growthPulse.key เปลี่ยน ส่วนเสียง/ตัวจับเวลาเคลียร์
  // อัตโนมัติ (ซึ่งเป็นการเชื่อมกับ external system จริง) ยังอยู่ใน effect ด้านล่างเหมือนเดิม
  // [แก้ตามที่ระบุ] เล่นครั้งเดียวต่อ pulse (key) — Dashboard ส่ง pulse มาเฉพาะตอนเห็นต้นไม้จริง
  // (ปิดหน้าเควสกลับมาหน้า Home แล้ว) จึงได้เห็นเอฟเฟกต์ทุกครั้ง ไม่เล่นทิ้งไว้ใต้หน้าเควส
  const [lastPlayedPulseKey, setLastPlayedPulseKey] = useState<number | null>(null)
  if (growthPulse && growthPulse.key !== lastPlayedPulseKey) {
    setLastPlayedPulseKey(growthPulse.key)
    setActivePulse(growthPulse)
  }

  useEffect(() => {
    if (!activePulse) return
    // [แก้ตามที่ระบุ] เควสสำเร็จ → ออร่ารอบต้นไม้ + ต้นไม้ขยายขึ้นเล็กน้อย + เสียงประกายเวทมนตร์
    // (เอาเอฟเฟกต์/เสียง "ต้นไม้โต" เดิมออกแล้ว)
    // ละอองโปรยก่อน → ต้นไม้ขยายนุ่มๆ พร้อมเสียงวิ้ง (จังหวะตรงกับ animation-delay ใน TreeOfLife.css)
    const soundId = window.setTimeout(
      () => playSfx('WING', { volume: audioSettings.sfxVolume, enabled: audioSettings.soundEnabled }),
      TREE_GROW_DELAY_MS,
    )
    const timeoutId = window.setTimeout(() => setActivePulse(null), TREE_GROW_DELAY_MS + 2000)
    return () => { window.clearTimeout(timeoutId); window.clearTimeout(soundId) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePulse?.key])

  return (
    <div
      ref={rootRef}
      className={`tree-of-life ${pannable ? 'tree-of-life--pannable' : ''} ${className ?? ''}`}
      onClick={onTreeClick}
      {...(pannable ? panHandlers : {})}
      style={{
        cursor: onTreeClick ? 'pointer' : undefined,
        animation: activePulse ? 'treeOfLifeGrowBounce .6s cubic-bezier(.34,1.56,.64,1) both' : undefined,
      }}
    >
      {/* [เปลี่ยน] เดิมมี transition: filter 0.6s บน div นี้ ซึ่งมีลูกที่ animate อยู่ 84 ตัว
          filter บนพาเรนต์สร้าง layer ใหม่และบังคับประมวลผลลูกทั้งหมดใหม่ทุกเฟรม
          ตลอด 0.6 วินาทีที่ transition วิ่ง — เป็นจุดที่มือถือเฟรมตกชัดที่สุด
          ตอนนี้ filter ยังอยู่ (จำเป็นสำหรับสถานะสุขภาพต้นไม้) แต่เปลี่ยนค่าทันที
          ไม่ transition ส่วนความนุ่มนวลย้ายไปอยู่ที่เลเยอร์สีทับด้านล่างที่ fade
          ด้วย opacity ซึ่งเป็น property ที่ composited ล้วน ไม่แตะ layout เลย */}
      <div
        ref={worldRef}
        className="tree-of-life__world"
        style={{ width: worldW || '100%', transform: `translate3d(${-panRange / 2}px, 0, 0)` }}
      >
      <div
        className={`tree-of-life__stack${activePulse ? ' tree-of-life__stack--celebrate' : ''}`}
        style={{
          filter: hasSoot
            ? [RISK_FILTER[riskLevel] === 'none' ? '' : RISK_FILTER[riskLevel], 'sepia(0.3)', 'saturate(0.7)', 'brightness(0.92)'].filter(Boolean).join(' ')
            : RISK_FILTER[riskLevel],
        } as React.CSSProperties}
      >
        {/* ต้นไม้ + แปลงหญ้า (ดิน / หญ้าหลังต้น / ลำต้น / หญ้าหน้าต้น / ใบ+ดอก — หญ้าไหวตามลม ใบนิ่ง)
            key ผูกกับ visual level ให้เล่นอนิเมชันโตทุกครั้งที่ขึ้นขั้น, ชั้นใบรับ filter/ความจางของใบเหี่ยว (หมวดจิตใจ) */}
        <ProceduralTreeCanvas
          key={treeModel.visualLevel}
          model={treeModel}
          size={containerSize && { w: worldW, h: containerSize.h }}
          viewWidth={viewW}
          panRef={panRef}
          grassSoilLevel={grassSoilLevel}
          dryness={groundDry}
          animateWind={!reducedMotion}
          foliageStyle={{
            filter: LEAF_HEALTH_FILTER[leafHealthPhase],
            opacity: leafHealthPhase === 'dying' ? LEAF_DYING_OPACITY : 1,
          }}
        />
      </div>

      {/* แถบกว้างเท่าจอกึ่งกลางฉาก — เอฟเฟกต์/ไอเทมตกแต่ง/hotspot อ้างพิกัด % จากแถบนี้ (เท่ากับจอตอนเริ่ม)
          จึงวางตรงกับต้นไม้เหมือนเดิม และเลื่อนไปพร้อมฉากเวลาลาก */}
      <div ref={bandRef} className="tree-of-life__band" style={{ left: (worldW - viewW) / 2, width: viewW || '100%' }}>

      {/* [ใหม่] Growth Pulse — "เควสสำเร็จ ต้นไม้ต้องรับผลชัดเจนทันที" ไม่ใช่แค่เลข level
          ขยับเงียบๆ — burst แสง + ประกายไฟกระจายออกจากทรงพุ่ม สีเปลี่ยนตามหมวดเควสที่เพิ่งทำ
          (ความรู้=ทอง/น้ำตาล เรืองที่ลำต้น, จิตใจ=ชมพู/ม่วง เรืองที่ดอกไม้, สุขภาพ=เขียวมรกต
          เรืองที่พื้นดิน) เล่นแล้วหายไปเองใน 1.8s ผ่าน useEffect ด้านบน */}
      {/* [แก้ตามที่ระบุ] ทำเควสสำเร็จ → ละอองดาวเล็กๆ ระยิบระยับโปรยลงมาที่ต้นไม้ (ไม่มีวงกลมแล้ว) */}
      {activePulse && (
        <div key={activePulse.key} className="tree-of-life__stardust" aria-hidden="true">
          {STARDUST.map((d, i) => (
            <span
              key={i}
              className={`tree-of-life__stardust-grain${d.star ? ' tree-of-life__stardust-grain--star' : ''}`}
              style={{
                left: `${d.x}%`,
                width: d.size, height: d.size,
                animationDelay: `${d.delay}ms, ${d.delay}ms`,
                animationDuration: `${d.duration}ms, ${420 + (d.delay % 5) * 60}ms`,
                ['--drift' as string]: `${d.drift}px`,
                ['--land' as string]: `${d.land}vh`,
              }}
            />
          ))}
        </div>
      )}

      {/* [ใหม่] ควันจางๆ ลอยขึ้นจากคราบหมอง — โผล่เฉพาะตอน hasSoot (จากเควสเตาเผาขยะความคิด
          ที่ยังไม่ทำสำเร็จ) หายไปเองทันทีที่ hasSoot กลับเป็น false */}
      {groundRocks > 0 && (
        <div className="tree-of-life__rocks" aria-hidden="true">
          {GROUND_ROCKS.slice(0, groundRocks).map((r, i) => (
            <span
              key={i}
              className="tree-of-life__rock"
              style={{ left: `${r.left}%`, top: `${r.top}%`, ['--rock-scale' as string]: r.size, animationDelay: `${i * 140}ms` }}
            >
              <img src={ROCK_IMAGE} alt="" className="tree-of-life__rock-img" />
              {/* [แก้ตามที่ระบุ] ต้นหญ้า 4-8 ต้นขึ้นทับฐานก้อนหิน — ดูเหมือนก้อนหินวางจมอยู่ในหญ้าจริง */}
              <GrassTuft seed={i} />
            </span>
          ))}
        </div>
      )}

      {hasSoot && (
        <div className="tree-of-life__soot" aria-hidden="true">
          {/* [เปลี่ยน] เดิมใช้ emoji 💨 เป็นควันจริง — ควันของ Apple เป็นสีฟ้าใส
              ของ Windows เป็นก้อนเทาทึบ ภาพจึงคนละเรื่องกันข้ามเครื่อง
              ตอนนี้วาดด้วย CSS (radial-gradient เบลอ) จึงเหมือนกันทุกที่ */}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="tree-of-life__soot-wisp" style={{ left: `${30 + i * 10}%`, animationDelay: `${i * 0.6}s` }} />
          ))}
        </div>
      )}

      {/* [ใหม่] ใบไม้/กลีบดอกร่วงหล่นปลิวตามลม — โผล่ตั้งแต่ไม่ได้สุ่มไพ่ทิพย์ 2 วันขึ้นไป
          (คำนวณจาก questLogs จริงใน Dashboard.tsx ไม่ใช่ field สำเร็จรูปจาก backend) */}
      {daysSinceLastOracle !== null && daysSinceLastOracle >= 2 && (
        <div className="tree-of-life__falling-petals" aria-hidden="true">
          {/* [เปลี่ยน] เดิมใช้ emoji 🍂 / 🌸 ร่วงลงมา — ขนาดและสีต่างกันมากในแต่ละ OS
              ตอนนี้เป็นกลีบที่วาดด้วย CSS (border-radius ไม่เท่ากันสี่มุม = ทรงกลีบไม้)
              โทนสีอ้างอิงโทเคน --ae-sun / --ae-bloom จึงเข้ากับฉากเสมอ */}
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`tree-of-life__falling-petal tree-of-life__falling-petal--${i % 2 === 0 ? 'leaf' : 'bloom'}`}
              style={{ left: `${15 + i * 14}%`, animationDelay: `${i * 0.9}s`, animationDuration: `${5 + (i % 3)}s` }}
            />
          ))}
        </div>
      )}

      {/* [ใหม่ — ตามที่ระบุ] High Risk → กล่องปฐมพยาบาลลิงก์สายด่วนสุขภาพจิต 1323
          ลอยเด่นให้เห็นชัด คลิกได้ทันที (tel: link เปิดโทรออกตรงบนมือถือ) */}
      {riskLevel === 'HIGH' && (
        <a
          href="tel:1323"
          className="tree-of-life__hotline-badge"
          onClick={(e) => e.stopPropagation()}
          title="โทรสายด่วนสุขภาพจิต 1323"
        >
          {/* [เปลี่ยน] ไอคอน SVG แทน emoji 🏥 — ป้ายที่สำคัญที่สุดในแอปทั้งหมด
              ควรมีหน้าตาเดียวกันทุกเครื่อง ไม่ใช่กลายเป็นตึกสีชมพูบนบางระบบ */}
          <span className="tree-of-life__hotline-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.5a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" />
            </svg>
          </span>
          <span className="tree-of-life__hotline-text">สายด่วนสุขภาพจิต 1323</span>
        </a>
      )}

      {/* [ใหม่] ต้นไม้เองก็เด้งตัวเบาๆ รับ pulse ด้วย — ใส่ผ่าน inline style ของ root div
          โดยตรง (ดูด้านล่าง) ไม่ใช้ <style> แยกแบบ global selector เพราะถ้ามีต้นไม้
          หลายต้นพร้อมกันในหน้าเดียว (เช่น ต้นหลัก + ต้นใน GameplayFrame หมวดจิตใจ)
          global selector จะทำให้ทุกต้นเด้งพร้อมกันหมดโดยไม่ตั้งใจ */}

      {/* โพสอิทบันทึกความรู้สึกติดบนพุ่ม — ค่อยๆ แปะขึ้นมาทีละใบ (หน้าล่าสุดอยู่บนสุด) กดเพื่ออ่าน */}
      {postIts.length > 0 && (
        <div className="tree-of-life__postits">
          {postIts.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="tree-of-life__postit"
              title={p.content}
              aria-label={`โพสอิท: ${p.content}`}
              onClick={(e) => { e.stopPropagation(); onPostItClick?.(p) }}
              style={{
                left: `${p.positionX}%`,
                top: `${p.positionY}%`,
                background: p.color,
                ['--postit-tilt' as string]: `${((i * 37) % 13) - 6}deg`,
                animationDelay: `${Math.min(i, 8) * 120}ms`,
              }}
            >
              {p.content.length > 18 ? `${p.content.slice(0, 18)}…` : p.content}
            </button>
          ))}
        </div>
      )}

      {/* [ข้อกำหนดข้อ 3] ไอเทมตกแต่งลากวางอิสระได้ */}
      <DecorationLayer
        placedItems={placedItems}
        decorationPositions={decorationPositions}
        onDecorationMove={onDecorationMove}
        containerRef={bandRef}
      />

      </div>
      </div>
    </div>
  )
}

interface DecorationLayerProps {
  placedItems: PlacedItem[]
  decorationPositions: DecorationPositionMap
  onDecorationMove?: (itemId: string, xPct: number, yPct: number, scale?: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

/** [ใหม่ — ตามที่ระบุ] ขอบเขต scale ที่อนุญาต กันย่อ/ขยายจนดูแปลก */
const MIN_DECORATION_SCALE = 0.5
const MAX_DECORATION_SCALE = 2.5

/** ขนาดฐาน (px) ของกล่องไอเทมตกแต่งที่ scale:1 — ต้องคำนวณด้วยสูตรเดียวกับ
 * clamp(20px, 6vw, 34px) ใน TreeOfLife.css (.tree-of-life__decoration-item) เพราะตอน
 * resize เราคำนวณ width/height เป็น px ตรงๆ ด้วย JS แทนการพึ่ง CSS clamp() ล้วนๆ (ต้องรู้
 * ขนาดฐานจริงเป็นตัวเลขก่อนคูณ scale ได้) — วัดจาก window.innerWidth ตรงๆ เหมือนที่ CSS
 * clamp() คำนวณจาก viewport width (vw) เช่นกัน ไม่ต้องพึ่ง ResizeObserver เพราะเป็นแค่
 * ค่าประมาณสำหรับ handle ตำแหน่ง/ขนาดกล่อง ไม่ต้องแม่นระดับพิกเซล */
function getBaseDecorationSizePx(): number {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  return Math.min(34, Math.max(20, vw * 0.06))
}

/**
 * DecorationLayer — [ข้อกำหนดข้อ 3] ไอเทมตกแต่งลากวางอิสระ
 * ระหว่างลาก เก็บพิกัด "preview" ไว้ใน local state ของ component นี้เอง (ไม่ยิง
 * onDecorationMove ทุกเฟรมที่ลาก เพราะจะ re-render ต้นไม้ทั้งต้นถี่เกินจำเป็น) แล้วค่อยยิง
 * onDecorationMove ครั้งเดียวตอนปล่อยนิ้ว/เมาส์ (pointerup) ให้ AppContext เซฟค่าจริง
 *
 * [เพิ่มตามที่ระบุ — ปรับขนาดไอเทมตกแต่งได้อิสระ] แตะ/คลิกไอเทมเพื่อ "เลือก" (selectedId) —
 * ตอนถูกเลือกจะโผล่ handle มุมขวาล่าง ลาก handle นั้น (แยก pointer capture ของตัวเอง คนละตัว
 * กับการลากย้ายตำแหน่งที่ตัว item เอง) เพื่อคำนวณ scale ใหม่จาก "อัตราส่วนระยะห่างจากจุด
 * ศูนย์กลางไอเทม" เทียบกับตอนเริ่มลาก — pattern เดียวกับระบบลากย้ายตำแหน่งเดิมด้านบน
 * (onPointerDown/Move/Up + setPointerCapture) ไม่ได้คิดกลไกใหม่
 */
function DecorationLayer({ placedItems, decorationPositions, onDecorationMove, containerRef }: DecorationLayerProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [previewPos, setPreviewPos] = useState<{ xPct: number; yPct: number } | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resizingId, setResizingId] = useState<string | null>(null)
  const [previewScale, setPreviewScale] = useState<number | null>(null)
  /** ระยะห่าง (px) จากจุดศูนย์กลางไอเทมถึงตำแหน่งที่กดลง handle ครั้งแรก + scale ตอนนั้น
   *  เก็บเป็น ref ธรรมดาไม่ใช่ state เพราะไม่ต้อง re-render ระหว่างลาก อ่านอย่างเดียวใน
   *  handlePointerMove */
  const resizeStartRef = useRef<{ centerX: number; centerY: number; startDistance: number; baseScale: number } | null>(null)

  const getEffectivePosition = (item: PlacedItem): { left: string; top: string } => {
    if (draggingId === item.itemId && previewPos) {
      return { left: `${previewPos.xPct}%`, top: `${previewPos.yPct}%` }
    }
    const custom = decorationPositions[item.itemId]
    if (custom) return { left: `${custom.xPct}%`, top: `${custom.yPct}%` }
    const zonePos = DECORATION_ZONE_POSITION[item.zone]
    return zonePos
  }

  const getEffectiveScale = (item: PlacedItem): number => {
    if (resizingId === item.itemId && previewScale !== null) return previewScale
    return decorationPositions[item.itemId]?.scale ?? 1
  }

  const clampPct = (v: number) => Math.min(96, Math.max(4, v))
  const clampScale = (v: number) => Math.min(MAX_DECORATION_SCALE, Math.max(MIN_DECORATION_SCALE, v))

  const handlePointerDown = (e: ReactPointerEvent<HTMLSpanElement>, itemId: string) => {
    if (!onDecorationMove) return // ไม่รองรับการลากถ้าผู้เรียกใช้ไม่ได้ผูก handler ไว้
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingId(itemId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (!draggingId || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const xPct = clampPct(((e.clientX - rect.left) / rect.width) * 100)
    const yPct = clampPct(((e.clientY - rect.top) / rect.height) * 100)
    setPreviewPos({ xPct, yPct })
  }

  const handlePointerUp = () => {
    if (draggingId && previewPos && onDecorationMove) {
      onDecorationMove(draggingId, previewPos.xPct, previewPos.yPct)
    }
    setDraggingId(null)
    setPreviewPos(null)
  }

  /** [ใหม่] คลิก/แตะที่ตัวไอเทม (ไม่ใช่ handle) — สลับเลือก/ยกเลิกเลือก ไม่ยุ่งกับระบบลาก
   *  ย้ายตำแหน่งเดิมเลย (onClick ของเบราว์เซอร์จะไม่ยิงเองถ้าเพิ่งลากไปจริงๆ อยู่แล้ว) */
  const handleItemClick = (e: React.MouseEvent<HTMLSpanElement>, itemId: string) => {
    if (!onDecorationMove) return
    e.stopPropagation()
    setSelectedId((prev) => (prev === itemId ? null : itemId))
  }

  /** [ใหม่] เริ่มลาก resize handle — วัดจุดศูนย์กลางกล่องไอเทม (จาก parentElement ของ handle
   *  เอง) แล้วจำระยะห่างเริ่มต้น + scale เดิมไว้ใน ref เพื่อคำนวณอัตราส่วนตอน pointermove */
  const handleResizePointerDown = (e: ReactPointerEvent<HTMLSpanElement>, item: PlacedItem) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const itemEl = e.currentTarget.parentElement
    if (!itemEl) return
    const rect = itemEl.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const startDistance = Math.hypot(e.clientX - centerX, e.clientY - centerY) || 1
    resizeStartRef.current = { centerX, centerY, startDistance, baseScale: decorationPositions[item.itemId]?.scale ?? 1 }
    setResizingId(item.itemId)
    setPreviewScale(resizeStartRef.current.baseScale)
  }

  const handleResizePointerMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const start = resizeStartRef.current
    if (!resizingId || !start) return
    const currentDistance = Math.hypot(e.clientX - start.centerX, e.clientY - start.centerY) || 1
    const ratio = currentDistance / start.startDistance
    setPreviewScale(clampScale(start.baseScale * ratio))
  }

  const handleResizePointerUp = (item: PlacedItem) => {
    if (resizingId === item.itemId && previewScale !== null && onDecorationMove) {
      const pos = decorationPositions[item.itemId] ?? zonePositionAsPct(item)
      onDecorationMove(item.itemId, pos.xPct, pos.yPct, previewScale)
    }
    setResizingId(null)
    setPreviewScale(null)
    resizeStartRef.current = null
  }

  return (
    <>
      <div className={`tree-of-life__drop-zone-hint ${draggingId ? 'tree-of-life__drop-zone-hint--visible' : ''}`} />
      <div className="tree-of-life__decorations" aria-hidden="true">
        {placedItems.map((item) => {
          const pos = getEffectivePosition(item)
          const scale = getEffectiveScale(item)
          const boxSize = getBaseDecorationSizePx() * scale
          const isDraggable = !!onDecorationMove
          const isDragging = draggingId === item.itemId
          const isSelected = selectedId === item.itemId
          return (
            <span
              key={item.itemId}
              className={`tree-of-life__decoration-item ${isDraggable ? 'tree-of-life__decoration-item--draggable' : ''} ${isDragging ? 'tree-of-life__decoration-item--dragging' : ''}`}
              style={{ left: pos.left, top: pos.top, width: boxSize, height: boxSize }}
              title={isDraggable ? `${item.itemId} — ลากเพื่อจัดวางใหม่ กดเพื่อปรับขนาด` : item.itemId}
              onPointerDown={(e) => handlePointerDown(e, item.itemId)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={(e) => handleItemClick(e, item.itemId)}
            >
              <DecorationVisual itemId={item.itemId} />
              {isDraggable && isSelected && (
                <span
                  className="tree-of-life__decoration-resize-handle"
                  title="ลากเพื่อปรับขนาด"
                  onPointerDown={(e) => handleResizePointerDown(e, item)}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={() => handleResizePointerUp(item)}
                  onPointerCancel={() => handleResizePointerUp(item)}
                >
                  ⤡
                </span>
              )}
            </span>
          )
        })}
      </div>
    </>
  )
}

/** [ใหม่] แปลงตำแหน่งเริ่มต้นของไอเทม (โซนตายตัว % string เช่น '50%') ให้เป็นตัวเลข % ล้วนๆ
 *  ไว้ใช้ตอนบันทึก scale ของไอเทมที่ยังไม่เคยถูกลากย้ายตำแหน่งมาก่อนเลย (ไม่มี custom
 *  position ใน decorationPositions ยังใช้ตำแหน่งโซนเริ่มต้นอยู่) — ไม่งั้น onDecorationMove
 *  จะได้ x/y เป็น undefined ตอนบันทึก scale ครั้งแรกก่อนเคยลากย้ายที่เลยสักครั้ง */
function zonePositionAsPct(item: PlacedItem): { xPct: number; yPct: number } {
  const zonePos = DECORATION_ZONE_POSITION[item.zone]
  return { xPct: parseFloat(zonePos.left), yPct: parseFloat(zonePos.top) }
}

/*============================================================================*\
  DecorationVisual — [แก้บั๊ก — ตามที่ระบุ] แสดงไอเทมตกแต่งเป็นภาพจริงถ้ามีไฟล์ ถ้ายังไม่มี
  ใช้ emoji แทน
  ────────────────────────────────────────────────────────────────────────────
  [แก้บั๊ก] เดิมอ้าง getDecorationImage(itemId) → '/assets/images/decorations/<itemId>.webp'
  แต่โฟลเดอร์ public/assets/images/decorations/ ไม่มีไฟล์ .webp ไฟล์ไหนอยู่จริงเลย (มีแค่
  .gitkeep) — <img> จึง onError ทันทีทุกชิ้นและ fallback เป็น emoji เงียบๆ เสมอ ทั้งที่จริงๆ
  มีรูปจริงอยู่แล้วที่ ITEM_ICONS (src/config/iconAssets.ts) ซึ่งเป็นจุดเดียวกับที่
  ShopSection.tsx/ProfilePage.tsx ใช้แสดงไอเทมชุดเดียวกันนี้อยู่แล้ว — เปลี่ยนมาใช้ ITEM_ICONS
  แทนเพื่อให้ทั้ง 3 จุด (ร้านค้า/คลังไอเทม/ของตกแต่งบนต้นไม้จริง) ใช้รูปชุดเดียวกันสม่ำเสมอ
  ไอเทมที่ ITEM_ICONS ยังไม่มีไฟล์จริงให้ (เช่น jade-dragon, gold-star) ยัง fallback เป็น
  emoji ตามเดิมผ่าน DECORATION_EMOJI เหมือนที่ ShopSection.tsx ทำ
\*============================================================================*/
function DecorationVisual({ itemId }: { itemId: string }) {
  const [failed, setFailed] = useState(false)
  const emoji = DECORATION_EMOJI[itemId] ?? '⭐'
  const imageUrl: string | undefined = ITEM_ICONS[itemId]

  if (!imageUrl || failed) return <span className="tree-of-life__decoration-emoji">{emoji}</span>

  return (
    <img
      src={imageUrl}
      alt=""
      aria-hidden="true"
      className="tree-of-life__decoration-img"
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

/*  memo() — [ใหม่] ต้นไม้เป็นคอมโพเนนต์ที่แพงที่สุดในแอป (สูงสุด 84 <img> ที่มี
    อนิเมชันของตัวเอง) เดิมมันถูก re-render ทุกครั้งที่ state ใดก็ตามใน AppContext
    เปลี่ยน แม้แต่การเปิดโมดัลตั้งค่า — ตอนนี้ re-render เฉพาะเมื่อ props เปลี่ยนจริง
    ต้องใช้คู่กับการที่พาเรนต์ส่ง props ที่ memo แล้ว (ดู placedItems/treeStats
    ใน UserContext ที่ห่อ useMemo ไว้) ไม่งั้น memo จะไม่ช่วยอะไรเลย            */
const TreeOfLife = memo(TreeOfLifeBase)
export default TreeOfLife
