import { useEffect, useRef, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import '../games.css'

/*  เควส Brain Dump — Voice Edition (เทกระเป๋าความจำผ่านเสียง)
    ทฤษฎี: Testing Effect (Roediger & Karpicke, 2006) + Production Effect (MacLeod, 2010)
    ─────────────────────────────────────────────────────────────
    การ "ดึง" ข้อมูลออกจากสมองจำได้ลึกกว่าอ่านซ้ำ และการพูดออกมาดังๆ สร้างร่องรอย
    ความจำได้ดีกว่าอ่านในใจ เกมนี้ทำตามนั้นจริง 3 ขั้น:
      1. ผู้ใช้พิมพ์ "หัวข้อที่ต้องจำให้ได้" ก่อน (คู่มือตรวจคำตอบ)
      2. กดไมค์แล้วพูดอธิบายโดยห้ามเปิดดูเนื้อหา — ถอดเสียงสดด้วย Web Speech API
      3. ระบบเทียบว่าพูดครบทุกหัวข้อไหม → บอกจุดที่ "ลืม" ให้กลับไปทบทวน

    หมายเหตุ: Web Speech API รองรับดีบน Chrome/Edge — ถ้าเบราว์เซอร์ไม่รองรับ
    จะสลับเป็นโหมดพิมพ์แทนอัตโนมัติ ไม่ทำให้เควสเล่นไม่ได้                        */

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
}

function createRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = 'th-TH'
  rec.continuous = true
  rec.interimResults = true
  return rec
}

const MIN_WORDS = 25

export default function BrainDumpGame({ finish }: QuestGameProps) {
  const { logActivity } = useAppContext()
  const [step, setStep] = useState<'topics' | 'record' | 'review'>('topics')
  const [topicsRaw, setTopicsRaw] = useState('')
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [supported, setSupported] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [recording])

  useEffect(() => () => { recRef.current?.stop() }, [])

  const topics = topicsRaw.split('\n').map((t) => t.trim()).filter(Boolean)
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0
  const spokenLower = transcript.toLowerCase()
  const missed = topics.filter((t) => !spokenLower.includes(t.toLowerCase()))
  const recalled = topics.length - missed.length

  const startRecording = () => {
    const rec = createRecognition()
    if (!rec) {
      setSupported(false)
      setStep('record')
      return
    }
    recRef.current = rec
    rec.onresult = (e) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += `${e.results[i][0].transcript} `
      setTranscript(text.trim())
    }
    rec.onend = () => setRecording(false)
    rec.start()
    setRecording(true)
  }

  const stopRecording = () => {
    recRef.current?.stop()
    setRecording(false)
    setStep('review')
  }

  const handleFinish = () => {
    logActivity({
      activityType: 'BRAIN_DUMP',
      durationSeconds: elapsed,
      meta: { topicCount: topics.length, recalled, missed, wordCount },
    })
    finish({ topics, transcript, recalled, missedCount: missed.length })
  }

  return (
    <div className="qg">
      {step === 'topics' && (
        <>
          <div className="qg-card">
            <label className="qg-label" htmlFor="bd-topics">หัวข้อที่เพิ่งเรียนจบ (บรรทัดละ 1 หัวข้อ)</label>
            <textarea
              id="bd-topics" className="qg-textarea" value={topicsRaw} onChange={(e) => setTopicsRaw(e.target.value)}
              placeholder={'สังเคราะห์แสง\nคลอโรฟิลล์\nวัฏจักรคัลวิน'}
            />
            <p className="qg-hint" style={{ marginTop: 6 }}>ใส่ไว้เป็นคู่มือตรวจ ระบบจะเช็กให้ว่าตอนพูดคุณลืมหัวข้อไหนไป</p>
          </div>
          <button className="qg-btn" disabled={topics.length === 0} onClick={() => setStep('record')}>
            ปิดหนังสือแล้ว พร้อมพูด
          </button>
        </>
      )}

      {step === 'record' && (
        <div className="qg qg-center">
          <p className="qg-hint">ห้ามเปิดดูเนื้อหานะ — พูดอธิบายออกมาดังๆ เหมือนกำลังสอนใครสักคน</p>
          <button
            className="qg-btn"
            style={{ maxWidth: 200, margin: '4px auto', height: 92, borderRadius: 99, fontSize: 34 }}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? '⏹' : '🎙️'}
          </button>
          <span className={`qg-tag${recording ? ' qg-tag--ok' : ''}`}>
            {recording ? `กำลังฟัง... ${elapsed} วิ` : 'กดไมค์เพื่อเริ่มพูด'}
          </span>

          {!supported && (
            <div className="qg-card">
              <p className="qg-hint" style={{ marginBottom: 8 }}>
                เบราว์เซอร์นี้ยังไม่รองรับการถอดเสียงอัตโนมัติ — พูดออกมาดังๆ ก่อน แล้วพิมพ์สรุปสิ่งที่พูดลงช่องนี้แทน
                (Production Effect ยังทำงานอยู่ เพราะคุณได้พูดออกเสียงจริง)
              </p>
              <textarea className="qg-textarea" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="พิมพ์สิ่งที่เพิ่งพูดออกไป..." />
            </div>
          )}

          {transcript && (
            <div className="qg-card" style={{ textAlign: 'left' }}>
              <span className="qg-label">สิ่งที่คุณพูด ({wordCount} คำ)</span>
              <p className="qg-hint" style={{ color: 'var(--glass-w-80)' }}>{transcript}</p>
            </div>
          )}

          {!recording && (
            <button className="qg-btn" disabled={wordCount < MIN_WORDS} onClick={() => setStep('review')}>
              {wordCount < MIN_WORDS ? `พูดอีกหน่อย (${wordCount}/${MIN_WORDS} คำ)` : 'ตรวจว่าลืมอะไรไปบ้าง'}
            </button>
          )}
        </div>
      )}

      {step === 'review' && (
        <>
          <div className="qg-stat-grid">
            <div className="qg-stat"><strong>{recalled}</strong><span>หัวข้อที่นึกออก</span></div>
            <div className="qg-stat"><strong>{missed.length}</strong><span>หัวข้อที่ลืม</span></div>
            <div className="qg-stat"><strong>{wordCount}</strong><span>คำที่พูด</span></div>
          </div>

          {missed.length > 0 ? (
            <div className="qg-card">
              <div className="qg-title">ช่องว่างที่ต้องกลับไปอุด</div>
              <div className="qg-chips">
                {missed.map((m) => <span key={m} className="qg-chip">{m}</span>)}
              </div>
              <p className="qg-hint" style={{ marginTop: 10 }}>
                จุดที่นึกไม่ออกคือจุดที่ความจำยังไม่แน่น — เอาไปใส่เควสกลยุทธ์การรอคอยเพื่อทบทวนอีกครั้งในอีก 1-2 วัน
              </p>
            </div>
          ) : (
            <span className="qg-tag qg-tag--ok">นึกออกครบทุกหัวข้อ ความจำแน่นมาก</span>
          )}

          <button className="qg-btn" onClick={handleFinish}>บันทึกผลการทวนความจำ</button>
        </>
      )}
    </div>
  )
}