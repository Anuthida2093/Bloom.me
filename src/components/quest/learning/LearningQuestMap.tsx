import { useEffect, useRef, useState, useLayoutEffect, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { isQuestFullyDoneToday, type QuestDef } from '../../../config/questCatalog'
import { QUEST_ICONS } from '../../../config/iconAssets'
import OwlAvatar from '../OwlAvatar'
import { useAppContext } from '../../../context/AppContext'
import { playSfx } from '../../../utils/audioPlayer'
import { useIsLowPowerMode } from '../../../hooks/useMediaQuery'
import { BADGE_ICONS } from '../../../config/iconAssets'

const C_13 = '#4B5563'
const C_14 = '#374151'
const C_15 = '#4B5563'
const C_16 = '#6B4423'
const C_17 = '#54351B'
const C_18 = '#9CA3AF'
const C_19 = '#9CA3AF'
const C_20 = '#374151'
const C_21 = '#FF3300'
const C_22 = '#FF9900'
const C_23 = '#FFFC00'
const C_24 = '#00E5FF'
const C_25 = '#7C4DFF'
const C_26 = '#FFD700'
const C_27 = '#FFE57F'
const C_28 = '#4B3B32'
const C_29 = '#3A2E27'
const C_30 = '#4B3B32'
const C_31 = '#3A2E27'
const C_32 = '#8B4513'
const C_33 = '#A0522D'
const C_34 = '#FFF59D'
const C_35 = '#FFD700'
const C_36 = '#1E293B'
const C_37 = '#E0F7FA'
const C_38 = '#FFE082'

const FILL_1 = C_13
const FILL_2 = C_14
const FILL_3 = C_15
const FILL_4 = C_16
const FILL_5 = C_17
const STROKE_6 = C_18
const FILL_7 = C_19
const FILL_8 = C_20
const TEXT_9 = C_21
const TEXT_10 = C_22
const TEXT_11 = C_23
const TEXT_12 = C_24
const TEXT_13 = C_25
const TEXT_14 = C_26
const TEXT_15 = C_27
const FILL_16 = C_28
const FILL_17 = C_29
const FILL_18 = C_30
const FILL_19 = C_31
const FILL_20 = C_32
const FILL_21 = C_33
const FILL_22 = C_34
const FILL_23 = C_35
const STROKE_24 = C_36

interface PathNode {
  quest: QuestDef
  xPct: number
  yPct: number
}

interface LearningQuestMapProps {
  /** เควสหลักที่เดินเป็นเส้นทาง (ปกติคือ catalog.daily ของหมวดความรู้) */
  pathQuests: QuestDef[]
  /** [ใหม่] เควสเสริม (catalog.side ของหมวดความรู้) — เดิมไม่มีทางเข้าถึงได้เลยในหน้านี้
   *  เพราะแผนที่มีแค่โหนดของ pathQuests ตอนนี้เข้าถึงผ่านปุ่ม FAB มุมล่างซ้าย (ดู
   *  quest-gate-view__fab ใน QuestGateView.tsx ที่หมวดกาย/ใจใช้อยู่แล้ว — เอาแพทเทิร์น
   *  เดียวกันมาใช้เพื่อความสม่ำเสมอ แทนการเดาพิกัดโหนดใหม่บนวิดีโอพื้นหลังที่ไม่เคยเห็นจริง) */
  sideQuests: QuestDef[]
  isCompleted: (questCode: string) => boolean
  isLocked: (quest: QuestDef) => boolean
  /** [ใหม่] จำนวนครั้งที่ทำสำเร็จวันนี้แล้ว — ใช้โชว์ป้าย "🔁 X/Y" บนเควส isRepeatable
   *  (ตอนนี้ยังไม่มีเควสความรู้ตัวไหนติดธงนี้ แต่เตรียมกลไกไว้ให้ครบทั้ง 3 หมวดตามที่ระบุ) */
  getTodayCompletionCount?: (questCode: string) => number
  /** คลิก "กองไฟ" (node) บนแผนที่ หรือเลือกเควสเสริมจากเมนู FAB */
  onSelectQuest: (quest: QuestDef) => void
  /** เควสที่กำลังถูกเลือกอยู่ตอนนี้ */
  selectedQuestCode?: string | null
}

/**
 * FIXED_NODE_POSITIONS — พิกัด % บนเฟรมวิดีโอต้นฉบับ (1920x1080)
 * [แก้รอบก่อน] เคยเลื่อนขึ้นทั้งหมด (y -25) กันโหนดไปกองอยู่ใกล้ ActionMenuBar ล่างจอ แล้ว
 * คืนกลับมา (+25) หลังย้ายไปแก้ที่กล่องนอกแทน — แต่ทดสอบจริงแล้วด่านแรก (index 0) ยังโดน
 * ActionMenuBar บังอยู่ (กล่องนอกทำได้แค่กันไม่ให้เห็นพื้นหลังทะลุ ไม่ได้ทำให้บริเวณนั้น
 * "ว่าง" จากแถบเมนูที่ลอยทับอยู่จริง)
 * [แก้รอบนี้ — ตามที่ระบุ] เลื่อนขึ้นอีก 10 หน่วยทุกจุดเท่ากัน (ไม่ใช่แค่จุดแรก) แก้เฉพาะ
 * ตัวเลขในไฟล์นี้ ไม่แตะพื้นหลัง/กล่องนอกใดๆ อีก — ระยะห่างระหว่างโหนดยังคงสัดส่วนเดิมทุกจุด
 * (ไม่ได้แก้ค่า x หรือรูปทรงเส้นทาง) เพราะพิกัดเหล่านี้คาลิเบรตกับเส้นทางจริงในวิดีโอพื้นหลัง
 * (QuestPathMap.mp4) ซึ่งไม่มีเครื่องมือดูภาพในเซสชันนี้ยืนยันด้วยตา — ถ้าจุดไหนไม่ตรง
 * เส้นทางในวิดีโอพอดี ปรับตัวเลขตรงนี้ได้ตรงๆ
 */
const FIXED_NODE_POSITIONS: { x: number; y: number }[] = [
  { x: 40, y: 70 },   // 1. เพ่งสมาธิ / ตั้งเป้าหมาย (จุดเริ่มทางเดินด้านล่าง)
  { x: 36, y: 55 },   // 2. หยั่งรากลึก / โหมดจดจ่อ
  { x: 45, y: 45 },   // 3. เทกระเป๋าความจำผ่านเสียง
  { x: 50, y: 35 },   // 4. ผสมเกสรข้ามศาสตร์ (โค้งซ้ายขึ้นบันไดหิน)
  { x: 44, y: 29 },   // 5. เช็กอินรายวัน (locked node, ใกล้ปากถ้ำคริสตัล)
]

const VIDEO_NATIVE_WIDTH = 1920
const VIDEO_NATIVE_HEIGHT = 1080

/** [ใหม่ — pan/zoom] ซูมเข้าได้สูงสุดกี่เท่าของซูมออกสุด (MIN_ZOOM) */
const MAX_ZOOM_MULTIPLIER = 2.5
/** [ใหม่ — pan/zoom] ความไวของ mouse wheel ต่อการซูม */
const WHEEL_ZOOM_SPEED = 0.0015
/** [ใหม่ — pan/zoom] ระยะทางลาก (px) ขั้นต่ำก่อนจะถือว่าเป็น "ลาก" ไม่ใช่ "แตะ" — ต่ำกว่านี้
 * ปล่อยให้ click ของโหนดเควส/ปุ่ม FAB ทำงานตามปกติ */
const CLICK_DRAG_THRESHOLD_PX = 5

/** [ใหม่ — ตำแหน่งนกฮูก] ก่อนทำโหนดที่ 1 สำเร็จ — จุดบนเส้นทางก่อนถึงโหนด 1 (x:40,y:70)
 * ลงไปทางล่างขวาตามแนวทางเดินจริง (ตามที่ระบุ แทน fallback {x:42,y:67} เดิมที่คาลิเบรตกับ
 * FIXED_NODE_POSITIONS ชุดเก่าซึ่งไม่ตรงเส้นทางปัจจุบันแล้ว) */
const FIRST_OWL_POS = { x: 51, y: 90 }

/** [ใหม่ — กล้องอัตโนมัติ] ค้างโชว์แผนที่เต็มกี่ ms ก่อนเริ่มซูมเข้าไปหาโหนดล่าสุด (ข้อ 2) */
const CAMERA_INTRO_HOLD_MS = 1000
/** [ใหม่ — กล้องอัตโนมัติ] ระยะเวลาแอนิเมชัน pan+zoom ไปหาโหนดเป้าหมาย */
const CAMERA_FOCUS_DURATION_MS = 1300
/** [ใหม่ — กล้องอัตโนมัติ] ซูมตอนโฟกัสโหนด = กี่เท่าของ MIN_ZOOM (ปรับดูให้พอดีขนาดปุ่ม/โหนด
 * บนจอจริง — 1.75 อยู่กึ่งกลางช่วง 1.5-2 ที่ระบุ และยังต่ำกว่า MAX_ZOOM_MULTIPLIER (2.5) มาก
 * พอที่ผู้เล่นจะซูมเข้าต่อเองได้อีกหลังกล้องหยุด) */
const FOCUS_ZOOM_MULTIPLIER = 1.75

/**
 * Component สัญลักษณ์กองไฟแฟนตาซี (SVG Animated Campfire)
 */
function FantasyCampfireIcon({ status }: { status: 'completed' | 'active' | 'locked' }) {
  if (status === 'locked') {
    return (
      <svg viewBox="0 0 64 64" className="learning-quest-map__campfire-svg">
        {/* ฐานหิน */}
        <circle cx="20" cy="52" r="5" fill={FILL_1} />
        <circle cx="32" cy="55" r="5.5" fill={FILL_2} />
        <circle cx="44" cy="52" r="5" fill={FILL_3} />
        {/* ท่อนไม้แห้ง */}
        <rect x="18" y="44" width="28" height="6" rx="3" fill={FILL_4} transform="rotate(-15 32 47)" />
        <rect x="18" y="44" width="28" height="6" rx="3" fill={FILL_5} transform="rotate(15 32 47)" />
        {/* แม่กุญแจด่านล็อก */}
        <path d="M26 32 V26 A6 6 0 0 1 38 26 V32" stroke={STROKE_6} strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="23" y="31" width="18" height="14" rx="3" fill={FILL_7} />
        <circle cx="32" cy="37" r="2" fill={FILL_8} />
      </svg>
    )
  }

  const isCompleted = status === 'completed'

  return (
    <svg viewBox="0 0 64 64" className="learning-quest-map__campfire-svg">
      <defs>
        {/* สีเปลวไฟแฟนตาซีปกติ (Active) */}
        <linearGradient id="fireGradActive" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={TEXT_9} />
          <stop offset="50%" stopColor={TEXT_10} />
          <stop offset="100%" stopColor={TEXT_11} />
        </linearGradient>
        
        {/* สีเปลวไฟเวทมนตร์ (Completed) */}
        <linearGradient id="fireGradMagic" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={TEXT_12} />
          <stop offset="50%" stopColor={TEXT_13} />
          <stop offset="100%" stopColor={TEXT_14} />
        </linearGradient>

        <linearGradient id="coreGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={TEXT_15} />
          <stop offset="100%" stopColor="var(--fixed-white)" />
        </linearGradient>

        {/* Glow Aura */}
        <filter id="campfireGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* เงาฐานกองไฟ */}
      <ellipse cx="32" cy="56" rx="20" ry="5" fill="var(--glass-b-40)" />
      
      {/* ฐานหินแฟนตาซี */}
      <circle cx="17" cy="51" r="5" fill={FILL_16} />
      <circle cx="26" cy="54" r="5.5" fill={FILL_17} />
      <circle cx="38" cy="54" r="5.5" fill={FILL_18} />
      <circle cx="47" cy="51" r="5" fill={FILL_19} />

      {/* ท่อนไม้ติดไฟ */}
      <rect x="17" y="44" width="30" height="7" rx="3.5" fill={FILL_20} transform="rotate(-16 32 47.5)" />
      <rect x="17" y="44" width="30" height="7" rx="3.5" fill={FILL_21} transform="rotate(16 32 47.5)" />

      {/* ตัวเปลวไฟพริ้วไหวด้วย SVG Animation */}
      <g filter="url(#campfireGlow)">
        {/* เปลวไฟชั้นนอก */}
        <path
          d="M32 6 C32 6 46 20 46 35 C46 45 40 50 32 50 C24 50 18 45 18 35 C18 20 32 6 32 6 Z"
          fill={isCompleted ? "url(#fireGradMagic)" : "url(#fireGradActive)"}
        >
          <animate
            attributeName="d"
            dur="1.1s"
            repeatCount="indefinite"
            values="
              M32 6 C32 6 46 20 46 35 C46 45 40 50 32 50 C24 50 18 45 18 35 C18 20 32 6 32 6 Z;
              M32 9 C35 15 48 24 46 37 C44 46 38 50 32 50 C26 50 20 46 18 37 C16 24 29 15 32 9 Z;
              M32 6 C32 6 46 20 46 35 C46 45 40 50 32 50 C24 50 18 45 18 35 C18 20 32 6 32 6 Z
            "
          />
        </path>

        {/* เปลวไฟแกนกลาง (Inner Flame) */}
        <path
          d="M32 20 C32 20 40 28 40 37 C40 43 36 47 32 47 C28 47 24 43 24 37 C24 28 32 20 32 20 Z"
          fill="url(#coreGrad)"
          opacity="0.85"
        >
          <animate
            attributeName="d"
            dur="0.85s"
            repeatCount="indefinite"
            values="
              M32 20 C32 20 40 28 40 37 C40 43 36 47 32 47 C28 47 24 43 24 37 C24 28 32 20 32 20 Z;
              M32 23 C34 27 41 31 39 39 C37 44 35 47 32 47 C29 47 27 44 25 39 C23 31 30 27 32 23 Z;
              M32 20 C32 20 40 28 40 37 C40 43 36 47 32 47 C28 47 24 43 24 37 C24 28 32 20 32 20 Z
            "
          />
        </path>
      </g>

      {/* ประกายไฟลอยพุ่งขึ้น (Embers) */}
      <circle cx="27" cy="18" r="1.5" fill={FILL_22}>
        <animate attributeName="cy" dur="1.3s" repeatCount="indefinite" values="22;8;2" />
        <animate attributeName="opacity" dur="1.3s" repeatCount="indefinite" values="1;0.7;0" />
      </circle>
      <circle cx="36" cy="14" r="1.8" fill={isCompleted ? C_37 : C_38}>
        <animate attributeName="cy" dur="1.6s" repeatCount="indefinite" values="18;6;-2" />
        <animate attributeName="opacity" dur="1.6s" repeatCount="indefinite" values="1;0.5;0" />
      </circle>

      {/* เครื่องหมายเช็กถูกทองคำ สำหรับด่านที่ผ่านแล้ว */}
      {isCompleted && (
        <g transform="translate(38, 4)">
          <circle cx="9" cy="9" r="9" fill={FILL_23} stroke="var(--fixed-white)" strokeWidth="2" filter="drop-shadow(0 2px 4px var(--glass-b-40))" />
          <path d="M5.5 9 L8 11.5 L12.5 6.5" stroke={STROKE_24} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}
    </svg>
  )
}

/*============================================================================*\
  [ใหม่ — pan/zoom] แผนที่ตอนนี้ครอบพื้นหลัง+โหนดในเลเยอร์ transform เดียว
  (.learning-quest-map__canvas ขนาดคงที่ VIDEO_NATIVE_WIDTH×HEIGHT) แทนการคำนวณ %
  ตำแหน่งใหม่ทุกครั้งแบบ mapCoverCoordsToContainer เดิม — เพราะโหนด/พื้นหลังอยู่ในเลเยอร์
  เดียวกันแล้ว ตำแหน่ง % เดิมใน FIXED_NODE_POSITIONS ใช้ตรงๆ ได้เลยโดยไม่ต้องแปลงพิกัดอีก
  ฟังก์ชันด้านล่างนี้ทำหน้าที่คำนวณขอบเขต zoom/pan ที่อนุญาตแทน (บริสุทธิ์ ไม่ผูกกับ closure
  ใดๆ กันปัญหา stale closure ตอนเรียกจาก wheel/pointer handler ที่ใช้ ref เก็บค่าล่าสุด)
\*============================================================================*/

/** ซูมออกสุดได้แค่ไหน — ต้องคลุมเต็ม viewport เสมอ ไม่ว่าอัตราส่วนจอจะเป็นแบบไหน (เทียบเท่า
 * object-fit: cover เดิม) คำนวณใหม่ทุกครั้งที่ viewport resize */
function getZoomBounds(viewportW: number, viewportH: number): { min: number; max: number } {
  if (viewportW <= 0 || viewportH <= 0) return { min: 1, max: 1 }
  const min = Math.max(viewportW / VIDEO_NATIVE_WIDTH, viewportH / VIDEO_NATIVE_HEIGHT)
  return { min, max: min * MAX_ZOOM_MULTIPLIER }
}

function clampNum(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** ขอบเขต pan ที่อนุญาต ณ zoom ปัจจุบัน — กันลากเลยขอบจนเห็นพื้นที่ว่างนอกแผนที่ */
function clampPanValue(
  panX: number,
  panY: number,
  zoom: number,
  viewportW: number,
  viewportH: number
): { x: number; y: number } {
  const scaledW = VIDEO_NATIVE_WIDTH * zoom
  const scaledH = VIDEO_NATIVE_HEIGHT * zoom
  const minPanX = Math.min(0, viewportW - scaledW)
  const minPanY = Math.min(0, viewportH - scaledH)
  return { x: clampNum(panX, minPanX, 0), y: clampNum(panY, minPanY, 0) }
}

/** [ใหม่ — pan/zoom, พบตอนเทสต์จริง] .learning-quest-map ถูกครอบด้วย .dashboard__modal-layer
 * ซึ่งมี CSS transform: scale(0.97) อยู่จริง (ยืนยันด้วย getComputedStyle ตอนเทสต์) — ทำให้
 * el.clientWidth/Height (ที่ pan/zoom ทั้งหมดใช้เป็นหน่วย "พื้นที่จริงของแผนที่") กับตำแหน่งเมาส์/
 * นิ้วที่ได้จาก event.clientX/Y (อยู่ใน "พื้นที่หน้าจอที่มองเห็น" หลังโดน scale ของ ancestor แล้ว)
 * เป็นคนละหน่วยกัน ถ้าไม่แปลงก่อน จุดยึดซูม/ระยะทางลากจะเพี้ยนไปตามอัตราส่วน scale นั้นเสมอ
 * (เช่นนี้คือ 3%) ฟังก์ชันนี้อ่านอัตราส่วนจริงจาก getBoundingClientRect() เทียบ clientWidth/Height
 * ของ elementเอง จึงถูกต้องไม่ว่า ancestor จะ scale เท่าไหร่หรือไม่ scale เลยก็ตาม (ไม่ hardcode 0.97) */
function measureVisualTransform(
  el: HTMLElement,
  layoutW: number,
  layoutH: number
): { originX: number; originY: number; scale: number } {
  const rect = el.getBoundingClientRect()
  const scale = layoutW > 0 && layoutH > 0 ? (rect.width / layoutW + rect.height / layoutH) / 2 : 1
  return { originX: rect.left, originY: rect.top, scale: scale > 0 ? scale : 1 }
}

/** [ใหม่ — กล้องอัตโนมัติ] ซูมตอนโฟกัสโหนด — คูณจาก MIN_ZOOM ปัจจุบันเสมอ (ไม่ hardcode ตัวเลข
 * ตายตัว) กัน clamp ไม่ให้เกิน MAX_ZOOM ในกรณีจอเล็กมากจน MIN_ZOOM*1.75 ดันทะลุ MAX_ZOOM */
function getFocusZoom(viewportW: number, viewportH: number): number {
  const { min, max } = getZoomBounds(viewportW, viewportH)
  return clampNum(min * FOCUS_ZOOM_MULTIPLIER, min, max)
}

/** easeInOutCubic — โค้ง ease-in-out นุ่มนวลมาตรฐานสำหรับแอนิเมชันกล้อง (ข้อ 2,3) */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** [ใหม่ — กล้องอัตโนมัติ] คำนวณ pan ที่ทำให้จุด (rawX,rawY) % บนแผนที่ (0-100) ไปอยู่กึ่งกลาง
 * viewport พอดีที่ zoom ที่กำหนด — ใช้ clampPanValue เดิมกันไม่ให้จุดที่อยู่ใกล้ขอบแผนที่ทำให้
 * เห็นพื้นที่ว่างนอกแผนที่ตอนกล้องเลื่อนไปโฟกัส */
function computeFocusPan(
  rawX: number,
  rawY: number,
  zoom: number,
  viewportW: number,
  viewportH: number
): { x: number; y: number } {
  const targetWorldX = (rawX / 100) * VIDEO_NATIVE_WIDTH
  const targetWorldY = (rawY / 100) * VIDEO_NATIVE_HEIGHT
  const panX = viewportW / 2 - targetWorldX * zoom
  const panY = viewportH / 2 - targetWorldY * zoom
  return clampPanValue(panX, panY, zoom, viewportW, viewportH)
}

export default function LearningQuestMap({
  pathQuests,
  sideQuests,
  isCompleted,
  isLocked,
  getTodayCompletionCount = () => 0,
  onSelectQuest,
  selectedQuestCode,
}: LearningQuestMapProps) {
  const { settings } = useAppContext()
  const lowPower = useIsLowPowerMode()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)

  /*==========================================================================*\
    [ใหม่ — pan/zoom] zoom/pan เป็น "state สำหรับ render" — แหล่งความจริงจริงๆ ระหว่างลาก/ซูม
    คือ refs ด้านล่าง (panXRef/panYRef/zoomRef) ที่ handler ทุกตัวอ่าน-เขียนตรงๆ แบบ imperative
    แล้วค่อย flush เข้า state ผ่าน requestAnimationFrame (throttle ไม่ให้ setState ถี่เกินเฟรม
    เรตตอนมือถือส่ง pointermove รัวๆ) — containerSizeRef เก็บขนาด viewport ล่าสุดไว้ให้ wheel
    listener แบบ native (ผูก effect ครั้งเดียว) อ่านค่าปัจจุบันได้เสมอโดยไม่ต้อง resubscribe
  \*==========================================================================*/
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const zoomRef = useRef(zoom)
  const panXRef = useRef(pan.x)
  const panYRef = useRef(pan.y)
  const containerSizeRef = useRef(containerSize)
  useEffect(() => { containerSizeRef.current = containerSize }, [containerSize])
  const didInitZoomRef = useRef(false)
  const rafIdRef = useRef<number | null>(null)

  // ตัวติดตามท่าทางลาก/บีบซูม — ทั้งหมดเป็น ref ล้วน (ไม่ใช่ state) เพราะอัปเดตทุกเฟรมของ
  // pointermove ซึ่งถี่เกินกว่าจะผ่าน setState ได้โดยตรง
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panLastRef = useRef<{ x: number; y: number } | null>(null)
  const pinchLastRef = useRef<{ distance: number; midX: number; midY: number } | null>(null)
  const dragMovedRef = useRef(0)
  const suppressNextClickRef = useRef(false)
  // [แก้บั๊ก — เควสกดเล่นไม่ได้] เดิม setPointerCapture ทันทีตอน pointerdown ทุกครั้ง (แม้แค่
  // แตะเฉยๆ) — ตาม Pointer Events spec พอ element มี pointer capture แล้ว browser จะ retarget
  // compatibility mouse event รวมถึง "click" ไปที่ตัวที่ capture (ในที่นี้คือ div ครอบนอกสุด)
  // แทนที่จะเป็นปุ่มโหนดเควสที่อยู่ลึกเข้าไปข้างใน ทำให้ onClick ของปุ่มไม่เคยถูกเรียกเลยแม้แต่
  // ตอนแตะเบาๆ ไม่ได้ลาก (เทสต์รอบก่อนพลาดจุดนี้เพราะใช้ dispatchEvent(new MouseEvent('click'))
  // ยิงตรงเข้าปุ่มเอง ซึ่งข้าม native retargeting ไปเลย ไม่ใช่การทดสอบคลิกจริงจากเมาส์/นิ้ว) —
  // แก้โดยเลื่อนการ capture ไปทำตอนยืนยันแล้วว่าเป็น "ลาก" จริง (เกิน threshold เดียวกับที่ใช้
  // แยกแตะ/ลากอยู่แล้ว) แทน ตอนแตะเฉยๆ (ไม่เกิน threshold) จะไม่มีการ capture เลย click จึงตกถึง
  // ปุ่มตามปกติ
  const hasCapturedPointerRef = useRef(false)
  // [ใหม่ — pan/zoom] แปลงพิกัดหน้าจอ (clientX/Y, มี ancestor scale ปนอยู่) กลับเป็นหน่วยเดียวกับ
  // pan/zoom (clientWidth/Height) — วัดครั้งเดียวตอนเริ่มท่าทางแล้ว cache ไว้ทั้งท่าทาง (ระหว่าง
  // ลาก/บีบซูมค้างไว้ ancestor ไม่มีทางเปลี่ยน scale เอง จึงไม่ต้องวัดซ้ำทุกเฟรม)
  const visualTransformRef = useRef({ originX: 0, originY: 0, scale: 1 })

  /*==========================================================================*\
    [ใหม่ — กล้องอัตโนมัติ ข้อ 2,3,4] แยกจากระบบ pan/zoom แบบ manual ข้างบนโดยสิ้นเชิง —
    ใช้ zoomRef/panXRef/panYRef "ก้อนเดียวกัน" เป็นปลายทางเขียนค่า (เพราะเป็นแหล่งความจริง
    เดียวกัน) แต่ขับเคลื่อนด้วย rAF tween ของตัวเอง (cameraTweenCancelRef เก็บฟังก์ชันยกเลิก
    tween ที่กำลังเล่นอยู่ — เรียกตอนผู้เล่นเริ่มลาก/หมุนล้อเมาส์เองเพื่อคืนการควบคุมทันที
    ตามข้อ 4) pendingCameraFocusRef เก็บคำขอโฟกัสที่ "รอผู้เล่นปล่อยมือ/นิ้วก่อน" ถ้าเหตุการณ์
    ที่ควรเลื่อนกล้อง (ทำโหนดสำเร็จ) เกิดขึ้นระหว่างที่ผู้เล่นกำลังลาก/บีบซูมค้างอยู่พอดี
  \*==========================================================================*/
  const cameraAnimFrameRef = useRef<number | null>(null)
  const cameraTweenCancelRef = useRef<(() => void) | null>(null)
  const pendingCameraFocusRef = useRef<{ x: number; y: number; zoom: number; duration: number } | null>(null)

  // [ย้ายขึ้นมาจากท้ายไฟล์รอบนี้] ต้องรู้ตำแหน่งนกฮูก (owlPos) ก่อนถึง effect ตั้งกล้องเริ่มต้น
  // ด้านล่าง (ข้อ 2) ที่ต้องใช้ตำแหน่งนี้เป็นเป้าหมายซูมตอนเข้าหน้าครั้งแรก
  const rawNodePositions = pathQuests.map((_, i) => FIXED_NODE_POSITIONS[i] ?? generateFallbackPosition(i, pathQuests.length))

  const nodes: PathNode[] = pathQuests.map((quest, i) => ({
    quest,
    xPct: rawNodePositions[i].x,
    yPct: rawNodePositions[i].y,
  }))

  const completedPathCount = pathQuests.filter((q) => isCompleted(q.code)).length
  // [แก้ตามที่ระบุ — ข้อ 1] เดิม offset คงที่จากโหนดที่ 1 (x-9, y+7) คาลิเบรตกับ
  // FIXED_NODE_POSITIONS ชุดเก่าที่ไม่ตรงเส้นทางปัจจุบันแล้ว (โหนด 1 ย้ายจาก {26,72} เป็น
  // {40,70}) นกฮูกเลยหลุดออกนอกเส้นทางไปตกพุ่มไม้ — ตอนนี้: ยังไม่ทำโหนดไหนสำเร็จ ใช้ FIRST_OWL_POS
  // (จุดคงที่บนเส้นทางก่อนถึงโหนด 1 ที่ตรวจสอบด้วยตาแล้วว่าตรงเส้นทางจริง) ทำโหนด N สำเร็จแล้ว
  // ใช้ตำแหน่งของโหนด N "พอดี" แทนการบวก offset เดา — รับประกันว่าอยู่บนเส้นทางเสมอเพราะพิกัด
  // โหนดเองคือพิกัดที่คาลิเบรตกับเส้นทางในวิดีโอไว้แล้ว
  const owlPos = completedPathCount === 0 || rawNodePositions.length === 0
    ? FIRST_OWL_POS
    : rawNodePositions[Math.min(completedPathCount - 1, rawNodePositions.length - 1)]

  const scheduleFlush = () => {
    if (rafIdRef.current != null) return
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null
      setZoom(zoomRef.current)
      setPan({ x: panXRef.current, y: panYRef.current })
    })
  }

  const handlePickSideQuest = (q: QuestDef) => {
    setIsSideMenuOpen(false)
    onSelectQuest(q)
  }

  /** [ใหม่ — กล้องอัตโนมัติ ข้อ 2,3,4] เลื่อน+ซูมกล้องไปโฟกัสจุด (rawX,rawY) % บนแผนที่แบบมี
   * แอนิเมชันนุ่มนวล — ถ้าผู้เล่นกำลังลาก/บีบซูมค้างอยู่พอดี (pointersRef ไม่ว่าง) ให้ "รอ" แค่
   * เก็บคำขอไว้ใน pendingCameraFocusRef ก่อน (ข้อ 4: ห้ามตัดจังหวะการลากที่ทำอยู่กลางคัน) แล้ว
   * handlePointerUpOrCancel จะเป็นคนเรียกซ้ำให้เองตอนปล่อยมือ/นิ้วหมดจริง */
  const startCameraFocus = (rawX: number, rawY: number, targetZoom: number, durationMs: number) => {
    if (pointersRef.current.size > 0) {
      pendingCameraFocusRef.current = { x: rawX, y: rawY, zoom: targetZoom, duration: durationMs }
      return
    }
    const { width, height } = containerSizeRef.current
    if (width <= 0 || height <= 0) return

    cameraTweenCancelRef.current?.()
    const from = { zoom: zoomRef.current, x: panXRef.current, y: panYRef.current }
    const to = computeFocusPan(rawX, rawY, targetZoom, width, height)
    // [หมายเหตุ react-hooks/purity] startCameraFocus ถูกเรียกจาก event handler/effect เท่านั้น
    // (ไม่เคยถูกเรียกระหว่าง render จริง) เหมือน useCountdown.ts ที่ใช้ performance.now() แบบ
    // เดียวกันนี้อยู่แล้ว แต่ตัว linter วิเคราะห์ตามตำแหน่งซินแทกซ์ในบอดี้ component ไม่รู้จังหวะ
    // การเรียกจริง จึงต้อง disable ตรงนี้
    // eslint-disable-next-line react-hooks/purity
    const start = performance.now()

    const tick = (now: number) => {
      const t = clampNum((now - start) / durationMs, 0, 1)
      const eased = easeInOutCubic(t)
      const z = from.zoom + (targetZoom - from.zoom) * eased
      const x = from.x + (to.x - from.x) * eased
      const y = from.y + (to.y - from.y) * eased
      zoomRef.current = z
      panXRef.current = x
      panYRef.current = y
      setZoom(z)
      setPan({ x, y })
      if (t < 1) {
        cameraAnimFrameRef.current = window.requestAnimationFrame(tick)
      } else {
        cameraAnimFrameRef.current = null
        cameraTweenCancelRef.current = null
      }
    }
    cameraAnimFrameRef.current = window.requestAnimationFrame(tick)
    cameraTweenCancelRef.current = () => {
      if (cameraAnimFrameRef.current != null) window.cancelAnimationFrame(cameraAnimFrameRef.current)
      cameraAnimFrameRef.current = null
    }
  }

  // [ใหม่ — กล้องอัตโนมัติ] ยกเลิก tween ค้างเมื่อ component unmount กลางแอนิเมชัน (เช่นปิด
  // หน้าเควสระหว่างกล้องกำลังเลื่อน) กัน setState หลัง unmount
  useEffect(() => {
    return () => { cameraTweenCancelRef.current?.() }
  }, [])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateSize = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  /** [ใหม่ — pan/zoom] ตั้ง zoom เริ่มต้น = MIN_ZOOM (คลุมเต็ม viewport พอดี จุดกึ่งกลางแผนที่
   * เหมือน object-fit: cover เดิม) ตอนรู้ขนาด viewport ครั้งแรก แล้วคำนวณใหม่/clamp ค่าที่ผู้ใช้
   * ซูม-ลากไว้แล้วทุกครั้งที่ viewport resize จริง (ไม่ใช่คำนวณครั้งเดียวตอน mount) */
  useEffect(() => {
    const { width, height } = containerSize
    if (width <= 0 || height <= 0) return
    const { min: newMinZoom, max: newMaxZoom } = getZoomBounds(width, height)

    if (!didInitZoomRef.current) {
      didInitZoomRef.current = true
      const scaledW = VIDEO_NATIVE_WIDTH * newMinZoom
      const scaledH = VIDEO_NATIVE_HEIGHT * newMinZoom
      const initX = Math.min(0, (width - scaledW) / 2)
      const initY = Math.min(0, (height - scaledH) / 2)
      zoomRef.current = newMinZoom
      panXRef.current = initX
      panYRef.current = initY
      setZoom(newMinZoom)
      setPan({ x: initX, y: initY })

      // [ใหม่ — กล้องอัตโนมัติ ข้อ 2] เห็นแผนที่เต็มก่อนสั้นๆ (ตั้งไว้ข้างบนแล้ว) แล้วค่อยซูมไป
      // โฟกัส owlPos ปัจจุบัน (โหนดล่าสุดที่เล่นถึงจริง ไม่ใช่โหนด 1 ตายตัว — ดูคอมเมนต์ owlPos
      // ด้านบน) ผูกกับ didInitZoomRef เดียวกันจึงรับประกันว่าเล่นแค่ครั้งเดียวตอน mount จริงๆ
      const introTimer = window.setTimeout(() => {
        startCameraFocus(owlPos.x, owlPos.y, getFocusZoom(width, height), CAMERA_FOCUS_DURATION_MS)
      }, CAMERA_INTRO_HOLD_MS)
      return () => window.clearTimeout(introTimer)
    }

    const newZoom = clampNum(zoomRef.current, newMinZoom, newMaxZoom)
    const newPan = clampPanValue(panXRef.current, panYRef.current, newZoom, width, height)
    zoomRef.current = newZoom
    panXRef.current = newPan.x
    panYRef.current = newPan.y
    setZoom(newZoom)
    setPan(newPan)
    // [หมายเหตุ react-hooks/exhaustive-deps] owlPos/startCameraFocus ไม่ใส่ใน deps โดยตั้งใจ —
    // effect นี้ต้อง trigger จาก "viewport resize จริง" เท่านั้น (containerSize) ไม่ใช่ทุกครั้งที่
    // owlPos เปลี่ยน reference (คำนวณใหม่ทุก render) การอ่านค่าล่าสุดผ่าน closure ตอน effect
    // ทำงานจริงถูกต้องอยู่แล้วเพราะ branch ที่ใช้ owlPos ทำงานแค่ครั้งเดียวตอน mount (ผูกกับ
    // didInitZoomRef) ซึ่ง owlPos ตอนนั้นสะท้อนความคืบหน้าจริงจาก props ที่ส่งเข้ามาแล้ว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerSize])

  /** [ใหม่ — pan/zoom] mouse wheel ต้องผูกแบบ native { passive: false } ถึงจะเรียก
   * preventDefault ได้จริง — React's onWheel (synthetic) เป็น passive listener โดย default
   * เรียก preventDefault แล้วจะโดนเบราว์เซอร์เตือนและไม่มีผลอะไร ผูก effect ครั้งเดียว
   * (deps ว่าง) เพราะ handler อ่านค่าทั้งหมดผ่าน ref ล้วนๆ ไม่มีปัญหา stale closure */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault()
      // [ใหม่ — ข้อ 4] ผู้เล่นหมุนล้อเมาส์เอง = ต้องการควบคุมกล้องเอง ยกเลิกแอนิเมชันอัตโนมัติ
      // ที่กำลังเล่นอยู่ (ถ้ามี) ทันทีไม่ให้แย่งค่ากัน
      if (cameraTweenCancelRef.current) {
        cameraTweenCancelRef.current()
        cameraTweenCancelRef.current = null
      }
      const { width, height } = containerSizeRef.current
      const { originX, originY, scale } = measureVisualTransform(el, width, height)
      const anchorX = (e.clientX - originX) / scale
      const anchorY = (e.clientY - originY) / scale
      const { min, max } = getZoomBounds(width, height)
      const proposedZoom = zoomRef.current * (1 - e.deltaY * WHEEL_ZOOM_SPEED)
      const newZoom = clampNum(proposedZoom, min, max)
      const ratio = newZoom / zoomRef.current
      const newPanX = anchorX - (anchorX - panXRef.current) * ratio
      const newPanY = anchorY - (anchorY - panYRef.current) * ratio
      const clamped = clampPanValue(newPanX, newPanY, newZoom, width, height)
      zoomRef.current = newZoom
      panXRef.current = clamped.x
      panYRef.current = clamped.y
      scheduleFlush()
    }

    el.addEventListener('wheel', handleWheelNative, { passive: false })
    return () => el.removeEventListener('wheel', handleWheelNative)
  }, [])

  /** [ใหม่ — pan/zoom] ลากด้วยเมาส์/สไลด์นิ้ว — Pointer Events ตัวเดียวรองรับทั้งคู่ */
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // [ใหม่ — ข้อ 4] ผู้เล่นเริ่มลาก/แตะเอง = ต้องการควบคุมกล้องเอง คืนการควบคุมทันทีถ้ากล้อง
    // อัตโนมัติกำลังเลื่อนอยู่พอดี (ไม่ปล่อยให้สู้กันระหว่าง tween กับนิ้ว/เมาส์ผู้เล่น)
    if (cameraTweenCancelRef.current) {
      cameraTweenCancelRef.current()
      cameraTweenCancelRef.current = null
    }
    // [แก้บั๊ก — เควสกดเล่นไม่ได้] ไม่ setPointerCapture ตรงนี้อีกแล้ว (ดูคอมเมนต์ที่
    // hasCapturedPointerRef ด้านบน) — เลื่อนไปทำใน handlePointerMove ตอนยืนยันว่าเป็นการลากจริง
    // เท่านั้น ตอนแตะเฉยๆ (ปล่อยมือโดยไม่เกิน threshold) จะไม่มี capture เลย ปล่อยให้เบราว์เซอร์
    // จัดการ click ปกติทั้งหมด
    hasCapturedPointerRef.current = false
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 1) {
      dragMovedRef.current = 0
      panLastRef.current = { x: e.clientX, y: e.clientY }
      pinchLastRef.current = null
      visualTransformRef.current = measureVisualTransform(e.currentTarget, containerSizeRef.current.width, containerSizeRef.current.height)
    } else if (pointersRef.current.size === 2) {
      panLastRef.current = null
      visualTransformRef.current = measureVisualTransform(e.currentTarget, containerSizeRef.current.width, containerSizeRef.current.height)
      const { originX, originY, scale } = visualTransformRef.current
      const pts = Array.from(pointersRef.current.values())
      const distance = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const midX = ((pts[0].x + pts[1].x) / 2 - originX) / scale
      const midY = ((pts[0].y + pts[1].y) / 2 - originY) / scale
      pinchLastRef.current = { distance, midX, midY }
    }
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const { width, height } = containerSizeRef.current
    const { originX, originY, scale } = visualTransformRef.current

    if (pointersRef.current.size === 1 && panLastRef.current) {
      const last = panLastRef.current
      // [แก้ — พบตอนเทสต์จริง] dx/dy ดิบเป็นพิกัด "หน้าจอที่มองเห็น" ซึ่งโดน ancestor
      // transform: scale(0.97) ของ .dashboard__modal-layer ปนอยู่ (ดู measureVisualTransform)
      // ต้องหารด้วย scale ก่อนบวกเข้า panXRef/panYRef ที่เป็นหน่วย clientWidth/Height เดิม
      // ไม่งั้นแผนที่จะเลื่อนช้ากว่านิ้ว/เมาส์จริงอยู่ ~3% ตลอดเวลา
      const dxVisual = e.clientX - last.x
      const dyVisual = e.clientY - last.y
      dragMovedRef.current += Math.hypot(dxVisual, dyVisual)
      // [แก้บั๊ก — เควสกดเล่นไม่ได้] ยืนยันแล้วว่าเป็นการลากจริง (เกิน threshold) ค่อย
      // setPointerCapture ตอนนี้ — ก่อนหน้านี้ (ยังไม่เกิน threshold) ไม่ capture เลย กัน
      // browser retarget click ของปุ่มโหนดเควสไปที่ div ครอบนอกสุดตั้งแต่แค่แตะเบาๆ
      if (!hasCapturedPointerRef.current && dragMovedRef.current > CLICK_DRAG_THRESHOLD_PX) {
        hasCapturedPointerRef.current = true
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
      }
      panLastRef.current = { x: e.clientX, y: e.clientY }
      const dx = dxVisual / scale
      const dy = dyVisual / scale
      const clamped = clampPanValue(panXRef.current + dx, panYRef.current + dy, zoomRef.current, width, height)
      panXRef.current = clamped.x
      panYRef.current = clamped.y
      scheduleFlush()
    } else if (pointersRef.current.size === 2 && pinchLastRef.current) {
      const pts = Array.from(pointersRef.current.values())
      const distance = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      // midX/midY แปลงเป็นหน่วยเดียวกับ pan/zoom ทันที (เหมือน wheel anchor) — ส่วน distance
      // ใช้แค่เป็นอัตราส่วน (distance/last.distance) หน่วย screen-space ล้วนไม่กระทบผล จึงไม่ต้องแปลง
      const midX = ((pts[0].x + pts[1].x) / 2 - originX) / scale
      const midY = ((pts[0].y + pts[1].y) / 2 - originY) / scale
      const last = pinchLastRef.current
      dragMovedRef.current += Math.hypot(midX - last.midX, midY - last.midY) * scale
      if (!hasCapturedPointerRef.current && dragMovedRef.current > CLICK_DRAG_THRESHOLD_PX) {
        hasCapturedPointerRef.current = true
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
      }

      const { min, max } = getZoomBounds(width, height)
      const scaleFactor = last.distance > 0 ? distance / last.distance : 1
      const newZoom = clampNum(zoomRef.current * scaleFactor, min, max)
      const ratio = newZoom / zoomRef.current
      // ขยับตาม midpoint ก่อน (รองรับลาก 2 นิ้วพร้อมบีบซูมพร้อมกัน) แล้วค่อยซูมยึดจุด
      // midpoint ปัจจุบันเป็นศูนย์กลาง (สูตร zoom-to-point มาตรฐาน)
      const shiftedX = panXRef.current + (midX - last.midX)
      const shiftedY = panYRef.current + (midY - last.midY)
      const newPanX = midX - (midX - shiftedX) * ratio
      const newPanY = midY - (midY - shiftedY) * ratio
      const clamped = clampPanValue(newPanX, newPanY, newZoom, width, height)

      zoomRef.current = newZoom
      panXRef.current = clamped.x
      panYRef.current = clamped.y
      pinchLastRef.current = { distance, midX, midY }
      scheduleFlush()
    }
  }

  const handlePointerUpOrCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }

    if (pointersRef.current.size === 0) {
      if (dragMovedRef.current > CLICK_DRAG_THRESHOLD_PX) {
        // [กันคลิกพลาด] ลากเกิน threshold แล้ว → ตีความว่าเป็นการ "ลาก" ไม่ใช่ "แตะ" กัน
        // click ทะลุไปโดนโหนดเควส/ปุ่ม FAB ใต้จุดที่ปล่อยนิ้ว/เมาส์โดยไม่ตั้งใจ
        suppressNextClickRef.current = true
        window.setTimeout(() => { suppressNextClickRef.current = false }, 200)
      }
      panLastRef.current = null
      pinchLastRef.current = null
      // [ใหม่ — ข้อ 4] ปล่อยมือ/นิ้วสุดท้ายแล้ว — ถ้ามีคำขอโฟกัสกล้องที่ค้างรอไว้ตอนกำลังลากอยู่
      // (เช่น ทำโหนดสำเร็จระหว่างที่กำลังลากแผนที่พอดี) ค่อยเริ่มเลื่อนกล้องตอนนี้
      if (pendingCameraFocusRef.current) {
        const req = pendingCameraFocusRef.current
        pendingCameraFocusRef.current = null
        startCameraFocus(req.x, req.y, req.zoom, req.duration)
      }
    } else if (pointersRef.current.size === 1) {
      // ปล่อยนิ้วนึงระหว่างบีบซูม 2 นิ้ว → กลับไปโหมดลากนิ้วเดียวด้วยนิ้วที่เหลือ
      const remaining = Array.from(pointersRef.current.values())[0]
      panLastRef.current = { x: remaining.x, y: remaining.y }
      pinchLastRef.current = null
    }
  }

  const handleClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      e.stopPropagation()
    }
  }

  /** [ปรับรอบนี้ — เอาวิดีโอ "เดินเปลี่ยนฉาก" เต็มจอออก] ระบบเดิม (TransitionOverlay.tsx) เล่น
   *  วิดีโอตัวละครเดินคั่นทุกครั้งที่ทำเควสความรู้สำเร็จ — แต่ไฟล์วิดีโอ (Girl.mp4/Boy.mp4)
   *  ไม่เคยมีอยู่จริงในโปรเจกต์เลย (มีแค่ .gitkeep ใน public/assets/videos/) และนกฮูกบนแผนที่นี้
   *  ก็ทำหน้าที่ "แสดงความคืบหน้า" ได้ครบอยู่แล้วด้วยตัวเอง (เลื่อนตำแหน่งไปโหนดถัดไปทันทีที่
   *  isCompleted เปลี่ยน ผ่าน CSS transition ของ .learning-quest-map__owl ที่มีอยู่แล้ว) จึงตัด
   *  TransitionOverlay ทิ้งทั้งกลไก ไม่ใช่แค่ซ่อมมันต่อ — แทนที่ด้วยแอนิเมชัน "เดิน" (ขาสลับ/ปีก
   *  กระพือ ผ่าน OwlAvatar's walking prop ที่มีอยู่แล้วแต่ไม่เคยถูกใช้) + เสียง OWL_WALK (นิยามไว้
   *  ใน audioPlayer.ts ตั้งแต่แรกแต่ไม่เคยถูกเรียกใช้จริงที่ไหนเลย) เล่นคู่กับช่วงที่ตำแหน่งเลื่อน
   *  ทั้งหมดนี้เกิดขึ้น "บนแผนที่เดิม" ไม่ต้องมีโอเวอร์เลย์เต็มจอ/ไฟล์วิดีโอแยกอีกต่อไป */
  const [prevCompletedPathCount, setPrevCompletedPathCount] = useState(completedPathCount)
  const [isWalking, setIsWalking] = useState(false)
  if (completedPathCount !== prevCompletedPathCount) {
    setPrevCompletedPathCount(completedPathCount)
    if (completedPathCount > prevCompletedPathCount) setIsWalking(true)
  }

  useEffect(() => {
    if (!isWalking) return
    playSfx('OWL_WALK', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
    // 900ms ให้ตรงกับระยะเวลา CSS transition ของ .learning-quest-map__owl (left/top 0.9s)
    const id = window.setTimeout(() => setIsWalking(false), 900)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWalking])

  /** [ใหม่ — กล้องอัตโนมัติ ข้อ 3] ทำโหนดใหม่สำเร็จ (จุดเดียวกับที่ isWalking sync ทันทีข้างบน
   * ไม่ต้องกด 2 ครั้ง) → เลื่อนกล้องไปหาตำแหน่งนกฮูกใหม่อัตโนมัติ — hasMountedCameraRef กัน
   * ไม่ให้ effect นี้ยิงซ้ำตอน mount ครั้งแรก (จังหวะนั้นมี "ค้างโชว์แผนที่เต็มก่อน" ที่ effect
   * ตั้งกล้องเริ่มต้นด้านบนจัดการแยกไปแล้ว ไม่ต้องซ้อนกัน) ทำงานเฉพาะตอน completedPathCount
   * เปลี่ยนจริงเท่านั้น (ไม่ใช่ทุก re-render) เพราะเป็น dependency เดียวของ effect นี้
   * [แก้รอบนี้ — ข้อ 2] ถ้าโหนดที่เพิ่งสำเร็จคือโหนดสุดท้ายจริง (เช็คจาก pathQuests.length
   * ไม่ hardcode เลข 5 — รองรับถ้าอนาคตเพิ่ม/ลดจำนวนฐาน) ไม่มีโหนดถัดไปให้ซูมเข้าหาแล้ว จึง
   * ทำตรงข้าม: ซูมออกกลับไป MIN_ZOOM (จุดกึ่งกลางแผนที่ x:50,y:50 — สูตรเดียวกับที่ effect
   * ตั้งกล้องเริ่มต้นใช้คำนวณกรอบเต็มแผนที่ พิสูจน์แล้วว่าให้ผลตรงกันทุกประการ) ด้วย
   * startCameraFocus ฟังก์ชันเดิมตัวเดียวกัน (เอฟเฟกต์/ระยะเวลาเดียวกันทุกจุดตามที่ระบุ "เอฟเฟกต์
   * เดียวกัน" — ไม่สร้างค่าคงที่ easing/duration แยกใหม่อีกชุด) */
  const hasMountedCameraRef = useRef(false)
  useEffect(() => {
    if (!hasMountedCameraRef.current) {
      hasMountedCameraRef.current = true
      return
    }
    const { width, height } = containerSizeRef.current
    const isLastNodeJustCompleted = pathQuests.length > 0 && completedPathCount >= pathQuests.length
    if (isLastNodeJustCompleted) {
      const { min: minZoom } = getZoomBounds(width, height)
      startCameraFocus(50, 50, minZoom, CAMERA_FOCUS_DURATION_MS)
    } else {
      startCameraFocus(owlPos.x, owlPos.y, getFocusZoom(width, height), CAMERA_FOCUS_DURATION_MS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedPathCount])

  return (
    <div
      ref={containerRef}
      className="learning-quest-map"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onClickCapture={handleClickCapture}
    >
      {/* [ใหม่ — pan/zoom] เลเยอร์เดียวที่ถูก pan/zoom ร่วมกัน ขนาดคงที่เท่าเฟรมวิดีโอต้นฉบับ
          (VIDEO_NATIVE_WIDTH×HEIGHT) — พื้นหลัง+โหนดเควสทั้งหมดอยู่ในนี้ ตำแหน่ง % เดิมของ
          โหนด (FIXED_NODE_POSITIONS) จึงใช้ตรงๆ ได้โดยไม่ต้องแปลงพิกัดแบบเดิมอีก */}
      <div
        className="learning-quest-map__canvas"
        style={{
          width: VIDEO_NATIVE_WIDTH,
          height: VIDEO_NATIVE_HEIGHT,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* วิดีโอพื้นหลังเส้นทางป่าเวทมนตร์ วนลูป — โหมด low-power ใช้พื้นหลังสีทึบเดิมของ
            .learning-quest-map (--lc-bg-12) แทน ไม่เล่นวิดีโอ (แพทเทิร์นเดียวกับ
            Dashboard.tsx/VitalityStepsQuest.tsx) */}
        {!lowPower && (
          <video className="learning-quest-map__video" autoPlay loop muted playsInline>
            <source src="/assets/videos/quest-learning/QuestPathMap.mp4" type="video/mp4" />
          </video>
        )}

        <div className="learning-quest-map__scrim" />

        {nodes.map((node, i) => {
        const locked = isLocked(node.quest)
        // [แก้บั๊ก — พบจากรีวิวโค้ด] เดิม isCompleted(node.quest.code) ตรงๆ — ถ้าอนาคตมีเควส
        // maxPerDay ในหมวดความรู้ (isRepeatable/maxPerDay เป็น field ทั่วไป ไม่ได้ผูกกับหมวด
        // ใดหมวดหนึ่ง) จะขึ้น "สำเร็จแล้ว" ทันทีตั้งแต่เล่นรอบแรกเหมือนบั๊กเดิมของ
        // QuestGateView.tsx ที่เพิ่งแก้ไป — ใช้ตัวช่วยกลางตัวเดียวกันแทนกันไม่ให้บั๊กเดิมโผล่
        // ที่นี่อีก (ตอนนี้ยังไม่มีเควสความรู้ตัวไหนติด maxPerDay จริง แต่กันไว้ก่อน)
        const completed = isQuestFullyDoneToday(node.quest, isCompleted, getTodayCompletionCount)
        const isSelected = selectedQuestCode === node.quest.code
        const status = completed ? 'completed' : locked ? 'locked' : 'active'

        return (
          <div
            key={node.quest.code}
            className="learning-quest-map__node-wrap"
            style={{ left: `${node.xPct}%`, top: `${node.yPct}%`, animationDelay: `${i * 0.15}s` }}
          >
            {/* ชื่อเควสลอยเด่นเหนือกองไฟ */}
            <div className="learning-quest-map__node-label">{node.quest.titleTh}</div>

            {/* ปุ่มปักหมุดกองไฟแฟนตาซี */}
            <button
              className={`learning-quest-map__node ${completed ? 'learning-quest-map__node--completed' : ''} ${
                locked ? 'learning-quest-map__node--locked' : ''
              } ${isSelected ? 'learning-quest-map__node--selected' : ''}`}
              onClick={() => onSelectQuest(node.quest)}
              title={node.quest.titleTh}
            >
              <div className="learning-quest-map__node-badge">
                <FantasyCampfireIcon status={status} />
              </div>
              <span className="learning-quest-map__node-number">{i + 1}</span>
              {node.quest.isRepeatable && (
                <span
                  className="learning-quest-map__node-repeat"
                  title={node.quest.maxPerDay ? `เล่นซ้ำได้วันนี้ ${getTodayCompletionCount(node.quest.code)}/${node.quest.maxPerDay} ครั้ง` : 'เล่นซ้ำได้หลายครั้งต่อวัน'}
                >
                  🔁
                </span>
              )}
            </button>
          </div>
        )
      })}

        {/* ตัวละครนกฮูกน้อย — เลื่อนตำแหน่งลื่นๆ ด้วย CSS transition (ดู .learning-quest-map__owl)
            พร้อมแอนิเมชันเดิน (ขาสลับ/ปีกกระพือ) ช่วงที่ตำแหน่งกำลังเลื่อนจริง */}
        <div className="learning-quest-map__owl" style={{ left: `${owlPos.x}%`, top: `${owlPos.y}%` }}>
          <OwlAvatar walking={isWalking} size={46} />
        </div>
      </div>

      {/* [ใหม่] ทางเข้าเควสเสริม (side quests) — แพทเทิร์นเดียวกับ FAB ของ QuestGateView (หมวดกาย/
          ใจ) เพื่อให้กดเข้าถึงได้จริง ไม่ใช่แค่มีอยู่ใน catalog เฉยๆ — อยู่นอกเลเยอร์ pan/zoom
          โดยตั้งใจ (ปุ่มลอยติดจอ ไม่ใช่ส่วนหนึ่งของแผนที่ที่ควรเลื่อน/ซูมตามไปด้วย) */}
      {sideQuests.length > 0 && (
        <div className={`learning-quest-map__fab${isSideMenuOpen ? ' open' : ''}`}>
          <div className="learning-quest-map__fab-menu">
            {sideQuests.map((q) => {
              const locked = isLocked(q)
              const done = isQuestFullyDoneToday(q, isCompleted, getTodayCompletionCount)
              return (
                <button
                  key={q.code}
                  className="learning-quest-map__fab-item"
                  style={{ opacity: locked ? .45 : 1 }}
                  title={q.titleTh}
                  disabled={locked}
                  onClick={() => handlePickSideQuest(q)}
                >
                  {/* [แก้ตามที่ระบุ — ตัวเลือก B ให้ตรงกับ QuestGateView.tsx] ไอคอนเควสเปล่าๆ
                      ไม่มีขอบ/พื้นหลังเพิ่ม ปุ่มวงกลมเดิม (.learning-quest-map__fab-item) ยังคง
                      พื้นหลัง/ขอบไว้เป็นปุ่มกดจริง (ไม่ใช่แค่กรอบตกแต่งไอคอนเฉยๆ แบบ
                      QuestGateView) แต่ตัวไอคอนข้างในไม่ครอบด้วยวงกลม/เงาซ้อนอีกชั้น */}
                  <span className="learning-quest-map__fab-item-icon">
                    {QUEST_ICONS[q.code]
                      ? <img src={QUEST_ICONS[q.code]} className="learning-quest-map__fab-item-img" alt={q.titleTh} />
                      : q.icon}
                  </span>
                  {done && <span className="learning-quest-map__fab-badge learning-quest-map__fab-badge--done">✓</span>}
                  {locked && <span className="learning-quest-map__fab-badge learning-quest-map__fab-badge--lock">🔒</span>}
                  {q.isRepeatable && (
                    <span
                      className="learning-quest-map__fab-badge learning-quest-map__fab-badge--repeat"
                      title={q.maxPerDay ? `เล่นซ้ำได้วันนี้ ${getTodayCompletionCount(q.code)}/${q.maxPerDay} ครั้ง` : 'เล่นซ้ำได้หลายครั้งต่อวัน'}
                    >
                      🔁
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            className="learning-quest-map__fab-main"
            onClick={() => setIsSideMenuOpen((v) => !v)}
            title="เควสเสริม"
          >
            {isSideMenuOpen ? <img src={BADGE_ICONS.close} className="icon-img" alt="" /> : '📋'}
          </button>
        </div>
      )}

      <style>{`
        .learning-quest-map {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  --lc-bg-12: #0b1f16;
  background: var(--lc-bg-12);
  /* [ใหม่ — pan/zoom] กันเบราว์เซอร์ตีความลาก/บีบนิ้วเป็น scroll/native-pinch-zoom ของหน้า
     ไปเอง ต้องปิดก่อน ไม่งั้น pointer-events ที่เขียนเองจะชนกับ gesture เดิมของเบราว์เซอร์
     บนมือถือ (ลากแล้วหน้าเลื่อนแทน/บีบซูมทั้งหน้าเว็บแทนที่จะซูมแค่แผนที่) */
  touch-action: none;
}
        .learning-quest-map__canvas {
          position: relative;
          transform-origin: 0 0;
          will-change: transform;
        }
        .learning-quest-map__video {
          position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center;
        }
        .learning-quest-map__scrim {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(180deg, var(--glass-b-25) 0%, transparent 20%, transparent 70%, var(--glass-b-35) 100%);
        }

        .learning-quest-map__node-wrap {
          position: absolute; transform: translate(-50%, -50%);
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          animation: learningQuestNodeIn .4s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes learningQuestNodeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(.5); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        .learning-quest-map__node-label {
  font-family: 'Fredoka One', sans-serif;
  font-size: 18px;
  color: var(--fixed-white);
  --lc-bg-11: rgba(15, 23, 42, 0.75);
  background: var(--lc-bg-11);
  backdrop-filter: blur(4px);
  padding: 3px 10px;
  border-radius: 99px;
  white-space: nowrap;
  border: 1px solid var(--glass-w-20);
  text-shadow: 0 1px 3px var(--glass-b-80);
  box-shadow: 0 4px 12px var(--glass-b-40);
}

        .learning-quest-map__node {
          position: relative; background: none; border: none; cursor: pointer; padding: 0;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .learning-quest-map__node:hover {
          transform: scale(1.12);
        }

        /* ตราวงกลมรองรับกองไฟ */
        .learning-quest-map__node-badge {
          width: 80px; height: 80px; border-radius: 99px; display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle, var(--glass-w-20) 0%, var(--glass-b-50) 80%);
          backdrop-filter: blur(2px);
          box-shadow: 0 8px 20px var(--glass-b-50), inset 0 0 12px var(--glass-w-30);
          border: 2px solid var(--glass-w-60);
          animation: learningQuestNodeFloat 2.6s ease-in-out infinite;
          overflow: visible;
        }
        @keyframes learningQuestNodeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        .learning-quest-map__campfire-svg {
          width: 100%; height: 100%; overflow: visible;
        }

        .learning-quest-map__node--locked .learning-quest-map__node-badge {
  animation: none;
  opacity: 0.75;
  --lc-bg-9: rgba(30, 41, 59, 0.7);
  background: var(--lc-bg-9);
  --lc-border-10: rgba(148, 163, 184, 0.4);
  border-color: var(--lc-border-10);
}

        .learning-quest-map__node--completed .learning-quest-map__node-badge {
  animation: none;
  --lc-bg-4: rgba(124, 77, 255, 0.3);
  --lc-bg-5: rgba(15, 23, 42, 0.7);
  background: radial-gradient(circle, var(--lc-bg-4) 0%, var(--lc-bg-5) 100%);
  --lc-border-6: #FFD700;
  border-color: var(--lc-border-6);
  --lc-shadow-7: rgba(255, 215, 0, 0.4);
  --lc-shadow-8: rgba(0, 229, 255, 0.3);
  box-shadow: 0 0 16px var(--lc-shadow-7), inset 0 0 10px var(--lc-shadow-8);
}

        .learning-quest-map__node--selected .learning-quest-map__node-badge {
  --lc-shadow-3: #FF9900;
  box-shadow: 0 0 0 4px var(--fixed-white), 0 0 20px var(--lc-shadow-3);
}

        .learning-quest-map__node-number {
  position: absolute;
  top: -2px;
  right: -2px;
  --lc-bg-1: #FFD700;
  background: var(--lc-bg-1);
  --lc-text-2: #0F172A;
  color: var(--lc-text-2);
  font-size: 20px;
  font-weight: 900;
  border-radius: 99px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px var(--glass-b-40);
  border: 1.5px solid var(--fixed-white);
}

        /* [ใหม่] ป้าย "เล่นซ้ำได้" — มุมล่างซ้ายของตราวงกลม (ตรงข้ามกับเลขลำดับด่านที่มุมขวาบน) */
        .learning-quest-map__node-repeat {
          position: absolute;
          bottom: -2px;
          left: -2px;
          background: var(--g500);
          font-size: 10px;
          border-radius: 99px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px var(--glass-b-40);
          border: 1.5px solid var(--fixed-white);
        }

        .learning-quest-map__owl {
          position: absolute; transform: translate(-50%, -60%);
          z-index: 5; pointer-events: none;
          transition: left 0.9s cubic-bezier(.45,.05,.55,.95), top 0.9s cubic-bezier(.45,.05,.55,.95);
        }

        /* [ใหม่] FAB เควสเสริม — สไตล์เดียวกับ quest-gate-view__fab ใน QuestGateView.tsx
           [แก้] ใช้ --gpf-safe-bottom (ประกาศที่ .gameplay-frame) กันไม่ให้ ActionMenuBar
           บัง แทนการลดขนาดกล่องแม่ทั้งกล่อง (ดู comment ใน GameplayFrame.css) */
        .learning-quest-map__fab { position: absolute; bottom: calc(var(--gpf-safe-bottom, 0px) + 24px); left: 24px; z-index: 20; }
        .learning-quest-map__fab-main {
          width: 64px; height: 64px; border-radius: 50%;
          background: linear-gradient(135deg, var(--g400), var(--g700));
          border: 3px solid var(--fixed-white); color: var(--fixed-white); font-size: 26px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 20px var(--glass-b-50); cursor: pointer; position: relative; z-index: 2;
          transition: transform .3s var(--ease-spring);
        }
        .learning-quest-map__fab-menu {
          position: absolute; bottom: 74px; left: 8px;
          display: flex; flex-direction: column-reverse; gap: 12px; pointer-events: none;
        }
        .learning-quest-map__fab.open .learning-quest-map__fab-menu { pointer-events: auto; }
        /* [แก้ตามที่ระบุ] ขยายปุ่มให้พอดีกับไอคอน 2.5cm ใหม่ (เดิม 48px เล็กกว่า 2.5cm/~94.5px
           มาก) — ปุ่มนี้ยังเป็นปุ่มกดจริง (ไม่ใช่แค่กรอบตกแต่งไอคอนแบบ QuestGateView) จึงคง
           พื้นหลัง/ขอบวงกลมไว้เป็นพื้นที่กดที่มองเห็นได้ */
        .learning-quest-map__fab-item {
          position: relative; width: calc(2.5cm + 16px); height: calc(2.5cm + 16px); border-radius: 50%;
          background: var(--g800); border: 2px solid var(--g400); color: var(--fixed-white); font-size: 20px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px var(--glass-b-35); cursor: pointer;
          transform: scale(0) translateY(24px); opacity: 0;
          transition: transform .3s var(--ease-spring), opacity .3s var(--ease-spring), background .18s ease;
        }
        .learning-quest-map__fab-item:disabled { cursor: not-allowed; }
        .learning-quest-map__fab-item:hover:not(:disabled) { background: var(--g700); }
        .learning-quest-map__fab.open .learning-quest-map__fab-item { transform: scale(1) translateY(0); opacity: 1; }
        /* [แก้ตามที่ระบุ — ตัวเลือก B] ตัวไอคอนเองไม่มีวงกลม/พื้นหลังซ้อนอีกชั้นข้างในปุ่ม */
        .learning-quest-map__fab-item-icon {
          display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
        }
        .learning-quest-map__fab-item-img { width: 2.5cm; height: 2.5cm; object-fit: contain; }
        .learning-quest-map__fab-badge {
          position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%;
          font-size: 9px; display: flex; align-items: center; justify-content: center;
        }
        .learning-quest-map__fab-badge--done { background: var(--g500); color: var(--fixed-white); }
        .learning-quest-map__fab-badge--lock { background: var(--glass-b-60); }
        /* [ใหม่] ป้ายเล่นซ้ำได้ — ย้ายไปมุมล่างซ้ายแทน กันซ้อนทับกับป้าย done/lock ที่มุมขวาบน
           (เควสเล่นซ้ำได้ยัง "สำเร็จแล้ว" ของรอบล่าสุดพร้อมกับเล่นซ้ำได้อีกในวันเดียวกันได้) */
        .learning-quest-map__fab-badge--repeat { top: auto; right: auto; bottom: -4px; left: -4px; background: var(--g500); }

        @media (prefers-reduced-motion: reduce) {
          .learning-quest-map__node-badge, .learning-quest-map__node-wrap, .learning-quest-map__owl { animation: none; transition: none; }
        }
      `}</style>
    </div>
  )
}

/** Fallback กรณีจำนวนเควสเกิน 5 */
function generateFallbackPosition(index: number, total: number): { x: number; y: number } {
  const marginY = 12
  const usableY = 100 - marginY * 2
  const t = total <= 1 ? 0.5 : index / (total - 1)
  const y = 100 - marginY - t * usableY
  const wave = Math.sin(t * Math.PI * 1.6)
  const x = 48 + wave * 18
  return { x, y }
}