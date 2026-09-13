# คู่มือวางไฟล์ชุดนี้ลงโปรเจกต์

ไฟล์ทั้งหมดในโฟลเดอร์นี้จัดโครงสร้างตรงกับ repo แล้ว วางทับได้ตรงตำแหน่ง
มี 3 ประเภท: **ไฟล์ใหม่** / **เขียนทับของเดิม** / **ลบทิ้ง**

---

## 1) ติดตั้ง dependency ก่อน

```bash
npm remove tailwindcss @tailwindcss/vite p5 react-p5
npm install @tanstack/react-query
npm install -D vitest
cp .env.example .env
```

> ถอด `p5` + `react-p5` ได้เพราะไฟล์เดียวที่ใช้คือ `tree_progress.tsx` ซึ่งไม่มีใคร
> import แล้ว (ดูรายการไฟล์ที่ต้องลบด้านล่าง) — ประหยัดประมาณ 900KB

---

## 2) ไฟล์ใหม่ (25 ไฟล์)

| Path | ทำอะไร |
|---|---|
| `src/config/motion.ts` | ชุดท่าเคลื่อนไหวกลาง ใช้ร่วมกันทุกโมดัล |
| `src/components/ui/Surface.tsx` | พื้นผิวลอยมาตรฐาน 4 แบบ (chrome / glass / aether / rune) |
| `src/components/ui/Button.tsx` | ปุ่มมาตรฐาน มี hover/active/focus และรู้จักโหมดมืด |
| `src/components/ui/Overlay.tsx` | พื้นหลังมืด + จัดกลาง + ล็อกสกอลล์ + ESC + focus trap |
| `src/components/ui/SceneFrame.tsx` | กรอบฉากที่ป๊อปอัพลูกยึดเป็นขอบเขต |
| `src/components/ui/ui.css` | สไตล์ของชั้น primitive ทั้งหมด |
| `src/components/ui/index.ts` | จุดรวม export |
| `src/components/common/ErrorBoundary.tsx` | กันจอขาวทั้งแอป |
| `src/components/common/ErrorBoundary.css` | |
| `src/components/common/RouteFallback.tsx` | หน้าจอระหว่างโหลด bundle ของ route |
| `src/components/common/RouteFallback.css` | |
| `src/components/dashboard/Dashboard.css` | CSS ที่ย้ายออกมาจาก `<style>` ใน Dashboard.tsx |
| `src/context/UserContext.tsx` | ผู้ใช้ / ต้นไม้ / คลังไอเทม / ล็อกอิน |
| `src/context/ProgressContext.tsx` | เควส / อารมณ์ / บันทึก / สัญญาณต้นไม้ |
| `src/context/UIContext.tsx` | โมดัล / ตั้งค่า / ตำแหน่งไอเทม (persist ลง localStorage) |
| `src/hooks/useCountdown.ts` | จับเวลาอิงเวลาจริง แทน `setInterval` ที่เพี้ยนเมื่อสลับแท็บ |
| `src/hooks/usePersistentState.ts` | state ที่รอดจากการรีเฟรช |
| `src/hooks/useMediaQuery.ts` | + `useIsSmallScreen`, `usePrefersReducedMotion`, `useIsLowPowerMode` |
| `src/services/http.ts` | fetch wrapper + token + timeout + ApiError |
| `src/services/queryKeys.ts` | คีย์กลางของ TanStack Query |
| `src/services/api/user.api.ts` | ล็อกอิน / สมัคร / โปรไฟล์ / MBTI |
| `src/services/api/quest.api.ts` | ดึงและทำเควสสำเร็จ |
| `src/services/api/mood.api.ts` | บันทึกอารมณ์ |
| `src/services/api/shop.api.ts` | ซื้อ / สวมใส่ไอเทม |
| `src/services/mock/mockDb.ts` | ข้อมูลจำลอง persist ลง localStorage |
| `.env.example` | ตัวอย่างค่า env |

---

## 3) เขียนทับของเดิม (8 ไฟล์)

| Path | แก้อะไร |
|---|---|
| `src/index.css` | เปลี่ยนคู่ฟอนต์เป็น Mali + IBM Plex Sans Thai, เพิ่มโทเคน Aether, type scale, focus-visible, reduced-motion ระดับโกลบอล, ถอด `@import 'tailwindcss'` — **คีย์เฟรมและ utility เดิมทั้งหมดคงไว้ครบ** |
| `src/App.tsx` | lazy route + ErrorBoundary + QueryClientProvider + LazyMotion |
| `src/context/AppContext.tsx` | จาก god object 375 บรรทัด → เหลือชั้นประกอบร่าง `useAppContext()` ยังคืนค่าชุดเดิมครบทุกตัว |
| `src/components/dashboard/Dashboard.tsx` | ย้าย CSS ออก, คุมวิดีโอพื้นหลัง, lazy โมดัล, AnimatePresence, ใช้ hook เฉพาะทาง |
| `src/components/tree/TreeOfLife.tsx` | ลดจำนวนใบตามจอ, ถอด transition:filter, `memo()`, เลิกใช้ emoji เป็นอาร์ต, รองรับไฟล์ภาพจริง |
| `src/components/tree/TreeOfLife.css` | `contain: layout paint`, ควัน/กลีบวาดด้วย CSS, สไตล์ไอเทมที่เป็นภาพ |
| `src/config/decorationItems.ts` | เพิ่ม `getDecorationImage()` — วางไฟล์ภาพแล้วใช้ได้เลยโดยไม่ต้องแก้โค้ด |
| `vite.config.ts` | ถอด tailwind, เพิ่ม proxy `/api`, แยก vendor chunk |
| `package.json` | ปรับ dependency ตามข้างบน + เพิ่มสคริปต์ `test` |

---

## 4) ไฟล์ที่ควรลบทิ้ง (ประมาณ 1,600 บรรทัด)

```bash
git rm src/components/tree/tree_progress.tsx      # 814 บรรทัด ไม่มีใคร import
git rm src/components/tree/tree_progress.css
git rm src/components/tree/TreeCanvas.tsx         # 434 บรรทัด ไม่มีใคร import
git rm src/types/react-p5.d.ts                    # ใช้เฉพาะ tree_progress.tsx
git rm src/components/layout/Footer.tsx           # ไม่มีใคร import
git rm src/components/layout/GuestBanner.tsx      # ไม่มีใคร import
git rm src/App.css                                # เทมเพลตเริ่มต้นของ Vite (.counter/.hero/.vite)
git mv src/imports docs/design-references         # ไฟล์เอกสาร ไม่ควรอยู่ใน src/
```

**ตรวจก่อนลบ:** ผมสแกนแล้วว่าไม่มีไฟล์ไหน import ห้าไฟล์แรก แต่ให้รันซ้ำเพื่อความมั่นใจ

```bash
grep -rn "tree_progress\|TreeCanvas\|Footer\|GuestBanner\|App.css" src/
```

หลังลบ `App.css` แล้ว บรรทัด `import '../../App.css'` ใน Dashboard.tsx หายไปแล้ว
ในไฟล์ที่ส่งมาให้

---

## 5) สิ่งที่ยังไม่ได้ทำในรอบนี้ (ตั้งใจ)

โครงสร้างพร้อมรองรับแล้ว แต่ยังไม่ได้ไล่แก้ให้ครบ เพราะกระทบหลายไฟล์พร้อมกัน
ควรทยอยทำและทดสอบทีละไฟล์:

1. **ย้าย `<style>` ที่ยังเหลือ** — `QuestSection`, `NavbarQuest`, `GameplayFrame`,
   `SettingsModal`, `NavBar`, `MoodCheckIn`, `CinematicBackground`, `QuestPlayModal`
   ให้ทำแบบเดียวกับ `Dashboard.css`
2. **แทน inline style ด้วย `<Surface>` / `<Button>`** — เริ่มจาก `QuestPlayModal` (73 จุด),
   `UserProfile` (43), `HeroSection` (41)
3. **เปลี่ยน `<motion.*>` เป็น `<m.*>`** ใน 6 ไฟล์ที่ยังใช้อยู่ แล้วเติม prop `strict`
   ให้ `<LazyMotion>` ใน `App.tsx` จะได้มีตัวเตือนอัตโนมัติถ้าใครเผลอใช้ผิด
4. **ย้ายเควสที่จับเวลาไปใช้ `useCountdown`** — `DeepRootGame` / โหมดจดจ่อ 90 นาที
   สำคัญที่สุดเพราะเป็นอันที่เพี้ยนมากที่สุดเมื่อผู้ใช้สลับแท็บ
5. **เขียนเทสต์** — เริ่มจากตรรกะที่ห้ามพลาด: การให้คะแนนแบบคัดกรอง,
   การนับวันอารมณ์ลบติดกัน, การคำนวณ level ต้นไม้จาก stack
6. **แทน emoji ที่เหลือ** — ไอคอนเควสใน `questCatalog.ts` และไอคอนใน `ActionMenuBar`

---

## 6) วันที่ backend พร้อม

แก้ไฟล์เดียว:

```
.env → VITE_API_MODE=live
```

แล้วตรวจว่า endpoint ตรงกับที่ `src/services/api/*.ts` เรียกอยู่:

| ฟังก์ชัน | Endpoint ที่คาดหวัง |
|---|---|
| `login` | `POST /auth/login` → `{ token, user }` |
| `register` | `POST /auth/register` → `{ token, user }` |
| `getMe` | `GET /users/me` → `UserData` |
| `updateMbti` / `updateProfile` | `PATCH /users/me` → `UserData` |
| `getQuestLogs` | `GET /quest-logs` → `QuestLogEntry[]` |
| `completeQuest` | `POST /quest-logs/complete` → `{ log, user }` |
| `getMoodEntries` | `GET /mood-entries` → `MoodEntryData[]` |
| `createMoodEntry` | `POST /mood-entries` → `MoodEntryData` |
| `getInventory` | `GET /inventory` → `InventoryItem[]` |
| `buyItem` | `POST /shop/buy` → `{ item, user }` |
| `toggleEquip` | `PATCH /inventory/:id/equip` → `InventoryItem[]` |

ถ้า backend ใช้ path หรือรูปแบบ response ต่างจากนี้ **แก้เฉพาะใน `services/api/`
เท่านั้น** ไม่ต้องแตะคอมโพเนนต์ — นั่นคือเหตุผลทั้งหมดที่มีชั้นนี้

> `completeQuest` และ `buyItem` ออกแบบให้คืน `user` ที่อัปเดตแล้วกลับมาด้วย
> เพราะทั้งสองอย่างกระทบเหรียญ/EXP/stack พร้อมกัน ถ้าแยกเป็นสองคำขอ
> จะมีช่วงที่หน้าจอแสดงข้อมูลไม่สอดคล้องกัน ซึ่งบนเน็ตมือถือช้าผู้ใช้เห็นชัดมาก
> กรุณาแจ้ง backend ให้ทำแบบนี้ตั้งแต่ต้น

---

## 7) ตรวจก่อน deploy

```bash
npm run typecheck
npm run build
npm run preview
```

- [ ] Lighthouse Performance ≥ 85 บนโหมดมือถือ
- [ ] เดินทั้งแอปด้วยคีย์บอร์ดได้ และเห็นกรอบโฟกัสทุกจุด
- [ ] เปิด `prefers-reduced-motion` ในระบบปฏิบัติการแล้วอนิเมชันหยุดจริง
- [ ] รีเฟรชแล้วการตั้งค่าและตำแหน่งไอเทมยังอยู่
- [ ] ปิดเน็ตแล้วกดทำเควส → ต้องขึ้นข้อความบอกผู้ใช้ ไม่ใช่เงียบหรือจอขาว