import { MBTI_TREE_THEME, type MbtiType } from '../../types'
import { getMbtiDescription } from '../../config/mbtiDescriptions'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import './TreeSummaryModal.css'
import { BADGE_ICONS } from '../../config/iconAssets'

interface TreeSummaryModalProps {
  open: boolean
  onClose: () => void
  mbtiType: MbtiType | null
  username: string
}

/**
 * TreeSummaryModal — [แก้ตามที่ระบุ] เดิมเป็นบทความสรุปจาก AI (mock ผ่าน
 * aiSummaryService.getTreeSummary — ถอดออกแล้ว ดู aiSummaryService.ts) พื้นหลังมืดเต็มจอ
 * ทับต้นไม้ตรงกลาง — ตอนนี้เปลี่ยนเป็นคำอธิบายลักษณะนิสัย MBTI จริงของผู้ใช้ (จาก
 * src/config/mbtiDescriptions.ts) ลอยเป็นแผงข้างจอแทน ไม่มีพื้นหลังมืดบังต้นไม้อีกต่อไป —
 * กดที่ไหนก็ได้นอกแผง (คลิกจับผ่านชั้นโปร่งใสเต็มจอ) เพื่อปิด
 */
export default function TreeSummaryModal({ open, onClose, mbtiType, username }: TreeSummaryModalProps) {
  useLockBodyScroll()
  useEscapeKey(onClose)

  if (!open) return null

  const theme = MBTI_TREE_THEME[mbtiType as MbtiType] ?? MBTI_TREE_THEME.INFP
  const info = getMbtiDescription(mbtiType)

  return (
    <>
      {/* [แก้ตามที่ระบุ] ชั้นจับคลิกนอกแผงเพื่อปิด — โปร่งใสสนิท (ไม่มี background/blur)
          ต่างจาก TreeSummaryModal เดิมที่มีพื้นหลังมืดเต็มจอบังต้นไม้ ตอนนี้ตั้งใจให้เห็น
          ต้นไม้ตลอดเวลาที่เปิดแผงนี้อยู่ */}
      <div
        className="tree-mbti-click-catcher"
        style={{ position: 'fixed', inset: 0, zIndex: 399 }}
        onClick={onClose}
      />

      <div className="tree-mbti-panel" style={{ zIndex: 400 }}>
        <div className="tree-mbti-panel__ring">
          <div className="tree-mbti-panel__inner">
            <button onClick={onClose} title="ปิด" className="tree-mbti-panel__close"><img src={BADGE_ICONS.close} className="icon-img" alt="" /></button>

            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div className="tree-mbti-panel__leaf" style={{ fontSize: 32 }}>🍃</div>
              <div style={{ fontFamily: 'Fredoka One', fontSize: 13, color: 'var(--n300)', marginTop: 2 }}>
                {theme.treeName} ของ {username}
              </div>
              <div style={{ fontFamily: 'Fredoka One', fontSize: 22, color: theme.accent, marginTop: 4 }}>
                {mbtiType ?? 'INFP'} · {info.nickname}
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--n700)', lineHeight: 1.85, margin: 0 }}>
              {info.summary}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
