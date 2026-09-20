import type { QuestDef } from '../../config/questCatalog'
import type { QuestPlayPayload } from '../../types.mental'
import { getQuestGame } from '../../config/questGameRegistry'
import { useAppContext } from '../../context/AppContext'
import GameShell from './games/GameShell'

interface QuestPlayModalProps {
  quest: QuestDef | null
  accent: string
  accentBg: string
  onComplete: (questCode: string, payload?: QuestPlayPayload) => void
  onClose: () => void
}

/*============================================================================*\
  QuestPlayModal — [เขียนใหม่ทั้งไฟล์ จาก 747 บรรทัด เหลือเท่านี้]
  ────────────────────────────────────────────────────────────────────────────
  ของเดิมเป็นการ์ดเล็กกลางจอ (maxWidth 460px) ที่ยัดทุก interaction ของทุกเควส
  ไว้ในไฟล์เดียว — แก้เควสเดียวต้องเปิดไฟล์ยาว 700+ บรรทัดและเสี่ยงพังเควสอื่น

  ตอนนี้เหลือหน้าที่เดียว: หยิบ "ไฟล์เกมของเควสนั้น" จาก questGameRegistry
  แล้วเปิดใน GameShell ซึ่งเป็นป๊อปอัพเต็มกรอบเขียว (absolute + inset:0)

  โค้ด interaction เดิมทั้งหมดถูกย้ายไปเป็นไฟล์ของแต่ละเควสแล้ว:
      TimerInteraction        → games/learning/DeepRootGame.tsx
      BreathingInteraction    → hooks/useBreathingSession.ts + MindfulAnchorPage
      MicInteraction          → games/learning/BrainDumpGame.tsx (ถอดเสียงจริง)
      CheckinInteraction      → games/learning/DailyCheckinGame.tsx (บัวรดน้ำ)
      GoalInputInteraction    → games/learning/ActiveFocusGame.tsx / ContentReviewGame.tsx
      SwipeDiscardInteraction → mental/IncineratorPage.tsx (มีอยู่แล้ว)
      ToggleTopicsInteraction → games/learning/CrossPollinationGame.tsx
      BellInteraction         → games/physical/GreenVisionGame.tsx
      ActionButtonInteraction → games/GenericConfirmGame.tsx
\*============================================================================*/
export default function QuestPlayModal({ quest, accent, accentBg, onComplete, onClose }: QuestPlayModalProps) {
  const { userData } = useAppContext()
  if (!quest) return null

  const Game = getQuestGame(quest.gameKey)
  const atRisk = userData.currentRiskLevel === 'MODERATE' || userData.currentRiskLevel === 'HIGH'

  return (
    <GameShell
      quest={quest}
      accent={accent}
      accentBg={accentBg}
      onComplete={onComplete}
      onClose={onClose}
      forced={atRisk && !!quest.isCalming}
    >
      {(api) => <Game accent={api.accent} accentBg={api.accentBg} finish={api.finish} strictMode={api.strictMode} skip={api.skip} exit={api.exit} />}
    </GameShell>
  )
}