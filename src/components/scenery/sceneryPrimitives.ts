import type { Rgb, ScenePalette } from '../../config/generatedMapArt'
import { mulberry32 } from '../../utils/seededRandom'
import { CASTLE, GATE, type SceneryObject } from './sceneryShapes'
import { drawStyledBush, drawStyledTree, treeLodFor } from './storybookTrees'

/*============================================================================*\
  sceneryPrimitives — วาดฉากประกอบลง canvas 2D (เห็ด คริสตัล ประตู ปราสาท ถ้ำ แสงเรือง เงา · ต้นไม้/พุ่มอยู่ที่ storybookTrees)
  ────────────────────────────────────────────────────────────────────────────
  ใช้ได้ทั้ง CanvasRenderingContext2D และ OffscreenCanvasRenderingContext2D (วาดใน worker ได้)
  ทุกชิ้นวาดอยู่ภายในรอยเท้าใน sceneryShapes.ts — สีทั้งหมดมาจาก ScenePalette (config/generatedMapArt.ts)
  แยกเป็นโมดูลกลางให้ฉากอื่นใช้ซ้ำได้ (เช่น ป่ารอบแผนที่ 1)
\*============================================================================*/

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const TAU = Math.PI * 2
export const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`

export function shadow(c: Ctx2D, pal: ScenePalette, x: number, y: number, rx: number, ry: number, alpha: number) {
  c.fillStyle = rgba(pal.shadow, alpha)
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill()
}

export function glow(c: Ctx2D, x: number, y: number, r: number, color: Rgb, alpha: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(color, alpha))
  g.addColorStop(1, rgba(color, 0))
  c.fillStyle = g
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill()
}

/** ดาวประกาย 4 แฉก */
function sparkle(c: Ctx2D, x: number, y: number, r: number, color: string) {
  c.fillStyle = color
  c.beginPath()
  c.moveTo(x, y - r)
  c.quadraticCurveTo(x, y, x + r, y)
  c.quadraticCurveTo(x, y, x, y + r)
  c.quadraticCurveTo(x, y, x - r, y)
  c.quadraticCurveTo(x, y, x, y - r)
  c.fill()
}

/** [แก้ตามที่ระบุ] คริสตัลเรืองแสงชัดขึ้น: รัศมีแสงรอบกอ + แอ่งแสงบนพื้น + ลำแสงจากยอด + ประกายดาวที่ปลายแท่ง */
export function drawCrystal(c: Ctx2D, pal: ScenePalette, x: number, y: number, r: number, seed: number) {
  const rnd = mulberry32(seed)
  const P = pal.crystal
  c.save()
  // แสงที่ส่องลงพื้น + รัศมีแสงรอบทั้งกอ (วาดก่อนแท่ง)
  c.save()
  c.translate(x, y + r * 0.05); c.scale(1, 0.32)
  glow(c, 0, 0, r * 2.1, P.glow, 0.55)
  c.restore()
  glow(c, x, y - r * 0.9, r * 2.5, P.glow, 0.42)
  shadow(c, pal, x, y + r * 0.12, r * 0.95, r * 0.2, 0.22)
  c.shadowColor = rgba(P.glow, 0.9)
  c.shadowBlur = r * 0.9
  const n = 3 + Math.floor(rnd() * 3)
  const items = Array.from({ length: n }, (_, i) => ({
    dx: (i - (n - 1) / 2) * r * 0.46 + (rnd() - 0.5) * r * 0.2,
    h: r * (1.25 + rnd()),
    w: r * (0.38 + rnd() * 0.14),
    tilt: (rnd() - 0.5) * r * 0.55,
  })).sort((a, b) => a.h - b.h)
  const tips: [number, number][] = []
  items.forEach((k, idx) => {
    const cx = x + k.dx, by = y + (idx % 2) * 3, top: [number, number] = [cx + k.tilt, by - k.h], sh = by - k.h * 0.7, hw = k.w / 2
    tips.push(top)
    const pts: [number, number][] = [[cx - hw, by], [cx - hw * 1.08 + k.tilt * 0.25, sh], top, [cx + hw + k.tilt * 0.25, sh + k.h * 0.06], [cx + hw, by]]
    const trace = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath() }
    trace()
    const g = c.createLinearGradient(cx - hw, by, cx + hw, by - k.h)
    g.addColorStop(0, P.dark); g.addColorStop(0.55, P.mid); g.addColorStop(1, P.light)
    c.fillStyle = g; c.fill(); c.shadowBlur = 0
    c.fillStyle = P.facetLight
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.lineTo(top[0], top[1]); c.lineTo(cx + k.tilt * 0.3, by); c.closePath(); c.fill()
    c.fillStyle = P.facetDark
    c.beginPath(); c.moveTo(cx + k.tilt * 0.3, by); c.lineTo(top[0], top[1]); c.lineTo(pts[3][0], pts[3][1]); c.lineTo(pts[4][0], pts[4][1]); c.closePath(); c.fill()
    // แกนแสงในแท่ง (สว่างจากข้างใน)
    const core = c.createLinearGradient(cx, by, top[0], top[1])
    core.addColorStop(0, 'rgba(255,255,255,0)'); core.addColorStop(0.7, 'rgba(255,255,255,.55)'); core.addColorStop(1, 'rgba(255,255,255,.9)')
    c.strokeStyle = core; c.lineWidth = Math.max(1.5, hw * 0.35)
    c.beginPath(); c.moveTo(cx + k.tilt * 0.15, by - k.h * 0.1); c.lineTo(top[0] - k.tilt * 0.05, top[1] + k.h * 0.12); c.stroke()
    c.strokeStyle = P.edge; c.lineWidth = 1.6; trace(); c.stroke()
    c.shadowBlur = r * 0.7
  })
  c.shadowBlur = 0
  // ลำแสงจางๆ แผ่ออกจากยอดแท่งสูงสุด + ประกายดาวที่ปลายแท่ง
  const [tx, ty] = tips[tips.length - 1]
  c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42 + (rnd() - 0.5) * 0.15, L = r * (1.3 + rnd() * 0.8)
    const g = c.createLinearGradient(tx, ty, tx + Math.cos(a) * L, ty + Math.sin(a) * L)
    g.addColorStop(0, rgba(P.glow, 0.45)); g.addColorStop(1, rgba(P.glow, 0))
    c.strokeStyle = g; c.lineWidth = r * 0.12; c.lineCap = 'round'
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + Math.cos(a) * L, ty + Math.sin(a) * L); c.stroke()
  }
  c.globalCompositeOperation = 'source-over'
  tips.forEach(([px, py], i) => {
    if (i < tips.length - 2) return
    glow(c, px, py, r * 0.45, P.glow, 0.8)
    sparkle(c, px, py, r * (i === tips.length - 1 ? 0.32 : 0.22), P.sparkle)
  })
  c.restore()
}

/** [แก้ตามที่ระบุ] เห็ดมีมิติ: ก้านทรงกระบอกเรียวสอบ + วงแหวนใต้หมวก + หมวกโดมมีความหนา (ขอบล่างโค้งเข้าหาคนดู)
 *  แสงจากซ้ายบน (ไฮไลต์) → เงาขวาล่าง · จุดบนหมวกบีบตามความโค้ง · เงาหมวกตกบนก้าน · ขอบสว่างด้านขวา */
export function drawMushroom(c: Ctx2D, pal: ScenePalette, o: Extract<SceneryObject, { type: 'mushroom' }>) {
  const { x, y, size: s, kind } = o
  const M = pal.mushroom
  const stemH = s * 0.85, stemW = s * 0.36, capW = s * 0.95, capH = s * 0.62, cy = y - stemH
  const glows = kind === 'blue' || kind === 'purple' || kind === 'rainbow'
  if (glows) glow(c, x, cy - capH * 0.3, capW * 1.9, M.glow[kind], 0.35)
  shadow(c, pal, x + s * 0.1, y + 2, capW * 0.78, s * 0.16, 0.3)

  // ก้าน: กว้างที่โคน เรียวขึ้นหาหมวก
  const stem = () => {
    c.beginPath()
    c.moveTo(x - stemW * 0.4, cy)
    c.quadraticCurveTo(x - stemW * 0.62, y - stemH * 0.35, x - stemW * 0.56, y)
    c.quadraticCurveTo(x, y + stemW * 0.2, x + stemW * 0.56, y)
    c.quadraticCurveTo(x + stemW * 0.62, y - stemH * 0.35, x + stemW * 0.4, cy)
    c.closePath()
  }
  stem(); c.strokeStyle = pal.outline; c.lineWidth = 3.6; c.stroke()
  const sg = c.createLinearGradient(x - stemW * 0.6, 0, x + stemW * 0.6, 0)
  sg.addColorStop(0, M.stemTones[0]); sg.addColorStop(0.45, M.stemTones[1]); sg.addColorStop(1, M.stemTones[2])
  stem(); c.fillStyle = sg; c.fill()
  // วงแหวน (กระโปรง) ใต้หมวก
  const ringY = cy + stemH * 0.24
  c.fillStyle = M.stemTones[1]
  c.beginPath(); c.ellipse(x, ringY, stemW * 0.62, stemW * 0.16, 0, 0, TAU); c.fill()
  c.strokeStyle = M.stemShade; c.lineWidth = 1.4; c.stroke()

  // หมวก: โดมด้านบน + ขอบล่างโค้งลงเล็กน้อย = มีความหนา
  const cap = () => {
    c.beginPath()
    c.ellipse(x, cy, capW, capH, 0, Math.PI, TAU)
    c.ellipse(x, cy, capW, capH * 0.24, 0, 0, Math.PI)
    c.closePath()
  }
  c.save()
  if (glows) { c.shadowColor = rgba(M.glow[kind], 0.9); c.shadowBlur = s * 0.6 }
  cap()
  let fill: CanvasGradient
  if (kind === 'rainbow') {
    fill = c.createLinearGradient(x - capW, cy, x + capW, cy)
    M.rainbow.forEach((col, i) => fill.addColorStop(i / (M.rainbow.length - 1), col))
  } else {
    fill = c.createRadialGradient(x - capW * 0.35, cy - capH * 0.75, capW * 0.08, x, cy - capH * 0.2, capW * 1.15)
    fill.addColorStop(0, M.caps[kind][0]); fill.addColorStop(0.55, M.caps[kind][0]); fill.addColorStop(1, M.caps[kind][1])
  }
  c.fillStyle = fill; c.fill(); c.shadowBlur = 0
  c.restore()
  // แสงเงาทับสีหมวก: สว่างซ้ายบน → มืดขวาล่าง (ทำให้ดูกลม)
  c.save()
  cap(); c.clip()
  const shade = c.createRadialGradient(x - capW * 0.4, cy - capH * 0.85, 0, x - capW * 0.2, cy - capH * 0.5, capW * 1.6)
  shade.addColorStop(0, 'rgba(255,255,255,.38)'); shade.addColorStop(0.35, 'rgba(255,255,255,0)')
  shade.addColorStop(0.75, 'rgba(0,0,0,.08)'); shade.addColorStop(1, 'rgba(0,0,0,.3)')
  c.fillStyle = shade; c.fillRect(x - capW, cy - capH, capW * 2, capH * 1.3)
  // ขอบล่างของหมวกมืดลง (ด้านใต้ที่หันออกจากแสง)
  c.fillStyle = 'rgba(40,20,30,.22)'
  c.beginPath(); c.ellipse(x, cy + capH * 0.02, capW, capH * 0.22, 0, 0, TAU); c.fill()
  // จุดบนหมวก บีบตามความโค้ง (ยิ่งใกล้ขอบยิ่งแคบ)
  if (kind === 'red' || kind === 'orange' || kind === 'pink') {
    for (const [dx, dy, dr] of [[-0.55, -0.32, 0.12], [-0.12, -0.7, 0.15], [0.42, -0.45, 0.13], [0.72, -0.14, 0.09], [-0.22, -0.2, 0.1], [0.18, -0.15, 0.08]]) {
      const sx = x + capW * dx, sy = cy + capH * dy, rx = capW * dr * (1 - Math.abs(dx) * 0.55), ry = capW * dr * (0.6 + (-dy) * 0.35)
      c.fillStyle = 'rgba(60,20,20,.18)'
      c.beginPath(); c.ellipse(sx + rx * 0.15, sy + ry * 0.2, rx, ry, dx * 0.6, 0, TAU); c.fill()
      c.fillStyle = M.spots
      c.beginPath(); c.ellipse(sx, sy, rx, ry, dx * 0.6, 0, TAU); c.fill()
    }
  }
  c.restore()
  cap(); c.strokeStyle = pal.outline; c.lineWidth = 2.4; c.stroke()
  // ขอบสว่างด้านขวาบน (แสงสะท้อน) + ไฮไลต์มันวาว
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.6
  c.beginPath(); c.ellipse(x, cy, capW * 0.9, capH * 0.9, 0, -Math.PI * 0.42, -Math.PI * 0.12); c.stroke()
  c.fillStyle = M.shine
  c.beginPath(); c.ellipse(x - capW * 0.4, cy - capH * 0.62, capW * 0.2, capH * 0.12, -0.5, 0, TAU); c.fill()
  c.fillStyle = 'rgba(255,255,255,.85)'
  c.beginPath(); c.arc(x - capW * 0.22, cy - capH * 0.78, capW * 0.045, 0, TAU); c.fill()
  // เงาหมวกตกบนก้าน
  c.fillStyle = 'rgba(70,40,30,.22)'
  c.beginPath(); c.ellipse(x, cy + capH * 0.22, stemW * 0.45, stemW * 0.14, 0, 0, TAU); c.fill()
}

export function drawGate(c: Ctx2D, pal: ScenePalette, o: Extract<SceneryObject, { type: 'gate' }>) {
  const { x: cx, y: by, style } = o
  const G = pal.gate
  const { pillarWidth: pw, pillarHeight: ph, gap } = GATE
  const top = by - ph
  const st = style === 'stone' ? G.stone : G.wood
  shadow(c, pal, cx, by + 4, gap + pw + 34, 16, 0.3)
  const pillar = (px: number) => {
    c.fillStyle = pal.outline
    c.beginPath(); c.roundRect(px - 2, top - 2, pw + 4, ph + 4, 6); c.fill()
    const g = c.createLinearGradient(px, 0, px + pw, 0)
    g.addColorStop(0, st[0]); g.addColorStop(0.6, st[1]); g.addColorStop(1, st[2])
    c.fillStyle = g
    c.beginPath(); c.roundRect(px, top, pw, ph, 5); c.fill()
    c.strokeStyle = 'rgba(20,20,20,.22)'; c.lineWidth = 1.4
    for (let yy = top + 26, i = 0; yy < by - 6; yy += 30, i++) {
      c.beginPath(); c.moveTo(px, yy); c.lineTo(px + pw, yy); c.stroke()
      const jx = px + pw * (i % 2 ? 0.35 : 0.65)
      c.beginPath(); c.moveTo(jx, yy - 30); c.lineTo(jx, yy); c.stroke()
    }
    c.fillStyle = pal.outline
    c.beginPath(); c.roundRect(px - 8, top - 18, pw + 16, 22, 5); c.fill()
    c.fillStyle = st[0]
    c.beginPath(); c.roundRect(px - 6, top - 16, pw + 12, 18, 4); c.fill()
  }
  pillar(cx - gap - pw); pillar(cx + gap)

  // ซุ้มโค้ง + หินหัวซุ้ม + อัญมณีเรืองแสง
  const acy = top + 8, arx = gap + pw / 2, ary = 78
  const arc = (w: number, col: string) => {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'butt'
    c.beginPath(); c.ellipse(cx, acy, arx, ary, 0, Math.PI, TAU); c.stroke()
  }
  arc(42, pal.outline); arc(34, st[1]); arc(22, st[0]); arc(5, 'rgba(255,255,255,.35)')
  c.fillStyle = pal.outline
  c.beginPath(); c.roundRect(cx - 18, acy - ary - 24, 36, 34, 6); c.fill()
  c.fillStyle = st[0]
  c.beginPath(); c.roundRect(cx - 15, acy - ary - 21, 30, 28, 5); c.fill()
  c.save()
  c.shadowColor = rgba(style === 'stone' ? G.gem.glowStone : G.gem.glowWood, 0.9)
  c.shadowBlur = 16
  c.fillStyle = style === 'stone' ? G.gem.stone : G.gem.wood
  c.beginPath(); c.moveTo(cx, acy - ary - 18); c.lineTo(cx + 9, acy - ary - 7); c.lineTo(cx, acy - ary + 4); c.lineTo(cx - 9, acy - ary - 7); c.closePath(); c.fill()
  c.restore()

  // บานประตูเปิดแง้ม
  const door = (side: 1 | -1) => {
    const hx = cx + side * gap
    const pts: [number, number][] = [[hx, top + 46], [hx - side * 26, top + 62], [hx - side * 26, by - 4], [hx, by]]
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => c.lineTo(p[0], p[1])); c.closePath()
    c.lineWidth = 5; c.strokeStyle = pal.outline; c.stroke()
    c.fillStyle = G.door; c.fill()
    c.strokeStyle = G.doorLine; c.lineWidth = 1.4
    for (let i = 1; i < 3; i++) {
      const t = i / 3
      c.beginPath(); c.moveTo(hx - side * 26 * t, top + 46 + 16 * t); c.lineTo(hx - side * 26 * t, by - 4 * t); c.stroke()
    }
    c.fillStyle = G.hinge
    for (const t of [0.35, 0.7]) c.fillRect(Math.min(hx, hx - side * 26), top + 46 + (by - top - 46) * t, 26, 5)
  }
  door(-1); door(1)

  // โคมไฟแขวน
  for (const lx of [cx - gap - pw / 2, cx + gap + pw / 2]) {
    const ly = top + 62
    c.strokeStyle = G.lantern.chain; c.lineWidth = 2
    c.beginPath(); c.moveTo(lx, top + 36); c.lineTo(lx, ly - 10); c.stroke()
    glow(c, lx, ly, 34, G.lantern.glow, 0.7)
    c.fillStyle = pal.outline
    c.beginPath(); c.roundRect(lx - 9, ly - 10, 18, 26, 4); c.fill()
    c.fillStyle = G.lantern.light
    c.beginPath(); c.roundRect(lx - 6, ly - 7, 12, 20, 3); c.fill()
  }

  // เถาวัลย์ + ใบ + ดอก
  const rnd = mulberry32(Math.floor(cx * 7 + by))
  c.lineCap = 'round'
  ;([[cx - gap - pw / 2, top + 120], [cx + gap + pw / 2, top + 150]] as const).forEach(([vx, vy], vi) => {
    c.strokeStyle = G.vine; c.lineWidth = 4
    c.beginPath(); c.moveTo(vx, vy)
    c.bezierCurveTo(vx + (vi ? -14 : 14), vy - 40, vx + (vi ? 18 : -18), vy - 90, vx + (vi ? -10 : 10), top - 6)
    c.stroke()
    for (let i = 0; i < 9; i++) {
      const t = i / 8
      c.fillStyle = i % 3 ? G.leaves[0] : G.leaves[1]
      c.beginPath(); c.ellipse(vx + Math.sin(t * 5 + vi) * 14, vy - t * (vy - top + 6), 8, 4.5, (rnd() - 0.5) * 2, 0, TAU); c.fill()
    }
  })
  c.fillStyle = style === 'stone' ? G.flowerStone : G.flowerWood
  for (const [fx, fy] of [[cx - gap - pw / 2 - 6, top + 24], [cx + gap + pw / 2 + 8, top + 10], [cx + gap + pw / 2 - 4, top + 96]]) {
    c.beginPath(); c.arc(fx, fy, 4.2, 0, TAU); c.fill()
  }
  if (style === 'stone') {
    for (const px of [cx - gap - pw / 2, cx + gap + pw / 2]) drawCrystal(c, pal, px, top - 14, 20, Math.floor(px))
  }
}

/** ก้อนหินเรียงเป็นแถวในกรอบสี่เหลี่ยม (สลับแนวรอยต่อทุกแถว + สีหินต่างกันเล็กน้อย) */
function stoneCourses(c: Ctx2D, pal: ScenePalette, x0: number, y0: number, x1: number, y1: number, rnd: () => number, row = 16, brick = 30) {
  const K = pal.castle
  c.save()
  c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip()
  for (let yy = y0, i = 0; yy < y1; yy += row, i++) {
    for (let xx = x0 - (i % 2 ? brick / 2 : 0); xx < x1; xx += brick) {
      const v = rnd()
      if (v < 0.3) { c.fillStyle = v < 0.15 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)'; c.fillRect(xx + 1, yy + 1, brick - 2, row - 2) }
    }
    c.strokeStyle = K.mortar; c.lineWidth = 1.3
    c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke()
    for (let xx = x0 - (i % 2 ? brick / 2 : 0); xx < x1; xx += brick) {
      c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, Math.min(y1, yy + row)); c.stroke()
    }
  }
  c.restore()
}

/** ใบเสมา (ฟันเฟืองบนยอดกำแพง) */
function battlements(c: Ctx2D, pal: ScenePalette, x0: number, x1: number, top: number, fill: string | CanvasGradient) {
  const w = 18, gap = 12, h = 16
  const n = Math.max(2, Math.floor((x1 - x0 + gap) / (w + gap)))
  const step = (x1 - x0 - w) / (n - 1)
  for (let i = 0; i < n; i++) {
    const mx = x0 + i * step
    c.fillStyle = pal.outline
    c.beginPath(); c.roundRect(mx - 2, top - h - 2, w + 4, h + 4, 3); c.fill()
    c.fillStyle = fill
    c.beginPath(); c.roundRect(mx, top - h, w, h + 2, 2); c.fill()
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(mx, top - h, w * 0.35, h)
  }
}

function archPath(c: Ctx2D, x: number, by: number, w: number, h: number) {
  const r = w / 2
  c.beginPath()
  c.moveTo(x - r, by); c.lineTo(x - r, by - h + r)
  c.arc(x, by - h + r, r, Math.PI, TAU)
  c.lineTo(x + r, by); c.closePath()
}

function glowWindow(c: Ctx2D, pal: ScenePalette, x: number, by: number, w: number, h: number) {
  const K = pal.castle
  glow(c, x, by - h / 2, w * 2.2, K.windowGlow, 0.55)
  archPath(c, x, by, w + 5, h + 5); c.fillStyle = pal.outline; c.fill()
  archPath(c, x, by, w, h)
  const g = c.createLinearGradient(x, by - h, x, by)
  g.addColorStop(0, '#fff4c8'); g.addColorStop(1, K.window)
  c.fillStyle = g; c.fill()
  c.strokeStyle = 'rgba(90,55,30,.75)'; c.lineWidth = 1.6
  c.beginPath(); c.moveTo(x, by - h); c.lineTo(x, by); c.moveTo(x - w / 2, by - h * 0.45); c.lineTo(x + w / 2, by - h * 0.45); c.stroke()
}

function pennant(c: Ctx2D, pal: ScenePalette, x: number, y: number, h: number, color: string) {
  c.strokeStyle = pal.outline; c.lineWidth = 3
  c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.stroke()
  c.fillStyle = color
  c.beginPath(); c.moveTo(x + 1, y - h); c.quadraticCurveTo(x + 22, y - h + 2, x + 36, y - h + 9); c.quadraticCurveTo(x + 20, y - h + 13, x + 1, y - h + 20); c.closePath(); c.fill()
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.2; c.stroke()
}

/** [ใหม่] ปราสาทหิน — กำแพงหน้ามีใบเสมา หอกลางสูง หอกลมซ้าย/ขวาหลังคากรวย ประตูโค้ง หน้าต่างเรืองแสง
 *  คบเพลิง ธงประดับ มอสเกาะ · แสงจากซ้ายบน (หอกลมไล่สีซ้ายสว่าง → ขวามืด ให้ดูเป็นทรงกระบอก) */
export function drawCastle(c: Ctx2D, pal: ScenePalette, o: Extract<SceneryObject, { type: 'castle' }>) {
  const { x, y } = o
  const K = pal.castle
  const C = CASTLE
  const rnd = mulberry32(o.seed)
  shadow(c, pal, x + 12, y + 6, C.halfWidth + 30, 30, 0.32)

  const faceGrad = (x0: number, x1: number) => {
    const g = c.createLinearGradient(x0, 0, x1, 0)
    g.addColorStop(0, K.stone[0]); g.addColorStop(0.55, K.stone[1]); g.addColorStop(1, K.stone[2])
    return g
  }

  // ── หอกลาง (อยู่หลังกำแพง) ──
  const kx0 = x - 72, kx1 = x + 72, kTop = y - C.keepTop
  c.fillStyle = pal.outline
  c.beginPath(); c.roundRect(kx0 - 2, kTop - 2, kx1 - kx0 + 4, C.keepTop + 4, 4); c.fill()
  c.fillStyle = faceGrad(kx0, kx1); c.fillRect(kx0, kTop, kx1 - kx0, C.keepTop - 40)
  stoneCourses(c, pal, kx0, kTop, kx1, y - 40, rnd)
  battlements(c, pal, kx0 - 6, kx1 - 12, kTop, K.stone[1])
  glowWindow(c, pal, x - 30, kTop + 62, 18, 32)
  glowWindow(c, pal, x + 30, kTop + 62, 18, 32)
  // หน้าต่างกุหลาบกลม
  glow(c, x, kTop + 100, 34, K.windowGlow, 0.5)
  c.fillStyle = pal.outline; c.beginPath(); c.arc(x, kTop + 100, 15, 0, TAU); c.fill()
  c.fillStyle = K.window; c.beginPath(); c.arc(x, kTop + 100, 12, 0, TAU); c.fill()
  c.strokeStyle = 'rgba(90,55,30,.7)'; c.lineWidth = 1.4
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; c.beginPath(); c.moveTo(x + Math.cos(a) * 12, kTop + 100 + Math.sin(a) * 12); c.lineTo(x - Math.cos(a) * 12, kTop + 100 - Math.sin(a) * 12); c.stroke() }
  pennant(c, pal, x, kTop - 16, 46, K.flags[0])

  // ── กำแพงหน้า ──
  const wx0 = x - 150, wx1 = x + 150, wTop = y - C.wallTop
  c.fillStyle = pal.outline
  c.beginPath(); c.roundRect(wx0 - 2, wTop - 2, wx1 - wx0 + 4, C.wallTop + 4, 3); c.fill()
  const wg = c.createLinearGradient(0, wTop, 0, y)
  wg.addColorStop(0, K.stone[0]); wg.addColorStop(1, K.stone[1])
  c.fillStyle = wg; c.fillRect(wx0, wTop, wx1 - wx0, C.wallTop)
  stoneCourses(c, pal, wx0, wTop, wx1, y, rnd)
  // ทางเดินบนกำแพง (เงาใต้ใบเสมา)
  c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(wx0, wTop, wx1 - wx0, 7)
  battlements(c, pal, wx0, wx1 - 18, wTop, K.stone[0])

  // ธงผืนยาวสองข้างประตู
  for (const bx of [x - 82, x + 58]) {
    c.fillStyle = pal.outline; c.fillRect(bx - 2, wTop + 14, 28, 4)
    c.fillStyle = K.banner
    c.beginPath(); c.moveTo(bx, wTop + 16); c.lineTo(bx + 24, wTop + 16); c.lineTo(bx + 24, wTop + 78); c.lineTo(bx + 12, wTop + 68); c.lineTo(bx, wTop + 78); c.closePath(); c.fill()
    c.strokeStyle = K.bannerTrim; c.lineWidth = 1.6; c.stroke()
    sparkle(c, bx + 12, wTop + 40, 8, K.bannerTrim)
  }

  // ── ประตูโค้ง: ขอบหินโค้ง → ช่องมืด → บานไม้ + ซี่ประตูกล ──
  const dw = 70, dh = 98
  archPath(c, x, y, dw + 22, dh + 11); c.fillStyle = pal.outline; c.fill()
  archPath(c, x, y, dw + 16, dh + 8); c.fillStyle = K.stone[0]; c.fill()
  c.strokeStyle = K.mortar; c.lineWidth = 1.3
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI, cyA = y - dh + dw / 2
    c.beginPath(); c.moveTo(x + Math.cos(a) * dw / 2, cyA + Math.sin(a) * dw / 2); c.lineTo(x + Math.cos(a) * (dw / 2 + 8), cyA + Math.sin(a) * (dw / 2 + 8)); c.stroke()
  }
  archPath(c, x, y, dw, dh)
  const dg = c.createLinearGradient(0, y - dh, 0, y)
  dg.addColorStop(0, K.doorDark); dg.addColorStop(1, '#4a2e1c')
  c.fillStyle = dg; c.fill()
  // บานไม้เปิดแง้ม
  c.fillStyle = K.door
  c.beginPath(); c.moveTo(x - dw / 2, y); c.lineTo(x - dw / 2, y - dh + 30); c.lineTo(x - dw / 2 + 14, y - dh + 40); c.lineTo(x - dw / 2 + 14, y); c.closePath(); c.fill()
  c.beginPath(); c.moveTo(x + dw / 2, y); c.lineTo(x + dw / 2, y - dh + 30); c.lineTo(x + dw / 2 - 14, y - dh + 40); c.lineTo(x + dw / 2 - 14, y); c.closePath(); c.fill()
  // ซี่ประตูกลยกขึ้นครึ่งทาง
  c.save(); archPath(c, x, y, dw, dh); c.clip()
  c.strokeStyle = 'rgba(40,40,50,.85)'; c.lineWidth = 2.6
  for (let gx = x - dw / 2 + 8; gx < x + dw / 2; gx += 11) { c.beginPath(); c.moveTo(gx, y - dh); c.lineTo(gx, y - 46); c.stroke() }
  for (let gy = y - dh + 10; gy < y - 46; gy += 12) { c.beginPath(); c.moveTo(x - dw / 2, gy); c.lineTo(x + dw / 2, gy); c.stroke() }
  // แสงอุ่นจากลานด้านใน
  glow(c, x, y - 10, dw * 0.7, K.windowGlow, 0.45)
  c.restore()
  // คบเพลิง
  for (const tx of [x - dw / 2 - 26, x + dw / 2 + 26]) {
    glow(c, tx, y - 78, 46, K.torchGlow, 0.65)
    c.fillStyle = pal.outline; c.fillRect(tx - 3, y - 74, 6, 22)
    c.fillStyle = '#ffb347'
    c.beginPath(); c.moveTo(tx - 7, y - 76); c.quadraticCurveTo(tx - 6, y - 94, tx, y - 102); c.quadraticCurveTo(tx + 7, y - 92, tx + 7, y - 76); c.closePath(); c.fill()
    c.fillStyle = '#fff2b0'
    c.beginPath(); c.ellipse(tx, y - 82, 3, 7, 0, 0, TAU); c.fill()
  }

  // ── หอกลมซ้าย/ขวา (ทรงกระบอก) + หลังคากรวย ──
  for (const side of [-1, 1] as const) {
    const tx = x + side * C.towerX, R = C.towerR, tTop = y - C.towerTop
    c.fillStyle = pal.outline
    c.beginPath(); c.roundRect(tx - R - 2, tTop - 2, R * 2 + 4, C.towerTop + 6, 6); c.fill()
    const tg = c.createLinearGradient(tx - R, 0, tx + R, 0)
    tg.addColorStop(0, K.stone[1]); tg.addColorStop(0.3, K.stone[0]); tg.addColorStop(0.75, K.stone[1]); tg.addColorStop(1, K.stone[2])
    c.fillStyle = tg
    c.beginPath(); c.moveTo(tx - R, tTop); c.lineTo(tx - R, y); c.ellipse(tx, y, R, 9, 0, Math.PI, 0, true); c.lineTo(tx + R, tTop); c.closePath(); c.fill()
    // แนวก้อนหินโค้งตามผิวทรงกระบอก
    c.save()
    c.beginPath(); c.rect(tx - R, tTop, R * 2, C.towerTop + 9); c.clip()
    c.strokeStyle = K.mortar; c.lineWidth = 1.3
    for (let yy = tTop + 16, i = 0; yy < y + 8; yy += 16, i++) {
      c.beginPath(); c.ellipse(tx, yy, R, 6, 0, 0, Math.PI); c.stroke()
      for (const f of i % 2 ? [-0.75, -0.2, 0.35, 0.85] : [-0.5, 0.05, 0.6]) {
        const jx = tx + Math.sin(f * Math.PI / 2) * R
        c.beginPath(); c.moveTo(jx, yy - 16 + 6 * Math.cos(f * Math.PI / 2)); c.lineTo(jx, yy + 6 * Math.cos(f * Math.PI / 2)); c.stroke()
      }
    }
    c.restore()
    // ช่องหน้าต่างหอ
    glowWindow(c, pal, tx - side * 4, tTop + 70, 14, 30)
    glowWindow(c, pal, tx - side * 4, tTop + 140, 12, 22)
    // ชายคาหอ + หลังคากรวย
    const eave = tTop + 2, rw = R + 12, rTop = y - C.roofTop
    c.fillStyle = pal.outline
    c.beginPath(); c.moveTo(tx - rw - 3, eave + 2); c.lineTo(tx, rTop - 4); c.lineTo(tx + rw + 3, eave + 2); c.ellipse(tx, eave + 2, rw + 3, 11, 0, 0, Math.PI); c.closePath(); c.fill()
    const rg = c.createLinearGradient(tx - rw, 0, tx + rw, 0)
    rg.addColorStop(0, K.roof[0]); rg.addColorStop(0.4, K.roof[0]); rg.addColorStop(1, K.roof[1])
    c.fillStyle = rg
    c.beginPath(); c.moveTo(tx - rw, eave); c.lineTo(tx, rTop); c.lineTo(tx + rw, eave); c.ellipse(tx, eave, rw, 9, 0, 0, Math.PI); c.closePath(); c.fill()
    c.save(); c.clip()
    c.strokeStyle = K.roofLine; c.lineWidth = 1.2
    for (let k = 1; k < 6; k++) {
      const t = k / 6
      c.beginPath(); c.ellipse(tx, rTop + (eave - rTop) * t, rw * t, 9 * t, 0, 0, Math.PI); c.stroke()
    }
    for (const f of [-0.6, -0.2, 0.2, 0.6]) { c.beginPath(); c.moveTo(tx, rTop); c.lineTo(tx + f * rw, eave + 9 * Math.sqrt(1 - f * f)); c.stroke() }
    c.fillStyle = 'rgba(255,255,255,.18)'
    c.beginPath(); c.moveTo(tx, rTop); c.lineTo(tx - rw, eave); c.lineTo(tx - rw * 0.55, eave + 6); c.closePath(); c.fill()
    c.restore()
    pennant(c, pal, tx, rTop + 2, 34, K.flags[side < 0 ? 1 : 0])
  }

  // ── มอส/เถาไม้เลื้อยเกาะกำแพงและฐานหอ ──
  for (let i = 0; i < 26; i++) {
    const side = rnd() < 0.5 ? -1 : 1
    const mx = x + side * (40 + rnd() * 160), my = y - rnd() * 60
    c.fillStyle = K.moss[i % 2]
    c.beginPath(); c.ellipse(mx, my, 6 + rnd() * 8, 3 + rnd() * 4, rnd() * 3, 0, TAU); c.fill()
  }
  c.strokeStyle = K.moss[0]; c.lineWidth = 3; c.lineCap = 'round'
  for (const vx of [x - 128, x + 118]) {
    c.beginPath(); c.moveTo(vx, y)
    c.bezierCurveTo(vx + 10, y - 40, vx - 12, y - 80, vx + 6, y - 120); c.stroke()
    for (let k = 0; k < 7; k++) {
      c.fillStyle = K.moss[k % 2]
      c.beginPath(); c.ellipse(vx + Math.sin(k * 1.7) * 8, y - k * 17, 6, 3.5, k, 0, TAU); c.fill()
    }
  }
}

/** [ใหม่] ถ้ำคริสตัล — เนินหินมีชั้นหิน/รอยแตก มอสบนยอด ปากถ้ำส่องแสงคริสตัลพุ่งออกมา + กอคริสตัลงอกจากเนิน */
export function drawCave(c: Ctx2D, pal: ScenePalette, o: Extract<SceneryObject, { type: 'cave' }>) {
  const { x, y, r } = o
  const V = pal.cave
  const rnd = mulberry32(o.seed)
  shadow(c, pal, x + r * 0.1, y + 4, r * 1.35, r * 0.24, 0.32)
  // แสงจากปากถ้ำส่องลงพื้นด้านหน้า
  c.save(); c.translate(x, y + r * 0.08); c.scale(1, 0.35); glow(c, 0, 0, r * 1.5, V.mouthLight, 0.6); c.restore()

  // เนินหิน: ขอบหยักนิดๆ จาก seed
  const n = 14
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI
    const k = 1 + (i > 0 && i < n ? (rnd() - 0.5) * 0.14 : 0)
    pts.push([x + Math.cos(a) * r * 1.22 * k, y + Math.sin(a) * r * 1.12 * k])
  }
  const mound = () => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1], [qx, qy] = pts[i]
      c.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2)
    }
    c.lineTo(pts[n][0], pts[n][1])
    c.quadraticCurveTo(x, y + r * 0.12, pts[0][0], pts[0][1])
    c.closePath()
  }
  mound(); c.strokeStyle = pal.outline; c.lineWidth = 5; c.stroke()
  const mg = c.createRadialGradient(x - r * 0.45, y - r * 0.85, r * 0.1, x, y - r * 0.3, r * 1.4)
  mg.addColorStop(0, V.rock[0]); mg.addColorStop(0.55, V.rock[1]); mg.addColorStop(1, V.rock[2])
  c.fillStyle = mg; c.fill()
  c.save(); mound(); c.clip()
  // ชั้นหิน + รอยแตก
  c.strokeStyle = V.crack; c.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const yy = y - r * (0.2 + i * 0.24)
    c.beginPath(); c.moveTo(x - r * 1.3, yy + rnd() * 6)
    c.bezierCurveTo(x - r * 0.5, yy - 8 + rnd() * 16, x + r * 0.4, yy - 8 + rnd() * 16, x + r * 1.3, yy + rnd() * 6)
    c.stroke()
  }
  for (let i = 0; i < 6; i++) {
    const sx = x + (rnd() - 0.5) * r * 2, sy = y - rnd() * r
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + (rnd() - 0.5) * 18, sy + 10 + rnd() * 10); c.lineTo(sx + (rnd() - 0.5) * 18, sy + 22 + rnd() * 10); c.stroke()
  }
  // ก้อนหินนูน (ไฮไลต์บน/เงาล่าง)
  for (let i = 0; i < 9; i++) {
    const bx = x + (rnd() - 0.5) * r * 1.9, by = y - rnd() * r * 0.95, br = r * (0.08 + rnd() * 0.1)
    c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.ellipse(bx + 2, by + 3, br, br * 0.7, 0, 0, TAU); c.fill()
    c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(bx - 1, by - 1, br, br * 0.7, 0, 0, TAU); c.fill()
  }
  // มอสบนยอดเนิน
  for (let i = 0; i < 22; i++) {
    const a = Math.PI * (1.12 + rnd() * 0.76)
    const mx = x + Math.cos(a) * r * 1.1, my = y + Math.sin(a) * r * 1.02 + rnd() * 10
    c.fillStyle = V.moss[i % 2]
    c.beginPath(); c.ellipse(mx, my, 8 + rnd() * 10, 4 + rnd() * 4, a + Math.PI / 2, 0, TAU); c.fill()
  }
  c.restore()

  // ปากถ้ำ: ขอบมืด → ข้างในสว่างจากคริสตัล
  const mw = r * 0.95, mh = r * 0.78
  archPath(c, x, y, mw + 10, mh + 6); c.fillStyle = pal.outline; c.fill()
  archPath(c, x, y, mw, mh)
  const ig = c.createRadialGradient(x, y - mh * 0.35, r * 0.05, x, y - mh * 0.4, mw * 0.75)
  ig.addColorStop(0, '#fff6ff'); ig.addColorStop(0.3, rgba(V.mouthLight, 1)); ig.addColorStop(1, V.mouthDark)
  c.fillStyle = ig; c.fill()
  c.save(); archPath(c, x, y, mw, mh); c.clip()
  for (const [dx, h] of [[-0.3, 0.42], [0.05, 0.6], [0.32, 0.38]] as const) {
    const cx = x + dx * mw, hw = mw * 0.09
    c.fillStyle = pal.crystal.light
    c.beginPath(); c.moveTo(cx - hw, y); c.lineTo(cx, y - mh * h); c.lineTo(cx + hw, y); c.closePath(); c.fill()
    c.strokeStyle = pal.crystal.edge; c.lineWidth = 1.2; c.stroke()
  }
  c.restore()
  // ลำแสงพุ่งออกจากปากถ้ำ
  c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.32
    const L = r * (1.1 + rnd() * 0.5)
    const sx = x, sy = y - mh * 0.45
    const g = c.createLinearGradient(sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L)
    g.addColorStop(0, rgba(V.mouthLight, 0.35)); g.addColorStop(1, rgba(V.mouthLight, 0))
    c.fillStyle = g
    c.beginPath(); c.moveTo(sx, sy)
    c.lineTo(sx + Math.cos(a - 0.08) * L, sy + Math.sin(a - 0.08) * L)
    c.lineTo(sx + Math.cos(a + 0.08) * L, sy + Math.sin(a + 0.08) * L)
    c.closePath(); c.fill()
  }
  c.globalCompositeOperation = 'source-over'
  // กอคริสตัลงอกจากเนิน
  drawCrystal(c, pal, x - r * 0.72, y - r * 0.5, r * 0.28, o.seed + 1)
  drawCrystal(c, pal, x + r * 0.78, y - r * 0.36, r * 0.26, o.seed + 2)
  drawCrystal(c, pal, x + r * 0.12, y - r * 0.95, r * 0.27, o.seed + 3)
}

/** วาดฉากประกอบ 1 ชิ้นตามชนิด — pxScale = พิกเซลต่อหน่วยฉาก (เลือกระดับรายละเอียดของต้นไม้/พุ่ม) */
export function drawSceneryObject(c: Ctx2D, pal: ScenePalette, o: SceneryObject, pxScale = 1) {
  switch (o.type) {
    case 'tree': return drawStyledTree(c, o, pal.treeStyle, treeLodFor(o.r * pxScale), pxScale)
    case 'bush': return drawStyledBush(c, o, pal.treeStyle, treeLodFor(o.r * pxScale * 1.4), pxScale)
    case 'crystal': return drawCrystal(c, pal, o.x, o.y, o.r, o.seed)
    case 'mushroom': return drawMushroom(c, pal, o)
    case 'gate': return drawGate(c, pal, o)
    case 'castle': return drawCastle(c, pal, o)
    case 'cave': return drawCave(c, pal, o)
  }
}
