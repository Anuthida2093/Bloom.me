import { MBTI_TREE_THEME, type MbtiTreeTheme } from '../../types'
import './MiniTree.css'

interface MiniTreeProps {
  theme?: MbtiTreeTheme
  size?: number
  full?: boolean
  /** เปิด idle animation (หายใจ/ใบไม้ไหวเบาๆ) — ปิดได้ถ้าต้องโชว์หลายสิบต้นพร้อมกันแล้วกลัวหนักเครื่อง */
  animated?: boolean
}

export default function MiniTree({ theme = MBTI_TREE_THEME.INFP, size = 80, full = false, animated = true }: MiniTreeProps) {
  const s = size;
  const h = full ? s * 1.3 : s;
  const cx = s / 2;

  const r1 = s * 0.36;
  const r2 = s * 0.28;
  const r3 = s * 0.22;

  const trunkW = s * 0.12;
  const trunkH = s * 0.28;
  const ty = h * 0.55;

  // จุดหมุน/สเกลของทรงพุ่ม (crown) — ใช้พิกัด px จริงแทนคำว่า "center" เพราะ
  // transform-origin แบบเปอร์เซ็นต์บน SVG element มีพฤติกรรมไม่ตรงกันระหว่างเบราว์เซอร์
  // เก่าๆ (ต้องพึ่ง transform-box: fill-box เพิ่ม) พิกัด px ตรงๆ ชัวร์กว่าและเข้าใจง่ายกว่า
  const crownOriginX = cx;
  const crownOriginY = ty - r1 * 0.6;

  return (
    // wrapper div ทำหน้าที่ "หายใจ" (scale ทั้งต้นเบาๆ) — แยกจาก <g> ใน SVG ที่ทำหน้าที่
    // "ใบไม้ไหว" (rotate เฉพาะทรงพุ่ม) เพื่อให้ 2 แอนิเมชันซ้อนกันแบบเป็นธรรมชาติ ไม่ล็อกจังหวะเดียวกัน
    <div className={`mini-tree-wrap ${animated ? 'mini-tree-wrap--breathing' : ''}`} style={{ width: s, height: h }}>
      <svg
        viewBox={`0 0 ${s} ${h}`}
        width={s}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
      >
        <radialGradient
          id={`lg${s}`}
          cx="40%"
          cy="35%"
          r="60%"
        >
          <stop
            offset="0%"
            stopColor={
              theme.leaves[2] ?? theme.leaves[0]
            }
            stopOpacity="1"
          />
        </radialGradient>

        {/* Shadow */}
        <ellipse
          cx={cx}
          cy={h - 4}
          rx={s * 0.3}
          ry={4}
          fill="var(--glass-b-12)"
        />

        {/* Pot */}
        {full && (
          <>
            <path
              d={`
                M${cx - s * 0.18} ${ty + trunkH * 0.4}
                Q${cx - s * 0.22} ${ty + trunkH * 0.8}
                ${cx} ${ty + trunkH * 0.9}
                Q${cx + s * 0.22} ${ty + trunkH * 0.8}
                ${cx + s * 0.18} ${ty + trunkH * 0.4}
                Z
              `}
              fill={theme.pot}
            />

            <ellipse
              cx={cx}
              cy={ty + trunkH * 0.4}
              rx={s * 0.2}
              ry={s * 0.06}
              fill={theme.pot}
              opacity=".8"
            />

            <ellipse
              cx={cx}
              cy={ty + trunkH * 0.4}
              rx={s * 0.2}
              ry={s * 0.06}
              fill="var(--glass-b-15)"
            />
          </>
        )}

        {/* Trunk — ไม่ขยับ (ลำต้นควรนิ่ง มีแต่ทรงพุ่มที่ไหว) */}
        <rect
          x={cx - trunkW / 2}
          y={ty - trunkH * 0.1}
          width={trunkW}
          height={trunkH}
          rx={trunkW / 2}
          fill={theme.trunk}
        />

        {/* Trunk highlight */}
        <rect
          x={cx - trunkW * 0.2}
          y={ty}
          width={trunkW * 0.3}
          height={trunkH * 0.7}
          rx={trunkW * 0.15}
          fill="var(--glass-w-22)"
        />

        {/* ── ทรงพุ่ม (ใบ+ดอก) ทั้งหมดอยู่ใน <g> เดียว ให้ไหวไปด้วยกันเป็นก้อนเดียว ── */}
        <g
          className={animated ? 'mini-tree__crown mini-tree__crown--swaying' : 'mini-tree__crown'}
          style={{ transformOrigin: `${crownOriginX}px ${crownOriginY}px` }}
        >
          {/* Leaves — layered circles for depth */}
          <circle
            cx={cx}
            cy={ty - r1 * 0.6}
            r={r1}
            fill={`url(#lg${s})`}
          />

          <circle
            cx={cx - r2 * 0.5}
            cy={ty - r1 * 0.2}
            r={r2}
            fill={theme.leaves[1] ?? theme.leaves[0]}
            opacity=".9"
          />

          <circle
            cx={cx + r2 * 0.5}
            cy={ty - r1 * 0.25}
            r={r2 * 0.85}
            fill={theme.leaves[1] ?? theme.leaves[0]}
            opacity=".85"
          />

          {/* Crown highlight */}
          <circle
            cx={cx - r3 * 0.3}
            cy={ty - r1 * 0.8}
            r={r3 * 0.7}
            fill={theme.leaves[2] ?? theme.leaves[0]}
            opacity=".55"
          />

          <circle
            cx={cx - r3 * 0.4}
            cy={ty - r1 * 0.85}
            r={r3 * 0.35}
            fill="var(--glass-w-30)"
          />

          {/* Flowers */}
          {theme.flowers.slice(0, 3).map((fc, i) => {
            const fx =
              cx + [-r1 * 0.4, r1 * 0.3, r1 * 0.05][i];

            const fy =
              ty - r1 * [0.95, 0.75, 1.15][i];

            return (
              <g key={i}>
                <circle
                  cx={fx}
                  cy={fy}
                  r={s * 0.055}
                  fill={fc}
                />

                <circle
                  cx={fx}
                  cy={fy}
                  r={s * 0.025}
                  fill="var(--glass-w-70)"
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}