// [ไฟล์ auto-generate — ตามที่ระบุรอบนี้ ข้อ 2] อย่าแก้มือ รันใหม่ด้วย
// node scripts/extract-canopy-tip.mjs ถ้าไฟล์ trunk เปลี่ยน
//
// จุดปลายสุด (tip) และขอบล่างสุด (ground) ของแต่ละไฟล์ trunk (% ของขนาดภาพไฟล์นั้น) —
// ใช้แทนระบบ branch-tip/skeletonize เดิมทั้งหมดสำหรับงาน "หาตำแหน่งวางทรงพุ่มวงกลม" ใน
// TreeOfLife.tsx (ดู canopyCenter/canopyRadius ที่นั่น)

export interface CanopyTipPoint {
  tipXPct: number
  tipYPct: number
  groundYPct: number
}

export const CANOPY_TIP_POINTS: Record<string, Record<number, CanopyTipPoint>> = {
  "A": {
    "1": {
      "tipXPct": 38.4,
      "tipYPct": 22,
      "groundYPct": 77.5
    },
    "2": {
      "tipXPct": 38,
      "tipYPct": 14.1,
      "groundYPct": 88
    },
    "3": {
      "tipXPct": 60,
      "tipYPct": 5.6,
      "groundYPct": 94.2
    },
    "4": {
      "tipXPct": 45.1,
      "tipYPct": 7.6,
      "groundYPct": 94.4
    },
    "5": {
      "tipXPct": 35.9,
      "tipYPct": 8.3,
      "groundYPct": 95.1
    },
    "6": {
      "tipXPct": 57.2,
      "tipYPct": 6.5,
      "groundYPct": 97.2
    },
    "7": {
      "tipXPct": 49.8,
      "tipYPct": 5.1,
      "groundYPct": 95.8
    },
    "8": {
      "tipXPct": 63.2,
      "tipYPct": 3.2,
      "groundYPct": 96.8
    }
  },
  "B": {
    "1": {
      "tipXPct": 36.3,
      "tipYPct": 12,
      "groundYPct": 90.3
    },
    "2": {
      "tipXPct": 40,
      "tipYPct": 8.3,
      "groundYPct": 91.7
    },
    "3": {
      "tipXPct": 44,
      "tipYPct": 5.6,
      "groundYPct": 92.8
    },
    "4": {
      "tipXPct": 64.1,
      "tipYPct": 4.2,
      "groundYPct": 95.8
    },
    "5": {
      "tipXPct": 62,
      "tipYPct": 4.2,
      "groundYPct": 95.8
    },
    "6": {
      "tipXPct": 45.8,
      "tipYPct": 4.6,
      "groundYPct": 95.1
    },
    "7": {
      "tipXPct": 48.4,
      "tipYPct": 4.6,
      "groundYPct": 95.8
    },
    "8": {
      "tipXPct": 57.6,
      "tipYPct": 3.2,
      "groundYPct": 95.8
    }
  },
  "C": {
    "1": {
      "tipXPct": 56.9,
      "tipYPct": 8.6,
      "groundYPct": 93.1
    },
    "2": {
      "tipXPct": 50.7,
      "tipYPct": 3.2,
      "groundYPct": 96.1
    },
    "3": {
      "tipXPct": 42.8,
      "tipYPct": 4.4,
      "groundYPct": 97.7
    },
    "4": {
      "tipXPct": 53,
      "tipYPct": 2.3,
      "groundYPct": 96.8
    },
    "5": {
      "tipXPct": 59,
      "tipYPct": 2.8,
      "groundYPct": 97.9
    },
    "6": {
      "tipXPct": 37.5,
      "tipYPct": 1.4,
      "groundYPct": 97.9
    },
    "7": {
      "tipXPct": 62.3,
      "tipYPct": 3,
      "groundYPct": 97.9
    },
    "8": {
      "tipXPct": 50,
      "tipYPct": 0.7,
      "groundYPct": 99.5
    }
  },
  "D": {
    "1": {
      "tipXPct": 63.4,
      "tipYPct": 27.5,
      "groundYPct": 78.5
    },
    "2": {
      "tipXPct": 56.7,
      "tipYPct": 13.9,
      "groundYPct": 84.5
    },
    "3": {
      "tipXPct": 65.3,
      "tipYPct": 8.8,
      "groundYPct": 91.9
    },
    "4": {
      "tipXPct": 65,
      "tipYPct": 9,
      "groundYPct": 91.7
    },
    "5": {
      "tipXPct": 62,
      "tipYPct": 11.8,
      "groundYPct": 90.7
    },
    "6": {
      "tipXPct": 66,
      "tipYPct": 5.3,
      "groundYPct": 98.6
    },
    "7": {
      "tipXPct": 47.2,
      "tipYPct": 0,
      "groundYPct": 96.8
    },
    "8": {
      "tipXPct": 47.5,
      "tipYPct": 3.7,
      "groundYPct": 96.8
    }
  }
}
