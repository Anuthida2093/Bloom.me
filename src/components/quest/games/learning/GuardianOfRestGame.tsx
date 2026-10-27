import { useEffect, useState } from 'react'
import type { QuestGameProps } from '../../../../types.mental'
import { useAppContext } from '../../../../context/AppContext'
import { OWL_AVATAR_ICON } from '../../../../config/iconAssets'
import { REST_LOG_CHANGED_EVENT, activeRest, loadRestSessions, restTotals, completedFullRestToday } from '../../../../utils/restLog'
import { isQuestDoneNow } from '../../../../utils/questCompletion'
import '../games.css'
import './RestReminder.css'

/*  ผู้พิทักษ์การพักผ่อน (Guardian of Rest)
    ─────────────────────────────────────────────────────────────
    หน้าจอแสดงแค่ "นกฮูก" + "เวลาพักผ่อนที่ทำได้" — ไม่โชว์ตัวเลขตั้งต้น (90/15)
    เบื้องหลัง: หยั่งรากลึกจดจ่อครบช่วง → เริ่มจับเวลาพักอัตโนมัติ (utils/restLog.ts) ครบแล้วบันทึกทันที
    โดยตัวจับเวลาของหยั่งรากลึกยังเดินต่อ ไม่ถูกหยุด
    [แก้ตามที่ระบุ] พักครบ 15 นาทีเต็ม (รอบพักจบจริง) → ปุ่มรับรางวัลโผล่ กดรับได้วันละครั้ง (finish)
    ยังไม่ครบ/รับแล้ว → ดูอย่างเดียว ปิดด้วย exit                                                          */

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function GuardianOfRestGame({ exit, finish }: QuestGameProps) {
  const { userData, questLogs } = useAppContext()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [sessions, setSessions] = useState(() => loadRestSessions(userData.id))

  // นาฬิกาเดินทุกวินาที (แสดงเวลาพักที่เหลือ) + โหลดใหม่เมื่อหยั่งรากลึกเริ่มรอบพัก
  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000)
    const reload = () => setSessions(loadRestSessions(userData.id))
    window.addEventListener(REST_LOG_CHANGED_EVENT, reload)
    return () => { window.clearInterval(tick); window.removeEventListener(REST_LOG_CHANGED_EVENT, reload) }
  }, [userData.id])

  const active = activeRest(sessions, nowMs)
  const { todayMinutes, totalMinutes } = restTotals(sessions, nowMs)
  const claimedToday = isQuestDoneNow(questLogs, 'know-guardian-of-rest')
  const restDone = completedFullRestToday(sessions, nowMs)
  const remaining = active ? new Date(active.startedAt).getTime() + active.minutes * 60_000 - nowMs : 0

  return (
    <div className="qg">
      <div className="qg-card qg-center rest-timer">
        <div className={`rest-owl rest-owl--big${active ? '' : ' rest-owl--awake'}`} aria-hidden="true">
          <img src={OWL_AVATAR_ICON} alt="" className="rest-owl__img" />
          {active && <span className="rest-owl__zzz">Zzz</span>}
        </div>

        {active && (
          <>
            <div className="rest-timer__phase">กำลังพักผ่อน…</div>
            <div className="rest-timer__clock" role="timer" aria-live="off">{mmss(remaining)}</div>
          </>
        )}

        <div className="rest-timer__total">
          <span>เวลาพักผ่อนที่ทำได้วันนี้</span>
          <strong>{todayMinutes} นาที</strong>
        </div>
        {totalMinutes > todayMinutes && <p className="qg-hint">สะสมทั้งหมด {totalMinutes} นาที</p>}
      </div>

      {restDone && !claimedToday && (
        <button className="qg-btn" onClick={() => finish({ restMinutes: todayMinutes })}>พักครบ 15 นาทีแล้ว รับรางวัล</button>
      )}
      {!restDone && !claimedToday && (
        <p className="qg-hint">{active ? 'พักให้ครบเวลาก่อนนะ แล้วกลับมารับรางวัลที่นี่' : 'จดจ่อในโหมดจดจ่อให้ครบ 90 นาที ระบบจะเริ่มจับเวลาพัก 15 นาทีให้เอง'}</p>
      )}
      {claimedToday && <p className="qg-hint">รับรางวัลการพักผ่อนของวันนี้แล้ว 🦉</p>}
      <button className="qg-btn qg-btn--ghost" onClick={exit}>ปิดหน้านี้</button>
    </div>
  )
}
