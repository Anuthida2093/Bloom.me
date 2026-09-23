import { useEffect } from 'react'
import './MapFogTransition.css'

// เพิ่มเวลาเป็น 1800ms เพื่อให้หมอกคลุมจอได้นานพอที่จะเปลี่ยนแมพด้านหลังแบบเนียนๆ
const FOG_DURATION_MS = 1800 

interface MapFogTransitionProps {
  onDone: () => void
}

export default function MapFogTransition({ onDone }: MapFogTransitionProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, FOG_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return <div className="map-fog-transition" aria-hidden="true" />
}