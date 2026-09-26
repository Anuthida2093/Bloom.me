import type { PostData } from '../../types'
import PostCard from './PostCard'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  PostListPage — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] หน้ารายการโพสต์ใช้ซ้ำ 3 จุดจาก sidebar grid:
  "โพสต์ปิดโปรไฟล์" (ของฉันที่ตั้งไม่ระบุตัวตน) / "ที่ถูกใจ" / "รีโพสต์"
  กรองมาจาก usePosts().posts ฝั่ง caller แล้วส่ง list สำเร็จรูปเข้ามา ใช้การ์ดเดียวกับฟีดหลัก
\*============================================================================*/
interface PostListPageProps {
  title: string
  posts: PostData[]
  emptyMessage: string
  onBack: () => void
}
export default function PostListPage({ title, posts, emptyMessage, onBack }: PostListPageProps) {
  return (
    <div className="story-subpage">
      <div className="story-subpage__head">
        <button className="story-subpage__back" onClick={onBack} title="กลับ" aria-label="กลับ"><img src={BADGE_ICONS.back} className="icon-img" alt="" /></button>
        <span className="story-subpage__title">{title}</span>
      </div>
      {posts.length === 0 ? (
        <div className="story-empty-state">{emptyMessage}</div>
      ) : (
        <div className="story-feed__list">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  )
}
