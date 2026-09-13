import type { PlacedItem } from '../types'

/** หมวดร้านค้า — ตรงกับ CATEGORIES ใน ShopSection.tsx เป๊ะ (ที่นั่นมีแค่ 3 หมวดที่ซื้อได้จริง
 * 'special' คือของรางวัลจาก streak ที่ไม่ได้ขายในร้าน เช่น golden-crown/glowing-butterfly) */
export type DecorationCategory = 'statues' | 'hangings' | 'postits' | 'special'

export interface DecorationItemMeta {
  /** emoji สำรอง — ใช้เฉพาะตอนที่ยังไม่มีไฟล์ภาพจริง */
  emoji: string
  nameTh: string
  zone: PlacedItem['zone']
  /** [เพิ่มรอบนี้] ใช้จัดกลุ่มไอเทมในคลัง (ProfilePage.tsx) — เดิมมีแค่ zone (ตำแหน่งบนต้นไม้)
   *  ซึ่งเป็นคนละมิติกับ "ประเภทไอเทม" ที่ผู้ใช้คุ้นจากตอนเลือกซื้อในร้านค้า */
  category: DecorationCategory
}

/*  [เพิ่มรอบนี้ — เตรียมพร้อมสำหรับอาร์ตจริง]
    ────────────────────────────────────────────────────────────────────────
    ปัญหาของการใช้ emoji เป็นอาร์ตเวิร์กจริง: emoji เรนเดอร์คนละสไตล์ทุกระบบ
    ปฏิบัติการ (Windows / iOS / Android / Linux) → ภาพในแอปไม่มีทางนิ่งข้ามเครื่อง
    และไม่มีทางเข้ากับสไตล์ Ghibli ได้เลย นอกจากนี้ผู้ใช้ที่เก็บเหรียญมาซื้อ
    "มังกรหยก" แล้วได้ 🐉 กลับไป จะรู้สึกว่าถูกหลอก

    วิธีย้ายไปใช้ภาพจริงโดยไม่ต้องแก้โค้ดที่ไหนเลย:
      1. วางไฟล์ที่ public/assets/images/decorations/<itemId>.webp
         (256x256 พื้นหลังโปร่งใส ตามที่ระบุใน docs/ART_BIBLE.md)
      2. เท่านั้น — getDecorationImage() จะหาเจอเอง และ emoji จะถูกใช้เป็น
         ตัวสำรองเฉพาะไอเทมที่ยังไม่มีภาพ
    ทำให้ทยอยแทนที่ทีละชิ้นได้ ไม่ต้องรอให้ครบ 20 ชิ้นก่อนแล้วค่อยเปลี่ยนทีเดียว  */
const DECORATION_IMAGE_BASE = '/assets/images/decorations'

export function getDecorationImage(itemId: string): string {
  return `${DECORATION_IMAGE_BASE}/${itemId}.webp`
}

/**
 * DECORATION_ITEM_META — แหล่งความจริงเดียวของ "ไอเทมตกแต่ง" ทั้งหมด (emoji, ชื่อไทย,
 * โซนที่ควรไปติดบนต้นไม้) เดิมข้อมูลชุดเดียวกันนี้กระจายซ้ำกันอยู่ 3 ที่แยกกัน
 * (InventoryModal.tsx มี ITEM_META ของตัวเอง, AppContext.tsx มี ITEM_ZONES ของตัวเอง,
 * ไฟล์นี้เดิมมีแค่ DECORATION_EMOJI) พอแก้ที่หนึ่งแล้วลืมอีกที่ ข้อมูลจะเพี้ยนไม่ตรงกัน —
 * รวมไว้ที่เดียวตรงนี้ ทุกไฟล์ import จากที่นี่แทน
 *
 * key ต้องตรงกับ ShopItem.id ใน ShopSection.tsx เป๊ะ (สมมติ shopItemId ของ backend
 * ใช้ id ชุดเดียวกันนี้ — ยังไม่มี endpoint /shop จริงให้ตรวจสอบตอนนี้)
 */
export const DECORATION_ITEM_META: Record<string, DecorationItemMeta> = {
  'frog-guard': { emoji: '🐸', nameTh: 'กบผู้พิทักษ์', zone: 'pot', category: 'statues' },
  'fox-statue': { emoji: '🦊', nameTh: 'รูปปั้นจิ้งจอก', zone: 'pot', category: 'statues' },
  'jade-dragon': { emoji: '🐉', nameTh: 'มังกรหยก', zone: 'pot', category: 'statues' },
  'calm-butterfly': { emoji: '🦋', nameTh: 'ผีเสื้อสงบ', zone: 'crown', category: 'statues' },
  'scholar-koala': { emoji: '🐨', nameTh: 'โคอาล่านักวิชาการ', zone: 'pot', category: 'statues' },
  'forest-unicorn': { emoji: '🦄', nameTh: 'ยูนิคอร์นป่า', zone: 'crown', category: 'statues' },
  'gold-star': { emoji: '⭐', nameTh: 'ดาวทอง', zone: 'branch-right', category: 'hangings' },
  'moon-charm': { emoji: '🌙', nameTh: 'จี้พระจันทร์', zone: 'branch-left', category: 'hangings' },
  'crystal-ball': { emoji: '🔮', nameTh: 'ลูกแก้วคริสตัล', zone: 'branch-right', category: 'hangings' },
  'magic-wand': { emoji: '🪄', nameTh: 'ไม้กายสิทธิ์', zone: 'branch-left', category: 'hangings' },
  'circus-bell': { emoji: '🔔', nameTh: 'ระฆังวิเศษ', zone: 'branch-right', category: 'hangings' },
  'diamond-gem': { emoji: '💎', nameTh: 'เพชรพลอย', zone: 'crown', category: 'hangings' },
  'cherry-blossom': { emoji: '🌸', nameTh: 'ซากุระ', zone: 'crown', category: 'postits' },
  'rainbow-swirl': { emoji: '🌈', nameTh: 'หมุนวนสายรุ้ง', zone: 'crown', category: 'postits' },
  'lucky-clover': { emoji: '🍀', nameTh: 'ใบโคลเวอร์โชค', zone: 'crown', category: 'postits' },
  'butterfly-pat': { emoji: '🦋', nameTh: 'ลายผีเสื้อ', zone: 'crown', category: 'postits' },
  'flame-pattern': { emoji: '🔥', nameTh: 'ลายเปลวไฟ', zone: 'crown', category: 'postits' },
  'ocean-wave': { emoji: '🌊', nameTh: 'คลื่นสมุทร', zone: 'crown', category: 'postits' },
  'golden-crown': { emoji: '👑', nameTh: 'มงกุฎทอง', zone: 'crown', category: 'special' },
  'glowing-butterfly': { emoji: '🦋', nameTh: 'ผีเสื้อเรืองแสง', zone: 'crown', category: 'special' },
}

/** อนุพันธ์ของ DECORATION_ITEM_META สำหรับที่ที่ต้องการแค่ emoji ตรงๆ (TreeOfLife.tsx, TreeCanvas.tsx) */
export const DECORATION_EMOJI: Record<string, string> = Object.fromEntries(
  Object.entries(DECORATION_ITEM_META).map(([id, meta]) => [id, meta.emoji]),
)

/**
 * ตำแหน่งของแต่ละโซนบนต้นไม้ ในรูปเปอร์เซ็นต์ของ container (ใช้กับ tree/TreeOfLife.tsx
 * ที่ขนาดต้นไม้ยืดหยุ่นตามจอ ต่างจาก TreeCanvas.tsx ที่เป็น SVG viewBox ตายตัว 360x420
 * จึงมีตำแหน่งพิกัดพิกเซลของตัวเองแยกต่างหาก)
 *
 * ตำแหน่งเหล่านี้เป็นค่าประมาณอิงจากสัดส่วนจริงที่ TreeOfLife.tsx วาดพุ่ม/ลำต้น/พื้นดิน
 * ไม่ใช่พิกัดที่คำนวณจากโครงกิ่งจริงของภาพ asset (เพราะเป็นภาพ raster ไม่ใช่ vector ที่มี
 * พิกัดกิ่งให้ query ได้) — เพียงพอสำหรับ "ประดับให้ถูกโซน" ตามที่ขอ
 */
export const DECORATION_ZONE_POSITION: Record<PlacedItem['zone'], { left: string; top: string }> = {
  pot: { left: '50%', top: '85%' },
  'branch-left': { left: '30%', top: '46%' },
  'branch-right': { left: '70%', top: '46%' },
  crown: { left: '50%', top: '24%' },
}