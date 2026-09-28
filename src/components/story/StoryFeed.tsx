import { useMemo, useState } from 'react'
import { usePosts } from '../../context/PostContext'
import { useUser } from '../../context/UserContext'
import { useSocial } from '../../context/SocialContext'
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
  const { isFollowing } = useSocial()
  // เวลาอ้างอิงตอนเปิดฟีด (คงที่ระหว่างเปิดอยู่ — ลำดับโพสต์ไม่กระโดดเองระหว่างเลื่อนอ่าน)
  const [openedAt] = useState(() => Date.now())

  /* [แก้ตามที่ระบุ] ฟีดเห็นโพสต์ของทุกคน (ไม่ใช่แค่เพื่อน) แต่โพสต์ใหม่ของเพื่อน (คนที่เราติดตาม)
     ภายใน 3 วันล่าสุดขึ้นก่อนเป็นพิเศษ ที่เหลือเรียงใหม่สุดก่อนตามปกติ */
  const orderedPosts = useMemo(() => {
    const FRIEND_BOOST_MS = 3 * 24 * 60 * 60 * 1000
    const isFreshFriendPost = (p: typeof posts[number]) =>
      !p.isAnonymous && p.userId !== userData.id && isFollowing(p.userId) &&
      openedAt - new Date(p.createdAt).getTime() < FRIEND_BOOST_MS
    const byNewest = [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return [...byNewest.filter(isFreshFriendPost), ...byNewest.filter((p) => !isFreshFriendPost(p))]
  }, [posts, userData.id, isFollowing, openedAt])

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

        {orderedPosts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}
