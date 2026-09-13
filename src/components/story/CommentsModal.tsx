import { useState } from 'react'
import type { PostData } from '../../types'
import { usePosts } from '../../context/PostContext'
import { useSocial } from '../../context/SocialContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/*============================================================================*\
  CommentsModal — [ใหม่ — ข้อ 9] popup แสดงคอมเมนต์ทั้งหมดของโพสต์ (แทนการขยาย inline
  ใต้โพสต์แบบเดิม) แต่ละคอมเมนต์กดชื่อ/avatar แล้วไปโปรไฟล์คนนั้นได้ (requestViewProfile
  จะเช็ค privacy ให้เองว่าเปิดได้จริงหรือต้องโชว์ toast "โพสต์ปิดโปรไฟล์" แทน — ดู ข้อ 11)
\*============================================================================*/
export default function CommentsModal({ post, onClose }: { post: PostData; onClose: () => void }) {
  useEscapeKey(onClose)
  const { addComment } = usePosts()
  const { requestViewProfile } = useSocial()
  const [text, setText] = useState('')

  const handleSubmit = () => {
    if (!text.trim()) return
    addComment(post.id, text)
    setText('')
  }

  return (
    <div className="story-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="story-modal-card story-modal-card--tall">
        <div className="story-modal-card__title">คอมเมนต์ ({post.comments.length})</div>

        <div className="story-comments-list">
          {post.comments.length === 0 && (
            <div className="story-empty-state">ยังไม่มีคอมเมนต์ — เป็นคนแรกเลยสิ!</div>
          )}
          {post.comments.map((c) => (
            <button
              key={c.id}
              className="story-comment-popup-row"
              onClick={() => requestViewProfile(c.userId, c.authorName)}
            >
              <div className="story-avatar story-avatar--sm">{c.authorName.trim().charAt(0).toUpperCase()}</div>
              <div>
                <div className="story-comment-popup-row__name">{c.authorName}</div>
                <div className="story-comment-popup-row__content">{c.content}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="story-comment-form">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="แสดงความคิดเห็น..."
            autoFocus
          />
          <button onClick={handleSubmit} disabled={!text.trim()}>ส่ง</button>
        </div>
        <button className="story-btn-ghost" style={{ width: '100%', padding: '10px 0', borderRadius: 999, marginTop: 10 }} onClick={onClose}>ปิด</button>
      </div>
    </div>
  )
}
