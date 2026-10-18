import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SPECIAL_DUST_ICON } from '../../config/stepChest'
import { consumeSpecialDust } from '../../services/api/progression.api'
import { ApiError } from '../../services/http'
import { queryKeys } from '../../services/queryKeys'
import { playSfx } from '../../utils/audioPlayer'
import { useUI } from '../../context/UIContext'
import './SpecialDustPouch.css'

/*============================================================================*\
  SpecialDustPouch — [แก้ตามที่ระบุ] ใช้ผงพิเศษที่หน้า Home
  ────────────────────────────────────────────────────────────────────────────
  ถุงสีม่วงน่ารักลอยเหนือต้นไม้ → แตะ → ถุงเอียงค่อยๆ เท ผงสีขาว/เหลืองวิบวับโปรยลงมา
  ปลายทางอยู่กึ่งกลางทรงพุ่มต้นไม้ (กึ่งกลางจอแนวนอน) · หักผงที่เซิร์ฟเวอร์ตอนแตะ (+1-2 EXP)
\*============================================================================*/

type Stage = 'idle' | 'pouring' | 'done'

const GRAIN_COUNT = 46
const POUR_MS = 2600

/** สุ่มแบบกำหนดผลได้จากเลขลำดับ (ไม่ใช้ Math.random ระหว่าง render) */
const pseudo = (i: number, n: number) => ((Math.sin((i + 1) * 9301 + n * 49297) * 233280) % 1 + 1) % 1

export default function SpecialDustPouch({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { settings } = useUI()
  const [stage, setStage] = useState<Stage>('idle')
  const [exp, setExp] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // เม็ดผง: ขาว/เหลืองสลับกัน บางเม็ดเป็นดาวประกาย
  const grains = useMemo(() => Array.from({ length: GRAIN_COUNT }, (_, i) => ({
    delay: Math.round(pseudo(i, 1) * (POUR_MS - 900)),
    drift: Math.round((pseudo(i, 2) - 0.5) * 120),
    fall: 26 + Math.round(pseudo(i, 3) * 14),
    size: 3 + Math.round(pseudo(i, 4) * 5),
    yellow: i % 3 !== 0,
    star: i % 7 === 0,
    duration: 1100 + Math.round(pseudo(i, 5) * 700),
  })), [])

  const pour = async () => {
    if (stage !== 'idle') return
    setError(null)
    try {
      const res = await consumeSpecialDust()
      setStage('pouring')
      setExp(res.expGained)
      playSfx('SPARKLE_CHIME', { volume: settings.sfxVolume, enabled: settings.soundEnabled })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progression })
      window.setTimeout(() => setStage('done'), POUR_MS)
      window.setTimeout(onClose, POUR_MS + 1800)
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'ใช้ผงพิเศษไม่สำเร็จ ลองอีกครั้ง')
    }
  }

  return (
    <div className={`dust-pouch dust-pouch--${stage}`} role="dialog" aria-label="ผงพิเศษ">
      {stage === 'idle' && (
        <button type="button" className="dust-pouch__close" onClick={onClose} aria-label="ไว้ทีหลัง">✕</button>
      )}
      <button
        type="button"
        className="dust-pouch__bag"
        onClick={() => { void pour() }}
        disabled={stage !== 'idle'}
        aria-label="แตะเพื่อโปรยผงพิเศษใส่ต้นไม้"
      >
        <img src={SPECIAL_DUST_ICON} alt="" />
      </button>
      {stage === 'idle' && <p className="dust-pouch__hint">{error ?? 'แตะถุงเพื่อโปรยผงวิบวับใส่ต้นไม้ ✨'}</p>}

      {stage !== 'idle' && (
        <div className="dust-pouch__stream" aria-hidden="true">
          {grains.map((g, i) => (
            <span
              key={i}
              className={`dust-pouch__grain${g.yellow ? ' dust-pouch__grain--yellow' : ''}${g.star ? ' dust-pouch__grain--star' : ''}`}
              style={{
                width: g.size, height: g.size,
                animationDelay: `${g.delay}ms, ${g.delay}ms`,
                animationDuration: `${g.duration}ms, 380ms`,
                ['--drift' as string]: `${g.drift}px`,
                ['--fall' as string]: `${g.fall}vh`,
              }}
            />
          ))}
        </div>
      )}
      {stage === 'done' && exp !== null && <div className="dust-pouch__exp">ต้นไม้ได้ EXP +{exp} ✨</div>}
    </div>
  )
}
