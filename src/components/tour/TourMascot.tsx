/** "ต้นกล้าสไลม์" — ไกด์ประจำทัวร์สอนใช้งาน (วาดด้วย SVG ล้วน ไม่ต้องโหลดไฟล์รูป)
 *  ตัวเจลลี่สีเขียวอ่อน มีต้นกล้า 2 ใบงอกบนหัว ขยับเด้งเบาๆ ด้วย CSS ใน TourTooltip.css */
export default function TourMascot({ size = 76 }: { size?: number }) {
  return (
    <svg className="tour-mascot" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="tour-mascot-body" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#D8F5C8" />
          <stop offset="55%" stopColor="#9ED98C" />
          <stop offset="100%" stopColor="#6DBB6A" />
        </radialGradient>
        <linearGradient id="tour-mascot-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8FD16F" />
          <stop offset="100%" stopColor="#4E9F4A" />
        </linearGradient>
      </defs>

      {/* เงาที่พื้น */}
      <ellipse className="tour-mascot__shadow" cx="50" cy="93" rx="27" ry="4.5" fill="#3B2A14" opacity="0.18" />

      <g className="tour-mascot__body">
        {/* ต้นกล้าบนหัว: ก้าน + ใบซ้าย/ขวา */}
        <g className="tour-mascot__sprout">
          <path d="M50 40 C50 32 50 27 51 21" stroke="#4E9F4A" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M51 23 C42 13 30 15 28 22 C36 28 46 27 51 23 Z" fill="url(#tour-mascot-leaf)" stroke="#3F8A3C" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M51 22 C59 10 72 10 75 17 C68 25 57 26 51 22 Z" fill="url(#tour-mascot-leaf)" stroke="#3F8A3C" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M33 21 C39 21 45 22 50 23" stroke="#C9EDB5" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8" />
          <path d="M70 16 C64 18 58 20 52 22" stroke="#C9EDB5" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8" />
        </g>

        {/* ตัวสไลม์ — ก้นแบนย้อยนิดๆ แบบเจลลี่ */}
        <path
          d="M50 37 C70 37 82 52 83 68 C84 82 76 90 62 90 C57 90 55 87 50 87 C45 87 43 90 38 90 C24 90 16 82 17 68 C18 52 30 37 50 37 Z"
          fill="url(#tour-mascot-body)" stroke="#4E9F4A" strokeWidth="2.4" strokeLinejoin="round"
        />
        {/* ไฮไลท์เงาวาวแบบเจลลี่ */}
        <ellipse cx="34" cy="52" rx="7" ry="4.5" fill="#FFFFFF" opacity="0.6" transform="rotate(-28 34 52)" />
        <circle cx="42" cy="46" r="2" fill="#FFFFFF" opacity="0.65" />

        {/* ตา */}
        <g className="tour-mascot__eyes">
          <ellipse cx="40" cy="66" rx="4.2" ry="5.2" fill="#2E3B2A" />
          <ellipse cx="60" cy="66" rx="4.2" ry="5.2" fill="#2E3B2A" />
          <circle cx="41.6" cy="64" r="1.6" fill="#FFFFFF" />
          <circle cx="61.6" cy="64" r="1.6" fill="#FFFFFF" />
        </g>
        {/* แก้มชมพู + ปากยิ้ม */}
        <ellipse cx="31" cy="74" rx="5" ry="3" fill="#F49AA6" opacity="0.6" />
        <ellipse cx="69" cy="74" rx="5" ry="3" fill="#F49AA6" opacity="0.6" />
        <path d="M45 74 C47 78 53 78 55 74" stroke="#2E3B2A" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}
