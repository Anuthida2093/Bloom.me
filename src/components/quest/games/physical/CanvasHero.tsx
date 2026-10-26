import { useEffect, useRef, type CSSProperties } from 'react'
import { usePrefersReducedMotion } from '../../../../hooks/useMediaQuery'

/*============================================================================*\
  CanvasHero.tsx — [ใหม่ตามที่ระบุ] ตัวละครคน (เด็กนักผจญภัย) ที่เดินบนแผนที่ก้าวเพื่อสุขภาพ แทนนกฮูก
  ────────────────────────────────────────────────────────────────────────────
  วาดด้วย HTML Canvas ทั้งตัว (แบบเดียวกับ CanvasOwl ที่ผู้ใช้เลือก Canvas ไว้)
  • ชุดตามเพศผู้เล่น: ชาย = เจ้าชาย (มงกุฎ ผ้าคลุมแดง เสื้อฟ้าขลิบทอง) · หญิง = เจ้าหญิง (เทียร่า ผมยาว
    ชุดกระโปรงชมพู สร้อยมุก) · ไม่ระบุ = นักผจญภัย (เสื้อเขียว เข็มขัด สายเป้)
  • ยืน: หายใจ · กะพริบตา (บางทีสองที) · กลอกตา · สุ่มท่า — หันมอง / กระโดดเหยาะ / โบกมือ / ยิ้มตาหยี / ยืดแขน
  • walking = true: ก้าวขาสลับ แกว่งแขนสวน ตัวเด้งตามจังหวะก้าว หน้าหันไปทางที่เดิน
  • ตัว/หัวตั้งตรงบนจอเสมอ (ไม่หมุน ไม่เอียง) — หันซ้าย/ขวาด้วยการกลับด้าน (scaleX) จากตัวเรียก
  • พิกัดวาดอยู่ในกรอบ 200×200 (ปลายเท้า y≈176 → 88% ของกรอบ เท่ากับนกฮูกเดิม ใช้เป็นจุดยึดบนเส้นทาง)
  • prefers-reduced-motion → วาดท่านิ่งครั้งเดียว ไม่วนแอนิเมชัน
\*============================================================================*/

/** ชุดตามเพศของผู้เล่น — ชาย = เจ้าชาย · หญิง = เจ้าหญิง (ไม่ระบุ = นักผจญภัย) */
export type HeroOutfit = 'prince' | 'princess' | null

interface CanvasHeroProps {
  outfit?: HeroOutfit
  size?: number
  walking?: boolean
  className?: string
  style?: CSSProperties
}

const C = {
  skin: '#FFDDBF',
  skinShade: '#F0B892',
  skinLine: 'rgba(170, 100, 70, 0.55)',
  eye: '#2A1E2E',
  blush: 'rgba(244, 120, 120, 0.4)',
  mouth: '#B5524F',
  shadow: 'rgba(0, 0, 0, 0.2)',
  outline: 'rgba(60, 35, 25, 0.55)',
  gold: '#f5c84a', goldDark: '#c9952a', gemRed: '#e04a5a', gemBlue: '#4f8be8', gemPink: '#ff7fb0',
  pearl: '#fffaf2', tiaraShade: '#c8c2d8',
}

/** สีชุดแต่ละแบบ */
const LOOK = {
  prince: {
    hair: ['#6b4226', '#4a2c18'], top: ['#5f8ff0', '#3d6fd6', '#2a4fa8'], trim: C.gold,
    legs: '#f2ead8', shoe: '#7a4b28', cape: ['#d8404d', '#8f1f2b'],
  },
  princess: {
    hair: ['#b07040', '#7e4a26'], top: ['#ffd3e4', '#f9a8c9', '#e07aa6'], trim: '#fff2f8',
    legs: '#ffe8d4', shoe: '#e07aa6', cape: null,
  },
  explorer: {
    hair: ['#6b4226', '#4a2c18'], top: ['#9cd08a', '#6fae5f', '#4f8a45'], trim: '#f6ecd0',
    legs: '#8a6a48', shoe: '#6a4124', cape: null,
  },
} as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** ขึ้น-ลงนุ่มๆ 0→1→0 ตลอดช่วง 0..1 */
const bump = (u: number) => (u <= 0 || u >= 1 ? 0 : Math.sin(u * Math.PI))

type Action = 'look' | 'hop' | 'wave' | 'happy' | 'stretch'

interface AnimState {
  walk: number
  lookX: number; lookY: number; lookTX: number; lookTY: number; nextLookAt: number
  nextBlinkAt: number; blinkStart: number; doubleBlink: boolean
  action: Action | null; actionStart: number; actionDur: number; actionDir: number; nextActionAt: number
  headTurn: number
}

/** ขา: เส้นหนาปลายมนจากสะโพกถึงข้อเท้า + รองเท้า */
function drawLeg(ctx: CanvasRenderingContext2D, hx: number, hy: number, fx: number, fy: number, legs: string, shoe: string) {
  ctx.lineCap = 'round'
  ctx.strokeStyle = C.outline; ctx.lineWidth = 12
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy - 4); ctx.stroke()
  ctx.strokeStyle = legs; ctx.lineWidth = 9.5
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy - 4); ctx.stroke()
  ctx.fillStyle = shoe
  ctx.beginPath(); ctx.ellipse(fx + 2, fy - 1, 8.5, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.4; ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,.35)'
  ctx.beginPath(); ctx.ellipse(fx, fy - 3, 3.5, 1.6, 0, 0, Math.PI * 2); ctx.fill()
}

/** แขน: หมุนรอบหัวไหล่ (rot 0 = ห้อยลง, ค่าบวก = แกว่งไปข้างหน้า/ด้านนอก) + มือ */
function drawArm(ctx: CanvasRenderingContext2D, sx: number, sy: number, side: -1 | 1, rot: number, sleeve: string) {
  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(-side * rot)
  ctx.lineCap = 'round'
  ctx.strokeStyle = C.outline; ctx.lineWidth = 11.5
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * 3, 22); ctx.stroke()
  ctx.strokeStyle = sleeve; ctx.lineWidth = 9
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * 3, 22); ctx.stroke()
  ctx.fillStyle = C.skin
  ctx.beginPath(); ctx.arc(side * 3.5, 25, 5.4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = C.skinLine; ctx.lineWidth = 1.2; ctx.stroke()
  ctx.restore()
}

function drawEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, lx: number, ly: number, blink: number, happy: boolean) {
  if (happy) {
    ctx.strokeStyle = C.eye; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(cx, cy + 3, 5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()
    return
  }
  const ry = 6.2 * (1 - blink * 0.92)
  ctx.fillStyle = C.eye
  ctx.beginPath(); ctx.ellipse(cx + lx * 1.4, cy + ly * 1.2, 4.6, Math.max(0.6, ry), 0, 0, Math.PI * 2); ctx.fill()
  if (blink < 0.5) {
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(cx + lx * 1.4 - 1.6, cy + ly * 1.2 - 2.4, 1.8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + lx * 1.4 + 1.6, cy + ly * 1.2 + 2, 0.9, 0, Math.PI * 2); ctx.fill()
  }
}

/** มงกุฎเจ้าชาย (ทอง 3 ยอด อัญมณีแดง/ฟ้า) */
function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath()
  ctx.moveTo(x - 15, y + 5)
  ctx.lineTo(x - 17, y - 10); ctx.lineTo(x - 7.5, y - 2.5)
  ctx.lineTo(x, y - 15); ctx.lineTo(x + 7.5, y - 2.5)
  ctx.lineTo(x + 17, y - 10); ctx.lineTo(x + 15, y + 5)
  ctx.closePath()
  const g = ctx.createLinearGradient(x - 15, y - 15, x + 15, y + 5)
  g.addColorStop(0, '#fff1a8'); g.addColorStop(0.5, C.gold); g.addColorStop(1, C.goldDark)
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = C.goldDark; ctx.lineWidth = 1.3; ctx.stroke()
  for (const [dx, dy, col] of [[-17, -10, C.gemBlue], [0, -15, C.gemRed], [17, -10, C.gemBlue]] as const) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.4, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = C.gemRed; ctx.beginPath(); ctx.arc(x, y + 1, 2.8, 0, Math.PI * 2); ctx.fill()
}

/** เทียร่าเจ้าหญิง (โค้งสีเงิน อัญมณีชมพูกลาง) */
function drawTiara(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath()
  ctx.moveTo(x - 17, y + 4)
  ctx.quadraticCurveTo(x - 12, y - 5, x - 7, y - 3)
  ctx.lineTo(x, y - 13)
  ctx.lineTo(x + 7, y - 3)
  ctx.quadraticCurveTo(x + 12, y - 5, x + 17, y + 4)
  ctx.quadraticCurveTo(x, y - 1, x - 17, y + 4)
  ctx.closePath()
  const g = ctx.createLinearGradient(x, y - 13, x, y + 4)
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, C.tiaraShade)
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = '#a89fbf'; ctx.lineWidth = 1.1; ctx.stroke()
  ctx.fillStyle = C.gemPink
  ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 3.4, y - 5); ctx.lineTo(x, y - 0.5); ctx.lineTo(x - 3.4, y - 5); ctx.closePath(); ctx.fill()
}

/** ผมด้านหลัง (เจ้าหญิง = ผมยาวถึงหลัง) — วาดก่อนลำตัว */
function drawHairBack(ctx: CanvasRenderingContext2D, hx: number, hy: number, hair: readonly [string, string], sway: number) {
  ctx.beginPath()
  ctx.moveTo(hx - 34, hy - 6)
  ctx.quadraticCurveTo(hx - 42 - sway, hy + 40, hx - 30 - sway, hy + 62)
  ctx.quadraticCurveTo(hx, hy + 70, hx + 30 + sway, hy + 62)
  ctx.quadraticCurveTo(hx + 42 + sway, hy + 40, hx + 34, hy - 6)
  ctx.closePath()
  const g = ctx.createLinearGradient(hx, hy - 10, hx, hy + 66)
  g.addColorStop(0, hair[0]); g.addColorStop(1, hair[1])
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.6; ctx.stroke()
}

/** ผมด้านหน้า: ครอบหัวครึ่งบน + หน้าม้าหยัก (เจ้าหญิงมีปอยผมข้างแก้ม) */
function drawHairFront(ctx: CanvasRenderingContext2D, hx: number, hy: number, fx: number, hair: readonly [string, string], long: boolean) {
  const R = 35
  ctx.beginPath()
  ctx.arc(hx, hy - 1, R, Math.PI * 0.97, Math.PI * 2.03)
  // หน้าม้า: ไล่จากขวามาซ้ายเป็นปอยโค้ง
  const tips = [22, 12, 2, -8, -18, -28]
  let px = hx + R - 1
  for (const tx of tips) {
    const x = hx + tx + fx * 0.6
    ctx.quadraticCurveTo((px + x) / 2, hy - 2, x, hy - 14 + (Math.abs(tx) > 20 ? 6 : 0))
    px = x
  }
  ctx.quadraticCurveTo(hx - R + 2, hy - 8, hx - R + 1, hy + 2)
  ctx.closePath()
  const g = ctx.createLinearGradient(hx - 20, hy - R, hx + 20, hy)
  g.addColorStop(0, hair[0]); g.addColorStop(1, hair[1])
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.6; ctx.stroke()
  // ประกายผม
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(hx - 4, hy - 4, R - 8, Math.PI * 1.22, Math.PI * 1.42); ctx.stroke()
  if (long) {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(hx + side * (R - 3), hy - 8)
      ctx.quadraticCurveTo(hx + side * (R + 3), hy + 14, hx + side * (R - 4), hy + 28)
      ctx.quadraticCurveTo(hx + side * (R - 10), hy + 12, hx + side * (R - 9), hy - 4)
      ctx.closePath()
      ctx.fillStyle = hair[1]; ctx.fill()
      ctx.strokeStyle = C.outline; ctx.lineWidth = 1.2; ctx.stroke()
    }
  }
}

/** ผ้าคลุมเจ้าชาย — อยู่หลังลำตัว ปลายพลิ้ว (เดินแล้วสะบัดไปด้านหลังมากขึ้น) */
function drawCape(ctx: CanvasRenderingContext2D, y: number, t: number, walk: number, cape: readonly [string, string]) {
  const sway = Math.sin(t * 1.6) * 1.5 + walk * (4 + Math.sin(t * 9) * 2)
  ctx.beginPath()
  ctx.moveTo(-18, y)
  ctx.quadraticCurveTo(-30 - sway * 0.5, y + 26, -30 - sway, y + 52)
  ctx.quadraticCurveTo(-14, y + 48, 0, y + 53)
  ctx.quadraticCurveTo(14, y + 48, 30 - sway * 0.4, y + 52)
  ctx.quadraticCurveTo(30, y + 26, 18, y)
  ctx.closePath()
  const g = ctx.createLinearGradient(-30, y, 30, y + 52)
  g.addColorStop(0, cape[0]); g.addColorStop(1, cape[1])
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = C.outline; ctx.lineWidth = 1.4; ctx.stroke()
}

function drawHero(ctx: CanvasRenderingContext2D, t: number, s: AnimState, outfit: HeroOutfit = null) {
  const look = LOOK[outfit ?? 'explorer']
  const w = s.walk
  // ── ท่าทางระหว่างยืน (0..1 ของท่าปัจจุบัน) ──
  const au = s.action ? (t - s.actionStart) / s.actionDur : -1
  const act = (a: Action) => (s.action === a ? bump(clamp01(au)) : 0)
  const hop = s.action === 'hop' ? clamp01(au) : -1
  let hopY = 0
  if (hop >= 0.15 && hop < 0.8) hopY = -Math.sin(((hop - 0.15) / 0.65) * Math.PI) * 12
  const crouch = hop >= 0 && (hop < 0.15 || hop >= 0.8) ? bump(hop < 0.15 ? hop / 0.3 : (hop - 0.8) / 0.4 + 0.5) * 3 : 0

  // ── เดิน: ขาสลับ แขนแกว่งสวน ตัวเด้งทุกก้าว ──
  const phase = t * Math.PI * 2 * 1.8
  const swing = Math.sin(phase) * w
  const breathe = Math.sin(t * 2.2)
  const bob = -Math.abs(Math.sin(phase)) * 3.5 * w + hopY + crouch + breathe * 0.6 * (1 - w)

  // หันหน้า: เดิน = มองไปข้างหน้า (ทิศ +x — ตัวเรียกกลับด้านเองเมื่อเดินซ้าย) · ท่ามอง = หันตามทิศที่สุ่ม
  s.headTurn = lerp(s.headTurn, w > 0.5 ? 0.6 : act('look') * s.actionDir, 0.12)
  const fx = s.headTurn * 5
  const happy = act('happy') > 0.25
  const wave = act('wave')
  const stretch = act('stretch')

  const bt = t - s.blinkStart
  const one = (x: number) => (x >= 0 && x <= 0.16 ? 1 - Math.abs(x / 0.08 - 1) : 0)
  const blink = Math.max(one(bt), s.doubleBlink ? one(bt - 0.24) : 0)

  // เงาบนพื้น (เล็ก/จางลงเมื่อกระโดดสูง)
  const lift = clamp01(-hopY / 14)
  ctx.save()
  ctx.translate(100, 176)
  ctx.scale(1, 0.24)
  ctx.beginPath()
  ctx.arc(0, 0, lerp(30, 20, lift), 0, Math.PI * 2)
  ctx.fillStyle = C.shadow
  ctx.globalAlpha = lerp(1, 0.5, lift)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.translate(100, 0)
  const hx = fx * 0.5, hy = 68 + bob
  const shoulderY = 108 + bob, hipY = 140 + bob

  if (look.cape) drawCape(ctx, shoulderY - 2, t, w, look.cape)
  if (outfit === 'princess') drawHairBack(ctx, hx, hy, look.hair, w * 3 + Math.sin(t * 1.8))

  // ขา: เท้าอยู่บนพื้นเสมอ (ยกขึ้นเฉพาะขาที่กำลังก้าว / ตอนกระโดด)
  for (const side of [-1, 1] as const) {
    const sw = side === -1 ? swing : -swing
    const stepLift = Math.max(0, side === -1 ? Math.cos(phase) : -Math.cos(phase)) * 6 * w
    const footY = 173 - stepLift + Math.min(0, hopY)
    drawLeg(ctx, side * 8, hipY, side * 9 + sw * 10, footY, look.legs, look.shoe)
  }

  // แขนหลังลำตัวไม่มี — แขนวาดทับลำตัว (มองหน้าตรง) · แกว่งสวนขา · โบกมือ/ยืดแขนตอนยืน
  const armL = -swing * 0.55 + stretch * 2.7
  const armR = swing * 0.55 + stretch * 2.7 + wave * (2.5 + Math.sin(t * 16) * 0.35)

  // ── ลำตัว ──
  if (outfit === 'princess') {
    // เสื้อตัวบน + กระโปรงบานชายหยัก
    ctx.beginPath()
    ctx.moveTo(-15, shoulderY - 2)
    ctx.quadraticCurveTo(0, shoulderY - 6, 15, shoulderY - 2)
    ctx.lineTo(13, shoulderY + 20); ctx.lineTo(-13, shoulderY + 20)
    ctx.closePath()
    ctx.fillStyle = look.top[1]; ctx.fill()
    ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5; ctx.stroke()
    const sway = Math.sin(t * 1.8) * 1.2 + swing * 2
    const top = shoulderY + 16, hem = shoulderY + 50
    ctx.beginPath()
    ctx.moveTo(-14, top)
    ctx.quadraticCurveTo(-30 - sway, top + 16, -32 - sway, hem)
    for (let k = 0; k < 6; k++) {
      const x0 = -32 - sway + (k * (64 + sway * 2)) / 6, x1 = -32 - sway + ((k + 1) * (64 + sway * 2)) / 6
      ctx.quadraticCurveTo((x0 + x1) / 2, hem + 6, x1, hem)
    }
    ctx.quadraticCurveTo(30 + sway, top + 16, 14, top)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, top, 0, hem + 6)
    g.addColorStop(0, look.top[0]); g.addColorStop(0.45, look.top[1]); g.addColorStop(1, look.top[2])
    ctx.fillStyle = g; ctx.fill()
    ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.4
    for (const x of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(x * 0.5, top + 4); ctx.quadraticCurveTo(x * 0.85, top + 18, x * 1.3, hem - 2); ctx.stroke() }
    // โบว์ที่เอว
    ctx.fillStyle = '#ff6fa5'
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, top); ctx.quadraticCurveTo(side * 11, top - 8, side * 12, top); ctx.quadraticCurveTo(side * 11, top + 8, 0, top); ctx.fill()
    }
    ctx.beginPath(); ctx.arc(0, top, 3, 0, Math.PI * 2); ctx.fillStyle = '#ff8fbd'; ctx.fill()
  } else {
    // เสื้อตัวยาว (ทูนิก) บานลงเล็กน้อย
    ctx.beginPath()
    ctx.moveTo(-16, shoulderY - 2)
    ctx.quadraticCurveTo(0, shoulderY - 6, 16, shoulderY - 2)
    ctx.quadraticCurveTo(20, shoulderY + 18, 21, hipY + 4)
    ctx.quadraticCurveTo(0, hipY + 8, -21, hipY + 4)
    ctx.quadraticCurveTo(-20, shoulderY + 18, -16, shoulderY - 2)
    ctx.closePath()
    const g = ctx.createLinearGradient(-20, shoulderY, 20, hipY + 6)
    g.addColorStop(0, look.top[0]); g.addColorStop(0.5, look.top[1]); g.addColorStop(1, look.top[2])
    ctx.fillStyle = g; ctx.fill()
    ctx.strokeStyle = C.outline; ctx.lineWidth = 1.5; ctx.stroke()
    // ขลิบชายเสื้อ + เข็มขัด
    ctx.strokeStyle = look.trim; ctx.lineWidth = 2.4
    ctx.beginPath(); ctx.moveTo(-20, hipY + 1); ctx.quadraticCurveTo(0, hipY + 5, 20, hipY + 1); ctx.stroke()
    ctx.fillStyle = outfit === 'prince' ? C.gold : '#7a5232'
    ctx.fillRect(-18, shoulderY + 22, 36, 5)
    ctx.fillStyle = outfit === 'prince' ? C.gemRed : '#d9b46a'
    ctx.fillRect(-3.5, shoulderY + 21, 7, 7)
    if (outfit === 'prince') {
      // สายสะพายทแยงจากไหล่ซ้าย
      ctx.save()
      ctx.beginPath(); ctx.rect(-21, shoulderY - 4, 42, 26); ctx.clip()
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(-14, shoulderY - 2); ctx.lineTo(16, shoulderY + 22); ctx.stroke()
      ctx.restore()
    } else {
      // สายเป้นักผจญภัย
      ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 3
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 11, shoulderY - 3); ctx.lineTo(side * 9, shoulderY + 21); ctx.stroke() }
    }
  }

  drawArm(ctx, -16, shoulderY + 2, -1, armL, look.top[1])
  drawArm(ctx, 16, shoulderY + 2, 1, armR, look.top[1])

  // ── หัว (หันซ้าย-ขวาด้วยการเลื่อนหน้า ไม่หมุน) ──
  ctx.fillStyle = C.skinShade
  ctx.fillRect(hx - 5, hy + 26, 10, 10) // คอ
  for (const side of [-1, 1]) {
    ctx.fillStyle = C.skin
    ctx.beginPath(); ctx.ellipse(hx + side * 33, hy + 6, 5.5, 7, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = C.skinLine; ctx.lineWidth = 1.2; ctx.stroke()
  }
  const headG = ctx.createRadialGradient(hx - 12, hy - 10, 6, hx, hy + 4, 40)
  headG.addColorStop(0, '#fff0e2'); headG.addColorStop(0.6, C.skin); headG.addColorStop(1, C.skinShade)
  ctx.beginPath()
  ctx.ellipse(hx, hy + 2, 33, 31, 0, 0, Math.PI * 2)
  ctx.fillStyle = headG; ctx.fill()
  ctx.strokeStyle = C.skinLine; ctx.lineWidth = 1.6; ctx.stroke()

  const ex = hx + fx, ey = hy + 6
  drawEye(ctx, ex - 11, ey, s.lookX, s.lookY, blink, happy)
  drawEye(ctx, ex + 11, ey, s.lookX, s.lookY, blink, happy)
  ctx.fillStyle = C.blush
  ctx.beginPath()
  ctx.ellipse(ex - 19, ey + 9, 5.5, 3.2, 0, 0, Math.PI * 2)
  ctx.ellipse(ex + 19, ey + 9, 5.5, 3.2, 0, 0, Math.PI * 2)
  ctx.fill()
  // ปาก: ยิ้ม · เดิน/ดีใจ = อ้าเล็กน้อย
  const open = Math.max(w * 0.6, happy ? 1 : 0, wave * 0.8)
  ctx.strokeStyle = C.mouth; ctx.lineWidth = 2; ctx.lineCap = 'round'
  if (open > 0.4) {
    ctx.fillStyle = C.mouth
    ctx.beginPath(); ctx.moveTo(ex - 5, ey + 12); ctx.quadraticCurveTo(ex, ey + 20, ex + 5, ey + 12); ctx.closePath(); ctx.fill()
  } else {
    ctx.beginPath(); ctx.arc(ex, ey + 9, 5, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke()
  }

  drawHairFront(ctx, hx, hy, fx, look.hair, outfit === 'princess')
  if (outfit === 'prince') drawCrown(ctx, hx + fx * 0.4, hy - 32)
  if (outfit === 'princess') {
    // สร้อยมุกที่คอ
    for (let k = 0; k <= 6; k++) {
      const a = Math.PI * (0.25 + (k / 6) * 0.5)
      ctx.fillStyle = C.pearl
      ctx.beginPath(); ctx.arc(hx + Math.cos(a) * 11, hy + 30 + Math.sin(a) * 5, 2, 0, Math.PI * 2); ctx.fill()
    }
    drawTiara(ctx, hx + fx * 0.4, hy - 30)
  }
  ctx.restore()
}

const ACTIONS: [Action, number, number][] = [
  // [ท่า, ความยาว (วิ), น้ำหนักการสุ่ม]
  ['look', 1.6, 3], ['hop', 0.7, 2], ['wave', 1.4, 2], ['happy', 1.3, 1.5], ['stretch', 1.2, 1],
]
function pickAction(): [Action, number] {
  const total = ACTIONS.reduce((a, [, , w]) => a + w, 0)
  let u = Math.random() * total
  for (const [a, d, w] of ACTIONS) { if ((u -= w) < 0) return [a, d] }
  return ['look', 1.6]
}

function freshState(walking: boolean): AnimState {
  return {
    walk: walking ? 1 : 0,
    lookX: 0, lookY: 0, lookTX: 0, lookTY: 0, nextLookAt: 0.8,
    nextBlinkAt: rand(1, 3), blinkStart: -10, doubleBlink: false,
    action: null, actionStart: 0, actionDur: 1, actionDir: 1, nextActionAt: rand(1.5, 3.5),
    headTurn: 0,
  }
}

export default function CanvasHero({ size = 72, walking = false, outfit = null, className, style }: CanvasHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const walkingRef = useRef(walking)
  // ลูปวาดอ่านท่าล่าสุดผ่าน ref (ไม่เริ่มลูปใหม่ทุกครั้งที่สลับเดิน/ยืน)
  useEffect(() => { walkingRef.current = walking }, [walking])
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(3, window.devicePixelRatio || 1)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)
    const state = freshState(walkingRef.current)
    const render = (t: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform((size * dpr) / 200, 0, 0, (size * dpr) / 200, 0, 0)
      drawHero(ctx, t, state, outfit)
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
      const walkingNow = walkingRef.current
      state.walk = lerp(state.walk, walkingNow ? 1 : 0, 1 - Math.exp(-dt * 8))
      // ท่าทางสุ่มตอนยืน (เดินอยู่ = ยกเลิกท่า)
      if (walkingNow) state.action = null
      else if (state.action && t - state.actionStart > state.actionDur) {
        state.action = null
        state.nextActionAt = t + rand(1.5, 4)
      } else if (!state.action && t >= state.nextActionAt) {
        const [a, d] = pickAction()
        state.action = a; state.actionDur = d; state.actionStart = t; state.actionDir = Math.random() < 0.5 ? -1 : 1
      }
      // ตากลอก: ตอนเดินมองไปข้างหน้า · ท่ามอง = มองตามทิศที่หัน
      if (walkingNow) { state.lookTX = 0.8; state.lookTY = 0 }
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

  // reduced motion: วาดท่าใหม่เมื่อสลับเดิน/ยืน
  useEffect(() => {
    if (!reducedMotion) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(canvas.width / 200, 0, 0, canvas.height / 200, 0, 0)
    drawHero(ctx, 0, freshState(walking), outfit)
  }, [walking, reducedMotion, outfit])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, ...style }}
    />
  )
}
