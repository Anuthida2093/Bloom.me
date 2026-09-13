import { Overlay } from '../settings/SettingsModal'
import type { PostItData } from '../../types'

const C_1 = '#FFF9C4'

const TEXT_1 = C_1

interface PostItModalProps {
  /** [ตัวแปรตรง backend] เดิม prop shape {date,color,text} ไม่ตรงกับ PostIt model เลย
   *  (docs/DATA_DICTIONARY.md: id/content/color/positionX/positionY/isPinned/userId — ไม่มี
   *  field วันที่เลย) ตอนนี้รับ PostItData ตรงๆ, text -> content, ตัด date ที่ไม่มีจริงออก */
  postIt?: Pick<PostItData, 'content' | 'color'>
  onClose?: () => void
}

const DEFAULT_POSTIT: Pick<PostItData, 'content' | 'color'> = { content: '', color: TEXT_1 }

export default function PostItModal({ postIt = DEFAULT_POSTIT, onClose = () => {} }: PostItModalProps) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>📌</div>
        <div style={{ fontFamily: 'Fredoka One', fontSize: 20, color: 'var(--g800)' }}>ความทรงจำ</div>
      </div>

      <div style={{ background: postIt.color, borderRadius: 16, padding: '24px 20px', border: '2px solid var(--glass-b-7)', marginBottom: 20, position: 'relative', minHeight: 120 }}>
        {/* Tape strip at top */}
        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', width: 48, height: 14, background: 'var(--glass-w-50)', borderRadius: 4, border: '1px solid var(--glass-b-8)' }} />
        <p style={{ fontSize: 15, color: 'var(--n900)', lineHeight: 1.7, fontStyle: 'italic', marginTop: 8 }}>"{postIt.content}"</p>
      </div>

      <button onClick={onClose} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: 'var(--r-md)', background: 'var(--g700)', color: 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 16, cursor: 'pointer' }}>
        ปิด
      </button>
    </Overlay>
  )
}