import { useEffect } from 'react'
import { Z_INDEX } from '../../config/zIndex'

const AUTO_DISMISS_MS = 6000

/*============================================================================*\
  QuestFeedbackPrompt — [ไฟล์ใหม่ตามที่ระบุ] กลไกใหม่แทนเควส 'know-mirror-of-truth' เดิม
  (ถูกลบทั้งระบบไปแล้ว — ดูคอมเมนต์ questCatalog.ts/questGameRegistry.ts) แต่ backend
  seed.ts ยังเก็บ badge "Mirror of Truth" ไว้ (criteria: feedbackWithinHours 24 — "ขอ
  feedback ทันทีหลังทำกิจกรรมเสร็จ") ถ้าไม่มีกลไกอะไรเลย badge นี้จะไม่มีทางถูกปลดล็อก

  ป้ายลอยเล็กๆ ถามความรู้สึกต่อเควสที่เพิ่งทำสำเร็จ — ไม่บังคับ (มีปุ่ม "ข้าม") ไม่บล็อก
  การใช้งานหน้าจออื่น เพราะ pointer-events อยู่แค่ในกล่องตัวเอง เหมือน QuestRewardCelebration
  ที่มันโผล่คู่กัน (แต่ตำแหน่งแยกกัน ไม่ทับซ้อนกัน — ดู QuestSection.tsx)
\*============================================================================*/

export interface QuestFeedbackPromptData {
  questCode: string
  completedAt: string
  key: number
}

interface QuestFeedbackPromptProps {
  data: QuestFeedbackPromptData | null
  onReact: (reaction: 'good' | 'neutral' | 'bad') => void
  onDismiss: () => void
}

export default function QuestFeedbackPrompt({ data, onReact, onDismiss }: QuestFeedbackPromptProps) {
  useEffect(() => {
    if (!data) return
    const id = window.setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.key])

  if (!data) return null

  return (
    <div className="quest-feedback-prompt" style={{ zIndex: Z_INDEX.celebration }} key={data.key}>
      <span className="quest-feedback-prompt__text">รู้สึกยังไงกับเควสนี้?</span>
      <div className="quest-feedback-prompt__reactions">
        <button onClick={() => onReact('good')} title="ดี" aria-label="ดี">👍</button>
        <button onClick={() => onReact('neutral')} title="เฉยๆ" aria-label="เฉยๆ">😐</button>
        <button onClick={() => onReact('bad')} title="ไม่ค่อยดี" aria-label="ไม่ค่อยดี">👎</button>
      </div>
      <button className="quest-feedback-prompt__dismiss" onClick={onDismiss} title="ข้าม" aria-label="ข้าม">✕</button>

      <style>{`
        .quest-feedback-prompt {
          position: fixed;
          left: 50%;
          bottom: calc(var(--gpf-safe-bottom, 100px) + 16px);
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: var(--r-pill);
          background: var(--bg-card);
          box-shadow: var(--sh-modal);
          animation: questFeedbackPromptIn .3s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes questFeedbackPromptIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .quest-feedback-prompt__text {
          font-size: var(--fs-xs);
          color: var(--text-sub);
          white-space: nowrap;
        }
        .quest-feedback-prompt__reactions { display: flex; gap: 2px; }
        .quest-feedback-prompt__reactions button {
          width: 34px; height: 34px;
          border: none; border-radius: 50%;
          background: none;
          font-size: 17px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s ease, transform .1s ease;
        }
        .quest-feedback-prompt__reactions button:hover { background: var(--n100); transform: scale(1.1); }
        .quest-feedback-prompt__dismiss {
          width: 24px; height: 24px;
          border: none; border-radius: 50%;
          background: var(--n100);
          color: var(--text-muted);
          font-size: 11px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .quest-feedback-prompt { animation: none; }
        }
      `}</style>
    </div>
  )
}
