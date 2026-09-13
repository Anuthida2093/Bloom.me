import { useRef, useState } from 'react'
import { usePosts } from '../../context/PostContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/*============================================================================*\
  ComposeStoryModal — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] สร้างสตอรี่ใหม่ (ปุ่ม + ลอยมุมขวาล่าง)
  ────────────────────────────────────────────────────────────────────────────
  แนบรูปได้ 1 รูป — โปรเจกต์นี้ยังไม่มีระบบอัปโหลดไฟล์ขึ้นเซิร์ฟเวอร์จริง (ดู DB_CHANGES.md)
  จึงอ่านเป็น data URL ฝั่ง client ล้วนๆ ผ่าน FileReader แล้วเก็บลง imageUrl ตรงๆ (persist ใน
  localStorage ผ่าน mockDb เหมือนโพสต์อื่น) วันที่มี endpoint อัปโหลดจริง ค่อยเปลี่ยนจุดนี้
  เป็นยิงไฟล์ขึ้นเซิร์ฟเวอร์ก่อนแล้วค่อยส่ง URL จริงแทน
\*============================================================================*/
export default function ComposeStoryModal({ onClose }: { onClose: () => void }) {
  useEscapeKey(onClose)
  const { createPost } = usePosts()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [content, setContent] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!content.trim()) return
    createPost({ content: content.trim(), isAnonymous, imageUrl: imageDataUrl })
    onClose()
  }

  return (
    <div className="story-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="story-modal-card">
        <div className="story-modal-card__title">สร้างสตอรี่ใหม่</div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="มีอะไรมาเล่าสู่กันฟังไหม?"
          autoFocus
        />

        {imageDataUrl ? (
          <div className="story-image-preview">
            <img src={imageDataUrl} alt="รูปที่แนบ" />
            <button onClick={() => setImageDataUrl(null)} title="ลบรูป">✕</button>
          </div>
        ) : (
          <div className="story-modal-card__row">
            <button className="story-btn-ghost" onClick={() => fileInputRef.current?.click()} style={{ padding: '9px 16px', borderRadius: 999 }}>
              🖼️ แนบรูป
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />

        <div className="story-modal-card__row">
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)' }}>โพสต์แบบไม่ระบุตัวตน</span>
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
          <button className="story-btn-primary" onClick={handleSubmit} disabled={!content.trim()}>โพสต์</button>
        </div>
      </div>
    </div>
  )
}
