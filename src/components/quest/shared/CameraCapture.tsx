import { useEffect, useRef, useState } from 'react'
import { useAppContext } from '../../../context/AppContext'
import { playSfx } from '../../../utils/audioPlayer'
import { Z_INDEX } from '../../../config/zIndex'
import '../games/games.css'
import './CameraCapture.css'

/*============================================================================*\
  CameraCapture — [ไฟล์ใหม่] ช่องถ่ายรูปยืนยันเควส ใช้ร่วมกันได้ทุกเควสที่เปลี่ยนมาใช้
  กลไก "ถ่ายรูปยืนยัน" แทนการจับเวลา (ดู phys-pure-water, phys-photosynthesis)
  ────────────────────────────────────────────────────────────────────────────
  ดึงรูปแบบ getUserMedia เดิมที่ OracleCardsPage.tsx ใช้อยู่แล้วมาทำเป็นคอมโพเนนต์กลาง
  (เปิดกล้องจริง → พรีวิวสด → กดชัตเตอร์ → รีวิวรูปที่ถ่าย → ถ่ายใหม่/ยืนยัน) เพื่อไม่ต้อง
  เขียนโค้ดกล้องซ้ำอีกในทุกเควสที่ต้องถ่ายรูป

  [แก้รอบนี้ — ข้อ D7/D8] เดิมช่องมองภาพเป็นกล่องสี่เหลี่ยมเล็กๆ กลางจอ (min(70vw,260px))
  ดูเหมือน modal เล็กๆ — ตอนนี้เปลี่ยนเป็น position:fixed; inset:0 เต็มจอจริงๆ ซ้อนทับแม้
  กระทั่งหัวเรื่อง/คำแนะนำของ GameShell เอง (z-index ดู config/zIndex.ts) ปุ่มควบคุมกันชน
  กับ ActionMenuBar ที่ลอยทับทุกอย่างอยู่แล้ว (z-index:1000) ด้วย --gpf-safe-bottom
  โทเคนกลางตัวเดียวกับที่หน้าเควสอื่นในระบบใช้กันชนอยู่แล้วทุกจุด

  [ข้อจำกัดที่ต้องแจ้ง] รูปที่ถ่ายเก็บเป็น data URL ใน state ฝั่ง client เท่านั้น — ยังไม่มี
  การอัปโหลดขึ้น backend จริง (ไม่มี endpoint/ที่เก็บไฟล์รองรับ) เมื่อปิดเควส/รีเฟรชหน้า
  รูปจะหายไป ถ้าต้องการเก็บถาวรต้องเพิ่ม object storage + endpoint อัปโหลดฝั่ง backend ก่อน
\*============================================================================*/

interface CameraCaptureProps {
  /** ข้อความคำแนะนำเหนือช่องมองภาพ */
  hint: string
  /** เรียกเมื่อผู้ใช้กด "ยืนยัน" รูปที่ถ่าย (data URL ของภาพ) */
  onConfirm: (dataUrl: string) => void
  /** ปุ่ม "ข้าม" (ไม่บังคับ) — ไม่ใส่ = ไม่มีปุ่มข้าม */
  onSkip?: () => void
  skipLabel?: string
  /** [เพิ่มรอบนี้ — แก้บั๊กที่พบจากการทดสอบจริง] ปุ่มออกจากเควสตรงๆ (ไม่นับสำเร็จ ไม่ได้รางวัล)
   *  จำเป็นเพราะ position:fixed;inset:0 ของช่องนี้บัง "✕" ของ GameShell header ไปหมดจนกดไม่
   *  ถึงจริง (คลิกเมาส์จริงบนจอ ไม่ใช่แค่โปรแกรมยิง event ตรงๆ) — ไม่ใส่ = ไม่มีปุ่มออก */
  onExit?: () => void
}

export default function CameraCapture({ hint, onConfirm, onSkip, skipLabel = 'ข้าม', onExit }: CameraCaptureProps) {
  const { settings } = useAppContext()
  const sfxOpts = { volume: settings.sfxVolume, enabled: settings.soundEnabled }

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  /** [เพิ่มรอบนี้ — ตามที่ระบุ] เอฟเฟกแฟลชสั้นๆ ตอนถ่ายเสร็จ ก่อนโชว์รูปให้รีวิว — ให้ความรู้สึก
   *  "ถ่ายติดแล้ว" ชัดเจน แทนการสลับจากวิดีโอสดเป็นภาพนิ่งเงียบๆ ทันที (ดู .camera-capture__flash
   *  ใน CameraCapture.css) เคลียร์เองอัตโนมัติ ไม่ต้องรอผู้ใช้กดอะไร */
  const [justCaptured, setJustCaptured] = useState(false)

  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const startCameraStream = async (mode: 'user' | 'environment') => {
    stopCameraStream()
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch {
      // เข้าถึงกล้องไม่ได้ (ปฏิเสธสิทธิ์ / ไม่มีกล้อง / เบราว์เซอร์ไม่รองรับ) — ยังกด "ข้าม" ได้เสมอ
      // ถ้ามี onSkip ไม่ทำให้ผู้ใช้ติดค้างในหน้านี้
      setCameraError('เข้าถึงกล้องไม่ได้ — กรุณาอนุญาตการใช้กล้อง')
    }
  }

  // [หมายเหตุ react-hooks/set-state-in-effect] เชื่อมต่อกับ external system จริง (กล้อง/
  // getUserMedia) — เปิดกล้องตอน mount ปิดเสมอตอน unmount กัน "ไฟกล้องค้าง" เบื้องหลัง
  useEffect(() => {
    if (!capturedImage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startCameraStream(facingMode)
    }
    return () => stopCameraStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFlipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    startCameraStream(next)
  }

  const handleCapturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9))
    playSfx('CAMERA_SHUTTER', sfxOpts)
    stopCameraStream()
    setJustCaptured(true)
    window.setTimeout(() => setJustCaptured(false), 400)
  }

  const handleRetakePhoto = () => {
    setCapturedImage(null)
    startCameraStream(facingMode)
  }

  const handleConfirm = () => {
    if (!capturedImage) return
    onConfirm(capturedImage)
  }

  return (
    <div className="camera-capture" style={{ zIndex: Z_INDEX.cameraFullscreen }}>
      {onExit && (
        <button className="camera-capture__exit-btn" onClick={onExit} title="ออกจากเควส" aria-label="ออกจากเควส">
          ✕
        </button>
      )}
      {/* [แก้ตามที่ระบุ] ย้ายข้อความคำอธิบายภารกิจขึ้นไปบนสุดของ .camera-capture แทน — เดิม
          อยู่ใน .bottom-bar ร่วมกับปุ่มควบคุม ตอนนี้ปุ่มควบคุม (shutter/side/review) เป็น
          position:absolute ลอยทับใกล้ขอบล่างทั้งหมดแล้ว ทำให้ข้อความ (ซึ่งยังอยู่ใน normal
          flow ด้านบนของ .bottom-bar ที่สั้นลงมากเพราะลูกอื่นกลายเป็น absolute หมด) ไปตกอยู่
          ใกล้ขอบล่างจอเหมือนกัน จนซ้อนทับปุ่มพอดี — ย้ายมาไว้บนสุด (ใต้ navbar ในพื้นที่ที่
          top:90px/66px เว้นไว้อยู่แล้ว) ไม่มีทางชนปุ่มด้านล่างได้อีกต่อไปเพราะอยู่คนละฝั่ง */}
      <p className="camera-capture__hint">
        {cameraError ? cameraError : hint}
      </p>

      <div className="camera-capture__viewfinder">
        {capturedImage ? (
          <img src={capturedImage} alt="ภาพที่ถ่าย" className="camera-capture__captured-img" />
        ) : cameraError ? (
          <span className="camera-capture__error-icon">🚫</span>
        ) : (
          <video ref={videoRef} playsInline muted className="camera-capture__live-video" />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {justCaptured && <div className="camera-capture__flash" aria-hidden="true" />}
      </div>

      <div className="camera-capture__bottom-bar">
        {!cameraError && !capturedImage && (
          <div className="camera-capture__controls">
            {onSkip && <button className="camera-capture__side-btn" onClick={onSkip} title={skipLabel}>✕</button>}
            <button className="camera-capture__shutter-btn" onClick={handleCapturePhoto} title="ถ่ายรูป" />
            <button className="camera-capture__side-btn" onClick={handleFlipCamera} title="สลับกล้องหน้า/หลัง">🔄</button>
          </div>
        )}

        {!cameraError && capturedImage && (
          <div className="camera-capture__review-controls">
            <button className="qg-btn qg-btn--ghost" onClick={handleRetakePhoto}>↺ ถ่ายใหม่</button>
            <button className="qg-btn" onClick={handleConfirm}>✅ บันทึก</button>
          </div>
        )}

        {cameraError && onSkip && (
          <button className="qg-btn qg-btn--ghost" onClick={onSkip}>{skipLabel}</button>
        )}
      </div>
    </div>
  )
}
