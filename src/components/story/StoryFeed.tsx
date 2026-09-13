import { usePosts } from '../../context/PostContext'
import { useUser } from '../../context/UserContext'
import PostCard from './PostCard'

/*============================================================================*\
  StoryFeed — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] คอลัมน์ซ้าย (หน้า 1 ของ wireframe)
  แถบบนสุดของฟีดคือ "compose trigger" (avatar+username ของตัวเอง + ข้อความชวนโพสต์)
  ตรงกับแถวบนสุดของ wireframe หน้า 1 ("nunu_09 มีอะไรมาเล่าสู่กันฟังไหม") — กดแล้วเปิด
  ComposeStoryModal เหมือนปุ่ม + ลอยมุมขวาล่าง
\*============================================================================*/

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function StoryFeed({ onCompose }: { onCompose: () => void }) {
  const { posts, isLoadingPosts } = usePosts()
  const { userData } = useUser()

  return (
    <div className="story-feed">
      {/* [ปรับให้ตรง wireframe] ทั้งแถบเชิญโพสต์ + รายการโพสต์ อยู่ในกล่องขอบมนใบเดียวกัน
          คั่นด้วยเส้นบางๆ ระหว่างรายการ ไม่ใช่การ์ดลอยแยกทีละใบ */}
      <div className="story-feed__list">
        {/* [ข้อ 7] แถวนี้หน้าตาต้องต่างจาก post card ชัดเจน + คล้ายช่อง input (กดไม่ได้พิมพ์
            ตรงนี้ กดทั้งแถวเปิด modal สร้างโพสต์แทน) — ปุ่ม + ลอยมุมขวาล่างยังใช้เป็นทางลัด
            คู่กันได้ตามที่ระบุ */}
        <button className="story-compose-trigger" onClick={onCompose}>
          <div className="story-avatar story-avatar--sm">{initialOf(userData.username)}</div>
          <span className="story-compose-trigger__fake-input">มีอะไรมาเล่าสู่กันฟังไหม?</span>
        </button>

        {isLoadingPosts && <div className="story-empty-state">กำลังโหลดฟีด...</div>}

        {!isLoadingPosts && posts.length === 0 && (
          <div className="story-empty-state">ยังไม่มีสตอรี่ในฟีด — เป็นคนแรกที่โพสต์เลยสิ!</div>
        )}

        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}
