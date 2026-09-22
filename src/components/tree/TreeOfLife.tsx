import { memo, useMemo, useRef, useState, useEffect, type PointerEvent as ReactPointerEvent } from 'react'
import type { MbtiType, RiskLevel, PlacedItem, DecorationPositionMap, QuestCategory } from '../../types'
import { DECORATION_EMOJI, DECORATION_ZONE_POSITION } from '../../config/decorationItems'
import { ITEM_ICONS } from '../../config/iconAssets'
import { useIsSmallScreen, usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import { getCanopyShape, sampleCanopyPoint, type CanopyShape } from '../../config/canopyShape'
import {
  getTrunkImagePath, getLeafImagePath, getGroundImagePath,
  toTrunkVisualLevel, getLeafPool, toGroundVariant, getShapeLetter,
} from '../../config/treeAssets'
import { LEAF_ANCHORS } from '../../config/leafAnchors'
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
 *  5. ไอเทมตกแต่งใช้ไฟล์ภาพจริงจาก ITEM_ICONS (config/iconAssets.ts) — จุดเดียวกับที่
 *     ShopSection.tsx/ProfilePage.tsx ใช้อยู่แล้ว โดยยังมี emoji เป็นตัวสำรองสำหรับชิ้น
 *     ที่ยังไม่มีไฟล์ภาพจริงให้ (ดู DecorationVisual ด้านล่าง)
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

function findLeveledAsset(folder: string, prefix: 'trunk', level: number): string | null {
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
  canopyShape: CanopyShape
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

/** [ใหม่ — ตามที่ระบุรอบนี้ "ทำลำต้นให้เล็กลง"] ย่อภาพลำต้นด้วย CSS scale() (ดู
 *  .tree-of-life__layer--trunk ใน .css ที่อ่านค่านี้ผ่าน CSS var --trunk-visual-scale)
 *  โดย pivot ที่ 50% 100% (กึ่งกลาง-ล่างสุด) ให้โคนต้น/รากยังแนบขอบล่างเดิมเป๊ะ ไม่ขยับ
 *  ตำแหน่ง มีแต่ตัวลำต้นที่หดเข้าหาจุดนั้น — ทรงพุ่ม (canopy) ต้องหดตามสัดส่วนเดียวกันด้วย
 *  ไม่งั้นใบ/ดอกจะลอยห่างจากลำต้นที่เล็กลงไปแล้ว (ดู scaleCanopyTowardTrunkBase ด้านล่าง) */
const TRUNK_VISUAL_SCALE = 0.6

/** หด CanopyShape เข้าหาจุดหมุนเดียวกับที่ลำต้นหด (กึ่งกลางแนวนอน x=centerXPct เดิม,
 *  ขอบล่างสุด y=100%) ด้วยอัตราส่วนเดียวกัน — topPct/bottomPct คือระยะจากขอบบนของกล่อง จึง
 *  ต้องคำนวณกลับจาก "ระยะห่างจากขอบล่าง (100 - pct)" คูณ scale ก่อนแปลงกลับ ส่วนความกว้าง
 *  (topWidthPct/baseWidthPct) คูณ scale ตรงๆ ได้เลยเพราะ centerXPct คือจุดหมุนแนวนอนอยู่แล้ว */
function scaleCanopyTowardTrunkBase(shape: CanopyShape, scale: number): CanopyShape {
  return {
    centerXPct: shape.centerXPct,
    topPct: 100 - (100 - shape.topPct) * scale,
    bottomPct: 100 - (100 - shape.bottomPct) * scale,
    topWidthPct: shape.topWidthPct * scale,
    baseWidthPct: shape.baseWidthPct * scale,
  }
}

/* [เขียนใหม่ทั้งบล็อกตามที่ระบุรอบนี้] ยกเลิกระบบวางใบทั้งหมดที่ทำมาก่อนหน้านี้ — ทั้ง
 * tip-detection/skeletonize (scripts/extract-branch-tips.mjs), random-in-circle scatter
 * (scripts/extract-canopy-tip.mjs + canopyTipPoints.ts) และ "ภาพใบก้อนใหญ่ก้อนเดียวต่อ
 * trunk level" (leaf-transforms.json/leafTransforms.ts รอบก่อนหน้า) ทั้งหมดยังเก็บไฟล์ไว้
 * เฉยๆ ไม่ลบทิ้งตามธรรมเนียมที่ยึดมาตลอด แค่เลิกเรียกใช้ในไฟล์นี้แล้ว
 *
 * แทนที่ด้วยวิธีใหม่: "หลายจุดยึด (anchor) x หลายสำเนาภาพใบขนาดเล็ก" — หาจุดยึดหลายจุดทั่ว
 * โครงกิ่งของ trunk แต่ละ shape+level ไว้ล่วงหน้า (scripts/compute-leaf-transform.mjs →
 * src/config/leafAnchors.ts) แล้ววาง "สำเนาเล็กๆ" ของภาพ LeafCanopy เดียวกันซ้อนที่แต่ละจุด
 * ยึด (ขนาด/หมุน/ไหวสุ่มเล็กน้อยต่อชิ้นที่ runtime) แทนภาพก้อนใหญ่ก้อนเดียว — แก้ปัญหาที่
 * ภาพก้อนเดียวไม่ว่าปรับ K/offset เท่าไหร่ก็ยังดู "เป็นลูกบอลกลมแข็งๆ ติดปลายไม้เสียบ" ไม่ใช่
 * ใบไม้กระจายตามกิ่งแบบต้นไม้จริง */
interface ImageNaturalSize {
  w: number
  h: number
}

interface ContainerSize {
  w: number
  h: number
}

/** [สำคัญ] แปลงพิกัด % ของ "ภาพต้นฉบับ" (ของลำต้น) ให้เป็น % ของกล่อง .tree-of-life โดยจำลอง
 *  object-fit:contain + object-position:center bottom (CSS ของ .tree-of-life__layer) บวก
 *  transform:scale จุดหมุน 50% 100% (CSS ของ .tree-of-life__layer--trunk) ทีละขั้นตรงตาม
 *  สูตร CSS จริง — ตอนนี้ใช้แปลง "มุมกล่องสำเนาใบเล็กแต่ละชิ้น" (จาก LEAF_ANCHORS ซึ่งเป็น
 *  พิกเซลบน canvas เดียวกับภาพ trunk) แทนจุดปลายกิ่งเดี่ยวๆ/กล่องใบก้อนใหญ่แบบเดิม (ดู
 *  computeInstanceRect ด้านล่าง) */
function mapImagePointToContainerPct(
  point: { x: number; y: number },
  imgSize: ImageNaturalSize,
  containerSize: ContainerSize,
  trunkScale: number,
): { xPct: number; yPct: number } {
  const containerAspect = containerSize.w / containerSize.h
  const imgAspect = imgSize.w / imgSize.h

  let renderedW: number
  let renderedH: number
  let offsetX: number
  let offsetY: number

  if (imgAspect > containerAspect) {
    // ภาพกว้างกว่ากล่อง (เทียบสัดส่วน) → contain ด้วยความกว้างเต็มกล่อง เหลือช่องว่างบน/ล่าง
    renderedW = containerSize.w
    renderedH = renderedW / imgAspect
    offsetX = 0
    offsetY = containerSize.h - renderedH // object-position: bottom → ชิดขอบล่าง
  } else {
    // ภาพสูงกว่ากล่อง (เทียบสัดส่วน) → contain ด้วยความสูงเต็มกล่อง เหลือช่องว่างซ้าย/ขวา
    renderedH = containerSize.h
    renderedW = renderedH * imgAspect
    offsetY = 0
    offsetX = (containerSize.w - renderedW) / 2 // object-position: center → กึ่งกลางแนวนอน
  }

  const preScaleX = offsetX + (point.x / 100) * renderedW
  const preScaleY = offsetY + (point.y / 100) * renderedH

  // transform-origin: 50% 100% ของกล่องเต็ม (ไม่ใช่ของ contain-box) — ดู .tree-of-life__layer--trunk
  const pivotX = containerSize.w / 2
  const pivotY = containerSize.h

  const postScaleX = pivotX + (preScaleX - pivotX) * trunkScale
  const postScaleY = pivotY + (preScaleY - pivotY) * trunkScale

  return {
    xPct: (postScaleX / containerSize.w) * 100,
    yPct: (postScaleY / containerSize.h) * 100,
  }
}

/** ขนาดไฟล์ต้นฉบับของภาพ LeafCanopy ทุกไฟล์ (435×435 พิกเซล เท่ากันทั้ง 32 ไฟล์ — ตรวจสอบ
 *  แล้วตอนรัน scripts/compute-leaf-transform.mjs) ใช้แปลงเป็นขนาดจริงตอนคำนวณกล่องใบแต่ละชิ้น
 *  ด้านล่าง ไม่ต้องรอ onLoad วัดขนาดจริงแบบภาพลำต้น (ทุกไฟล์คงที่แล้ว) */
const LEAF_NATIVE_SIZE_PX = 435

/** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 2] ขนาดเป้าหมายของ "สำเนาใบเล็ก" 1 ชิ้น บน canvas ต้นฉบับ
 *  432px ของภาพ trunk (~25% ของความกว้าง canvas ที่ level ต่ำ-กลาง) — เล็กลงมากจากภาพก้อนใหญ่
 *  ก้อนเดียวรอบก่อนที่ทำให้ดูเป็น "ลูกบอลติดปลายไม้เสียบ" ตอนนี้วางกระจายหลายชิ้นเล็กๆ ตาม
 *  จุดยึดแทน
 *
 * [แก้ระหว่างตรวจ preview จริง — ขั้นตอน 4] level 7-8 ยังดูมีช่องว่างระหว่างกลุ่มใบเยอะเกินไป
 * (ดูไม่ "ครึ้มเต็มต้น" ตามที่ระบุ) ทั้งที่ใช้ anchor ครบทุกจุดแล้ว — เพิ่มขนาดต่อชิ้นขึ้นเล็กน้อย
 * เฉพาะ level สูง (จุดยึดที่มีอยู่ไม่พอเติมช่องว่างด้วยจำนวนอย่างเดียว ต้องให้แต่ละชิ้นกว้างขึ้น
 * ด้วยเพื่อให้ชนกัน/คาบเกี่ยวกันปิดช่องว่างระหว่างกิ่ง) level 1-5 คงค่าเดิมไว้ (ดูสวยแล้วจาก
 * preview จริง ไม่ต้องแตะ) */
function baseTargetWidthForLevel(visualLevel: number): number {
  if (visualLevel <= 5) return 110
  if (visualLevel === 6) return 125
  if (visualLevel === 7) return 145
  return 160 // level 8
}

interface LeafInstanceRect {
  leftPct: number
  topPct: number
  widthPct: number
  heightPct: number
}

interface LeafInstance extends LeafInstanceRect {
  key: string
  /** จุดหมุนสำหรับ sway — ขอบบนกึ่งกลางของ instance (ใกล้กิ่ง/anchor ที่สุด) ไม่ใช่ center
   *  ของภาพ ให้ดูเหมือนใบแกว่งจากจุดที่ติดกับกิ่งจริง (ดูคอมเมนต์ข้อ 3 ที่จุดเรียกใช้) */
  originXPct: number
  originYPct: number
  rotationDeg: number
  swayAmpDeg: number
  swayDurationS: number
  swayDelayS: number
  mountDelayMs: number
}

/** คำนวณกล่อง (ตำแหน่ง+ขนาด เป็น % ของกล่อง .tree-of-life) ของ "สำเนาใบเล็ก" 1 ชิ้นที่มี
 *  จุดศูนย์กลางตรงกับ anchor point พอดี (ตามสูตรที่ระบุ: pasteX = ax - scaledW/2) — แปลงมุม
 *  บนซ้าย/ล่างขวาของกล่อง (หลัง scale) จาก % ของภาพ trunk ผ่าน mapImagePointToContainerPct
 *  เหมือนที่ระบบภาพก้อนใหญ่รอบก่อนทำ (ดูคอมเมนต์ฟังก์ชันนั้นในรอบก่อน — logic เดิมทุกประการ
 *  แค่เปลี่ยนมาคำนวณต่อ "จุดยึด" แทนที่จะเป็นกล่องเดียวของทั้งต้น) */
function computeInstanceRect(
  anchor: { x: number; y: number },
  scaledSizePx: number,
  imgSize: ImageNaturalSize,
  containerSize: ContainerSize,
  trunkScale: number,
): LeafInstanceRect {
  const halfPx = scaledSizePx / 2
  const topLeftImgPct = { x: ((anchor.x - halfPx) / imgSize.w) * 100, y: ((anchor.y - halfPx) / imgSize.h) * 100 }
  const bottomRightImgPct = { x: ((anchor.x + halfPx) / imgSize.w) * 100, y: ((anchor.y + halfPx) / imgSize.h) * 100 }

  const topLeft = mapImagePointToContainerPct(topLeftImgPct, imgSize, containerSize, trunkScale)
  const bottomRight = mapImagePointToContainerPct(bottomRightImgPct, imgSize, containerSize, trunkScale)

  return {
    leftPct: topLeft.xPct,
    topPct: topLeft.yPct,
    widthPct: bottomRight.xPct - topLeft.xPct,
    heightPct: bottomRight.yPct - topLeft.yPct,
  }
}

/** [แก้ระหว่างตรวจ preview จริง — ขั้นตอน 4] สเปกเดิมบอกให้ "เรียง anchor ตาม y (จุดสูงสุด/
 *  เด่นสุดก่อน) แล้ว slice" ตรงๆ — แต่ทดสอบจริงแล้วพัง: ถ้าจุดที่ y น้อยที่สุด 2-3 จุดแรก
 *  ดันอยู่ฝั่งเดียวกันหมด (เช่น shape A level 3 มีจุดกิ่งขวาสูงกว่าซ้ายทั้งคู่) การ slice ตาม y
 *  ล้วนๆ จะได้ใบกระจุกอยู่ข้างเดียว ทิ้งอีกฝั่งของกิ่งให้โล่งเปล่าไม่มีใบเลยแม้จะมี anchor
 *  รออยู่ก็ตาม (เห็นชัดจาก preview จริง) แก้โดยเรียงแบบ "สลับฝั่งซ้าย-ขวา" แทน: แบ่งจุดเป็น 2
 *  ฝั่งตามเส้นกึ่งกลางของกลุ่ม anchor ทั้งหมด แต่ละฝั่งเรียงตาม y (บนสุดก่อน) ในตัวเอง แล้ว
 *  สลับหยิบทีละฝั่ง (เริ่มจากฝั่งที่มีจุดสูงสุดโดยรวมก่อน) — ทำให้ทุก prefix length (ตั้งแต่
 *  slice 2 จุดขึ้นไป) มีตัวแทนทั้งสองฝั่งเสมอ ไม่กระจุกข้างเดียว ในขณะที่ยังคงหลักการ "จุดเด่น/
 *  สูงสุดมาก่อน" ตามที่ระบุไว้เดิมทุกประการ (แค่แยกพิจารณาเป็น 2 คิวย่อยแทนคิวเดียว) */
function buildBalancedAnchorOrder(anchors: { x: number; y: number }[]): { x: number; y: number }[] {
  if (anchors.length === 0) return []
  const xs = anchors.map((a) => a.x)
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  const left = anchors.filter((a) => a.x < centerX).sort((a, b) => a.y - b.y)
  const right = anchors.filter((a) => a.x >= centerX).sort((a, b) => a.y - b.y)

  const ordered: { x: number; y: number }[] = []
  let li = 0
  let ri = 0
  let takeLeftNext = (left[0]?.y ?? Infinity) <= (right[0]?.y ?? Infinity)
  while (li < left.length || ri < right.length) {
    if (takeLeftNext && li < left.length) {
      ordered.push(left[li++])
      takeLeftNext = false
    } else if (ri < right.length) {
      ordered.push(right[ri++])
      takeLeftNext = true
    } else if (li < left.length) {
      ordered.push(left[li++])
    }
  }
  return ordered
}

/** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 2] จำนวน anchor point ที่ "ใช้จริง" ต่อ trunkVisualLevel —
 *  slice จาก buildBalancedAnchorOrder (จุดเด่น/สูงสุดก่อน แต่กระจายซ้าย-ขวาเสมอ — ดูหมายเหตุ
 *  ด้านบน) level ต่ำใช้แค่ 2-3 จุดบนสุด (ใบเพิ่งขึ้นครั้งแรก บางสมเหตุสมผล) level สูงใช้ครบ
 *  ทุกจุดที่ตรวจเจอ */
function anchorUsageCountForLevel(visualLevel: number, totalAnchors: number): number {
  if (visualLevel <= 3) return Math.min(2, totalAnchors)
  if (visualLevel === 4) return Math.min(3, totalAnchors)
  if (visualLevel === 5) return Math.min(4, totalAnchors)
  if (visualLevel === 6) return Math.min(5, totalAnchors)
  return totalAnchors // 7-8 ใช้ครบทุกจุดที่มี
}

/** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 2] วางสำเนาใบเล็กที่แต่ละจุดยึด (LEAF_ANCHORS ของ shape+level
 *  นี้) — ระดับสูงสุด (8) เพิ่มความหนาแน่นด้วยการวาง 2 ชิ้นซ้อนกันต่อจุดยึด 1 จุด ตามที่ระบุ
 *  ทุกอย่าง (ขนาด/หมุน/sway amplitude/duration/delay) สุ่มด้วย seed เดียวกันทุกครั้งที่ level/
 *  shape เดิม (deterministic ต่อ user เหมือนระบบก่อนหน้าทุกตัว) ไม่สุ่มใหม่ทุก re-render */
function generateLeafAnchorInstances(
  seedKey: string,
  shapeLetter: string,
  visualLevel: number,
  imgSize: ImageNaturalSize,
  containerSize: ContainerSize,
  trunkScale: number,
): LeafInstance[] {
  const allAnchors = LEAF_ANCHORS[`${shapeLetter}-lv${visualLevel}`] ?? []
  if (allAnchors.length === 0) return []

  const balancedOrder = buildBalancedAnchorOrder(allAnchors)
  const useCount = anchorUsageCountForLevel(visualLevel, balancedOrder.length)
  const usedAnchors = balancedOrder.slice(0, useCount)
  const doubleUp = visualLevel >= 8

  const baseTargetWidthPx = baseTargetWidthForLevel(visualLevel)
  const rng = seededRandom(seedKey)
  const instances: LeafInstance[] = []
  let i = 0
  for (const anchor of usedAnchors) {
    const copies = doubleUp ? 2 : 1
    for (let c = 0; c < copies; c++) {
      const sizeScale = (baseTargetWidthPx / LEAF_NATIVE_SIZE_PX) * (0.8 + rng() * 0.35)
      const scaledSizePx = LEAF_NATIVE_SIZE_PX * sizeScale
      // [แก้ระหว่างตรวจ preview จริง] สำเนาที่ 2 ของ anchor เดียวกัน (doubleUp ที่ level 8)
      // ขยับเล็กน้อยแบบสุ่ม (±18px บน canvas 432 ต้นฉบับ) แทนที่จะซ้อนตำแหน่งเป๊ะกับชิ้นแรก —
      // ไม่งั้นจะบังกันเองเกือบสนิท ไม่ช่วยปิดช่องว่างระหว่างกิ่งเลยตามที่ตั้งใจ ("เพิ่มความ
      // หนาแน่น" ต้องกระจายพื้นที่ครอบคลุมเพิ่ม ไม่ใช่แค่ซ้อนสีเข้มขึ้นตรงจุดเดิม)
      const jitteredAnchor = c === 0
        ? anchor
        : { x: anchor.x + (rng() - 0.5) * 36, y: anchor.y + (rng() - 0.5) * 36 }
      const rect = computeInstanceRect(jitteredAnchor, scaledSizePx, imgSize, containerSize, trunkScale)

      instances.push({
        key: `leaf-${seedKey}-${i}`,
        ...rect,
        originXPct: rect.leftPct + rect.widthPct / 2,
        originYPct: rect.topPct,
        rotationDeg: (rng() - 0.5) * 30, // -15..15deg
        swayAmpDeg: 1.5 + rng() * 0.5, // 1.5-2deg (เล็กมาก ตามที่ระบุ)
        swayDurationS: 4 + rng() * 3, // 4-7s
        swayDelayS: rng() * 4,
        mountDelayMs: i * 30,
      })
      i++
    }
  }

  return instances
}

/** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 5] ตอน "dying" (ไม่ได้เล่นเควสหมวดจิตใจมานาน) ลด opacity ของ
 *  เลเยอร์ใบทั้งหมดลงมา ให้ความรู้สึก "ใบร่วงไปเยอะ บางลง" แบบง่ายๆ (คงพฤติกรรมเดิมจากรอบก่อน
 *  ไว้ — ไม่เปลี่ยน แค่ตอนนี้ครอบสำเนาใบเล็กหลายชิ้นแทนภาพก้อนเดียว) */
const LEAF_DYING_OPACITY = 0.25

/* [ใหม่ — ตามที่ระบุรอบนี้ "ดินและหญ้าต้องวางซ้อนๆกันตั้งแต่รากไปยังข้างล่าง ActionMenuBar
 * เต็มตลอดแนวยาวหลายๆก้อน"] เดิม ground ใช้ภาพวงกลมดินเดี่ยวๆ ภาพเดียว (LeveledLayer) —
 * เปลี่ยนมาใช้ pattern เดียวกับใบ/ดอก (stamp ซ้ำหลายชิ้นตำแหน่งสุ่มแบบ deterministic) แทน
 * เพื่อปั๊มภาพดิน/หญ้าเดียวกันซ้ำเป็นก้อนเล็กๆ หลายก้อนเรียงคาบเกี่ยวกันเต็มความกว้างจอ
 * ในแถบตั้งแต่โคนต้น (ประมาณ 78%) ลงไปจนถึงขอบล่างสุด (97%) ซึ่งเป็นแถบเดียวกับที่
 * ActionMenuBar ลอยอยู่ (position:fixed เต็มจอเดียวกับ .tree-of-life) */
interface GroundClump {
  key: string
  leftPct: number
  topPct: number
  scale: number
  rotationDeg: number
  delayMs: number
}

/* [แก้ตามที่ระบุรอบนี้ — "ดินต้องคงขนาดเท่าเดิมนะ"] แก้บั๊กก้อนดินใหญ่เกินจริง (ดู
 * groundClumpBasePx ใน component) ด้วยการอิงขนาดจากความสูงกล่องแทนความกว้าง — ทำให้แต่ละ
 * ก้อน "เล็กลง" กว่าเดิมมาก (จากที่เคยบวมจนล้นจอ) จึงเพิ่มจำนวนก้อนขึ้นชดเชย (~1.85 เท่า)
 * เพื่อให้ "พื้นที่รวมที่ดินปกคลุม" (ความต่อเนื่อง/ความหนาแน่นของแถบดินทั้งแนว) ยังเท่าเดิม
 * ไม่ใช่ดูบางลง แค่แต่ละก้อนไม่บวมจนล้นเฟรมเหมือนก่อน */
const GROUND_CLUMP_COUNT_DESKTOP = 26
const GROUND_CLUMP_COUNT_MOBILE = 16
const GROUND_BAND_TOP_PCT = 78
const GROUND_BAND_BOTTOM_PCT = 97

function generateGroundClumps(seedKey: string, count: number): GroundClump[] {
  const rng = seededRandom(seedKey)
  const clumps: GroundClump[] = []

  for (let i = 0; i < count; i++) {
    const slotCenterPct = ((i + 0.5) / count) * 100
    // jitter แคบกว่าช่องของตัวเอง (0.6 เท่า) — ทำให้ก้อนเรียงชิดกันสม่ำเสมอตลอดแนว ไม่มีช่วง
    // ห่างผิดปกติแบบสุ่มเต็มช่วง (ตอนแรกใช้ 1.4 เท่าแล้วบางเคสมีช่องว่างตรงกลางให้เห็น) รวมกับ
    // ขนาดก้อนที่กว้างกว่าระยะห่างของ slot มาก (baseSizePct 32% ต่อ slot ~7%) ก้อนข้างเคียงจึง
    // คาบเกี่ยว/ซ้อนกันแน่นอนทุกจุดตลอดความกว้างจอ ("เต็มตลอดแนวยาว" ตามที่ระบุ)
    const jitterPct = (rng() - 0.5) * (100 / count) * 0.6
    clumps.push({
      key: `ground-${seedKey}-${i}`,
      leftPct: Math.min(99, Math.max(1, slotCenterPct + jitterPct)),
      topPct: GROUND_BAND_TOP_PCT + rng() * (GROUND_BAND_BOTTOM_PCT - GROUND_BAND_TOP_PCT),
      scale: 0.8 + rng() * 0.5,
      rotationDeg: (rng() - 0.5) * 14,
      delayMs: i * 35,
    })
  }

  // เรียงตาม topPct: ก้อนที่อยู่สูงกว่า (ไกลกว่า) วาดก่อน ก้อนที่อยู่ต่ำกว่า (ใกล้ผู้ดูกว่า) วาดทับทีหลัง
  return clumps.sort((a, b) => a.topPct - b.topPct)
}

const RISK_FILTER: Record<RiskLevel, string> = {
  LOW: 'none',
  MODERATE: 'saturate(0.55) brightness(0.97) contrast(0.96)',
  HIGH: 'grayscale(0.85) sepia(0.25) brightness(0.85) contrast(0.92)',
}

/* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 3+4] "state overlay" (healthy/wilting/dying) — ไม่เคยมีระบบนี้
 * มาก่อนจริงๆ (ตรวจโค้ดจริงแล้ว ไม่ใช่แค่ riskLevel/hasSoot/daysSinceLastOracle ที่มีอยู่
 * ซึ่งผูกกับเควสเฉพาะจุดคนละเรื่อง) — สร้างใหม่ทั้งหมด ผูกกับ "จำนวนวันที่ไม่ได้ทำเควสสำเร็จ
 * ในหมวดนั้นๆ ล่าสุด" (คำนวณจริงจาก questLogs ใน Dashboard.tsx ส่งเป็น prop เข้ามา
 * เหมือน daysSinceLastOracle เดิม) N=5 เริ่ม wilting, N=10 เริ่ม dying ตามที่ระบุ
 * ใบไม้ผูกกับหมวดจิตใจ (EMOTION), พื้นดิน/หญ้าผูกกับหมวดสุขภาพกาย (HEALTH) ตามที่ระบุ */
type HealthPhase = 'healthy' | 'wilting' | 'dying'

function toHealthPhase(daysSinceLastQuest: number | null): HealthPhase {
  if (daysSinceLastQuest === null) return 'healthy'
  if (daysSinceLastQuest >= 10) return 'dying'
  if (daysSinceLastQuest >= 5) return 'wilting'
  return 'healthy'
}

/** ใบไม้ไล่สีเขียว→เหลือง/น้ำตาลอ่อนตอน wilting, เข้มขึ้นตอน dying — transition หลายวินาที
 *  (ดู .tree-of-life__leaf-layer ใน .css) ให้ความรู้สึก "ค่อยๆ เหี่ยว" ไม่ใช่เปลี่ยนทันที */
const LEAF_HEALTH_FILTER: Record<HealthPhase, string> = {
  healthy: 'none',
  wilting: 'sepia(0.45) saturate(0.7) hue-rotate(-12deg) brightness(0.97)',
  dying: 'sepia(0.7) saturate(0.45) hue-rotate(-20deg) brightness(0.88)',
}

/** หญ้า (ground variant 2) ไล่สีเหลือง/น้ำตาลแห้งแบบเดียวกับใบตอน decay ก่อนจะจางหายไป
 *  (ลด opacity — ดู groundVariant2Opacity ใน component) */
const GRASS_HEALTH_FILTER: Record<HealthPhase, string> = {
  healthy: 'none',
  wilting: 'sepia(0.5) saturate(0.65) hue-rotate(-10deg)',
  dying: 'sepia(0.75) saturate(0.4) hue-rotate(-18deg) brightness(0.85)',
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
  /** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 4] จำนวนวันตั้งแต่ทำเควสหมวด "จิตใจ" (EMOTION) สำเร็จ
   *  ล่าสุด (คำนวณจาก questLogs จริงใน Dashboard.tsx เหมือน daysSinceLastOracle) — N=5 ใบ
   *  เริ่มเหี่ยว (wilting), N=10 ใบเริ่มร่วง (dying) null = ไม่มีข้อมูล/ยังไม่เคยทำ → ถือว่า
   *  healthy (ไม่ลงโทษผู้เล่นใหม่ที่ยังไม่มีประวัติ) */
  daysSinceLastMentalQuest?: number | null
  /** [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 3] เหมือนกันแต่ผูกกับหมวด "สุขภาพกาย" (HEALTH) — คุมการ
   *  จางหาย/เปลี่ยนสีของหญ้า (ground variant 2/3) แทนใบ */
  daysSinceLastPhysicalQuest?: number | null
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
  daysSinceLastMentalQuest = null,
  daysSinceLastPhysicalQuest = null,
  showHint = true,
  className,
}: TreeOfLifeProps) {
  const preferredFolder: TreeAssetFolder = mbtiType ?? 'BALANCED'
  const { folder } = useMemo(() => resolveFolder(preferredFolder), [preferredFolder])
  const canopyShape = useMemo(() => getCanopyShape(mbtiType), [mbtiType])

  /* [ใหม่ — ตามที่ระบุรอบนี้] ทรงพุ่มที่ใบ/ดอกใช้จริงต้องหดตามลำต้นที่เล็กลง (ดู
     TRUNK_VISUAL_SCALE ด้านบน) ไม่งั้นใบ/ดอกจะลอยห่างจากลำต้นเล็กที่หดแล้ว */
  const scaledCanopyShape = useMemo(
    () => scaleCanopyTowardTrunkBase(canopyShape, TRUNK_VISUAL_SCALE),
    [canopyShape],
  )

  /* [เขียนใหม่ตามที่ระบุรอบนี้ ข้อ 1] เลิกใช้สูตร progressive เดิม (toVisualLevel) เปลี่ยนเป็น
     ตาราง fix ตามที่ระบุเป๊ะผ่าน toTrunkVisualLevel — trunkBranchLevel ที่ได้มาคือ "เกมเลเวล"
     ที่คำนวณจาก knowledgeStack ไว้แล้วที่ UserContext.tsx (ดูคอมเมนต์ยาวใน treeAssets.ts) */
  const visualLevel = useMemo(() => toTrunkVisualLevel(trunkBranchLevel), [trunkBranchLevel])
  const shapeTrunkUrl = useMemo(() => getTrunkImagePath(mbtiType, visualLevel), [mbtiType, visualLevel])

  const trunkUrl = useMemo(() => findLeveledAsset(folder, 'trunk', trunkBranchLevel), [folder, trunkBranchLevel])

  /* ใบไม่ผูกกับ emotionStack อีกต่อไป ผูกกับ "เกมเลเวลเดียวกับ trunk" ตรงๆ (trunkBranchLevel
     ตัวเดียวกับที่ป้อน toTrunkVisualLevel ด้านบน) — getLeafPool คืน null ก่อนเกมเลเวล 21
     (trunk lv1-2 ยังไม่มีใบเลยตามที่ระบุ) */
  const leafPool = useMemo(() => getLeafPool(trunkBranchLevel), [trunkBranchLevel])

  /* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 4] ใบเหี่ยว/ร่วงตามจำนวนวันที่ไม่ได้ทำเควสหมวดจิตใจ */
  const leafHealthPhase = useMemo(() => toHealthPhase(daysSinceLastMentalQuest), [daysSinceLastMentalQuest])

  /* [เขียนใหม่ตามที่ระบุรอบนี้ ข้อ 3] พื้นดิน — เลิกใช้ getGroundImagePath เดี่ยวๆ (สลับภาพ
     ตาม variant เดียว) เปลี่ยนเป็นผสม 3 variant ซ้อนกัน: variant 1 คือ "ฐาน" เต็มพื้นที่เสมอ
     ไม่มีเงื่อนไข, variant 2/3 คือ patch หญ้า/ดอกหญ้าซ้อนทับด้วย opacity เพิ่มตาม
     healthVisualLevel (เดิมเรียก groundVariant — เปลี่ยนชื่อให้ตรงความหมายใหม่ที่ไม่ใช่
     "เลือก 1 ใน 3" แล้ว แต่เป็น "ระดับผสม 1-3" ของทั้ง 3 ชั้นพร้อมกัน) */
  const groundHealthVisualLevel = useMemo(() => toGroundVariant(grassSoilLevel), [grassSoilLevel])
  const groundVariant1Url = useMemo(() => getGroundImagePath(1), [])
  const groundVariant2Url = useMemo(() => getGroundImagePath(2), [])
  const groundVariant3Url = useMemo(() => getGroundImagePath(3), [])

  /* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 3] Decay ย้อนกลับของหญ้า — ผูกกับจำนวนวันที่ไม่ได้ทำเควส
     หมวดสุขภาพกาย (คนละหมวดกับใบซึ่งผูกหมวดจิตใจ) */
  const groundHealthPhase = useMemo(() => toHealthPhase(daysSinceLastPhysicalQuest), [daysSinceLastPhysicalQuest])

  /* target opacity ตาม healthVisualLevel (1: มีแค่ฐาน, 2: หญ้าเริ่มขึ้น, 3: หญ้า+ดอกหญ้าเต็ม)
     คูณด้วย decay multiplier (wilting ลดลงครึ่งหนึ่ง, dying จางจนเกือบหมด) — ค่อยๆ นุ่มนวล
     ด้วย CSS transition บน opacity/filter ที่ container (ดู render ด้านล่าง) ไม่กระตุก */
  const groundDecayMultiplier = groundHealthPhase === 'dying' ? 0.08 : groundHealthPhase === 'wilting' ? 0.55 : 1
  const groundVariant2TargetOpacity = groundHealthVisualLevel === 1 ? 0 : groundHealthVisualLevel === 2 ? 0.55 : 1
  const groundVariant3TargetOpacity = groundHealthVisualLevel === 3 ? 0.65 : 0
  const groundVariant2Opacity = groundVariant2TargetOpacity * groundDecayMultiplier
  const groundVariant3Opacity = groundVariant3TargetOpacity * groundDecayMultiplier

  const flowerBrushUrls = useMemo(() => findBrushVariants(folder, 'flower_brush'), [folder])

  /* [ใหม่] เพดานจำนวนดอกตามขนาดจอ — เรื่องจำนวน DOM node ต้องตัดสินใจใน JS
     ไม่ใช่ซ่อนด้วย CSS (ซ่อนด้วย CSS = สร้าง element ครบแล้วค่อยซ่อน
     ซึ่งจ่ายค่า layout/paint ไปแล้วเรียบร้อย) */
  const isSmallScreen = useIsSmallScreen()
  const reducedMotion = usePrefersReducedMotion()
  const maxFlowers = isSmallScreen ? 6 : 14

  const flowerStampCount = Math.min(maxFlowers, Math.round((leafFlowerLevel / 100) * 14))

  const flowerStamps = useMemo(
    () => generateFoliageStamps({ seedKey: `${folder}-flower-${leafFlowerLevel}`, brushUrls: flowerBrushUrls, count: flowerStampCount, canopyShape: scaledCanopyShape, baseSizePct: 9, keyPrefix: 'flower' }),
    [folder, leafFlowerLevel, flowerBrushUrls, flowerStampCount, scaledCanopyShape],
  )

  /* [แก้ตามที่ระบุรอบนี้] จำนวนก้อนดิน/หญ้าตามขนาดจอ — seed ผูกกับ folder เท่านั้น (ไม่ผูกกับ
     healthVisualLevel/variant อีกต่อไป เพราะตอนนี้ทั้ง 3 variant ใช้ตำแหน่ง "ชุดเดียวกัน"
     ซ้อนทับกันเป๊ะเสมอ — เปลี่ยนแค่ opacity ต่อ variant ไม่ใช่สลับตำแหน่งไปมา) */
  const groundClumpCount = isSmallScreen ? GROUND_CLUMP_COUNT_MOBILE : GROUND_CLUMP_COUNT_DESKTOP
  const groundClumps = useMemo(
    () => generateGroundClumps(`${folder}-ground`, groundClumpCount),
    [folder, groundClumpCount],
  )

  const [hintVisible, setHintVisible] = useState(false)
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

  /* [ใหม่ — ตามที่ระบุรอบนี้] ขนาดจริง (naturalWidth/Height) ของไฟล์ภาพลำต้นที่โหลดสำเร็จ
     ล่าสุด — จำเป็นสำหรับสูตร object-fit:contain เช่นกัน อัปเดตผ่าน callback ที่ TrunkLayer
     เรียกตอน <img onLoad> (ดู TrunkLayer ด้านล่าง) */
  const [trunkNaturalSize, setTrunkNaturalSize] = useState<ImageNaturalSize | null>(null)

  /* [เขียนใหม่ตามที่ระบุรอบนี้] สำเนาใบเล็กหลายชิ้นที่แต่ละจุดยึด (LEAF_ANCHORS ของ shape+
     level นี้ — ค่าคงที่ baked ไว้แล้ว ไม่ต้อง fetch) ต้องรอ containerSize/trunkNaturalSize
     พร้อมก่อนเหมือนระบบเดิม — array ว่างถ้า leafPool ยังไม่มี (เกมเลเวล ≤20 ยังไม่มีใบเลย
     ตามตารางเดิมที่ไม่เปลี่ยน) seed ผูกกับ folder+visualLevel เดียวกับที่ระบบเดิมใช้เสมอมา */
  const shapeLetter = useMemo(() => getShapeLetter(mbtiType), [mbtiType])
  const leafInstances = useMemo(() => {
    if (!containerSize || !trunkNaturalSize || !leafPool) return []
    return generateLeafAnchorInstances(
      `${folder}-leaf-anchors-${visualLevel}`, shapeLetter, visualLevel,
      trunkNaturalSize, containerSize, TRUNK_VISUAL_SCALE,
    )
  }, [containerSize, trunkNaturalSize, leafPool, folder, shapeLetter, visualLevel])

  /* ไฟล์ใบเดียวกันทุกสำเนา (ตามที่ระบุ — ไม่มีเลเยอร์คละสี/สุ่มไฟล์แยกอีกต่อไปในระบบ
     multi-anchor นี้ ความหลากหลายมาจากขนาด/มุมหมุน/จังหวะไหวที่สุ่มต่อชิ้นแทน) */
  const primaryLeafUrl = useMemo(() => getLeafImagePath(mbtiType, visualLevel), [mbtiType, visualLevel])

  /* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 5] สายลมพัดเป็นระยะ — สุ่มช่วงเวลา 15-30s ไม่ตายตัว ทุกครั้ง
     ที่ถึงกำหนด toggle class เอฟเฟกต์ไหวแรงชั่วคราว ~2.5s แล้วกลับสู่ปกติ ไม่ sync กับ state
     ไหนเป็นพิเศษ (ปิดทั้งหมดถ้า reducedMotion) */
  const [windGusting, setWindGusting] = useState(false)
  useEffect(() => {
    if (reducedMotion) return
    let gustTimeoutId: number
    let scheduleTimeoutId: number
    const scheduleNextGust = () => {
      const delay = 15000 + Math.random() * 15000
      scheduleTimeoutId = window.setTimeout(() => {
        setWindGusting(true)
        gustTimeoutId = window.setTimeout(() => {
          setWindGusting(false)
          scheduleNextGust()
        }, 2500)
      }, delay)
    }
    scheduleNextGust()
    return () => {
      window.clearTimeout(scheduleTimeoutId)
      window.clearTimeout(gustTimeoutId)
    }
  }, [reducedMotion])

  /* [แก้ตามที่ระบุรอบนี้ ข้อ 2 — root cause จริงของ "ดินจางๆ/ฝั่งซ้ายไม่มีดิน"] เดิมกำหนด
     ขนาดก้อนดินเป็น "% ของความกว้างกล่อง" (`${scale*32}%`) แล้วปล่อย height:auto ตามสัดส่วน
     ภาพจริง (ground_variant_*.png เป็นภาพเกือบสี่เหลี่ยมจัตุรัส 435×435) — บนจอกว้าง (เช่น
     2304px) 32% ของความกว้างกลายเป็นก้อนดิน ~750px ทั้งกว้างและสูง (เพราะภาพสี่เหลี่ยมจัตุรัส)
     ใหญ่กว่าแถบพื้นที่ตั้งใจไว้ (GROUND_BAND สูงแค่ ~19% ของความสูงกล่อง) หลายเท่า ทำให้ก้อน
     ดินส่วนใหญ่ยื่นล้นพ้นขอบบน/ล่างของ viewport ที่มองเห็นจริงไป เห็นแค่บางส่วนที่โผล่พ้นขอบ
     แบบสุ่มๆ ตามตำแหน่ง (ดูเหมือน "จาง"/"ขาดไปฝั่งหนึ่ง" ทั้งที่จริงคือก้อนใหญ่เกินจนโดนตัดขอบ)
     แก้โดยคำนวณขนาดเป็น "px ตรงๆ" อิงจากความสูงกล่อง (ซึ่งสอดคล้องกับความสูงของ GROUND_BAND
     ที่ตั้งใจไว้จริง) แทนการอิงความกว้างกล่องที่ไม่เกี่ยวกับแถบพื้นที่นี้เลย */
  const groundClumpBasePx = containerSize ? containerSize.h * 0.22 : 0

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
          '--trunk-visual-scale': TRUNK_VISUAL_SCALE,
        } as React.CSSProperties}
      >
        {/* [เขียนใหม่ตามที่ระบุรอบนี้ ข้อ 3] variant 1 = ฐานเต็มพื้นที่เสมอ ไม่มีเงื่อนไข
            ("ปั๊ม" ตำแหน่งเดียวกับ variant 2/3 ด้านล่างเป๊ะ ให้ 3 ชั้นซ้อนทับตรงกันพอดี) */}
        <div className="tree-of-life__foliage" style={{ zIndex: 1 }} aria-hidden="true">
          {groundClumps.map((c, i) => (
            <img
              key={c.key} src={groundVariant1Url} alt=""
              className="tree-of-life__stamp tree-of-life__stamp--ground"
              style={{
                left: `${c.leftPct}%`,
                top: `${c.topPct}%`,
                width: `${c.scale * groundClumpBasePx}px`,
                transform: `translate(-50%, -50%) rotate(${c.rotationDeg}deg)`,
                animationDelay: reducedMotion ? '0ms' : `${c.delayMs}ms`,
                zIndex: i,
              }}
            />
          ))}
        </div>

        {/* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 3] variant 2 (หญ้าเริ่มขึ้น) — opacity/filter ทั้งชั้น
            คุมที่ container เดียว (ไม่ใช่ต่อก้อน) transition นุ่มนวลตอนเปลี่ยน
            healthVisualLevel หรือตอน decay/ฟื้นตัว ไม่กระตุก */}
        <div
          className="tree-of-life__foliage tree-of-life__ground-overlay"
          style={{ zIndex: 1, opacity: groundVariant2Opacity, filter: GRASS_HEALTH_FILTER[groundHealthPhase] }}
          aria-hidden="true"
        >
          {groundClumps.map((c, i) => (
            <img
              key={c.key} src={groundVariant2Url} alt=""
              className="tree-of-life__stamp tree-of-life__stamp--ground"
              style={{
                left: `${c.leftPct}%`,
                top: `${c.topPct}%`,
                width: `${c.scale * groundClumpBasePx}px`,
                transform: `translate(-50%, -50%) rotate(${c.rotationDeg}deg)`,
                animationDelay: reducedMotion ? '0ms' : `${c.delayMs}ms`,
                zIndex: i,
              }}
            />
          ))}
        </div>

        {/* [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 3] variant 3 (ดอกหญ้าแซม) — โผล่เฉพาะ healthVisualLevel
            สูงสุด (3) เท่านั้น ก่อน decay multiplier เดียวกับ variant 2 */}
        <div
          className="tree-of-life__foliage tree-of-life__ground-overlay"
          style={{ zIndex: 1, opacity: groundVariant3Opacity }}
          aria-hidden="true"
        >
          {groundClumps.map((c, i) => (
            <img
              key={c.key} src={groundVariant3Url} alt=""
              className="tree-of-life__stamp tree-of-life__stamp--ground"
              style={{
                left: `${c.leftPct}%`,
                top: `${c.topPct}%`,
                width: `${c.scale * groundClumpBasePx}px`,
                transform: `translate(-50%, -50%) rotate(${c.rotationDeg}deg)`,
                animationDelay: reducedMotion ? '0ms' : `${c.delayMs}ms`,
                zIndex: i,
              }}
            />
          ))}
        </div>

        {/* [ข้อกำหนดข้อ 4] หญ้า/ดอกไม้มีมิติ ซ้อนทับภาพพื้นหญ้าเดิม */}
        <GroundScene grassSoilLevel={grassSoilLevel} seedKey={`${folder}-ground`} />

        <TrunkLayer
          primaryUrl={shapeTrunkUrl}
          fallbackUrl={trunkUrl}
          zIndex={2}
          onNaturalSize={setTrunkNaturalSize}
        />

        {/* [เขียนใหม่ทั้งบล็อกตามที่ระบุรอบนี้] วางสำเนาภาพ LeafCanopy ขนาดเล็กหลายชิ้นที่แต่ละ
            จุดยึด (leafInstances — คำนวณจาก LEAF_ANCHORS ที่ทำ offline ไว้แล้ว ดู
            generateLeafAnchorInstances) แทนภาพก้อนใหญ่ก้อนเดียวรอบก่อน — 1 <div> ครอบ = 1
            สำเนาใบ ตั้ง transform-origin ไปที่ "ขอบบนกึ่งกลาง" ของสำเนานั้น (ใกล้กิ่ง/anchor
            ที่สุด ไม่ใช่ center ของภาพ) ให้ไหวเหมือนแกว่งจากจุดที่ติดกิ่งจริง แต่ละชิ้นไหวอิสระ
            ต่อกัน (amplitude/duration/delay สุ่มต่อชิ้น) แทนที่จะไหวทั้งก้อนพร้อมกันแบบเดิม
            (ต้นเหตุที่ดูเหมือน "ลูกบอลติดไม้เสียบส่ายไปมา")

            [ใหม่] key ต่อชิ้นผูกกับ folder+visualLevel (จาก generateLeafAnchorInstances) —
            เลเวลเปลี่ยน = จุดยึด/จำนวนชิ้นเปลี่ยนทั้งชุด ทุกชิ้นจึง remount+เล่น bloom ใหม่พร้อม
            กัน (cross-fade ตามที่ระบุไว้แต่เดิม) ใบเก่าที่ mount ค้างอยู่แล้วไม่ขยับตำแหน่งเอง
            [คงเดิมจากรอบก่อน] leafHealthPhase==='dying' → ลด opacity ของทั้งเลเยอร์ (ครอบทุก
            สำเนา) แทนการเล่น fall animation ทีละใบ
            [แก้ตามที่ระบุรอบนี้ ข้อ 3] windGusting → เพิ่ม amplitude ของทุกชิ้นพร้อมกันชั่วคราว
            ผ่านการสลับชื่อ keyframe sway (เหมือนเดิม ไม่ใช่ effect ที่ทำงานตลอดเวลา) */}
        <div
          className="tree-of-life__leaf-layer"
          style={{
            filter: LEAF_HEALTH_FILTER[leafHealthPhase],
            opacity: leafHealthPhase === 'dying' ? LEAF_DYING_OPACITY : 1,
          }}
        >
          {leafInstances.map((leaf) => (
            <div
              key={leaf.key}
              className={[
                'tree-of-life__leaf-group',
                windGusting ? 'tree-of-life__leaf-group--gust' : '',
              ].filter(Boolean).join(' ')}
              style={{
                zIndex: 3,
                transformOrigin: `${leaf.originXPct}% ${leaf.originYPct}%`,
                '--sway-amp': `${leaf.swayAmpDeg}deg`,
                animationDuration: `0.5s, ${leaf.swayDurationS}s`,
                animationDelay: reducedMotion ? '0ms, 0s' : `${leaf.mountDelayMs}ms, ${leaf.swayDelayS}s`,
              } as React.CSSProperties}
              aria-hidden="true"
            >
              <img
                src={primaryLeafUrl} alt=""
                className="tree-of-life__stamp tree-of-life__stamp--leaf"
                style={{
                  left: `${leaf.leftPct}%`,
                  top: `${leaf.topPct}%`,
                  width: `${leaf.widthPct}%`,
                  height: `${leaf.heightPct}%`,
                  transform: `rotate(${leaf.rotationDeg}deg)`,
                }}
              />
            </div>
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
              <div>🪵 ลำต้น/ใบ (ความรู้): Lv.{trunkBranchLevel} (ภาพ {visualLevel}/8){leafInstances.length > 0 ? ` · ใบ ${leafInstances.length} ชิ้น` : ' · ยังไม่มีใบ'}</div>
              <div>🌸 ดอก (จิตใจ): Lv.{leafFlowerLevel} · ดอกปั๊ม {flowerStamps.length} จุด</div>
              <div>🌱 หญ้า/ราก (สุขภาพ): Lv.{grassSoilLevel} (ผสม {groundHealthVisualLevel}/3)</div>
              {leafHealthPhase !== 'healthy' && (
                <div className="tree-of-life__tooltip-warn">🍂 ใบ: {leafHealthPhase === 'dying' ? 'กำลังร่วง' : 'เริ่มเหี่ยว'}</div>
              )}
              {groundHealthPhase !== 'healthy' && (
                <div className="tree-of-life__tooltip-warn">🌾 หญ้า: {groundHealthPhase === 'dying' ? 'แห้งเกือบหมด' : 'เริ่มแห้ง'}</div>
              )}
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

interface TrunkLayerProps {
  /** ชุดภาพใหม่ (shape-based ตาม MBTI/visual level — ดู treeAssets.ts) ลองก่อนเสมอ */
  primaryUrl: string
  /** ชุดภาพเก่า (src/assets/trees/<MBTI>/trunk_lvl{N}.*) — ใช้ก็ต่อเมื่อ primaryUrl โหลด
   *  ไม่ขึ้นเท่านั้น (shape ที่ยังไม่มี asset จริง) */
  fallbackUrl: string | null
  zIndex: number
  /** [ใหม่ — ตามที่ระบุรอบนี้] แจ้งขนาดจริง (naturalWidth/Height) ของไฟล์ภาพที่โหลดสำเร็จ
   *  กลับขึ้นไปให้ parent ใช้แปลงพิกัด branch-tip (ดู mapImagePointToContainerPct) */
  onNaturalSize?: (size: ImageNaturalSize) => void
}

/*============================================================================*\
  TrunkLayer — [ใหม่] เรนเดอร์ลำต้นจากชุดภาพใหม่ (shape-based) เป็นหลัก มี fallback 2 ชั้น:
  primaryUrl (ชุดใหม่) โหลดไม่ขึ้น → fallbackUrl (ชุดเก่า) → ไม่มีทั้งคู่ → placeholder 🌱
  (เช็คจาก onError จริง ไม่ใช่เดาว่าไฟล์มีไหม กันโชว์ broken image)

  ใช้ key={resolvedUrl} ให้ <img> ถูก remount ทุกครั้งที่ level/MBTI เปลี่ยนจน src เปลี่ยนจริง
  แล้วปล่อยให้ CSS animation ของ .tree-of-life__layer--trunk (TreeOfLife.css) เล่น fade เข้า
  เอง — ไม่ใช้ framer-motion AnimatePresence เพราะ pattern "key เปลี่ยน + CSS @keyframes
  เล่นตอน mount" นี้มีอยู่แล้วในระบบ (ground/leaf/flower ใช้ pattern เดียวกันผ่าน .tree-of-life__stamp)
  เรียบง่าย/สอดคล้องกับโค้ดเดิมกว่า — เฉพาะ trunk ปรับความยาวเป็น 0.4s ตามที่ระบุ (300-500ms)
  ส่วนขนาดภาพลำต้น (ตามที่ระบุรอบนี้ "ทำลำต้นให้เล็กลง") ย่อด้วย transform: scale() ผ่าน
  CSS var --trunk-visual-scale (ดู .tree-of-life__layer--trunk ใน .css) ไม่ใช่ปรับที่นี่
\*============================================================================*/
function TrunkLayer({ primaryUrl, fallbackUrl, zIndex, onNaturalSize }: TrunkLayerProps) {
  const [prevPrimaryUrl, setPrevPrimaryUrl] = useState(primaryUrl)
  const [primaryFailed, setPrimaryFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)
  if (primaryUrl !== prevPrimaryUrl) {
    setPrevPrimaryUrl(primaryUrl)
    setPrimaryFailed(false)
    setFallbackFailed(false)
  }

  const resolvedUrl = !primaryFailed ? primaryUrl : (!fallbackFailed ? fallbackUrl : null)

  if (!resolvedUrl) {
    return (
      <div className="tree-of-life__layer tree-of-life__layer--placeholder" style={{ zIndex }} aria-hidden="true">
        🌱
      </div>
    )
  }

  return (
    <img
      key={resolvedUrl} src={resolvedUrl} alt="" aria-hidden="true"
      className="tree-of-life__layer tree-of-life__layer--trunk"
      style={{ zIndex }}
      onLoad={(e) => onNaturalSize?.({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      onError={() => {
        if (!primaryFailed) setPrimaryFailed(true)
        else setFallbackFailed(true)
      }}
    />
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