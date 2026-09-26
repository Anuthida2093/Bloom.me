import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './CameraCapture.css'
import { BADGE_ICONS } from '../../../config/iconAssets'

interface CameraCaptureProps {
  onSave: (imageSrc: string) => void
  onCancel?: () => void
}

export default function CameraCapture({ onSave, onCancel }: CameraCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(true)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  
  // State สำหรับสลับกล้องหน้า/หลัง (เริ่มต้นที่กล้องหลัง)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Effect ทำงานเมื่อ isCapturing หรือ facingMode เปลี่ยนแปลง
  useEffect(() => {
    // ย้ายฟังก์ชันเปิด/ปิดกล้องเข้ามาไว้ด้านในเพื่อแก้ปัญหา ESLint exhaustive-deps
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode } // ผูกกับ State
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error("ไม่สามารถเข้าถึงกล้องได้:", err)
        alert("ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้องของคุณ")
      }
    }

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }

    if (isCapturing) {
      startCamera()
    } else {
      stopCamera()
    }
    
    // Cleanup เสมอเมื่อ component ถูก unmount หรือก่อนที่ effect จะรันใหม่
    return () => stopCamera()
  }, [isCapturing, facingMode])

  // สลับกล้อง
  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  // ถ่ายรูป
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // หากเป็นกล้องหน้า (user) ให้กลับซ้ายขวา (Mirror) ก่อนวาดลง Canvas
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setImageSrc(dataUrl)
        setIsCapturing(false)
      }
    }
  }

  // อัปโหลดรูปจากแกลเลอรี
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string)
          setIsCapturing(false) // ไปหน้าพรีวิว
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRetake = () => {
    setImageSrc(null)
    setIsCapturing(true)
  }

  const handleSave = () => {
    if (imageSrc) {
      onSave(imageSrc)
    }
  }

  // ---------------------------------------------------------
  // โหมดที่ 1: หน้าจอถ่ายรูปแบบ 100% เต็มจอ
  // ---------------------------------------------------------
  if (isCapturing) {
    const cameraUI = (
      <div className="camera-fullscreen-container">
        {/* วิดีโอกล้อง */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`camera-fullscreen-video ${facingMode === 'user' ? 'camera-mirrored' : ''}`} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          style={{ display: 'none' }} 
        />

        {/* ปุ่มกลับมุมซ้ายบน */}
        {onCancel && (
          <button className="camera-btn-back-top-left" onClick={onCancel} title="กลับ" aria-label="กลับ">
            <img src={BADGE_ICONS.back} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </button>
        )}
        
        {/* แถบเครื่องมือด้านล่าง */}
        <div className="camera-controls-bottom">
          {/* ซ้าย: แกลเลอรี */}
          <button className="camera-btn-side" onClick={() => fileInputRef.current?.click()} aria-label="เลือกรูปจากแกลเลอรี">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          {/* กลาง: ปุ่มถ่ายรูป */}
          <div className="camera-shutter-wrapper">
            <button className="camera-shutter-btn" onClick={handleCapture} aria-label="ถ่ายรูป" />
          </div>

          {/* ขวา: สลับกล้อง */}
          <button className="camera-btn-side" onClick={toggleCamera} aria-label="สลับกล้อง">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 4v5h-5M4 20v-5h5M20 9l-2.5-2.5C15.6 4.6 13 3.5 10 4c-3.7.6-6.6 3.5-7.2 7.2M4 15l2.5 2.5c1.9 1.9 4.5 3 7.5 2.5 3.7-.6 6.6-3.5 7.2-7.2"/>
            </svg>
          </button>
        </div>
      </div>
    )

    // ใช้ createPortal ย้าย UI ไปไว้ระดับสูงสุดทับหน้าจอทั้งหมด
    return createPortal(cameraUI, document.body)
  }

  // ---------------------------------------------------------
  // โหมดที่ 2: หน้าจอพรีวิวหลังจากถ่ายเสร็จ
  // ---------------------------------------------------------
  return (
    <div className="camera-preview-container">
      <div className="camera-preview-card">
        {imageSrc && <img src={imageSrc} alt="Captured preview" className="camera-preview-image" />}
        <div className="camera-preview-actions">
          <button className="camera-btn-retake" onClick={handleRetake}>
            ↺ ถ่ายใหม่
          </button>
          <button className="camera-btn-save" onClick={handleSave}>
            ✓ บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}