// scripts/extract-canopy-tip.mjs
//
// [ใหม่ — ตามที่ระบุรอบนี้ ข้อ 2] แทนที่ scripts/extract-branch-tips.mjs สำหรับงาน "หา
// ตำแหน่งวางใบ" (ไฟล์นั้นยังเก็บไว้เฉยๆ ไม่ลบ เผื่อมีประโยชน์งานอื่น แค่เลิกเรียกใช้ในระบบ
// วางใบแล้ว) — สคริปต์นี้เบากว่ามาก ไม่ skeletonize ทั้งภาพ แค่หา 2 จุดต่อไฟล์ trunk:
//   1. tipX/tipY — พิกเซลแรกที่ alpha > threshold นับจากขอบบนของภาพลงมา (สแกนทีละแถว
//      บนลงล่าง ในแถวเดียวกันสแกนซ้ายไปขวา เจอจุดแรกหยุดทันที) = จุดปลายสุดของลำต้น/กิ่ง
//      ที่สูงที่สุดในภาพ
//   2. groundY — แถวสุดท้าย (นับจากขอบล่างขึ้นมา) ที่ยังมีพิกเซล alpha > threshold อยู่
//      = ขอบล่างสุดของพื้นที่ลำต้นในภาพ (ใช้คำนวณ trunkMidpointY ใน TreeOfLife.tsx)
//
// ผลลัพธ์เขียนเป็นไฟล์ TS constant ตรงๆ (src/config/canopyTipPoints.ts) ไม่ใช่ JSON แยกที่
// ต้อง fetch — มีแค่ 32 จุดเล็กๆ ไม่คุ้มจะเปิด async loading state เพิ่มในระบบเลย
//
// รัน: node scripts/extract-canopy-tip.mjs

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

const ALPHA_THRESHOLD = 40

function round1(n) {
  return Math.round(n * 10) / 10
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
  const alphaAt = (x, y) => data[(y * width + x) * channels + 3]

  let tipX = width / 2
  let tipY = 0
  outerTop: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaAt(x, y) > ALPHA_THRESHOLD) {
        tipX = x
        tipY = y
        break outerTop
      }
    }
  }

  let groundY = height - 1
  outerBottom: for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      if (alphaAt(x, y) > ALPHA_THRESHOLD) {
        groundY = y
        break outerBottom
      }
    }
  }

  return {
    tipXPct: round1((tipX / width) * 100),
    tipYPct: round1((tipY / height) * 100),
    groundYPct: round1((groundY / height) * 100),
  }
}

async function main() {
  const result = {}
  const summary = []

  for (const letter of SHAPE_LETTERS) {
    result[letter] = {}
    for (const level of LEVELS) {
      const point = await processTrunkFile(letter, level)
      result[letter][level] = point
      summary.push({ letter, level, ...point })
      console.log(`shape ${letter} lv${level}: tip=(${point.tipXPct}%, ${point.tipYPct}%) ground=${point.groundYPct}%`)
    }
  }

  const outPath = path.join(ROOT_DIR, 'src/config/canopyTipPoints.ts')
  const fileContents = `// [ไฟล์ auto-generate — ตามที่ระบุรอบนี้ ข้อ 2] อย่าแก้มือ รันใหม่ด้วย
// node scripts/extract-canopy-tip.mjs ถ้าไฟล์ trunk เปลี่ยน
//
// จุดปลายสุด (tip) และขอบล่างสุด (ground) ของแต่ละไฟล์ trunk (% ของขนาดภาพไฟล์นั้น) —
// ใช้แทนระบบ branch-tip/skeletonize เดิมทั้งหมดสำหรับงาน "หาตำแหน่งวางทรงพุ่มวงกลม" ใน
// TreeOfLife.tsx (ดู canopyCenter/canopyRadius ที่นั่น)

export interface CanopyTipPoint {
  tipXPct: number
  tipYPct: number
  groundYPct: number
}

export const CANOPY_TIP_POINTS: Record<string, Record<number, CanopyTipPoint>> = ${JSON.stringify(result, null, 2)}
`
  await writeFile(outPath, fileContents)
  console.log(`\nเขียน ${outPath} สำเร็จ (${summary.length} จุด)`)
}

main()
