import { useState } from 'react'
import './CategoryFilter.css'

/*============================================================================*\
  CategoryFilter — แถบ "จำนวนชิ้น + ปุ่มตัวกรองหมวด" (เดิมอยู่ใน ShopSection.tsx อย่างเดียว)
  [แก้ตามที่ระบุ] ใช้ชุดเดียวกันทั้งร้านค้าและคลังไอเทม — กดปุ่ม → รายการหมวดพร้อมจำนวนของแต่ละหมวด
\*============================================================================*/

export interface CategoryFilterOption<T extends string> {
  id: T
  label: string
  count: number
}

interface CategoryFilterProps<T extends string> {
  /** จำนวนชิ้นที่แสดงอยู่ (ซ้ายมือ) */
  count: number
  options: CategoryFilterOption<T>[]
  value: T
  onChange: (id: T) => void
  ariaLabel: string
}

export default function CategoryFilter<T extends string>({ count, options, value, onChange, ariaLabel }: CategoryFilterProps<T>) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.id === value) ?? options[0]
  return (
    <div className="shop-toolbar">
      <span className="shop-toolbar__count">{count} ชิ้น</span>
      <div className="shop-filter">
        <button
          type="button"
          className="shop-filter__btn"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{current?.label}</span>
          <span className="shop-filter__caret" aria-hidden="true">▾</span>
        </button>
        {open && (
          <>
            <div className="shop-filter__backdrop" onClick={() => setOpen(false)} />
            <ul className="shop-filter__menu" role="listbox" aria-label={ariaLabel}>
              {options.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === opt.id}
                    className={`shop-filter__option${value === opt.id ? ' is-active' : ''}`}
                    onClick={() => { onChange(opt.id); setOpen(false) }}
                  >
                    <span className="shop-filter__option-label">{opt.label}</span>
                    <span className="shop-filter__option-count">{opt.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
