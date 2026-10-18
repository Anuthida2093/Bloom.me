import { SPECIAL_DUST_ICON, USE_SPECIAL_DUST_EVENT } from '../../config/stepChest'
import './ProfileTokens.css'

/*============================================================================*\
  SpecialDustTile — [แก้ตามที่ระบุ] "ผงพิเศษ" ในคลังไอเทม (ได้จากหีบสมบัติเควสก้าว)
  กด "ใช้" → กลับหน้า Home แล้วโชว์ถุงสีม่วง (SpecialDustPouch) ให้แตะเทผงใส่ต้นไม้
  ผงยังไม่ถูกหักตอนกดปุ่มนี้ — หักจริงตอนแตะถุงที่หน้า Home (ไม่แตะ = ไม่เสียผง)
\*============================================================================*/

export default function SpecialDustTile({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <div className="dust-tile">
      <span className="dust-tile__count">{count}</span>
      <img src={SPECIAL_DUST_ICON} alt="" className="dust-tile__img" />
      <span className="dust-tile__name">ผงพิเศษ</span>
      <small className="dust-tile__hint">โปรยใส่ต้นไม้ +1-2 EXP</small>
      <button
        type="button"
        className="dust-tile__use"
        onClick={() => window.dispatchEvent(new CustomEvent(USE_SPECIAL_DUST_EVENT))}
      >
        ใช้
      </button>
    </div>
  )
}
