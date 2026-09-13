import { useEffect, useState } from 'react'
import { MBTI_TREE_THEME, type MbtiType, type RiskLevel } from '../../types'
import { getTreeSummary } from '../../services/aiSummaryService'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

const C_1 = 'rgba(10,25,20,.5)'

const BG_1 = C_1

interface TreeSummaryModalProps {
  open: boolean
  onClose: () => void
  mbtiType: MbtiType | null
  username: string
  trunkBranchLevel: number
  leafFlowerLevel: number
  grassSoilLevel: number
  riskLevel: RiskLevel
}

/**
 * TreeSummaryModal — [ข้อกำหนดข้อ 2] เปิดตอนคลิกต้นไม้กลางจอ แสดงบทความสั้นๆ ที่ "ดึงมา
 * จาก AI" (mock ผ่าน aiSummaryService.ts — ดู comment เต็มในไฟล์นั้นว่าทำไม mock และจะต่อ
 * API จริงตรงไหน) สรุปมาจากสมุดบันทึกรากไม้เรืองแสงของผู้ใช้ — โทนบทความเปลี่ยนตาม riskLevel จริง
 */
export default function TreeSummaryModal({
  open, onClose, mbtiType, username, trunkBranchLevel, leafFlowerLevel, grassSoilLevel, riskLevel,
}: TreeSummaryModalProps) {
  useLockBodyScroll()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<string | null>(null)

  const theme = MBTI_TREE_THEME[mbtiType as MbtiType] ?? MBTI_TREE_THEME.INFP

  // [แก้] ย้ายการรีเซ็ต loading/summary มาไว้ "ระหว่าง render" ทันทีที่ open เปลี่ยนจาก
  // false → true แทนการ setState แบบ synchronous ตอนต้น effect (react-hooks/set-state-in-effect)
  // ส่วนการยิง fetch จริง (เชื่อมกับ external system) ยังอยู่ใน effect เหมือนเดิม
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setLoading(true)
      setSummary(null)
    }
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false

    getTreeSummary({ mbtiType, trunkBranchLevel, leafFlowerLevel, grassSoilLevel, riskLevel, username })
      .then((res) => { if (!cancelled) { setSummary(res.summary); setLoading(false) } })
      .catch(() => { if (!cancelled) { setSummary('ตอนนี้ต้นไม้ยังนึกอะไรไม่ออก ลองแตะดูใหม่อีกครั้งนะ 🌱'); setLoading(false) } })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div
      className="tree-summary-backdrop"
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: BG_1, backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="tree-summary-card"
        style={{
          background: `linear-gradient(165deg, var(--fixed-white) 0%, ${theme.accent}14 100%)`,
          borderRadius: 28, width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto',
          boxShadow: `0 28px 70px var(--glass-b-35), 0 0 0 1.5px ${theme.accent}33`,
          padding: '26px 26px 22px', position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          title="ปิด"
          style={{
            position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 99,
            border: 'none', background: 'var(--glass-b-8)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="tree-summary-leaf-icon" style={{ fontSize: 40 }}>🍃</div>
          <div style={{ fontFamily: 'Fredoka One', fontSize: 20, color: theme.accent, marginTop: 4 }}>
            เสียงจาก{theme.treeName}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--n300)', marginTop: 2 }}>
            สรุปจากสมุดบันทึกรากไม้เรืองแสง · โดย AI
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div className="tree-summary-thinking-dots" style={{ display: 'inline-flex', gap: 6, marginBottom: 10 }}>
              <span style={{ background: theme.accent }} />
              <span style={{ background: theme.accent }} />
              <span style={{ background: theme.accent }} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--n300)' }}>ต้นไม้กำลังเรียบเรียงความคิด...</div>
          </div>
        ) : (
          <div
            className="tree-summary-text"
            style={{
              background: 'var(--glass-w-75)', border: `1.5px dashed ${theme.accent}44`, borderRadius: 20,
              padding: '18px 20px', fontSize: 14, color: 'var(--n700)', lineHeight: 1.85, fontStyle: 'italic',
            }}
          >
            "{summary}"
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 18, padding: '12px', border: 'none', borderRadius: 16,
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.trunk})`, color: 'var(--fixed-white)',
            fontFamily: 'Fredoka One', fontSize: 15, cursor: 'pointer', boxShadow: `0 6px 16px ${theme.accent}44`,
          }}
        >
          🌿 ขอบใจนะ
        </button>
      </div>

      <style>{`
        @keyframes treeSummaryFade { from { opacity: 0; } to { opacity: 1; } }
        .tree-summary-backdrop { animation: treeSummaryFade .25s ease both; }

        @keyframes treeSummaryPop {
          from { opacity: 0; transform: scale(.9) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .tree-summary-card { animation: treeSummaryPop .32s cubic-bezier(.22,1,.36,1) both; }

        @keyframes treeSummaryLeafSway {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        .tree-summary-leaf-icon { display: inline-block; animation: treeSummaryLeafSway 2.4s ease-in-out infinite; }

        .tree-summary-thinking-dots span {
          width: 8px; height: 8px; border-radius: 50%; display: inline-block;
          animation: treeSummaryDotBounce 1s ease-in-out infinite;
        }
        .tree-summary-thinking-dots span:nth-child(2) { animation-delay: .15s; }
        .tree-summary-thinking-dots span:nth-child(3) { animation-delay: .3s; }
        @keyframes treeSummaryDotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: .5; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        @keyframes treeSummaryTextIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .tree-summary-text { animation: treeSummaryTextIn .35s ease both; }

        @media (prefers-reduced-motion: reduce) {
          .tree-summary-backdrop, .tree-summary-card, .tree-summary-leaf-icon,
          .tree-summary-thinking-dots span, .tree-summary-text { animation: none; }
        }
      `}</style>
    </div>
  )
}