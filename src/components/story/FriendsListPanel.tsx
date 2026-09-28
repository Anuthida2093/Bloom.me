import { MOCK_LEADERBOARD_PLAYERS } from '../../config/leaderboardData'
import { useSocial } from '../../context/SocialContext'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  FriendsListPanel — [แก้ตามที่ระบุ] "เพื่อน" = ติดตามกันทั้งสองฝ่ายเท่านั้น
  ────────────────────────────────────────────────────────────────────────────
  แบ่ง 3 กลุ่ม:
    • เพื่อน — ติดตามกันและกัน (มีปุ่ม "แชท")
    • กำลังติดตาม — เราติดตามแล้ว รอเขาติดตามกลับ (ยังไม่นับเป็นเพื่อน)
    • ติดตามคุณ — เขาติดตามเรา กด "ติดตามกลับ" แล้วเป็นเพื่อนกัน
  กดที่แถวเปิดโปรไฟล์ (requestViewProfile เช็ค privacy ให้เอง)
\*============================================================================*/
interface FriendsListPanelProps {
  onBack: () => void
  onOpenChat: (friendId: string, friendName: string) => void
}

export default function FriendsListPanel({ onBack, onOpenChat }: FriendsListPanelProps) {
  const { following, followers, friends, toggleFollow, requestViewProfile } = useSocial()
  const byId = (ids: string[]) => MOCK_LEADERBOARD_PLAYERS.filter((p) => ids.includes(p.id))

  const friendPlayers = byId(friends)
  const pendingPlayers = byId(following.filter((id) => !followers.includes(id)))
  const followBackPlayers = byId(followers.filter((id) => !following.includes(id)))

  const row = (player: { id: string; username: string }, actions: React.ReactNode) => (
    <div key={player.id} className="story-friend-row">
      <button className="story-friend-row__clickable" onClick={() => requestViewProfile(player.id, player.username)}>
        <div className="story-avatar story-avatar--sm">{player.username.trim().charAt(0).toUpperCase()}</div>
        <span className="story-friend-row__name">{player.username}</span>
      </button>
      {actions}
    </div>
  )

  return (
    <div className="story-subpage">
      <div className="story-subpage__head">
        <button className="story-subpage__back" onClick={onBack} title="กลับ" aria-label="กลับ"><img src={BADGE_ICONS.back} className="icon-img" alt="" /></button>
        <span className="story-subpage__title">เพื่อน</span>
      </div>

      <div className="story-activity-group-label">เพื่อน ({friendPlayers.length}) · ติดตามกันและกัน</div>
      {friendPlayers.length === 0
        ? <div className="story-empty-state story-empty-state--compact">ยังไม่มีเพื่อน — ติดตามกันทั้งสองฝ่ายแล้วจะเป็นเพื่อนกัน</div>
        : friendPlayers.map((p) => row(p, (
          <>
            <button className="story-follow-btn" onClick={() => onOpenChat(p.id, p.username)}>แชท</button>
            <button className="story-follow-btn story-follow-btn--following" onClick={() => toggleFollow(p.id)}>เลิกติดตาม</button>
          </>
        )))}

      {pendingPlayers.length > 0 && (
        <>
          <div className="story-activity-group-label">กำลังติดตาม ({pendingPlayers.length}) · รอติดตามกลับ</div>
          {pendingPlayers.map((p) => row(p, (
            <button className="story-follow-btn story-follow-btn--following" onClick={() => toggleFollow(p.id)} title="แตะเพื่อเลิกติดตาม">กำลังติดตาม</button>
          )))}
        </>
      )}

      {followBackPlayers.length > 0 && (
        <>
          <div className="story-activity-group-label">ติดตามคุณ ({followBackPlayers.length})</div>
          {followBackPlayers.map((p) => row(p, (
            <button className="story-follow-btn" onClick={() => toggleFollow(p.id)}>ติดตามกลับ</button>
          )))}
        </>
      )}
    </div>
  )
}
