import { memo, useMemo, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react'
import type { MbtiType, RiskLevel, PlacedItem, DecorationPositionMap, QuestCategory } from '../../types'
import { DECORATION_EMOJI, DECORATION_ZONE_POSITION, getDecorationImage } from '../../config/decorationItems'
import { useIsSmallScreen, usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { getCanopyShape, sampleCanopyPoint } from '../../config/canopyShape'
import { seededRandom } from '../../utils/seededRandom'
import GroundScene from './GroundScene'
import { useAudio } from '../../context/AudioContext'
import './TreeOfLife.css'

/**
 * ═══════════════════════════════════════════════════════════════════════
 * TreeOfLife — Layered Pre-drawn Images + "Leaf Brush Stamping"
 * ═══════════════════════════════════════════════════════════════════════
 * (คำอธิบายเทคนิคการปั๊มใบไม้/เหตุผลที่ไม่ใช้ canvas — ดูรอบก่อนหน้า ไม่เปลี่ยนแปลง)
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
 *  5. ไอเทมตกแต่งรองรับไฟล์ภาพจริงแล้ว (เห็น getDecorationImage) โดยยังมี emoji
 *     เป็นตัวสำรองสำหรับชิ้นที่ยังไม่มีภาพ → ทยอยเปลี่ยนทีละชิ้นได้
 *
 * [รอบก่อน]
 *  - onTreeClick: คลิกที่ต้นไม้ (นอกเหนือจาก hotspot โคนต้นที่โชว์ tooltip เลเวล) →
 *    เปิด TreeSummaryModal (บทความ AI) ที่ Dashboard.tsx ควบคุม
 *  - decorationPositions/onDecorationMove: ไอเทมตกแต่งลากวางอิสระได้ทุกตำแหน่งรอบต้นไม้
 *    แทนที่จะติดอยู่กับโซนตายตัว 4 โซนแบบเดิม (ดู AppContext.tsx สำหรับ state ที่เก็บพิกัด)
 *  - <GroundScene>: เลเยอร์หญ้า/ดอกไม้มีมิติ พริ้วไหวตามลม ผูกกับ grassSoilLevel
 */

const treeAssetModules = import.meta.glob('/src/assets/trees/**/*.{webp,gif,png}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const ASSET_LOOKUP: Record<string, string> = {}
for (const [modulePath, url] of Object.entries(treeAssetModules)) {
  const match = modulePath.match(/\/assets\/trees\/([^/]+)\/([^/]+)$/)
  if (match) {
    const [, folder, filename] = match
    ASSET_LOOKUP[`${folder}/${filename}`] = url
  }
}

type TreeAssetFolder = MbtiType | 'BALANCED'
const ASSET_EXTENSIONS = ['webp', 'gif', 'png'] as const

function findLeveledAsset(folder: string, prefix: 'trunk' | 'grass', level: number): string | null {
  const clampedLevel = Math.min(100, Math.max(1, Math.round(level)))
  for (let lv = clampedLevel; lv >= 1; lv--) {
    for (const ext of ASSET_EXTENSIONS) {
      const url = ASSET_LOOKUP[`${folder}/${prefix}_lvl${lv}.${ext}`]
      if (url) return url
    }
  }
  return null
}

function findBrushVariants(folder: string, prefix: 'leaf_brush' | 'flower_brush'): string[] {
  const urls: string[] = []
  for (let i = 1; i <= 40; i++) {
    let found: string | null = null
    for (const ext of ASSET_EXTENSIONS) {
      const url = ASSET_LOOKUP[`${folder}/${prefix}_${i}.${ext}`]
      if (url) { found = url; break }
    }
    if (!found) break
    urls.push(found)
  }
  return urls
}

function resolveFolder(preferred: TreeAssetFolder): { folder: TreeAssetFolder; usedFallback: boolean } {
  const hasLeafBrush = findBrushVariants(preferred, 'leaf_brush').length > 0
  if (hasLeafBrush) return { folder: preferred, usedFallback: false }

  if (preferred !== 'BALANCED') {
    const balancedHasLeafBrush = findBrushVariants('BALANCED', 'leaf_brush').length > 0
    if (balancedHasLeafBrush) {
      if (import.meta.env.DEV) {
        console.warn(`[TreeOfLife] ไม่พบชุด leaf_brush ของ "${preferred}" — ใช้ชุด BALANCED แทนทั้งต้น`)
      }
      return { folder: 'BALANCED', usedFallback: true }
    }
  }
  return { folder: preferred, usedFallback: false }
}

interface FoliageStamp {
  key: string
  url: string
  leftPct: number
  topPct: number
  scale: number
  rotationDeg: number
  order: number
  delayMs: number
}

interface GenerateStampsOptions {
  seedKey: string
  brushUrls: string[]
  count: number
  canopyShape: ReturnType<typeof getCanopyShape>
  baseSizePct: number
  keyPrefix: string
}

function generateFoliageStamps({ seedKey, brushUrls, count, canopyShape, baseSizePct, keyPrefix }: GenerateStampsOptions): FoliageStamp[] {
  if (brushUrls.length === 0 || count <= 0) return []

  const rng = seededRandom(seedKey)
  const stamps: FoliageStamp[] = []

  for (let i = 0; i < count; i++) {
    const point = sampleCanopyPoint(canopyShape, rng)
    const sizeByDepth = 0.7 + point.depthT * 0.6
    const randomVariance = 0.85 + rng() * 0.3
    const brush = brushUrls[Math.floor(rng() * brushUrls.length)]

    stamps.push({
      key: `${keyPrefix}-${seedKey}-${i}`,
      url: brush,
      leftPct: point.xPct,
      topPct: point.yPct,
      scale: (baseSizePct / 100) * sizeByDepth * randomVariance,
      rotationDeg: (rng() - 0.5) * 36,
      order: point.depthT,
      delayMs: point.depthT * 260 + rng() * 80,
    })
  }

  return stamps.sort((a, b) => a.order - b.order)
}

const RISK_FILTER: Record<RiskLevel, string> = {
  LOW: 'none',
  MODERATE: 'saturate(0.55) brightness(0.97) contrast(0.96)',
  HIGH: 'grayscale(0.85) sepia(0.25) brightness(0.85) contrast(0.92)',
}

/** พิกัดกำหนดเอง (%) ของไอเทมตกแต่งแต่ละชิ้น — key = itemId (type อยู่ที่ types.ts ใช้ร่วมกับ AppContext.tsx) */

interface TreeOfLifeProps {
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
  showHint?: boolean
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
  showHint = true,
  className,
}: TreeOfLifeProps) {
  const preferredFolder: TreeAssetFolder = mbtiType ?? 'BALANCED'
  const { folder } = useMemo(() => resolveFolder(preferredFolder), [preferredFolder])
  const canopyShape = useMemo(() => getCanopyShape(mbtiType), [mbtiType])

  const trunkUrl = useMemo(() => findLeveledAsset(folder, 'trunk', trunkBranchLevel), [folder, trunkBranchLevel])
  const grassUrl = useMemo(() => findLeveledAsset(folder, 'grass', grassSoilLevel), [folder, grassSoilLevel])

  const leafBrushUrls = useMemo(() => findBrushVariants(folder, 'leaf_brush'), [folder])
  const flowerBrushUrls = useMemo(() => findBrushVariants(folder, 'flower_brush'), [folder])

  /* [ใหม่] เพดานจำนวนใบตามขนาดจอ — เรื่องจำนวน DOM node ต้องตัดสินใจใน JS
     ไม่ใช่ซ่อนด้วย CSS (ซ่อนด้วย CSS = สร้าง element ครบแล้วค่อยซ่อน
     ซึ่งจ่ายค่า layout/paint ไปแล้วเรียบร้อย) */
  const isSmallScreen = useIsSmallScreen()
  const reducedMotion = usePrefersReducedMotion()
  const maxLeaves = isSmallScreen ? 28 : 70
  const maxFlowers = isSmallScreen ? 6 : 14

  const leafStampCount = Math.min(maxLeaves, Math.round(8 + (leafFlowerLevel / 100) * 62))
  const flowerStampCount = Math.min(maxFlowers, Math.round((leafFlowerLevel / 100) * 14))

  const leafStamps = useMemo(
    () => generateFoliageStamps({ seedKey: `${folder}-leaf-${leafFlowerLevel}`, brushUrls: leafBrushUrls, count: leafStampCount, canopyShape, baseSizePct: 22, keyPrefix: 'leaf' }),
    [folder, leafFlowerLevel, leafBrushUrls, leafStampCount, canopyShape],
  )
  const flowerStamps = useMemo(
    () => generateFoliageStamps({ seedKey: `${folder}-flower-${leafFlowerLevel}`, brushUrls: flowerBrushUrls, count: flowerStampCount, canopyShape, baseSizePct: 9, keyPrefix: 'flower' }),
    [folder, leafFlowerLevel, flowerBrushUrls, flowerStampCount, canopyShape],
  )

  const [hintVisible, setHintVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // [ใหม่] เล่น burst effect ทุกครั้งที่ growthPulse.key เปลี่ยน (เควสสำเร็จ) แล้วเคลียร์เอง
  // อัตโนมัติหลัง 1.8s — ไม่ต้องให้ AppContext เป็นคนจับเวลาเคลียร์ค่าทิ้ง กัน stale closure
  const { playGameSound } = useAudio()
  const [activePulse, setActivePulse] = useState<{ category: QuestCategory; key: number } | null>(null)

  // [แก้] เดิม setActivePulse(growthPulse) เรียกตรงๆ ตอนต้น effect (react-hooks/set-state-in-effect)
  // ย้ายมาตั้งค่า "ระหว่าง render" ทันทีที่ growthPulse.key เปลี่ยน ส่วนเสียง/ตัวจับเวลาเคลียร์
  // อัตโนมัติ (ซึ่งเป็นการเชื่อมกับ external system จริง) ยังอยู่ใน effect ด้านล่างเหมือนเดิม
  const [prevPulseKey, setPrevPulseKey] = useState(growthPulse?.key ?? null)
  if ((growthPulse?.key ?? null) !== prevPulseKey) {
    setPrevPulseKey(growthPulse?.key ?? null)
    if (growthPulse) setActivePulse(growthPulse)
  }

  useEffect(() => {
    if (!growthPulse) return
    // [ใหม่] เล่นเสียงต้นไม้โต — ตรงจุดเดียวกับที่ trigger treeOfLifeLayerGrow burst effect
    playGameSound('tree-grow')
    const timeoutId = window.setTimeout(() => setActivePulse(null), 1800)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growthPulse?.key])

  return (
    <div
      ref={rootRef}
      className={`tree-of-life ${className ?? ''}`}
      onClick={onTreeClick}
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
        className="tree-of-life__stack"
        style={{
          filter: hasSoot
            ? [RISK_FILTER[riskLevel] === 'none' ? '' : RISK_FILTER[riskLevel], 'sepia(0.3)', 'saturate(0.7)', 'brightness(0.92)'].filter(Boolean).join(' ')
            : RISK_FILTER[riskLevel],
        }}
      >
        <LeveledLayer url={grassUrl} kind="grass" zIndex={1} />

        {/* [ข้อกำหนดข้อ 4] หญ้า/ดอกไม้มีมิติ ซ้อนทับภาพพื้นหญ้าเดิม */}
        <GroundScene grassSoilLevel={grassSoilLevel} seedKey={`${folder}-ground`} />

        <LeveledLayer url={trunkUrl} kind="trunk" zIndex={2} />

        <div className="tree-of-life__foliage" style={{ zIndex: 3 }} aria-hidden="true">
          {leafStamps.map((s) => (
            <img
              key={s.key} src={s.url} alt="" className="tree-of-life__stamp tree-of-life__stamp--leaf"
              style={{ left: `${s.leftPct}%`, top: `${s.topPct}%`, width: `${s.scale * 100}%`, transform: `translate(-50%, -50%) rotate(${s.rotationDeg}deg)`, animationDelay: reducedMotion ? '0ms' : `${s.delayMs}ms` }}
            />
          ))}
        </div>

        <div className="tree-of-life__foliage" style={{ zIndex: 4 }} aria-hidden="true">
          {flowerStamps.map((s) => (
            <img
              key={s.key} src={s.url} alt="" className="tree-of-life__stamp tree-of-life__stamp--flower"
              style={{ left: `${s.leftPct}%`, top: `${s.topPct}%`, width: `${s.scale * 100}%`, transform: `translate(-50%, -50%) rotate(${s.rotationDeg}deg)`, animationDelay: reducedMotion ? '0ms' : `${s.delayMs + 150}ms` }}
            />
          ))}
        </div>
      </div>

      {/* [ใหม่] Growth Pulse — "เควสสำเร็จ ต้นไม้ต้องรับผลชัดเจนทันที" ไม่ใช่แค่เลข level
          ขยับเงียบๆ — burst แสง + ประกายไฟกระจายออกจากทรงพุ่ม สีเปลี่ยนตามหมวดเควสที่เพิ่งทำ
          (ความรู้=ทอง/น้ำตาล เรืองที่ลำต้น, จิตใจ=ชมพู/ม่วง เรืองที่ดอกไม้, สุขภาพ=เขียวมรกต
          เรืองที่พื้นดิน) เล่นแล้วหายไปเองใน 1.8s ผ่าน useEffect ด้านบน */}
      {activePulse && (
        <div className={`tree-of-life__growth-pulse tree-of-life__growth-pulse--${activePulse.category.toLowerCase()}`} aria-hidden="true">
          <div className="tree-of-life__growth-pulse-rays" />
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={`${activePulse.key}-${i}`}
              className="tree-of-life__growth-pulse-spark"
              style={{ '--spark-angle': `${(360 / 10) * i}deg`, animationDelay: `${i * 30}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* [ใหม่] ควันจางๆ ลอยขึ้นจากคราบหมอง — โผล่เฉพาะตอน hasSoot (จากเควสเตาเผาขยะความคิด
          ที่ยังไม่ทำสำเร็จ) หายไปเองทันทีที่ hasSoot กลับเป็น false */}
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

      {/* [ข้อกำหนดข้อ 3] ไอเทมตกแต่งลากวางอิสระได้ */}
      <DecorationLayer
        placedItems={placedItems}
        decorationPositions={decorationPositions}
        onDecorationMove={onDecorationMove}
        containerRef={rootRef}
      />

      {showHint && (
        <div
          className="tree-of-life__hint-hotspot"
          onMouseEnter={() => setHintVisible(true)}
          onMouseLeave={() => setHintVisible(false)}
          onClick={(e) => { e.stopPropagation(); setHintVisible((v) => !v) }}
          title="ดูรายละเอียดการเติบโตของต้นไม้"
        >
          {hintVisible && (
            <div className="tree-of-life__tooltip">
              <div className="tree-of-life__tooltip-title">🌳 {folder}</div>
              <div>🪵 ลำต้น/กิ่ง (ความรู้): Lv.{trunkBranchLevel}</div>
              <div>🌸 ใบ/ดอก (จิตใจ): Lv.{leafFlowerLevel} · ปั๊ม {leafStamps.length + flowerStamps.length} จุด</div>
              <div>🌱 หญ้า/ราก (สุขภาพ): Lv.{grassSoilLevel}</div>
              {riskLevel !== 'LOW' && (
                <div className="tree-of-life__tooltip-warn">⚠️ สุขภาพต้นไม้: {riskLevel === 'HIGH' ? 'เหี่ยวมาก' : 'เริ่มซีด'}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface LeveledLayerProps {
  url: string | null
  kind: 'trunk' | 'grass'
  zIndex: number
}

function LeveledLayer({ url, kind, zIndex }: LeveledLayerProps) {
  // [แก้] รีเซ็ต errored ระหว่าง render ทันทีที่ url เปลี่ยน แทนการใช้ effect
  // (react-hooks/set-state-in-effect) — เป็นแพทเทิร์น "ปรับ state เมื่อ prop เปลี่ยน"
  const [prevUrl, setPrevUrl] = useState(url)
  const [errored, setErrored] = useState(false)
  if (url !== prevUrl) {
    setPrevUrl(url)
    setErrored(false)
  }

  if (!url || errored) {
    return (
      <div className="tree-of-life__layer tree-of-life__layer--placeholder" style={{ zIndex }} aria-hidden="true">
        {kind === 'trunk' && '🌱'}
      </div>
    )
  }

  return (
    <img
      key={url} src={url} alt="" aria-hidden="true"
      className={`tree-of-life__layer tree-of-life__layer--${kind}`}
      style={{ zIndex }}
      onError={() => setErrored(true)}
    />
  )
}

interface DecorationLayerProps {
  placedItems: PlacedItem[]
  decorationPositions: DecorationPositionMap
  onDecorationMove?: (itemId: string, xPct: number, yPct: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * DecorationLayer — [ข้อกำหนดข้อ 3] ไอเทมตกแต่งลากวางอิสระ
 * ระหว่างลาก เก็บพิกัด "preview" ไว้ใน local state ของ component นี้เอง (ไม่ยิง
 * onDecorationMove ทุกเฟรมที่ลาก เพราะจะ re-render ต้นไม้ทั้งต้นถี่เกินจำเป็น) แล้วค่อยยิง
 * onDecorationMove ครั้งเดียวตอนปล่อยนิ้ว/เมาส์ (pointerup) ให้ AppContext เซฟค่าจริง
 */
function DecorationLayer({ placedItems, decorationPositions, onDecorationMove, containerRef }: DecorationLayerProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [previewPos, setPreviewPos] = useState<{ xPct: number; yPct: number } | null>(null)

  const getEffectivePosition = (item: PlacedItem): { left: string; top: string } => {
    if (draggingId === item.itemId && previewPos) {
      return { left: `${previewPos.xPct}%`, top: `${previewPos.yPct}%` }
    }
    const custom = decorationPositions[item.itemId]
    if (custom) return { left: `${custom.xPct}%`, top: `${custom.yPct}%` }
    const zonePos = DECORATION_ZONE_POSITION[item.zone]
    return zonePos
  }

  const clampPct = (v: number) => Math.min(96, Math.max(4, v))

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

  return (
    <>
      <div className={`tree-of-life__drop-zone-hint ${draggingId ? 'tree-of-life__drop-zone-hint--visible' : ''}`} />
      <div className="tree-of-life__decorations" aria-hidden="true">
        {placedItems.map((item) => {
          const pos = getEffectivePosition(item)
          const isDraggable = !!onDecorationMove
          const isDragging = draggingId === item.itemId
          return (
            <span
              key={item.itemId}
              className={`tree-of-life__decoration-item ${isDraggable ? 'tree-of-life__decoration-item--draggable' : ''} ${isDragging ? 'tree-of-life__decoration-item--dragging' : ''}`}
              style={{ left: pos.left, top: pos.top }}
              title={isDraggable ? `${item.itemId} — ลากเพื่อจัดวางใหม่` : item.itemId}
              onPointerDown={(e) => handlePointerDown(e, item.itemId)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <DecorationVisual itemId={item.itemId} />
            </span>
          )
        })}
      </div>
    </>
  )
}

/*============================================================================*\
  DecorationVisual — [ใหม่] แสดงไอเทมตกแต่งเป็นภาพจริงถ้ามีไฟล์ ถ้ายังไม่มีใช้ emoji แทน
  ────────────────────────────────────────────────────────────────────────────
  ออกแบบให้ทยอยเปลี่ยนไปใช้อาร์ตจริงได้ทีละชิ้น: วางไฟล์ที่
  public/assets/images/decorations/<itemId>.webp แล้วรีเฟรช — เท่านั้น
  ไม่ต้องแก้โค้ดไฟล์ไหนเลย และไอเทมที่ยังไม่มีภาพก็ไม่พังตาม
\*============================================================================*/
function DecorationVisual({ itemId }: { itemId: string }) {
  const [failed, setFailed] = useState(false)
  const emoji = DECORATION_EMOJI[itemId] ?? '⭐'

  if (failed) return <span className="tree-of-life__decoration-emoji">{emoji}</span>

  return (
    <img
      src={getDecorationImage(itemId)}
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