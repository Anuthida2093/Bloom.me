import { useEffect } from 'react'

/**
 * useLockBodyScroll
 * ──────────────────
 * บั๊กเดิม: เวลาเปิด modal ใดๆ (คลังไอเทม, เควส, ร้านค้า ฯลฯ) ที่เนื้อหาใน modal
 * สูงกว่าจอ document.body จะถูกดันให้สูงขึ้นจนเกิด scrollbar แนวตั้ง เบราว์เซอร์จึง
 * ลดความกว้างของ viewport ที่ใช้ได้จริงลง (เพราะ scrollbar แย่งพื้นที่ไปหลักสิบ px)
 *
 * ฝั่ง TreeOfLife (tree_progress.tsx) ใช้ ResizeObserver จับขนาด container จริง
 * เพื่อ resizeCanvas ของ p5 — พอความกว้าง container เปลี่ยนแม้เพียงเล็กน้อย
 * ต้นไม้ทั้งภาพ (ที่คำนวณสัดส่วนทุกอย่างจาก w/h ใหม่) จะถูกวาดใหม่ในสัดส่วนที่ต่างไป
 * ทำให้ "ดูเหมือนต้นไม้/ฉากหลังขยาย (zoom)" ทันทีที่ modal เปิด — ทั้งที่ไม่มี CSS
 * scale หรือ Framer Motion ใดๆ เกี่ยวข้องเลย ต้นตอจริงคือ layout shift จาก scrollbar
 *
 * วิธีแก้: ล็อกไม่ให้ body scroll ได้เลยตอน modal เปิด (position: fixed ที่ body)
 * พร้อมชดเชยความกว้าง scrollbar เดิมด้วย padding-right ชั่วคราว กัน content
 * ขยับ/กระพริบตอนล็อก-ปลดล็อก แล้วคืนค่าตำแหน่ง scroll เดิมเป๊ะตอนปิด modal
 *
 * [แก้บั๊กร้ายแรง — พบจากการทดสอบจริงผ่านเบราว์เซอร์] เดิม hook นี้ล็อก body ทันทีที่
 * component ที่เรียกมัน "mount" โดยไม่สนใจว่า modal นั้นกำลังเปิดอยู่จริงหรือไม่ — ใช้ได้
 * กับ 19 จุดเรียกเดิมที่ล้วน mount เฉพาะตอน modal เปิดอยู่แล้ว (พาเรนต์ conditional render
 * ให้) แต่ Overlay.tsx (ใช้โดย GameAlert) เรียก useLockBodyScroll() แบบไม่มีเงื่อนไขเช่นกัน
 * ทั้งที่ตัว Overlay ถูกออกแบบให้ "mount ค้างตลอด" แล้วสลับแค่ prop `open` (เพื่อให้
 * framer-motion เล่นแอนิเมชัน exit ได้) — พอ Dashboard.tsx เพิ่ม <GameAlert> แบบ mount
 * ค้างตลอดเวลา (สำหรับปุ่มแชร์/เพื่อน/โพสต์) body เลยถูกล็อก (position:fixed) ทันทีที่
 * เปิดแอป "ตลอดไป" แม้ไม่มี modal ไหนเปิดอยู่เลย — ทำให้ปุ่มลอย (position:fixed) อื่นๆ
 * ทั่วทั้งแอปคำนวณตำแหน่งผิดเพี้ยน (ตรวจสอบจริงผ่าน DevTools: body ค้างที่ position:fixed
 * ตั้งแต่โหลดหน้าเสร็จ ทำให้ปุ่มโพสต์/เพื่อนหลุดออกนอกจอมองไม่เห็น กดไม่โดน) เพิ่มพารามิเตอร์
 * `enabled` ให้ผู้เรียกที่ mount ค้างแบบ Overlay ควบคุมได้ตรงๆ ว่าจะล็อกจริงเมื่อไหร่ —
 * ค่า default เป็น true คงพฤติกรรมเดิมของ 19 จุดเรียกที่เหลือไว้ทั้งหมด ไม่ต้องแก้อะไร
 */
export function useLockBodyScroll(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return
    const { body } = document
    const scrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.left = previous.left
      body.style.right = previous.right
      body.style.width = previous.width
      body.style.paddingRight = previous.paddingRight
      window.scrollTo(0, scrollY)
    }
  }, [enabled])
}