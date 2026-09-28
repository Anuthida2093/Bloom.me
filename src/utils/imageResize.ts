/** [เพิ่มตามที่ระบุ] ย่อรูปก่อนแนบโพสต์ (แนบได้ถึง 20 รูป) — ด้านยาวไม่เกิน maxSide px, บีบเป็น JPEG
 *  ลดขนาดข้อมูลลงมาก (รูปมือถือ 3-5MB → ราว 150-300KB) ไม่ให้ที่เก็บในเครื่อง/การส่งขึ้นเซิร์ฟเวอร์เต็ม */
export function resizeImageFile(file: File, maxSide = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : ''
      const img = new Image()
      img.onerror = () => resolve(src)
      img.onload = () => {
        const ratio = Math.min(1, maxSide / Math.max(img.width, img.height))
        const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(src); return }
        ctx.drawImage(img, 0, 0, w, h)
        try { resolve(canvas.toDataURL('image/jpeg', quality)) } catch { resolve(src) }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}
