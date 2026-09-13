import { useState, type ChangeEvent } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'

const C_1 = '#D8F3DC'
const C_2 = '#FBF4EC'
const C_3 = '#FFEDF2'
const SHADOW_4 = 'rgba(116,198,157,.18)'
const BG_5 = '#FFF9C4'

type MoodKey = 'good' | 'neutral' | 'bad'

interface MoodOption {
  key: MoodKey
  emoji: string
  label: string
  color: string
  bg: string
}

interface MoodCheckInProps {
  onSubmit?: (mood: MoodKey, text: string) => void
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
  const [analyzing, setAnalyzing] = useState(false)
  const [justPicked, setJustPicked] = useState<MoodKey | null>(null)

  const moods: MoodOption[] = [
    { key: 'good', emoji: '😊', label: 'ดี', color: 'var(--g600)', bg: C_1 },
    { key: 'neutral', emoji: '😐', label: 'เฉยๆ', color: 'var(--b500)', bg: C_2 },
    { key: 'bad', emoji: '😔', label: 'ไม่ดี', color: 'var(--red)', bg: C_3 },
  ]

  const handleAnalyze = () => {
    if (!text.trim()) return
    setAnalyzing(true)
    setTimeout(() => {
      const pos = ['ดี', 'สุข', 'สนุก', 'ยินดี', 'ภูมิใจ', 'ดีใจ']
      const neg = ['เครียด', 'เศร้า', 'เหนื่อย', 'กังวล', 'ท้อ', 'ไม่ดี', 'แย่']
      const lc = text.toLowerCase()
      const picked: MoodKey = neg.some(w => lc.includes(w)) ? 'bad' : pos.some(w => lc.includes(w)) ? 'good' : 'neutral'
      setMood(picked)
      pulsePick(picked)
      setAnalyzing(false)
    }, 900)
  }

  const pulsePick = (key: MoodKey) => {
    setJustPicked(key)
    setTimeout(() => setJustPicked(null), 500)
  }

  const handlePickMood = (key: MoodKey) => {
    setMood(key)
    pulsePick(key)
  }

  const handleSubmit = () => {
    if (!mood) return
    onSubmit(mood, text)
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

      <div className="mood-checkin-card" style={{ background: 'var(--fixed-white)', borderRadius: 28, padding: '32px 28px', width: '100%', maxWidth: 420, boxShadow: '0 24px 60px var(--glass-b-20)', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="mood-checkin-header-emoji" style={{ fontSize: 52, marginBottom: 8 }}>🌤️</div>
          <h2 style={{ fontFamily: 'Fredoka One', fontSize: 24, color: 'var(--g800)' }}>สวัสดีตอนเช้า!</h2>
          <p style={{ color: 'var(--n500)', fontSize: 14, marginTop: 4 }}>วันนี้คุณรู้สึกอย่างไร? บอกเล่าให้ต้นไม้ฟังหน่อยนะ 🌿</p>
        </div>

        {/* Journal input */}
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={text}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setText(e.target.value); setMood(null) }}
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

        {/* AI result or manual mood */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--n500)', marginBottom: 10, textAlign: 'center' }}>
            {mood ? '✨ AI วิเคราะห์ว่า — หรือเลือกเอง:' : 'เลือกอารมณ์วันนี้:'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {moods.map(m => (
              <button
                key={m.key}
                onClick={() => handlePickMood(m.key)}
                className={justPicked === m.key ? 'mood-checkin-mood-btn mood-checkin-mood-btn--picked' : 'mood-checkin-mood-btn'}
                style={{
                  flex: 1, padding: '12px 8px', border: `2.5px solid ${mood === m.key ? m.color : 'var(--n100)'}`,
                  borderRadius: 16, background: mood === m.key ? m.bg : 'var(--white)',
                  cursor: 'pointer', transition: 'border-color .18s, background .18s, transform .18s ease',
                  transform: mood === m.key ? 'scale(1.06)' : 'scale(1)',
                  boxShadow: mood === m.key ? `0 4px 16px ${m.color}44` : 'none',
                }}>
                <div className="mood-checkin-mood-emoji" style={{ fontSize: 28 }}>{m.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: mood === m.key ? m.color : 'var(--n500)', marginTop: 4 }}>{m.label}</div>
              </button>
            ))}
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
          disabled={!mood}
          className={mood ? 'mood-checkin-submit-btn mood-checkin-submit-btn--ready' : 'mood-checkin-submit-btn'}
          style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: 16,
            background: mood ? 'linear-gradient(135deg, var(--g600), var(--g500))' : 'var(--n100)',
            color: mood ? 'var(--fixed-white)' : 'var(--n300)',
            fontFamily: 'Fredoka One', fontSize: 18,
            cursor: mood ? 'pointer' : 'default',
            boxShadow: mood ? 'var(--sh-btn)' : 'none',
            transition: 'transform .15s, box-shadow .15s',
          }}>
          🌱 รดน้ำต้นไม้วันนี้!
        </button>

        <button onClick={onSkip} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--n300)', fontSize: 13, cursor: 'pointer', padding: '6px' }}>
          ข้ามสำหรับวันนี้
        </button>
      </div>

      <style>{`
        @keyframes moodCheckinCardPop {
          from { opacity: 0; transform: scale(.9) translateY(14px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mood-checkin-card { animation: moodCheckinCardPop .35s cubic-bezier(.22,1,.36,1) both; }

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