import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

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
      <video className="intro-video-seq__video" src={videoSrc} autoPlay muted playsInline onPlay={handleVideoPlay} onEnded={handleVideoEnded} />
      <audio ref={audioRef} src={audioSrc} />
      <div className="intro-video-seq__vignette" />

      <motion.div
        className="intro-video-seq__overlay-text-wrap"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
      >
        <p className="intro-video-seq__overlay-text" style={{ textShadow: `0 0 20px ${accent}` }}>{overlayText}</p>
      </motion.div>

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
        .intro-video-seq__overlay-text-wrap {
          position: absolute; bottom: 8%; left: 50%; transform: translateX(-50%);
          width: min(90%, 520px); text-align: center; padding: 0 16px;
        }
        .intro-video-seq__overlay-text {
          font-family: 'Fredoka One'; font-size: 16px; color: var(--fixed-white); line-height: 1.7;
        }
        @media (max-width: 480px) {
          .intro-video-seq__overlay-text { font-size: 13px; }
        }
      `}</style>
    </div>
  )
}