import type { PostData } from '../../types'
import { useSocial } from '../../context/SocialContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/*============================================================================*\
  LikersModal — [ใหม่ — ข้อ 10] กดตัวเลขไลค์ (ไม่ใช่ไอคอนหัวใจ) แล้วเปิด popup รายชื่อคน
  กดไลค์โพสต์นี้ — กดแต่ละคนไปโปรไฟล์เขาได้เหมือนคอมเมนต์ (ผ่าน requestViewProfile เดียวกัน)
\*============================================================================*/
export default function LikersModal({ post, onClose }: { post: PostData; onClose: () => void }) {
  useEscapeKey(onClose)
  const { requestViewProfile } = useSocial()

  return (
    <div className="story-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="story-modal-card">
        <div className="story-modal-card__title">ถูกใจ ({post.likedBy.length})</div>
        {post.likedBy.length === 0 ? (
          <div className="story-empty-state">ยังไม่มีใครกดถูกใจโพสต์นี้เลย</div>
        ) : (
          <div className="story-comments-list">
            {post.likedBy.map((liker) => (
              <button
                key={liker.userId}
                className="story-comment-popup-row"
                onClick={() => requestViewProfile(liker.userId, liker.username)}
              >
                <div className="story-avatar story-avatar--sm">{liker.username.trim().charAt(0).toUpperCase()}</div>
                <div className="story-comment-popup-row__name">{liker.username}</div>
              </button>
            ))}
          </div>
        )}
        <button className="story-btn-ghost" style={{ width: '100%', padding: '10px 0', borderRadius: 999, marginTop: 10 }} onClick={onClose}>ปิด</button>
      </div>
    </div>
  )
}
