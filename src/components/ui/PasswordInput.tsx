import { useState, type CSSProperties, type FocusEventHandler } from 'react'

/*============================================================================*\
  PasswordInput — [ไฟล์ใหม่ — ข้อ 4] input type="password" พร้อมปุ่ม "แสดง/ซ่อนรหัสผ่าน"
  ────────────────────────────────────────────────────────────────────────────
  รวมไว้ที่เดียวเพราะฟอร์ม login/register/ลืมรหัสผ่าน/เปลี่ยนรหัสผ่าน ต้องมีปุ่มนี้ทุกจุด
  ตามมาตรฐาน UX ทั่วไป — รับ `style` ของ input จากภายนอกได้ (แต่ละหน้าใช้ inline style
  คนละชุดตามแบบเดิมของโปรเจกต์) ไม่ผูกกับ CSS class ใดๆ
\*============================================================================*/

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: CSSProperties
  onFocus?: FocusEventHandler<HTMLInputElement>
  onBlur?: FocusEventHandler<HTMLInputElement>
  required?: boolean
  name?: string
  autoComplete?: string
  id?: string
}

export default function PasswordInput({
  value, onChange, placeholder, style, onFocus, onBlur, required, name, autoComplete, id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        style={{ ...style, paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 17, opacity: 0.75,
        }}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}
