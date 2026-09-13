# DB_CHANGES.md — ตัวแปร/ตารางที่ต้องเพิ่มในฐานข้อมูล

> เอกสารนี้ตอบข้อกำหนดที่ว่า **"ถ้าตารางไหนไม่มีตัวแปรที่ต้องใช้ ให้บอกว่าต้องเพิ่มตัวแปรอะไรในตารางไหน"**
> ทุกข้อด้านล่างคือสิ่งที่โค้ดฝั่งหน้าเว็บที่เขียนใหม่ **ใช้งานจริงแล้ว** และรอฝั่ง backend ตามมาเท่านั้น
> อ้างอิง schema ปัจจุบันจาก `docs/DATA_DICTIONARY.md` (users, tree_progress, quests, quest_logs,
> mood_entries, post_its, shop_items, user_items, mental_health_screenings, badges, user_badges)

---

## 1) ตาราง `users` — เพิ่มคอลัมน์

| คอลัมน์ที่ต้องเพิ่ม | ชนิด | ใช้ทำอะไร | ไฟล์ที่ใช้ |
|---|---|---|---|
| `gratitudeStreak` | `Int @default(0)` | นับคืนติดต่อกันที่บันทึกความขอบคุณ (เกราะแห่งความขอบคุณ) | `MentalHealthDashboard.tsx` |
| `auraUnlockedAt` | `DateTime?` | เวลาที่ปลดล็อกออร่าเรืองแสงรอบต้นไม้ (ครบ 14 คืน) | `AppContext.tsx` |
| `lastScreeningAt` | `DateTime?` | เวลาที่ทำแบบคัดกรองครั้งล่าสุด | `AppContext.tsx` |
| `nextScreeningDueAt` | `DateTime?` | วันครบกำหนดคัดกรองรอบถัดไป (+30 วัน) | `AppContext.tsx`, แดชบอร์ด |
| `hasSoot` | `Boolean @default(false)` | คราบหมองบนใบไม้เมื่อไม่ทำเควสเตาเผาขยะความคิด (ตอนนี้หายทุกครั้งที่รีเฟรช) | `AppContext.tsx` |
| `focusMinutesToday` | `Int @default(0)` | นาทีโฟกัสสะสมของวันนี้ (โควตา Guardian of Rest) | `DeepRootGame.tsx` |
| `focusDate` | `Date?` | วันที่ของ `focusMinutesToday` ไว้รีเซ็ตเมื่อข้ามวัน | `AppContext.tsx` |
| `bedtime` | `String?` (`"HH:MM"`) | เวลานอนที่ผู้ใช้ตั้งเอง | `SoilRestorationGame.tsx` |
| `curfewHours` | `Int @default(1)` | ตัดจอกี่ชั่วโมงก่อนถึงเวลานอน | `SoilRestorationGame.tsx`, `QuestSection.tsx` |

> `currentRiskLevel` **มีอยู่แล้ว** ในตาราง users — โค้ดใหม่ใช้ตัวนี้เป็นหัวใจของระบบล็อกเควส
> ไม่ได้สร้างตัวแปรซ้ำซ้อนขึ้นมาใหม่

---

## 2) ตาราง `mood_entries` — เพิ่มคอลัมน์

ปัจจุบันมีแค่ `category` / `mood` / `note` / `createdAt` ซึ่ง **นับ "เศร้าติดกัน 3 วัน" ไม่ได้จริง**
(ถ้าผู้ใช้บันทึกวันละหลายครั้ง จะนับซ้ำทันที)

| คอลัมน์ที่ต้องเพิ่ม | ชนิด | ใช้ทำอะไร |
|---|---|---|
| `colorCode` | `enum MoodColorCode { YELLOW GREEN BLUE RED GRAY }` | สีน้ำยาที่ผู้ใช้เท (5 สีตามเอกสารเควสสุขภาพจิต) |
| `moodScore` | `Int` (1–5) | ความเข้มของอารมณ์ = จำนวนขวดที่เทลงหม้อ |
| `logDate` | `Date` | วันที่แบบไม่มีเวลา (โซน Asia/Bangkok) |
| — | `@@unique([userId, logDate])` | **สำคัญที่สุด** — 1 คน 1 วัน 1 record ทำให้นับวันติดต่อกันได้แม่นยำระดับฐานข้อมูล |

---

## 3) ตาราง `mental_health_screenings` — เพิ่มคอลัมน์

| คอลัมน์ที่ต้องเพิ่ม | ชนิด | ใช้ทำอะไร |
|---|---|---|
| `nextDueAt` | `DateTime?` | วันครบกำหนดรอบถัดไป (ใช้คุมรอบ 30 วัน ที่ระดับข้อมูล ไม่ใช่คำนวณสดในหน้าเว็บอย่างเดียว) |
| `triggerType` | `enum ScreeningTrigger { ROUTINE EMERGENCY }` | แยกว่าเป็นการตรวจตามรอบ หรือถูกจุดชนวนเพราะอารมณ์ลบติดกัน 3 วัน |
| `answers` | `Json` | เก็บคำตอบรายข้อ (5 ข้อ ข้อละ 0–3) ไว้ทำสถิติย้อนหลัง |

---

## 4) ตาราง `quests` — เพิ่มคอลัมน์

| คอลัมน์ที่ต้องเพิ่ม | ชนิด | ใช้ทำอะไร |
|---|---|---|
| `gameKey` | `String?` | ชี้ว่าเควสนี้ใช้ไฟล์เกมไหนใน `src/components/quest/games/` (ดู `questGameRegistry.ts`) |
| `energyLevel` | `enum QuestEnergy { LOW HIGH }` | ใช้ล็อกเควสหนักเมื่อผลคัดกรองเป็น MODERATE/HIGH |
| `isCalming` | `Boolean @default(false)` | เควสสายผ่อนคลายที่ระบบจะดันขึ้นมาแทนเควสหนัก |
| `theory` | `String?` | ทฤษฎีรองรับของเควส (ตอนนี้ hard-code อยู่ใน `questCatalog.ts` ฝั่งหน้าเว็บ) |
| `howTo` | `String?` | วิธีเล่นแบบย่อ แสดงหัวป๊อปอัพเกม |

---

## 5) ตาราง `quest_logs` — เพิ่มคอลัมน์

| คอลัมน์ที่ต้องเพิ่ม | ชนิด | ใช้ทำอะไร |
|---|---|---|
| `payload` | `Json?` | สิ่งที่ผู้ใช้กรอก/เลือกในรอบนั้น (เป้าหมาย, หัวข้อทบทวน, จำนวนแก้วน้ำ ฯลฯ) |
| `durationSeconds` | `Int?` | ทำจริงไปกี่วินาที (ตอนนี้บันทึกได้แค่ "ทำ/ไม่ทำ") |

---

## 6) ตารางใหม่ทั้งหมด (ยังไม่มีใน schema เลย)

### 6.1 `activity_logs` — ตรงกับ Activity/Action ใน ER Diagram ของเอกสาร
```prisma
model ActivityLog {
  id              String   @id @default(uuid())
  userId          String
  activityType    ActivityType
  durationSeconds Int      @default(0)
  meta            Json?
  completedAt     DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
  @@index([userId, completedAt])
}

enum ActivityType {
  BREATHING INCINERATOR ORACLE SUNLIGHT GREEN_VISION HYDRATION
  SCREEN_CURFEW DEEP_WORK BRAIN_DUMP REVIEW FEEDBACK CHECKIN
}
```
**ทำไมต้องมี:** แดชบอร์ดสุขภาพใจแสดง "นาทีฝึกหายใจ 7 วัน / ความคิดที่เผาไป / ไพ่ที่เปิด"
ซึ่ง `quest_logs` เก็บไม่ได้เพราะรู้แค่ว่าเควสสำเร็จหรือยัง

### 6.2 `journal_entries` — บันทึกของ Reframer Journal + Gratitude Shield
```prisma
model JournalEntry {
  id             String   @id @default(uuid())
  userId         String
  questCode      String
  title          String
  originalText   String
  aiReframedText String
  isPositive     Boolean  @default(false)
  entryDate      DateTime @default(now())
  @@unique([userId, questCode, entryDate])
}
```
**ทำไมต้องมี:** ตอนนี้เป็น mock ฝั่ง client ล้วนๆ ปิดแอปแล้วหายหมด และ `gratitudeStreak` คำนวณจากตารางนี้

### 6.3 `oracle_draws` — ไพ่ทิพย์ + ภารกิจ 2 นาที
```prisma
model OracleDraw {
  id          String    @id @default(uuid())
  userId      String
  drawDate    DateTime  @default(now())
  cardName    String
  taskName    String
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  @@unique([userId, drawDate])
}
```

### 6.4 `learning_checkins` — เช็คอินการเรียน 5 ข้อ
```prisma
model LearningCheckin {
  id           String   @id @default(uuid())
  userId       String
  checkinDate  Date
  goalClarity  Int      // 1-5
  deepFocus    Int
  activeRecall Int
  qualityRest  Int
  satisfaction Int
  bonusNote    String?
  createdAt    DateTime @default(now())
  @@unique([userId, checkinDate])
}
```
**ทำไมต้องมี:** เอกสารเควสการเรียนรู้ระบุให้ทำ "สถิติย้อนหลัง" จากคะแนน 5 ข้อนี้ แต่ตอนนี้ไม่มีที่เก็บ

---

## 7) สรุปลำดับความสำคัญ

1. **ต้องมีก่อนที่สุด** — `mood_entries.colorCode/moodScore/logDate` + unique key
   (ถ้าไม่มี ระบบตรวจจับ "เศร้าติดกัน 3 วัน" ทำงานได้แค่ในหน่วยความจำของเบราว์เซอร์)
2. `activity_logs` และ `journal_entries` — แดชบอร์ดสุขภาพใจจะว่างเปล่าทุกครั้งที่รีเฟรช
3. `users.nextScreeningDueAt` + `mental_health_screenings.nextDueAt/triggerType/answers`
4. `quest_logs.payload` + `quests.gameKey/energyLevel/isCalming`
5. `learning_checkins`, `oracle_draws`, และคอลัมน์ที่เหลือของ `users`