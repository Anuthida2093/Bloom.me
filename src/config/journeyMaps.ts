/*============================================================================*\
  journeyMaps.ts — 8 แผนที่ปลายทางของเควส "ก้าวเพื่อสุขภาพ" (Step Journey)
  ────────────────────────────────────────────────────────────────────────────
  ภาพจริงอยู่ที่ public/assets/images/mini-game/vitality-steps/map-01.jpg ... map-08.jpg
  (โฟลเดอร์เดิมชื่อ "Vitality Steps" มีเว้นวรรค — เปลี่ยนเป็น kebab-case ให้ตรงกับโฟลเดอร์อื่น
  ในโปรเจกต์แล้ว เช่น incinerator/mindful-circle/oracle-cards/watering-can)

  ╔══════════════════════════════════════════════════════════════════════════╗
  ║ [รอพิกัดจริงจากเจ้าของโปรเจกต์] entryPct/exitPct/waypoints ของ "ทุกแผนที่ทั้ง 8   ║
  ║ ใบ" (JOURNEY_MAPS ด้านล่างทั้งก้อน) ยังเป็นค่าประมาณ/placeholder ทั้งหมด — ต้อง  ║
  ║ เปิดแต่ละภาพ (1024x1024px) ใน Figma/เครื่องมือดูพิกัด pixel แล้วปักจุดหักเลี้ยว  ║
  ║ ของเส้นทางสีน้ำตาลจริงในภาพ (~5-8 จุดต่อภาพ) แปลง pixel → % ด้วย x/1024*100    ║
  ║ แล้วแทนที่ค่าใน defineMap(...) ของแต่ละแผนที่ด้านล่างนี้ — ไม่ต้องแก้โค้ดที่อื่นเลย  ║
  ║ (buildJourneyPathD ใน journeyPathMath.ts อ่านจาก entryPct/waypoints/exitPct    ║
  ║ ตรงๆ อัตโนมัติ) map-01 เท่านั้นที่เคยเปิดภาพเทียบคร่าวๆ แล้ว (ประตูขวาบน/ซุ้มซ้ายล่าง  ║
  ║ ใกล้เคียง) แต่ waypoints ระหว่างทางของมันก็ยังเป็น placeholder โค้งสุ่มเหมือนกัน —   ║
  ║ ยังไม่ได้ปักตามเส้นทางจริงในภาพสักจุดเดียว                                      ║
  ╚══════════════════════════════════════════════════════════════════════════╝
\*============================================================================*/
import type { MapDef } from '../types.journey'

const ASSET_DIR = '/assets/images/mini-game/vitality-steps'

/** [แก้รอบนี้ — feedback รอบ 2: เส้นทางต้องโค้ง ไม่ใช่เส้นตรง] เดิมฟังก์ชันนี้ (lerpWaypoints)
 *  เดินเส้นตรงระหว่าง entry→exit แล้ววาง 2 จุดกลาง "บนเส้นตรงเดียวกันเป๊ะ" — ต่อให้
 *  buildJourneyPathD วาดเป็นเส้นโค้ง Bezier แล้ว ผลลัพธ์ก็ยังเป็นเส้นตรงเป๊ะอยู่ดีเพราะจุดทุกจุด
 *  เรียงกันเป็นเส้นตรงมาตั้งแต่ต้น (โค้งได้ก็ต่อเมื่อจุดหักเลี้ยวจริงๆ ไม่อยู่บนเส้นตรงเดียวกัน)
 *  ฟังก์ชันนี้จึงเบี่ยงจุดกลางออกจากเส้นตรงเป็นโค้งเบาๆ (sine bow ตั้งฉากกับแนว entry→exit)
 *  แทน — เป็น placeholder "มีรูปทรงโค้งจริง" ให้เห็นผลของระบบ Bezier ทำงาน ไม่ใช่พิกัดจริงที่ปัก
 *  ตามเส้นทางในภาพ (ดูกล่องคำเตือนด้านบนหัวไฟล์) — สลับทิศโค้งซ้าย/ขวาตาม seed (เลข order)
 *  กันทั้ง 8 แผนที่โค้งไปทางเดียวกันหมดจนดูซ้ำเกินไป */
function generateCurvedWaypoints(
  entry: { x: number; y: number },
  exit: { x: number; y: number },
  seed: number,
  count = 4,
): { x: number; y: number }[] {
  const dx = exit.x - entry.x
  const dy = exit.y - entry.y
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  // เวกเตอร์หนึ่งหน่วยตั้งฉากกับแนว entry→exit — ใช้เบี่ยงจุดกลางออกจากเส้นตรงเดิม
  const perpX = -dy / length
  const perpY = dx / length
  const direction = seed % 2 === 0 ? 1 : -1
  const amplitude = length * 0.12 * direction

  const points: { x: number; y: number }[] = []
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1)
    const baseX = entry.x + dx * t
    const baseY = entry.y + dy * t
    // sin(t*PI) = 0 ที่ปลายทั้งสอง (t=0,1) โป่งออกมากสุดตรงกลาง (t=0.5) — โค้งแบบคันธนูเบาๆ
    // ไม่ตัดกับเส้นทางตัวเองแบบ S-curve เต็มรูปแบบ (ปลอดภัยกว่าสำหรับ placeholder อัตโนมัติ)
    const offset = Math.sin(t * Math.PI) * amplitude
    points.push({
      x: Math.round(clampPct(baseX + perpX * offset)),
      y: Math.round(clampPct(baseY + perpY * offset)),
    })
  }
  return points
}

function clampPct(value: number): number {
  return Math.min(97, Math.max(3, value))
}

function defineMap(order: number, id: string, name: string, entryPct: { x: number; y: number }, exitPct: { x: number; y: number }): MapDef {
  return {
    id,
    order,
    name,
    artAsset: `${ASSET_DIR}/map-0${order}.jpg`,
    waypoints: generateCurvedWaypoints(entryPct, exitPct, order),
    entryPct,
    exitPct,
  }
}

export const JOURNEY_MAPS: MapDef[] = [
  defineMap(1, 'crystal-cave-rainbow', 'ถ้ำคริสตัลสีรุ้ง', { x: 88, y: 15 }, { x: 15, y: 88 }),
  defineMap(2, 'flower-garden', 'สวนดอกไม้', { x: 20, y: 10 }, { x: 78, y: 90 }),
  defineMap(3, 'bamboo-forest', 'ป่าไผ่', { x: 88, y: 10 }, { x: 10, y: 90 }),
  defineMap(4, 'lotus-pond', 'บึงบัว', { x: 85, y: 15 }, { x: 12, y: 88 }),
  defineMap(5, 'stone-field', 'ทุ่งหินตั้ง', { x: 15, y: 15 }, { x: 85, y: 90 }),
  defineMap(6, 'mountain-range', 'เทือกเขา', { x: 85, y: 15 }, { x: 12, y: 85 }),
  defineMap(7, 'waterfall-valley', 'หุบเขาน้ำตก', { x: 85, y: 15 }, { x: 45, y: 92 }),
  defineMap(8, 'crystal-cave', 'ถ้ำคริสตัล', { x: 85, y: 10 }, { x: 42, y: 90 }),
]
