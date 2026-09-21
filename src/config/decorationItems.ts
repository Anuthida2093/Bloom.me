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

/* [ลบตามที่พบบั๊ก] เดิมไฟล์นี้มี getDecorationImage() ชี้ไป
   public/assets/images/decorations/<itemId>.webp — โฟลเดอร์นั้นไม่มีไฟล์จริงเลยสักไฟล์
   (มีแค่ .gitkeep) ทำให้ TreeOfLife.tsx (จุดเดียวที่เคยเรียกฟังก์ชันนี้) โหลดรูปไม่ขึ้นเสมอ
   และ fallback เป็น emoji ทุกชิ้นอย่างเงียบๆ — รูปจริงของไอเทมตกแต่งอยู่ที่ ITEM_ICONS
   (src/config/iconAssets.ts) อยู่แล้ว ซึ่งเป็นจุดเดียวกับที่ ShopSection.tsx/ProfilePage.tsx
   ใช้แสดงไอเทมชุดเดียวกันนี้ — TreeOfLife.tsx เปลี่ยนไปอ้าง ITEM_ICONS ตรงๆ แทนแล้ว */
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
  // [แก้รอบนี้ — เทียบกับเอกสาร docx จริง] เอกสารจัดหมวดผีเสื้อ (butterfly.png) เป็น
  // "ลายโพสอิทสะสม" (postits) ไม่ใช่ "รูปปั้นกระถาง" (statues) ตามที่เคยตั้งไว้ผิดหมวดมาก่อน
  'calm-butterfly': { emoji: '🦋', nameTh: 'ผีเสื้อสงบ', zone: 'crown', category: 'postits' },
  'scholar-koala': { emoji: '🐨', nameTh: 'โคอาล่านักวิชาการ', zone: 'pot', category: 'statues' },
  'forest-unicorn': { emoji: '🦄', nameTh: 'ยูนิคอร์นป่า', zone: 'crown', category: 'statues' },
  'gold-star': { emoji: '⭐', nameTh: 'ดาวทอง', zone: 'branch-right', category: 'hangings' },
  'moon-charm': { emoji: '🌙', nameTh: 'จี้พระจันทร์', zone: 'branch-left', category: 'hangings' },
  // [แก้รอบนี้] เอกสารจัดหมวดลูกแก้ว (marble.png) เป็น "ลายโพสอิทสะสม" (postits) ไม่ใช่
  // "ของแขวนกิ่งไม้" (hangings) ตามที่เคยตั้งไว้ผิดหมวดมาก่อน
  'crystal-ball': { emoji: '🔮', nameTh: 'ลูกแก้วคริสตัล', zone: 'crown', category: 'postits' },
  'magic-wand': { emoji: '🪄', nameTh: 'ไม้กายสิทธิ์', zone: 'branch-left', category: 'hangings' },
  'circus-bell': { emoji: '🔔', nameTh: 'ระฆังวิเศษ', zone: 'branch-right', category: 'hangings' },
  // [แก้รอบนี้] เอกสารจัดหมวดเพชร (diamond.png) เป็น "ลายโพสอิทสะสม" (postits) ไม่ใช่
  // "ของแขวนกิ่งไม้" (hangings) ตามที่เคยตั้งไว้ผิดหมวดมาก่อน
  'diamond-gem': { emoji: '💎', nameTh: 'เพชรพลอย', zone: 'crown', category: 'postits' },
  'cherry-blossom': { emoji: '🌸', nameTh: 'ซากุระ', zone: 'crown', category: 'postits' },
  'rainbow-swirl': { emoji: '🌈', nameTh: 'หมุนวนสายรุ้ง', zone: 'crown', category: 'postits' },
  'lucky-clover': { emoji: '🍀', nameTh: 'ใบโคลเวอร์โชค', zone: 'crown', category: 'postits' },
  'butterfly-pat': { emoji: '🦋', nameTh: 'ลายผีเสื้อ', zone: 'crown', category: 'postits' },
  'flame-pattern': { emoji: '🔥', nameTh: 'ลายเปลวไฟ', zone: 'crown', category: 'postits' },
  'ocean-wave': { emoji: '🌊', nameTh: 'คลื่นสมุทร', zone: 'crown', category: 'postits' },
  'golden-crown': { emoji: '👑', nameTh: 'มงกุฎทอง', zone: 'crown', category: 'special' },
  'glowing-butterfly': { emoji: '🦋', nameTh: 'ผีเสื้อเรืองแสง', zone: 'crown', category: 'special' },

  /* [เพิ่มรอบนี้ — 13 ไอเทมใหม่จากตาราง 23 รายการในเอกสาร docx จริง ที่ไม่มีตัวเดิมในระบบ
     ตรงความหมายด้วยเลย] zone ตั้งตามธรรมเนียมเดิมของไฟล์นี้: statues→'pot',
     postits→'crown', hangings→'branch-left'/'branch-right' สลับกัน */
  'fire-dragon': { emoji: '🐲', nameTh: 'มังกรไฟ', zone: 'pot', category: 'statues' },
  'cat-statue': { emoji: '🐱', nameTh: 'แมว', zone: 'pot', category: 'statues' },
  'rabbit-statue': { emoji: '🐰', nameTh: 'กระต่าย', zone: 'pot', category: 'statues' },
  'seedling-pot': { emoji: '🪴', nameTh: 'กระถางต้นกล้า', zone: 'pot', category: 'statues' },
  'stone-statue': { emoji: '🪨', nameTh: 'ก้อนหิน', zone: 'pot', category: 'statues' },
  'pendant-charm': { emoji: '📿', nameTh: 'จี้', zone: 'branch-left', category: 'hangings' },
  'white-dragon': { emoji: '🐉', nameTh: 'มังกรขาว', zone: 'crown', category: 'postits' },
  'magic-parrot': { emoji: '🦜', nameTh: 'นกแก้ววิเศษ', zone: 'crown', category: 'postits' },
  'parrot': { emoji: '🦜', nameTh: 'นกแก้ว', zone: 'crown', category: 'postits' },
  'ribbon-knot': { emoji: '🎀', nameTh: 'โบว์', zone: 'crown', category: 'postits' },
  'glass-orb': { emoji: '🥛', nameTh: 'แก้ว', zone: 'crown', category: 'postits' },
  'magic-flame': { emoji: '🔥', nameTh: 'ไฟวิเศษ', zone: 'crown', category: 'postits' },
  'cherry-fruit': { emoji: '🍒', nameTh: 'เชอรี่', zone: 'crown', category: 'postits' },
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