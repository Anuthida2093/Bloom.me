import { useMemo, useState } from 'react'
import { FOOD_ITEMS, FOOD_CATEGORY_LABEL, matchesFood, type FoodCategory, type FoodItem } from '../../../config/foodCalories'
import { BADGE_ICONS } from '../../../config/iconAssets'
import type { MealItem } from '../../../utils/nutrition'
import '../../leaderboard/leaderboardRow.css'

/*============================================================================*\
  FoodMenuPicker — [ใช้งานฟรี ไม่เรียก AI] หลังถ่ายรูปมื้ออาหาร ให้ผู้ใช้บอกว่า "จานนี้มีอะไรบ้าง"
  ────────────────────────────────────────────────────────────────────────────
  • ใส่ได้หลายเมนูในจานเดียว (เช่น ข้าวสวย 2 ทัพพี + ไก่ทอด 1 ชิ้น + ชาเย็น 1 แก้ว)
    แต่ละเมนูปรับจำนวนได้ทีละครึ่ง (− / +) และลบออกได้ — รวมแคลอรี่ให้ทันที
  • ค้นหาชื่อเมนู (ไม่สนช่องว่าง) / กรองตามหมวด / แท็บ "ทานบ่อย" จำเมนูที่เคยเลือกไว้ให้กดซ้ำเร็วๆ
  • ไม่เจอในรายการ → เพิ่มเมนูเอง (ชื่อ + แคลอรี่ + หน่วย) จำไว้เป็น "เมนูของฉัน" ใช้ครั้งหน้าได้
  • กากบาทมุมขวาบน / ปุ่ม "กลับไปหน้ารูป" = กลับไปหน้ารูปที่เพิ่งถ่าย (ถ่ายใหม่หรือบันทึกรูปเดิม)
  เมนูทานบ่อย + เมนูของฉัน เก็บในเครื่องแยกตามบัญชี
\*============================================================================*/

export interface PickedFood {
  name: string
  calories: number
  /** รายการเมนูในจาน พร้อมแคลอรี่ของแต่ละรายการ */
  items: MealItem[]
}

interface FoodMenuPickerProps {
  photo: string
  userId: string
  onConfirm: (food: PickedFood) => void
  /** กลับไปหน้ารูปที่เพิ่งถ่าย */
  onBack: () => void
}

interface PlateLine {
  item: FoodItem
  qty: number
}

type Tab = 'frequent' | 'all' | 'mine' | FoodCategory

const QTY_STEP = 0.5
const MAX_FREQUENT = 12
const CATEGORIES = Object.keys(FOOD_CATEGORY_LABEL) as FoodCategory[]
const normalize = (t: string) => t.toLowerCase().replace(/\s+/g, '')
const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(1))

function readJson<T>(key: string, fallback: T): T {
  try { return (JSON.parse(localStorage.getItem(key) ?? 'null') as T) ?? fallback } catch { return fallback }
}
function writeJson(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* พื้นที่เต็ม/ปิดอยู่ */ }
}

export default function FoodMenuPicker({ photo, userId, onConfirm, onBack }: FoodMenuPickerProps) {
  const freqKey = `bloom.foodFreq.${userId || 'guest'}`
  const mineKey = `bloom.foodMine.${userId || 'guest'}`

  /** จำนวนครั้งที่เคยเลือกแต่ละเมนู (ชื่อ → ครั้ง) */
  const [freq] = useState<Record<string, number>>(() => readJson(freqKey, {}))
  const [myFoods, setMyFoods] = useState<FoodItem[]>(() => readJson<FoodItem[]>(mineKey, []))
  const allFoods = useMemo(() => [...myFoods, ...FOOD_ITEMS], [myFoods])
  const frequentFoods = useMemo(
    () => Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => allFoods.find((f) => f.name === name))
      .filter((f): f is FoodItem => !!f)
      .slice(0, MAX_FREQUENT),
    [freq, allFoods],
  )

  const [tab, setTab] = useState<Tab>(() => (Object.keys(readJson(freqKey, {})).length > 0 ? 'frequent' : 'all'))
  const [query, setQuery] = useState('')
  const [plate, setPlate] = useState<PlateLine[]>([])

  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customKcal, setCustomKcal] = useState('')
  const [customUnit, setCustomUnit] = useState('จาน')

  const results = useMemo(() => {
    const q = normalize(query.trim())
    // พิมพ์ค้นหา = ค้นทั้งหมดทุกหมวด (ชื่อเมนู + ชื่อเรียกอื่น เช่น "ชาไทย" → ชาเย็น) ไม่ติดแท็บที่เลือกอยู่
    // ชื่อที่ขึ้นต้นด้วยคำค้นขึ้นก่อน
    if (q) {
      return allFoods
        .filter((f) => matchesFood(f, q))
        .sort((a, b) => Number(!normalize(a.name).startsWith(q)) - Number(!normalize(b.name).startsWith(q)))
    }
    if (tab === 'frequent') return frequentFoods
    if (tab === 'mine') return myFoods
    if (tab === 'all') return allFoods
    return allFoods.filter((f) => f.category === tab)
  }, [query, tab, allFoods, frequentFoods, myFoods])

  const totalKcal = Math.round(plate.reduce((sum, l) => sum + l.item.kcal * l.qty, 0))
  const qtyOf = (name: string) => plate.find((l) => l.item.name === name)?.qty ?? 0

  const addFood = (item: FoodItem) => {
    setPlate((prev) => {
      const found = prev.find((l) => l.item.name === item.name)
      if (found) return prev.map((l) => (l.item.name === item.name ? { ...l, qty: l.qty + 1 } : l))
      return [...prev, { item, qty: 1 }]
    })
  }
  const changeQty = (name: string, delta: number) => {
    setPlate((prev) => prev
      .map((l) => (l.item.name === name ? { ...l, qty: Math.max(0, Math.round((l.qty + delta) * 2) / 2) } : l))
      .filter((l) => l.qty > 0))
  }

  const customKcalNum = Number(customKcal)
  const customValid = customName.trim().length > 0 && customKcal.trim() !== '' && Number.isFinite(customKcalNum)
  const handleAddCustom = () => {
    if (!customValid) return
    const item: FoodItem = { name: customName.trim(), kcal: Math.round(customKcalNum), unit: customUnit.trim() || 'ที่', category: 'side' }
    const nextMine = [item, ...myFoods.filter((f) => f.name !== item.name)].slice(0, 50)
    setMyFoods(nextMine)
    writeJson(mineKey, nextMine)
    addFood(item)
    setCustomOpen(false)
    setCustomName('')
    setCustomKcal('')
    setCustomUnit('จาน')
  }

  const handleConfirm = () => {
    if (plate.length === 0) return
    const nextFreq = { ...freq }
    for (const l of plate) nextFreq[l.item.name] = (nextFreq[l.item.name] ?? 0) + 1
    writeJson(freqKey, nextFreq)
    const name = plate.map((l) => (l.qty === 1 ? l.item.name : `${l.item.name} ×${fmtQty(l.qty)}`)).join(', ')
    const items: MealItem[] = plate.map((l) => ({ name: l.item.name, qty: l.qty, unit: l.item.unit, kcal: Math.round(l.item.kcal * l.qty) }))
    onConfirm({ name, calories: totalKcal, items })
  }

  const openCustom = () => {
    setCustomOpen(true)
    if (!customName && query.trim()) setCustomName(query.trim())
  }

  return (
    <div className="food-picker" role="dialog" aria-label="เลือกเมนูที่ทาน">
      <div className="food-picker__card lb-card">
        <div className="lb-banner food-picker__banner">เลือกเมนูที่ทาน</div>
        <button className="food-picker__close" onClick={onBack} title="กลับไปหน้ารูป" aria-label="กลับไปหน้ารูป">
          <img src={BADGE_ICONS.close} alt="" />
        </button>

        {/* ── จานนี้มีอะไรบ้าง ── */}
        <div className="food-picker__plate">
          <img src={photo} alt="รูปมื้ออาหาร" className="food-picker__photo" />
          <div className="food-picker__plate-body">
            <div className="food-picker__section-title">จานนี้มี</div>
            {plate.length === 0 ? (
              <p className="food-picker__plate-empty">แตะเมนูด้านล่างเพื่อเพิ่ม เลือกได้หลายอย่าง</p>
            ) : (
              <ul className="food-picker__plate-list">
                {plate.map((l) => (
                  <li key={l.item.name} className="food-picker__plate-line">
                    <span className="food-picker__plate-name">{l.item.name}</span>
                    <span className="food-picker__stepper">
                      <button onClick={() => changeQty(l.item.name, -QTY_STEP)} aria-label={`ลด ${l.item.name}`}>−</button>
                      <span>{fmtQty(l.qty)} {l.item.unit}</span>
                      <button onClick={() => changeQty(l.item.name, QTY_STEP)} aria-label={`เพิ่ม ${l.item.name}`}>+</button>
                    </span>
                    <span className="food-picker__plate-kcal">{Math.round(l.item.kcal * l.qty).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── ค้นหา / หมวด ── */}
        <div className="food-picker__search">
          <input
            className="food-picker__field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาอาหาร/เครื่องดื่ม เช่น กะเพรา, ชาไทย, กาแฟ, น้ำพริก"
            aria-label="ค้นหาเมนู"
          />
          {query && <button className="food-picker__clear" onClick={() => setQuery('')} aria-label="ล้างคำค้นหา">ล้าง</button>}
        </div>
        {!query && (
          <div className="food-picker__cats" role="tablist">
            {frequentFoods.length > 0 && (
              <button role="tab" aria-selected={tab === 'frequent'} className={`food-picker__chip${tab === 'frequent' ? ' is-active' : ''}`} onClick={() => setTab('frequent')}>ทานบ่อย</button>
            )}
            <button role="tab" aria-selected={tab === 'all'} className={`food-picker__chip${tab === 'all' ? ' is-active' : ''}`} onClick={() => setTab('all')}>ทั้งหมด</button>
            {myFoods.length > 0 && (
              <button role="tab" aria-selected={tab === 'mine'} className={`food-picker__chip${tab === 'mine' ? ' is-active' : ''}`} onClick={() => setTab('mine')}>เมนูของฉัน</button>
            )}
            {CATEGORIES.map((c) => (
              <button key={c} role="tab" aria-selected={tab === c} className={`food-picker__chip${tab === c ? ' is-active' : ''}`} onClick={() => setTab(c)}>
                {FOOD_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        )}

        {/* ── รายการเมนู ── */}
        <div className="food-picker__list">
          {results.map((f) => {
            const qty = qtyOf(f.name)
            return (
              <button key={f.name} className={`food-picker__item${qty > 0 ? ' is-active' : ''}`} onClick={() => addFood(f)}>
                <span className="food-picker__item-name">{f.name}</span>
                <span className="food-picker__item-kcal">{f.kcal.toLocaleString()} kcal/{f.unit}</span>
                <span className="food-picker__item-add" aria-hidden="true">{qty > 0 ? `×${fmtQty(qty)}` : '+'}</span>
              </button>
            )
          })}
          {results.length === 0 && (
            <p className="food-picker__empty">{query ? `ไม่พบ "${query}" ในรายการ` : 'ยังไม่มีเมนูในหมวดนี้'}</p>
          )}
        </div>

        {/* ── เพิ่มเมนูเอง ── */}
        {customOpen ? (
          <div className="food-picker__custom">
            <div className="food-picker__section-title">เพิ่มเมนูเอง</div>
            <input className="food-picker__field" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="ชื่อเมนู" aria-label="ชื่อเมนู" autoFocus />
            <div className="food-picker__custom-row">
              <input
                className="food-picker__field"
                value={customKcal}
                onChange={(e) => setCustomKcal(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                placeholder="แคลอรี่ (kcal)"
                inputMode="numeric"
                aria-label="แคลอรี่โดยประมาณ"
              />
              <input className="food-picker__field food-picker__field--unit" value={customUnit} onChange={(e) => setCustomUnit(e.target.value.slice(0, 12))} placeholder="หน่วย" aria-label="หน่วย เช่น จาน ชาม แก้ว" />
            </div>
            <p className="food-picker__custom-hint">ไม่แน่ใจแคลอรี่? จานข้าวทั่วไปประมาณ 450-650 · ก๋วยเตี๋ยวชามละ 300-400 · เครื่องดื่มหวานแก้วละ 200-300</p>
            <div className="food-picker__custom-actions">
              <button className="food-picker__link" onClick={() => setCustomOpen(false)}>ยกเลิก</button>
              <button className="lb-btn" onClick={handleAddCustom} disabled={!customValid}>เพิ่มลงจาน</button>
            </div>
          </div>
        ) : (
          <button className="food-picker__link" onClick={openCustom}>ไม่มีเมนูที่ทาน? เพิ่มเมนูเอง</button>
        )}

        {/* ── สรุป + ปุ่ม (ติดด้านล่างการ์ด) ── */}
        <div className="food-picker__footer">
          <div className="food-picker__total">รวม <strong>{totalKcal.toLocaleString()}</strong> kcal</div>
          <div className="food-picker__actions">
            <button className="lb-btn lb-btn--ghost" onClick={onBack}>กลับไปหน้ารูป</button>
            <button className="lb-btn" onClick={handleConfirm} disabled={plate.length === 0}>บันทึก</button>
          </div>
          <p className="food-picker__note">แคลอรี่เป็นค่าประมาณของจานทั่วไป ใช้ติดตามคร่าวๆ</p>
        </div>
      </div>
    </div>
  )
}
