import type { Species } from '../../tree/procedural/species'

/*============================================================================*\
  miniTrees — [ใหม่ตามที่ระบุ] ต้นไม้ไกลบนเนินของฉาก 3 (ทุ่งหญ้าน้ำตก) = สายพันธุ์/สีเดียวกับต้นไม้ MBTI ของผู้เล่น (เล็กกว่า)
  ────────────────────────────────────────────────────────────────────────────
  ภาษาภาพเดียวกับต้นหลัก: ลำต้นแตกง่าม + พุ่มเป็นก้อนซ้อน (แสงซ้ายบน) + แต้มใบ/ดอกสีของสายพันธุ์
  ทรงตามรูปแบบต้น (broadleaf/weeping/column/cone/palm/bamboo) · tone() = ผสมไอฟ้าตามระยะ (ไกล = จางลงนิดหน่อย)
  วาดลงชั้นนิ่งครั้งเดียว (ไม่วาดซ้ำทุกเฟรม)
\*============================================================================*/

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
const TAU = Math.PI * 2

function hex2rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** ผสมสี a → b (t 0..1) */
export function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex2rgb(a), [r2, g2, b2] = hex2rgb(b)
  const m = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`
}
const toHex = (c: string) => {
  if (c.startsWith('#')) return c.slice(0, 7)
  const [r, g, b] = c.match(/\d+/g)!.map(Number)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export interface MiniTreeOpts {
  /** ผสมไอฟ้า: tone(สี) → สีหลังผสม */
  tone: (hex: string) => string
  rnd: () => number
}

function trunk(c: Ctx, x: number, y: number, h: number, w: number, color: string, fork: boolean, o: MiniTreeOpts) {
  const lean = (o.rnd() - 0.5) * w * 0.8
  c.fillStyle = o.tone(mixHex(color, '#2a2018', 0.2))
  c.beginPath()
  c.moveTo(x - w * 0.6, y)
  c.quadraticCurveTo(x - w * 0.35, y - h * 0.5, x - w * 0.25 + lean, y - h)
  c.lineTo(x + w * 0.25 + lean, y - h)
  c.quadraticCurveTo(x + w * 0.35, y - h * 0.5, x + w * 0.6, y)
  c.closePath(); c.fill()
  if (fork) {
    c.strokeStyle = c.fillStyle; c.lineCap = 'round'; c.lineWidth = w * 0.4
    c.beginPath(); c.moveTo(x + lean, y - h * 0.75); c.lineTo(x + lean - w * 1.6, y - h * 1.15); c.stroke()
    c.beginPath(); c.moveTo(x + lean, y - h * 0.7); c.lineTo(x + lean + w * 1.5, y - h * 1.1); c.stroke()
  }
  return lean
}

/** ก้อนพุ่มนุ่ม: ไล่แสงซ้ายบน → เงาขวาล่าง */
function clump(c: Ctx, x: number, y: number, r: number, light: string, mid: string, dark: string) {
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.1)
  g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark)
  c.fillStyle = g
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill()
}

/** แต้มใบ/ดอกเล็กๆ ทั่วพุ่ม (แบบแต้มใบของต้นหลัก) */
function daubs(c: Ctx, cx: number, cy: number, rx: number, ry: number, colors: string[], n: number, size: number, o: MiniTreeOpts) {
  for (let i = 0; i < n; i++) {
    const a = o.rnd() * TAU, d = Math.sqrt(o.rnd())
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d
    c.fillStyle = o.tone(colors[Math.floor(o.rnd() * colors.length)])
    c.beginPath(); c.ellipse(x, y, size, size * 0.6, o.rnd() * Math.PI, 0, TAU); c.fill()
  }
}

/** ต้นไม้ไกล 1 ต้น (x, y = โคน · r = รัศมีพุ่ม) */
export function drawMiniSpeciesTree(c: Ctx, x: number, y: number, r: number, sp: Species, o: MiniTreeOpts) {
  const leaves = sp.leafColors.map(toHex)
  const flowers = (sp.flowers?.colors ?? []).map(toHex)
  const base = leaves[0]
  const light = o.tone(mixHex(leaves[Math.min(1, leaves.length - 1)], '#fff8e0', 0.25))
  const mid = o.tone(base)
  const dark = o.tone(mixHex(base, '#1b2a20', 0.35))
  const trunkCol = toHex(sp.trunkColor)
  // เงาบนพื้น
  c.fillStyle = 'rgba(30,50,30,.18)'
  c.beginPath(); c.ellipse(x + r * 0.15, y, r * 0.9, r * 0.18, 0, 0, TAU); c.fill()

  switch (sp.form) {
    case 'cone': {
      trunk(c, x, y, r * 0.5, r * 0.18, trunkCol, false, o)
      for (let k = 0; k < 4; k++) {
        const ty = y - r * 0.35 - k * r * 0.5, tw = r * (1 - k * 0.2)
        c.fillStyle = k % 2 ? mid : dark
        c.beginPath(); c.moveTo(x - tw, ty); c.quadraticCurveTo(x, ty - r * 0.9, x + tw, ty); c.quadraticCurveTo(x, ty + r * 0.12, x - tw, ty); c.fill()
        daubs(c, x - tw * 0.25, ty - r * 0.25, tw * 0.45, r * 0.15, [leaves[leaves.length - 1], ...(sp.tipColors ?? [])], 6, r * 0.09, o)
      }
      return
    }
    case 'column': {
      trunk(c, x, y, r * 0.5, r * 0.16, trunkCol, false, o)
      const cy = y - r * 1.5
      for (const [dx, dy, rr] of [[0, r * 0.6, 0.42], [0, 0, 0.46], [0, -r * 0.6, 0.38]] as const) clump(c, x + dx, cy + dy, r * rr, light, mid, dark)
      daubs(c, x - r * 0.1, cy, r * 0.35, r * 0.95, [...leaves, ...(sp.tipColors ?? [])], 26, r * 0.08, o)
      return
    }
    case 'palm': {
      const lean = (o.rnd() - 0.5) * r * 0.4
      c.strokeStyle = o.tone(trunkCol); c.lineWidth = r * 0.14; c.lineCap = 'round'
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.3, y - r, x + lean, y - r * 1.8); c.stroke()
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (1.05 + (k / 6) * 0.9)
        c.strokeStyle = k % 2 ? mid : dark; c.lineWidth = r * 0.12
        c.beginPath(); c.moveTo(x + lean, y - r * 1.8); c.quadraticCurveTo(x + lean + Math.cos(a) * r * 0.7, y - r * 2.1 + Math.sin(a) * r * 0.2, x + lean + Math.cos(a) * r * 1.1, y - r * 1.7 - Math.sin(a) * -r * 0.3); c.stroke()
      }
      return
    }
    case 'bamboo': {
      for (let k = 0; k < 4; k++) {
        const sx = x + (k - 1.5) * r * 0.22, sh = r * (1.8 + o.rnd() * 0.6)
        c.strokeStyle = o.tone(k % 2 ? leaves[0] : mixHex(leaves[0], '#ffffff', 0.15)); c.lineWidth = r * 0.08
        c.beginPath(); c.moveTo(sx, y); c.lineTo(sx + (o.rnd() - 0.5) * r * 0.2, y - sh); c.stroke()
      }
      daubs(c, x, y - r * 1.6, r * 0.7, r * 0.5, leaves, 22, r * 0.12, o)
      return
    }
    default: {
      // broadleaf / weeping: ลำต้นแตกง่าม + พุ่มก้อนซ้อน (พุ่มกลมถ้าสายพันธุ์เป็นทรงกลม)
      const lean = trunk(c, x, y, r * 0.95, r * 0.2, trunkCol, true, o)
      const cx = x + lean, cy = y - r * (sp.roundCrown ? 1.6 : 1.5)
      const n = 6
      const parts: [number, number, number][] = []
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + o.rnd() * 0.5
        parts.push([cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * (sp.roundCrown ? 0.45 : 0.35), r * (0.42 + o.rnd() * 0.12)])
      }
      parts.push([cx, cy - r * 0.1, r * 0.55])
      parts.sort((p, q) => p[1] - q[1])
      // ดอกเด่น (เช่น จาคารันดาม่วง) → สีพื้นพุ่มใช้สีดอก/ใบหลักของสายพันธุ์
      for (const [px, py, pr] of parts) clump(c, px, py, pr, light, mid, dark)
      daubs(c, cx, cy, r * 0.85, r * 0.7, leaves, 44, r * 0.09, o)
      if (flowers.length) daubs(c, cx, cy - r * 0.1, r * 0.8, r * 0.6, flowers, Math.round(20 * Math.min(3, sp.flowers!.amount)), r * 0.07, o)
      // ไฮไลต์ซ้ายบน
      c.fillStyle = 'rgba(255,248,220,.22)'
      c.beginPath(); c.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.4, r * 0.22, -0.4, 0, TAU); c.fill()
      if (sp.form === 'weeping') {
        c.strokeStyle = mid; c.lineWidth = r * 0.06; c.lineCap = 'round'
        for (let k = 0; k < 9; k++) {
          const sx = cx + (k / 8 - 0.5) * r * 1.6
          c.beginPath(); c.moveTo(sx, cy + r * 0.1); c.quadraticCurveTo(sx + r * 0.05, cy + r * 0.5, sx - r * 0.02, cy + r * (0.7 + o.rnd() * 0.3)); c.stroke()
        }
      }
    }
  }
}
