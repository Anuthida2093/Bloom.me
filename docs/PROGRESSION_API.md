# Progression API — สเปกสำหรับ backend (bloom-me-project)

หน้าเว็บทำงานครบในโหมด `VITE_API_MODE=mock` แล้ว (จำลองใน `src/services/mock/mockDb.ts` → `progression`)
เอกสารนี้คือสัญญาที่โหมด `live` เรียก — **backend ยังไม่มี endpoint/ตารางเหล่านี้** ต้องเพิ่มก่อนเปิดใช้จริง
โค้ดฝั่งหน้าเว็บ: `src/services/api/progression.api.ts`, `src/config/exchangeItems.ts`, `src/config/stepChest.ts`,
`src/services/api/journey.api.ts`, `src/services/stepSettlement.ts`

## 1. กติกาเกม

| เรื่อง | กติกา |
|---|---|
| เควสก้าวเพื่อสุขภาพ | 1 วัน = 1 ทริป = 1 แผนที่ · เป้า = ก้าวรายวันตาม BMI (`stepGoalByBmi.ts`) · หมดเขต **เที่ยงคืนเวลาไทย** (`endOfTripDay`) · รางวัลใช้สูตรเดิมของ backend (ต่อ 100 ก้าว `utils/stepReward.ts`) |
| วันสำเร็จสะสม | **เก็บ/นับที่ backend เท่านั้น ห้ามส่งตัวนับให้หน้าเว็บ** · นับวันเดินถึงเป้าตั้งแต่สร้างบัญชี · ครบ **21 วัน** = ปลดล็อกระบบการ์ดถาวร (`cardsUnlockedAt`) |
| การ์ดแลกซื้อ (Exchange Card) | หลังปลดล็อก: ทุกเควสประจำวันที่ทำสำเร็จ (ไม่กดข้าม) สุ่มตก 15% · ผูกกับไอเทมปลายทาง ("การ์ดแลกซื้อมังกรไฟ") · จำนวนที่ต้องใช้ดู `EXCHANGE_REQUIREMENTS` (2/3/5/8) |
| แลกซื้อของพิเศษ/หายาก | ต้องมีเหรียญตามราคา **และ** การ์ดครบ — `POST /shop/:id/purchase` ต้องปฏิเสธไอเทมกลุ่มนี้ |
| หีบสมบัติที่เส้นชัย | **1 ใบต่อวันที่เดินถึงเป้าเท่านั้น** (แทนกล่อง/จุดสำรวจรายจุดเดิมทั้งหมด — เลิกใช้ `/journeys/:id/landmarks/*`) · สุ่มที่เซิร์ฟเวอร์ เปิดได้ครั้งเดียว · ตารางสุ่ม **[รออนุมัติ]** `STEP_CHEST_LOOT`: การ์ดแลกซื้อ 15 (เฉพาะหลังปลดล็อก) / เหรียญ 20–60 น้ำหนัก 35 / หยดน้ำ 2–5 น้ำหนัก 25 / EXP 15–40 น้ำหนัก 25 |
| บัฟคูณสอง | ไม่มีแหล่งที่มาแล้ว (เดิมมาจากกล่องระหว่างทางที่ถูกเลิกใช้) — `doubleRewardToday` คงไว้ในสัญญาแต่จะเป็น false เสมอจนกว่าจะเพิ่มกลับ |
| ปิดรอบอัตโนมัติ | ผู้เล่นไม่ได้กดรับเองก่อนเที่ยงคืน → เปิดแอปครั้งถัดไประบบรับให้ด้วยก้าวล่าสุดที่บันทึกไว้ + เปิดหีบ (ถ้าถึงเป้า) + แจ้งเตือนผลสรุปตอนเช้า |
| หยั่งรากลึก | ครบ 3 รอบ (90/15) ไม่กดข้าม → (หลังปลดล็อก) 50% การ์ด ไม่งั้น +60 เหรียญ · ครั้งเดียวต่อ `rollKey` |
| หมวดการเรียนรู้ | ทำครบทุกด่านในวันเดียว → เล่นรอบใหม่ได้ (`/quest-logs/complete` ต้องยอมให้ทำซ้ำในวันเดียวเมื่อจบรอบแล้ว) |

## 2. Endpoints

```
GET  /api/progression/me
  → { exchangeCards: { [itemCode]: n }, doubleRewardToday, goalStreakDays }   // ห้ามมีตัวนับ 21 วัน

PUT  /api/steps/days/:date            body { steps, goal, mapId?, journeyId? }  // date = YYYY-MM-DD วันไทย (Asia/Bangkok)
  → ProgressionSummary                // เก็บ steps ค่ามากสุดของวัน goalMet = steps >= goal · ครบ 21 วัน → ปลดล็อกการ์ด

GET  /api/steps/days
  → [{ date, steps, goal, goalMet, mapId, journeyId, chest }]   // ใหม่สุดก่อน — chest = ผลหีบ (null = ยังไม่เปิด)

POST /api/steps/days/:date/chest                                 // ใหม่ — หีบสมบัติ 1 ใบต่อวันที่ถึงเป้า
  → { reward: { kind: 'EXCHANGE_CARD'|'BONUS_COINS'|'WATER_DROPS'|'BONUS_EXP', amount, cardItemCode },
      alreadyOpened: boolean }                                    // เปิดซ้ำ = คืนผลเดิม ไม่ให้รางวัลซ้ำ
  ✗ 400 { error: { code: 'GOAL_NOT_MET' } }                       // StepDay ของวันนั้นยังไม่ goalMet
  // เซิร์ฟเวอร์ให้รางวัลเอง: เหรียญ/EXP เข้า User, การ์ดเข้า ExchangeCard
  // WATER_DROPS: backend ยังไม่มีแนวคิด "หยดน้ำ" (หน้าเว็บเก็บใน localStorage) — หน้าเว็บบวกเองเมื่อ !alreadyOpened
  //   ข้อเสนอ: เพิ่ม User.waterDrops แล้วให้ endpoint นี้บวกเอง (ไม่งั้นหยดน้ำหายเมื่อเปลี่ยนเครื่อง)

POST /api/quest-logs/complete
  → { log, user, exchangeCard: string | null }   // ฟิลด์ใหม่: การ์ดที่สุ่มตกจากเควสประจำวันนี้
  // ข้อเสนอ (ปิดรอบย้อนหลัง): phys-vitality-steps รับ payload.settleDate = YYYY-MM-DD
  //   ยอมรับเมื่อ settleDate < วันนี้ (เวลาไทย) และตรงกับวันเริ่มทริปที่ยังไม่ได้รับรางวัล → logDate = settleDate
  //   ปัจจุบัน backend ใช้ logDate = วันนี้เสมอ: log ย้อนหลังจะไปลงวันนี้ (นับ streak/โควตาผิดวัน)
  //   ระวัง unique [userId, questId, logDate, sequenceInDay] — log ของเมื่อวานต้องไม่ชนกับรอบของวันนี้

POST /api/quests/know-deep-root/bonus body { rollKey }
  → { cardItemCode: string | null, coins: number }

POST /api/shop/:itemCode/exchange
  → { userItem, user }
  ✗ 400 { error: { code: 'INSUFFICIENT_CARDS', missing: number } }
  ✗ 400 { error: { code: 'INSUFFICIENT_COINS' } }

POST /api/journeys                    body { destinationMapId, routeMapIds: [destinationMapId], deadlineAt }
  // deadlineAt = 23:59:59.999 เวลาไทยของวันเริ่มทริป — ข้อเสนอ: backend คำนวณเองแทนการเชื่อค่าจากหน้าเว็บ
  // seed ยังเป็นทริป 3 วัน (vitality-steps isDaily:false, stepReward.tripDays: 3) — ควรปรับเป็นรายวัน
```

### ข้อเสนอเพิ่ม: ปิดรอบเที่ยงคืนฝั่งเซิร์ฟเวอร์ (ทางเลือก)
ตอนนี้ปิดรอบแบบ lazy ที่หน้าเว็บ (`services/stepSettlement.ts`) — ทำงานเมื่อผู้เล่นเปิดแอปเท่านั้น
ถ้าต้องการให้รางวัลเข้าแม้ไม่เปิดแอป: cron 00:05 เวลาไทย (มี `cronAuth.middleware.ts` / `x-cron-secret` อยู่แล้ว)
ปิดทริป IN_PROGRESS ที่เลย deadlineAt → grantQuestRewards ด้วยก้าวล่าสุดใน StepDay + เปิดหีบ (ถ้า goalMet)
แล้วหน้าเว็บแค่แสดงผลสรุป · **ข้อจำกัดเดิม: ก้าวมาจากหน้าเว็บ (Health/Google Fit/เซนเซอร์/กรอกเอง) เซิร์ฟเวอร์ตรวจสอบไม่ได้**

## 3. Prisma (ร่าง)

```prisma
model StepDay {
  userId    String
  date      DateTime @db.Date
  steps     Int
  goal      Int
  goalMet   Boolean
  mapId     String?
  journeyId String?
  @@id([userId, date])
}

// User: เพิ่ม cardsUnlockedAt DateTime? (ตั้งครั้งเดียวเมื่อ StepDay.goalMet ครบ 21 วัน)

model ExchangeCard {
  userId     String
  shopItemId String
  count      Int @default(0)
  @@id([userId, shopItemId])
}

// StepDay: เพิ่ม chestKind String? · chestAmount Int? · chestCardItemCode String? · chestOpenedAt DateTime?
//   (1 แถวต่อวัน = หีบ 1 ใบต่อวันโดยธรรมชาติ — เปิดซ้ำคืนค่าที่เก็บไว้)

// ShopItem: เพิ่ม exchangeTokens Int? (null = ซื้อด้วยเหรียญอย่างเดียว)
// JourneyLandmarkClaim: เลิกใช้แล้ว (หน้าเว็บไม่เรียก /journeys/:id/landmarks/* อีก)
// ProgressEventType: เพิ่ม ITEM_UNLOCKED (ข่าวเพื่อนปลดล็อกไอเทมให้)
```

## 4. ข้อมูลที่ยังอยู่ในเครื่อง (ไม่ได้ส่ง backend)
- นัดทบทวน "แคปซูลเวลา" — `src/utils/timeCapsules.ts` (สำเนาอยู่ใน payload ของ quest log ด้วย)
- ก้อนหินจากการทานเกินที่ลบแล้ว — `src/utils/nutrition.ts` (มื้ออาหารเองก็เก็บในเครื่อง)
- หยดน้ำ (`waterDrops`) — `localExtras` ใน `user.api.ts` → หายเมื่อลงแอปใหม่/เปลี่ยนเครื่อง
- ผลสรุปการปิดรอบเควสก้าว (แจ้งเตือนตอนเช้า) — `bloom:step-settlements:<userId>`
