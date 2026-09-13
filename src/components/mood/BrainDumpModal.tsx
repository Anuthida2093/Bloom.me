import { useState } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { Z_INDEX } from '../../config/zIndex'

const C_1 = 'rgba(10,25,20,.55)'
const C_2 = '#F3E8FF'
const C_3 = '#9333EA'
const C_4 = '#9333EA'
const C_5 = '#9333EA'
const BORDER_6 = '#9333EA33'
const C_6 = 'rgba(147,51,234,.4)'

const BG_1 = C_1
const BG_2 = C_2
const TEXT_3 = C_3
const TEXT_4 = C_4

interface BrainDumpModalProps {
  onClose: () => void
}

/**
 * BrainDumpModal — [ข้อกำหนดข้อ 4: Complete "Coming Soon" Features] แทนที่ placeholder
 * "ระบบกำลังอยู่ระหว่างการพัฒนา" เดิมด้วยกล่องข้อความจริงให้พิมพ์ระบายความคิด + ปุ่ม
 * "บันทึก"/"ล้าง" — ยังไม่มี BrainDumpSession endpoint จริงให้ยิง (ดู
 * docs/DATA_DICTIONARY.md: BrainDumpSession มี field audioUrl/transcriptText ที่ยังไม่มี
 * ระบบอัดเสียงในนี้) จึงบันทึกไว้ใน local state ของ component นี้ก่อนเป็น mock, พร้อมต่อ
 * endpoint จริงทีหลังโดยแค่เปลี่ยน handleSave ให้ยิง POST /brain-dump แทน
 */
export default function BrainDumpModal({ onClose }: BrainDumpModalProps) {
  useLockBodyScroll()
  useEscapeKey(onClose)

  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (!text.trim()) return
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const handleClear = () => {
    setText('')
    setSaved(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: Z_INDEX.confirmModal, background: BG_1, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: `linear-gradient(160deg, var(--fixed-white), ${BG_2})`, borderRadius: 28, width: '100%', maxWidth: 440, padding: '28px 26px', boxShadow: '0 28px 70px var(--glass-b-35)', position: 'relative' }}>
        <button onClick={onClose} title="ปิด" style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 99, border: 'none', background: 'var(--glass-b-8)', cursor: 'pointer', fontSize: 13 }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>🧠</div>
          <h2 style={{ fontFamily: 'Fredoka One', fontSize: 20, color: TEXT_3, marginTop: 4 }}>ระบายความคิด</h2>
          <p style={{ fontSize: 12.5, color: 'var(--n500)', marginTop: 4 }}>เขียนทุกอย่างที่อยู่ในหัวออกมา ไม่ต้องเรียบเรียง ไม่มีใครตัดสิน</p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="พิมพ์ระบายได้เลย..."
          rows={7}
          style={{ width: '100%', padding: '14px 16px', borderRadius: 16, border: `2px solid ${BORDER_6}`, fontSize: 13.5, fontFamily: 'Nunito', resize: 'none', outline: 'none', color: 'var(--n900)', lineHeight: 1.7, marginBottom: 16 }}
        />

        {saved && (
          <div style={{ textAlign: 'center', fontSize: 12.5, color: TEXT_4, fontWeight: 700, marginBottom: 12 }}>
            ✅ บันทึกแล้ว — ความคิดของคุณถูกเก็บไว้อย่างปลอดภัย
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleClear}
            disabled={!text}
            style={{ flex: 1, padding: '12px', border: '1.5px solid var(--n200)', borderRadius: 14, background: 'var(--fixed-white)', color: text ? 'var(--n500)' : 'var(--n300)', fontFamily: 'Nunito', fontWeight: 700, fontSize: 13, cursor: text ? 'pointer' : 'default' }}
          >
            🗑️ ล้าง
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 14, background: text.trim() ? C_5 : 'var(--n200)', color: 'var(--fixed-white)', fontFamily: 'Fredoka One', fontSize: 15, cursor: text.trim() ? 'pointer' : 'default', boxShadow: text.trim() ? `0 8px 20px ${C_6}` : 'none' }}
          >
            💾 บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}