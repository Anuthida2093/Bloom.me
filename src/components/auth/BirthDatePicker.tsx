import { useState, type CSSProperties } from 'react'
import { authFieldStyle, authLabelStyle, handleAuthFieldBlur, handleAuthFieldFocus } from './authStyles'

const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/** ช่วงอายุที่สมเหตุสมผล: 5–100 ปี นับจากปีปัจจุบัน */
const MIN_AGE = 5
const MAX_AGE = 100
/** พ.ศ. = ค.ศ. + 543 — แสดงเป็น พ.ศ. ตามที่คนไทยคุ้น แต่ค่าที่เก็บยังเป็น ค.ศ. (YYYY-MM-DD) เหมือนเดิม
 *  ช่วงปีที่แสดง (พ.ศ. 24xx–25xx) ไม่ทับกับตัวเลข ค.ศ. เลย ผู้ใช้จึงเลือกปีผิดระบบไม่ได้ */
const BE_OFFSET = 543

function daysInMonth(year: number, month: number): number {
  // day 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้ (จัดการปีอธิกสุรทินให้อัตโนมัติ)
  return new Date(year, month, 0).getDate()
}

function parse(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m ? { year: m[1], month: String(Number(m[2])), day: String(Number(m[3])) } : { year: '', month: '', day: '' }
}

interface BirthDatePickerProps {
  /** "YYYY-MM-DD" หรือ '' ถ้ายังเลือกไม่ครบ — รูปแบบเดียวกับ <input type="date"> เดิม */
  value: string
  onChange: (value: string) => void
  required?: boolean
}

/**
 * BirthDatePicker — เลือกวันเกิดด้วย dropdown 3 ช่อง วัน / เดือน / ปี
 * ────────────────────────────────────────────────────────────────────────────
 * แทน <input type="date"> ที่ปฏิทินของเบราว์เซอร์ต้องกดย้อนทีละเดือน/ปี (ย้อน 20–40 ปีลำบากมาก)
 * ช่องปีแสดงทุกปีในช่วงอายุ 5–100 ปีพร้อมกันทันที ส่วนช่องวันจำกัดตามจำนวนวันจริงของเดือน/ปีนั้น
 * (ไม่มี 31 ก.พ.) ส่งค่า "YYYY-MM-DD" ออกไปเฉพาะตอนเลือกครบ 3 ช่องแล้วเท่านั้น
 */
export default function BirthDatePicker({ value, onChange, required }: BirthDatePickerProps) {
  // เก็บค่าที่เลือกไว้เองระหว่างเลือกไม่ครบ (value จากภายนอกเป็น '' จนกว่าจะครบ 3 ช่อง)
  const [parts, setParts] = useState(() => parse(value))

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => currentYear - MIN_AGE - i)
  // ยังไม่เลือกปี → ใช้ปีอธิกสุรทิน (2000) คำนวณ ก.พ. จึงยังเลือก 29 ได้ แล้วค่อยตัดเหลือ 28 ถ้าปีที่เลือกไม่ใช่
  const maxDay = parts.month ? daysInMonth(Number(parts.year) || 2000, Number(parts.month)) : 31

  const update = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch }
    if (next.day && next.month) {
      const limit = daysInMonth(Number(next.year) || 2000, Number(next.month))
      if (Number(next.day) > limit) next.day = String(limit)
    }
    setParts(next)
    const complete = next.year && next.month && next.day
    onChange(complete ? `${next.year}-${next.month.padStart(2, '0')}-${next.day.padStart(2, '0')}` : '')
  }

  const selectStyle: CSSProperties = { ...authFieldStyle, padding: '13px 8px', minWidth: 0 }
  const fieldProps = { required, onFocus: handleAuthFieldFocus, onBlur: handleAuthFieldBlur, style: selectStyle }

  return (
    <div role="group" aria-labelledby="birthdate-label">
      <span id="birthdate-label" style={authLabelStyle}>วันเกิด</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .8fr) minmax(0, 1.35fr) minmax(0, 1fr)', gap: 8 }}>
        <select aria-label="วัน" value={parts.day} onChange={(e) => update({ day: e.target.value })} {...fieldProps}>
          <option value="" disabled>วัน</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="เดือน" value={parts.month} onChange={(e) => update({ month: e.target.value })} {...fieldProps}>
          <option value="" disabled>เดือน</option>
          {MONTHS_TH.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>
        <select aria-label="ปี พ.ศ." value={parts.year} onChange={(e) => update({ year: e.target.value })} {...fieldProps}>
          <option value="" disabled>ปี พ.ศ.</option>
          {years.map((y) => <option key={y} value={y}>{y + BE_OFFSET}</option>)}
        </select>
      </div>
    </div>
  )
}
