import { useState } from 'react'
import type { PostData } from '../../types'
import { usePosts } from '../../context/PostContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/*============================================================================*\
  EditPostModal — [ใหม่ — ข้อ 6] แก้ไขโพสต์ของตัวเอง — เนื้อหา + สลับสถานะสาธารณะ/ไม่ระบุ
  ตัวตนได้ทุกเมื่อหลังโพสต์ไปแล้ว (เดิม isAnonymous ตั้งได้แค่ตอนสร้างเท่านั้น)
\*============================================================================*/
export default function EditPostModal({ post, onClose }: { post: PostData; onClose: () => void }) {
  useEscapeKey(onClose)
  const { updatePost } = usePosts()
  const [content, setContent] = useState(post.content)
  const [isAnonymous, setIsAnonymous] = useState(post.isAnonymous)

  const handleSave = () => {
    if (!content.trim()) return
    updatePost(post.id, { content: content.trim(), isAnonymous })
    onClose()
  }

  return (
    <div className="story-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="story-modal-card">
        <div className="story-modal-card__title">แก้ไขโพสต์</div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} autoFocus />

        <div className="story-modal-card__row">
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-sub)' }}>โพสต์แบบไม่ระบุตัวตน</span>
          <button
            className="story-follow-btn"
            style={isAnonymous ? { background: 'var(--g600)', color: 'var(--fixed-white)' } : undefined}
            onClick={() => setIsAnonymous((v) => !v)}
          >
            {isAnonymous ? 'เปิดอยู่' : 'ปิดอยู่'}
          </button>
        </div>

        <div className="story-modal-card__actions">
          <button className="story-btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="story-btn-primary" onClick={handleSave} disabled={!content.trim()}>บันทึก</button>
        </div>
      </div>
    </div>
  )
}
