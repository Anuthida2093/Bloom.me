import { postImages, type PostData } from '../../types'

/*============================================================================*\
  PostPreviewMini — [ใหม่ตามที่ระบุ] ย่อโพสต์ไว้บนสุดของป็อปอัพ "คนที่ถูกใจ/คอมเมนต์" และข้อความแชร์ในแชท
  ให้รู้ว่ากำลังดูของโพสต์ไหน (ชื่อผู้โพสต์ + ข้อความ + รูปแรก)
\*============================================================================*/
export default function PostPreviewMini({ post, onClick }: { post: PostData; onClick?: () => void }) {
  const first = postImages(post)[0]
  const count = postImages(post).length
  const body = (
    <>
      {first && (
        <span className="story-post-mini__thumb">
          <img src={first} alt="" loading="lazy" />
          {count > 1 && <span className="story-post-mini__more">+{count - 1}</span>}
        </span>
      )}
      <span className="story-post-mini__body">
        <span className="story-post-mini__author">{post.isAnonymous ? 'ไม่ระบุตัวตน' : post.authorName}</span>
        <span className="story-post-mini__text">{post.content || (first ? '📷 รูปภาพ' : '')}</span>
      </span>
    </>
  )
  return onClick
    ? <button type="button" className="story-post-mini story-post-mini--clickable" onClick={onClick}>{body}</button>
    : <div className="story-post-mini">{body}</div>
}
