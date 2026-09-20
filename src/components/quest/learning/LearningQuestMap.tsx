import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { isQuestFullyDoneToday, type QuestDef } from '../../../config/questCatalog'
import { QUEST_ICONS } from '../../../config/iconAssets'
import OwlAvatar from '../OwlAvatar'
import { useAppContext } from '../../../context/AppContext'
import { playSfx } from '../../../utils/audioPlayer'

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
  { x: 26, y: 72 },     // 1. เพ่งสมาธิ / ตั้งเป้าหมาย
  { x: 40, y: 61 },   // 2. หยั่งรากลึก / โหมดจดจ่อ
  { x: 55, y: 51 },   // 3. เทกระเป๋าความจำผ่านเสียง
  { x: 55, y: 30 }, // 4. ผสมเกสรข้ามศาสตร์
  { x: 56, y: 15 },     // 5. เช็กอินรายวัน (locked node)
]

const VIDEO_NATIVE_WIDTH = 1920
const VIDEO_NATIVE_HEIGHT = 1080

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

/**
 * คำนวณตำแหน่ง % บนหน้าจอตามพฤติกรรม object-fit: cover ของวิดีโอ
 */
function mapCoverCoordsToContainer(
  origX: number,
  origY: number,
  containerW: number,
  containerH: number
): { x: number; y: number } {
  if (containerW <= 0 || containerH <= 0) return { x: origX, y: origY }

  const scale = Math.max(containerW / VIDEO_NATIVE_WIDTH, containerH / VIDEO_NATIVE_HEIGHT)
  const renderedW = VIDEO_NATIVE_WIDTH * scale
  const renderedH = VIDEO_NATIVE_HEIGHT * scale

  const offsetX = (containerW - renderedW) / 2
  const offsetY = (containerH - renderedH) / 2

  const pixelX = offsetX + (origX / 100) * renderedW
  const pixelY = offsetY + (origY / 100) * renderedH

  return {
    x: (pixelX / containerW) * 100,
    y: (pixelY / containerH) * 100,
  }
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)

  const handlePickSideQuest = (q: QuestDef) => {
    setIsSideMenuOpen(false)
    onSelectQuest(q)
  }

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

  const rawNodePositions = pathQuests.map((_, i) => FIXED_NODE_POSITIONS[i] ?? generateFallbackPosition(i, pathQuests.length))

  const mappedNodePositions = rawNodePositions.map((pos) =>
    mapCoverCoordsToContainer(pos.x, pos.y, containerSize.width, containerSize.height)
  )

  const nodes: PathNode[] = pathQuests.map((quest, i) => ({
    quest,
    xPct: mappedNodePositions[i].x,
    yPct: mappedNodePositions[i].y,
  }))

  const completedPathCount = pathQuests.filter((q) => isCompleted(q.code)).length
  const rawStartPos = rawNodePositions.length > 0
    ? { x: rawNodePositions[0].x - 9, y: Math.min(97, rawNodePositions[0].y + 7) }
    : { x: 42, y: 67 }

  const rawOwlPos = completedPathCount === 0
    ? rawStartPos
    : rawNodePositions[Math.min(completedPathCount - 1, rawNodePositions.length - 1)]

  const owlPos = mapCoverCoordsToContainer(rawOwlPos.x, rawOwlPos.y, containerSize.width, containerSize.height)

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

  return (
    <div ref={containerRef} className="learning-quest-map">
      {/* วิดีโอพื้นหลังเส้นทางป่าเวทมนตร์ วนลูป */}
      <video className="learning-quest-map__video" autoPlay loop muted playsInline>
        <source src="/assets/videos/quest-learning/QuestPathMap.mp4" type="video/mp4" />
      </video>

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

      {/* [ใหม่] ทางเข้าเควสเสริม (side quests) — แพทเทิร์นเดียวกับ FAB ของ QuestGateView
          (หมวดกาย/ใจ) เพื่อให้กดเข้าถึงได้จริง ไม่ใช่แค่มีอยู่ใน catalog เฉยๆ */}
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
            {isSideMenuOpen ? '✕' : '📋'}
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