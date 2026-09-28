import { useEscapeKey } from '../../hooks/useEscapeKey'
import { BADGE_ICONS } from '../../config/iconAssets'
import '../leaderboard/leaderboardRow.css'

interface MoodGateScreenProps {
  title: string
  icon: string
  /** [เพิ่มรอบนี้ — grep 🔮/📖 พบจุดนี้] ไอคอนเควสจริงจาก QUEST_ICONS ถ้ามี ใช้แทน `icon`
   *  (emoji) เดิม — ไม่ใส่ก็ fallback เป็น emoji ต่อไปตามปกติ */
  iconImg?: string
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
export default function MoodGateScreen({ title, icon, iconImg, onRequestMoodCheckin, onClose }: MoodGateScreenProps) {
  useEscapeKey(onClose)

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 800,
        // [แก้ตามที่ระบุ] พื้นหลังแบบหน้าเควสอื่นๆ (เขียวอ่อน/เขียวเข้มตามธีม) แทนสีประจำหมวด
        background: 'var(--bg)',
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
        <img src={BADGE_ICONS.close} className="icon-img" alt="" />
      </button>

      {/* [แก้บั๊ก — พบระหว่างทดสอบจริงตามข้อ 7] เดิม heading ใช้ color: var(--n900) และ
          คำอธิบายใช้ color: var(--n500) — ทั้งคู่ "สลับกลับด้าน" ตอน dark mode (ดู
          [data-theme="dark"] ใน index.css) แต่พื้นหลังการ์ดนี้เป็น var(--glass-w-96) (ขาวเกือบ
          ทึบตายตัว ไม่มีเวอร์ชัน dark mode) เหมือนกับฟิลด์ของ Login.tsx เป๊ะ — พอสลับ dark mode
          หัวเรื่องกลายเป็นเกือบขาวบนพื้นขาว อ่านแทบไม่ออก ใช้เทคนิคเดียวกับ Login.tsx: ล็อกสี
          เป็นค่าคงที่เข้ม (เท่ากับค่า --n900/--n500 ฝั่ง light mode) แทนการอ้างโทเคนที่สลับสี
          เพราะพื้นหลังการ์ดนี้ไม่เปลี่ยนตามธีมอยู่แล้ว */}
      {/* [แก้ตามที่ระบุ] ป็อปอัพแบบกระดานจัดอันดับ — พื้นเขียวไล่เฉด ขอบทอง ป้ายหัว */}
      <div className="mood-gate-card lb-card" style={{ position: 'relative', textAlign: 'center', maxWidth: 420, width: '100%', borderRadius: 22, padding: '40px 26px 26px', boxShadow: '0 4px 0 color-mix(in srgb, var(--lb-gold-edge) 60%, var(--g800)), 0 16px 36px var(--glass-b-30)' }}>
        <div className="lb-banner" style={{ position: 'absolute', top: -17, left: '50%', transform: 'translateX(-50%)', fontSize: 15, whiteSpace: 'nowrap' }}>เช็คอินอารมณ์ก่อนนะ</div>
        <div className="mood-gate-icon" style={{ fontSize: 56, marginBottom: 8 }}>
          {iconImg ? <img src={iconImg} style={{ width: 56, height: 56, objectFit: 'contain' }} alt="" /> : icon}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--lb-card-text)', marginBottom: 8 }}>ก่อนเข้า {title}</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--lb-card-text-sub)', lineHeight: 1.7, marginBottom: 22 }}>
          ทุกวันต้องเช็คอินอารมณ์ก่อนนะ — ความรู้สึกวันนี้ของคุณคือกุญแจสำคัญที่ทำให้ไพ่ทิพย์และสมุดบันทึกเข้าใจคุณได้ตรงจุด
        </p>
        <button className="lb-btn lb-btn--wide" onClick={onRequestMoodCheckin}>
          <img src={BADGE_ICONS.checkin} className="icon-img" alt="" /> ไปเช็คอินอารมณ์
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