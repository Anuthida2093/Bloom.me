/*============================================================================*\
  storyIcons — [ใหม่ตามที่ระบุ] ไอคอนปุ่มถูกใจ/คอมเมนต์/ส่งให้เพื่อน ของหน้าสตอรี่ (วาด SVG เอง
  ให้เข้ากับธีมต้นไม้) · หัวใจมี "ใบไม้งอก" ที่ยอด = เอกลักษณ์ของแอป
\*============================================================================*/

export function HeartLeafIcon({ filled }: { filled: boolean }) {
  return (
    <svg className={`story-icon story-icon--heart${filled ? ' is-filled' : ''}`} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <defs>
        <linearGradient id="storyHeartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8AA0" />
          <stop offset="1" stopColor="#E0415F" />
        </linearGradient>
      </defs>
      {/* ใบไม้งอกเหนือหัวใจ */}
      <path className="story-icon__leaf" d="M12 7.2c-.2-2.6 1.3-4.6 3.9-5.2.2 2.6-1.4 4.6-3.9 5.2z" />
      <path
        className="story-icon__heart"
        d="M12 21s-7.6-4.5-9.5-9.3C1.1 8.1 3.3 4.8 6.7 4.8c2.2 0 3.7 1.3 4.4 2.5h1.8c.7-1.2 2.2-2.5 4.4-2.5 3.4 0 5.6 3.3 4.2 6.9C19.6 16.5 12 21 12 21z"
      />
    </svg>
  )
}

export function CommentIcon() {
  return (
    <svg className="story-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        className="story-icon__stroke"
        d="M20.5 11.3c0 4.3-3.9 7.7-8.6 7.7-1.2 0-2.3-.2-3.3-.6L3.5 20l1.4-4.1c-.9-1.3-1.4-2.9-1.4-4.6 0-4.3 3.9-7.8 8.6-7.8s8.4 3.5 8.4 7.8z"
      />
      <circle className="story-icon__dot" cx="8.2" cy="11.4" r="1.1" />
      <circle className="story-icon__dot" cx="12" cy="11.4" r="1.1" />
      <circle className="story-icon__dot" cx="15.8" cy="11.4" r="1.1" />
    </svg>
  )
}

export function ShareIcon() {
  return (
    <svg className="story-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path className="story-icon__stroke" d="M21 3 10.2 13.8" />
      <path className="story-icon__stroke" d="M21 3 14.4 21l-4.2-7.2L3 9.6z" />
    </svg>
  )
}

export function ChatIcon() {
  return (
    <svg className="story-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path className="story-icon__stroke" d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4z" />
    </svg>
  )
}
