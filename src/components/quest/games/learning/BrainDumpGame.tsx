import { useEffect, useMemo, useRef, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { saveBrainDumpSession } from '../../../../services/api/brainDump.api'
import '../games.css'

/*  เควส Brain Dump — Voice Edition (เทกระเป๋าความจำผ่านเสียง)
    ทฤษฎี: Testing Effect (Roediger & Karpicke, 2006) + Production Effect (MacLeod, 2010)
    ─────────────────────────────────────────────────────────────
    การ "ดึง" ข้อมูลออกจากสมองจำได้ลึกกว่าอ่านซ้ำ และการพูดออกมาดังๆ สร้างร่องรอยความจำได้ดีกว่า
    อ่านในใจ เกมนี้ทำ 3 ขั้น:
      1. พิมพ์ "หัวข้อที่ต้องจำให้ได้" ก่อน (คู่มือตรวจคำตอบ)
      2. กดไมค์แล้วพูดอธิบายโดยห้ามเปิดดูเนื้อหา — อัดเสียงจริง (MediaRecorder) + ถอดเสียงสด (Web Speech API)
      3. [แก้ตามที่ระบุ] บันทึกเสร็จแสดง "สิ่งที่คุณพูด" ทั้งหมด + เปิดฟังเสียงตัวเองย้อนได้ + หัวข้อที่นึกออก/ลืม
         บันทึกลงประวัติ (ดูได้ที่หน้าโปรไฟล์) — ส่งขึ้น backend ตาราง brain_dump_sessions (ดู brainDump.api.ts)
    เชื่อมเควสเสริม: หัวข้อที่ลืมจะไปรอในเควสเสริม "แคปซูลเวลา" ให้นัดวันกลับมาทบทวน (ContentReviewGame)

    เบราว์เซอร์ที่ไม่รองรับการถอดเสียง (นอก Chrome/Edge) → พูดแล้วพิมพ์สรุปแทน เควสยังเล่นได้          */

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

/** นับคำแบบรองรับภาษาไทย (ไม่มีช่องว่างคั่นคำ) — ใช้ตัวตัดคำของเบราว์เซอร์ ไม่มีก็นับตามช่องว่าง */
function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: 'word' }) => { segment: (t: string) => Iterable<{ isWordLike?: boolean }> } }).Segmenter
  if (Seg) {
    let n = 0
    for (const part of new Seg('th', { granularity: 'word' }).segment(trimmed)) if (part.isWordLike) n++
    return n
  }
  return trimmed.split(/\s+/).length
}

const MIN_WORDS = 25

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m} นาที ${s} วิ` : `${s} วินาที`
}

export default function BrainDumpGame({ finish }: QuestGameProps) {
  const { logActivity } = useAppContext()
  const [step, setStep] = useState<'topics' | 'record' | 'review'>('topics')
  const [topicsRaw, setTopicsRaw] = useState('')
  const [transcript, setTranscript] = useState('')
  const [recording, setRecording] = useState(false)
  const [supported, setSupported] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [recording])

  useEffect(() => () => {
    recRef.current?.stop()
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const audioUrl = useMemo(() => (audioBlob ? URL.createObjectURL(audioBlob) : null), [audioBlob])
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  const topics = topicsRaw.split('\n').map((t) => t.trim()).filter(Boolean)
  const wordCount = countWords(transcript)
  const spokenLower = transcript.toLowerCase()
  const missed = topics.filter((t) => !spokenLower.includes(t.toLowerCase()))
  const recalledTopics = topics.filter((t) => spokenLower.includes(t.toLowerCase()))

  /** อัดเสียงจริงไว้ฟังย้อน/ส่งขึ้น backend — ขอไมค์ไม่ได้ก็ยังถอดเสียง/พิมพ์ต่อได้ตามปกติ */
  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        if (chunksRef.current.length) setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRef.current = recorder
    } catch { /* ไม่มีไมค์/ไม่อนุญาต — ข้ามการอัดเสียง */ }
  }

  const startRecording = () => {
    void startAudioCapture()
    const rec = createRecognition()
    if (!rec) {
      setSupported(false)
      setRecording(true)
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
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    setRecording(false)
  }

  const handleFinish = async () => {
    if (saving) return
    setSaving(true)
    logActivity({
      activityType: 'BRAIN_DUMP',
      durationSeconds: elapsed,
      meta: { topicCount: topics.length, recalled: recalledTopics.length, missed, wordCount },
    })
    // บันทึกลงประวัติ (หน้าโปรไฟล์) — บันทึกไม่สำเร็จไม่ทำให้เควสล้ม
    await saveBrainDumpSession({
      topics, transcript, durationSec: Math.max(1, elapsed), recalledTopics, missedTopics: missed, audio: audioBlob,
    }).catch(() => null)
    finish({ topics, transcript, recalled: recalledTopics.length, missedCount: missed.length, missedTopics: missed, durationSec: elapsed })
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
            aria-label={recording ? 'หยุดอัดเสียง' : 'เริ่มพูด'}
          >
            {recording ? '⏹' : '🎙️'}
          </button>
          <span className={`qg-tag${recording ? ' qg-tag--ok' : ''}`}>
            {recording ? `กำลังฟัง... ${formatDuration(elapsed)}` : elapsed > 0 ? `อัดไว้แล้ว ${formatDuration(elapsed)} — กดไมค์เพื่อพูดต่อ` : 'กดไมค์เพื่อเริ่มพูด'}
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
              <p className="qg-hint">{transcript}</p>
            </div>
          )}

          {!recording && (
            <button className="qg-btn" disabled={wordCount < MIN_WORDS} onClick={() => setStep('review')}>
              {wordCount < MIN_WORDS ? `พูดอีกหน่อย (${wordCount}/${MIN_WORDS} คำ)` : 'บันทึกเสร็จ — ดูสิ่งที่พูด'}
            </button>
          )}
        </div>
      )}

      {step === 'review' && (
        <>
          <div className="qg-stat-grid">
            <div className="qg-stat"><strong>{recalledTopics.length}/{topics.length}</strong><span>หัวข้อที่นึกออก</span></div>
            <div className="qg-stat"><strong>{wordCount}</strong><span>คำที่พูด</span></div>
            <div className="qg-stat"><strong>{formatDuration(elapsed)}</strong><span>เวลาที่พูด</span></div>
          </div>

          {/* [แก้ตามที่ระบุ] บันทึกเสร็จแสดงสิ่งที่พูดทั้งหมด + เปิดฟังเสียงตัวเองย้อนได้ */}
          <div className="qg-card" style={{ textAlign: 'left' }}>
            <div className="qg-title">สิ่งที่คุณพูด</div>
            <p className="qg-hint" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{transcript}</p>
            {audioUrl && <audio src={audioUrl} controls style={{ width: '100%', marginTop: 10 }} />}
            {recalledTopics.length > 0 && (
              <>
                <div className="qg-label" style={{ marginTop: 12 }}>หัวข้อที่พูดถึงแล้ว</div>
                <div className="qg-chips">{recalledTopics.map((m) => <span key={m} className="qg-chip is-active">{m}</span>)}</div>
              </>
            )}
          </div>

          {missed.length > 0 ? (
            <div className="qg-card">
              <div className="qg-title">ช่องว่างที่ต้องกลับไปอุด</div>
              <div className="qg-chips">
                {missed.map((m) => <span key={m} className="qg-chip">{m}</span>)}
              </div>
              <p className="qg-hint" style={{ marginTop: 10 }}>
                หัวข้อที่นึกไม่ออกจะไปรอในเควสเสริม "แคปซูลเวลา" — นัดวันกลับมาทบทวนในอีก 1-2 วันเพื่อให้จำแน่นขึ้น
              </p>
            </div>
          ) : (
            <span className="qg-tag qg-tag--ok">นึกออกครบทุกหัวข้อ ความจำแน่นมาก</span>
          )}

          <p className="qg-hint" style={{ textAlign: 'center' }}>ดูบันทึกเสียงย้อนหลังได้ที่หน้าโปรไฟล์ → ประวัติการเขียนบันทึก</p>
          <button className="qg-btn" disabled={saving} onClick={() => { void handleFinish() }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกผลการทวนความจำ'}
          </button>
        </>
      )}
    </div>
  )
}
