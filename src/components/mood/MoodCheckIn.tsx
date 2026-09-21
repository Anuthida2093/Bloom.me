import { useState, type ChangeEvent } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import type { MoodCategory, MoodTypeValue } from '../../types'
import { MOOD_TYPE_INFO, MOOD_CATEGORY_SUBTYPES, LEGACY_KEY_TO_CATEGORY } from '../../config/moodTypes'
import { BADGE_ICONS } from '../../config/iconAssets'

const C_1 = '#D8F3DC'
const C_2 = '#FBF4EC'
const C_3 = '#FFEDF2'
const SHADOW_4 = 'rgba(116,198,157,.18)'
const BG_5 = '#FFF9C4'

type MoodKey = 'good' | 'neutral' | 'bad'

/** [แก้ตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] ทุกตัวเลือกในกริด 4x2 อ้างอิงสีตาม
 *  bucket ที่มันสังกัดอยู่ (POSITIVE/NEUTRAL/NEGATIVE) — จานสีเดียวกับที่ 3 ปุ่มเดิมเคยใช้
 *  (C_1/C_2/C_3) เพื่อให้ยังจัดกลุ่มด้วยสายตาได้แม้ตัวเลือกจะเยอะขึ้นเป็น 8 ตัว */
const CATEGORY_STYLE: Record<MoodCategory, { color: string; bg: string }> = {
  POSITIVE: { color: 'var(--g600)', bg: C_1 },
  NEUTRAL: { color: 'var(--b500)', bg: C_2 },
  NEGATIVE: { color: 'var(--red)', bg: C_3 },
}

/** ตัวเลือก 8 อารมณ์เต็มรูปแบบ เรียงตามลำดับที่นิยามไว้ใน MOOD_CATEGORY_SUBTYPES
 *  (POSITIVE → NEUTRAL → NEGATIVE) ให้ grid 4x2 จัดกลุ่มเดียวกันอยู่ใกล้กัน */
const ALL_MOOD_VALUES: MoodTypeValue[] = [
  ...MOOD_CATEGORY_SUBTYPES.POSITIVE,
  ...MOOD_CATEGORY_SUBTYPES.NEUTRAL,
  ...MOOD_CATEGORY_SUBTYPES.NEGATIVE,
]

/** ย้อนกลับ LEGACY_KEY_TO_CATEGORY (MoodKey→MoodCategory) เป็น MoodCategory→MoodKey —
 *  ยังต้องส่ง MoodKey (bucket) ให้ onSubmit เดิมอยู่ (ดู MoodCheckInProps) แม้ตอนนี้ผู้ใช้จะ
 *  เลือกอารมณ์ย่อยตรงๆ จากกริด 8 ตัวแทนการเลือก bucket ก่อนแล้ว */
const CATEGORY_TO_LEGACY_KEY = Object.fromEntries(
  (Object.entries(LEGACY_KEY_TO_CATEGORY) as [MoodKey, MoodCategory][]).map(([key, cat]) => [cat, key]),
) as Record<MoodCategory, MoodKey>

function categoryOfMood(value: MoodTypeValue): MoodCategory {
  for (const [cat, list] of Object.entries(MOOD_CATEGORY_SUBTYPES) as [MoodCategory, MoodTypeValue[]][]) {
    if (list.includes(value)) return cat
  }
  return 'NEUTRAL'
}

interface MoodCheckInProps {
  /** [แก้ตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] เดิมส่งแค่ mood (bucket 3 ค่า) —
   *  เพิ่ม subMood (อารมณ์ย่อยจริง 1 ใน 8 ค่าตาม backend MoodType) เข้าไปด้วย
   *  [แก้รอบนี้ — บั๊กเจอเควสประตูอารมณ์ซ้ำบนจอเล็ก] คืน Promise ได้ — handleSubmit ด้านล่าง
   *  จะรอ (await) ให้บันทึกเสร็จจริงก่อนแล้วค่อยปิด modal เอง ไม่ใช่ปิดทันทีที่กดปุ่ม */
  onSubmit?: (mood: MoodKey, subMood: MoodTypeValue, text: string) => void | Promise<void>
  onSkip?: () => void
}

// อิโมจิลอยตัวเบาๆ ในพื้นหลัง (ตกแต่งล้วนๆ ไม่โต้ตอบ) — ตำแหน่ง/จังหวะ/ขนาดสุ่มไว้ล่วงหน้า
// ครั้งเดียวตอนโหลดไฟล์ (ไม่ใช่ useState) เพราะไม่ต้องเปลี่ยนระหว่างที่ modal เปิดอยู่เลย
const FLOATING_DECOR = [
  { emoji: '🍃', left: '8%', size: 22, duration: 7, delay: 0 },
  { emoji: '☁️', left: '85%', size: 26, duration: 9, delay: 1.2 },
  { emoji: '✨', left: '18%', size: 16, duration: 6, delay: 2.4 },
  { emoji: '🍃', left: '78%', size: 18, duration: 8, delay: 0.6 },
  { emoji: '✨', left: '92%', size: 14, duration: 5.5, delay: 3 },
]

export default function MoodCheckIn({ onSubmit = () => {}, onSkip = () => {} }: MoodCheckInProps) {
  useLockBodyScroll()
  useEscapeKey(onSkip)
  const [text, setText] = useState('')
  const [mood, setMood] = useState<MoodKey | null>(null)
  /** [เพิ่มตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] อารมณ์ย่อยจริงที่จะส่งเป็น
   *  MoodEntryData.mood — ตั้งค่าเริ่มต้นอัตโนมัติเป็นตัวแรกของ bucket ที่เลือกทุกครั้ง
   *  (ดู handlePickMood/handleAnalyze) ผู้ใช้กดเปลี่ยนเป็นตัวอื่นในกลุ่มเดียวกันได้ */
  const [subMood, setSubMood] = useState<MoodTypeValue | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [justPicked, setJustPicked] = useState<MoodTypeValue | null>(null)
  /** [เพิ่มรอบนี้ — บั๊กเจอเควสประตูอารมณ์ซ้ำบนจอเล็ก] โชว์สถานะ "กำลังบันทึก" ระหว่างรอ
   *  onSubmit (ตอนนี้ await จริงจนกว่า moodEntries จะถูกบันทึกเสร็จ) กันผู้ใช้กดซ้ำระหว่างรอ
   *  และให้เห็นชัดว่าระบบกำลังทำงานอยู่ ไม่ใช่ค้าง/พัง */
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAnalyze = () => {
    if (!text.trim()) return
    setAnalyzing(true)
    setTimeout(() => {
      const pos = ['ดี', 'สุข', 'สนุก', 'ยินดี', 'ภูมิใจ', 'ดีใจ']
      const neg = ['เครียด', 'เศร้า', 'เหนื่อย', 'กังวล', 'ท้อ', 'ไม่ดี', 'แย่']
      const lc = text.toLowerCase()
      const category: MoodCategory = neg.some(w => lc.includes(w)) ? 'NEGATIVE' : pos.some(w => lc.includes(w)) ? 'POSITIVE' : 'NEUTRAL'
      // ให้ AI เดาแค่ bucket ใหญ่ (บวก/กลาง/ลบ) เหมือนเดิม — ตั้ง subMood เป็นตัวแรกของกลุ่มนั้น
      pickMood(MOOD_CATEGORY_SUBTYPES[category][0])
      setAnalyzing(false)
    }, 900)
  }

  const pulsePick = (value: MoodTypeValue) => {
    setJustPicked(value)
    setTimeout(() => setJustPicked(null), 500)
  }

  /** [แก้ตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] ตอนนี้ผู้ใช้เลือกอารมณ์ย่อย (1 ใน 8)
   *  ตรงๆ จากกริดแทนการเลือก bucket ก่อนแล้วค่อยเจาะจง — bucket (MoodKey เดิม) จึง derive
   *  กลับจากอารมณ์ย่อยที่เลือกแทน เพื่อให้ onSubmit เดิม (ที่ยังรับ MoodKey อยู่) ทำงานต่อได้ */
  const pickMood = (value: MoodTypeValue) => {
    const category = categoryOfMood(value)
    setMood(CATEGORY_TO_LEGACY_KEY[category])
    setSubMood(value)
    pulsePick(value)
  }

  const handlePickMood = (value: MoodTypeValue) => {
    pickMood(value)
  }

  const handleSubmit = async () => {
    if (!mood || !subMood || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(mood, subMood, text)
    } finally {
      // [เพิ่มรอบนี้] ไม่ setIsSubmitting(false) ใน finally เฉยๆ จะปลอดภัย เพราะกรณีสำเร็จ
      // modal ปิดไปแล้ว (ผู้เรียก onSubmit ปิดเองหลัง await เสร็จ — ดู MentalContext.tsx)
      // component นี้ unmount ไปแล้ว การ setState ไม่มีผลอะไร ส่วนกรณี error ยังอยู่ต้องปลด
      // ล็อกปุ่มคืนให้กดใหม่ได้จริง
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mood-checkin-backdrop" style={{ position: 'fixed', inset: 0, background: 'var(--glass-b-45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}>
      {/* อิโมจิลอยตัวพื้นหลัง — ตกแต่งเบาๆ ให้บรรยากาศดูมีชีวิตชีวาไม่นิ่งทื่อ */}
      {FLOATING_DECOR.map((d, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="mood-checkin-float-decor"
          style={{
            position: 'absolute', left: d.left, bottom: -40, fontSize: d.size,
            animationDuration: `${d.duration}s`, animationDelay: `${d.delay}s`, opacity: 0.5,
          }}
        >
          {d.emoji}
        </span>
      ))}

      <div className="mood-checkin-card" style={{ background: 'linear-gradient(180deg, var(--g50) 0%, var(--fixed-white) 55%)', borderRadius: 28, padding: '32px 28px', width: '100%', maxWidth: 420, boxShadow: '0 24px 60px var(--glass-b-20)', position: 'relative' }}>
        {/* [แก้บั๊ก — จอเล็ก/มือถือ] เดิม card ไม่มี max-height/overflow เลย บนจอสูงไม่พอ (มือถือ
            ส่วนใหญ่, หรือคีย์บอร์ดเด้งขึ้นตอนพิมพ์บันทึก) เนื้อหาในนี้ (หัวข้อ+textarea+ปุ่ม AI+
            เลือกอารมณ์+อารมณ์ย่อย+ตัวอย่างโพสอิท+ปุ่มส่ง) รวมกันสูงเกิน viewport ได้ง่าย แต่
            backdrop ข้างนอกตั้ง overflow:'hidden' ไว้ (กันพื้นหลังเลื่อน) ผลคือปุ่ม "🌱 รดน้ำต้นไม้
            วันนี้!" ที่อยู่ล่างสุดถูกตัดออกนอกจอไปเลยโดยไม่มีทางเลื่อนไปกดได้ — ผู้ใช้กด "ข้าม
            สำหรับวันนี้" (ปุ่มที่ยังพอเห็น) หรือปิด modal ไปแทน handleSubmit เลยไม่เคยถูกเรียก
            เควสไพ่ทิพย์ (ต้องมี moodEntry ของวันนี้ก่อนถึงจะเล่นได้ ดู GameplayFrame.tsx) จึง
            เหมือน "กดเช็คอินแล้วไม่ไปไหนเลย" เฉพาะจอเล็ก — แก้ด้วยการจำกัดความสูงสูงสุด + ให้
            เลื่อนดูเนื้อหาข้างในการ์ดเองได้ (ดู .mood-checkin-card ใน <style> ท้ายไฟล์) */}
        {/* Header — [แก้ตามที่ระบุ] แทนอิโมจิ 🌤️ ด้วยรูป BADGE_ICONS.checkin (Check-in.png)
            ขนาดพอดีจุดเดิม (เดิม fontSize:52 ของอิโมจิ) — หัวข้อหลัก 20px, คำอธิบาย 18px
            (--fs-lg ตรงเป๊ะ 18px พอดี ส่วนหัวข้อ 20px ไม่มี token ตรง จึงกำหนดค่าตรงจุดนี้เอง) */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src={BADGE_ICONS.checkin} alt="" className="mood-checkin-header-emoji" style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: 8 }} />
          <h2 style={{ fontFamily: 'Fredoka One', fontSize: 20, color: 'var(--g800)' }}>สวัสดีตอนเช้า!</h2>
          <p style={{ color: 'var(--n500)', fontSize: 'var(--fs-lg)', marginTop: 4 }}>วันนี้คุณรู้สึกอย่างไร? บอกเล่าให้ต้นไม้ฟังหน่อยนะ 🌿</p>
        </div>

        {/* Journal input */}
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={text}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setText(e.target.value); setMood(null); setSubMood(null) }}
            placeholder="เขียนบันทึกความรู้สึกประจำวัน... ข้อความนี้จะถูกเปลี่ยนเป็นโพสอิทติดบนต้นไม้ของคุณ ✏️"
            rows={4}
            style={{
              width: '100%', padding: '14px 16px', border: '2px solid var(--n100)', borderRadius: 16,
              fontSize: 14, fontFamily: 'Nunito', resize: 'none', outline: 'none',
              color: 'var(--n900)', lineHeight: 1.6,
              transition: 'border-color .2s, box-shadow .2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--g400)'; e.target.style.boxShadow= `0 0 0 4px ${SHADOW_4}` }}
            onBlur={e => { e.target.style.borderColor = 'var(--n100)'; e.target.style.boxShadow = 'none' }}
          />
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || analyzing}
            className="mood-checkin-analyze-btn"
            style={{
              marginTop: 8, width: '100%', padding: '10px', border: 'none', borderRadius: 12,
              background: text.trim() ? 'var(--g600)' : 'var(--n100)',
              color: text.trim() ? 'var(--fixed-white)' : 'var(--n300)',
              fontFamily: 'Nunito', fontWeight: 700, fontSize: 13, cursor: text.trim() ? 'pointer' : 'default',
              transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {analyzing ? (
              <>
                🤖 กำลังวิเคราะห์
                <span className="mood-checkin-thinking-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </>
            ) : '🤖 วิเคราะห์อารมณ์ด้วย AI'}
          </button>
        </div>

        {/* AI result or manual mood — [แก้ตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] เดิมมีแค่
            3 ตัวเลือก (ดี/เฉยๆ/ไม่ดี) แล้วค่อยกดเจาะจงอารมณ์ย่อยในแถวล่างอีกที — ตอนนี้เลือก
            อารมณ์ย่อยทั้ง 8 ตัวได้ตรงๆ จากกริดเดียว (4 คอลัมน์ x 2 แถว, ทุกปุ่มขนาดเท่ากันเป๊ะ
            ผ่าน grid 1fr + aspect-ratio:1) ไม่ต้องเลือกทีละขั้นอีกต่อไป */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n500)', marginBottom: 10, textAlign: 'center' }}>
            {mood ? '✨ AI วิเคราะห์ว่า — หรือเลือกเอง:' : 'เลือกอารมณ์วันนี้:'}
          </div>
          <div className="mood-checkin-mood-grid">
            {ALL_MOOD_VALUES.map((value) => {
              const info = MOOD_TYPE_INFO[value]
              const style = CATEGORY_STYLE[categoryOfMood(value)]
              const active = subMood === value
              return (
                <button
                  key={value}
                  onClick={() => handlePickMood(value)}
                  title={info.label}
                  className={justPicked === value ? 'mood-checkin-mood-btn mood-checkin-mood-btn--picked' : 'mood-checkin-mood-btn'}
                  style={{
                    border: `2.5px solid ${active ? style.color : 'var(--n100)'}`,
                    borderRadius: 16, background: active ? style.bg : 'var(--white)',
                    cursor: 'pointer', transition: 'border-color .18s, background .18s, transform .18s ease',
                    transform: active ? 'scale(1.06)' : 'scale(1)',
                    boxShadow: active ? `0 4px 16px ${style.color}44` : 'none',
                  }}>
                  <div className="mood-checkin-mood-emoji" style={{ fontSize: 24 }}>{info.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: active ? style.color : 'var(--n500)', marginTop: 4 }}>{info.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Post-it preview */}
        {text.trim() && mood && (
          <div className="mood-checkin-postit" style={{ marginBottom: 16, padding: '14px 16px', background: BG_5, borderRadius: 12, border: '1.5px solid var(--coin)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -8, left: 12, background: 'var(--coin)', borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700, color: 'var(--b700)' }}>โพสอิทวันนี้</div>
            <p style={{ fontSize: 12, color: 'var(--n700)', lineHeight: 1.6, marginTop: 4 }}>{text.slice(0, 100)}{text.length > 100 ? '...' : ''}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!mood || isSubmitting}
          className={mood ? 'mood-checkin-submit-btn mood-checkin-submit-btn--ready' : 'mood-checkin-submit-btn'}
          style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: 16,
            background: mood ? 'linear-gradient(135deg, var(--g600), var(--g500))' : 'var(--n100)',
            color: mood ? 'var(--fixed-white)' : 'var(--n300)',
            fontFamily: 'Fredoka One', fontSize: 18,
            cursor: mood && !isSubmitting ? 'pointer' : 'default',
            opacity: isSubmitting ? 0.75 : 1,
            boxShadow: mood ? 'var(--sh-btn)' : 'none',
            transition: 'transform .15s, box-shadow .15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {/* [เพิ่มตามที่ระบุ] ไอคอน BADGE_ICONS.water (Water.png) หน้าข้อความปุ่ม แทนอิโมจิ 🌱 เดิม */}
          <img src={BADGE_ICONS.water} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          {isSubmitting ? 'กำลังบันทึก...' : 'รดน้ำต้นไม้วันนี้!'}
        </button>

        <button onClick={onSkip} disabled={isSubmitting} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--n300)', fontSize: 13, cursor: isSubmitting ? 'default' : 'pointer', padding: '6px', opacity: isSubmitting ? 0.5 : 1 }}>
          ข้ามสำหรับวันนี้
        </button>
      </div>

      <style>{`
        @keyframes moodCheckinCardPop {
          from { opacity: 0; transform: scale(.9) translateY(14px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mood-checkin-card {
          animation: moodCheckinCardPop .35s cubic-bezier(.22,1,.36,1) both;
          /* [แก้บั๊กจอเล็ก] จำกัดสูงสุดไม่ให้เกิน viewport (เผื่อ padding ของ backdrop 16px
             บน+ล่าง) แล้วให้เลื่อนเนื้อหาข้างในการ์ดเองได้แทนการโดนตัดทิ้งเงียบๆ — ใช้ vh ก่อน
             เป็น fallback แล้วค่อยทับด้วย dvh (นับความสูงจริงที่มองเห็นบนมือถือ ไม่รวมแถบ URL
             ที่ย่อ/ขยายได้ ของเบราว์เซอร์มือถือ) เบราว์เซอร์ที่ไม่รู้จัก dvh จะข้ามบรรทัดนั้นไปเอง */
          max-height: calc(100vh - 32px);
          max-height: calc(100dvh - 32px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        @keyframes moodCheckinBackdropFade { from { opacity: 0; } to { opacity: 1; } }
        .mood-checkin-backdrop { animation: moodCheckinBackdropFade .25s ease both; }

        @keyframes moodCheckinHeaderBob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(-4deg); }
        }
        .mood-checkin-header-emoji { display: inline-block; animation: moodCheckinHeaderBob 3s ease-in-out infinite; }

        @keyframes moodCheckinFloatUp {
          from { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: .5; }
          90%  { opacity: .5; }
          to   { transform: translateY(-70vh) translateX(12px); opacity: 0; }
        }
        .mood-checkin-float-decor { animation-name: moodCheckinFloatUp; animation-timing-function: ease-in; animation-iteration-count: infinite; pointer-events: none; }

        .mood-checkin-mood-btn:hover .mood-checkin-mood-emoji { animation: moodCheckinWiggle .4s ease; }
        @keyframes moodCheckinWiggle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-10deg) scale(1.1); }
          75% { transform: rotate(10deg) scale(1.1); }
        }
        /* [เพิ่มตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] กริด 4 คอลัมน์ x 2 แถว จัดกึ่งกลาง
           การ์ด — grid-template-columns: repeat(4, 1fr) การันตีทุกคอลัมน์กว้างเท่ากัน บวก
           aspect-ratio:1 บนตัวปุ่มเอง ทำให้ทุกปุ่มเป็นสี่เหลี่ยมจัตุรัสขนาดเท่ากันเป๊ะเสมอ
           ไม่ว่าความยาวป้ายชื่ออารมณ์จะสั้น/ยาวแค่ไหน */
        .mood-checkin-mood-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          max-width: 340px;
          margin: 0 auto;
        }
        .mood-checkin-mood-btn {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }
        .mood-checkin-mood-btn--picked { animation: moodCheckinPickBounce .5s cubic-bezier(.34,1.56,.64,1); }
        @keyframes moodCheckinPickBounce {
          0%   { transform: scale(1.06); }
          40%  { transform: scale(1.22); }
          100% { transform: scale(1.06); }
        }

        .mood-checkin-thinking-dots { display: inline-flex; gap: 3px; }
        .mood-checkin-thinking-dots span {
          width: 4px; height: 4px; border-radius: 50%; background: var(--fixed-white);
          animation: moodCheckinDotBounce 1s ease-in-out infinite;
        }
        .mood-checkin-thinking-dots span:nth-child(2) { animation-delay: .15s; }
        .mood-checkin-thinking-dots span:nth-child(3) { animation-delay: .3s; }
        @keyframes moodCheckinDotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: .5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }

        @keyframes moodCheckinPostitIn {
          0%   { opacity: 0; transform: rotate(-6deg) scale(.85) translateY(-6px); }
          60%  { transform: rotate(2deg) scale(1.03); }
          100% { opacity: 1; transform: rotate(-1.5deg) scale(1) translateY(0); }
        }
        .mood-checkin-postit { animation: moodCheckinPostitIn .5s cubic-bezier(.22,1,.36,1) both; }

        .mood-checkin-submit-btn--ready { animation: moodCheckinSubmitGlow 1.8s ease-in-out infinite; }
        @keyframes moodCheckinSubmitGlow {
          0%, 100% { box-shadow: var(--sh-btn); }
          50% {
  --lc-shadow-1: rgba(64,145,108,.55);
  box-shadow: 0 6px 22px var(--lc-shadow-1);
}
        }
        .mood-checkin-submit-btn--ready:hover { transform: translateY(-2px) scale(1.015); }
        .mood-checkin-submit-btn--ready:active { transform: translateY(1px) scale(.98); }

        @media (prefers-reduced-motion: reduce) {
          .mood-checkin-card, .mood-checkin-backdrop, .mood-checkin-header-emoji,
          .mood-checkin-float-decor, .mood-checkin-mood-btn--picked, .mood-checkin-postit,
          .mood-checkin-submit-btn--ready, .mood-checkin-thinking-dots span {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}