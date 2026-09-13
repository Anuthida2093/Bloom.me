import { useEscapeKey } from '../../hooks/useEscapeKey'

interface MoodGateScreenProps {
  title: string
  icon: string
  accent: string
  onRequestMoodCheckin: () => void
  onClose: () => void
}

/**
 * MoodGateScreen — [ตามที่ยืนยัน] เช็คอินอารมณ์ต้อง "บังคับให้ทำทุกวัน" ก่อนถึงจะเปิดไพ่ทิพย์
 * หรือเขียนสมุดรากไม้เรืองแสงได้ — ถ้ายังไม่มี mood entry ของวันนี้ (เช็คจาก createdAt ใน
 * moodEntries เทียบกับวันที่ปัจจุบัน) ทั้ง 2 เควสนี้จะเรนเดอร์หน้านี้แทนเนื้อหาจริง
 * ปุ่ม "ไปเช็คอินอารมณ์" เรียก onRequestMoodCheckin (Dashboard.tsx เปิด MoodCheckIn ให้)
 *
 * [3-Pane layout] position: 'absolute' ครอบแค่ GameplayFrame ("กรอบเขียว") ที่เป็นพ่อ
 */
export default function MoodGateScreen({ title, icon, accent, onRequestMoodCheckin, onClose }: MoodGateScreenProps) {
  useEscapeKey(onClose)

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 800,
        background: `linear-gradient(160deg, ${accent}, var(--g800))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <button
        onClick={onClose}
        title="ปิด"
        style={{
          position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: 99,
          border: 'none', background: 'var(--glass-w-18)', color: 'var(--fixed-white)', cursor: 'pointer', fontSize: 15,
        }}
      >
        ✕
      </button>

      <div className="mood-gate-card" style={{ textAlign: 'center', maxWidth: 420, background: 'var(--glass-w-96)', borderRadius: 28, padding: '40px 32px', boxShadow: '0 28px 70px var(--glass-b-40)' }}>
        <div className="mood-gate-icon" style={{ fontSize: 56, marginBottom: 8 }}>{icon}</div>
        <div style={{ fontFamily: 'Fredoka One', fontSize: 22, color: 'var(--n900)', marginBottom: 8 }}>ก่อนเข้า {title}</div>
        <p style={{ fontSize: 13.5, color: 'var(--n500)', lineHeight: 1.7, marginBottom: 24 }}>
          ทุกวันต้องเช็คอินอารมณ์ก่อนนะ — ความรู้สึกวันนี้ของคุณคือกุญแจสำคัญที่ทำให้ไพ่ทิพย์และสมุดบันทึกเข้าใจคุณได้ตรงจุด
        </p>
        <button
          onClick={onRequestMoodCheckin}
          style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: 16,
            background: `linear-gradient(135deg, ${accent}, var(--purple))`, color: 'var(--fixed-white)',
            fontFamily: 'Fredoka One', fontSize: 16, cursor: 'pointer', boxShadow: `0 10px 24px ${accent}55`,
          }}
        >
          🌤️ ไปเช็คอินอารมณ์
        </button>
      </div>

      <style>{`
        @keyframes moodGateCardPop {
          from { opacity: 0; transform: scale(.9) translateY(14px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mood-gate-card { animation: moodGateCardPop .35s cubic-bezier(.22,1,.36,1) both; }

        @keyframes moodGateIconFloat {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-8px) rotate(4deg); }
        }
        .mood-gate-icon { display: inline-block; animation: moodGateIconFloat 2.8s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .mood-gate-card, .mood-gate-icon { animation: none; }
        }
      `}</style>
    </div>
  )
}