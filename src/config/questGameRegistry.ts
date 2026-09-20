import type { ComponentType } from 'react'
import type { QuestGameProps } from '../types.mental'

import ActiveFocusGame from '../components/quest/games/learning/ActiveFocusGame'
import DeepRootGame from '../components/quest/games/learning/DeepRootGame'
import BrainDumpGame from '../components/quest/games/learning/BrainDumpGame'
import CrossPollinationGame from '../components/quest/games/learning/CrossPollinationGame'
import DailyCheckinGame from '../components/quest/games/learning/DailyCheckinGame'
import ContentReviewGame from '../components/quest/games/learning/ContentReviewGame'
import GuardianOfRestGame from '../components/quest/games/learning/GuardianOfRestGame'
import TenYearForestGame from '../components/quest/games/learning/TenYearForestGame'

import PhotosynthesisGame from '../components/quest/games/physical/PhotosynthesisGame'
import GreenVisionGame from '../components/quest/games/physical/GreenVisionGame'
import PureWaterGame from '../components/quest/games/physical/PureWaterGame'
import SoilRestorationGame from '../components/quest/games/physical/SoilRestorationGame'

import GenericConfirmGame from '../components/quest/games/GenericConfirmGame'

/*============================================================================*\
  questGameRegistry.ts — ทะเบียน "1 เควส = 1 ไฟล์เกม"
  ────────────────────────────────────────────────────────────────────────────
  ตามที่ระบุ: เควสหมวดสุขภาพและหมวดการเรียนรู้ต้องมีไฟล์โค้ดที่เล่นเกมของเควสนั้นๆ
  แยกกัน เพื่อให้แก้ไขและปรับแต่งทีละเควสได้ง่าย ไม่ต้องรื้อไฟล์กลางที่ยาว 700+ บรรทัด
  แบบ QuestPlayModal เดิม (ซึ่งรวมทุก interaction ไว้ในไฟล์เดียว)

  วิธีเพิ่มเควสใหม่:
    1. สร้างไฟล์เกมใน components/quest/games/<หมวด>/<ชื่อ>Game.tsx
       (รับ props ตาม QuestGameProps → เรียก finish(payload) เมื่อเล่นจบ)
    2. เพิ่ม import + คีย์ในตารางนี้
    3. ใส่ gameKey เดียวกันในเควสที่ questCatalog.ts
  เท่านี้ระบบจะโหลดเกมของเควสนั้นให้อัตโนมัติ

  เควสหมวดสุขภาพจิตที่มีหน้าจอเต็มของตัวเองอยู่แล้ว (ไพ่ทิพย์ / เตาเผา / ทอดสมอใจ /
  สมุดรากไม้ / เกราะขอบคุณ) ไม่ผ่าน registry นี้ — GameplayFrame.tsx
  เรนเดอร์หน้าเหล่านั้นตรงๆ เพราะแต่ละหน้ามีฉาก/วิดีโอ/เสียงเป็นของตัวเอง

  [ประวัติ] ลบ 'mirror-of-truth' และ 'mindful-breeze' ออกจากตารางไปแล้วก่อนหน้านี้ — เควส
  ทั้งสองถูกลบทิ้งใน questCatalog.ts (mirror-of-truth มีกลไกทดแทนใหม่แบบไม่ใช่เควสแล้ว คือ
  QuestFeedbackPrompt.tsx — ดู MentalContext.earnedBadges)
  [ประวัติ] ลบ 'sunlit-root' (ตัวเก่าในหมวดจิตใจ 'ment-sunlit-root') ออกด้วย — ซ้ำกับ
  'phys-photosynthesis' (ปัจจุบัน code คือ 'phys-sunlit-root' แล้ว ดู questCatalog.ts)
  ไฟล์เกม SunlitRootGame.tsx ไม่มีใครอ้างอิงแล้วจึงลบทิ้งไปด้วย

  [แก้รอบนี้ — ตามที่ระบุ] เปลี่ยน 'strategic-delay' → 'content-review' — เควส "กลยุทธ์การ
  รอคอย" เดิมถูกแยกกลับเป็นเควส content-review (Time Capsule) + badge Strategic Delay
  แยกต่างหากตามที่ backend ออกแบบไว้จริง (ดู questCatalog.ts ข้อ 1) StrategicDelayGame.tsx
  ถูกลบทิ้ง แทนที่ด้วย ContentReviewGame.tsx
\*============================================================================*/

export const QUEST_GAME_REGISTRY: Record<string, ComponentType<QuestGameProps>> = {
  // หมวดการเรียนรู้
  'active-focus': ActiveFocusGame,
  'deep-root': DeepRootGame,
  'brain-dump': BrainDumpGame,
  'cross-pollination': CrossPollinationGame,
  'daily-checkin': DailyCheckinGame,
  'content-review': ContentReviewGame,
  'guardian-of-rest': GuardianOfRestGame,
  'ten-year-forest': TenYearForestGame,

  // หมวดสุขภาพกาย
  photosynthesis: PhotosynthesisGame,
  'green-vision': GreenVisionGame,
  'pure-water': PureWaterGame,
  'soil-restoration': SoilRestorationGame,
}

export function getQuestGame(gameKey?: string): ComponentType<QuestGameProps> {
  if (!gameKey) return GenericConfirmGame
  return QUEST_GAME_REGISTRY[gameKey] ?? GenericConfirmGame
}