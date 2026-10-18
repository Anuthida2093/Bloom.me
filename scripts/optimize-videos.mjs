/*
  optimize-videos.mjs — [1.5 โหลดเร็วขึ้น] บีบอัดวิดีโอใน public/assets/videos + สร้างภาพโปสเตอร์ (เฟรมแรก)
  ────────────────────────────────────────────────────────────────────────────
  - re-encode H.264 (CRF 26, ขนาดพิกเซลเดิม) + "+faststart" (ย้ายข้อมูล moov ไว้หัวไฟล์ → เบราว์เซอร์
    เริ่มเล่นได้ก่อนโหลดครบไฟล์) — เขียนทับไฟล์เดิมเฉพาะเมื่อเล็กลงอย่างน้อย 15% (ต้นฉบับยังอยู่ใน git)
  - โปสเตอร์ <ชื่อวิดีโอ>.poster.webp จากเฟรมแรก — ใช้เป็น poster="" ให้มีภาพทันทีระหว่างรอวิดีโอ
  ใช้: FFMPEG=<path ffmpeg> node scripts/optimize-videos.mjs   (ไม่ส่ง FFMPEG = ใช้ ffmpeg ใน PATH)
*/
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const ROOT = 'public/assets/videos'

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : /\.mp4$/i.test(e.name) ? [p] : []
  })
}

/** Windows บางครั้งล็อกไฟล์วิดีโอไว้ชั่วคราว (แอนติไวรัส/ตัวพรีวิว) → rename ไม่ได้ (EPERM)
 *  ลองซ้ำ แล้วถอยไปใช้คัดลอกทับ + ลบไฟล์ชั่วคราวแทน */
function replaceFile(tmp, dest) {
  for (let i = 0; i < 5; i++) {
    try { fs.renameSync(tmp, dest); return } catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400) }
  }
  fs.copyFileSync(tmp, dest)
  fs.unlinkSync(tmp)
}

let before = 0
let after = 0
for (const src of walk(ROOT)) {
  const size = fs.statSync(src).size
  before += size
  const posterDone = src.replace(/\.mp4$/i, '.poster.webp')
  // ทำไปแล้ว (มีโปสเตอร์ใหม่กว่าวิดีโอ) → ข้าม ไม่บีบซ้ำให้คุณภาพตกลงอีก
  if (fs.existsSync(posterDone) && fs.statSync(posterDone).mtimeMs >= fs.statSync(src).mtimeMs) {
    after += size
    continue
  }
  const tmp = src.replace(/\.mp4$/i, '.tmp.mp4')
  execFileSync(FFMPEG, [
    '-y', '-loglevel', 'error', '-i', src,
    '-map', '0:v:0', '-map', '0:a?',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart', tmp,
  ])
  const newSize = fs.statSync(tmp).size
  if (newSize < size * 0.85) {
    replaceFile(tmp, src)
    after += newSize
  } else {
    fs.unlinkSync(tmp)
    // ไม่เล็กลงพอ — ยังทำ faststart อย่างเดียว (คัดลอกสตรีมเดิม ไม่เสียคุณภาพ)
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', src, '-c', 'copy', '-movflags', '+faststart', tmp])
    replaceFile(tmp, src)
    after += fs.statSync(src).size
  }

  const posterPng = src.replace(/\.mp4$/i, '.poster.png')
  const posterWebp = src.replace(/\.mp4$/i, '.poster.webp')
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', posterPng])
  await sharp(posterPng).webp({ quality: 72 }).toFile(posterWebp)
  fs.unlinkSync(posterPng)
  console.log(`${(size / 1024 | 0)}K → ${(fs.statSync(src).size / 1024 | 0)}K  ${src}`)
}
console.log(`videos: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB`)
