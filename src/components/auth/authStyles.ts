import type { CSSProperties, FocusEvent, MouseEvent } from 'react'

/*============================================================================*\
  authStyles — สไตล์กลางของหน้า auth ทั้งชุด (Login / Register / ForgotPassword / ResetPassword)
  ────────────────────────────────────────────────────────────────────────────
  เดิมแต่ละหน้าก็อปชุด fieldStyle/labelStyle/การ์ด/ปุ่ม/กล่อง error ของตัวเอง และฮาร์ดโค้ด
  ชื่อฟอนต์ ('Fredoka One'/'Nunito') + สี rgba ตรงๆ ทำให้ค่อยๆ เพี้ยนออกจากกัน (Register เป็น
  การ์ดขาวทึบ ส่วนหน้าอื่นเป็นกระจก) — รวมไว้ที่เดียว ฟอนต์ผ่าน --font-display/--font-body
  สีเขียวผสมจาก --g400/--g700 (สองตัวนี้ไม่กลับสีตอน dark mode) ด้วย color-mix()
\*============================================================================*/

/** สีตัวอักษรในช่องกรอก — ตายตัวไม่ผูกธีม เพราะพื้นช่องกรอก (--glass-w-85/96) เป็นขาวเสมอทั้ง 2 โหมด
 *  (--n900 กลับเป็นสีอ่อนตอน dark mode จะกลายเป็นขาวบนขาว — ไม่มีโทเคนเข้มแบบไม่กลับสีให้ใช้) */
export const AUTH_FIELD_TEXT = '#1a2e22'

const g400 = (pct: number) => `color-mix(in srgb, var(--g400) ${pct}%, transparent)`
const g700 = (pct: number) => `color-mix(in srgb, var(--g700) ${pct}%, transparent)`
const red = (pct: number) => `color-mix(in srgb, var(--red) ${pct}%, transparent)`

// glow สีเขียวสไตล์เกม/อนิเมะตอน focus ช่องกรอก — inline handler แทน CSS :focus ตามแบบเดิมของโปรเจกต์
const FOCUS_GLOW = `0 0 0 4px ${g400(35)}, 0 0 18px ${g400(55)}`

export const authFieldStyle: CSSProperties = {
  width: '100%', marginTop: 6, padding: '13px 16px', borderRadius: 16,
  border: '2px solid var(--glass-w-50)', fontSize: 14, fontFamily: 'var(--font-body)',
  outline: 'none', background: 'var(--glass-w-85)', color: AUTH_FIELD_TEXT,
  boxShadow: 'none', transition: 'all .3s ease',
}

export const authLabelStyle: CSSProperties = {
  fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-body)',
  color: 'var(--fixed-white)', textShadow: '0 1px 4px var(--glass-b-40)',
}

export function handleAuthFieldFocus(e: FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.boxShadow = FOCUS_GLOW
  e.target.style.borderColor = g400(90)
  e.target.style.background = 'var(--glass-w-96)'
}
export function handleAuthFieldBlur(e: FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.boxShadow = 'none'
  e.target.style.borderColor = 'var(--glass-w-50)'
  e.target.style.background = 'var(--glass-w-85)'
}

/** การ์ดฟอร์มกระจก (glassmorphic) */
export const authCardStyle: CSSProperties = {
  background: 'var(--glass-w-16)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 24,
  padding: 'clamp(1.5rem, 6vw, 2rem) clamp(1.25rem, 5vw, 1.75rem)',
  boxShadow: '0 20px 50px var(--glass-b-25), inset 0 1px 0 var(--glass-w-30)',
  border: '2px solid var(--glass-w-60)',
  fontFamily: 'var(--font-body)',
}

const PRIMARY_SHADOW = `0 8px 24px ${g700(40)}`

/** ปุ่มหลักทรงแคปซูล — disabled = จางลง + cursor not-allowed */
export function authPrimaryButtonStyle(disabled = false): CSSProperties {
  return {
    padding: '15px 24px', border: 'none', borderRadius: 999,
    background: 'linear-gradient(135deg, var(--g400) 0%, var(--g700) 100%)',
    color: 'var(--fixed-white)', fontFamily: 'var(--font-display)', fontSize: 18,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    boxShadow: PRIMARY_SHADOW, marginTop: 6,
    transition: 'transform .18s ease, box-shadow .18s ease',
  }
}

// hover ขยาย+เรืองแสง, กดแล้วย่อลงเล็กน้อยให้รู้สึกกดจริง (tactile feedback) — กระจายใส่ปุ่มด้วย {...authPrimaryButtonHandlers}
export const authPrimaryButtonHandlers = {
  onMouseEnter: (e: MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.disabled) return
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
    e.currentTarget.style.boxShadow = `0 10px 30px ${g700(55)}, 0 0 22px ${g400(50)}`
  },
  onMouseLeave: (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'none'
    e.currentTarget.style.boxShadow = PRIMARY_SHADOW
  },
  onMouseDown: (e: MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.disabled) return
    e.currentTarget.style.transform = 'translateY(1px) scale(0.98)'
  },
  onMouseUp: (e: MouseEvent<HTMLButtonElement>) => {
    if (e.currentTarget.disabled) return
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
  },
}

/** กล่องข้อความ error ใต้ฟอร์ม — แดงโปร่งบนการ์ดกระจก */
export const authErrorBoxStyle: CSSProperties = {
  background: red(18), border: `1.5px solid ${red(55)}`,
  borderRadius: 12, padding: '10px 14px', color: 'var(--fixed-white)', fontSize: 13, fontWeight: 700,
}

/** ลิงก์ขาวขีดเส้นใต้บนการ์ดกระจก (เช่น "สมัครสมาชิก", "เข้าสู่ระบบ") */
export const authLinkStyle: CSSProperties = { color: 'var(--fixed-white)', fontWeight: 800, textDecoration: 'underline' }

/** ข้อความรองในการ์ด (เช่น "ยังไม่มีบัญชี?") */
export const authMutedTextStyle: CSSProperties = { textAlign: 'center', fontSize: 13, color: 'var(--glass-w-85)' }
