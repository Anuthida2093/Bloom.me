import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
// [TS conversion] index.css มีตัวแปรสี/ธีมที่ทุก component อ้างอิง (var(--g800) ฯลฯ)
// แต่ไม่เคยถูก import ที่ไหนเลยในโปรเจกต์เดิม (ไฟล์กำพร้า) — ต่อสายตรงนี้เพื่อให้
// ธีมสีทำงานจริง ไม่ได้แก้ไขเนื้อหาไฟล์ index.css แต่อย่างใด
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('ไม่พบ element #root ใน index.html — ตรวจสอบว่า <div id="root"></div> ยังอยู่')
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