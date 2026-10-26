import { rgba, glow, drawSceneryObject, type Ctx2D } from '../../../../scenery/sceneryPrimitives'
import { paintPaperFinish } from '../../../../scenery/storybookTrees'
import type { ScenePalette } from '../../../../../config/generatedMapArt'
import { mulberry32 } from '../../../../../utils/seededRandom'
import { cumulativeLengths, pointAtLength, type Vec2 } from './geometry'
import { MYSTIC_ZONE, type MapScene } from './generateMapScene'

/*============================================================================*\
  paintMapScene — วาดฉากที่ generateMapScene สร้างลง canvas/OffscreenCanvas ครั้งเดียว (ไม่วาดซ้ำทุกเฟรม)
  ────────────────────────────────────────────────────────────────────────────
  scale = พิกเซลต่อหน่วยฉาก (ภาพ 2048px ของโลก 3200 หน่วย → 0.64)
  ลำดับ: พื้น → แถบทุ่งริมทาง/ลานโล่ง → กอหญ้า → ทาง → ดอกไม้ → ฉากประกอบ (ไกล→ใกล้) → หิ่งห้อย
        → เกรนกระดาษ + ขอบมืด (ให้เข้ากับแผนที่ภาพวาด)
  ไม่วาดนกฮูก/จุดหมายเลข/หีบ — เกมใช้คอมโพเนนต์จริงของโปรเจกต์ทับบนภาพนี้
  paintMapSceneSteps แบ่งงานเป็นช่วงๆ (yield) ให้ตัวเรียกทยอยวาดตอนเครื่องว่างได้
\*============================================================================*/

const TAU = Math.PI * 2
/** จำนวนฉากประกอบต่อหนึ่งช่วงงาน (yield) */
const OBJECTS_PER_STEP = 120

function trace(c: Ctx2D, pts: Vec2[]) {
  c.beginPath()
  c.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1])
}

export function* paintMapSceneSteps(c: Ctx2D, scene: MapScene, pal: ScenePalette, scale: number): Generator<void, void, void> {
  const W = scene.world
  // ตัวสุ่มของลายพื้น/จุดบนทาง — แยกจากตัวสุ่มของฉาก แต่ผูกกับ seed เดียวกัน (ภาพเดิมทุกครั้ง)
  const rnd = mulberry32((scene.seed * 7 + 1) >>> 0)
  const strokes = [scene.main, ...scene.branches]
  c.setTransform(scale, 0, 0, scale, 0, 0)
  c.clearRect(0, 0, W, W)

  // ── พื้นป่า + ด่างสีอ่อน/เข้ม ──
  c.fillStyle = pal.ground
  c.fillRect(0, 0, W, W)
  for (let i = 0; i < 1200; i++) {
    const x = rnd() * W, y = rnd() * W, r = 40 + rnd() * 110
    c.fillStyle = rnd() < 0.5 ? pal.groundBlots[0] : pal.groundBlots[1]
    c.beginPath(); c.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, TAU); c.fill()
  }
  // ── แถบทุ่งแดดริมทาง + ลานโล่งรอบจุดเด่น ──
  c.lineCap = 'round'; c.lineJoin = 'round'
  for (const s of strokes) {
    c.strokeStyle = pal.meadowBands[0]; c.lineWidth = s.halfWidth * 2 + 150; trace(c, s.points); c.stroke()
    c.strokeStyle = pal.meadowBands[1]; c.lineWidth = s.halfWidth * 2 + 80; trace(c, s.points); c.stroke()
  }
  // [ใหม่] ป่าพิศวง: พื้นมืดลงเป็นวงกว้าง (ทางยังวาดทับทีหลัง)
  const mystic = scene.features.find((f) => f.kind === 'mystic')
  if (mystic) {
    const g = c.createRadialGradient(mystic.x, mystic.y, 0, mystic.x, mystic.y, MYSTIC_ZONE)
    g.addColorStop(0, rgba(pal.mystic.shade, 0.5)); g.addColorStop(0.6, rgba(pal.mystic.shade, 0.32)); g.addColorStop(1, rgba(pal.mystic.shade, 0))
    c.fillStyle = g
    c.beginPath(); c.arc(mystic.x, mystic.y, MYSTIC_ZONE, 0, TAU); c.fill()
  }
  for (const f of scene.features) {
    if (f.kind === 'gate' || f.kind === 'chest' || f.kind === 'mystic') continue
    const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.15)
    g.addColorStop(0, rgba(pal.clearing, 0.55)); g.addColorStop(0.7, rgba(pal.clearing, 0.3)); g.addColorStop(1, rgba(pal.clearing, 0))
    c.fillStyle = g
    c.beginPath(); c.arc(f.x, f.y, f.r * 1.15, 0, TAU); c.fill()
  }
  // ── กอหญ้า (ทางวาดทับทีหลัง) ──
  c.strokeStyle = pal.tuft; c.lineWidth = 1.4
  c.beginPath()
  for (const [x, y] of scene.tufts) { c.moveTo(x, y); c.lineTo(x - 3, y - 8); c.moveTo(x, y); c.lineTo(x + 3, y - 9) }
  c.stroke()
  yield

  // ── ทาง: ขอบ → เนื้อทาง → แนวกลางสว่าง → เม็ดกรวด ──
  for (const s of strokes) { c.strokeStyle = pal.path.edge; c.lineWidth = s.halfWidth * 2 + 11; trace(c, s.points); c.stroke() }
  for (const s of strokes) { c.strokeStyle = pal.path.body; c.lineWidth = s.halfWidth * 2; trace(c, s.points); c.stroke() }
  for (const s of strokes) { c.strokeStyle = pal.path.centre; c.lineWidth = s.halfWidth * 1.15; trace(c, s.points); c.stroke() }
  for (const s of strokes) {
    const cum = cumulativeLengths(s.points), L = cum[cum.length - 1]
    for (let d = 0; d < L; d += 7) {
      const q = pointAtLength(s.points, cum, d), nx = pointAtLength(s.points, cum, d + 3)
      const ang = Math.atan2(nx[1] - q[1], nx[0] - q[0]) + Math.PI / 2
      const off = (rnd() - 0.5) * s.halfWidth * 1.7
      c.fillStyle = rnd() < 0.5 ? pal.path.speckDark : pal.path.speckLight
      c.beginPath(); c.ellipse(q[0] + Math.cos(ang) * off, q[1] + Math.sin(ang) * off, 1.5 + rnd() * 2.2, 1 + rnd() * 1.6, rnd() * 3, 0, TAU); c.fill()
    }
  }
  for (const f of scene.flowers) {
    c.fillStyle = pal.flowers[Math.floor(f.color * pal.flowers.length)]
    c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.fill()
  }
  yield

  // ── ฉากประกอบเรียงไกล→ใกล้ ──
  for (let i = 0; i < scene.objects.length; i++) {
    drawSceneryObject(c, pal, scene.objects[i], scale)
    if ((i + 1) % OBJECTS_PER_STEP === 0) yield
  }

  // ── [ใหม่] หมอกม่วงลอยเหนือป่าพิศวง (ทับต้นไม้ ใต้หิ่งห้อย) ──
  if (mystic) {
    glow(c, mystic.x, mystic.y, MYSTIC_ZONE, pal.mystic.mist, 0.26)
    for (let i = 0; i < 14; i++) {
      const a = rnd() * TAU, d = rnd() * MYSTIC_ZONE * 0.8
      c.fillStyle = rgba(pal.mystic.wisp, 0.06 + rnd() * 0.05)
      c.beginPath(); c.ellipse(mystic.x + Math.cos(a) * d, mystic.y + Math.sin(a) * d, 90 + rnd() * 90, 22 + rnd() * 18, (rnd() - 0.5) * 0.4, 0, TAU); c.fill()
    }
  }

  // ── หิ่งห้อย ──
  for (const f of scene.fireflies) {
    glow(c, f.x, f.y, f.r, pal.firefly.glow, 0.9)
    c.fillStyle = pal.firefly.core
    c.beginPath(); c.arc(f.x, f.y, 1.8, 0, TAU); c.fill()
  }

  // ── เก็บงานทั้งฉาก: เกรนกระดาษสีน้ำ (เม็ดขนาดเท่ากันทุกความละเอียด) + ขอบมืดนุ่ม ──
  paintPaperFinish(c, W, W, pal.treeStyle, 1, 1 / scale)
}

/** จำนวนช่วงงาน (yield) ทั้งหมดของ paintMapSceneSteps — ใช้คิดเปอร์เซ็นต์ความคืบหน้าจริง */
export function paintStepCount(scene: MapScene): number {
  return 2 + Math.floor(scene.objects.length / OBJECTS_PER_STEP) + 1
}

/** วาดทั้งฉากรวดเดียว */
export function paintMapScene(c: Ctx2D, scene: MapScene, pal: ScenePalette, scale: number) {
  const steps = paintMapSceneSteps(c, scene, pal, scale)
  while (!steps.next().done) { /* วาดต่อจนจบ */ }
}
