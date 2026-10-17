/*
  optimize-images.mjs — สร้างไฟล์ .webp คู่กับภาพ PNG/JPG ที่แอปโหลดจริงบ่อย (ไอคอนเควส/ไอเทม/แผนที่เควสก้าว)
  ขนาดพิกเซลเท่าเดิม (ไม่ย่อ) แค่เปลี่ยนการบีบอัด — ไฟล์ต้นฉบับยังอยู่ ไม่ลบ
  ใช้: node scripts/optimize-images.mjs   (รันซ้ำได้ ข้ามไฟล์ที่ .webp ใหม่กว่าต้นฉบับแล้ว)
*/
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const DIRS = [
  'public/assets/images/icons/quests',
  'public/assets/images/icons/Item',
  'public/assets/images/mini-game/vitality-steps',
]

let before = 0
let after = 0
for (const dir of DIRS) {
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(png|jpe?g)$/i.test(name)) continue
    const src = path.join(dir, name)
    const out = src.replace(/\.(png|jpe?g)$/i, '.webp')
    const srcStat = fs.statSync(src)
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs > srcStat.mtimeMs) {
      before += srcStat.size
      after += fs.statSync(out).size
      continue
    }
    await sharp(src).webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(out)
    before += srcStat.size
    after += fs.statSync(out).size
  }
}
console.log(`webp: ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB`)
