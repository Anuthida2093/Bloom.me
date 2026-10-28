/*============================================================================*\
  tourSteps.ts — ข้อความสอนใช้งาน (Interactive Tour) ทั้งแอปรวมไว้ที่ไฟล์เดียว
  ────────────────────────────────────────────────────────────────────────────
  แก้คำพูดได้ที่นี่ที่เดียว ไม่ต้องเปิดไฟล์หน้าจอ — แต่ละทัวร์คือรายการขั้น (step):
    target   ชื่อจุดไฮไลท์ = ค่า data-tour="..." ที่ใส่ไว้บนปุ่ม/กล่องในหน้านั้น
             'center' = กล่องข้อความลอยกลางจอ ไม่ชี้ปุ่มไหน (ใช้เป็นขั้นแนะนำ/สรุป)
    title    หัวข้อสั้นๆ
    content  คำอธิบาย (ขึ้นบรรทัดใหม่ด้วย \n ได้) — เขียนสั้นๆ 1-2 บรรทัด พอให้เข้าใจ
    placement (ไม่ใส่ก็ได้) ด้านที่กล่องข้อความอยู่ เทียบกับจุดไฮไลท์

  ขั้นที่ชี้ปุ่มที่ไม่ได้แสดงอยู่ตอนนั้น จะถูกข้ามให้อัตโนมัติ (เช่น ปุ่มที่โผล่ตามเงื่อนไข)
  ทัวร์ของแต่ละหน้าเด้งครั้งแรกที่เปิดหน้านั้น — ดูซ้ำได้จากหน้าตั้งค่า > ดูวิธีใช้งานอีกครั้ง

  เพิ่มทัวร์หน้าใหม่: เพิ่ม key ในนี้ → ใส่ data-tour ที่ปุ่ม → วาง <PageTour tourId="..." /> ในหน้านั้น
\*============================================================================*/

export interface TourStepConfig {
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
}

/** selector ของจุดไฮไลท์ — ใช้ร่วมกับ PageTour */
export const tourTargetSelector = (target: string) => `[data-tour="${target}"]`

/** ขั้นท้ายเหมือนกันทุกเควส: ปุ่มออกจากเควส */
const QUEST_CLOSE: TourStepConfig = {
  target: 'quest-close',
  title: 'ออกจากเควส',
  content: 'ออกก่อนทำเสร็จ = ยังไม่นับสำเร็จ กลับมาเล่นใหม่ได้',
}

/** เควสในกรอบเกมกลาง (GameShell): เควสนี้คืออะไร → วิธีเล่น → ปุ่มออก */
function shellQuest(name: string, what: string, howToPlay: string): TourStepConfig[] {
  return [
    { target: 'quest-title', title: name, content: what, placement: 'bottom' },
    { target: 'quest-stage', title: 'วิธีเล่น', content: `${howToPlay}\nเสร็จแล้วกด "รับรางวัล"` },
    QUEST_CLOSE,
  ]
}

/** เควสที่เป็นหน้าเต็มของตัวเอง (สุขภาพจิต + แคลอรี่ตาม BMI): เควสนี้คืออะไร+วิธีเล่น → ปุ่มออก */
function pageQuest(name: string, howToPlay: string): TourStepConfig[] {
  return [
    { target: 'center', title: name, content: howToPlay },
    QUEST_CLOSE,
  ]
}

export const TOURS = {
  /* ───────────────────────── ก่อนเข้าเกม ───────────────────────── */
  mbti: [
    { target: 'center', title: 'ยินดีต้อนรับสู่ Bloom.me 🌱', content: 'ดูแลตัวเอง แล้วต้นไม้ประจำตัวจะโตไปพร้อมคุณ' },
    { target: 'mbti-card', title: 'เลือก MBTI ของคุณ', content: 'แต่ละใบได้ต้นไม้คนละสายพันธุ์ กดใบที่ตรงกับคุณ 1 ใบ', placement: 'right' },
    { target: 'mbti-test-link', title: 'ยังไม่รู้ MBTI?', content: 'กดเพื่อทำแบบทดสอบฟรี แล้วกลับมาเลือก', placement: 'bottom' },
  ],

  /* ───────────────────────── หน้าหลัก (Home) ───────────────────────── */
  home: [
    { target: 'center', title: 'บ้านของต้นไม้คุณ 🏡', content: 'มาดูปุ่มต่างๆ กันสั้นๆ กด "ข้าม" ได้ตลอด' },
    { target: 'home-tree', title: 'ต้นไม้ของคุณ', content: 'เรียนรู้ → ลำต้นโต · ดูแลใจ → ใบ/ดอกงาม · ดูแลกาย → ดินสมบูรณ์', placement: 'auto' },
    { target: 'home-level', title: 'เลเวล', content: 'เลเวลสูงขึ้น ปลดล็อกฉากและแผนที่ใหม่', placement: 'bottom' },
    { target: 'home-exp', title: 'EXP', content: 'ทำเควสได้ EXP เต็มแถบ = เลเวลอัป', placement: 'bottom' },
    { target: 'home-coins', title: 'เหรียญ', content: 'ได้จากเควส ใช้ซื้อของในร้านค้า', placement: 'bottom' },
    { target: 'home-streak', title: 'วันต่อเนื่อง', content: 'มาทุกวันติดกัน ครบ 7 และ 30 วันมีรางวัล', placement: 'bottom' },
    { target: 'home-leaderboard', title: 'จัดอันดับ', content: 'กดชื่อผู้เล่นเพื่อไปดูต้นไม้ของเขา', placement: 'right' },
    // จอเล็ก (≤768px) กระดานพับเก็บไว้ เหลือแค่ปุ่ม ‹ › — ขั้นนี้แสดงแทนขั้นด้านบน (มีได้ทีละอันตามจอ)
    { target: 'home-leaderboard-toggle', title: 'จัดอันดับ', content: 'กดเพื่อเปิดกระดาน แล้วกดชื่อผู้เล่นเพื่อไปดูต้นไม้ของเขา', placement: 'right' },
    { target: 'home-settings', title: 'ตั้งค่า', content: 'เสียง ธีม ภาษา โปรไฟล์ และดูวิธีใช้งานอีกครั้ง', placement: 'left' },
    { target: 'home-tree-info', title: 'ข้อมูลต้นไม้', content: 'ดูความโตแต่ละส่วน และวันนี้ใครรดน้ำให้คุณ', placement: 'left' },
    { target: 'home-mood', title: 'เช็คอินอารมณ์', content: 'บอกความรู้สึกวันนี้ ปลดล็อกไพ่ทิพย์และไดอะรี่', placement: 'left' },
    { target: 'home-notif', title: 'แจ้งเตือน', content: 'ความเคลื่อนไหวล่าสุดของคุณ', placement: 'left' },
    { target: 'home-share', title: 'แชร์', content: 'บันทึกรูปต้นไม้ไปอวดเพื่อน', placement: 'left' },
    { target: 'home-friends', title: 'เพื่อน', content: 'ไปดูต้นไม้เพื่อนและรดน้ำให้กัน', placement: 'left' },
    { target: 'nav-quests', title: 'เควส ⭐', content: 'เริ่มที่นี่! เลือกหมวด แล้วทำเควสรับเหรียญและ EXP', placement: 'top' },
    { target: 'nav-shop', title: 'ร้านค้า', content: 'ใช้เหรียญซื้อของแต่งต้นไม้', placement: 'top' },
    { target: 'nav-home', title: 'หน้าหลัก', content: 'กลับมาที่ต้นไม้ของคุณ', placement: 'top' },
    { target: 'nav-story', title: 'สตอรี่', content: 'อ่าน แชร์เรื่องราว และแชทกับเพื่อน', placement: 'top' },
    { target: 'nav-profile', title: 'โปรไฟล์', content: 'คลังไอเทม สถิติ และประวัติของคุณ', placement: 'top' },
  ],

  /* ───────────────────────── หน้ารวมเควส 3 หมวด ───────────────────────── */
  'zone:knowledge': [
    { target: 'center', title: 'การเรียนรู้ 📚', content: 'ทำตามหมุดทีละด่าน ด่านถัดไปปลดล็อกเมื่อผ่านด่านก่อน' },
    { target: 'learning-side-toggle', title: 'เควสเสริม', content: 'เควสที่นับให้อัตโนมัติ กดเปิดดูได้', placement: 'left' },
    { target: 'quest-section-close', title: 'กลับหน้าหลัก', content: 'สลับหมวดได้จากปุ่ม "เควส" ด้านล่าง', placement: 'left' },
  ],
  'zone:physical': [
    { target: 'gate-list', title: 'สุขภาพกาย 💪', content: 'กดเควสที่อยากทำ ✓ = ทำแล้ว · 🔒 = ยังล็อก', placement: 'auto' },
    { target: 'quest-section-close', title: 'กลับหน้าหลัก', content: 'กดเพื่อกลับไปที่ต้นไม้', placement: 'left' },
  ],
  'zone:mental': [
    { target: 'gate-list', title: 'สุขภาพจิต 🌸', content: 'กดเควสที่อยากทำ บางเควสต้องเช็คอินอารมณ์ก่อน', placement: 'auto' },
    { target: 'gate-screening', title: 'แบบประเมินใจ', content: 'ตอบสั้นๆ 5 ข้อ เป็นความลับ', placement: 'top' },
    { target: 'gate-safety', title: 'ต้องการคนรับฟัง?', content: 'ติดต่อสายด่วน 1323 ได้ทันที', placement: 'top' },
    { target: 'quest-section-close', title: 'กลับหน้าหลัก', content: 'กดเพื่อกลับไปที่ต้นไม้', placement: 'left' },
  ],

  /* ───────────────────────── เควสการเรียนรู้ (10) ───────────────────────── */
  'quest:know-active-focus': shellQuest('ตั้งเป้าหมาย 🎯', 'ตั้งเป้าก่อนเริ่มเรียน/ทำงาน', 'พิมพ์เป้าหมายที่ชัดและท้าทาย แล้วกดยืนยัน'),
  'quest:know-deep-root': shellQuest('โหมดจดจ่อ 🌿', 'จดจ่อ 90 นาที + พัก 15 นาที = 1 รอบ', 'กดเริ่มจับเวลา แล้ววางมือถือ วันละไม่เกิน 3 รอบ'),
  'quest:know-brain-dump': shellQuest('เทกระเป๋าความจำ 🧠', 'พูดทบทวนสิ่งที่เพิ่งเรียน', 'กดไมค์ แล้วพูดทุกอย่างที่จำได้ ห้ามดูโน้ต'),
  'quest:know-cross-pollination': shellQuest('ผสมเกสรข้ามศาสตร์ 🔀', 'เรียนนานเกิน 2 ชม. ให้สลับวิชา', 'เลือกหัวข้อที่เรียนอย่างน้อย 2 เรื่อง แล้วกดยืนยัน'),
  'quest:know-daily-checkin': shellQuest('เช็กอินรายวัน 💧', 'ประเมินการเรียนรู้วันนี้', 'ตอบให้ครบ 5 ข้อ แล้วดูบัวรดน้ำต้นไม้'),
  'quest:know-content-review': shellQuest('แคปซูลเวลา 📅', 'นัดตัวเองกลับมาทบทวน', 'เลือกวัน 1-30 วันข้างหน้า ถึงเวลาระบบจะเตือน'),
  'quest:know-strategic-delay': shellQuest('กลยุทธ์การรอคอย ⏳', 'วางแผนทบทวนเรื่องที่อยากจำนานๆ', 'เลือกเรื่องและระยะเวลา ระบบจัดตารางทบทวน 3 รอบให้'),
  'quest:know-mirror-of-truth': shellQuest('กระจกแห่งความจริง 🪞', 'ย้อนดูเควสที่ทำวันนี้', 'เลือกความรู้สึกของแต่ละเควส ดี / เฉยๆ / ไม่ค่อยดี'),
  'quest:know-guardian-of-rest': shellQuest('ผู้พิทักษ์การพักผ่อน 🛡️', 'นับเวลาพักให้อัตโนมัติ', 'พักครบ 15 นาทีหลังจดจ่อ แล้วกดรับรางวัล อย่าฝึกเกิน 4-5 ชม./วัน'),
  'quest:know-ten-year-forest': shellQuest('ป่าแห่งสิบปี 🏕️', 'ปฏิทินวันต่อเนื่อง', 'เข้าแอปทุกวัน ครบ 21 วันขึ้นไปกดรับรางวัลได้วันละครั้ง'),

  /* ───────────────────────── เควสสุขภาพกาย (6) ───────────────────────── */
  'quest:phys-sunlit-root': shellQuest('รับแดดยามเช้า ☀️', 'แดดเช้าช่วยให้สดชื่นทั้งวัน', 'ออกไปรับแดด แล้วถ่ายรูปยืนยัน'),
  'quest:phys-green-vision': shellQuest('พักสายตา 👀', 'กฎ 20-20-20', 'กดเริ่ม แล้วมองไกลๆ จนระฆังดัง'),
  'quest:phys-hydration-drop': shellQuest('ดื่มน้ำ 💧', 'ดื่มได้สูงสุด 10 แก้ว/วัน', 'ถ่ายรูปแก้วเต็ม ดื่มให้หมด แล้วถ่ายรูปแก้วเปล่า'),
  'quest:phys-vitality-steps': [
    { target: 'center', title: 'ก้าวเพื่อสุขภาพ 🦶', content: 'เลือกแผนที่วันละ 1 ใบ แล้วเดินให้ถึงเป้าก้าววันนี้\nถึงเส้นชัยเปิดหีบสมบัติได้วันละ 1 ใบ' },
    QUEST_CLOSE,
  ],
  'quest:phys-balanced-nutrients': pageQuest('แคลอรี่ตาม BMI 🍽️', 'ถ่ายรูปหรือเลือกเมนูให้ครบ 3 มื้อ\nกินพอดีเป้าได้รางวัลอัตโนมัติตอน 18:00'),
  'quest:phys-soil-restoration': shellQuest('คลิปกล่อมนอน 🌙', 'ช่วยให้หลับง่ายขึ้น', 'เลือกวิว เสียง และเวลา (30 นาทีขึ้นไป) แล้ววางจอหลับตาฟัง'),

  /* ───────────────────────── เควสสุขภาพจิต (5) ───────────────────────── */
  'quest:ment-oracle-activation': pageQuest('ไพ่ทิพย์ 🔮', 'เลือกไพ่ 1 ใบ อ่านคำคม แล้วทำกิจกรรมสั้นๆ 2 นาที'),
  'quest:ment-cognitive-incinerator': pageQuest('เตาเผาความคิด 🔥', 'พิมพ์ความคิดที่กวนใจลงบนหิน แล้วปัดทิ้งลงกองไฟ'),
  'quest:ment-mindful-anchor': pageQuest('ทอดสมอใจ ⚓', 'หายใจตามวงกลม เข้า 4 · กลั้น 7 · ออก 8 วินาที นาน 2 นาที'),
  'quest:ment-reframer-journal': pageQuest('ไดอะรี่ของฉัน 📖', 'เขียนเล่าเรื่องวันนี้ ถ้ามีเรื่องหนักใจ AI จะช่วยมองมุมใหม่'),
  'quest:ment-gratitude-shield': pageQuest('คำขอบคุณ 🛡️', 'ขอบคุณสิ่งดีๆ วันละ 1 เรื่อง ครบ 14 วันได้ออร่ารอบต้นไม้'),

  /* ───────────────────────── หน้าดูต้นไม้ของเพื่อน / ผู้เล่นอื่น ───────────────────────── */
  // ขั้นรดน้ำ (friend-water) กับขั้นเพิ่มเพื่อน (friend-add) แสดงอย่างใดอย่างหนึ่งตามสถานะการติดตาม
  friendTree: [
    { target: 'friend-name', title: 'บ้านเพื่อน 🌳', content: 'คุณกำลังดูต้นไม้ของคนนี้ แตะต้นไม้เพื่อดูสรุป', placement: 'bottom' },
    { target: 'friend-card', title: 'ข้อมูลต้นไม้', content: 'ดูความโตของต้นไม้เพื่อน', placement: 'left' },
    { target: 'friend-water', title: 'รดน้ำให้เพื่อน 💧', content: 'แตะหยดน้ำ แล้วแตะบัว รดได้วันละครั้ง\nรดให้กันทั้งคู่ = นับวันต่อเนื่อง ครบ 100 วันได้การ์ด', placement: 'left' },
    { target: 'friend-add', title: 'เพิ่มเพื่อน', content: 'กดเพื่อติดตาม แล้วรดน้ำให้ได้เลย', placement: 'left' },
    { target: 'friend-back', title: 'กลับบ้าน', content: 'กลับไปที่ต้นไม้ของคุณ', placement: 'right' },
  ],
  friendWaterCan: [
    { target: 'friend-water-can', title: 'แตะบัวเพื่อรดน้ำ 🚿', content: 'แตะที่บัวเพื่อเทน้ำให้เพื่อน', placement: 'auto' },
  ],

  /* ───────────────────────── หน้าย่อยของเควสสุขภาพจิต ───────────────────────── */
  moodGate: [
    { target: 'center', title: 'เช็คอินอารมณ์ก่อนนะ', content: 'เควสนี้ปรับตามอารมณ์วันนี้ กดเช็คอินแล้วเข้าเควสได้เลย' },
  ],
  screening: [
    { target: 'center', title: 'แบบประเมินความรู้สึก', content: 'ตอบตามจริง เป็นความลับ ยังไม่พร้อมกด "ขอข้ามไว้ก่อน" ได้' },
  ],
  safetyNet: [
    { target: 'center', title: 'คุณไม่ได้อยู่คนเดียว 💚', content: 'กดเพื่อติดต่อสายด่วน 1323 หรือผู้เชี่ยวชาญได้ทันที' },
  ],

  /* ───────────────────────── หน้าอื่นๆ จากหน้าหลัก ───────────────────────── */
  shop: [
    { target: 'shop-filter', title: 'ร้านค้า 🛍️', content: 'เลือกหมวด ของพิเศษ/หายากต้องใช้การ์ดแลกซื้อด้วย', placement: 'bottom' },
    { target: 'shop-grid', title: 'ซื้อของ', content: 'กดไอเทมเพื่อซื้อ แล้วไปวางบนต้นไม้ที่หน้าโปรไฟล์', placement: 'top' },
  ],
  profile: [
    { target: 'profile-inventory', title: 'คลังไอเทม', content: 'กดไอเทมเพื่อวางบนต้นไม้ กดซ้ำเพื่อถอด', placement: 'auto' },
    { target: 'quest-close', title: 'ปิดโปรไฟล์', content: 'กลับหน้าหลัก', placement: 'left' },
  ],
  story: [
    { target: 'center', title: 'สตอรี่ 📖', content: 'อ่าน ถูกใจ คอมเมนต์ และแชทกับเพื่อน' },
    { target: 'story-compose', title: 'โพสต์ใหม่', content: 'แชร์เรื่องราวหรือรูป ไม่เปิดเผยชื่อก็ได้', placement: 'left' },
  ],
  friends: [
    { target: 'friends-search', title: 'เพื่อน 🤝', content: 'ค้นหาเพื่อน แล้วกดเพื่อไปดูต้นไม้และรดน้ำให้', placement: 'bottom' },
  ],
  leaderboard: [
    { target: 'center', title: 'จัดอันดับ 🏆', content: 'กดชื่อผู้เล่นเพื่อไปดูต้นไม้ของเขา' },
  ],
  settings: [
    { target: 'settings-replay-tour', title: 'ดูวิธีใช้งานอีกครั้ง', content: 'กดเพื่อให้คำแนะนำทุกหน้ากลับมาแสดง', placement: 'top' },
  ],
  moodCheckin: [
    { target: 'mood-text', title: 'เช็คอินอารมณ์ 💭', content: 'พิมพ์สั้นๆ แล้วกดวิเคราะห์ หรือ...', placement: 'bottom' },
    { target: 'mood-grid', title: 'เลือกอารมณ์เอง', content: 'กดอารมณ์ที่ตรงที่สุด จะกลายเป็นโพสต์อิทบนต้นไม้', placement: 'top' },
  ],
  treeStats: [
    { target: 'tree-stats', title: 'สถานะต้นไม้ 🌳', content: 'ดูว่าวันนี้ใครรดน้ำให้คุณ และส่วนไหนของต้นไม้ที่ยังโตช้า', placement: 'left' },
  ],
  notifications: [
    { target: 'notification-panel', title: 'แจ้งเตือน 🔔', content: 'เปิดแล้วตัวเลขแจ้งเตือนจะหายไป', placement: 'left' },
  ],
} satisfies Record<string, TourStepConfig[]>

export type TourId = keyof typeof TOURS
