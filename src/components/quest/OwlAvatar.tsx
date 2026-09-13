

const C_1 = '#D08A3E'
const C_2 = '#D08A3E'
const C_3 = '#A0714F'
const C_4 = '#EDD9B8'
const C_5 = '#A0714F'
const C_6 = '#A0714F'
const C_7 = '#3D405B'
const C_8 = '#3D405B'
const C_9 = '#F4A340'
const STROKE_1 = C_1
const STROKE_2 = C_2
const FILL_3 = C_3
const FILL_4 = C_4
const FILL_5 = C_5
const FILL_6 = C_6
const FILL_7 = C_7
const FILL_8 = C_8
const FILL_9 = C_9

interface OwlAvatarProps {
  /** true ระหว่างที่กำลัง "เดิน" ไปยัง node ถัดไป (ตอนเควสเพิ่งสำเร็จ) — ขยับขาสลับ + เอียงตัวเดิน
   *  false = ยืนนิ่งเฉยๆ ที่ node ปัจจุบัน (แค่หายใจ/กระพือปีกเบาๆ) */
  walking?: boolean
  size?: number
}

/**
 * OwlAvatar — [ตามที่ขอ] "avatar เป็นนกฮูกเดินน่ารัก" แทนลูกแก้วเรืองแสงที่ระบุไว้ใน spec เดิม
 * วาดเป็น inline SVG ล้วนๆ (ไม่ต้องพึ่ง asset ภาพ) โทนสีน้ำตาล/ครีมเข้ากับธีมป่า
 */
export default function OwlAvatar({ walking = false, size = 44 }: OwlAvatarProps) {
  return (
    <div
      className={`owl-avatar ${walking ? 'owl-avatar--walking' : 'owl-avatar--idle'}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 60 60" width="100%" height="100%">
        {/* เงาใต้ตัว */}
        <ellipse cx="30" cy="54" rx="14" ry="3.5" fill="var(--glass-b-22)" />

        {/* ขา (2 ข้าง สลับขยับตอนเดิน) */}
        <g className="owl-avatar__leg owl-avatar__leg--left">
          <line x1="24" y1="46" x2="22" y2="52" stroke={STROKE_1} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="owl-avatar__leg owl-avatar__leg--right">
          <line x1="36" y1="46" x2="38" y2="52" stroke={STROKE_2} strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* ตัว */}
        <ellipse cx="30" cy="34" rx="19" ry="20" fill={FILL_3} />
        <ellipse cx="30" cy="37" rx="13" ry="14" fill={FILL_4} />

        {/* ปีก (กระพือ) */}
        <g className="owl-avatar__wing owl-avatar__wing--left">
          <ellipse cx="14" cy="32" rx="6" ry="11" fill="var(--b500)" transform="rotate(-12 14 32)" />
        </g>
        <g className="owl-avatar__wing owl-avatar__wing--right">
          <ellipse cx="46" cy="32" rx="6" ry="11" fill="var(--b500)" transform="rotate(12 46 32)" />
        </g>

        {/* หูสองข้างด้านบน */}
        <path d="M18 16 L14 4 L24 12 Z" fill={FILL_5} />
        <path d="M42 16 L46 4 L36 12 Z" fill={FILL_6} />

        {/* หน้า — ตากลมโต */}
        <circle cx="22" cy="26" r="8.5" fill="var(--fixed-white)" />
        <circle cx="38" cy="26" r="8.5" fill="var(--fixed-white)" />
        <circle cx="22" cy="27" r="4.2" fill={FILL_7} />
        <circle cx="38" cy="27" r="4.2" fill={FILL_8} />
        <circle cx="23.2" cy="25.5" r="1.2" fill="var(--fixed-white)" />
        <circle cx="39.2" cy="25.5" r="1.2" fill="var(--fixed-white)" />

        {/* จะงอยปาก */}
        <path d="M27 32 L33 32 L30 37 Z" fill={FILL_9} />

        {/* คิ้ว/ท่าทางน่ารัก */}
        <path d="M16 20 Q22 15 27 19" stroke="var(--b500)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M44 20 Q38 15 33 19" stroke="var(--b500)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>

      <style>{`
        .owl-avatar { position: relative; filter: drop-shadow(0 4px 8px var(--glass-b-30)); }

        .owl-avatar--idle { animation: owlAvatarBreathe 2.2s ease-in-out infinite; }
        @keyframes owlAvatarBreathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(1.03); }
        }

        .owl-avatar--walking { animation: owlAvatarBob 0.32s ease-in-out infinite; }
        @keyframes owlAvatarBob {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-5px) rotate(3deg); }
        }

        .owl-avatar__wing { transform-origin: center; animation: owlAvatarWingFlap 1.4s ease-in-out infinite; transform-box: fill-box; }
        .owl-avatar--walking .owl-avatar__wing { animation-duration: 0.32s; }
        .owl-avatar__wing--right { animation-delay: .1s; }
        @keyframes owlAvatarWingFlap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.82); }
        }

        .owl-avatar__leg { transform-origin: top center; transform-box: fill-box; }
        .owl-avatar--walking .owl-avatar__leg--left { animation: owlAvatarStepLeft 0.32s ease-in-out infinite; }
        .owl-avatar--walking .owl-avatar__leg--right { animation: owlAvatarStepRight 0.32s ease-in-out infinite; }
        @keyframes owlAvatarStepLeft {
          0%, 100% { transform: rotate(-18deg); }
          50% { transform: rotate(18deg); }
        }
        @keyframes owlAvatarStepRight {
          0%, 100% { transform: rotate(18deg); }
          50% { transform: rotate(-18deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .owl-avatar--idle, .owl-avatar--walking, .owl-avatar__wing,
          .owl-avatar__leg--left, .owl-avatar__leg--right { animation: none; }
        }
      `}</style>
    </div>
  )
}