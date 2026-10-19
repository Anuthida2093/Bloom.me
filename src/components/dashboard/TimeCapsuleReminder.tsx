import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  TIME_CAPSULES_CHANGED_EVENT, dueTimeCapsules, markTimeCapsulesDone, snoozeTimeCapsules, type TimeCapsule,
} from '../../utils/timeCapsules'
import { uiSounds } from '../../utils/uiSounds'
import '../shop/ShopItemDialog.css'

/*============================================================================*\
  TimeCapsuleReminder — ป็อปอัพ "ถึงเวลาเปิดแคปซูลเวลา" (นัดทบทวนจากเควสแคปซูลเวลา)
  เด้งทันทีหลังล็อกอิน/เข้าหน้า Home ถ้ามีนัดที่ถึงเวลาแล้ว และเช็คซ้ำทุกนาทีระหว่างเปิดแอปค้าง
\*============================================================================*/

const CHECK_EVERY_MS = 60_000
const SNOOZE_MINUTES = 60

function formatAt(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function TimeCapsuleReminder({ userId, enabled }: { userId: string; enabled: boolean }) {
  const [due, setDue] = useState<TimeCapsule[]>([])

  useEffect(() => {
    if (!enabled || !userId) return
    const check = () => setDue(dueTimeCapsules(userId))
    // หน่วงเล็กน้อยให้หน้า Home ขึ้นก่อน แล้วค่อยเด้ง (ไม่ setState ตรงๆ ใน effect body)
    const first = window.setTimeout(check, 600)
    const id = window.setInterval(check, CHECK_EVERY_MS)
    window.addEventListener(TIME_CAPSULES_CHANGED_EVENT, check)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
      window.removeEventListener(TIME_CAPSULES_CHANGED_EVENT, check)
    }
  }, [userId, enabled])

  const show = enabled && due.length > 0
  useEffect(() => { if (show) uiSounds.chime() }, [show])

  if (!show) return null
  const ids = due.map((c) => c.id)
  const topics = [...new Set(due.flatMap((c) => c.topics))]
  const goals = [...new Set(due.map((c) => c.goal).filter((g): g is string => !!g))]

  return createPortal(
    <div className="shop-dialog" role="dialog" aria-modal="true" aria-labelledby="time-capsule-title">
      <div className="shop-dialog__card">
        <div className="shop-dialog__emoji" aria-hidden="true" style={{ fontSize: 84 }}>📅</div>
        <h2 id="time-capsule-title" className="shop-dialog__title">ถึงเวลาเปิดแคปซูลเวลาแล้ว!</h2>
        <p className="shop-dialog__body">นัดทบทวนที่คุณตั้งไว้ ({due.map((c) => formatAt(c.at)).join(', ')})</p>
        {goals.length > 0 && (
          <div className="shop-dialog__cost" style={{ width: '100%' }}>
            <span aria-hidden="true">🎯</span><span>เป้าหมายที่ตั้งไว้: {goals.join(' · ')}</span>
          </div>
        )}
        {topics.length > 0 && (
          <div className="shop-dialog__cost" style={{ width: '100%' }}>
            <span aria-hidden="true">🧠</span><span>หัวข้อที่เคยลืม: {topics.join(', ')}</span>
          </div>
        )}
        <p className="shop-dialog__hint">ลองนึกทบทวนเนื้อหาเหล่านี้โดยไม่เปิดโน้ตก่อน แล้วค่อยตรวจคำตอบ การดึงความจำตอนใกล้ลืมช่วยให้จำได้นานขึ้น</p>
        <div className="shop-dialog__actions">
          <button type="button" className="soft-btn soft-btn--ghost" onClick={() => { snoozeTimeCapsules(userId, ids, SNOOZE_MINUTES); setDue([]) }}>
            เตือนอีกใน 1 ชม.
          </button>
          <button type="button" className="soft-btn soft-btn--gold" onClick={() => { markTimeCapsulesDone(userId, ids); setDue([]) }}>
            ทบทวนแล้ว
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
