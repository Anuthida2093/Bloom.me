// src/utils/bmi.ts
import type { BodyType } from '../types'

/** คำนวณ BMI จากส่วนสูง (ซม.) และน้ำหนัก (กก.) */
export function computeBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100
  if (heightM <= 0) return 0
  return weightKg / (heightM * heightM)
}

/**
 * [เพิ่มตามที่ระบุ — เทียบ schema.prisma backend] แบ่งกลุ่ม BodyType 3 ค่า (THIN/AVERAGE/
 * OVERWEIGHT) จาก BMI — schema.prisma ไม่ได้กำหนดจุดตัดตัวเลขไว้เลย (มีแค่ enum ไม่มี
 * comment อธิบายเกณฑ์) ใช้เกณฑ์ BMI มาตรฐานเอเชีย-แปซิฟิก (WHO Asia-Pacific BMI
 * classification) แทน ซึ่งตรงกับ 2 จุดตัดแรกที่ frontend เคยใช้อยู่แล้ว (18.5/23) เพียงแต่
 * เดิมแบ่งเป็น 4 ระดับ (ผอม/ปกติ/เกิน/อ้วน) — ยุบ 2 ระดับหลังรวมเป็น OVERWEIGHT เดียวให้ตรง
 * จำนวนค่าของ enum จริง ถ้า backend กำหนดเกณฑ์อื่นในอนาคต ให้แก้ที่ฟังก์ชันนี้จุดเดียว
 */
export function computeBodyType(bmi: number): BodyType {
  if (bmi < 18.5) return 'THIN'
  if (bmi < 23) return 'AVERAGE'
  return 'OVERWEIGHT'
}
