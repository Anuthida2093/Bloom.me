import { Overlay } from '../settings/SettingsModal'
import type { PostItData } from '../../types'

const C_1 = '#FFF9C4'

const TEXT_1 = C_1

interface PostItModalProps {
  /** [ตัวแปรตรง backend] รับ PostItData ตรงๆ (content/color + createdAt ถ้ามี) */
  postIt?: Pick<PostItData, 'content' | 'color'> & { createdAt?: string }
  onClose?: () => void
  /** [เพิ่มตามที่ระบุ] เก็บโพสอิทเข้าประวัติ (เอาออกจากต้นไม้) — ไม่ใส่ = ไม่แสดงปุ่มเก็บ */
  onKeep?: () => void
}

const DEFAULT_POSTIT: Pick<PostItData, 'content' | 'color'> = { content: '', color: TEXT_1 }

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

export default function PostItModal({ postIt = DEFAULT_POSTIT, onClose = () => {}, onKeep }: PostItModalProps) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>📌</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text)' }}>ความทรงจำ</div>
        {postIt.createdAt && (
          <div style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 2 }}>เขียนเมื่อ {formatDate(postIt.createdAt)}</div>
        )}
      </div>

      <div style={{ background: postIt.color, borderRadius: 16, padding: '24px 20px', border: '2px solid var(--glass-b-7)', marginBottom: 20, position: 'relative', minHeight: 120 }}>
        {/* Tape strip at top */}
        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', width: 48, height: 14, background: 'var(--glass-w-50)', borderRadius: 4, border: '1px solid var(--glass-b-8)' }} />
        <p style={{ fontSize: 15, color: 'var(--fixed-black)', lineHeight: 1.7, fontStyle: 'italic', marginTop: 8 }}>"{postIt.content}"</p>
      </div>

      {/* [เพิ่มตามที่ระบุ] เลือกได้ว่าจะเก็บโพสอิทเข้าประวัติ หรือทิ้งไว้บนต้นไม้ต่อ */}
      {onKeep ? (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', textAlign: 'center', marginBottom: 10, lineHeight: 1.5 }}>
            เก็บไว้อ่านย้อนหลังได้ที่ โปรไฟล์ → ประวัติการเขียน → ประวัติโพสอิท
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="lb-btn lb-btn--ghost" style={{ flex: 1 }} onClick={onClose}>ติดไว้บนต้นไม้</button>
            <button className="lb-btn" style={{ flex: 1 }} onClick={onKeep}>เก็บเข้าประวัติ</button>
          </div>
        </>
      ) : (
        <button className="lb-btn lb-btn--wide" onClick={onClose}>ปิด</button>
      )}
    </Overlay>
  )
}
