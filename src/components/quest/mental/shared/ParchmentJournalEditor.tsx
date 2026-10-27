import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypewriter } from '../../../../hooks/useTypewriter'
import { playSfx, stopSfx } from '../../../../utils/audioPlayer'

const C_1 = '#2D2013'
const C_2 = '#C7A34F'
const C_3 = '#F3E6C8'
const C_4 = '#D9C08F'
const C_5 = '#7A4A12'
const C_6 = '#4A2C0A'
const C_7 = '#4A2C0A'
const C_8 = '#FFD166'
const C_9 = '#FFF3D6'
const C_10 = '#F0C97A'

type Stage = 'ask' | 'writing' | 'reflecting' | 'done'
export type ParchmentTheme = 'mystic' | 'golden'

const THEME_COLORS: Record<ParchmentTheme, { bg: string; ink: string; gold: string; paper: string; paperEdge: string }> = {
  mystic: { bg: 'linear-gradient(160deg, var(--g800), var(--g900))', ink: C_1, gold: C_2, paper: C_3, paperEdge: C_4 },
  golden: { bg: `linear-gradient(160deg, ${C_5}, ${C_6})`, ink: C_7, gold: C_8, paper: C_9, paperEdge: C_10 },
}

interface ParchmentJournalEditorProps {
  theme: ParchmentTheme
  accent: string
  /** ข้อความ popup ถามก่อนเริ่มเขียน */
  askQuestion: string
  /** placeholder ของช่องพิมพ์ */
  placeholder: string
  /** ข้อความปุ่มส่ง เช่น "ส่งให้รากไม้อ่าน" / "เก็บไว้ในเกราะ" */
  submitLabel: string
  /** เรียก service สร้างคำสะท้อนจาก AI (mock) — ต่างกันตามเควส (getJournalReflection/getGratitudeReflection) */
  generateReflection: (originalText: string) => Promise<string>
  /** บันทึกลงประวัติจริง (AppContext.handleAddJournalEntry) */
  onSaveEntry: (originalText: string, aiReframedText: string) => void
  onComplete: () => void
  /** [เพิ่มตามที่ระบุ — ข้อ 10] ไอคอนรูปจริงของเควส (QUEST_ICONS) แทนอิโมจิ 📖/🛡️ เดิมบน
   *  popup แนะนำก่อนเข้า — ไม่ใส่ = fallback เป็นอิโมจิเดิมตาม theme */
  askIconSrc?: string
}

/**
 * ParchmentJournalEditor — [ใช้ร่วมกัน] หัวใจของทั้ง Reframer Journal และ Gratitude Shield
 * Flow: ask (popup ถามคำถาม) → writing (กระดาษ parchment สไตล์แฟนตาซี + ช่องพิมพ์ด้านล่าง
 * ที่ข้อความ sync ขึ้นบนกระดาษแบบ real-time ทุกตัวอักษร) → reflecting (AI ประมวลผล) →
 * done (โชว์คำสะท้อนจาก AI แบบพิมพ์ดีด + ปุ่มรับรางวัล)
 */
export default function ParchmentJournalEditor({
  theme, askQuestion, placeholder, submitLabel, generateReflection, onSaveEntry, onComplete, askIconSrc,
}: ParchmentJournalEditorProps) {
  const colors = THEME_COLORS[theme]
  const [stage, setStage] = useState<Stage>('ask')
  const [text, setText] = useState('')
  const [reflection, setReflection] = useState<string | null>(null)
  const { displayedText, isDone } = useTypewriter(reflection ?? '', 24, 200, () => playSfx('KEYPRESS'), () => stopSfx('KEYPRESS'))

  useEffect(() => {
    if (stage !== 'reflecting') return
    let cancelled = false
    generateReflection(text).then((result) => {
      if (!cancelled) { setReflection(result); setStage('done') }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const handleSubmit = () => {
    if (!text.trim()) return
    setStage('reflecting')
  }

  const handleClaim = () => {
    if (reflection) onSaveEntry(text, reflection)
    onComplete()
  }

  return (
    // [แก้ตามที่ระบุ] พื้นหลังแบบกระดานจัดอันดับ (--bg) แทนฉากเข้มเดิมของแต่ละธีม
    <div className="parchment-editor">
      <AnimatePresence mode="wait">
        {stage === 'ask' && (
          <motion.div key="ask" className="parchment-editor__ask-panel lb-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            {askIconSrc
              ? <img src={askIconSrc} alt="" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 12 }} />
              : <div style={{ fontSize: 48, marginBottom: 12 }}>{theme === 'golden' ? '🛡️' : '📖'}</div>}
            <p className="parchment-editor__ask-text">{askQuestion}</p>
            <button className="lb-btn lb-btn--wide" onClick={() => setStage('writing')}>
              เริ่มเขียน
            </button>
          </motion.div>
        )}

        {(stage === 'writing' || stage === 'reflecting') && (
          <motion.div key="writing" className="parchment-editor__writing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* [แก้ตามที่ระบุ] ตัวกระดาษคือช่องพิมพ์เลย — แตะที่กระดาษแล้วเริ่มเขียนได้ทันที
                (เอาแถบพิมพ์สีขาวด้านล่างออก) กระดาษยาวขึ้น ปุ่มบันทึกอยู่ใต้กระดาษ */}
            <div className="parchment-editor__paper" style={{ background: colors.paper, borderColor: colors.paperEdge }}>
              <div className="parchment-editor__paper-corner parchment-editor__paper-corner--tl" />
              <div className="parchment-editor__paper-corner parchment-editor__paper-corner--br" />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                disabled={stage === 'reflecting'}
                autoFocus
                className="parchment-editor__paper-input"
                style={{ color: colors.ink, caretColor: colors.ink }}
                aria-label={placeholder}
              />
            </div>

            <button
              className="lb-btn parchment-editor__save"
              onClick={handleSubmit}
              disabled={!text.trim() || stage === 'reflecting'}
            >
              {stage === 'reflecting' ? 'กำลังอ่าน...' : submitLabel}
            </button>
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" className="parchment-editor__reflection lb-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="parchment-editor__reflection-title">เสียงสะท้อนกลับมา</div>
            <p className="parchment-editor__reflection-text">
              {displayedText}
              {!isDone && <span className="parchment-editor__reflection-caret">▍</span>}
            </p>
            {isDone && (
              <button className="lb-btn lb-btn--wide" style={{ marginTop: 16 }} onClick={handleClaim}>
                รับพลัง
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .parchment-editor {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          padding: 72px 20px calc(var(--gpf-safe-bottom, 90px) + 20px); overflow-y: auto;
          background: var(--bg); font-family: var(--font-display);
        }

        .parchment-editor__ask-panel {
  border-radius: 26px;
  padding: 32px 26px;
  max-width: 380px;
  width: 100%;
  text-align: center;
  box-shadow: 0 24px 60px var(--glass-b-40);
}
        .parchment-editor__ask-text {
  font-size: 20px;
  color: var(--lb-card-text);
  line-height: 1.7;
  margin-bottom: 20px;
}

        .parchment-editor__btn {
  padding: 13px 24px;
  border: none;
  border-radius: 99px;
  --lc-text-5: var(--fixed-black);
  color: var(--lc-text-5);
  font-family: 'Fredoka One';
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  box-shadow: 0 8px 20px var(--glass-b-30);
  transition: transform .15s ease;
}
        .parchment-editor__btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.02); }
        .parchment-editor__btn:active:not(:disabled) { transform: scale(.98); }
        .parchment-editor__btn:disabled { opacity: .55; cursor: default; }

        .parchment-editor__writing { width: 100%; max-width: 760px; display: flex; flex-direction: column; gap: 16px; align-items: center; }

        .parchment-editor__paper {
  position: relative;
  width: 100%;
  /* [แก้ตามที่ระบุ] กระดาษยาวขึ้น */
  min-height: min(62vh, 560px);
  display: flex;
  border-radius: 8px;
  border: 3px solid;
  --lc-shadow-4: rgba(120,90,40,.15);
  box-shadow: 0 20px 50px var(--glass-b-40), inset 0 0 40px var(--lc-shadow-4);
  padding: 28px 30px;
}
        .parchment-editor__paper-corner {
  position: absolute;
  width: 26px;
  height: 26px;
  --lc-border-3: rgba(120,90,40,.3);
  border: 2px solid var(--lc-border-3);
}
        .parchment-editor__paper-corner--tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
        .parchment-editor__paper-corner--br { bottom: 8px; right: 8px; border-left: none; border-top: none; }
        .parchment-editor__paper-input {
          flex: 1; width: 100%; min-height: 100%; resize: none; border: none; outline: none; background: transparent;
          font-family: 'Georgia', var(--font-display), serif; font-size: 18px; line-height: 1.9;
        }
        .parchment-editor__paper-input::placeholder { color: inherit; opacity: .38; }
        .parchment-editor__paper-input:disabled { opacity: .7; }
        .parchment-editor__save { min-width: min(320px, 100%); font-size: var(--fs-lg); }
        @keyframes parchmentCursorBlink { 50% { opacity: 0; } }

        .parchment-editor__reflection {
          max-width: 480px; width: 100%; border-radius: 24px; padding: 26px;
        }
        .parchment-editor__reflection-title { font-size: 15px; margin-bottom: 14px; color: var(--lb-card-text-sub); }
        .parchment-editor__reflection-text {
  color: var(--lb-card-text);
  font-size: 18px;
  line-height: 1.9;
  min-height: 60px;
}
        .parchment-editor__reflection-caret { animation: parchmentCursorBlink .8s step-end infinite; }

        @media (prefers-reduced-motion: reduce) {
          .parchment-editor__reflection-caret { animation: none; }
        }
      `}</style>
    </div>
  )
}