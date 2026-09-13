import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypewriter } from '../../../../hooks/useTypewriter'
import { playSfx } from '../../../../utils/audioPlayer'

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
}

/**
 * ParchmentJournalEditor — [ใช้ร่วมกัน] หัวใจของทั้ง Reframer Journal และ Gratitude Shield
 * Flow: ask (popup ถามคำถาม) → writing (กระดาษ parchment สไตล์แฟนตาซี + ช่องพิมพ์ด้านล่าง
 * ที่ข้อความ sync ขึ้นบนกระดาษแบบ real-time ทุกตัวอักษร) → reflecting (AI ประมวลผล) →
 * done (โชว์คำสะท้อนจาก AI แบบพิมพ์ดีด + ปุ่มรับรางวัล)
 */
export default function ParchmentJournalEditor({
  theme, accent, askQuestion, placeholder, submitLabel, generateReflection, onSaveEntry, onComplete,
}: ParchmentJournalEditorProps) {
  const colors = THEME_COLORS[theme]
  const [stage, setStage] = useState<Stage>('ask')
  const [text, setText] = useState('')
  const [reflection, setReflection] = useState<string | null>(null)
  const { displayedText, isDone } = useTypewriter(reflection ?? '', 24, 200, () => playSfx('KEYPRESS'))

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
    <div className="parchment-editor" style={{ background: colors.bg }}>
      <AnimatePresence mode="wait">
        {stage === 'ask' && (
          <motion.div key="ask" className="parchment-editor__ask-panel" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{theme === 'golden' ? '🛡️' : '📖'}</div>
            <p className="parchment-editor__ask-text">{askQuestion}</p>
            <button className="parchment-editor__btn" style={{ background: `linear-gradient(135deg, ${colors.gold}, ${accent})` }} onClick={() => setStage('writing')}>
              🖋️ เริ่มเขียน
            </button>
          </motion.div>
        )}

        {(stage === 'writing' || stage === 'reflecting') && (
          <motion.div key="writing" className="parchment-editor__writing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* [ตามที่ขอ] กระดาษ parchment สไตล์แฟนตาซี/ราชวัง — ข้อความ sync แบบ real-time */}
            <div className="parchment-editor__paper" style={{ background: colors.paper, borderColor: colors.paperEdge }}>
              <div className="parchment-editor__paper-corner parchment-editor__paper-corner--tl" />
              <div className="parchment-editor__paper-corner parchment-editor__paper-corner--br" />
              <p className="parchment-editor__paper-text" style={{ color: colors.ink }}>
                {text || <span style={{ opacity: 0.35 }}>{placeholder}</span>}
                <span className="parchment-editor__paper-cursor" style={{ background: colors.ink }} />
              </p>
            </div>

            <div className="parchment-editor__input-bar">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                rows={2}
                disabled={stage === 'reflecting'}
                className="parchment-editor__textarea"
              />
              <button
                className="parchment-editor__btn"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.gold}, ${accent})`,
                  width: 'auto',        /* ยกเลิกการขยายเต็มกว้าง */
                  padding: '16px 16px',  /* ลดขนาดขอบบนล่างซ้ายขวาให้เล็กลง */
                  whiteSpace: 'nowrap', /* ป้องกันข้อความตกบรรทัด */
                  flexShrink: 0         /* ไม่ให้ปุ่มโดนบีบจนเสียทรง */
                }}
                onClick={handleSubmit}
                disabled={!text.trim() || stage === 'reflecting'}
              >
                {stage === 'reflecting' ? '✨ กำลังอ่าน...' : submitLabel}
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" className="parchment-editor__reflection" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="parchment-editor__reflection-title" style={{ color: colors.gold }}>✨ เสียงสะท้อนกลับมา</div>
            <p className="parchment-editor__reflection-text">
              {displayedText}
              {!isDone && <span className="parchment-editor__reflection-caret">▍</span>}
            </p>
            {isDone && (
              <button className="parchment-editor__btn" style={{ background: `linear-gradient(135deg, ${colors.gold}, ${accent})`, marginTop: 16 }} onClick={handleClaim}>
                🌟 รับพลัง
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .parchment-editor { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; overflow-y: auto; }

        .parchment-editor__ask-panel {
  --lc-bg-7: rgba(255,255,255,.97);
  background: var(--lc-bg-7);
  border-radius: 26px;
  padding: 32px 26px;
  max-width: 380px;
  width: 100%;
  text-align: center;
  box-shadow: 0 24px 60px var(--glass-b-40);
}
        .parchment-editor__ask-text {
  font-size: 20px;
  --lc-text-6: #4A3520;
  color: var(--lc-text-6);
  line-height: 1.7;
  margin-bottom: 20px;
}

        .parchment-editor__btn {
  padding: 13px 24px;
  border: none;
  border-radius: 99px;
  --lc-text-5: #3A2400;
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

        .parchment-editor__writing { width: 100%; max-width: 650px; display: flex; flex-direction: column; gap: 16px; align-items: center; }

        .parchment-editor__paper {
  position: relative;
  width: 100%;
  min-height: 220px;
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
        .parchment-editor__paper-text {
          font-family: 'Georgia', serif; font-size: 18px; line-height: 1.9; white-space: pre-wrap; word-break: break-word;
        }
        .parchment-editor__paper-cursor {
          display: inline-block; width: 2px; height: 16px; margin-left: 2px; vertical-align: middle;
          animation: parchmentCursorBlink .9s step-end infinite;
        }
        @keyframes parchmentCursorBlink { 50% { opacity: 0; } }

        .parchment-editor__input-bar { width: 100%; display: flex; gap: 8px; align-items: flex-end; }
        .parchment-editor__textarea {
  flex: 1;
  padding: 10px 16px;
  border-radius: 16px;
  border: none;
  resize: none;
  outline: none;
  font-family: Nunito;
  font-size: 16px;
  background: var(--glass-w-95);
  --lc-text-2: #2D2013;
  color: var(--lc-text-2);
}
        .parchment-editor__textarea:disabled { opacity: .6; }

        .parchment-editor__reflection {
          max-width: 480px; width: 100%; background: var(--glass-w-10); border: 1px solid var(--glass-w-25);
          border-radius: 24px; padding: 26px; backdrop-filter: blur(8px);
        }
        .parchment-editor__reflection-title { font-family: 'Fredoka One'; font-size: 15px; margin-bottom: 14px; }
        .parchment-editor__reflection-text {
  --lc-text-1: #F5EFE9;
  color: var(--lc-text-1);
  font-size: 18px;
  line-height: 1.9;
  min-height: 60px;
}
        .parchment-editor__reflection-caret { animation: parchmentCursorBlink .8s step-end infinite; }

        @media (prefers-reduced-motion: reduce) {
          .parchment-editor__paper-cursor, .parchment-editor__reflection-caret { animation: none; }
        }
      `}</style>
    </div>
  )
}