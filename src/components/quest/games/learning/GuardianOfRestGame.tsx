import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import '../games.css'

/*  ความสำเร็จ The Guardian of Rest (ผู้พิทักษ์การพักผ่อน)  — เควสแบบ passive
    ทฤษฎี: Deliberate Practice — ผู้เชี่ยวชาญระดับโลกฝึกหนักได้เต็มที่ 4-5 ชม./วัน
    ─────────────────────────────────────────────────────────────
    เควสนี้ไม่มีอะไรให้ "เล่น" แต่ต้องมีหน้าจอแสดงข้อมูลจริง เพราะระบบล็อกเควสอัตโนมัติ
    จากค่านี้ — โควตาที่ใช้ไปมาจาก addFocusMinutes() ที่เควส The Deep Root เรียกทุกครั้ง
    ที่โฟกัสครบรอบ ครบ 300 นาทีเมื่อไหร่ ระบบจะบังคับหยุด (ดู QuestSection.tsx)      */

const DAILY_QUOTA_MINUTES = 300 // 5 ชั่วโมง

export default function GuardianOfRestGame({ finish }: QuestGameProps) {
  const { focusMinutesToday } = useAppContext()
  const pct = Math.min(100, (focusMinutesToday / DAILY_QUOTA_MINUTES) * 100)
  const overQuota = focusMinutesToday >= DAILY_QUOTA_MINUTES
  const nearQuota = !overQuota && focusMinutesToday >= DAILY_QUOTA_MINUTES * 0.8

  return (
    <div className="qg">
      <div className="qg-card qg-center">
        <div style={{ fontSize: 44 }}>{overQuota ? '🛑' : '🛡️'}</div>
        <div className="qg-title">โควตาการฝึกหนักวันนี้</div>
        <div style={{ fontFamily: "'Fredoka One', 'Mali', sans-serif", fontSize: 30, color: 'var(--fixed-white)', margin: '4px 0 10px' }}>
          {Math.floor(focusMinutesToday / 60)} ชม. {focusMinutesToday % 60} นาที
          <span style={{ fontSize: 14, color: 'var(--glass-w-50)' }}> / 5 ชม.</span>
        </div>
        <div className="qg-progress"><div className="qg-progress__fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {overQuota && (
        <span className="qg-tag qg-tag--danger">
          ครบโควตาแล้ว — เควสที่ใช้พลังงานสูงถูกล็อกจนถึงพรุ่งนี้ ฝืนต่อลำต้นจะไหม้เกรียมจากภาวะหมดไฟ
        </span>
      )}
      {nearQuota && <span className="qg-tag qg-tag--warn">ใกล้ครบโควตาแล้ว เหลืออีกไม่ถึง 1 ชั่วโมง</span>}

      <div className="qg-card">
        <p className="qg-hint">
          งานวิจัยของ Ericsson พบว่าผู้เชี่ยวชาญระดับโลกฝึกแบบตั้งใจได้เต็มที่เพียง 4-5 ชั่วโมงต่อวัน
          ส่วนที่เหลือของความเก่งมาจากการนอนและการพักฟื้น ไม่ใช่การฝืนทำต่อ
        </p>
      </div>

      <button className="qg-btn qg-btn--ghost" onClick={() => finish({ focusMinutesToday })}>
        รับทราบ ปิดหน้านี้
      </button>
    </div>
  )
}