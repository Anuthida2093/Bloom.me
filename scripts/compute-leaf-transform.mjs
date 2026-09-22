// scripts/compute-leaf-transform.mjs
//
// [เขียนใหม่ทั้งไฟล์ตามที่ระบุรอบนี้] เปลี่ยนจากระบบ "1 ภาพใบก้อนใหญ่ต่อ 1 trunk level"
// (ที่ไฟล์นี้เคยทำมา 2 รอบก่อน — คำนวณ transform เดียว {scale,x,y} ต่อคู่ shape+level แล้ว
// paste ภาพ LeafCanopy ทั้งก้อนทับปลายกิ่ง) เป็นระบบ "หลายจุดยึด (anchor) x หลายสำเนาภาพใบ
// ขนาดเล็ก" แทน — แก้ปัญหาที่ภาพใบก้อนเดียวไม่ว่าจะปรับ K/offset เท่าไหร่ก็ยังดู "เป็นก้อนกลม
// แข็งๆ ติดปลายไม้เสียบ" ไม่เหมือนใบไม้จริงที่กระจายอยู่ตามกิ่งหลายจุด
//
// [ไฟล์ leaf-transforms.json/leafTransforms.ts จากระบบเดิม] เก็บไว้เฉยๆ ไม่ลบ (ตามธรรมเนียม
// ที่ยึดมาตลอดในโปรเจกต์นี้ — ดู extract-branch-tips.mjs/extract-canopy-tip.mjs ก่อนหน้า)
// แต่จะไม่ถูกสร้างใหม่จากสคริปต์นี้อีกต่อไป (ค่าที่มีอยู่จะค้างเป็นค่าเก่าจากรอบก่อน ไม่ sync
// กับไฟล์ trunk ที่เปลี่ยนแปลงในอนาคต) เพราะ TreeOfLife.tsx เลิก import ไปใช้แล้ว
//
// ขั้นตอนต่อคู่ shape+level (4 shape x 8 level = 32 คู่):
//   1. อ่าน alpha channel ของภาพ trunk หา pixel ที่ alpha > ALPHA_THRESHOLD (20)
//   2. สแกนหลายแถบความสูง (band) ของภาพ — level สูง (6+) กิ่งแผ่กว้าง/ลงมาต่ำกว่า เพิ่ม band
//      ที่ลึกลงไปอีก 1 แถบ (ดู BANDS_BY_LEVEL)
//   3. ต่อ 1 band: หาจุด alpha>threshold ที่ซ้ายสุด, ขวาสุด, บนสุด ภายในแถบนั้น (3 จุด/band)
//   4. รวมจุดจากทุก band แล้ว dedupe (ระยะห่าง < ANCHOR_DEDUPE_DISTANCE_PX ถือเป็นจุดเดียวกัน
//      เก็บจุดแรกที่เจอไว้ ทิ้งจุดที่ใกล้ซ้ำ)
//   5. บันทึกเป็น public/assets/images/tree/leaf-anchors.json — คีย์ = "<RawShapeLetter
//      A-D>-lv<1-8>" (ใช้ตัวอักษรไฟล์จริงตรงๆ เหมือนไฟล์ข้อมูลอื่นๆ ในโปรเจกต์นี้ทั้งหมด —
//      canopyTipPoints.ts/leafTransforms.ts รอบก่อน — สเปกให้ตัวอย่างคีย์เป็น "shape-1-lv3"
//      แต่นั่นต้องผ่านตาราง SHAPE_TO_RAW_LETTER กลับด้าน เพิ่มจุดเสี่ยง sync ผิดถ้าตารางนั้น
//      เปลี่ยน — คงรูปแบบตัวอักษรเดิมเพื่อลดจุดแปลงค่าซ้ำซ้อน)
//
// ต่างจากไฟล์เดิมที่ทำ transform เดียว ไฟล์นี้ "ไม่คำนวณ scale/rotation ของใบ" อีกต่อไป —
// นั่นย้ายไปทำที่ runtime ใน TreeOfLife.tsx แทน (สุ่มต่อ instance ด้วย seed ตาม user ไม่ใช่
// ค่าคงที่ต่อ shape+level แบบเดิม) ไฟล์นี้มีหน้าที่แค่หา "จุดยึด" ที่ตายตัวต่อภาพ trunk เท่านั้น
//
// รัน: node scripts/compute-leaf-transform.mjs

import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')

const TRUNK_ROOT_FOLDER = 'ส่วนที่ 1 Trunk Layer (8 Level) — Shape A'
const TRUNK_SUFFIX = { A: '10001', B: '10002', C: '10003', D: '10004' }
const SHAPE_LETTERS = ['A', 'B', 'C', 'D']
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8]

const ALPHA_THRESHOLD = 20

// [ตามที่ระบุรอบนี้] แถบความสูง (band) เป็นสัดส่วนของความสูงภาพ (0=บนสุด, 1=ล่างสุด) — หา
// จุดปลายกิ่งของแต่ละแถบแยกกัน กระจายจุดยึดทั่วโครงกิ่งทั้งบน+ข้าง ไม่ใช่แค่จุดบนสุดจุดเดียว
// แบบระบบเดิม (single bounding box) — level 6+ เพิ่มแถบที่ลึกลงไปอีกหนึ่งช่วง เพราะกิ่งของ
// trunk level สูงแผ่กว้าง/ลงมาต่ำกว่า level อ่อนมาก (ยืนยันจากข้อมูลจริงรอบก่อน — branchSpreadW
// ของหลาย shape ที่ level 6-8 กว้างเกือบเต็มความกว้างภาพ)
const BASE_BANDS = [[0.05, 0.15], [0.10, 0.25], [0.15, 0.35], [0.25, 0.45]]
const DEEP_BAND = [0.35, 0.55]

function getBandsForLevel(level) {
  return level >= 6 ? [...BASE_BANDS, DEEP_BAND] : BASE_BANDS
}

// จุดที่ระยะห่างกันน้อยกว่านี้ (พิกเซล บน canvas 432px ต้นฉบับ) ถือว่าเป็นจุดเดียวกัน
const ANCHOR_DEDUPE_DISTANCE_PX = 20

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** หาจุดซ้ายสุด/ขวาสุด/บนสุด (alpha>threshold) ภายในแถบความสูง [yMinRatio,yMaxRatio) ของภาพ
 *  — คืน array ของจุดที่เจอจริง (0-3 จุด แล้วแต่ว่าแถบนั้นมีเนื้อทึบไหม) */
function findBandAnchors(alphaAt, width, height, yMinRatio, yMaxRatio) {
  const yMin = Math.max(0, Math.round(height * yMinRatio))
  const yMax = Math.min(height - 1, Math.round(height * yMaxRatio))

  let leftmost = null
  let rightmost = null
  let topmost = null

  for (let y = yMin; y <= yMax; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaAt(x, y) <= ALPHA_THRESHOLD) continue
      if (leftmost === null || x < leftmost.x) leftmost = { x, y }
      if (rightmost === null || x > rightmost.x) rightmost = { x, y }
      if (topmost === null || y < topmost.y) topmost = { x, y }
    }
  }

  return [leftmost, rightmost, topmost].filter(Boolean)
}

/** [ใหม่ตามที่ระบุรอบนี้] หาจุดยึดหลายจุดทั่วโครงกิ่ง แทนที่ bounding box เดียวของระบบเดิม —
 *  สแกนหลายแถบความสูง เก็บจุดซ้าย/ขวา/บนสุดของแต่ละแถบ แล้ว dedupe จุดที่อยู่ใกล้กันเกินไป */
async function computeAnchorPoints(trunkPath, level) {
  const { data, info } = await sharp(trunkPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const alphaAt = (x, y) => data[(y * width + x) * channels + 3]

  const bands = getBandsForLevel(level)
  const rawPoints = []
  for (const [yMinRatio, yMaxRatio] of bands) {
    rawPoints.push(...findBandAnchors(alphaAt, width, height, yMinRatio, yMaxRatio))
  }

  const anchors = []
  for (const point of rawPoints) {
    const isDuplicate = anchors.some((kept) => distance(kept, point) < ANCHOR_DEDUPE_DISTANCE_PX)
    if (!isDuplicate) anchors.push(point)
  }

  return anchors
}

async function main() {
  const result = {}
  let totalAnchors = 0

  for (const letter of SHAPE_LETTERS) {
    for (const level of LEVELS) {
      const trunkPath = path.join(
        ROOT_DIR, 'public/assets/images/tree', TRUNK_ROOT_FOLDER,
        `shape ${letter}=${TRUNK_SUFFIX[letter]}`, `tree_${letter}_trunk_lv${level}.png`,
      )
      const anchors = await computeAnchorPoints(trunkPath, level)
      const key = `${letter}-lv${level}`
      result[key] = anchors
      totalAnchors += anchors.length
      console.log(`${key} (shape ${letter}): ${anchors.length} anchors -> ${anchors.map((a) => `(${a.x},${a.y})`).join(' ')}`)
    }
  }

  const pairCount = SHAPE_LETTERS.length * LEVELS.length
  console.log(`\nเฉลี่ย ${(totalAnchors / pairCount).toFixed(1)} จุด/ไฟล์ (รวม ${totalAnchors} จุดจาก ${pairCount} ไฟล์)`)

  const outPath = path.join(ROOT_DIR, 'public/assets/images/tree/leaf-anchors.json')
  await writeFile(outPath, JSON.stringify(result, null, 2))
  console.log(`เขียน ${outPath} สำเร็จ`)

  // [เหมือนรอบก่อน] เขียนสำเนา "baked" เป็น TS constant ด้วย — Vite import โมดูลจาก public/
  // ตรงๆไม่ได้ (เอกสาร Vite ระบุชัดว่าของใน public/ ให้ใช้ผ่าน URL เท่านั้น) ไฟล์ public/
  // ข้างบนเก็บไว้เป็นสำเนาอ่าน/ตรวจสอบได้ตรงๆ ตามสเปก ส่วนไฟล์นี้ให้ TreeOfLife.tsx import ใช้
  // ได้ทันทีไม่ต้อง fetch async (ข้อมูลรวมทั้งหมดเล็กมาก ~32 ไฟล์ x ไม่กี่จุด)
  const tsOutPath = path.join(ROOT_DIR, 'src/config/leafAnchors.ts')
  const tsContents = `// [ไฟล์ auto-generate — อย่าแก้มือ] รันใหม่ด้วย node scripts/compute-leaf-transform.mjs
// ถ้าไฟล์ trunk เปลี่ยน หรือปรับ BASE_BANDS/DEEP_BAND/ANCHOR_DEDUPE_DISTANCE_PX ในสคริปต์นั้น
//
// สำเนา baked ของ public/assets/images/tree/leaf-anchors.json (ไฟล์นั้นเก็บไว้เป็นสำเนา
// อ่าน/ตรวจสอบได้ตรงๆ ตามสเปก — แต่ Vite import โมดูลจาก public/ ตรงๆไม่ได้ จึง bake ซ้ำมาไว้
// ที่นี่ให้ TreeOfLife.tsx import ใช้ได้ทันทีไม่ต้อง fetch async)
//
// x,y = จุดยึด (anchor point) เป็นพิกเซลบน canvas ต้นฉบับของภาพ trunk นั้น (432x432) —
// TreeOfLife.tsx แปลงเป็น % ของกล่องคอนเทนเนอร์จริงผ่าน mapImagePointToContainerPct เอง

export interface LeafAnchor {
  x: number
  y: number
}

export const LEAF_ANCHORS: Record<string, LeafAnchor[]> = ${JSON.stringify(result, null, 2)}
`
  await writeFile(tsOutPath, tsContents)
  console.log(`เขียน ${tsOutPath} สำเร็จ (baked copy)`)
}

main()
