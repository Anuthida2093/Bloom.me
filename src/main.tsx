// ต้องเป็นบรรทัดแรก: ล้างข้อมูลทดลองเก่าในเครื่องครั้งเดียว ก่อนโมดูลอื่นอ่าน localStorage (utils/resetLocalData.ts)
import './utils/resetLocalData'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
// [TS conversion] index.css มีตัวแปรสี/ธีมที่ทุก component อ้างอิง (var(--g800) ฯลฯ)
// แต่ไม่เคยถูก import ที่ไหนเลยในโปรเจกต์เดิม (ไฟล์กำพร้า) — ต่อสายตรงนี้เพื่อให้
// ธีมสีทำงานจริง ไม่ได้แก้ไขเนื้อหาไฟล์ index.css แต่อย่างใด
import './index.css'

/* [แก้ตามที่ระบุ] ห้ามซูมทั้งหน้าเว็บด้วยสองนิ้ว/แตะสองครั้ง (iPhone/Android) — ทำให้ปุ่มด้านข้างหลุดขอบจอ
   meta viewport user-scalable=no ใช้ได้กับ Android แต่ Safari บน iOS ไม่สนใจ จึงกัน gesture ของ Safari ตรงนี้ด้วย
   (การบีบซูมที่แอปเขียนเอง เช่น แผนที่/ไอเทมบนต้นไม้ ใช้ Pointer Events ไม่โดนผลกระทบ) */
const blockPageZoom = (e: Event) => e.preventDefault()
document.addEventListener('gesturestart', blockPageZoom, { passive: false })
document.addEventListener('gesturechange', blockPageZoom, { passive: false })
document.addEventListener('gestureend', blockPageZoom, { passive: false })
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault() }, { passive: false })

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('ไม่พบ element #root ใน index.html ตรวจสอบว่า <div id="root"></div> ยังอยู่')
}

// [ข้อกำหนดข้อ 1] BrowserRouter ครอบ App ที่นี่ — ให้ useNavigate/Routes ใน App.tsx
// และหน้า Login/MBTISelect ทำงานได้ทั่วทั้งแอป
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)