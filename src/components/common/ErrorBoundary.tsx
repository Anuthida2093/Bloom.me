import { Component, type ErrorInfo, type ReactNode } from 'react'
import './ErrorBoundary.css'

/*============================================================================*\
  ErrorBoundary — [ไฟล์ใหม่] กันจอขาวทั้งแอป
  ────────────────────────────────────────────────────────────────────────────
  เดิมถ้าคอมโพเนนต์ไหน throw ระหว่างเรนเดอร์ (เช่น อ่าน property ของ null
  จาก API ที่คืนรูปแบบไม่ตรงคาด) React จะถอด tree ทิ้งทั้งต้น → ผู้ใช้เห็นจอขาวเปล่า
  โดยไม่รู้ว่าเกิดอะไรขึ้นและกดอะไรต่อไม่ได้เลย ซึ่งรับไม่ได้สำหรับโปรดักชัน

  ข้อความที่แสดงยึดหลัก: บอกว่าเกิดอะไรขึ้นและทำอะไรต่อได้ ไม่ขอโทษพร่ำเพรื่อ
  และไม่โยนศัพท์เทคนิคใส่ผู้ใช้ (รายละเอียด error เปิดดูได้แต่พับไว้)
\*============================================================================*/

interface Props {
  children: ReactNode
  /** ชื่อส่วนที่พัง เพื่อให้ข้อความเจาะจงขึ้น เช่น "ระบบเควส" */
  scope?: string
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // จุดเดียวที่ควรต่อสาย error reporting (Sentry ฯลฯ) เมื่อขึ้นโปรดักชันจริง
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', this.props.scope ?? 'app', error, info.componentStack)
    }
  }

  private handleReset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const scopeLabel = this.props.scope ? `ส่วน "${this.props.scope}"` : 'หน้านี้'

    return (
      <div className="crash" role="alert">
        <div className="crash__card">
          <h2 className="crash__title">{scopeLabel} โหลดไม่สำเร็จ</h2>
          <p className="crash__body">
            ข้อมูลที่คุณบันทึกไว้ยังอยู่ครบ ลองกดโหลดใหม่อีกครั้ง
            ถ้ายังเจอปัญหาเดิม ให้รีเฟรชหน้าเว็บ
          </p>
          <div className="crash__actions">
            <button className="crash__btn crash__btn--primary" onClick={this.handleReset}>
              โหลดส่วนนี้ใหม่
            </button>
            <button className="crash__btn" onClick={() => window.location.reload()}>
              รีเฟรชทั้งหน้า
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className="crash__details">
              <summary>รายละเอียดสำหรับนักพัฒนา</summary>
              <pre>{error.message}{'\n'}{error.stack}</pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}