import { useState, type ChangeEvent } from 'react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import type { MoodCategory, MoodTypeValue } from '../../types'
import { MOOD_TYPE_INFO, MOOD_CATEGORY_SUBTYPES, LEGACY_KEY_TO_CATEGORY } from '../../config/moodTypes'
import { BADGE_ICONS } from '../../config/iconAssets'
import FadeInText from '../welcome/FadeInText'
import { useLanguage } from '../../context/LanguageContext'
import '../leaderboard/leaderboardRow.css'

const C_1 = '#D8F3DC'
const C_2 = '#FBF4EC'
const C_3 = '#FFEDF2'
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

/**
 * MoodCheckIn — ป็อบอัพเช็คอินอารมณ์รายวัน
 * ────────────────────────────────────────────────────────────────────────────
 * [ปรับหน้าตารอบนี้ตามที่ระบุ]
 *  - กรอบแบบกระดานจัดอันดับ: ขอบทอง + ป้ายม้วนกระดาษ "เช็คอินอารมณ์รายวัน" (.lb-banner)
 *    ธีมสว่าง = เขียวอ่อน ตัวหนังสือดำ / ธีมมืด = เขียวเข้ม (อ่อนกว่าแถบเมนูล่าง) ตัวหนังสือขาว
 *  - ฟอนต์เดียวกับหน้า Welcome (--font-display) ข้อความค่อยๆ ขึ้นมาแบบรายละเอียดหน้า Welcome
 *  - เลื่อนขึ้นลงได้แต่ไม่โชว์แถบเลื่อน + เว้นล่างพ้นแถบเมนูล่าง (--gpf-safe-bottom)
 *  - ปุ่มกากบาทมุมขวาบน (= ข้ามสำหรับวันนี้)
 *  - AI วิเคราะห์แล้วเด้งผล (อารมณ์ + โพสอิท) ทับการ์ด มีกากบาทปิด และกดรดน้ำต้นไม้ได้เลย
 */
export default function MoodCheckIn({ onSubmit = () => {}, onSkip = () => {} }: MoodCheckInProps) {
  useLockBodyScroll()
  useEscapeKey(onSkip)
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const [mood, setMood] = useState<MoodKey | null>(null)
  /** [เพิ่มตามที่ระบุ — ขยาย MoodType ให้ครบ 8 อารมณ์] อารมณ์ย่อยจริงที่จะส่งเป็น
   *  MoodEntryData.mood — ตั้งค่าเริ่มต้นอัตโนมัติเป็นตัวแรกของ bucket ที่เลือกทุกครั้ง
   *  (ดู handlePickMood/handleAnalyze) ผู้ใช้กดเปลี่ยนเป็นตัวอื่นในกลุ่มเดียวกันได้ */
  const [subMood, setSubMood] = useState<MoodTypeValue | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  /** ผล AI ที่เด้งทับการ์ดอยู่ (null = ไม่ได้เปิด) */
  const [aiResult, setAiResult] = useState<MoodTypeValue | null>(null)
  const [justPicked, setJustPicked] = useState<MoodTypeValue | null>(null)
  /** [เพิ่มรอบนี้ — บั๊กเจอเควสประตูอารมณ์ซ้ำบนจอเล็ก] โชว์สถานะ "กำลังบันทึก" ระหว่างรอ
   *  onSubmit (ตอนนี้ await จริงจนกว่า moodEntries จะถูกบันทึกเสร็จ) กันผู้ใช้กดซ้ำระหว่างรอ */
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAnalyze = () => {
    if (!text.trim()) return
    setAnalyzing(true)
    setTimeout(() => {
      const pos = ['ดี', 'สุข', 'สนุก', 'ยินดี', 'ภูมิใจ', 'ดีใจ']
      const neg = ['เครียด', 'เศร้า', 'เหนื่อย', 'กังวล', 'ท้อ', 'ไม่ดี', 'แย่']
      const lc = text.toLowerCase()
      const category: MoodCategory = neg.some(w => lc.includes(w)) ? 'NEGATIVE' : pos.some(w => lc.includes(w)) ? 'POSITIVE' : 'NEUTRAL'
      // ให้ AI เดาแค่ bucket ใหญ่ (บวก/กลาง/ลบ) — ตั้ง subMood เป็นตัวแรกของกลุ่มนั้น แล้วเด้งผลทับการ์ด
      const detected = MOOD_CATEGORY_SUBTYPES[category][0]
      pickMood(detected)
      setAiResult(detected)
      setAnalyzing(false)
    }, 900)
  }

  const pulsePick = (value: MoodTypeValue) => {
    setJustPicked(value)
    setTimeout(() => setJustPicked(null), 500)
  }

  /** ผู้ใช้เลือกอารมณ์ย่อย (1 ใน 8) ตรงๆ จากกริด — bucket (MoodKey เดิม) derive กลับจากอารมณ์ย่อย
   *  เพื่อให้ onSubmit เดิม (ที่ยังรับ MoodKey อยู่) ทำงานต่อได้ */
  const pickMood = (value: MoodTypeValue) => {
    const category = categoryOfMood(value)
    setMood(CATEGORY_TO_LEGACY_KEY[category])
    setSubMood(value)
    pulsePick(value)
  }

  const handleSubmit = async () => {
    if (!mood || !subMood || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(mood, subMood, text)
    } finally {
      // กรณีสำเร็จ modal ปิดไปแล้ว (ผู้เรียกปิดเองหลัง await — ดู MentalContext.tsx) setState ไม่มีผล
      // ส่วนกรณี error ยังอยู่ต้องปลดล็อกปุ่มคืนให้กดใหม่ได้จริง
      setIsSubmitting(false)
    }
  }

  const waterButton = (
    <button
      onClick={handleSubmit}
      disabled={!mood || isSubmitting}
      className={mood ? 'mood-checkin-submit-btn mood-checkin-submit-btn--ready' : 'mood-checkin-submit-btn'}
    >
      <img src={BADGE_ICONS.water} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
      {isSubmitting ? t('checkin.saving') : t('checkin.water')}
    </button>
  )

  const resultInfo = aiResult ? MOOD_TYPE_INFO[aiResult] : null
  const resultStyle = aiResult ? CATEGORY_STYLE[categoryOfMood(aiResult)] : null

  return (
    <div className="mood-checkin-backdrop">
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

      {/* กรอบนอก (ขอบทอง + ป้าย) — ส่วนเนื้อหาข้างในเลื่อนได้เอง ป้าย/กากบาทจึงอยู่นิ่งไม่เลื่อนตาม */}
      <div className="mood-checkin-frame" role="dialog" aria-label={t('checkin.banner')}>
        <div className="lb-banner mood-checkin-banner">{t('checkin.banner')}</div>
        <button type="button" className="mood-checkin-close" onClick={onSkip} disabled={isSubmitting} title={t('common.close')} aria-label={t('common.close')}>
          <img src={BADGE_ICONS.close} className="icon-img" alt="" />
        </button>

        <div className="mood-checkin-card">
          {/* Header — โลโก้เช็คอินใหญ่ขึ้น + หัวข้อฟอนต์หน้า Welcome + ข้อความค่อยๆ ขึ้นมา */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <img src={BADGE_ICONS.checkin} alt="" className="mood-checkin-header-emoji" style={{ width: 92, height: 92, objectFit: 'contain', marginBottom: 6 }} />
            <FadeInText as="h2" className="mood-checkin-title">{t('checkin.greeting')}</FadeInText>
            <FadeInText as="p" delayMs={250} className="mood-checkin-subtitle">
              {t('checkin.question')}
            </FadeInText>
          </div>

          {/* Journal input */}
          <div style={{ marginBottom: 16 }}>
            <FadeInText as="p" delayMs={650} className="mood-checkin-hint">
              {t('checkin.hint')}
            </FadeInText>
            <textarea
              value={text}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setText(e.target.value); setMood(null); setSubMood(null); setAiResult(null) }}
              placeholder={t('checkin.placeholder')}
              rows={4}
              className="mood-checkin-textarea"
            />
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || analyzing}
              className={text.trim() ? 'mood-checkin-analyze-btn mood-checkin-analyze-btn--ready' : 'mood-checkin-analyze-btn'}
            >
              {analyzing ? (
                <>
                  🤖 {t('checkin.analyzing')}
                  <span className="mood-checkin-thinking-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                </>
              ) : `🤖 ${t('checkin.analyze')}`}
            </button>
          </div>

          {/* เลือกอารมณ์เอง (หรือแก้ผลที่ AI เดา) — กริด 8 อารมณ์ 4x2 */}
          <div style={{ marginBottom: 20 }}>
            <div className="mood-checkin-label">
              {mood ? t('checkin.aiOrPick') : t('checkin.pick')}
            </div>
            <div className="mood-checkin-mood-grid">
              {ALL_MOOD_VALUES.map((value) => {
                const info = MOOD_TYPE_INFO[value]
                const style = CATEGORY_STYLE[categoryOfMood(value)]
                const active = subMood === value
                return (
                  <button
                    key={value}
                    onClick={() => pickMood(value)}
                    title={t(`mood.${value}`)}
                    className={justPicked === value ? 'mood-checkin-mood-btn mood-checkin-mood-btn--picked' : 'mood-checkin-mood-btn'}
                    style={active ? {
                      borderColor: style.color, background: style.bg, color: style.color,
                      transform: 'scale(1.06)', boxShadow: `0 4px 16px ${style.color}44`,
                    } : undefined}
                  >
                    <div className="mood-checkin-mood-emoji" style={{ fontSize: 24 }}>{info.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{t(`mood.${value}`)}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Post-it preview */}
          {text.trim() && mood && (
            <div className="mood-checkin-postit">
              <div className="mood-checkin-postit__tag">{t('checkin.postitTag')}</div>
              <p>{text.slice(0, 100)}{text.length > 100 ? '...' : ''}</p>
            </div>
          )}

          {waterButton}

          <button onClick={onSkip} disabled={isSubmitting} className="mood-checkin-skip">
            {t('checkin.skip')}
          </button>
        </div>

        {/* ผล AI เด้งทับการ์ด — อารมณ์ที่วิเคราะห์ได้ + โพสอิท + กากบาทปิด + รดน้ำได้เลย */}
        {aiResult && resultInfo && resultStyle && (
          <div className="mood-checkin-result-layer" onClick={() => setAiResult(null)}>
            <div className="mood-checkin-result" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="mood-checkin-close" onClick={() => setAiResult(null)} title={t('common.close')} aria-label={t('common.close')}>
                <img src={BADGE_ICONS.close} className="icon-img" alt="" />
              </button>
              <FadeInText as="p" className="mood-checkin-label" style={{ marginTop: 6 }}>{t('checkin.aiResult')}</FadeInText>
              <FadeInText delayMs={150} className="mood-checkin-result__mood" style={{ borderColor: resultStyle.color, background: resultStyle.bg, color: resultStyle.color }}>
                <span style={{ fontSize: 40 }}>{resultInfo.emoji}</span>
                <span>{t(`mood.${aiResult}`)}</span>
              </FadeInText>
              <FadeInText delayMs={350} className="mood-checkin-postit">
                <div className="mood-checkin-postit__tag">{t('checkin.postitTag')}</div>
                <p>{text.slice(0, 160)}{text.length > 160 ? '...' : ''}</p>
              </FadeInText>
              <p className="mood-checkin-result__note">{t('checkin.notRight')}</p>
              {waterButton}
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ── โทนสีตามธีม: สว่าง = เขียวอ่อน/ตัวหนังสือดำ, มืด = เขียวเข้ม (อ่อนกว่าแถบเมนูล่าง)/ขาว ── */
        .mood-checkin-backdrop {
          --mc-bg: var(--leaf-soft);
          --mc-bg-2: var(--leaf-soft-strong);
          --mc-text: var(--n900);
          --mc-surface: var(--fixed-white);
          --mc-edge: color-mix(in srgb, var(--coin) 70%, var(--g600));
          position: fixed; inset: 0; z-index: 1000;
          background: var(--glass-b-45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          /* เว้นล่างพ้นแถบเมนูล่าง (ActionMenuBar) ปุ่มล่างสุดจะไม่โดนบัง */
          padding: 26px 16px calc(var(--gpf-safe-bottom, 90px) + 8px);
          overflow: hidden;
          font-family: var(--font-display);
          animation: moodCheckinBackdropFade .25s ease both;
        }
        [data-theme="dark"] .mood-checkin-backdrop {
          --mc-bg: var(--g800);
          --mc-bg-2: var(--g900);
          --mc-text: var(--fixed-white);
          --mc-surface: var(--g900);
        }

        .mood-checkin-frame {
          position: relative; width: 100%; max-width: 440px;
          border-radius: 26px; padding: 3px;
          background: linear-gradient(180deg, var(--mc-bg) 0%, var(--mc-bg-2) 100%);
          border: 2px solid var(--mc-edge);
          box-shadow: 0 24px 60px var(--glass-b-30), inset 0 0 0 3px var(--mc-bg), inset 0 0 0 4px color-mix(in srgb, var(--coin) 30%, transparent);
          color: var(--mc-text);
          animation: moodCheckinCardPop .35s cubic-bezier(.22,1,.36,1) both;
        }
        .mood-checkin-banner {
          position: absolute; top: -15px; left: 50%; transform: translateX(-50%); z-index: 3;
          font-size: 14px;
        }
        .mood-checkin-close {
          position: absolute; top: 12px; right: 12px; z-index: 3;
          width: 36px; height: 36px; border-radius: 99px; border: none; cursor: pointer;
          background: color-mix(in srgb, var(--mc-surface) 70%, transparent);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px var(--glass-b-20);
        }
        .mood-checkin-close:hover { transform: scale(1.06); }

        /* เนื้อหาเลื่อนขึ้นลงได้ แต่ไม่แสดงแถบเลื่อน */
        .mood-checkin-card {
          padding: 34px 24px 24px;
          max-height: calc(100vh - 34px - var(--gpf-safe-bottom, 90px) - 8px);
          max-height: calc(100dvh - 34px - var(--gpf-safe-bottom, 90px) - 8px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .mood-checkin-card::-webkit-scrollbar { display: none; }
        .mood-checkin-card button, .mood-checkin-card textarea { font-family: inherit; }

        .mood-checkin-title {
          font-family: var(--font-display);
          font-size: clamp(1.6rem, 6vw, 2.1rem);
          letter-spacing: .02em; line-height: 1.15; margin: 0;
          color: var(--mc-text);
        }
        .mood-checkin-subtitle { font-size: var(--fs-lg); margin-top: 6px; line-height: 1.5; color: var(--mc-text); opacity: .9; }
        .mood-checkin-hint { font-size: var(--fs-sm); margin-bottom: 8px; line-height: 1.5; color: var(--mc-text); opacity: .8; text-align: center; }
        .mood-checkin-label { font-size: 13px; font-weight: 700; margin-bottom: 10px; text-align: center; color: var(--mc-text); opacity: .85; }

        .mood-checkin-textarea {
          width: 100%; padding: 14px 16px; border-radius: 16px; resize: none; outline: none;
          border: 2px solid color-mix(in srgb, var(--mc-edge) 55%, transparent);
          background: var(--mc-surface); color: var(--mc-text);
          font-size: 15px; line-height: 1.6;
          transition: border-color .2s, box-shadow .2s;
        }
        .mood-checkin-textarea::placeholder { color: var(--mc-text); opacity: .5; }
        .mood-checkin-textarea:focus { border-color: var(--mc-edge); box-shadow: 0 0 0 4px color-mix(in srgb, var(--coin) 25%, transparent); }

        .mood-checkin-analyze-btn {
          margin-top: 8px; width: 100%; padding: 10px; border: none; border-radius: 12px;
          background: color-mix(in srgb, var(--mc-text) 12%, transparent); color: var(--mc-text); opacity: .6;
          font-weight: 700; font-size: 13px; cursor: default;
          display: flex; align-items: center; justify-content: center; gap: 6px; transition: all .2s;
        }
        .mood-checkin-analyze-btn--ready { background: var(--g600); color: var(--fixed-white); opacity: 1; cursor: pointer; }

        .mood-checkin-mood-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-width: 340px; margin: 0 auto;
        }
        .mood-checkin-mood-btn {
          aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px;
          border: 2.5px solid color-mix(in srgb, var(--mc-text) 15%, transparent); border-radius: 16px;
          background: var(--mc-surface); color: var(--mc-text); cursor: pointer;
          transition: border-color .18s, background .18s, transform .18s ease;
        }
        .mood-checkin-mood-btn:hover .mood-checkin-mood-emoji { animation: moodCheckinWiggle .4s ease; }
        .mood-checkin-mood-btn--picked { animation: moodCheckinPickBounce .5s cubic-bezier(.34,1.56,.64,1); }

        .mood-checkin-postit {
          position: relative; margin-bottom: 16px; padding: 16px 16px 12px; border-radius: 12px;
          background: ${BG_5}; border: 1.5px solid var(--coin); color: var(--b700);
          animation: moodCheckinPostitIn .5s cubic-bezier(.22,1,.36,1) both;
        }
        .mood-checkin-postit p { font-size: 13px; line-height: 1.6; margin: 4px 0 0; }
        .mood-checkin-postit__tag {
          position: absolute; top: -9px; left: 12px; background: var(--coin); border-radius: 99px;
          padding: 2px 10px; font-size: 10px; font-weight: 700; color: var(--b700);
        }

        .mood-checkin-submit-btn {
          width: 100%; padding: 14px; border: none; border-radius: 16px;
          background: color-mix(in srgb, var(--mc-text) 12%, transparent); color: var(--mc-text); opacity: .6;
          font-family: var(--font-display); font-size: 18px; cursor: default;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform .15s, box-shadow .15s;
        }
        .mood-checkin-submit-btn--ready {
          background: linear-gradient(135deg, var(--g600), var(--g500)); color: var(--fixed-white); opacity: 1;
          cursor: pointer; box-shadow: var(--sh-btn);
          animation: moodCheckinSubmitGlow 1.8s ease-in-out infinite;
        }
        .mood-checkin-submit-btn--ready:hover { transform: translateY(-2px) scale(1.015); }
        .mood-checkin-submit-btn--ready:active { transform: translateY(1px) scale(.98); }
        .mood-checkin-submit-btn:disabled { cursor: default; }

        .mood-checkin-skip {
          width: 100%; margin-top: 10px; padding: 6px; background: none; border: none; cursor: pointer;
          color: var(--mc-text); opacity: .65; font-size: 13px;
        }

        /* ผล AI ทับการ์ด */
        .mood-checkin-result-layer {
          position: absolute; inset: 0; z-index: 4; border-radius: 24px;
          background: color-mix(in srgb, var(--mc-bg-2) 55%, transparent); backdrop-filter: blur(3px);
          display: flex; align-items: center; justify-content: center; padding: 18px;
          animation: moodCheckinBackdropFade .2s ease both;
        }
        .mood-checkin-result {
          position: relative; width: 100%; max-width: 360px; padding: 34px 20px 20px;
          border-radius: 20px; background: var(--mc-bg); border: 2px solid var(--mc-edge);
          box-shadow: 0 16px 40px var(--glass-b-30); text-align: center;
          animation: moodCheckinCardPop .3s cubic-bezier(.22,1,.36,1) both;
        }
        .mood-checkin-result__mood {
          display: inline-flex; align-items: center; gap: 10px; margin: 4px auto 18px;
          padding: 8px 18px; border-radius: 99px; border: 2.5px solid; font-size: 20px; font-weight: 700;
        }
        .mood-checkin-result .mood-checkin-postit { text-align: left; }
        .mood-checkin-result__note { font-size: 12px; opacity: .75; margin: -4px 0 12px; color: var(--mc-text); }

        @keyframes moodCheckinCardPop {
          from { opacity: 0; transform: scale(.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes moodCheckinBackdropFade { from { opacity: 0; } to { opacity: 1; } }
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
        @keyframes moodCheckinWiggle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-10deg) scale(1.1); }
          75% { transform: rotate(10deg) scale(1.1); }
        }
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
        @keyframes moodCheckinSubmitGlow {
          0%, 100% { box-shadow: var(--sh-btn); }
          50% { box-shadow: 0 6px 22px color-mix(in srgb, var(--g600) 55%, transparent); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mood-checkin-frame, .mood-checkin-backdrop, .mood-checkin-header-emoji,
          .mood-checkin-float-decor, .mood-checkin-mood-btn--picked, .mood-checkin-postit,
          .mood-checkin-submit-btn--ready, .mood-checkin-thinking-dots span,
          .mood-checkin-result-layer, .mood-checkin-result {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
