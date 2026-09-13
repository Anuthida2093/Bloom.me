import { MOCK_LEADERBOARD_PLAYERS } from '../../config/leaderboardData'
import { useSocial } from '../../context/SocialContext'

/*============================================================================*\
  FriendsListPanel — [แก้รอบนี้ — ข้อ 3] "เพื่อน" = คนที่เราติดตามอยู่เท่านั้น (followerId
  = เรา) ไม่ใช่ไม่ต้องรอ mutual follow — เดิมหน้านี้โชว์ผู้เล่นทุกคนพร้อมปุ่มติดตาม (เป็นหน้า
  "ค้นหาคนติดตาม" มากกว่า) ตอนนี้เปลี่ยนเป็น list เฉพาะคนที่เราติดตามอยู่จริงเท่านั้น —
  การค้นหาคนใหม่ไปติดตามยังทำได้ผ่านช่องค้นหา (StorySidebar) หรือหน้ากิจกรรมตามปกติ

  [ข้อ 11] กดที่แถว (ไม่ใช่ปุ่มเลิกติดตาม) เปิดโปรไฟล์เพื่อนคนนั้น — requestViewProfile
  เช็ค privacy ให้เองว่าเปิดได้จริงหรือต้องโชว์ toast "โพสต์ปิดโปรไฟล์" แทน
\*============================================================================*/
export default function FriendsListPanel({ onBack }: { onBack: () => void }) {
  const { following, toggleFollow, requestViewProfile } = useSocial()
  const friends = MOCK_LEADERBOARD_PLAYERS.filter((p) => following.includes(p.id))

  return (
    <div className="story-subpage">
      <div className="story-subpage__head">
        <button className="story-subpage__back" onClick={onBack}>←</button>
        <span className="story-subpage__title">เพื่อน</span>
      </div>

      {friends.length === 0 ? (
        <div className="story-empty-state">ยังไม่มีเพื่อน — ลองค้นหาแล้วกดติดตามคนอื่นดูสิ</div>
      ) : (
        friends.map((player) => (
          <div key={player.id} className="story-friend-row">
            <button
              className="story-friend-row__clickable"
              onClick={() => requestViewProfile(player.id, player.username)}
            >
              <div className="story-avatar story-avatar--sm">{player.username.trim().charAt(0).toUpperCase()}</div>
              <span className="story-friend-row__name">{player.username}</span>
            </button>
            <button className="story-follow-btn story-follow-btn--following" onClick={() => toggleFollow(player.id)}>
              เลิกติดตาม
            </button>
          </div>
        ))
      )}
    </div>
  )
}
