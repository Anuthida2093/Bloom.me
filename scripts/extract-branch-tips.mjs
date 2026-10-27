// scripts/extract-branch-tips.mjs
//
// [ใหม่ — สคริปต์รันครั้งเดียว offline ตอน asset เพิ่ม/เปลี่ยน ไม่ผูกกับ runtime ของแอปเลย]
// ตรวจจับ "ปลายกิ่งจริง" จากภาพลำต้น (tree_<letter>_trunk_lv<N>.png ทั้ง 32 ไฟล์: 4 shape
// letter A-D x 8 level) แล้วบันทึกพิกัด % เป็น JSON ต่อไฟล์ ไว้ให้ generateLeafInstances
// ใน TreeOfLife.tsx อ่านไปวางกลุ่มใบจริงบนปลายกิ่งจริง แทนการสุ่มในกรอบวงรีที่ไม่ผูกกับ
// อาร์ตเวิร์กจริงของแต่ละ shape/level (ปัญหาเดิม: ใบบางใบลอยไปไกลจากลำต้น ไม่มีกิ่งรองรับ)
//
// วิธีทำ (ทั้งหมดทำงานบน pixel/alpha channel จริง ไม่มีการเดา):
//   1. อ่าน PNG (มี alpha channel จริง — ตรวจยืนยันแล้วก่อนหน้านี้) → binary mask
//      (alpha > ALPHA_THRESHOLD = พิกเซลของต้นไม้)
//   2. ตัด noise: เก็บเฉพาะ "connected component ที่ใหญ่ที่สุด" (ตัวลำต้น/กิ่งจริงต้องเป็น
//      รูปทรงเดียวที่เชื่อมกันทั้งหมด — จุดสีเล็กๆ ที่หลุดออกมาจาก anti-aliasing/artifact
//      จะเป็นก้อนแยกเล็กๆ ที่ไม่เชื่อมกับก้อนหลัก ตัดทิ้งทั้งหมด)
//   3. Zhang-Suen thinning algorithm (thinning มาตรฐาน implement เองตรงๆ ไม่มี npm package
//      ไหนเบาพอสำหรับงานนี้) → เหลือ skeleton เส้น 1 พิกเซลกว้าง
//   4. หา endpoint (skeleton pixel ที่มีเพื่อนบ้าน skeleton แค่ 1 จุดใน 8-neighbourhood)
//   5. กรองจุดที่อยู่ใน 20% ล่างของภาพทิ้ง (รากที่โคนต้น ไม่ใช่ปลายกิ่งที่ต้องการติดใบ)
//   6. แปลง pixel → % ของขนาดภาพ บันทึกเป็น JSON
//
// รัน: node scripts/extract-branch-tips.mjs

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')

// ต้องตรงกับ TRUNK_ROOT_FOLDER/TRUNK_SUFFIX ใน src/config/treeAssets.ts เป๊ะ (ที่อยู่ไฟล์จริง
// บนดิสก์ — ยังไม่ได้ rename เป็นชื่อสุดท้าย ดูคอมเมนต์หัวไฟล์นั้นสำหรับรายละเอียด)
const TRUNK_ROOT_FOLDER = 'ส่วนที่ 1 Trunk Layer (8 Level) — Shape A'
const TRUNK_SUFFIX = { A: '10001', B: '10002', C: '10003', D: '10004' }
const SHAPE_LETTERS = ['A', 'B', 'C', 'D']
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]

const OUTPUT_DIR = path.join(ROOT_DIR, 'public/assets/images/tree/branch-tips')

/** พิกเซลนับเป็น "ต้นไม้" ถ้า alpha > ค่านี้ (0-255) — ปรับได้ถ้าไฟล์ไหนตรวจแล้วจำนวน
 *  endpoint ผิดปกติ (ดูคำเตือนท้าย log) */
const ALPHA_THRESHOLD = 40

/** ตัด endpoint ที่อยู่ใน 20% ล่างของภาพทิ้ง (ราก ไม่ใช่ปลายกิ่ง) ตามที่ระบุ */
const ROOT_CUTOFF_RATIO = 0.8

/** connected component (กลุ่มพิกเซลต้นไม้ที่เชื่อมกัน) ที่เล็กกว่าค่านี้ (px) ถือเป็น noise/
 *  artifact ตัดทิ้งก่อน skeletonize เสมอ — ลำต้นจริงต้องเป็นก้อนเดียวที่ใหญ่กว่านี้มาก */
const MIN_COMPONENT_SIZE_PX = 40

function round1(n) {
  return Math.round(n * 10) / 10
}

/** สร้าง binary mask (Uint8Array ยาว width*height, 1 = พิกเซลต้นไม้) จาก raw RGBA buffer */
function buildAlphaMask(data, width, height, channels) {
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3]
      mask[y * width + x] = alpha > ALPHA_THRESHOLD ? 1 : 0
    }
  }
  return mask
}

/** หา connected component ทั้งหมด (8-connectivity) แล้วเหลือไว้แค่ก้อนที่ใหญ่ที่สุด
 *  (ตัวลำต้น/กิ่งจริงต้องเชื่อมกันเป็นก้อนเดียว — ก้อนเล็กๆ ที่แยกออกมาคือ noise) */
function keepLargestComponent(mask, width, height) {
  const visited = new Uint8Array(width * height)
  let bestComponent = null
  let bestSize = 0

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue

    const component = [start]
    visited[start] = 1
    const stack = [start]

    while (stack.length > 0) {
      const cur = stack.pop()
      const cx = cur % width
      const cy = (cur - cx) / width

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const nIdx = ny * width + nx
          if (mask[nIdx] && !visited[nIdx]) {
            visited[nIdx] = 1
            stack.push(nIdx)
            component.push(nIdx)
          }
        }
      }
    }

    if (component.length > bestSize) {
      bestSize = component.length
      bestComponent = component
    }
  }

  const cleaned = new Uint8Array(width * height)
  if (bestComponent && bestSize >= MIN_COMPONENT_SIZE_PX) {
    for (const idx of bestComponent) cleaned[idx] = 1
  }
  return cleaned
}

/** Zhang-Suen thinning — thinning algorithm มาตรฐานสำหรับลด binary mask ให้เหลือ skeleton
 *  เส้น 1 พิกเซลกว้าง วนทำ 2 sub-iteration สลับกันจนไม่มีพิกเซลไหนถูกลบอีก */
function zhangSuenThinning(mask, width, height) {
  const img = Uint8Array.from(mask)
  const at = (x, y) => (x < 0 || x >= width || y < 0 || y >= height ? 0 : img[y * width + x])

  let changed = true
  while (changed) {
    changed = false

    for (const step of [1, 2]) {
      const toDelete = []
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (!at(x, y)) continue

          const p2 = at(x, y - 1)
          const p3 = at(x + 1, y - 1)
          const p4 = at(x + 1, y)
          const p5 = at(x + 1, y + 1)
          const p6 = at(x, y + 1)
          const p7 = at(x - 1, y + 1)
          const p8 = at(x - 1, y)
          const p9 = at(x - 1, y - 1)
          const ring = [p2, p3, p4, p5, p6, p7, p8, p9]

          const B = ring.reduce((a, b) => a + b, 0)
          if (B < 2 || B > 6) continue

          let A = 0
          for (let i = 0; i < 8; i++) {
            if (ring[i] === 0 && ring[(i + 1) % 8] === 1) A++
          }
          if (A !== 1) continue

          if (step === 1) {
            if (p2 * p4 * p6 !== 0) continue
            if (p4 * p6 * p8 !== 0) continue
          } else {
            if (p2 * p4 * p8 !== 0) continue
            if (p2 * p6 * p8 !== 0) continue
          }

          toDelete.push(y * width + x)
        }
      }

      if (toDelete.length > 0) {
        changed = true
        for (const idx of toDelete) img[idx] = 0
      }
    }
  }

  return img
}

/** endpoint ของ skeleton = พิกเซล skeleton ที่มีเพื่อนบ้าน skeleton แค่ 1 จุด (8-neighbourhood)
 *  — คือปลายสุดของเส้น (ปลายกิ่งบน หรือปลายรากล่าง ก่อนกรองรากทิ้งในขั้นถัดไป) */
function findEndpoints(skeleton, width, height) {
  const at = (x, y) => (x < 0 || x >= width || y < 0 || y >= height ? 0 : skeleton[y * width + x])
  const points = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!at(x, y)) continue
      let neighborCount = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          if (at(x + dx, y + dy)) neighborCount++
        }
      }
      if (neighborCount === 1) points.push({ x, y })
    }
  }

  return points
}

/** [ข้อ 1a — ใหม่ตามที่ระบุรอบนี้] จุดศูนย์กลางแนวนอน "จริง" ของลำต้น — ใช้ centroid ของ
 *  พิกเซลต้นไม้ทั้งก้อน (ไม่ใช่เดา 50% ของ canvas เฉยๆ) เพราะอาร์ตเวิร์กบางไฟล์ไม่ได้วาด
 *  กึ่งกลาง canvas เป๊ะ (เช่น ลำต้นเอนไปด้านใดด้านหนึ่ง) */
function computeMaskCentroidX(mask, width, height) {
  let sumX = 0
  let count = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        sumX += x
        count++
      }
    }
  }
  return count > 0 ? sumX / count : width / 2
}

/** ต่างกันไม่เกินนี้ถือว่าสมดุลพอแล้ว ("~15%" ตามที่ระบุ) */
const BALANCE_TOLERANCE_RATIO = 0.15

/** [ข้อ 1a] ทำให้จำนวนจุดฝั่งซ้าย/ขวาของ centerX ใกล้เคียงกัน — mirror จุดจากฝั่งที่เยอะกว่า
 *  ไปเติมฝั่งที่ขาด (x' = 2*centerX - x, y คงเดิม) จนต่างกันไม่เกิน BALANCE_TOLERANCE_RATIO
 *  เรียงจุดต้นทางตาม y ก่อน mirror เพื่อให้จุดที่เพิ่มกระจายทั่วทรงพุ่ม ไม่กระจุกจุดเดียว */
function balanceLeftRight(points, centerX) {
  const left = points.filter((p) => p.x < centerX)
  const right = points.filter((p) => p.x >= centerX)
  if (left.length === 0 && right.length === 0) return { points: [...points], mirroredCount: 0 }

  const leftIsMajor = left.length >= right.length
  const majorSide = leftIsMajor ? left : right
  const minorSide = leftIsMajor ? right : left
  if (majorSide.length === 0) return { points: [...points], mirroredCount: 0 }

  const imbalance = (majorSide.length - minorSide.length) / majorSide.length
  if (imbalance <= BALANCE_TOLERANCE_RATIO) return { points: [...points], mirroredCount: 0 }

  const needed = Math.max(0, Math.ceil(majorSide.length - minorSide.length - BALANCE_TOLERANCE_RATIO * majorSide.length))
  const sortedMajor = [...majorSide].sort((a, b) => a.y - b.y)

  const mirrored = []
  for (let i = 0; i < needed; i++) {
    const src = sortedMajor[i % sortedMajor.length]
    mirrored.push({ x: 2 * centerX - src.x, y: src.y, mirrored: true })
  }

  return { points: [...points, ...mirrored], mirroredCount: mirrored.length }
}

/** [ข้อ 1b — ใหม่ตามที่ระบุรอบนี้] จุดเสริมเรขาคณิตทรงวงรี/สามเหลี่ยมมนล้อมรอบ "ยอดบนสุด"
 *  ของลำต้น (apex) — ไล่เป็นวง (ring) จากยอดลงมาถึงโคนพุ่ม ความกว้างแต่ละวงขยายแบบ sqrt(t)
 *  (โค้งมนแบบวงรี ไม่ใช่เส้นตรงแบบสามเหลี่ยมแข็งๆ) ให้ภาพรวมทรงพุ่มดูกลมมนสมส่วนเสมอ แม้กิ่ง
 *  จริงจะกระจายตัวไม่สม่ำเสมอก็ตาม — จุดเหล่านี้เป็นแค่ "ตัวเติมเต็ม" ผสมกับ tip จริง ไม่ใช่
 *  จุดยึดหลัก (ต้องผ่าน filterConnectedPoints ก่อนถึงจะรอด เหมือนจุดอื่นทุกจุด) */
function generateGeometricFillerPoints(apexX, apexY, canopyBottomY, centerX, maxTipSpread) {
  const RING_COUNT = 4
  const POINTS_PER_RING = 7
  const points = []
  const canopyHeight = Math.max(1, canopyBottomY - apexY)
  // [แก้ตามที่ระบุรอบนี้ — ทรงวงรีต้องล้อม "ทรงกิ่งจริง" ไม่ใช่ทรงตายตัวแยกกันคนละเรื่อง]
  // เดิมกว้างสุดของวงรี = canopyHeight*0.5 ซึ่งไม่เกี่ยวอะไรกับความกว้างจริงของกิ่งเลย — ต้น
  // เล็ก/เรียว (canopy สูงแต่กิ่งแผ่ไม่กว้าง) จะได้วงรีกว้างเกินจริง จุดเสริมชั้นนอกลอยห่างจาก
  // กิ่งที่มองเห็นจริงชัดเจน แก้โดยอิงความกว้างสุดจาก "กิ่งจริงที่ตรวจเจอจริง" (maxTipSpread)
  // แทน คูณ 1.15 ให้กว้างกว่ากิ่งจริงเล็กน้อยพอดูเป็นทรงพุ่มเต็ม ไม่ใช่กว้างเวอร์
  const maxHalfWidth = Math.max(canopyHeight * 0.18, maxTipSpread * 1.15)

  for (let ring = 1; ring <= RING_COUNT; ring++) {
    const t = ring / RING_COUNT
    const y = apexY + t * canopyHeight
    const halfWidth = Math.sqrt(t) * maxHalfWidth
    const pointsInRing = Math.max(3, Math.round(POINTS_PER_RING * t))
    for (let i = 0; i < pointsInRing; i++) {
      const angleT = pointsInRing === 1 ? 0.5 : i / (pointsInRing - 1)
      const x = centerX - halfWidth + angleT * halfWidth * 2
      points.push({ x, y, filler: true })
    }
  }

  return points
}

/** [ข้อ 1c — ใหม่ตามที่ระบุรอบนี้] รัศมี "สัมผัส/เกย" ระหว่างจุด — ระยะห่างศูนย์กลางไม่เกินนี้
 *  ถือว่าเชื่อมกัน (% ของความกว้างภาพ แปลงเป็น px ต่อไฟล์เพราะแต่ละไฟล์ขนาดไม่เท่ากัน) —
 *  ปรับตัวเลขนี้จนภาพรวมดูเป็นทรงพุ่มต่อเนื่อง ไม่มีรูโหว่/จุดลอยเดี่ยว (ดูผลจริงในสรุปท้าย) */
const OVERLAP_RADIUS_PCT_OF_WIDTH = 16

/** ดึงรายการพิกเซล skeleton ทั้งหมดเป็น {x,y} array (ใช้เป็น "ตัวแทนลำต้น/กิ่งจริง" สำหรับ
 *  เช็คระยะ "สัมผัสลำต้นโดยตรง" ในขั้น filterConnectedPoints) */
function extractSkeletonPoints(skeleton, width, height) {
  const points = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (skeleton[y * width + x]) points.push({ x, y })
    }
  }
  return points
}

/** [ข้อ 1c] ตัดจุดที่ "ลอยเดี่ยว" ออก — เก็บเฉพาะจุดที่ (ก) อยู่ในรัศมีจากลำต้น/กิ่งจริง
 *  (skeleton) โดยตรง หรือ (ข) อยู่ในรัศมีจากจุดอื่นที่เชื่อมกลับไปถึงลำต้นในที่สุด (flood-fill
 *  แบบ fixed-point iteration) — จุดที่เหลือ (ไม่เข้าเงื่อนไขไหนเลย) คือจุดลอยเดี่ยว ตัดทิ้ง */
function filterConnectedPoints(points, skeletonPoints, overlapRadiusPx) {
  const n = points.length
  if (n === 0) return { points: [], droppedCount: 0 }

  const connected = new Array(n).fill(false)
  const radiusSq = overlapRadiusPx * overlapRadiusPx
  const distSq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

  for (let i = 0; i < n; i++) {
    for (const sp of skeletonPoints) {
      if (distSq(points[i], sp) <= radiusSq) {
        connected[i] = true
        break
      }
    }
  }

  let changed = true
  while (changed) {
    changed = false
    for (let i = 0; i < n; i++) {
      if (connected[i]) continue
      for (let j = 0; j < n; j++) {
        if (!connected[j] || i === j) continue
        if (distSq(points[i], points[j]) <= radiusSq) {
          connected[i] = true
          changed = true
          break
        }
      }
    }
  }

  const kept = points.filter((_, i) => connected[i])
  return { points: kept, droppedCount: n - kept.length }
}

async function processTrunkFile(letter, level) {
  const suffix = TRUNK_SUFFIX[letter]
  const filePath = path.join(
    ROOT_DIR,
    'public/assets/images/tree',
    TRUNK_ROOT_FOLDER,
    `shape ${letter}=${suffix}`,
    `tree_${letter}_trunk_lv${level}.png`,
  )

  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  const rawMask = buildAlphaMask(data, width, height, channels)
  const cleanedMask = keepLargestComponent(rawMask, width, height)
  const skeleton = zhangSuenThinning(cleanedMask, width, height)
  const allEndpoints = findEndpoints(skeleton, width, height)

  const rootCutoffY = height * ROOT_CUTOFF_RATIO
  const realTipsPx = allEndpoints.filter((p) => p.y < rootCutoffY)

  // [ข้อ 1a] บังคับสมมาตรซ้าย-ขวา ก่อนผสมจุดเสริมเรขาคณิต — centerX จาก centroid จริงของ
  // มวลลำต้น ไม่ใช่เดา 50%
  const centerX = computeMaskCentroidX(cleanedMask, width, height)
  const { points: balancedTipsPx, mirroredCount } = balanceLeftRight(realTipsPx, centerX)

  // [ข้อ 1b] หายอดบนสุดของลำต้น (พิกเซลต้นไม้ที่ y น้อยที่สุด) เป็นจุดยึดของทรงเรขาคณิตเสริม
  let apexY = height
  let apexXAtApexY = centerX
  for (let y = 0; y < height; y++) {
    let found = false
    for (let x = 0; x < width; x++) {
      if (cleanedMask[y * width + x]) { apexXAtApexY = x; found = true; break }
    }
    if (found) { apexY = y; break }
  }
  // [แก้ตามที่ระบุรอบนี้] ความกว้างวงรีเสริมอิงจาก "ระยะห่างสุดของกิ่งจริงจาก centerX" ไม่ใช่
  // ค่าคงที่แยกจากรูปทรงจริง — ถ้าไม่มี tip จริงเลย (เช่น lv1-2 บางไฟล์) fallback เป็น 12%
  // ของความกว้างภาพ (กะประมาณพุ่มเล็กๆ ของต้นกล้า)
  const maxTipSpread = balancedTipsPx.length > 0
    ? Math.max(...balancedTipsPx.map((p) => Math.abs(p.x - centerX)))
    : width * 0.12
  const fillerPx = generateGeometricFillerPoints(apexXAtApexY, apexY, rootCutoffY, centerX, maxTipSpread)

  // [ข้อ 1c] ผสม tip จริง(+mirror) กับจุดเสริมเรขาคณิต แล้วตัดจุดที่ลอยเดี่ยวไม่เชื่อมกับ
  // ลำต้น/กิ่งจริง หรือกับจุดอื่นที่เชื่อมกลับไปถึงลำต้นในที่สุดทิ้ง
  const combinedPx = [...balancedTipsPx, ...fillerPx]
  const skeletonPoints = extractSkeletonPoints(skeleton, width, height)
  const overlapRadiusPx = width * (OVERLAP_RADIUS_PCT_OF_WIDTH / 100)
  const { points: connectedPx, droppedCount } = filterConnectedPoints(combinedPx, skeletonPoints, overlapRadiusPx)

  const branchTips = connectedPx
    .map((p) => ({ x: round1(Math.min(100, Math.max(0, (p.x / width) * 100))), y: round1((p.y / height) * 100) }))

  return {
    branchTips,
    rawEndpointCount: allEndpoints.length,
    realTipCount: realTipsPx.length,
    mirroredCount,
    fillerCount: fillerPx.length,
    droppedCount,
    width,
    height,
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const summary = []

  for (const letter of SHAPE_LETTERS) {
    for (const level of LEVELS) {
      try {
        const { branchTips, rawEndpointCount, realTipCount, mirroredCount, fillerCount, droppedCount } = await processTrunkFile(letter, level)
        const outPath = path.join(OUTPUT_DIR, `shape-${letter}-trunk-lv${level}.json`)
        await writeFile(outPath, JSON.stringify(branchTips, null, 2))

        let warn = ''
        if (branchTips.length < 3) warn = ' ⚠️ น้อยผิดปกติ (<3 จุด) — ลองลด ALPHA_THRESHOLD'
        else if (branchTips.length > 80) warn = ' ⚠️ มากผิดปกติ (>80 จุด) — อาจมี noise ปนอยู่ ลองเพิ่ม ALPHA_THRESHOLD/MIN_COMPONENT_SIZE_PX'

        summary.push({ letter, level, count: branchTips.length, rawEndpointCount, realTipCount, mirroredCount, fillerCount, droppedCount, warn })
        console.log(
          `shape ${letter} lv${level}: ${branchTips.length} tip(s) สุดท้าย ` +
          `(กิ่งจริง ${realTipCount} + mirror ${mirroredCount} + เสริมเรขาคณิต ${fillerCount} − ตัดลอยเดี่ยว ${droppedCount})${warn}`,
        )
      } catch (err) {
        summary.push({ letter, level, count: 0, error: String(err?.message ?? err) })
        console.error(`shape ${letter} lv${level}: ERROR — ${String(err?.message ?? err)}`)
      }
    }
  }

  const ok = summary.filter((s) => !s.error)
  const avg = ok.length > 0 ? ok.reduce((a, s) => a + s.count, 0) / ok.length : 0
  console.log(`\nสรุป: ${ok.length}/${summary.length} ไฟล์ประมวลผลสำเร็จ — เฉลี่ย ${avg.toFixed(1)} tip ต่อไฟล์`)

  const flagged = summary.filter((s) => s.warn || s.error)
  if (flagged.length > 0) {
    console.log('ไฟล์ที่ต้องตรวจเพิ่มเติม:')
    for (const f of flagged) {
      console.log(`  - shape ${f.letter} lv${f.level}: ${f.error ? `ERROR ${f.error}` : `${f.count} tip${f.warn}`}`)
    }
  }
}

main()
