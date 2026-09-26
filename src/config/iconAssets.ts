/*============================================================================*\
  iconAssets.ts — [ไฟล์ใหม่] จุดรวม path ไอคอนรูปจริงทั้งหมด แทนที่อีโมจิทีละจุดทั่วระบบ
  ────────────────────────────────────────────────────────────────────────────
  [สำคัญ] path ทุกตัวคัดลอกมาจากผล `ls -la` ของโฟลเดอร์จริงตรงๆ ไม่ใช่จากชื่อไฟล์ในเอกสาร
  "ภาพรวมโปรเจค new.docx" ตรงๆ เพราะคอลัมน์ "ชื่อไฟล์" ในเอกสารพิมพ์ผิดเกือบทุกแถว (ส่วนใหญ่
  เป็น .npg/.nng แทน .png จริง) เทียบตัวอย่างที่ต่างกันจริง:
    - [อัปเดต 2026-09-26] ชุด BADGE_ICONS ย้ายไป decorations/ และเปลี่ยนชื่อไฟล์ตามรายชื่อของ
      เจ้าของโปรเจกต์แล้ว (Water.png/Coins.png/Item.png/Friends.png/Home.png ฯลฯ และ
      'Learning Quests.png' ไม่มีนามสกุลซ้อนแล้ว) — ดูหมายเหตุเหนือ BADGE_ICONS
    - เอกสารเขียน fox.jpeg — ไฟล์จริงคือ fox.png
    - [รอบก่อนหน้า] ls โฟลเดอร์ badges เจอไฟล์ 'Physical Quests.png' แล้ว จึงเพิ่ม key
      physicalTab ได้แล้ว — QUEST_TABS หมวดสุขภาพกาย (💪) ใช้รูปจริงได้แล้ว
    - [รอบนี้ — เปิดเอกสาร docx จริงด้วยตัวเอง แกะ XML ของตารางรูปทั้งหมดออกมาอ่านตรงๆ]
      พบว่าเอกสารมีตาราง "รูป badge/สถิติ" (26 แถว) ที่ยังไม่เคยใช้ครบ — แถว 🌸 Flower →
      Flower.npg มีไฟล์จริงคือ flower.png (มีอยู่จริงในโฟลเดอร์ badges) แต่แถว 🍃 Leaf →
      leaf.npg **ไม่มีไฟล์จริง** ในโฟลเดอร์เลย (ไม่มี leaf.png ใดๆ) จึงเพิ่มเฉพาะ flower คงเว้น
      leaf ไว้ ดูสรุปการตัดสินใจแต่ละจุดในหมายเหตุของ ITEM_ICONS ด้านล่างด้วย (พบว่า
      ITEM_ICONS.jade-dragon และ .flame-pattern ที่เดาไว้ในรอบก่อนหน้าจับคู่ผิดไฟล์ ตอนนี้แก้แล้ว)
    - [ชื่อไฟล์ในโฟลเดอร์ Item ที่ต่างจากที่คาดไว้] ls จริงพบ 'Magic Staff.png' (ตัว S ใหญ่ใน
      Staff ไม่ใช่ 'Magic staff.png' ตัวเล็กตามที่เอกสาร/ผู้ใช้พิมพ์มา) และ 'glass.png' (ตัว g
      เล็กทั้งหมด ไม่ใช่ 'Glass.png' ตัว G ใหญ่ตามที่คาดไว้)
  ห้ามแก้ path ในไฟล์นี้ให้ตรงกับเอกสารร่างแบบไม่เช็คของจริงอีก ถ้าจะเพิ่ม/แก้ค่าใดในอนาคต
  ต้อง ls โฟลเดอร์จริงก่อนเสมอ */

/** รูป badge/สถิติ/ปุ่มระบบ ทั่วไป — จาก public/assets/images/decorations/
 *  [ย้ายโฟลเดอร์ — 2026-09-26] เดิมอยู่ที่ icons/badges/ เจ้าของโปรเจกต์ขอย้ายมา decorations/ ทั้งชุด
 *  (ไฟล์กลุ่มนี้ไม่ใช่ "ไอคอน") ย้ายด้วย git mv และเปลี่ยนชื่อไฟล์ให้ตรงรายชื่อที่เจ้าของโปรเจกต์ให้มา
 *  (ตัวพิมพ์ใหญ่นำ เช่น Water.png/Coins.png/Home.png, แก้ 'Learning Quests.npg.png' → 'Learning
 *  Quests.png') — key ทุกตัวคงชื่อเดิม โค้ดที่เรียก BADGE_ICONS.xxx จึงไม่ต้องแก้
 *  [ยังไม่มีไฟล์] leaf (🍃) — ไม่มีไฟล์ leaf ใดๆ ทั้งในโฟลเดอร์เดิมและใหม่ */
const DECOR = '/assets/images/decorations'

export const BADGE_ICONS = {
  water: `${DECOR}/Water.png`,
  seed: `${DECOR}/Seed.png`,
  exp: `${DECOR}/EXP.png`,
  tree: `${DECOR}/tree.png`,
  streak: `${DECOR}/Streak.png`,
  coins: `${DECOR}/Coins.png`,
  trophy: `${DECOR}/badge.png`,
  item: `${DECOR}/Item.png`,
  questTab: `${DECOR}/Quest Icon.png`,
  learningTab: `${DECOR}/Learning Quests.png`,
  physicalTab: `${DECOR}/Physical Quests.png`,
  mentalTab: `${DECOR}/Mental Quests.png`,
  store: `${DECOR}/Store.png`,
  home: `${DECOR}/Home.png`,
  checkin: `${DECOR}/Check-in.png`,
  profile: `${DECOR}/profile.png`,
  rank1: `${DECOR}/1.png`,
  rank2: `${DECOR}/2.png`,
  rank3: `${DECOR}/3.png`,
  friends: `${DECOR}/Friends.png`,
  share: `${DECOR}/Share.png`,
  notification: `${DECOR}/Notification.png`,
  // ไม่มีคำอธิบายจุดใช้งานในเอกสาร — ยังไม่ได้ต่อสายใช้งานที่ไหน เก็บ path ไว้เผื่ออนาคต
  flower: `${DECOR}/Flower.png`,
  // บัวรดน้ำบินเข้าต้นไม้หลังปิดเควส Balanced Nutrients สำเร็จ (ดู WateringCanFx.tsx)
  wateringCan: `${DECOR}/Watering Can.png`,
  // กล่องพยาบาลลอยมุมจอ แจ้งเตือนอารมณ์ลบต่อเนื่อง (ดู MedicalBoxAlert.tsx)
  medicalBox: `${DECOR}/Medical Box.png`,
  // [ใหม่] ปุ่มควบคุมทั่วไป — แทนสัญลักษณ์ข้อความ ←/✕/⚙️
  back: `${DECOR}/Return.png`,
  close: `${DECOR}/Cross.png`,
  settings: `${DECOR}/Settings.png`,
} as const

/** ไอคอนหมวดเควส (QUEST_TABS[].emoji) — ครบทั้ง 3 หมวดแล้ว (รอบก่อนหน้าหมวดสุขภาพกายยังไม่มี
 *  ไฟล์ "Physical Quests.png" อยู่จริง ตอนนี้ ls เจอไฟล์แล้วจึงเพิ่ม key ได้ครบ) */
export const QUEST_TAB_ICONS: Partial<Record<'knowledge' | 'physical' | 'mental', string>> = {
  knowledge: BADGE_ICONS.learningTab,
  physical: BADGE_ICONS.physicalTab,
  mental: BADGE_ICONS.mentalTab,
}

/** [เพิ่มรอบนี้] ไอคอนแท็บจัดอันดับ (RANK_CATEGORIES ใน src/config/leaderboardData.ts) —
 *  เช็คแล้วตรงกับความหมายของ BADGE_ICONS ที่มีอยู่แล้วครบทั้ง 4 แท็บ (level ใช้ tree.png
 *  เพราะ icon เดิมคือ 🌳 ต้นไม้/ระดับรวม ไม่ใช่ trophy — trophy.png ผูกกับ 🏆 ที่อื่นแทน) */
export const RANK_CATEGORY_ICONS: Record<'level' | 'knowledgeStack' | 'healthStack' | 'emotionStack', string> = {
  level: BADGE_ICONS.tree,
  knowledgeStack: BADGE_ICONS.learningTab,
  healthStack: BADGE_ICONS.physicalTab,
  emotionStack: BADGE_ICONS.mentalTab,
}

/** ไอคอนเควสแต่ละตัว — key = QuestDef.code จริงใน questCatalog.ts (เช็คตรงกันแล้ว)
 *  จาก public/assets/images/icons/quests/ — เควสที่ไม่มีในนี้ (know-guardian-of-rest,
 *  know-ten-year-forest) ไม่มีไฟล์ภาพจริงในโฟลเดอร์ ให้ผู้เรียกใช้ fallback เป็น quest.icon
 *  (emoji เดิม) เอง อย่าใส่ key มั่วเพื่อให้ครบ */
export const QUEST_ICONS: Record<string, string> = {
  'know-active-focus': '/assets/images/icons/quests/Active Focus.png',
  'know-deep-root': '/assets/images/icons/quests/The Deep Root.png',
  'know-brain-dump': '/assets/images/icons/quests/Brain Dump.png',
  'know-cross-pollination': '/assets/images/icons/quests/Cross-Pollination.png',
  'know-daily-checkin': '/assets/images/icons/quests/Daily Learning Check-in.png',
  // [แก้ตามที่ระบุ] key เปลี่ยนตาม code ใหม่ 'know-content-review' (ดู questCatalog.ts) —
  // ยังไม่มีไฟล์ภาพใหม่ชื่อ "Time Capsule.png" ให้ ใช้ไฟล์เดิม "Strategic Delay.png" ไปก่อน
  'know-content-review': '/assets/images/icons/quests/Strategic Delay.png',
  // [แก้ตามที่ระบุ] key เปลี่ยนตาม code ใหม่ที่ sync กับ backend แล้ว (ดู questCatalog.ts) —
  // ไฟล์ภาพจริงบนดิสก์ยังชื่อเดิม (Photosynthesis.png/Pure Water.png) ไม่ได้เปลี่ยนไฟล์
  'phys-sunlit-root': '/assets/images/icons/quests/Photosynthesis.png',
  'phys-green-vision': '/assets/images/icons/quests/Green Vision.png',
  'phys-hydration-drop': '/assets/images/icons/quests/Pure Water.png',
  'phys-soil-restoration': '/assets/images/icons/quests/Soil Restoration.png',
  'ment-oracle-activation': '/assets/images/icons/quests/Oracle Activation.png',
  // [แก้จากเอกสารร่าง] เอกสารเขียน key ว่า 'ment-incinerator' — code จริงใน questCatalog.ts
  // คือ 'ment-cognitive-incinerator' (เช็คแล้วตรงกับ ALL_QUESTS จริง)
  'ment-cognitive-incinerator': '/assets/images/icons/quests/Cognitive Incinerator.png',
  'ment-mindful-anchor': '/assets/images/icons/quests/Mindful Anchor.png',
  'ment-reframer-journal': '/assets/images/icons/quests/Reframer.png',
  'ment-gratitude-shield': '/assets/images/icons/quests/Gratitude.png',
}

/** [ไม่ได้ใช้จริง] นกฮูกบน LearningQuestMap.tsx วาดด้วย inline SVG (ดู OwlAvatar.tsx) มาแต่ต้น
 *  ไม่เคยเป็น emoji 🦉 เลยสักจุดในโค้ด (grep ทั้งโปรเจกต์แล้วไม่เจอ) จึงไม่มีจุดไหนต้องแทน —
 *  เก็บ path ไฟล์ไว้เผื่ออนาคตอยากเปลี่ยนจาก SVG เป็นภาพจริงแทน แต่ยังไม่ได้ต่อสายใช้งานจริง */
export const OWL_AVATAR_ICON = '/assets/images/icons/quests/OwlAvatar.png'

/** ไอคอนไอเทมตกแต่ง — key = DecorationItemMeta id จริงใน src/config/decorationItems.ts
 *  (ไม่ใช่ชื่อไฟล์ตรงๆ แบบตารางในเอกสาร เพราะ id จริงในระบบเป็น 'frog-guard'/'fox-statue' ฯลฯ)
 *
 *  [แก้รอบนี้ — เปิดเอกสาร docx จริงด้วยตัวเอง ไม่ใช่เดา] ตาราง "รายการไอเทม" ในเอกสารมี 23
 *  แถวจริง (ก่อนหน้านี้เคยใช้แค่ ~11 ตัวแรกและเดาบางคู่แบบ "ความมั่นใจปานกลาง") ตอนนี้เทียบ
 *  ทุกแถวกับชื่อ/ราคา/หมวดในเอกสารแล้ว พบว่า 2 คู่ที่เดาไว้รอบก่อน "ผิดไฟล์จริง":
 *    - 'jade-dragon' (มังกรหยก) เคยชี้ไป dragon1.png ด้วยเหตุผล "โทนสีเย็นใกล้เคียงหยก" —
 *      แต่เอกสารระบุชัดว่า dragon1.png คือ "มังกรขาว" (คนละตัวกับมังกรหยก) จึงตัด mapping นี้
 *      ออก ('jade-dragon' กลับไปใช้ emoji 🐉 เดิม เพราะไม่มีไฟล์ "มังกรหยก" จริงในเอกสาร/โฟลเดอร์)
 *      และเพิ่มไอเทมใหม่ 'fire-dragon'(มังกรไฟ→dragon0.png) กับ 'white-dragon'(มังกรขาว→
 *      dragon1.png) แยกเป็นไอเทมของตัวเองแทน ตามชื่อจริงในเอกสาร
 *    - 'flame-pattern' (ลายเปลวไฟ) เคยชี้ไป "magic light.png" ด้วยเหตุผล "ภาพเทียน/เปลวไฟ" —
 *      แต่เอกสารระบุว่า magic light.png คือไอเทม "ไฟวิเศษ" ต่างหาก (คนละชื่อ/ราคากับลายเปลวไฟ)
 *      จึงตัด mapping นี้ออก ('flame-pattern' กลับไปใช้ emoji 🔥 เดิม) และเพิ่มไอเทมใหม่
 *      'magic-flame' (ไฟวิเศษ→magic light.png) แยกต่างหาก
 *  ส่วน 'crystal-ball'→marble.png (ลูกแก้ว) และ 'cherry-blossom'→sakura.png (ซากุระ) ที่เคย
 *  เป็น "ความมั่นใจปานกลาง" ตอนนี้ยืนยันถูกต้องแล้วจากเอกสารจริง (ชื่อภาพตรงกับชื่อไอเทมเป๊ะ)
 *
 *  ไอเทมที่ไม่มีไฟล์จริงจับคู่ได้ (คงอีโมจิเดิม): scholar-koala, gold-star, circus-bell,
 *  rainbow-swirl, ocean-wave, golden-crown, butterfly-pat, glowing-butterfly, jade-dragon,
 *  flame-pattern — ไม่มีแถวไหนในตาราง 23 รายการของเอกสารตรงกับไอเทมเหล่านี้เลย */
export const ITEM_ICONS: Record<string, string> = {
  // ── ไอเทมเดิมที่มีอยู่แล้วในระบบ — จับคู่ความหมายตรงกับแถวในเอกสารแล้ว อัปเดตรูปเป็นไฟล์จริง ──
  'frog-guard': '/assets/images/icons/Item/frog.png', // กบวิเศษ
  'fox-statue': '/assets/images/icons/Item/fox.png', // สุนัขจิ้งจอก
  'forest-unicorn': '/assets/images/icons/Item/unicorn.png', // ยูนิคอร์น
  'lucky-clover': '/assets/images/icons/Item/Clover.png', // Clover
  'diamond-gem': '/assets/images/icons/Item/diamond.png', // เพชร
  'moon-charm': '/assets/images/icons/Item/moon pendant.png', // รูปเสี้ยวพระจันทร์
  'magic-wand': '/assets/images/icons/Item/Magic Staff.png', // ไม้เท้าเวทมนตร์ (ls จริง: ตัว S ใหญ่)
  'crystal-ball': '/assets/images/icons/Item/marble.png', // ลูกแก้ว
  'cherry-blossom': '/assets/images/icons/Item/sakura.png', // ซากุระ
  'calm-butterfly': '/assets/images/icons/Item/butterfly.png', // ผีเสื้อ

  // ── ไอเทมใหม่ทั้งหมด 13 ตัวจากเอกสาร — เพิ่มเข้า ShopSection.tsx/decorationItems.ts จริงแล้ว ──
  'fire-dragon': '/assets/images/icons/Item/dragon0.png', // มังกรไฟ
  'white-dragon': '/assets/images/icons/Item/dragon1.png', // มังกรขาว
  'magic-parrot': '/assets/images/icons/Item/bird.png', // นกแก้ววิเศษ
  'parrot': '/assets/images/icons/Item/bird1.png', // นกแก้ว
  'ribbon-knot': '/assets/images/icons/Item/knot.png', // โบว์
  'glass-orb': '/assets/images/icons/Item/glass.png', // แก้ว (ls จริง: ตัว g เล็กทั้งหมด)
  'magic-flame': '/assets/images/icons/Item/magic light.png', // ไฟวิเศษ
  'cat-statue': '/assets/images/icons/Item/cat.png', // แมว
  'rabbit-statue': '/assets/images/icons/Item/rabbit.png', // กระต่าย
  'pendant-charm': '/assets/images/icons/Item/pendant.png', // จี้
  'cherry-fruit': '/assets/images/icons/Item/cherry.png', // เชอรี่
  'seedling-pot': '/assets/images/icons/Item/seedling pot.png', // กระถางต้นกล้า
  'stone-statue': '/assets/images/icons/Item/stone.png', // ก้อนหิน
}
