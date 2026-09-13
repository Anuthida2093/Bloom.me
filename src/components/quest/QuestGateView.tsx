import type { QuestDef } from '../../config/questCatalog'
import { SAFETY_NET_CONTACTS } from '../../config/screening'

const C_4 = '#9b59d0'
const BORDER_5 = '#b785f5'
const C_6 = '#2a1635'
const C_10 = '#123528'

interface QuestGateViewProps {
  category: 'mental' | 'physical'
  quests: QuestDef[]
  isCompleted: (questCode: string) => boolean
  isLocked: (quest: QuestDef) => boolean
  /** [ใหม่] จำนวนครั้งที่ทำสำเร็จวันนี้แล้ว — ใช้โชว์ "Xx/Yx วันนี้" บนเควส isRepeatable */
  getTodayCompletionCount?: (questCode: string) => number
  onSelectQuest: (quest: QuestDef) => void
  /** เฉพาะหมวดสุขภาพจิต — ทางลัดไปกล่องความช่วยเหลือฉุกเฉิน (คงการเข้าถึงไว้ ไม่ตัดทิ้ง) */
  onOpenSafetyNet?: () => void
  /** [ใหม่] true = เควสนี้ต้องเช็คอินอารมณ์ของวันนี้ก่อน (ดู MOOD_GATED_QUEST_CODES ใน
   * questCatalog.ts) แต่ยังไม่มี todaysMoodEntry — เดิมกดเข้าไปแล้วเจอ MoodGateScreen เงียบๆ
   * โดยไม่มีสัญลักษณ์อะไรบอกล่วงหน้าที่เมนูนี้เลย ดูเหมือนเควสพัง จึงเพิ่ม badge/tooltip บอก
   * ชัดเจนตรงนี้แทน — ไม่ใช่ isLocked จริง (ยังกดเข้าไปได้ แค่จะเจอหน้าชวนไปเช็คอินก่อน) */
  needsMoodCheckin?: (questCode: string) => boolean
}

/* [แก้ธีมสี — รอบก่อนหน้า ไม่แตะซ้ำรอบนี้] พื้นหลังมืดของทั้งสองหมวดใช้โทเคนกลาง --ae-*
   (นิยามที่ src/index.css) แทนสีฮาร์ดโค้ดเดิม — ปรับสีทีเดียวที่ index.css แล้วทุกหน้าที่ใช้
   โทนเดียวกัน (รวม OracleCardsPage.css หมวดจิตใจ) เปลี่ยนตามกันเป็นชุดเดียว
   [ตามที่ระบุรอบนี้] ห้ามแตะสีธีม/ตัวแปรใดๆ อีก — theme.bg ด้านล่างคงค่าเดิมทุกตัวเป๊ะ
   แก้แค่ "รูปแบบการจัดวางปุ่มเควส" จาก FAB วงกลม → ลิสต์แนวตั้งเต็มความกว้าง (ดู JSX ล่างสุด) */
const THEME = {
  mental: {
    bg: `radial-gradient(circle at 50% 50%, var(--ae-mental-glow) 0%, var(--ae-mental-mid) 60%, var(--ae-mental-deep) 100%)`,
    fabFrom: 'var(--purple)', fabTo: C_4,
    itemBorder: BORDER_5, itemBg: C_6,
  },
  physical: {
    bg: `radial-gradient(circle at 50% 50%, var(--ae-mist) 0%, var(--ae-deep) 60%, var(--ae-void) 100%)`,
    fabFrom: 'var(--g400)', fabTo: 'var(--g700)',
    itemBorder: 'var(--g300)', itemBg: C_10,
  },
}

/**
 * QuestGateView — หน้าหลักของหมวดสุขภาพกาย/สุขภาพจิต ใช้ร่วมกันได้ทั้ง 2 หมวดเพียงสลับธีม
 * กดแถวเควสแล้วเรียก onSelectQuest ตัวเดียวกับที่ QuestSection ใช้อยู่แล้ว (ผ่านด่านล็อก/
 * คัดกรองความเสี่ยงเดิมทุกจุด ไม่ได้ข้ามระบบใดๆ)
 *
 * [แก้ตามที่ระบุ] เดิมเป็นปุ่มวงกลม FAB มุมซ้ายล่างที่ต้องกดเปิดก่อนถึงจะเห็นไอคอนเควส
 * (ซ่อนอยู่ ผู้ใช้ต้องเดาว่ามีเมนูตรงนี้) เปลี่ยนเป็น "ลิสต์แนวตั้ง" ปุ่มยาวเต็มความกว้างจอ
 * เรียงต่อกัน ปักอยู่ค้างชิดขอบล่างเสมอ (ไม่ต้องกดเปิด/ปิดอีกต่อไป) ลำดับเควสมาจาก
 * `quests` prop ตรงๆ (GameplayFrame.tsx ส่ง [...pathQuests, ...sideQuests] ซึ่งเรียงตรงตาม
 * ลำดับที่ระบุอยู่แล้วจาก questCatalog.ts ไม่ต้องเรียงใหม่ในไฟล์นี้)
 */
export default function QuestGateView({
  category, quests, isCompleted, isLocked, getTodayCompletionCount = () => 0, onSelectQuest, onOpenSafetyNet,
  needsMoodCheckin = () => false,
}: QuestGateViewProps) {
  const theme = THEME[category]

  return (
    <div className="quest-gate-view" style={{ background: theme.bg }}>
      <div className="quest-gate-view__list">
        {/* [แก้ตามที่ระบุ] เดิมคำคม + ลิงก์นี้อยู่ในกล่อง .quest-gate-view__center ที่ลอย
            กึ่งกลางจอ (height:100%) เหลือเป็นช่องว่างค้างหลังไอคอนนกฮูก/ใบไม้ถูกลบไปแล้ว —
            ตัดคำคมทิ้งทั้งสองหมวด และย้ายลิงก์ทางลัดนี้มาไว้บนสุดของลิสต์แทน (ไม่ใช่ล็อกจริง
            แค่ทางลัด — การเข้าถึงกล่องพยาบาลเต็มรูปแบบยังอยู่ที่แถบท้ายลิสต์เหมือนเดิม) */}
        {category === 'mental' && onOpenSafetyNet && (
          <button type="button" className="quest-gate-view__safety-link" onClick={onOpenSafetyNet}>
            ต้องการความช่วยเหลือด่วน?
          </button>
        )}

        {quests.map((q) => {
          const locked = isLocked(q)
          const done = isCompleted(q.code)
          // ต้องเช็คอินอารมณ์ก่อน — ไม่ใช่ "ล็อกจริง" (ยังกดเข้าไปได้ แค่จะเจอหน้าชวนไป
          // เช็คอินก่อนหน้าเควสจริง) จึงไม่ disable ปุ่ม แค่โชว์ป้ายบอกแยกจาก lock
          const moodGated = !done && !locked && needsMoodCheckin(q.code)
          // [ใหม่] ป้าย "เล่นซ้ำได้" — แยกจาก status chip (done/locked/moodGated) เพราะเควส
          // isRepeatable ยัง "สำเร็จแล้ว" ของครั้งล่าสุดได้พร้อมกับเล่นซ้ำได้อีกในวันเดียวกัน
          const playsToday = q.isRepeatable ? getTodayCompletionCount(q.code) : 0
          return (
            <button
              key={q.code}
              className="quest-gate-view__row"
              disabled={locked}
              title={moodGated ? 'เช็คอินอารมณ์ก่อนถึงจะเล่นได้' : q.titleTh}
              onClick={() => onSelectQuest(q)}
            >
              <span
                className="quest-gate-view__row-icon"
                style={{ background: `linear-gradient(135deg, ${theme.fabFrom}, ${theme.fabTo})` }}
              >
                {q.icon}
              </span>
              <span className="quest-gate-view__row-title">{q.titleTh}</span>
              {q.isRepeatable && (
                <span
                  className="quest-gate-view__row-status quest-gate-view__row-status--repeat"
                  title={q.maxPerDay ? `เล่นซ้ำได้วันนี้ ${playsToday}/${q.maxPerDay} ครั้ง` : 'เล่นซ้ำได้หลายครั้งต่อวัน'}
                >
                  🔁{q.maxPerDay ? ` ${playsToday}/${q.maxPerDay}` : ''}
                </span>
              )}
              {done && <span className="quest-gate-view__row-status quest-gate-view__row-status--done">✓ สำเร็จแล้ว</span>}
              {!done && locked && <span className="quest-gate-view__row-status quest-gate-view__row-status--locked">🔒 ล็อกอยู่</span>}
              {!done && !locked && moodGated && (
                <span className="quest-gate-view__row-status quest-gate-view__row-status--mood">🌤️ เช็คอินก่อน</span>
              )}
            </button>
          )
        })}

        {/* [ตามที่ระบุ] หมวดสุขภาพกาย — เว้นที่ว่างท้ายลิสต์ไว้เฉยๆ ไม่ต้องมีข้อความ */}
        {category === 'physical' && <div className="quest-gate-view__list-spacer" aria-hidden="true" />}

        {/* [ใหม่ — ข้อ D5] แถบศูนย์ฉุกเฉิน เฉพาะหมวดสุขภาพจิต — ไม่ใช่เควส กดแล้วไม่เข้า
            flow เล่นเควสใดๆ ทั้งสิ้น แสดงเบอร์สายด่วนสุขภาพจิตกรมสุขภาพจิต (1323) ตรงๆ ในแถบ
            เลย (ข้อมูลจาก config/screening.ts ตัวเดียวกับที่ SafetyNetPage.tsx ใช้อยู่แล้ว —
            ไม่ได้พิมพ์เบอร์ขึ้นใหม่ที่นี่ กันเบอร์ 2 จุดไม่ตรงกันในอนาคต) กดทั้งแถบเปิด
            SafetyNetPage เต็มรูปแบบ (ช่องทางอื่นๆ + disclaimer) ถ้ามี onOpenSafetyNet ส่งมา
            [ต้องให้เจ้าของโปรเจกต์ตรวจสอบ] ควรยืนยันว่าเบอร์ 1323 ยังเป็นเบอร์ปัจจุบันจริง
            ก่อนขึ้นโปรดักชัน — ไม่ได้แต่งเบอร์ขึ้นเอง ใช้ค่าที่มีอยู่แล้วในระบบ */}
        {category === 'mental' && (
          <button
            type="button"
            className="quest-gate-view__safety-banner"
            onClick={onOpenSafetyNet}
            title="ศูนย์ช่วยเหลือด้านสุขภาพจิต"
          >
            <span className="quest-gate-view__safety-banner-icon">{SAFETY_NET_CONTACTS[0].icon}</span>
            <span className="quest-gate-view__safety-banner-text">
              <strong>{SAFETY_NET_CONTACTS[0].title}</strong>
              <small>{SAFETY_NET_CONTACTS[0].subtitle}</small>
            </span>
          </button>
        )}
      </div>

      <style>{`
        .quest-gate-view {
          position: absolute; inset: 0; z-index: 10; overflow: hidden;
        }
        /* [แก้ตามที่ระบุ] ลิงก์ทางลัดกล่องพยาบาล — ย้ายมาอยู่บนสุดของลิสต์ (จากเดิมอยู่ใน
           กล่อง .quest-gate-view__center ที่ลอยกึ่งกลางจอ) จัดกึ่งกลางแนวนอนในตัวเองแทน */
        .quest-gate-view__safety-link {
  align-self: center;
  margin-bottom: 2px;
  border: none;
  background: transparent;
  --lc-text-1: #ffb3c6;
  color: var(--lc-text-1);
  font-size: var(--fs-xs);
  text-decoration: underline;
  cursor: pointer;
}

        /* [แก้ตามที่ระบุ] ลิสต์แนวตั้งเต็มความกว้างจอ ปักชิดขอบล่างเสมอ แทนเมนู FAB ที่ต้องกดเปิด
           เดิม — ใช้ --gpf-safe-bottom (ประกาศที่ .gameplay-frame) กันไม่ให้ ActionMenuBar บัง
           เหมือนที่ทุกป๊อปอัพชิดขอบล่างในระบบนี้ทำอยู่แล้ว
           [แก้ตามที่ระบุ — ข้อ 3] เดิมมีกล่อง .quest-gate-view__center ลอยกึ่งกลางจอด้านบน
           (คำคม + ที่เว้นว่างของไอคอนนกฮูก/ใบไม้เดิม) กินพื้นที่เหนือลิสต์ไปมาก ตอนนี้ตัดกล่อง
           นั้นทิ้งทั้งหมด ลิสต์จึงเริ่มต้นทันทีใต้ป้ายชื่อโซนที่ QuestSection.tsx (ไม่มีช่องว่าง
           คั่นกลาง) — เพิ่ม max-height และลด padding-top ลงเพื่อให้กรอบเควสยืดสูงขึ้นอีกเล็กน้อย */
        .quest-gate-view__list {
          position: absolute; left: 0; right: 0; bottom: 0; z-index: 20;
          display: flex; flex-direction: column; gap: 10px;
          max-height: 72%; overflow-y: auto;
          padding: 18px 16px calc(var(--gpf-safe-bottom, 0px) + 20px);
          background: linear-gradient(180deg, transparent 0%, var(--glass-b-30) 35%, var(--glass-b-55) 100%);
        }
        .quest-gate-view__row {
          width: 100%; display: flex; align-items: center; gap: 14px;
          padding: 10px 16px 10px 10px; border-radius: 20px;
          background: ${theme.itemBg}; border: 2px solid ${theme.itemBorder};
          color: var(--fixed-white); cursor: pointer; text-align: left; flex-shrink: 0;
          box-shadow: 0 6px 16px var(--glass-b-35);
          transition: transform .15s ease, filter .15s ease;
        }
        .quest-gate-view__row:hover:not(:disabled) { transform: translateX(4px); filter: brightness(1.12); }
        .quest-gate-view__row:disabled { cursor: not-allowed; opacity: .55; }
        .quest-gate-view__row-icon {
          flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 22px;
          box-shadow: 0 4px 10px var(--glass-b-35);
        }
        .quest-gate-view__row-title {
          flex: 1; min-width: 0; font-family: var(--font-display); font-weight: 700; font-size: var(--fs-sm);
        }
        .quest-gate-view__row-status {
          flex-shrink: 0; font-size: 10.5px; font-weight: 800; padding: 6px 10px; border-radius: var(--r-pill);
          white-space: nowrap;
        }
        .quest-gate-view__row-status--done { background: var(--g500); color: var(--fixed-white); }
        .quest-gate-view__row-status--locked { background: var(--glass-b-60); color: var(--fixed-white); }
        /* [ใหม่] ต้องเช็คอินอารมณ์ก่อน — ตั้งใจให้หน้าตาต่างจาก lock จริงๆ (กรอบ/ตัวอักษรสีทอง
           อ่อนบนพื้นกระจกใส ไม่ใช่ป้ายทึบสีเข้ม) เพราะไม่ได้กดไม่ได้ แค่จะพาไปเช็คอินก่อนเท่านั้น */
        .quest-gate-view__row-status--mood { background: var(--glass-w-15); color: var(--ae-sun); border: 1px solid var(--ae-sun); }
        /* [ใหม่] ป้าย "เล่นซ้ำได้" — โทนเขียวอมฟ้าของ Aether (--ae-glow) แยกจาก done/locked/mood
           ทั้งหมด เพราะไม่ใช่สถานะเควส แต่เป็นคุณสมบัติของเควสเอง โชว์คู่กับ status chip อื่นได้ */
        .quest-gate-view__row-status--repeat { background: var(--glass-w-15); color: var(--ae-glow); border: 1px solid var(--ae-glow); }

        .quest-gate-view__list-spacer { min-height: 56px; flex-shrink: 0; }

        /* [ใหม่ — ข้อ D5] แถบศูนย์ฉุกเฉิน ท้ายลิสต์หมวดสุขภาพจิตเท่านั้น — ตั้งใจให้ "นิ่ง"
           ไม่มีแอนิเมชัน สีสงบ (ขาว/เทาอ่อนโปร่งแสง ไม่ใช่โทนม่วง/ชมพูจัดแบบปุ่มเควส) แยกให้
           เห็นชัดว่านี่ไม่ใช่เควส ไม่มี icon แบบวงกลมไล่สี ไม่มี hover เลื่อนซ้าย-ขวา */
        .quest-gate-view__safety-banner {
          width: 100%; display: flex; align-items: center; gap: 14px;
          padding: 12px 16px; border-radius: 20px; margin-top: 2px;
          background: var(--glass-w-10); border: 1.5px solid var(--glass-w-22);
          color: var(--fixed-white); cursor: pointer; text-align: left; flex-shrink: 0;
        }
        .quest-gate-view__safety-banner:hover { background: var(--glass-w-16); }
        .quest-gate-view__safety-banner-icon { flex-shrink: 0; font-size: 24px; line-height: 1; }
        .quest-gate-view__safety-banner-text { display: flex; flex-direction: column; gap: 2px; }
        .quest-gate-view__safety-banner-text strong { font-family: var(--font-display); font-size: var(--fs-sm); }
        .quest-gate-view__safety-banner-text small { font-size: var(--fs-xs); color: var(--glass-w-70); }

        .quest-gate-view__list::-webkit-scrollbar { width: 4px; }
        .quest-gate-view__list::-webkit-scrollbar-thumb { background: var(--glass-w-30); border-radius: 99px; }

        /* [ใหม่ — ข้อ D2] เดสก์ท็อปขึ้นไป (≥1024px) — ปุ่มเควสกว้างแค่ ~8cm (≈302px ที่ 96dpi)
           จัดกึ่งกลางจอแทนเต็มความกว้าง — ใช้ px แทน cm ตรงๆ เพราะหน่วย cm ใน CSS อิงสมมติฐาน
           96dpi ซึ่งจอจริงมักไม่ตรงเป๊ะ (ความละเอียด/การตั้งค่าสเกลต่างกันไปแต่ละเครื่อง) แปลง
           เป็น px ล่วงหน้าแทนจึงได้ผลลัพธ์ที่คาดเดาได้เหมือนกันทุกจอ ไม่ใช้กับมือถือ/แท็บเล็ต
           (ปุ่มยังเต็มความกว้างเหมือนเดิมตามที่ระบุ) */
        @media (min-width: 1024px) {
          .quest-gate-view__list { align-items: center; }
          .quest-gate-view__row,
          .quest-gate-view__safety-banner { max-width: 302px; }
        }

        @media (max-width: 480px) {
          .quest-gate-view__list { max-height: 66%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .quest-gate-view__icon, .quest-gate-view__shadow { animation: none; }
        }
      `}</style>
    </div>
  )
}
