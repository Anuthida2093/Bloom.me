import { usePersistentState } from '../../hooks/usePersistentState'
import { BADGE_ICONS } from '../../config/iconAssets'

/*============================================================================*\
  ContentSettingsPage — [ไฟล์ใหม่ — ฟีเจอร์สตอรี่] ปุ่ม "การตั้งค่าเนื้อหา" ใน sidebar
  ────────────────────────────────────────────────────────────────────────────
  [ตั้งใจทำแค่นี้ตามที่ระบุ] "รอบนี้ทำแค่หน้าเปล่าๆ มี toggle ง่ายๆ 1-2 ตัวพอ ไม่ต้องทำระบบ
  content moderation เต็มรูปแบบ" — toggle เก็บ client-side ล้วนๆ (usePersistentState) ยังไม่มี
  ระบบ report/moderation จริงเบื้องหลังให้ toggle นี้ไปมีผลจริง (ไม่มีอะไรถูก "รายงาน" อยู่แล้ว
  ในระบบตอนนี้) — เป็น placeholder ที่ใช้งานได้จริงในเชิง UI แต่ยังไม่กระทบข้อมูลจริง
\*============================================================================*/
export default function ContentSettingsPage({ onBack }: { onBack: () => void }) {
  const [hideReported, setHideReported] = usePersistentState('story-hide-reported', false)
  const [autoplayVideo, setAutoplayVideo] = usePersistentState('story-autoplay-video', true)

  return (
    <div className="story-subpage">
      <div className="story-subpage__head">
        <button className="story-subpage__back" onClick={onBack} title="กลับ" aria-label="กลับ"><img src={BADGE_ICONS.back} className="icon-img" alt="" /></button>
        <span className="story-subpage__title">การตั้งค่าเนื้อหา</span>
      </div>

      <div className="story-toggle-row">
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>ซ่อนเนื้อหาที่มีคนรายงาน</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>ยังไม่มีระบบรายงานเนื้อหาจริงในรอบนี้ — เตรียม toggle ไว้ก่อน</div>
        </div>
        <button
          className={`story-follow-btn${hideReported ? ' story-follow-btn--following' : ''}`}
          onClick={() => setHideReported((v) => !v)}
        >
          {hideReported ? 'เปิดอยู่' : 'ปิดอยู่'}
        </button>
      </div>

      <div className="story-toggle-row">
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>เล่นวิดีโอในฟีดอัตโนมัติ</div>
        <button
          className={`story-follow-btn${autoplayVideo ? ' story-follow-btn--following' : ''}`}
          onClick={() => setAutoplayVideo((v) => !v)}
        >
          {autoplayVideo ? 'เปิดอยู่' : 'ปิดอยู่'}
        </button>
      </div>
    </div>
  )
}
