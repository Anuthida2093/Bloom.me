/*============================================================================*\
  sceneryShapes — ชนิดของฉากประกอบ (ต้นไม้/พุ่ม/เห็ด/คริสตัล/ประตู) + "รอยเท้า" จริงของแต่ละชิ้น
  ────────────────────────────────────────────────────────────────────────────
  ตรรกะล้วน ไม่แตะ canvas — ใช้ร่วมกันทั้งโค้ดสร้างฉาก (วางของไม่ให้ทับทาง) และเทสต์ (ตรวจว่าไม่ทับจริง)
  รอยเท้า = วงกลมที่ครอบส่วนที่วาดจริงทั้งหมด (เช่น เห็ด = หมวก + ก้าน ไม่ใช่แค่จุดโคน)
  ตัววาด (sceneryPrimitives.ts) วาดภายในวงเหล่านี้เสมอ — แก้รูปทรงที่ไหน ต้องแก้รอยเท้าที่นี่ด้วย
  ใช้ซ้ำได้กับฉากอื่น เช่น ป่ารอบแผนที่ 1 (หน่วยพิกัดเป็นของฉากนั้นเอง)
\*============================================================================*/

export type MushroomKind = 'red' | 'orange' | 'pink' | 'purple' | 'blue' | 'rainbow'
export type TreeSpecies = 'oak' | 'fir' | 'blossom' | 'weeping' | 'birch'
export const TREE_SPECIES: TreeSpecies[] = ['oak', 'fir', 'blossom', 'weeping', 'birch']
export type GateStyle = 'stone' | 'wood'

export interface Circle { x: number; y: number; r: number }

/** ฉากประกอบ 1 ชิ้น — (x, y) = จุดอ้างอิงของชิ้นนั้น · seed = ตัวสุ่มรายละเอียดตอนวาด (เดิมทุกครั้ง) */
export type SceneryObject =
  /** (x, y) = กลางพุ่ม — ลำต้นยาวลงไปถึง y + 0.9r · depth 0 ใกล้ → 1 ไกล (สีจางลงเล็กน้อย) */
  | { type: 'tree'; x: number; y: number; r: number; species: TreeSpecies; seed: number; depth: number }
  | { type: 'bush'; x: number; y: number; r: number; tone: number; seed: number; depth: number }
  /** (x, y) = โคนกอคริสตัล · featureId = เป็นของประจำจุดเด่นนั้น (วางในลานของจุดเด่นได้) */
  | { type: 'crystal'; x: number; y: number; r: number; seed: number; featureId?: string }
  /** (x, y) = โคนก้าน · size = ขนาดเห็ด (หมวกกว้าง ≈ 1.9 × size) */
  | { type: 'mushroom'; x: number; y: number; size: number; kind: MushroomKind; featureId?: string }
  /** (x, y) = กลางพื้นใต้ซุ้มประตู */
  | { type: 'gate'; x: number; y: number; style: GateStyle; id: string }
  /** [ใหม่] ปราสาทหิน — (x, y) = กลางพื้นหน้าประตูปราสาท (กว้าง ±CASTLE.halfWidth สูงถึงยอดหอ CASTLE.height) */
  | { type: 'castle'; x: number; y: number; seed: number; featureId?: string }
  /** [ใหม่] ถ้ำคริสตัล — เนินหินมีปากถ้ำเรืองแสง (x, y) = กลางพื้นหน้าปากถ้ำ · r = ครึ่งความกว้างเนิน ≈ 1.2r */
  | { type: 'cave'; x: number; y: number; r: number; seed: number; featureId?: string }

/** ขนาดปราสาท (หน่วยฉาก) — ตัววาดใช้ค่าเดียวกันนี้ */
export const CASTLE = { halfWidth: 205, wallTop: 135, keepTop: 265, towerX: 165, towerR: 44, towerTop: 215, roofTop: 315 } as const

/** ขนาดซุ้มประตู (หน่วยฉาก) — ใช้ทั้งตอนวาดและตอนตรวจว่าจุดหมายเลขไม่ทับเสา */
export const GATE = { pillarWidth: 46, pillarHeight: 205, gap: 62, capHeight: 18 } as const

/** กรอบเสาประตูซ้าย/ขวา [x0, y0, x1, y1] */
export function gatePillarRects(x: number, y: number): [number, number, number, number][] {
  const { pillarWidth: pw, pillarHeight: ph, gap, capHeight } = GATE
  const top = y - ph - capHeight
  return [
    [x - gap - pw - 8, top, x - gap + 8, y],
    [x + gap - 8, top, x + gap + pw + 8, y],
  ]
}

/** วงกลมที่ครอบส่วนที่วาดจริงของชิ้นนั้น (ไม่รวมเงาบนพื้นและแสงเรือง) */
export function footprintOf(o: SceneryObject): Circle[] {
  switch (o.type) {
    case 'tree':
      // พุ่มทุกสายพันธุ์ (สนสูงสุดถึง y-1.32r · กิ่งห้อยกว้าง ±0.8r) + โคนต้นกับกอหญ้า/ดอกจิ๋วรอบโคน ±0.33r
      return [{ x: o.x, y: o.y - 0.2 * o.r, r: 1.25 * o.r }, { x: o.x, y: o.y + 0.8 * o.r, r: 0.38 * o.r }]
    case 'bush':
      // ก้อนใบ 4 ก้อนเรียงแนวนอน ±0.675r รัศมีถึง 0.65r
      return [{ x: o.x - 0.5 * o.r, y: o.y - 0.05 * o.r, r: 0.86 * o.r }, { x: o.x + 0.5 * o.r, y: o.y - 0.05 * o.r, r: 0.86 * o.r }]
    case 'crystal':
      // แท่งคริสตัลสูงสุด 2.25r กระจายซ้าย-ขวา ~1.3r
      return [{ x: o.x, y: o.y - 0.45 * o.r, r: 1.3 * o.r }, { x: o.x, y: o.y - 1.55 * o.r, r: 0.85 * o.r }]
    case 'mushroom': {
      // หมวก: ครึ่งวงรีกว้าง ±0.95s สูง 0.62s เหนือก้านสูง 0.85s · ก้าน: กว้าง 0.36s
      const s = o.size
      return [{ x: o.x, y: o.y - 0.85 * s - 0.22 * s, r: 1.0 * s }, { x: o.x, y: o.y - 0.38 * s, r: 0.4 * s }]
    }
    case 'castle':
      // ฐานกำแพง 3 วง · หอกลาง · หอกลมซ้าย/ขวา + หลังคากรวย
      return [
        { x: o.x - 120, y: o.y - 60, r: 110 }, { x: o.x + 120, y: o.y - 60, r: 110 }, { x: o.x, y: o.y - 60, r: 82 },
        { x: o.x, y: o.y - 190, r: 115 },
        { x: o.x - CASTLE.towerX, y: o.y - 200, r: 118 }, { x: o.x + CASTLE.towerX, y: o.y - 200, r: 118 },
      ]
    case 'cave':
      // เนินหินกว้าง ±1.31r สูง 1.2r + คริสตัลบนเนิน (สูงสุด ~1.6r)
      return [{ x: o.x - 0.55 * o.r, y: o.y - 0.45 * o.r, r: 0.92 * o.r }, { x: o.x + 0.55 * o.r, y: o.y - 0.45 * o.r, r: 0.92 * o.r }, { x: o.x, y: o.y - 0.95 * o.r, r: 0.75 * o.r }]
    case 'gate':
      return gatePillarRects(o.x, o.y).map(([x0, y0, x1, y1]) => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: Math.hypot(x1 - x0, y1 - y0) / 2 }))
  }
}

/** จุดที่ใช้เรียงลำดับการวาด (ไกล→ใกล้) = จุดที่ชิ้นนั้นแตะพื้น */
export function groundYOf(o: SceneryObject): number {
  return o.type === 'tree' ? o.y + 0.4 * o.r : o.y
}
