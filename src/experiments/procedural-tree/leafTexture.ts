import * as THREE from 'three'
import { createRng } from '../../components/tree/procedural/generateTree'

/*============================================================================*\
  leafTexture — [experiment] texture ใบไม้ 1 ใบ วาดด้วย canvas (ไม่ต้องมีไฟล์รูป)
  ────────────────────────────────────────────────────────────────────────────
  map        : สีใบ (ค่อนข้างอ่อน/จืด — สีเขียวจริงมาจาก instanceColor ของแต่ละใบที่คูณทับ) + alpha
               เป็นรูปทรงใบ (ปลายแหลม โคนมน) → ขอบใบมาจาก texture ไม่ใช่รูปหลายเหลี่ยม
  normalMap  : เส้นกลางใบ + เส้นใบย่อยนูนขึ้น แสงจึงกระทบเส้นใบเป็นประกายเหมือนใบจริง

  ใบชี้ขึ้น (+V): โคนใบอยู่ขอบล่างของภาพ ปลายใบอยู่ขอบบน
  [ถ้ามีรูปใบไม้จริง] ตั้ง LEAF_TEXTURE_URL ใน ProceduralTreeScene.tsx ให้ชี้ไฟล์ PNG พื้นโปร่งใส
  (ใบชี้ขึ้น โคนใบอยู่ขอบล่าง) แทน map ที่วาดจากไฟล์นี้ได้เลย
\*============================================================================*/

const W = 256
const H = 512
const BASE_Y = H * 0.97
const TIP_Y = H * 0.03
const HALF_WIDTH = W * 0.42

/** โครงร่างใบ: โคนมนกว้าง → กว้างสุดราว 40% จากโคน → เรียวเข้าปลายแหลม */
function leafPath(ctx: CanvasRenderingContext2D) {
  const cx = W / 2
  ctx.beginPath()
  ctx.moveTo(cx, BASE_Y)
  ctx.bezierCurveTo(cx + HALF_WIDTH * 0.9, BASE_Y - H * 0.08, cx + HALF_WIDTH * 1.05, H * 0.45, cx + HALF_WIDTH * 0.55, H * 0.24)
  ctx.bezierCurveTo(cx + HALF_WIDTH * 0.3, H * 0.13, cx + 6, TIP_Y + 18, cx, TIP_Y)
  ctx.bezierCurveTo(cx - 6, TIP_Y + 18, cx - HALF_WIDTH * 0.3, H * 0.13, cx - HALF_WIDTH * 0.55, H * 0.24)
  ctx.bezierCurveTo(cx - HALF_WIDTH * 1.05, H * 0.45, cx - HALF_WIDTH * 0.9, BASE_Y - H * 0.08, cx, BASE_Y)
  ctx.closePath()
}

/** ครึ่งความกว้างใบโดยประมาณที่ความสูง y (ใช้กำหนดความยาวเส้นใบย่อย) */
function halfWidthAt(y: number) {
  const t = (BASE_Y - y) / (BASE_Y - TIP_Y) // 0 = โคน, 1 = ปลาย
  return HALF_WIDTH * Math.sin(Math.PI * Math.pow(t, 0.8)) * (1 - 0.35 * t)
}

/** เส้นกลางใบ + เส้นใบย่อยโค้งขึ้นไปหาขอบ (ใช้วาดทั้งบน map และ height map) */
function drawVeins(ctx: CanvasRenderingContext2D, midribWidth: number, veinWidth: number) {
  const cx = W / 2
  // เส้นกลางใบ: หนาที่โคน เรียวไปปลาย
  for (let i = 0; i < 24; i++) {
    const t0 = i / 24
    const t1 = (i + 1) / 24
    ctx.lineWidth = midribWidth * (1 - t0 * 0.85)
    ctx.beginPath()
    ctx.moveTo(cx, BASE_Y - (BASE_Y - TIP_Y) * t0)
    ctx.lineTo(cx, BASE_Y - (BASE_Y - TIP_Y) * t1)
    ctx.stroke()
  }
  // เส้นใบย่อย 9 คู่ ออกจากเส้นกลางเฉียงขึ้น แล้วโค้งไปตามขอบใบ
  ctx.lineWidth = veinWidth
  for (let i = 1; i <= 9; i++) {
    const y = BASE_Y - (BASE_Y - TIP_Y) * (i / 10.5)
    const reach = halfWidthAt(y) * 0.88
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx, y)
      ctx.quadraticCurveTo(cx + side * reach * 0.55, y - reach * 0.25, cx + side * reach, y - reach * 0.75)
      ctx.stroke()
    }
  }
}

function drawColor(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const rand = createRng(99)

  leafPath(ctx)
  ctx.save()
  ctx.clip()

  // พื้นใบ: สว่างกลางใบ เข้มลงที่ขอบ + ไล่จากโคน (เหลืองอ่อน) ไปปลาย (เขียวกว่า)
  const across = ctx.createLinearGradient(0, 0, W, 0)
  across.addColorStop(0, '#9fb08a')
  across.addColorStop(0.5, '#eef4de')
  across.addColorStop(1, '#9fb08a')
  ctx.fillStyle = across
  ctx.fillRect(0, 0, W, H)
  const along = ctx.createLinearGradient(0, BASE_Y, 0, TIP_Y)
  along.addColorStop(0, 'rgba(235, 230, 170, .35)')
  along.addColorStop(1, 'rgba(120, 150, 110, .25)')
  ctx.fillStyle = along
  ctx.fillRect(0, 0, W, H)

  // เนื้อใบเป็นเม็ดละเอียด (ไม่ให้ดูเป็นสีเรียบแบบพลาสติก)
  for (let i = 0; i < 2600; i++) {
    const v = rand()
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,240,${0.05 + rand() * 0.07})` : `rgba(40,60,30,${0.04 + rand() * 0.07})`
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1 + rand() * 2)
  }

  // เส้นใบสว่างกว่าเนื้อใบเล็กน้อย
  ctx.strokeStyle = 'rgba(250, 252, 225, .55)'
  ctx.lineCap = 'round'
  drawVeins(ctx, 7, 2)
  ctx.restore()

  // ขอบใบเข้มบางๆ
  leafPath(ctx)
  ctx.strokeStyle = 'rgba(55, 75, 40, .55)'
  ctx.lineWidth = 3
  ctx.stroke()
  return canvas
}

/** height map (เส้นใบนูน) → normal map ด้วย Sobel */
function drawNormal(): HTMLCanvasElement {
  const height = document.createElement('canvas')
  height.width = W
  height.height = H
  const hctx = height.getContext('2d')!
  hctx.fillStyle = '#000'
  hctx.fillRect(0, 0, W, H)
  hctx.filter = 'blur(2px)'
  hctx.strokeStyle = '#fff'
  hctx.lineCap = 'round'
  drawVeins(hctx, 9, 3)
  hctx.filter = 'none'
  const src = hctx.getImageData(0, 0, W, H).data

  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const octx = out.getContext('2d')!
  const img = octx.createImageData(W, H)
  const h = (x: number, y: number) => src[((Math.min(H - 1, Math.max(0, y)) * W) + Math.min(W - 1, Math.max(0, x))) * 4] / 255
  const strength = 2.2
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1))
      const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1))
      const nx = -dx * strength
      const ny = dy * strength // แกน V ของ texture ชี้ขึ้น แต่แถวภาพไล่ลง → กลับเครื่องหมาย
      const len = Math.hypot(nx, ny, 1)
      const i = (y * W + x) * 4
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  octx.putImageData(img, 0, 0)
  return out
}

export interface LeafTextures {
  map: THREE.Texture
  normalMap: THREE.Texture
  dispose: () => void
}

/** photoUrl = รูปใบไม้จริง (PNG พื้นโปร่งใส) แทน map ที่วาดเอง — normal map (เส้นใบ) ยังใช้ของที่วาดเสมอ */
export function createLeafTextures(photoUrl?: string | null): LeafTextures {
  const map = photoUrl ? new THREE.TextureLoader().load(photoUrl) : new THREE.CanvasTexture(drawColor())
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  const normalMap = new THREE.CanvasTexture(drawNormal())
  normalMap.anisotropy = 4
  return {
    map,
    normalMap,
    dispose: () => {
      map.dispose()
      normalMap.dispose()
    },
  }
}
