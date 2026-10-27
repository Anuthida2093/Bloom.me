import { useEffect, useRef, type CSSProperties } from 'react'
import { usePrefersReducedMotion } from '../../../../hooks/useMediaQuery'

/*============================================================================*\
  CanvasOwl.tsx — นกฮูกของหน้าก้าวเพื่อสุขภาพ วาดด้วย HTML Canvas ทั้งตัว (แทนรูป OwlAvatar.webp)
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ — รอบ 2: ดูมีชีวิตและสวยขึ้น]
  • หน้าตา: ขนนุ่มเป็นลายเกล็ด · ขอบตัวมีแสงจากซ้ายบน เงาขวาล่าง · ตาโตไล่สีมีประกาย 2 จุด · หางพัด · ปีกเป็นชั้นขน
  • ยืน: หายใจ · กะพริบตา (บางทีสองที) · ตากลอก · และสุ่ม "ท่าทาง" เป็นระยะ —
    หันหน้ามองซ้าย/ขวา · กระโดดเหยาะ (ย่อ-ยืดตัว) · ขยับปีก · ยิ้มตาหยี · กระดิกหู
  • flying = true: กระพือแบบตีลงเร็ว-ยกช้า (เหมือนนกจริง) ขนปลายปีกกาง ลอยขึ้นลงตามจังหวะ เก็บขา
  • [แก้ตามที่ระบุ] ตัว/หัวตั้งตรงบนจอเสมอ (ไม่หมุน ไม่เอียง) · outfit: ชาย = เจ้าชาย (มงกุฎ เสื้อคลุมแดง
    สายสะพาย) · หญิง = เจ้าหญิง (เทียร่า ชุดชมพูมีโบว์ สร้อยมุก)
  • พิกัดวาดอยู่ในกรอบ 200×200 (ปลายเท้า y≈176 → 88% ของกรอบ ใช้เป็นจุดยึดตอนวางบนเส้นทาง)
  • prefers-reduced-motion → วาดท่านิ่งครั้งเดียว ไม่วนแอนิเมชัน
\*============================================================================*/

interface CanvasOwlProps {
  /** ชุดตามเพศผู้เล่น (เจ้าชาย/เจ้าหญิง) — ไม่ใส่ = นกฮูกธรรมดา */
  outfit?: OwlOutfit
  size?: number
  flying?: boolean
  className?: string
  style?: CSSProperties
}

const C = {
  bodyDark: '#7E4F2B',
  body: '#A9713F',
  bodyLight: '#D29A5E',
  rim: 'rgba(255, 228, 180, 0.75)',
  cream: '#F7E9CF',
  creamShade: '#E8D2AC',
  belly: '#DCBF92',
  wingDark: '#6A4124',
  wing: '#8E5B32',
  wingLight: '#B9824D',
  featherLine: 'rgba(255, 236, 205, 0.55)',
  iris: ['#FFD27A', '#F39A2B', '#C8681A'] as const,
  pupil: '#241a2e',
  beak: '#F0A04B',
  beakDark: '#C77A2E',
  foot: '#E9963F',
  blush: 'rgba(244, 132, 132, 0.38)',
  shadow: 'rgba(0, 0, 0, 0.2)',
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** ขึ้น-ลงนุ่มๆ 0→1→0 ตลอดช่วง 0..1 */
const bump = (u: number) => (u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI))

type Action = 'look' | 'hop' | 'stretch' | 'happy' | 'ear'

interface AnimState {
  fly: number
  lookX: number; lookY: number; lookTX: number; lookTY: number; nextLookAt: number
  nextBlinkAt: number; blinkStart: number; doubleBlink: boolean
  action: Action | null; actionStart: number; actionDur: number; actionDir: number; nextActionAt: number
  headTurn: number
}

/** ปีกชี้ลง (แกน +y) จุดหมุนที่หัวไหล่ (0,0) · spread 0 = พับ, 1 = กางเต็ม (ขนปลายปีกแยกออก) */
function drawWing(ctx: CanvasRenderingContext2D, spread: number) {
  // ขนปลายปีก 4 เส้น — กางออกตาม spread
  for (let i = 3; i >= 0; i--) {
    ctx.save()
    ctx.rotate((i - 1.5) * 0.09 * (0.3 + spread))
    // ขนปลายมนรูปใบไม้ (ไม่แหลมเป็นเข็ม)
    const len = 40 + i * 2 + spread * 5
    ctx.beginPath()
    ctx.ellipse(i * 4 - 1, 12 + len * 0.42, 7, len * 0.46, -0.08 + i * 0.05, 0, Math.PI * 2)
    ctx.fillStyle = i % 2 ? C.wingDark : C.wing
    ctx.fill()
    ctx.strokeStyle = 'rgba(60, 35, 18, 0.35)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(i * 4 - 1, 16); ctx.lineTo(i * 4 - 1, 10 + len * 0.82); ctx.stroke()
    ctx.restore()
  }
  // ขนคลุมปีก (ก้อนบน)
  ctx.beginPath()
  ctx.moveTo(-8, -2)
  ctx.bezierCurveTo(14, -8, 22, 16, 16, 34)
  ctx.quadraticCurveTo(10, 40, 4, 33)
  ctx.quadraticCurveTo(-1, 40, -6, 31)
  ctx.bezierCurveTo(-12, 20, -12, 6, -8, -2)
  ctx.closePath()
  const g = ctx.createLinearGradient(-8, -4, 14, 36)
  g.addColorStop(0, C.wingLight)
  g.addColorStop(1, C.wing)
  ctx.fillStyle = g
  ctx.fill()
  // ลายขนเกล็ดบนปีก
  ctx.strokeStyle = C.featherLine
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  for (const [x, y] of [[0, 10], [7, 14], [2, 20], [9, 23], [4, 28]] as const) {
    ctx.beginPath()
    ctx.arc(x, y - 3, 3.4, 0.2, Math.PI - 0.2)
    ctx.stroke()
  }
}

function drawEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, lx: number, ly: number, blink: number, happy: number) {
  const R = 14.5
  if (happy > 0.5) {
    // ตาหยียิ้ม (^ ^)
    ctx.strokeStyle = C.pupil
    ctx.lineWidth = 3.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy + 4, 8, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
    return
  }
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = '#fffdf8'
  ctx.fill()
  ctx.clip()
  const ix = cx + lx * 3.2, iy = cy + ly * 3.2
  const ig = ctx.createRadialGradient(ix - 2, iy - 3, 1, ix, iy, 11.5)
  ig.addColorStop(0, C.iris[0]); ig.addColorStop(0.6, C.iris[1]); ig.addColorStop(1, C.iris[2])
  ctx.beginPath(); ctx.arc(ix, iy, 11.5, 0, Math.PI * 2); ctx.fillStyle = ig; ctx.fill()
  ctx.beginPath(); ctx.arc(cx + lx * 5, cy + ly * 5, 7.2, 0, Math.PI * 2); ctx.fillStyle = C.pupil; ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(cx + lx * 5 - 3.2, cy + ly * 5 - 3.6, 3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + lx * 5 + 3, cy + ly * 5 + 2.6, 1.4, 0, Math.PI * 2); ctx.fill()
  // เงาเปลือกตาบน (ทำให้ตาดูลึก)
  const sg = ctx.createLinearGradient(cx, cy - R, cx, cy - R + 8)
  sg.addColorStop(0, 'rgba(90, 50, 20, 0.28)'); sg.addColorStop(1, 'rgba(90, 50, 20, 0)')
  ctx.fillStyle = sg; ctx.fillRect(cx - R, cy - R, R * 2, 8)
  if (blink > 0.01) {
    const lidY = cy - R - 1 + (R * 2 + 2) * blink
    ctx.fillStyle = C.body
    ctx.fillRect(cx - R - 1, cy - R - 2, R * 2 + 2, lidY - (cy - R - 2))
    ctx.beginPath()
    ctx.moveTo(cx - R, lidY)
    ctx.quadraticCurveTo(cx, lidY + 4 * blink, cx + R, lidY)
    ctx.strokeStyle = C.bodyDark; ctx.lineWidth = 2; ctx.stroke()
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(126, 79, 43, 0.6)'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawFoot(ctx: CanvasRenderingContext2D, x: number, y: number, tuck: number) {
  ctx.strokeStyle = C.foot
  ctx.lineWidth = 3.6
  ctx.lineCap = 'round'
  const spreadX = lerp(4.5, 2, tuck)
  for (const k of [-1, 0, 1]) {
    ctx.beginPath()
    ctx.moveTo(x, y - 6)
    ctx.quadraticCurveTo(x + k * spreadX, y - 2, x + k * spreadX * 1.25, y + lerp(0, -3, tuck))
    ctx.stroke()
  }
}

/** ชุดตามเพศของผู้เล่น — ชาย = เจ้าชาย · หญิง = เจ้าหญิง (ไม่ระบุ = นกฮูกธรรมดา) */
export type OwlOutfit = 'prince' | 'princess' | null

const OUTFIT = {
  gold: '#f5c84a', goldDark: '#c9952a', gemRed: '#e04a5a', gemBlue: '#4f8be8',
  cape: '#c8323f', capeDark: '#8f1f2b', sash: '#3d6fd6', sashEdge: '#f5c84a',
  tiara: '#f2f0f6', tiaraShade: '#c8c2d8', gemPink: '#ff7fb0',
  dress: '#f9a8c9', dressDark: '#e07aa6', dressLight: '#ffd3e4', bow: '#ff6fa5', pearl: '#fffaf2',
}

/** เสื้อคลุมเจ้าชาย — อยู่หลังลำตัว ปลายบานพลิ้วออกนอกตัวเล็กน้อย */
function drawCape(ctx: CanvasRenderingContext2D, t: number, fly: number) {
  const sway = Math.sin(t * 1.6) * 2 + fly * 6
  ctx.beginPath()
  ctx.moveTo(-30, -8)
  ctx.quadraticCurveTo(-52 - sway * 0.3, 30, -48 - sway, 66)
  ctx.quadraticCurveTo(-24, 60, 0, 66)
  ctx.quadraticCurveTo(24, 60, 48 + sway, 66)
  ctx.quadraticCurveTo(52 + sway * 0.3, 30, 30, -8)
  ctx.closePath()
  const g = ctx.createLinearGradient(-40, 0, 40, 60)
  g.addColorStop(0, OUTFIT.cape); g.addColorStop(1, OUTFIT.capeDark)
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = OUTFIT.gold; ctx.lineWidth = 2.4
  ctx.beginPath(); ctx.moveTo(-48 - sway, 66); ctx.quadraticCurveTo(-24, 60, 0, 66); ctx.quadraticCurveTo(24, 60, 48 + sway, 66); ctx.stroke()
}

/** สายสะพายเจ้าชาย (ทแยงจากไหล่ซ้ายลงสะโพกขวา) + เข็มกลัดทอง */
function drawSash(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.beginPath(); ctx.ellipse(0, 18, 40, 44, 0, 0, Math.PI * 2); ctx.clip()
  ctx.beginPath()
  ctx.moveTo(-34, -6); ctx.lineTo(-22, -12); ctx.lineTo(38, 44); ctx.lineTo(28, 54); ctx.closePath()
  ctx.fillStyle = OUTFIT.sash; ctx.fill()
  ctx.strokeStyle = OUTFIT.sashEdge; ctx.lineWidth = 1.8; ctx.stroke()
  ctx.restore()
  ctx.fillStyle = OUTFIT.gold
  ctx.beginPath(); ctx.arc(-18, 2, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = OUTFIT.gemRed
  ctx.beginPath(); ctx.arc(-18, 2, 2.4, 0, Math.PI * 2); ctx.fill()
}

/** กระโปรงชุดเจ้าหญิง (บานจากเอวลงมา ชายหยัก) + โบว์ที่เอว */
function drawDress(ctx: CanvasRenderingContext2D, t: number) {
  const sway = Math.sin(t * 1.8) * 1.5
  ctx.beginPath()
  ctx.moveTo(-30, 22)
  ctx.quadraticCurveTo(-44 - sway, 44, -46 - sway, 60)
  for (let k = 0; k < 6; k++) {
    const x0 = -46 - sway + (k * (92 + sway * 2)) / 6, x1 = -46 - sway + ((k + 1) * (92 + sway * 2)) / 6
    ctx.quadraticCurveTo((x0 + x1) / 2, 68, x1, 60)
  }
  ctx.quadraticCurveTo(44 + sway, 44, 30, 22)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, 20, 0, 66)
  g.addColorStop(0, OUTFIT.dressLight); g.addColorStop(0.45, OUTFIT.dress); g.addColorStop(1, OUTFIT.dressDark)
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.6
  for (const x of [-22, 0, 22]) { ctx.beginPath(); ctx.moveTo(x * 0.6, 26); ctx.quadraticCurveTo(x * 0.9, 44, x, 60); ctx.stroke() }
  // โบว์
  ctx.fillStyle = OUTFIT.bow
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, 22)
    ctx.quadraticCurveTo(side * 16, 10, side * 18, 22)
    ctx.quadraticCurveTo(side * 16, 34, 0, 22)
    ctx.fill()
  }
  ctx.beginPath(); ctx.arc(0, 22, 4, 0, Math.PI * 2); ctx.fillStyle = '#ff8fbd'; ctx.fill()
}

/** สร้อยมุกใต้คาง */
function drawNecklace(ctx: CanvasRenderingContext2D, fx: number) {
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * (0.2 + (k / 8) * 0.6)
    const x = fx * 0.4 + Math.cos(a) * 20, y = -10 + Math.sin(a) * 10
    ctx.fillStyle = OUTFIT.pearl
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(190,160,140,.6)'; ctx.lineWidth = 0.8; ctx.stroke()
  }
  ctx.fillStyle = OUTFIT.gemPink
  ctx.beginPath(); ctx.moveTo(fx * 0.4, -2); ctx.lineTo(fx * 0.4 + 4, 3); ctx.lineTo(fx * 0.4, 8); ctx.lineTo(fx * 0.4 - 4, 3); ctx.closePath(); ctx.fill()
}

/** มงกุฎเจ้าชาย (ทอง 3 ยอด อัญมณีแดง/ฟ้า) */
function drawCrown(ctx: CanvasRenderingContext2D, fx: number) {
  const x = fx * 0.5, y = -72
  ctx.beginPath()
  ctx.moveTo(x - 18, y + 6)
  ctx.lineTo(x - 20, y - 12); ctx.lineTo(x - 9, y - 3)
  ctx.lineTo(x, y - 18); ctx.lineTo(x + 9, y - 3)
  ctx.lineTo(x + 20, y - 12); ctx.lineTo(x + 18, y + 6)
  ctx.closePath()
  const g = ctx.createLinearGradient(x - 18, y - 18, x + 18, y + 6)
  g.addColorStop(0, '#fff1a8'); g.addColorStop(0.5, OUTFIT.gold); g.addColorStop(1, OUTFIT.goldDark)
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = OUTFIT.goldDark; ctx.lineWidth = 1.4; ctx.stroke()
  for (const [dx, dy, col] of [[-20, -12, OUTFIT.gemBlue], [0, -18, OUTFIT.gemRed], [20, -12, OUTFIT.gemBlue]] as const) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.8, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = OUTFIT.gemRed; ctx.beginPath(); ctx.arc(x, y + 1, 3.2, 0, Math.PI * 2); ctx.fill()
}

/** มงกุฎเจ้าหญิง (เทียร่าโค้งสีเงิน อัญมณีชมพูกลาง) */
function drawTiara(ctx: CanvasRenderingContext2D, fx: number) {
  const x = fx * 0.5, y = -70
  ctx.beginPath()
  ctx.moveTo(x - 20, y + 4)
  ctx.quadraticCurveTo(x - 14, y - 6, x - 8, y - 4)
  ctx.lineTo(x, y - 16)
  ctx.lineTo(x + 8, y - 4)
  ctx.quadraticCurveTo(x + 14, y - 6, x + 20, y + 4)
  ctx.quadraticCurveTo(x, y - 2, x - 20, y + 4)
  ctx.closePath()
  const g = ctx.createLinearGradient(x, y - 16, x, y + 4)
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, OUTFIT.tiaraShade)
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = '#a89fbf'; ctx.lineWidth = 1.2; ctx.stroke()
  ctx.fillStyle = OUTFIT.gemPink
  ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 4, y - 6); ctx.lineTo(x, y - 1); ctx.lineTo(x - 4, y - 6); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#fff'
  for (const dx of [-12, 12]) { ctx.beginPath(); ctx.arc(x + dx, y - 3, 1.8, 0, Math.PI * 2); ctx.fill() }
}

function drawOwl(ctx: CanvasRenderingContext2D, t: number, s: AnimState, outfit: OwlOutfit = null) {
  const fly = s.fly
  // ── ท่าทางระหว่างยืน (0..1 ของท่าปัจจุบัน) ──
  const au = s.action ? (t - s.actionStart) / s.actionDur : -1
  const act = (a: Action) => (s.action === a ? bump(clamp01(au)) : 0)
  const hop = s.action === 'hop' ? clamp01(au) : -1
  // กระโดด: ย่อตัว → ลอย → ลงพื้นย่อ → คืนรูป
  let hopY = 0, hopSquash = 0
  if (hop >= 0) {
    if (hop < 0.2) hopSquash = bump(hop / 0.4) * 0.12
    else if (hop < 0.75) { hopY = -Math.sin(((hop - 0.2) / 0.55) * Math.PI) * 16; hopSquash = -0.06 }
    else hopSquash = bump((hop - 0.75) / 0.25) * 0.1
  }

  // ── บิน: ตีลงเร็ว ยกช้า ──
  const fp = (t * 2.1) % 1
  const flap = fp < 0.38 ? 1 - (fp / 0.38) * 2 : -1 + ((fp - 0.38) / 0.62) * 2 // +1 = ปีกบน → -1 = ปีกล่าง
  const breathe = Math.sin(t * 2.2)
  const bob = lerp(breathe * 1.1 + hopY, -flap * 5 - 10, fly)
  const squash = 1 + lerp(breathe * 0.014 + hopSquash, 0, fly)
  // [แก้ตามที่ระบุ] ตัวและหัวตั้งตรงเสมอ — ไม่มีการหมุน/เอียงใดๆ (ขยับได้แค่ขึ้น-ลง กะพริบตา กลอกตา กระพือปีก)
  s.headTurn = lerp(s.headTurn, fly > 0.5 ? 0.35 : act('look') * s.actionDir, 0.12)
  const turn = s.headTurn
  const happy = act('happy') > 0.25 ? 1 : 0
  const ear = act('ear')

  // ปีก: พับ ↔ กางกระพือ · ท่ายืดปีกตอนยืน
  const stretch = act('stretch')
  const wingFolded = 0.08 - stretch * 0.9
  const wingSpread = -(1.15 + flap * 0.85)
  const wingRot = lerp(wingFolded, wingSpread, fly)
  const featherSpread = Math.max(fly * (0.5 + flap * 0.5), stretch)

  // กะพริบตา
  const bt = t - s.blinkStart
  const one = (x: number) => (x >= 0 && x <= 0.16 ? 1 - Math.abs(x / 0.08 - 1) : 0)
  const blink = Math.max(one(bt), s.doubleBlink ? one(bt - 0.24) : 0)

  // เงาบนพื้น (เล็ก/จางลงเมื่อลอยสูง)
  const lift = clamp01(-bob / 24)
  ctx.save()
  ctx.translate(100, 176)
  ctx.scale(1, 0.22)
  ctx.beginPath()
  ctx.arc(0, 0, lerp(34, 22, lift), 0, Math.PI * 2)
  ctx.fillStyle = C.shadow
  ctx.globalAlpha = lerp(1, 0.45, lift)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.translate(100, 112 + bob)

  // ขา: ยืนเห็นเต็ม / บินเก็บขึ้นใต้ท้อง
  const footY = lerp(62, 48, fly)
  drawFoot(ctx, -13, footY, fly)
  drawFoot(ctx, 13, footY, fly)

  ctx.save()
  ctx.translate(0, 62)
  ctx.scale(1 / squash, squash)
  ctx.translate(0, -62)

  // หางพัด (หลังลำตัว)
  for (let i = -2; i <= 2; i++) {
    ctx.save()
    ctx.translate(0, 50)
    ctx.rotate(i * 0.2 * (1 + fly * 0.6))
    ctx.beginPath()
    ctx.ellipse(0, 10, 6, 14, 0, 0, Math.PI * 2)
    ctx.fillStyle = i % 2 ? C.wingDark : C.wing
    ctx.fill()
    ctx.restore()
  }
  if (outfit === 'prince') drawCape(ctx, t, fly)

  // ลำตัว: ไล่สี + แสงขอบซ้ายบน
  const bodyG = ctx.createRadialGradient(-16, -2, 6, 0, 18, 58)
  bodyG.addColorStop(0, C.bodyLight)
  bodyG.addColorStop(0.55, C.body)
  bodyG.addColorStop(1, C.bodyDark)
  ctx.beginPath()
  ctx.ellipse(0, 18, 40, 44, 0, 0, Math.PI * 2)
  ctx.fillStyle = bodyG
  ctx.fill()
  ctx.strokeStyle = C.rim
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.ellipse(0, 18, 38.5, 42.5, 0, Math.PI * 1.05, Math.PI * 1.45)
  ctx.stroke()

  // พุงครีม + ลายขนเกล็ด
  const bellyG = ctx.createLinearGradient(0, -6, 0, 58)
  bellyG.addColorStop(0, C.cream); bellyG.addColorStop(1, C.creamShade)
  ctx.beginPath()
  ctx.ellipse(0, 27, 26, 31, 0, 0, Math.PI * 2)
  ctx.fillStyle = bellyG
  ctx.fill()
  ctx.strokeStyle = C.belly
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  for (let row = 0; row < 4; row++) {
    const y = 12 + row * 11
    const n = row % 2 ? 3 : 2
    for (let k = 0; k < n; k++) {
      const x = (k - (n - 1) / 2) * 13
      ctx.beginPath()
      ctx.arc(x, y, 4.5, 0.25, Math.PI - 0.25)
      ctx.stroke()
    }
  }

  if (outfit === 'prince') drawSash(ctx)
  if (outfit === 'princess') drawDress(ctx, t)

  // ── หัว (หันซ้าย-ขวาด้วยการเลื่อนหน้า ไม่หมุน) ──
  ctx.save()
  ctx.translate(turn * 3, 0)
  const fx = turn * 7 // หน้าเลื่อนไปทางที่หัน

  // หูตั้ง (กระดิกได้)
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * 30, -64)
    ctx.rotate(side * (0.08 + ear * 0.25 * (side === s.actionDir ? 1 : 0.3)))
    ctx.beginPath()
    ctx.moveTo(-side * 8, 0)
    ctx.quadraticCurveTo(side * 8, -26, side * 14, -24)
    ctx.quadraticCurveTo(side * 16, -6, side * 8, 6)
    ctx.closePath()
    ctx.fillStyle = C.bodyDark
    ctx.fill()
    ctx.restore()
  }
  const headG = ctx.createRadialGradient(-18 + fx, -58, 6, fx * 0.5, -36, 52)
  headG.addColorStop(0, C.bodyLight)
  headG.addColorStop(0.6, C.body)
  headG.addColorStop(1, C.bodyDark)
  ctx.beginPath()
  ctx.ellipse(0, -36, 46, 40, 0, 0, Math.PI * 2)
  ctx.fillStyle = headG
  ctx.fill()
  ctx.strokeStyle = C.rim
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.ellipse(0, -36, 44.5, 38.5, 0, Math.PI * 1.1, Math.PI * 1.5)
  ctx.stroke()
  // ลายขนบนหัว
  ctx.strokeStyle = 'rgba(126, 79, 43, 0.45)'
  ctx.lineWidth = 1.6
  for (const [x, y] of [[-14, -66], [0, -69], [14, -66], [-26, -58], [26, -58]] as const) {
    ctx.beginPath(); ctx.arc(x + fx * 0.4, y, 3.4, 0.3, Math.PI - 0.3); ctx.stroke()
  }

  // หน้ากากรูปหัวใจรอบตา
  ctx.fillStyle = C.cream
  ctx.beginPath()
  ctx.arc(-17 + fx, -37, 20.5, 0, Math.PI * 2)
  ctx.arc(17 + fx, -37, 20.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-33 + fx, -28)
  ctx.quadraticCurveTo(fx, -2, 33 + fx, -28)
  ctx.lineTo(fx, -42)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(200, 160, 110, 0.6)'
  ctx.lineWidth = 1.6
  ctx.beginPath(); ctx.moveTo(fx, -52); ctx.lineTo(fx, -30); ctx.stroke()

  drawEye(ctx, -17 + fx, -38, s.lookX, s.lookY, blink, happy)
  drawEye(ctx, 17 + fx, -38, s.lookX, s.lookY, blink, happy)

  // แก้มแดง
  ctx.fillStyle = C.blush
  ctx.beginPath()
  ctx.ellipse(-29 + fx, -19, 7, 4, 0, 0, Math.PI * 2)
  ctx.ellipse(29 + fx, -19, 7, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // จะงอยปาก (มีแสงเงา)
  ctx.beginPath()
  ctx.moveTo(-6 + fx, -26)
  ctx.quadraticCurveTo(fx, -30, 6 + fx, -26)
  ctx.quadraticCurveTo(2 + fx, -16, fx, -12)
  ctx.quadraticCurveTo(-2 + fx, -16, -6 + fx, -26)
  const bg = ctx.createLinearGradient(-6 + fx, -28, 6 + fx, -12)
  bg.addColorStop(0, C.beak); bg.addColorStop(1, C.beakDark)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.beginPath(); ctx.ellipse(-2 + fx, -24, 1.6, 2.6, -0.3, 0, Math.PI * 2); ctx.fill()
  if (outfit === 'prince') drawCrown(ctx, fx)
  if (outfit === 'princess') { drawNecklace(ctx, fx); drawTiara(ctx, fx) }
  ctx.restore()

  // ปีกซ้าย-ขวา
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * 34, 4)
    ctx.scale(side, 1)
    ctx.rotate(wingRot)
    drawWing(ctx, featherSpread)
    ctx.restore()
  }

  ctx.restore()
  ctx.restore()
}

const ACTIONS: [Action, number, number][] = [
  // [ท่า, ความยาว (วิ), น้ำหนักการสุ่ม]
  ['look', 1.6, 3], ['hop', 0.7, 2], ['stretch', 1.1, 1.5], ['happy', 1.3, 1.5], ['ear', 0.6, 1.5],
]
function pickAction(): [Action, number] {
  const total = ACTIONS.reduce((a, [, , w]) => a + w, 0)
  let u = Math.random() * total
  for (const [a, d, w] of ACTIONS) { if ((u -= w) < 0) return [a, d] }
  return ['look', 1.6]
}

function freshState(flying: boolean): AnimState {
  return {
    fly: flying ? 1 : 0,
    lookX: 0, lookY: 0, lookTX: 0, lookTY: 0, nextLookAt: 0.8,
    nextBlinkAt: rand(1, 3), blinkStart: -10, doubleBlink: false,
    action: null, actionStart: 0, actionDur: 1, actionDir: 1, nextActionAt: rand(1.5, 3.5),
    headTurn: 0,
  }
}

export default function CanvasOwl({ size = 72, flying = false, outfit = null, className, style }: CanvasOwlProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const flyingRef = useRef(flying)
  // ลูปวาดอ่านท่าล่าสุดผ่าน ref (ไม่เริ่มลูปใหม่ทุกครั้งที่สลับบิน/ยืน)
  useEffect(() => { flyingRef.current = flying }, [flying])
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    const state = freshState(flyingRef.current)
    const render = (t: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform((size * dpr) / 200, 0, 0, (size * dpr) / 200, 0, 0)
      drawOwl(ctx, t, state, outfit)
    }

    if (reducedMotion) {
      render(0)
      return
    }

    let raf = 0
    let last = performance.now()
    const t0 = last
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = (now - t0) / 1000
      const flyingNow = flyingRef.current
      state.fly = lerp(state.fly, flyingNow ? 1 : 0, 1 - Math.exp(-dt * 6))
      // ท่าทางสุ่มตอนยืน (บินอยู่ = ยกเลิกท่า)
      if (flyingNow) state.action = null
      else if (state.action && t - state.actionStart > state.actionDur) {
        state.action = null
        state.nextActionAt = t + rand(1.5, 4)
      } else if (!state.action && t >= state.nextActionAt) {
        const [a, d] = pickAction()
        state.action = a; state.actionDur = d; state.actionStart = t; state.actionDir = Math.random() < 0.5 ? -1 : 1
      }
      // ตากลอก: ตอนบินมองไปข้างหน้า · หันหัวมองตามทิศที่หัน
      if (flyingNow) { state.lookTX = 0.7; state.lookTY = 0.1 }
      else if (state.action === 'look') { state.lookTX = state.actionDir * 0.9; state.lookTY = 0 }
      else if (t >= state.nextLookAt) {
        const centered = Math.random() < 0.35
        state.lookTX = centered ? 0 : rand(-1, 1)
        state.lookTY = centered ? 0 : rand(-0.6, 0.8)
        state.nextLookAt = t + rand(1.2, 3.2)
      }
      const k = 1 - Math.exp(-dt * 10)
      state.lookX = lerp(state.lookX, state.lookTX, k)
      state.lookY = lerp(state.lookY, state.lookTY, k)
      if (t >= state.nextBlinkAt) {
        state.blinkStart = t
        state.doubleBlink = Math.random() < 0.25
        state.nextBlinkAt = t + rand(2, 5)
      }
      render(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [size, reducedMotion, outfit])

  // reduced motion: วาดท่าใหม่เมื่อสลับบิน/ยืน
  useEffect(() => {
    if (!reducedMotion) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(canvas.width / 200, 0, 0, canvas.height / 200, 0, 0)
    drawOwl(ctx, 0, freshState(flying), outfit)
  }, [flying, reducedMotion, outfit])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, ...style }}
    />
  )
}
