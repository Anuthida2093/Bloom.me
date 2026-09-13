import { useAppContext } from '../../../context/AppContext'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { SAFETY_NET_CONTACTS, SAFETY_NET_DISCLAIMER } from '../../../config/screening'
import './SafetyNetPage.css'

/*============================================================================*\
  SafetyNetPage — กล่องพยาบาลเวทมนตร์ (High Risk Safety Net)  [ไฟล์ใหม่]
  ────────────────────────────────────────────────────────────────────────────
  แสดงเมื่อผลคัดกรองอยู่ระดับเสี่ยงสูง (คะแนน 10-15) ตามเอกสารส่วนที่ 3:
    • เด้งปุ่มสายด่วนสุขภาพจิต 1323 กดโทรออกได้ทันที (href="tel:1323")
    • มีปุ่มเชื่อมต่อคลินิก/ช่องทางปรึกษาจิตแพทย์ออนไลน์ (Tele-psychiatry)
    • แสดง Disclaimer ชัดเจนว่าแอปเป็นเพียงเครื่องมือดูแลเบื้องต้น

  หลักการเขียนข้อความในหน้านี้: ไม่เร่งเร้า ไม่ตัดสิน ไม่ใช้คำว่า "ผิดปกติ"
  และไม่ปิดกั้นทางออกอื่น — ผู้ใช้กดปิดได้เสมอ แต่กล่องพยาบาลจะยังลอยอยู่บนต้นไม้
  ให้กลับมากดได้ตลอดจนกว่าผลประเมินครั้งใหม่จะดีขึ้น
\*============================================================================*/

interface SafetyNetPageProps {
  onClose: () => void
  onStartCalmingQuest: () => void
}

export default function SafetyNetPage({ onClose, onStartCalmingQuest }: SafetyNetPageProps) {
  useLockBodyScroll()
  useEscapeKey(onClose)
  const { userData } = useAppContext()

  return (
    <div className="safety-net">
      <div className="safety-net__aura" aria-hidden="true" />
      <button className="safety-net__close" onClick={onClose} title="ปิด" aria-label="ปิดกล่องพยาบาล">✕</button>

      <div className="safety-net__inner">
        <div className="safety-net__box">🧰</div>
        <h1>กล่องพยาบาลเปิดอยู่ตรงนี้</h1>
        <p className="safety-net__lead">
          คุณ{userData.username ? ` ${userData.username}` : ''} ต้นไม้ของคุณกำลังส่งสัญญาณว่าคุณเหนื่อยล้าเกินไปแล้ว
          การพยายามจัดการทุกอย่างคนเดียวอาจจะหนักเกินไปในตอนนี้ การขอความช่วยเหลือไม่ใช่เรื่องผิดนะ
        </p>

        <div className="safety-net__contacts">
          {SAFETY_NET_CONTACTS.map((c) => (
            <a
              key={c.id}
              href={c.href}
              className={`safety-net__contact${c.primary ? ' safety-net__contact--primary' : ''}`}
              target={c.href.startsWith('http') ? '_blank' : undefined}
              rel={c.href.startsWith('http') ? 'noreferrer' : undefined}
            >
              <span className="safety-net__contact-icon">{c.icon}</span>
              <span className="safety-net__contact-text">
                <strong>{c.title}</strong>
                <small>{c.subtitle}</small>
              </span>
            </a>
          ))}
        </div>

        <div className="safety-net__meanwhile">
          <div className="safety-net__meanwhile-title">ระหว่างนี้ ลองอยู่กับลมหายใจสักครู่</div>
          <p>ไม่ต้องแก้ทุกอย่างวันนี้ แค่ 2 นาทีกับจังหวะ 4-7-8 ก็ช่วยให้ร่างกายผ่อนลงได้จริง</p>
          <button onClick={onStartCalmingQuest}>เปิดเควสทอดสมอใจ</button>
        </div>

        <p className="safety-net__disclaimer">{SAFETY_NET_DISCLAIMER}</p>
      </div>
    </div>
  )
}