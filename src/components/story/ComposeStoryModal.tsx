import { useRef, useState } from 'react'
import { usePosts } from '../../context/PostContext'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { BADGE_ICONS } from '../../config/iconAssets'
import { MOOD_TYPE_INFO } from '../../config/moodTypes'
import { MAX_POST_IMAGES, type MoodTypeValue } from '../../types'
import { resizeImageFile } from '../../utils/imageResize'
import '../leaderboard/leaderboardRow.css'

/*============================================================================*\
  ComposeStoryModal — สร้างสตอรี่ใหม่ (ปุ่ม + ลอยมุมขวาล่าง / แถวชวนโพสต์บนสุดของฟีด)
  ────────────────────────────────────────────────────────────────────────────
  [แก้ตามที่ระบุ] หน้าเต็มจอในกรอบสตอรี่ — เรียงจากบนลงล่าง:
    1) รูปที่แนบ (สูงสุด 20 รูปเหมือน IG — แตะ ✕ ลบทีละรูป, ช่อง + เพิ่มรูป)
    2) กรอบข้อความ "มีอะไรมาเล่าสู่กันฟังไหม?"
    3) ความรู้สึก (ไม่บังคับ แตะซ้ำเพื่อยกเลิก)
    4) แฮชแท็ก #
    5) โพสต์แบบระบุตัวตน / ไม่ระบุตัวตน
  รูปถูกย่อก่อนแนบ (utils/imageResize.ts) ไม่ให้ข้อมูลใหญ่เกินไป
\*============================================================================*/
const MOODS = Object.values(MOOD_TYPE_INFO)
const MAX_TAGS = 10

function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '_').slice(0, 30)
}

export default function ComposeStoryModal({ onClose }: { onClose: () => void }) {
  useEscapeKey(onClose)
  const { createPost } = usePosts()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [mood, setMood] = useState<MoodTypeValue | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const remaining = MAX_POST_IMAGES - images.length

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/')).slice(0, remaining)
    e.target.value = ''
    if (files.length === 0) return
    setLoadingImages(true)
    try {
      const urls = await Promise.all(files.map((f) => resizeImageFile(f)))
      setImages((prev) => [...prev, ...urls].slice(0, MAX_POST_IMAGES))
    } finally {
      setLoadingImages(false)
    }
  }

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw)
    if (!tag) return
    setTags((prev) => (prev.includes(tag) || prev.length >= MAX_TAGS ? prev : [...prev, tag]))
    setTagInput('')
  }

  const canPost = content.trim().length > 0 || images.length > 0

  const handleSubmit = () => {
    if (!canPost) return
    const pendingTag = normalizeTag(tagInput)
    const allTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
    createPost({
      content: content.trim(),
      isAnonymous,
      imageUrl: images[0] ?? null,
      imageUrls: images,
      tags: allTags,
      mood,
    })
    onClose()
  }

  return (
    <div className="story-compose-page" role="dialog" aria-label="สร้างสตอรี่ใหม่">
      <div className="story-compose-page__inner">
        <div className="story-compose-page__top">
          <div className="lb-banner story-compose-page__banner">สร้างสตอรี่ใหม่</div>
          <button className="story-compose-page__close" onClick={onClose} title="ปิด" aria-label="ปิด">
            <img src={BADGE_ICONS.close} alt="" />
          </button>
        </div>

        <div className="lb-card story-compose-page__card">
          {/* 1) รูปที่แนบ — ขึ้นบนสุด */}
          <div className="story-compose-page__section">
            <div className="story-compose-page__row">
              <span className="story-compose-page__label">รูปภาพ</span>
              <span className="story-compose-page__count">{images.length}/{MAX_POST_IMAGES}</span>
            </div>
            <div className="story-compose-images">
              {images.map((src, i) => (
                <div key={i} className="story-compose-images__item">
                  <img src={src} alt={`รูปที่ ${i + 1}`} />
                  <span className="story-compose-images__index">{i + 1}</span>
                  <button
                    type="button"
                    className="story-compose-images__remove"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    title="ลบรูปนี้"
                    aria-label={`ลบรูปที่ ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {remaining > 0 && (
                <button
                  type="button"
                  className="story-compose-images__add"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loadingImages}
                  aria-label="เพิ่มรูป"
                >
                  <span className="story-compose-images__plus" aria-hidden="true">{loadingImages ? '⏳' : '+'}</span>
                  <span>{images.length === 0 ? 'แนบรูป' : 'เพิ่มรูป'}</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} hidden />
          </div>

          {/* 2) ข้อความ */}
          <textarea
            className="story-compose-page__text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="มีอะไรมาเล่าสู่กันฟังไหม?"
          />

          {/* 3) ความรู้สึก */}
          <div className="story-compose-page__section">
            <span className="story-compose-page__label">ตอนนี้คุณรู้สึกอย่างไร</span>
            <div className="story-compose-page__moods">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  className={`story-compose-page__mood${mood === m.value ? ' is-active' : ''}`}
                  onClick={() => setMood((cur) => (cur === m.value ? null : m.value))}
                  aria-pressed={mood === m.value}
                >
                  <span aria-hidden="true">{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4) แฮชแท็ก */}
          <div className="story-compose-page__section">
            <span className="story-compose-page__label">แฮชแท็ก</span>
            <div className="story-compose-tags">
              {tags.map((tag) => (
                <button key={tag} type="button" className="story-tag story-tag--removable" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} title="แตะเพื่อลบ">
                  #{tag} <span aria-hidden="true">✕</span>
                </button>
              ))}
              {tags.length < MAX_TAGS && (
                <div className="story-compose-tags__input">
                  <span aria-hidden="true">#</span>
                  <input
                    value={tagInput}
                    onChange={(e) => {
                      const v = e.target.value
                      if (/[\s,]$/.test(v)) addTag(v)
                      else setTagInput(v)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                    onBlur={() => addTag(tagInput)}
                    placeholder="พิมพ์แล้วกด Enter"
                    aria-label="เพิ่มแฮชแท็ก"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 5) ระบุตัวตน / ไม่ระบุตัวตน */}
          <div className="story-compose-page__row">
            <span className="story-compose-page__label">{isAnonymous ? 'โพสต์แบบไม่ระบุตัวตน' : 'โพสต์แบบระบุตัวตน'}</span>
            <button
              className={`story-compose-page__toggle story-compose-page__switch${isAnonymous ? ' is-on' : ''}`}
              onClick={() => setIsAnonymous((v) => !v)}
              aria-pressed={isAnonymous}
            >
              {isAnonymous ? '🕶️ ไม่ระบุตัวตน' : '🙂 ระบุตัวตน'}
            </button>
          </div>
        </div>

        <div className="story-compose-page__actions">
          <button className="lb-btn lb-btn--ghost" onClick={onClose}>ยกเลิก</button>
          <button className="lb-btn" onClick={handleSubmit} disabled={!canPost || loadingImages}>โพสต์</button>
        </div>
      </div>
    </div>
  )
}
