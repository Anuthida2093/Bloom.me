/*============================================================================*\n  mockData.ts — ข้อมูลจำลองชุดกลางสำหรับทดสอบ flow ทั้งแอปบน localhost (VITE_API_MODE=mock)
  ────────────────────────────────────────────────────────────────────────────
  หน้าจอไม่ import ไฟล์นี้ตรงๆ — อ่าน/แก้ผ่านฟังก์ชัน async ใน src/services/api/*.api.ts เท่านั้น
  (getShopItems / buyItem / toggleEquip / getQuests / completeQuest / getMe ...) แต่ละฟังก์ชัน:
    โหมด mock → อ่าน/เขียนข้อมูลชุดนี้ + mockDb (localStorage แยกตามบัญชี จำลองฐานข้อมูล)
    โหมด live → fetch ไป backend Express จริง (เปลี่ยน VITE_API_MODE=live ที่ .env อย่างเดียว ไม่ต้องแก้คอมโพเนนต์)
  ข้อมูลเกมที่เปลี่ยนตามการเล่น (เหรียญ/เลเวล/ไอเทมที่มี/สถานะเควส) อยู่ใน mockDb.ts — ไฟล์นี้เป็น "ค่าเริ่มต้น"
  รีเซ็ตทั้งหมด: ล้าง localStorage ของเว็บ (DevTools → Application → Clear site data)
\*============================================================================*/
import type { QuestDef } from '../../config/questCatalog'
import { ALL_QUESTS } from '../../config/questCatalog'

/* ── 1) เควส ─────────────────────────────────────────────────────────────────
   ใช้แคตตาล็อกเดียวกับหน้าเควส (config/questCatalog.ts) ไม่คัดลอกซ้ำ — กันข้อมูลสองชุดเพี้ยนกัน
   สถานะ (pending / in-progress / completed) คิดจากประวัติเควสของผู้เล่น → quest.api.ts getQuests() */
export const MOCK_QUESTS: QuestDef[] = ALL_QUESTS

/* ── 2) ไอเทมร้านค้า (ตกแต่งต้นไม้) ─────────────────────────────────────────────
   id = รหัสไอเทม (ตรง ShopItem.code ฝั่ง backend / DECORATION_ITEM_META / ITEM_ICONS)
   หมวด: statues รูปปั้นกระถาง · hangings ของแขวนกิ่งไม้ · postits ลายโพสอิทสะสม
   rarityBg/rarityColor = สีป้ายความหายาก (ย้ายมาจาก ShopSection.tsx ทั้งชุด หน้าตาร้านเหมือนเดิม) */
export type ShopCategoryId = 'statues' | 'hangings' | 'postits'

export interface MockShopItem {
  id: string
  emoji: string
  nameTh: string
  name: string
  price: number
  rarity: string
  rarityBg: string
  rarityColor: string
}

const C_1 = '#F0FBF4'
const C_2 = '#F0FBF4'
const C_3 = '#FFF9C4'
const C_4 = '#8B6000'
const C_5 = '#F5EDFF'
const C_6 = '#7B2FBE'
const C_7 = '#F0FBF4'
const C_8 = '#F5EDFF'
const C_9 = '#7B2FBE'
const C_10 = '#F0FBF4'
const C_11 = '#F0FBF4'
const C_12 = '#F5EDFF'
const C_13 = '#7B2FBE'
const C_14 = '#F5EDFF'
const C_15 = '#7B2FBE'
const C_16 = '#F0FBF4'
const C_17 = '#FFF9C4'
const C_18 = '#8B6000'
const C_19 = '#F0FBF4'
const C_20 = '#F0FBF4'
const C_21 = '#F5EDFF'
const C_22 = '#7B2FBE'
const C_23 = '#F5EDFF'
const C_24 = '#7B2FBE'
const C_25 = '#FFF9C4'
const C_26 = '#8B6000'
const C_27 = '#F0FBF4'

export const MOCK_SHOP_ITEMS: Record<ShopCategoryId, MockShopItem[]> = {
  statues: [
    { id: 'frog-guard', emoji: '🐸', nameTh: 'กบผู้พิทักษ์', name: 'Frog Guard', price: 500, rarity: '⚪ ธรรมดา', rarityBg: C_1, rarityColor: 'var(--g600)' },
    { id: 'fox-statue', emoji: '🦊', nameTh: 'รูปปั้นจิ้งจอก', name: 'Fox Statue', price: 800, rarity: '⚪ ธรรมดา', rarityBg: C_2, rarityColor: 'var(--g600)' },
    { id: 'jade-dragon', emoji: '🐉', nameTh: 'มังกรหยก', name: 'Jade Dragon', price: 1200, rarity: '🟡 พิเศษ', rarityBg: C_3, rarityColor: C_4 },
    { id: 'scholar-koala', emoji: '🐨', nameTh: 'โคอาล่านักวิชาการ', name: 'Scholar Koala', price: 480, rarity: '⚪ ธรรมดา', rarityBg: C_7, rarityColor: 'var(--g600)' },
    { id: 'forest-unicorn', emoji: '🦄', nameTh: 'ยูนิคอร์นป่า', name: 'Forest Unicorn', price: 900, rarity: '🟣 หายาก', rarityBg: C_8, rarityColor: C_9 },
    // ── ใหม่จากเอกสาร (หมวด "รูปปั้นกระถาง") ──
    { id: 'fire-dragon', emoji: '🐲', nameTh: 'มังกรไฟ', name: 'Fire Dragon', price: 2500, rarity: '🟡 พิเศษ', rarityBg: C_3, rarityColor: C_4 },
    { id: 'cat-statue', emoji: '🐱', nameTh: 'แมว', name: 'Cat Statue', price: 500, rarity: '⚪ ธรรมดา', rarityBg: C_1, rarityColor: 'var(--g600)' },
    { id: 'rabbit-statue', emoji: '🐰', nameTh: 'กระต่าย', name: 'Rabbit Statue', price: 350, rarity: '⚪ ธรรมดา', rarityBg: C_2, rarityColor: 'var(--g600)' },
    { id: 'seedling-pot', emoji: '🪴', nameTh: 'กระถางต้นกล้า', name: 'Seedling Pot', price: 700, rarity: '⚪ ธรรมดา', rarityBg: C_7, rarityColor: 'var(--g600)' },
    { id: 'stone-statue', emoji: '🪨', nameTh: 'ก้อนหิน', name: 'Stone', price: 300, rarity: '⚪ ธรรมดา', rarityBg: C_1, rarityColor: 'var(--g600)' },
  ],
  hangings: [
    { id: 'gold-star', emoji: '⭐', nameTh: 'ดาวทอง', name: 'Gold Star', price: 250, rarity: '⚪ ธรรมดา', rarityBg: C_10, rarityColor: 'var(--g600)' },
    { id: 'moon-charm', emoji: '🌙', nameTh: 'จี้พระจันทร์', name: 'Moon Charm', price: 100, rarity: '⚪ ธรรมดา', rarityBg: C_11, rarityColor: 'var(--g600)' },
    { id: 'magic-wand', emoji: '🪄', nameTh: 'ไม้กายสิทธิ์', name: 'Magic Wand', price: 150, rarity: '🟣 หายาก', rarityBg: C_14, rarityColor: C_15 },
    { id: 'circus-bell', emoji: '🔔', nameTh: 'ระฆังวิเศษ', name: 'Magic Bell', price: 320, rarity: '⚪ ธรรมดา', rarityBg: C_16, rarityColor: 'var(--g600)' },
    // ── ใหม่จากเอกสาร (หมวด "ของแขวนกิ่งไม้") ──
    { id: 'pendant-charm', emoji: '📿', nameTh: 'จี้', name: 'Pendant Charm', price: 100, rarity: '⚪ ธรรมดา', rarityBg: C_10, rarityColor: 'var(--g600)' },
  ],
  postits: [
    { id: 'cherry-blossom', emoji: '🌸', nameTh: 'ซากุระ', name: 'Cherry Blossom', price: 100, rarity: '⚪ ธรรมดา', rarityBg: C_19, rarityColor: 'var(--g600)' },
    { id: 'rainbow-swirl', emoji: '🌈', nameTh: 'หมุนวนสายรุ้ง', name: 'Rainbow Swirl', price: 180, rarity: '⚪ ธรรมดา', rarityBg: C_20, rarityColor: 'var(--g600)' },
    { id: 'lucky-clover', emoji: '🍀', nameTh: 'ใบโคลเวอร์โชค', name: 'Lucky Clover', price: 200, rarity: '🟣 หายาก', rarityBg: C_21, rarityColor: C_22 },
    { id: 'butterfly-pat', emoji: '🦋', nameTh: 'ลายผีเสื้อ', name: 'Butterfly Pattern', price: 400, rarity: '🟣 หายาก', rarityBg: C_23, rarityColor: C_24 },
    { id: 'flame-pattern', emoji: '🔥', nameTh: 'ลายเปลวไฟ', name: 'Flame Pattern', price: 800, rarity: '🟡 พิเศษ', rarityBg: C_25, rarityColor: C_26 },
    { id: 'ocean-wave', emoji: '🌊', nameTh: 'คลื่นสมุทร', name: 'Ocean Wave', price: 220, rarity: '⚪ ธรรมดา', rarityBg: C_27, rarityColor: 'var(--g600)' },
    { id: 'calm-butterfly', emoji: '🦋', nameTh: 'ผีเสื้อสงบ', name: 'Calm Butterfly', price: 800, rarity: '🟣 หายาก', rarityBg: C_5, rarityColor: C_6 },
    { id: 'crystal-ball', emoji: '🔮', nameTh: 'ลูกแก้วคริสตัล', name: 'Crystal Ball', price: 1000, rarity: '🟣 หายาก', rarityBg: C_12, rarityColor: C_13 },
    { id: 'diamond-gem', emoji: '💎', nameTh: 'เพชรพลอย', name: 'Diamond Gem', price: 500, rarity: '⚪ ธรรมดา', rarityBg: C_19, rarityColor: 'var(--g600)' },
    // ── ใหม่จากเอกสาร (หมวด "ลายโพสอิทสะสม") ──
    { id: 'magic-parrot', emoji: '🦜', nameTh: 'นกแก้ววิเศษ', name: 'Magic Parrot', price: 2000, rarity: '🟡 พิเศษ', rarityBg: C_25, rarityColor: C_26 },
    { id: 'parrot', emoji: '🦜', nameTh: 'นกแก้ว', name: 'Parrot', price: 1000, rarity: '⚪ ธรรมดา', rarityBg: C_20, rarityColor: 'var(--g600)' },
    { id: 'white-dragon', emoji: '🐉', nameTh: 'มังกรขาว', name: 'White Dragon', price: 3000, rarity: '🟡 พิเศษ', rarityBg: C_17, rarityColor: C_18 },
    { id: 'glass-orb', emoji: '🥛', nameTh: 'แก้ว', name: 'Glass Orb', price: 550, rarity: '⚪ ธรรมดา', rarityBg: C_27, rarityColor: 'var(--g600)' },
    { id: 'magic-flame', emoji: '🔥', nameTh: 'ไฟวิเศษ', name: 'Magic Flame', price: 400, rarity: '⚪ ธรรมดา', rarityBg: C_19, rarityColor: 'var(--g600)' },
    { id: 'cherry-fruit', emoji: '🍒', nameTh: 'เชอรี่', name: 'Cherry', price: 150, rarity: '⚪ ธรรมดา', rarityBg: C_20, rarityColor: 'var(--g600)' },
    { id: 'ribbon-knot', emoji: '🎀', nameTh: 'โบว์', name: 'Ribbon Bow', price: 100, rarity: '⚪ ธรรมดา', rarityBg: C_23, rarityColor: 'var(--g600)' },
  ],
}

/* ── 3) โปรไฟล์ผู้เล่นเริ่มต้น (บัญชีใหม่ในโหมด mock) ───────────────────────────
   ปรับค่าตรงนี้เพื่อทดสอบ flow ได้เลย เช่น coins: 5000 เพื่อลองซื้อของ / unlockedItems: ['frog-guard'] */
export const MOCK_USER_PROFILE: { level: number; exp: number; coins: number; unlockedItems: string[] } = {
  level: 1,
  exp: 0,
  coins: 0,
  unlockedItems: [],
}
