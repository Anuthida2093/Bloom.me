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

---

## 8) ระบบ auth/บัญชี — [เพิ่มรอบนี้] ตารางใหม่ + คอลัมน์ที่ backend จริงต้องมี

> เตรียมฝั่ง frontend ไว้ครบแล้ว (กันสมัครซ้ำ, ลืมรหัสผ่าน, ลบบัญชี, เปลี่ยนรหัสผ่าน,
> rate-limit เบื้องต้น) ทั้งหมดจำลองด้วย mockDb (`src/services/mock/mockDb.ts`,
> `MockAccount`/`MockPasswordResetToken`) — ตารางข้างล่างนี้คือสิ่งที่ backend จริงต้องมี
> ถึงจะทำงานแบบเดียวกันได้อย่างปลอดภัยจริง (ไม่ใช่แค่ mock)

### 8.1 ตาราง `users` (หรือตารางแยก `credentials`) — เพิ่มคอลัมน์

| คอลัมน์ที่ต้องเพิ่ม | ชนิด | ใช้ทำอะไร |
|---|---|---|
| `passwordHash` | `String` | แฮชด้วย **bcrypt/argon2 ฝั่ง server เท่านั้น** — ห้ามรับค่าที่ผ่าน hash ฝั่ง client มาแทน (ดูคำเตือนใน `src/utils/mockAuth.ts`) |
| `email` | `String @unique` | ใช้ index ระดับฐานข้อมูลกันอีเมลซ้ำจริง (ไม่ใช่แค่เช็คฝั่ง client ก่อน insert ซึ่งมี race condition ได้) — ต้อง normalize เป็นตัวพิมพ์เล็กก่อนเทียบ |
| `failedLoginAttempts` | `Int @default(0)` | นับจำนวนครั้งที่ login ผิดติดกัน สำหรับ rate-limit/ล็อกบัญชีจริงฝั่ง server |
| `lockedUntil` | `DateTime?` | เวลาที่บัญชีถูกล็อกชั่วคราวถึง (หลัง failedLoginAttempts เกินเกณฑ์) — rate-limit ฝั่ง client ตอนนี้ (ล็อกปุ่ม 3 วิ) **ไม่ใช่การป้องกันจริง** เพราะเรียก API ตรงๆ ผ่าน curl ได้เลย |

### 8.2 ตารางใหม่ `password_reset_tokens`
```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique // แฮช token ก่อนเก็บ ไม่เก็บ token ดิบ (เผื่อฐานข้อมูลรั่ว)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```
**ทำไมต้องมี:** ตอนนี้ mock เก็บ token เป็น plaintext ใน `mockDb.passwordResetTokens` (localStorage
ของเบราว์เซอร์ผู้ใช้เอง — ไม่ใช่ฐานข้อมูลกลาง จึงไม่มีความเสี่ยงเดียวกัน) ของจริงต้องมีระบบส่งอีเมล
จริง (SES/SendGrid ฯลฯ) และ endpoint `/auth/request-password-reset` ต้องคืน 200 เสมอไม่ว่าจะเจอ
อีเมลหรือไม่ (ดูคอมเมนต์ใน `src/pages/ForgotPassword.tsx` และ `user.api.ts`)

### 8.3 ตารางใหม่ `sessions` (หรือ `refresh_tokens`) — สำหรับ "อุปกรณ์ที่เข้าสู่ระบบ"
```prisma
model Session {
  id         String   @id @default(uuid())
  userId     String
  deviceInfo String?  // user agent / ชื่ออุปกรณ์
  ipAddress  String?
  lastActiveAt DateTime @default(now())
  createdAt  DateTime @default(now())
  revokedAt  DateTime?
  user       User     @relation(fields: [userId], references: [id])
}
```
**ทำไมต้องมี:** หน้าตั้งค่า > ความปลอดภัยบัญชี มีช่อง "อุปกรณ์ที่เข้าสู่ระบบ" เตรียม UI ไว้แล้ว
(โชว์ placeholder "เร็วๆ นี้") แต่ mock มี session เดียวเสมอ (auth token เดียวใน localStorage)
ต้องมีตารางนี้ + endpoint list/revoke session ถึงจะแสดงรายการจริงและ "ออกจากระบบอุปกรณ์อื่น" ได้

### 8.4 Endpoint ที่ต้องมีให้ตรงกับที่ frontend เรียกไว้แล้ว (`src/services/api/user.api.ts`)

| Endpoint | Method | หมายเหตุ |
|---|---|---|
| `/auth/login` | POST | ต้องคืน error message เดียวกันไม่ว่า username ผิดหรือรหัสผ่านผิด (กัน user enumeration) |
| `/auth/register` | POST | คืน 409 ถ้าอีเมลซ้ำ — ตรวจด้วย unique constraint ระดับ DB ไม่ใช่ query-then-insert |
| `/auth/request-password-reset` | POST | คืน 200 เสมอ ไม่เปิดเผยว่าอีเมลมีในระบบไหม ส่งอีเมลจริงพร้อม token |
| `/auth/reset-password` | POST | ตรวจ token ยังไม่หมดอายุ/ยังไม่ถูกใช้ ก่อนอัปเดต passwordHash แล้ว invalidate token ทันที |
| `/auth/change-password` | POST | ตรวจ currentPassword ตรงกับ hash เดิมก่อนเปลี่ยน |
| `/users/me` (DELETE) | DELETE | ลบ user + cascade ข้อมูลที่เกี่ยวข้องทั้งหมด (quest_logs, mood_entries, posts, user_items ฯลฯ) ตาม GDPR/PDPA |

### 8.5 ข้อจำกัดสำคัญที่ backend ต้องแก้ (ไม่ใช่แค่ "เพิ่มตาราง")

- **rate-limit/brute-force จริง**: ต้องทำที่ backend (ล็อกบัญชีชั่วคราวตาม `failedLoginAttempts`,
  IP throttling, หรือ CAPTCHA) — เวอร์ชัน frontend ตอนนี้แค่ล็อกปุ่ม 3 วินาทีฝั่ง client เท่านั้น
- **ข้อมูลเกมแยกรายบัญชี**: ตอนนี้ mockDb ออกแบบเป็น "เซฟไฟล์เดียวต่อเบราว์เซอร์" (`mockDb.user`
  ก้อนเดียว ไม่ผูกกับ `accountId`) ระบบสมัคร/ล็อกอินหลายบัญชีในเบราว์เซอร์เดียวกันตอนนี้ยังใช้
  ข้อมูลเกมก้อนเดียวกันอยู่ (เควส/ต้นไม้/เหรียญไม่แยกตามบัญชีจริง) — backend จริงต้องผูกทุกตาราง
  เกม (quest_logs, mood_entries, inventory ฯลฯ) กับ `userId` ที่มาจาก JWT/session จริง ไม่ใช่
  สมมติว่ามี user เดียวเสมอแบบที่ mock ทำอยู่ตอนนี้
- **ส่งอีเมลจริง**: ต้องต่อผู้ให้บริการอีเมล (SES/SendGrid/Postmark) แล้ว "ลบ" แผงจำลองอีเมลใน
  `ForgotPassword.tsx` (ดูคอมเมนต์ในไฟล์นั้น) และลบ field `devToken` ออกจาก response ของ
  `requestPasswordReset` ทันที

---

## 9) เควส "ก้าวเพื่อสุขภาพ" โฉมใหม่ (Step Journey) — ตารางใหม่ทั้งหมด

> เตรียมฝั่ง frontend ไว้แล้วด้วย mockDb (`src/services/mock/mockDb.ts`, field `activeJourney`)
> ชนิดข้อมูลอยู่ที่ `src/types.journey.ts` (แยกจาก `types.ts` ตามแพทเทิร์นเดียวกับ
> `types.mental.ts` — ยังไม่มีตารางนี้ใน backend จริง) logic คำนวณเป้าหมายก้าว/สถานะทริปอยู่ที่
> `src/config/journeyRules.ts` ข้อมูลแผนที่ 8 ใบ (มีภาพจริงแล้วที่
> `public/assets/images/mini-game/vitality-steps/map-01.jpg` ... `map-08.jpg` — พิกัด
> waypoints/entry/exit ยังเป็นค่าประมาณจากตาเปล่า รอวัดละเอียดจาก Figma) อยู่ที่
> `src/config/journeyMaps.ts` **contract ที่ frontend เรียกจริงตอนนี้อยู่ที่
> `src/services/api/journey.api.ts`** — ทีม backend เปิดไฟล์นั้นดู request/response จริงเพิ่มได้เลย
>
> [ตัดสินใจเรื่องโมเดล] เควสนี้คือ "เลือกแผนที่ปลายทาง 1 ใบจาก 8 ใบ แล้วเดินข้ามแผนที่ใบนั้นใบเดียว
> จนถึง exitPct" ไม่ใช่การไล่เดินข้ามหลายแผนที่ตามลำดับ (`currentMapId` จึงเท่ากับ
> `destinationMapId` เสมอในเฟสนี้ — เก็บ 2 field แยกกันไว้เผื่ออนาคตอยากทำ "ทริปหลายด่านต่อกัน"
> จะได้ไม่ต้อง migrate ชนิดข้อมูลใหม่อีกรอบ)

### 9.1 ตารางใหม่ `journeys`

```prisma
model Journey {
  id                        String        @id @default(uuid())
  userId                    String
  destinationMapId          String
  currentMapId              String        // เฟสนี้เท่ากับ destinationMapId เสมอ
  progressOnCurrentMapSteps Int           @default(0)
  startedAt                 DateTime      @default(now())
  deadlineAt                DateTime
  status                    JourneyStatus @default(IN_PROGRESS)
  user                      User          @relation(fields: [userId], references: [id])
  @@index([userId, status])
}

enum JourneyStatus {
  IN_PROGRESS
  COMPLETED_EARLY
  COMPLETED_ON_TIME
  COMPLETED_LATE
  FAILED
}
```

**ทำไมต้องมี:** ตอนนี้เป็น mock ฝั่ง client ล้วนๆ (localStorage ผ่าน `mockDb.activeJourney`)
ปิดแอปที่เครื่องอื่นหรือล้างเบราว์เซอร์แล้วหายหมด และไม่มีที่เก็บสถานะเดินทางแบบข้ามอุปกรณ์เลย

> **dailyStepTarget ไม่ได้เก็บในตารางนี้โดยตั้งใจ** — เป็นค่าที่คำนวณสดจาก BMI ปัจจุบันของ user
> ทุกครั้งที่แสดงผล (`calcDailyStepTarget()` ใน `journeyRules.ts`, อ่านจาก `userData.bmi`) ไม่ใช่
> ค่าที่ผูกตายตัวกับตอนเริ่มทริป เพราะ BMI ผู้เล่นอาจเปลี่ยนระหว่างทางได้ (แก้ส่วนสูง/น้ำหนักใหม่)

### 9.2 Endpoint ที่ต้องมีให้ตรงกับที่ frontend เรียกไว้แล้ว (`src/services/api/journey.api.ts`)

| Endpoint | Method | Body | หมายเหตุ |
|---|---|---|---|
| `/journeys/active` | GET | — | คืน journey ที่ `status === IN_PROGRESS` ของ user ปัจจุบัน หรือ `null` ถ้ายังไม่เริ่ม/จบไปแล้ว (server ต้องเช็ค `deadlineAt` แล้วตั้งเป็น `FAILED` เองถ้าเลยเวลาไปแล้วโดยยังไม่ถึงจุดหมาย ก่อนตอบกลับ — ดู `resolveJourneyStatus()` ใน `journeyRules.ts` สำหรับ logic ที่ frontend ใช้ตัดสินฝั่ง mock) |
| `/journeys` | POST | `{ destinationMapId: string }` | เริ่มทริปใหม่ไปยังแผนที่ `destinationMapId` — ต้องคืน journey ที่สร้างเสร็จกลับมาทันที (`deadlineAt` = ตอนนี้ + 3 วัน ตาม `DEFAULT_JOURNEY_DEADLINE_DAYS`) |
| `/journeys/:id/steps` | PATCH | `{ steps: number }` | บวก `steps` (เป็นส่วนต่างที่เพิ่มมาใหม่ ไม่ใช่ยอดสะสมทั้งหมด) เข้ากับ `progressOnCurrentMapSteps` ของ journey นั้น แล้วคำนวณ/อัปเดต `status` ใหม่ก่อนคืนค่ากลับ (ถึง exitPct แล้ว → `COMPLETED_EARLY`/`COMPLETED_ON_TIME`/`COMPLETED_LATE` ตามสัดส่วนเวลาที่ใช้ไปเทียบกับ `deadlineAt`, ยังไม่ถึงแต่เลย `deadlineAt` แล้ว → `FAILED`) |

**ข้อจำกัดที่ backend ต้องแก้เพิ่มเติม (ไม่ใช่แค่สร้างตาราง):**
- ต้องรู้ "ระยะทางรวม" ของแต่ละแผนที่เพื่อตัดสินว่าถึง exitPct หรือยัง — เฟสนี้ frontend ประมาณจาก
  `calcMapTotalStepsTarget(bmi)` = `dailyStepTarget × 3 วัน` (placeholder ล้วนๆ ไม่ใช่ระยะทางจริง
  ที่วัดจากภาพแผนที่) backend ควรมีคอลัมน์ `totalStepsRequired` ต่อแผนที่ (ผูกกับ `journeyMaps.ts`
  แต่ละใบ) แทนการคำนวณลอยแบบนี้เมื่อออกแบบจริง
- reward ให้เมื่อ `finish()` ถูกเรียก (front-end อ่าน `quest.coinReward/expReward` ของ
  `phys-vitality-steps` ตรงๆ ผ่าน `GameShell.tsx`/`quest.api.ts` เดิม ไม่มีระบบคำนวณโบนัส
  "มาถึงก่อนกำหนด" แยกต่างหากในเฟสนี้ — ตัวเลข 60 coins/50 EXP ใน `questCatalog.ts` เป็น
  placeholder รอ balance จริงเช่นกัน) `FAILED` ไม่เรียก `finish()` เลย จึงไม่ได้รางวัลอะไร
---

## 10) ความอุดมสมบูรณ์ของดิน → ต้นไม้โตช้าลง (`src/config/groundFertility.ts`)

ไม่ได้ทำเควสหมวดสุขภาพกาย (HEALTH) ติดต่อกันหลายวัน → หญ้าใต้ต้นไม้เหี่ยว → แห้ง → ดินร้าง
และ **เควสหมวดความรู้ (KNOWLEDGE) ได้ `knowledgeStack` น้อยลง** (ลำต้นโตช้าลง)

- `days` = จำนวนวันเต็มตั้งแต่ log HEALTH ที่ `COMPLETED` ล่าสุด (ยังไม่เคยทำเลย = ไม่ลดโทษ)
- `dryness = clamp((days - 3) / (14 - 3), 0, 1)`
- stack ที่ได้จากเควสความรู้ = `round(expReward × (1 - 0.5 × dryness))` (ดินร้างเต็มที่ได้ครึ่งเดียว)

**สิ่งที่ backend ต้องทำ:** คำนวณแบบเดียวกันใน `/quest-logs/complete` (ตอนนี้ทำแค่ฝั่ง mock ใน `quest.api.ts`)
และเพิ่มคอลัมน์ `quest_logs.stackAwarded Int?` เก็บคะแนนที่ให้ไปจริง — ตอนยกเลิกเควสต้องหักคืนเท่าค่านี้
ไม่ใช่ `expReward` เต็ม (ไม่งั้นคะแนนจะติดลบ/เพี้ยนถ้าทำตอนดินแห้งแล้วยกเลิกตอนดินสด)
