import type { TooltipRenderProps } from 'react-joyride'
import TourMascot from './TourMascot'
import './TourTooltip.css'

/** กล่องข้อความของทัวร์ — ม้วนกระดาษครีม + ต้นกล้าสไลม์ไกด์ที่มุมบนซ้าย
 *  มีปุ่ม ข้าม / ย้อนกลับ / ถัดไป ครบทุกขั้นเสมอ (ขั้นแรกปุ่มย้อนกลับแสดงแต่กดไม่ได้)
 *  ใช้ธีมกระดาษเดียวกันทั้งโหมดสว่าง/มืด แบบเดียวกับป้ายในเกม */
export default function TourTooltip({ index, size, step, isLastStep, backProps, primaryProps, skipProps, tooltipProps }: TooltipRenderProps) {
  return (
    <div className="bloom-tour" {...tooltipProps}>
      {/* key=index → ไกด์เด้งทักใหม่ทุกครั้งที่เปลี่ยนขั้น */}
      <div className="bloom-tour__mascot" key={index}>
        <TourMascot size={70} />
      </div>

      <div className="bloom-tour__head">
        {/* แถบความคืบหน้าแบบเถาวัลย์ — ไม่ล้นบรรทัดแม้ทัวร์ยาว (หน้า Home มี ~19 ขั้น) */}
        <div className="bloom-tour__progress" aria-hidden="true">
          <span className="bloom-tour__progress-fill" style={{ width: `${((index + 1) / size) * 100}%` }} />
        </div>
        <span className="bloom-tour__count">{index + 1}/{size}</span>
      </div>

      {step.title && <h3 className="bloom-tour__title">{step.title}</h3>}
      <div className="bloom-tour__content">{step.content}</div>

      <div className="bloom-tour__footer">
        <button type="button" className="bloom-tour__skip" {...skipProps}>ข้าม</button>
        <div className="bloom-tour__nav">
          <button type="button" className="bloom-tour__btn bloom-tour__btn--back" {...backProps} disabled={index === 0}>ย้อนกลับ</button>
          <button type="button" className="bloom-tour__btn bloom-tour__btn--next" {...primaryProps}>{isLastStep ? 'เข้าใจแล้ว' : 'ถัดไป'}</button>
        </div>
      </div>
    </div>
  )
}
