import { mulberry32 } from '../../../utils/seededRandom'
import type { ScenePalette, SceneWeather } from '../../../config/homeScenes'
import type { HomeSceneLayout } from './generateHomeScene'
import type { StaticLayers } from './paintHomeScene'
import { grassLean, wind, type WindParams } from './wind'

/*============================================================================*\
  composeHomeScene — ประกอบฉากทีละเฟรม (เร็ว: วาดบิตแมปนิ่ง + ของเคลื่อนไหวชิ้นเล็กๆ เท่านั้น)
  ────────────────────────────────────────────────────────────────────────────
  หญ้า: แต่ละแถวหั่นเป็น GRASS_COLS คอลัมน์ แต่ละคอลัมน์ "เฉือน" (shear) ตามลม ณ ตำแหน่งนั้น
  โดยยึดเส้นโคนหญ้าไว้ (โคนนิ่ง ปลายไหวมากสุด) · แถวใกล้ไหวมากกว่าแถวไกล · ระลอกลมวิ่งผ่านทุ่ง
  ทุกอย่างที่ลอย (กลีบ เมฆ หมอก ละอองน้ำตก ฝน) อ่านลมจาก wind() ตัวเดียวกัน
\*============================================================================*/

/** จำนวนคอลัมน์ต่อแถวหญ้า — วัดแล้ว 16 ให้รอยต่อเนียนและต้นทุนต่อเฟรมต่ำ (ดูรายงานใน preview) */
export const GRASS_COLS = 16
const TAU = Math.PI * 2
const rgba = ([r, g, b]: readonly [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`
type Ctx = CanvasRenderingContext2D

export interface Particle { x: number; y: number; vy: number; spin: number; size: number; color: number; phase: number }
export interface FrameState { petals: Particle[]; motes: Particle[]; rain: { x: number; y: number; len: number }[] }

export interface FrameParams {
  t: number
  dt: number
  /** เลื่อนฉาก (px) — ชั้นไกลเลื่อนน้อย ชั้นใกล้เลื่อนมาก (พารัลแลกซ์) */
  pan: number
  weather: SceneWeather
  wind: WindParams
  reducedMotion: boolean
}

export function createFrameState(L: HomeSceneLayout): FrameState {
  const rnd = mulberry32(L.seed + 3)
  const n = L.kind === 'flower-garden' ? 16 : 20
  return {
    petals: Array.from({ length: n }, () => ({ x: rnd() * L.w, y: rnd() * L.h, vy: 16 + rnd() * 22, spin: rnd() * TAU, size: 3 + rnd() * 3, color: Math.floor(rnd() * 3), phase: rnd() * TAU })),
    motes: Array.from({ length: 16 }, () => ({ x: rnd() * L.w, y: L.h * (0.2 + rnd() * 0.6), vy: -3 - rnd() * 5, spin: 0, size: 1.4 + rnd() * 2, color: 0, phase: rnd() * TAU })),
    rain: Array.from({ length: 90 }, () => ({ x: rnd() * L.w * 1.3 - L.w * 0.15, y: rnd() * L.h, len: 10 + rnd() * 16 })),
  }
}

const layerX = (L: HomeSceneLayout, pan: number, k: number) => -L.over - Math.max(-L.over / k, Math.min(L.over / k, pan)) * k * 0.999

function drawClouds(c: Ctx, L: HomeSceneLayout, f: FrameParams, x0: number) {
  const rain = f.weather === 'rain'
  c.fillStyle = rain ? 'rgba(210,216,224,.62)' : 'rgba(255,255,255,.55)'
  const span = L.W + 200
  for (const cl of L.clouds) {
    const drift = f.reducedMotion ? 0 : f.t * cl.speed * 6 * f.wind.direction * (0.5 + f.wind.strength)
    const x = ((((cl.x + drift) % span) + span) % span) - 100 + x0 + L.over * 0.5
    c.beginPath()
    c.ellipse(x, cl.y, cl.s, cl.s * 0.32, 0, 0, TAU)
    c.ellipse(x - cl.s * 0.45, cl.y + cl.s * 0.06, cl.s * 0.55, cl.s * 0.25, 0, 0, TAU)
    c.ellipse(x + cl.s * 0.4, cl.y - cl.s * 0.08, cl.s * 0.5, cl.s * 0.3, 0, 0, TAU)
    c.fill()
  }
}

/** [แก้ตามที่ระบุ — น้ำตกฉาก 3 (ทุ่งหญ้าน้ำตก) สวยและสมจริงขึ้น] ม่านน้ำผืนเดียว (3 สายซ้อนกันไม่มีช่องว่าง) โค้งข้ามขอบผา
 *  ไล่สีบนเข้ม → ล่างขาวฟอง · เส้นน้ำหลายชั้นไหลเร่งลง · แอ่งต้นน้ำบนผา · ฟองเดือดที่ฐาน + ละอองกระเด็น
 *  + วงคลื่นในแอ่ง · ทุกสีมาจาก P.water (ยังมืดกว่าดอกต้นไม้ — เทสต์ตรวจ) */
function drawFalls(c: Ctx, L: HomeSceneLayout, P: ScenePalette, f: FrameParams, x0: number) {
  const F = L.falls!, Wt = P.water!
  const rain = f.weather === 'rain'
  const t = f.reducedMotion ? 0 : f.t
  const full = rain ? 1.2 : 1
  const foamRgb = hexRgb(Wt.foam), hiRgb = hexRgb(Wt.highlight), edgeRgb = hexRgb(Wt.edge)
  c.save()
  c.translate(x0, 0)
  // แอ่งต้นน้ำบนผา (น้ำไหลมาจากด้านหลังก่อนล้นขอบ)
  const left = Math.min(...F.ribbons.map((r) => r.x - (r.wTop * full) / 2)), right = Math.max(...F.ribbons.map((r) => r.x + (r.wTop * full) / 2))
  const top = Math.min(...F.ribbons.map((r) => r.yTop))
  const pg = c.createLinearGradient(0, top - 10, 0, top + 2)
  pg.addColorStop(0, Wt.edge); pg.addColorStop(1, Wt.body)
  c.fillStyle = pg
  c.beginPath(); c.ellipse((left + right) / 2, top - 1, (right - left) * 0.56, Math.max(2.5, (right - left) * 0.06), 0, 0, TAU); c.fill()

  for (const r of F.ribbons) {
    const wt = r.wTop * full, wb = r.wBot * full
    const len = r.yBot - r.yTop
    // ทรง: บนโค้งนูนข้ามขอบผา → ด้านข้างบานออกเล็กน้อยตามแรงตก
    const path = () => {
      c.beginPath()
      c.moveTo(r.x - wt / 2, r.yTop)
      c.quadraticCurveTo(r.x, r.yTop - Math.max(3, wt * 0.18), r.x + wt / 2, r.yTop)
      c.bezierCurveTo(r.x + wt / 2 + wt * 0.08, r.yTop + len * 0.12, r.x + wb / 2, r.yTop + len * 0.55, r.x + wb / 2, r.yBot)
      c.lineTo(r.x - wb / 2, r.yBot)
      c.bezierCurveTo(r.x - wb / 2, r.yTop + len * 0.55, r.x - wt / 2 - wt * 0.08, r.yTop + len * 0.12, r.x - wt / 2, r.yTop)
      c.closePath()
    }
    path()
    const gv = c.createLinearGradient(0, r.yTop, 0, r.yBot)
    gv.addColorStop(0, Wt.edge); gv.addColorStop(0.18, Wt.body); gv.addColorStop(0.65, Wt.highlight); gv.addColorStop(1, Wt.foam)
    c.fillStyle = gv
    c.fill()
    // ความกลมของม่านน้ำ: ซ้ายสว่าง (แสงซ้ายบน) → ขวาเงา
    const gh = c.createLinearGradient(r.x - wb / 2, 0, r.x + wb / 2, 0)
    gh.addColorStop(0, rgba(hiRgb, 0.45)); gh.addColorStop(0.45, rgba(hiRgb, 0)); gh.addColorStop(1, rgba(edgeRgb, 0.35))
    c.fillStyle = gh
    c.fill()
    c.save()
    path(); c.clip()
    // แถบม่านน้ำหนา-บางนิ่งๆ (ให้ผิวน้ำมีลาย ไม่เรียบเป็นท่อ)
    for (let k = 0; k < 5; k++) {
      const u = (k + 0.5) / 5 - 0.5 + (((k * 17) % 5) - 2) * 0.03
      c.strokeStyle = k % 2 ? rgba(hiRgb, 0.55) : rgba(edgeRgb, 0.22)
      c.lineWidth = Math.max(1.5, wb * (k % 2 ? 0.12 : 0.18))
      c.beginPath(); c.moveTo(r.x + u * wt, r.yTop); c.bezierCurveTo(r.x + u * wt, r.yTop + len * 0.3, r.x + u * wb, r.yTop + len * 0.6, r.x + u * wb, r.yBot); c.stroke()
    }
    // เส้นน้ำไหล: เร่งความเร็วลง (ตำแหน่ง ∝ เฟส^1.5) · ชั้นสว่างและชั้นเงาสลับกัน
    c.lineCap = 'round'
    for (let k = 0; k < 18; k++) {
      const u = ((k * 37) % 23) / 23 - 0.5
      const phase = (((k * 0.137) + t * (0.55 + ((k * 13) % 7) * 0.06) * r.speed) % 1 + 1) % 1
      const yy = r.yTop + len * Math.pow(phase, 1.5)
      const seg = 6 + len * 0.18 * phase
      const xx = r.x + u * (wt + (wb - wt) * phase) * 0.85
      const dark = k % 4 === 0
      c.strokeStyle = dark ? rgba(edgeRgb, 0.4) : rgba(foamRgb, 0.65 + 0.35 * phase)
      c.lineWidth = Math.max(1, wb * (dark ? 0.12 : 0.06))
      c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + u * 2, Math.min(r.yBot, yy + seg)); c.stroke()
    }
    // เงาใต้ขอบผา (น้ำหนาโค้งออก)
    const ls = c.createLinearGradient(0, r.yTop, 0, r.yTop + len * 0.12)
    ls.addColorStop(0, rgba(edgeRgb, 0.4)); ls.addColorStop(1, rgba(edgeRgb, 0))
    c.fillStyle = ls; c.fillRect(r.x - wb, r.yTop, wb * 2, len * 0.12)
    c.restore()
    // ขอบสว่างตรงที่น้ำล้นผา (บาง นุ่ม — ไม่ใช่ขอบท่อ)
    c.strokeStyle = rgba(foamRgb, 0.75); c.lineWidth = Math.max(1, wt * 0.045)
    c.beginPath(); c.moveTo(r.x - wt / 2 + 1, r.yTop); c.quadraticCurveTo(r.x, r.yTop - Math.max(3, wt * 0.18), r.x + wt / 2 - 1, r.yTop); c.stroke()
  }
  // ฟองเดือดที่ฐาน: ก้อนฟองซ้อนกันกระเพื่อม + ละอองกระเด็นเป็นวงโค้ง
  const pl = F.pool
  const base = Math.max(...F.ribbons.map((r) => r.yBot))
  const span = right - left
  // ละอองฟุ้งเป็นม่านขาวที่ฐาน (ยกขึ้นพ้นแนวหญ้า)
  const mg = c.createRadialGradient((left + right) / 2, base - span * 0.25, 0, (left + right) / 2, base - span * 0.25, span * 1.1)
  mg.addColorStop(0, rgba(foamRgb, 0.7)); mg.addColorStop(1, rgba(foamRgb, 0))
  c.fillStyle = mg
  c.beginPath(); c.ellipse((left + right) / 2, base - span * 0.25, span * 1.1, span * 0.6, 0, 0, TAU); c.fill()
  for (let k = 0; k < 14; k++) {
    const u = k / 13 - 0.5
    const pr = span * (0.14 + ((k * 7) % 5) * 0.03) * (1 + 0.12 * Math.sin(t * 4.2 + k * 1.3))
    c.fillStyle = rgba(foamRgb, 0.6 + ((k * 3) % 4) * 0.1)
    c.beginPath(); c.arc((left + right) / 2 + u * span * 1.35, base - pr * 0.75 + Math.abs(u) * pr * 0.7, pr, 0, TAU); c.fill()
  }
  if (!f.reducedMotion) {
    c.fillStyle = rgba(foamRgb, 0.85)
    for (let k = 0; k < 12; k++) {
      const p = (t * 0.9 + k / 12) % 1
      const dir = k % 2 ? 1 : -1, sp = span * (0.3 + ((k * 5) % 4) * 0.12)
      const x = (left + right) / 2 + dir * sp * p
      const y = base - Math.sin(p * Math.PI) * span * 0.35
      c.beginPath(); c.arc(x, y, Math.max(1, span * 0.025 * (1 - p)), 0, TAU); c.fill()
    }
  }
  // วงคลื่นในแอ่งขยายออก
  c.strokeStyle = rgba(hiRgb, 0.6); c.lineWidth = 1.4
  for (let k = 0; k < 3; k++) {
    const p = ((t * 0.35 + k / 3) % 1)
    c.globalAlpha = 1 - p
    c.beginPath(); c.ellipse(pl.x, pl.y + pl.ry * 0.2, pl.rx * (0.35 + p * 0.6), pl.ry * (0.4 + p * 0.6), 0, 0, TAU); c.stroke()
  }
  c.globalAlpha = 1
  // หมอกพวยลอยตามลม
  const w0 = wind(t, (pl.x - L.over) / L.w, f.wind)
  for (let k = 0; k < 7; k++) {
    const p = (t * 0.22 + k / 7) % 1
    const x = pl.x + Math.sin(k * 2.1) * pl.rx * 0.25 + p * 40 * w0.strength * w0.direction
    const y = pl.y - p * L.h * 0.13
    const rr = pl.rx * (0.25 + p * 0.55)
    const g = c.createRadialGradient(x, y, 0, x, y, rr)
    g.addColorStop(0, rgba(P.mist, (1 - p) * (rain ? P.atmosphere.mistRain : P.atmosphere.mist))); g.addColorStop(1, rgba(P.mist, 0))
    c.fillStyle = g
    c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill()
  }
  c.restore()
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function drawMistBand(c: Ctx, L: HomeSceneLayout, P: ScenePalette, f: FrameParams, x0: number) {
  const rain = f.weather === 'rain'
  const drift = f.reducedMotion ? 0 : f.t * 10 * f.wind.direction * (0.4 + f.wind.strength)
  const span = L.W + 400
  for (let k = 0; k < 6; k++) {
    const x = ((((k * span) / 6 + drift) % span) + span) % span - 200 + x0 + L.over
    const y = L.mistY + Math.sin(k * 1.7) * L.h * 0.01
    const rx = L.w * 0.35, ry = L.h * (rain ? 0.05 : 0.032)
    c.save()
    c.translate(x, y); c.scale(1, ry / rx)
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, rgba(P.mist, rain ? P.atmosphere.mistRain : P.atmosphere.mist)); g.addColorStop(1, rgba(P.mist, 0))
    c.fillStyle = g
    c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill()
    c.restore()
  }
}

function drawRows(c: Ctx, S: StaticLayers, L: HomeSceneLayout, f: FrameParams, which: 'behind' | 'front') {
  const dpr = S.dpr
  for (const row of S.rows) {
    if ((row.root <= L.foreLine) !== (which === 'behind')) continue
    const x0 = layerX(L, f.pan, 0.45 + 0.55 * row.depth)
    const cw = L.W / GRASS_COLS
    const srcH = row.canvas.height
    for (let col = 0; col < GRASS_COLS; col++) {
      const dx = x0 + col * cw
      if (dx > L.w + 4 || dx + cw < -4) continue
      const x01 = (dx + cw / 2) / L.w
      const k = grassLean(f.t, x01, f.wind, row.amp, f.reducedMotion)
      // x' = x + k·(โคน − y) → โคนหญ้านิ่ง ปลายเลื่อนตามลม
      c.setTransform(dpr, 0, -k * dpr, dpr, k * row.root * dpr, 0)
      const sx = Math.floor(col * cw * dpr)
      const sw = Math.min(row.canvas.width - sx, Math.ceil((cw + 1) * dpr))
      c.drawImage(row.canvas as CanvasImageSource, sx, 0, sw, srcH, dx, row.top, sw / dpr, row.height)
    }
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawParticles(c: Ctx, L: HomeSceneLayout, P: ScenePalette, f: FrameParams, st: FrameState) {
  if (f.reducedMotion) return
  for (const p of st.petals) {
    const w = wind(f.t, p.x / L.w, f.wind)
    p.x += (w.strength * w.direction * 70 + Math.sin(f.t * 1.3 + p.phase) * 12) * f.dt
    p.y += p.vy * f.dt * (f.weather === 'rain' ? 1.6 : 1)
    p.spin += f.dt * 2.2
    if (p.y > L.h + 10) { p.y = -10; p.x = Math.random() * L.w }
    if (p.x > L.w + 20) p.x = -20
    if (p.x < -20) p.x = L.w + 20
    c.save()
    c.translate(p.x, p.y); c.rotate(p.spin)
    c.fillStyle = P.petal[p.color % P.petal.length]
    c.beginPath(); c.ellipse(0, 0, p.size, p.size * 0.55 * Math.abs(Math.cos(p.spin * 0.7)) + 0.6, 0, 0, TAU); c.fill()
    c.restore()
  }
  if (f.weather === 'clear') {
    for (const m of st.motes) {
      const w = wind(f.t, m.x / L.w, f.wind)
      m.x += w.strength * w.direction * 14 * f.dt
      m.y += m.vy * f.dt
      if (m.y < L.h * 0.15) m.y = L.h * 0.85
      if (m.x > L.w + 10) m.x = -10
      if (m.x < -10) m.x = L.w + 10
      const a = 0.35 + 0.35 * Math.sin(f.t * 1.6 + m.phase)
      const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 4)
      g.addColorStop(0, rgba(P.mote, a)); g.addColorStop(1, rgba(P.mote, 0))
      c.fillStyle = g
      c.beginPath(); c.arc(m.x, m.y, m.size * 4, 0, TAU); c.fill()
    }
  }
}

function drawLight(c: Ctx, L: HomeSceneLayout, P: ScenePalette, f: FrameParams) {
  if (f.weather === 'rain') return
  const strong = L.kind === 'forest-glade'
  const breathe = f.reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(f.t * 0.4)
  c.save()
  c.globalCompositeOperation = 'lighter'
  for (let k = 0; k < 4; k++) {
    const x = L.w * (0.02 + k * 0.13), spread = L.w * (0.05 + (k % 2) * 0.03)
    const g = c.createLinearGradient(x, 0, x + L.w * 0.35, L.h * 0.9)
    const a = (strong ? 0.08 : 0.035) * breathe * (1 - k * 0.15)
    g.addColorStop(0, rgba(P.light, a)); g.addColorStop(1, rgba(P.light, 0))
    c.fillStyle = g
    c.beginPath()
    c.moveTo(x, -10); c.lineTo(x + spread, -10)
    c.lineTo(x + spread + L.w * 0.42, L.h * 0.9); c.lineTo(x + L.w * 0.3, L.h * 0.9)
    c.closePath(); c.fill()
  }
  c.restore()
}

function drawRain(c: Ctx, L: HomeSceneLayout, P: ScenePalette, f: FrameParams, st: FrameState) {
  if (f.weather !== 'rain') return
  c.fillStyle = rgba(P.rainGrade, 0.2)
  c.fillRect(0, 0, L.w, L.h)
  if (f.reducedMotion) return
  const w = wind(f.t, 0.5, f.wind)
  const slant = w.strength * w.direction * 0.35
  c.strokeStyle = P.rainStreak
  c.lineWidth = 1.1
  c.beginPath()
  for (const d of st.rain) {
    d.y += 820 * f.dt
    d.x += slant * 820 * f.dt
    if (d.y > L.h) { d.y -= L.h + 20; d.x = Math.random() * L.w * 1.3 - L.w * 0.15 }
    c.moveTo(d.x, d.y); c.lineTo(d.x + slant * d.len, d.y + d.len)
  }
  c.stroke()
}

/** ประกอบ 1 เฟรม (ctx ต้องตั้ง transform เป็น dpr แล้ว) */
export function composeFrame(c: Ctx, S: StaticLayers, L: HomeSceneLayout, P: ScenePalette, f: FrameParams, st: FrameState) {
  c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)
  const back = layerX(L, f.pan, 0.1), mid = layerX(L, f.pan, 0.3)
  c.drawImage(S.back as CanvasImageSource, back, 0, L.W, L.h)
  drawClouds(c, L, f, back)
  c.drawImage(S.mid as CanvasImageSource, mid, 0, L.W, L.h)
  if (L.falls) drawFalls(c, L, P, f, mid)
  drawMistBand(c, L, P, f, mid)
  drawRows(c, S, L, f, 'behind')
  if (S.fore) c.drawImage(S.fore as CanvasImageSource, layerX(L, f.pan, 0.6), 0, L.W, L.h)
  drawRows(c, S, L, f, 'front')
  drawParticles(c, L, P, f, st)
  drawLight(c, L, P, f)
  drawRain(c, L, P, f, st)
  c.drawImage(S.overlay as CanvasImageSource, 0, 0, L.w, L.h)
}
