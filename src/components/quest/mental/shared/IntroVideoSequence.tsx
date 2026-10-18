import { useMemo, useRef, useState } from 'react'
import WelcomeMessageCycler from '../../../welcome/WelcomeMessageCycler'
import { posterOf } from '../../../../utils/videoPoster'

interface IntroVideoSequenceProps {
  videoSrc: string
  audioSrc: string
  overlayText: string
  accent: string
  onComplete: () => void
}

/**
 * IntroVideoSequence — [ใช้ร่วมกัน] ฉากเปิดวิดีโอ+เสียงประกอบก่อนเข้าเกมเพลย์จริง
 * ใช้ทั้งเควส Reframer Journal (Reframer-Journal.mp4/.mp3) และ Gratitude Shield
 * (Gratitude-Shield.mp4/.mp3) — โครงสร้างเหมือนกันเป๊ะ ต่างแค่ path ไฟล์+ข้อความ overlay
 *
 * [ตามที่เรียนรู้จากรอบ Girl.mp4 ก่อนหน้า] วิดีโอเล่น "เต็มความยาวคลิปจริง" เสมอ ไม่ตัดจบ
 * ด้วย timeout สั้นๆ — ฟัง onEnded ของ <video> จริงแทน — เสียงประกอบเป็นไฟล์แยกต่างหาก
 * (audio element คนละตัว) เล่นคู่กันไปพร้อมวิดีโอ (วิดีโอ mute ไว้เสมอ กันเสียงซ้อนกัน 2 ทาง)
 */
export default function IntroVideoSequence({ videoSrc, audioSrc, overlayText, accent, onComplete }: IntroVideoSequenceProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  /* [แก้ตามที่ระบุ — 3.5] ข้อความแสดงด้วยเอฟเฟกต์เดียวกับหน้า Welcome (WelcomeMessageCycler: จางเข้า
     ลอยขึ้นเล็กน้อย → ค้าง → จางออก → ประโยคถัดไป) — แบ่งประโยคที่ " — " ให้แต่ละช่วงสั้นพออ่านทันในเฟรม */
  const messages = useMemo(() => overlayText.split(/\s+—\s+/).filter(Boolean), [overlayText])

  const handleVideoPlay = () => {
    audioRef.current?.play().catch(() => {})
  }

  const handleVideoEnded = () => {
    audioRef.current?.pause()
    setIsClosing(true)
    window.setTimeout(onComplete, 400)
  }

  return (
    <div className={isClosing ? 'intro-video-seq intro-video-seq--closing' : 'intro-video-seq'}>
      <video className="intro-video-seq__video" src={videoSrc} poster={posterOf(videoSrc)} autoPlay muted playsInline onPlay={handleVideoPlay} onEnded={handleVideoEnded} />
      <audio ref={audioRef} src={audioSrc} />
      <div className="intro-video-seq__vignette" />

      <div className="intro-video-seq__overlay-text-wrap">
        <WelcomeMessageCycler
          messages={messages}
          holdMs={3600}
          style={{ fontFamily: 'Fredoka One', fontSize: 'var(--intro-text-size, 16px)', color: 'var(--fixed-white)', lineHeight: 1.7, minHeight: '6.8em', textShadow: `0 0 20px ${accent}` }}
        />
      </div>

      <style>{`
        .intro-video-seq {
          position: absolute; inset: 0; z-index: 20; overflow: hidden;
          animation: introVideoSeqFadeIn .4s ease-out both;
        }
        .intro-video-seq--closing { animation: introVideoSeqFadeOut .4s ease-in both; }
        @keyframes introVideoSeqFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes introVideoSeqFadeOut { from { opacity: 1; } to { opacity: 0; } }

        .intro-video-seq__video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; }
        .intro-video-seq__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  --lc-bg-1: rgba(0,0,0,.7);
  background: linear-gradient(180deg, var(--glass-b-55) 0%, transparent 30%, transparent 65%, var(--lc-bg-1) 100%);
}
        /* [แก้ตามที่ระบุ — ข้อ 13] เดิม bottom:8% วัดจากขอบล่างจอเป็นสัดส่วน ไม่เผื่อ
           ActionMenuBar (ลอยทับแยกชั้นอยู่แล้ว, z-index:1000) ที่อาจบังข้อความนี้บนจอเล็ก —
           เปลี่ยนไปใช้ --gpf-safe-bottom (โทเคนกลางเดียวกับที่ CameraCapture.css/
           QuestGateView.tsx ใช้กันชนจุดเดียวกัน) แทนสัดส่วนคงที่ */
        .intro-video-seq__overlay-text-wrap {
          position: absolute; bottom: calc(var(--gpf-safe-bottom, 80px) + 12px); left: 50%; transform: translateX(-50%);
          width: min(90%, 520px); text-align: center; padding: 0 16px;
        }
        @media (max-width: 480px) {
          .intro-video-seq { --intro-text-size: 14px; }
        }
        /* [แก้ตามที่ระบุ — 3.5] มือถือ/แท็บเล็ตแนวตั้ง: วิดีโอชิดบนกลางจอแบบเห็นครบทั้งเฟรม (contain ไม่ crop)
           ข้อความต่อใต้วิดีโอ อยู่ในจอทั้งหมด ไม่ตกขอบ และไม่โดนแถบเมนูล่าง */
        @media (max-width: 768px) and (orientation: portrait) {
          .intro-video-seq {
            display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
            padding: 64px 0 calc(var(--gpf-safe-bottom, 80px) + 12px); box-sizing: border-box;
            background: radial-gradient(circle at 50% 30%, #2a2340 0%, #120e1c 100%);
          }
          .intro-video-seq__video {
            position: relative; inset: auto; width: 100%; height: auto; max-height: 58vh;
            object-fit: contain; object-position: top center; flex-shrink: 1; min-height: 0;
          }
          .intro-video-seq__vignette { display: none; }
          .intro-video-seq__overlay-text-wrap {
            position: relative; bottom: auto; left: auto; transform: none;
            margin-top: 18px; width: 100%; max-width: 520px; box-sizing: border-box;
          }
        }
      `}</style>
    </div>
  )
}