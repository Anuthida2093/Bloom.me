import { useMemo, type ReactNode } from 'react'
import { MBTI_TREE_THEME, type MbtiType, type RiskLevel } from '../../types'
import { toGroundVariant } from '../../config/treeAssets'
import { groundDryness, groundStage, knowledgeGrowthMultiplier } from '../../config/groundFertility'
import { useIsSmallScreen } from '../../hooks/useMediaQuery'
import InfoFramePanel from '../common/InfoFramePanel'
import { buildTreeModel } from './procedural/buildTreeModel'
import MiniTree from './MiniTree'
import { speciesOf } from './procedural/species'
import { toHealthPhase } from './treeHealth'
import FadeInText from '../welcome/FadeInText'
import { useLanguage } from '../../context/LanguageContext'

interface TreeInfoPanelProps {
  mbtiType: MbtiType | null
  trunkBranchLevel: number
  leafFlowerLevel: number
  grassSoilLevel: number
  riskLevel: RiskLevel
  daysSinceLastMentalQuest: number | null
  daysSinceLastPhysicalQuest: number | null
  onClose: () => void
  /** เนื้อหาเพิ่มต่อท้ายข้อมูลต้นไม้ในกรอบเดียวกัน (สถิติ/EXP/ปุ่มเช็คอิน จาก TreeStatsPanel) */
  children?: ReactNode
}

/**
 * TreeInfoPanel — แผง "ข้อมูลต้นไม้" เปิดจากปุ่มต้นไม้มุมขวาบนของหน้า Home
 * ────────────────────────────────────────────────────────────────────────────
 * [ย้ายตามที่ระบุ] เดิมเป็นป็อบอัพที่เปิดจากการกดโคนต้นไม้ (TreeOfLife.tsx) — ย้ายมาเปิดจาก
 * ปุ่มขวาบนแทน และรวมกับแผงสถานะต้นไม้เดิมไว้ในกรอบเดียว (children)
 *  - กรอบแบบกระดานจัดอันดับ (.lb-frame) พื้นทึบเขียวอ่อน/ตัวหนังสือดำ — ธีมมืดเขียวเข้ม/ขาว
 *  - ฟอนต์หน้า Welcome, รายละเอียดค่อยๆ ขึ้นมาทีละแถว (FadeInText)
 *  - จอกว้าง: อยู่ในคอลัมน์ขวา (.dashboard__panel--right) / จอเล็ก ≤768px: เต็มจอแบบหน้าตั้งค่า
 *    (portal ไป body, z-index 500 ต่ำกว่าแถบเมนูล่าง)
 */
export default function TreeInfoPanel({
  mbtiType, trunkBranchLevel, leafFlowerLevel, grassSoilLevel, riskLevel,
  daysSinceLastMentalQuest, daysSinceLastPhysicalQuest, onClose, children,
}: TreeInfoPanelProps) {
  const { t, tv, language } = useLanguage()
  const compact = useIsSmallScreen()
  const folder = mbtiType ?? 'BALANCED'
  const theme = MBTI_TREE_THEME[mbtiType as MbtiType] ?? MBTI_TREE_THEME.INFP
  const accent = theme.accent
  const species = speciesOf(mbtiType)
  // ข้อมูลชุดเดียวกับที่ต้นไม้บนหน้า Home วาดอยู่ (จำนวนใบ/ดอก/ขั้นภาพ)
  const treeModel = useMemo(
    () => buildTreeModel({ mbtiType, trunkBranchLevel, leafFlowerLevel, compact }),
    [mbtiType, trunkBranchLevel, leafFlowerLevel, compact],
  )
  const leafHealthPhase = toHealthPhase(daysSinceLastMentalQuest)
  const groundStep = toGroundVariant(grassSoilLevel)
  const groundDry = groundDryness(daysSinceLastPhysicalQuest)
  const groundStg = groundStage(groundDry)

  return (
    <InfoFramePanel banner={<>🌳 {t('treeInfo.title')}</>} onClose={onClose}>
        {/* [แก้ตามที่ระบุ] ต้นไม้ประจำ MBTI แบบเดียวกับในตารางจัดอันดับ/หน้าเลือก MBTI (MiniTree)
            ขึ้นก่อน แล้วค่อยเป็นข้อความ "ต้นไม้ของ ..." */}
        <FadeInText className="tree-info-panel__tree">
          <MiniTree theme={theme} size={96} />
        </FadeInText>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <FadeInText delayMs={120} className="tree-of-life__tooltip-sub">{tv('treeInfo.treeOf', { name: folder })}</FadeInText>
          <FadeInText delayMs={180} className="tree-of-life__tooltip-title" style={{ color: accent }}>
            {language === 'en'
              ? species.nameEn
              : <>{treeModel.speciesName} <span className="tree-of-life__tooltip-sub">({species.nameEn})</span></>}
          </FadeInText>
        </div>

        <div className="tree-of-life__tooltip-rows">
          <FadeInText className="tree-of-life__tooltip-row" delayMs={200}>
            <span aria-hidden="true">🪵</span>
            <div><b>{t('treeInfo.trunk')}</b> Lv.{trunkBranchLevel} · {tv('treeInfo.stage', { n: `${treeModel.visualLevel}/8` })} · {treeModel.leaves.length > 0 ? tv('treeInfo.leavesCount', { n: treeModel.leaves.length }) : t('treeInfo.noLeaves')}</div>
          </FadeInText>
          <FadeInText className="tree-of-life__tooltip-row" delayMs={350}>
            <span aria-hidden="true">🌸</span>
            <div><b>{t('treeInfo.flowers')}</b> Lv.{leafFlowerLevel} · {tv('treeInfo.flowersCount', { n: treeModel.flowers.length })}</div>
          </FadeInText>
          <FadeInText className="tree-of-life__tooltip-row" delayMs={500}>
            <span aria-hidden="true">🌱</span>
            <div><b>{t('treeInfo.grass')}</b> Lv.{grassSoilLevel} · {tv('treeInfo.stage', { n: `${groundStep}/3` })} · {t(`treeInfo.ground.${groundStg}`)}</div>
          </FadeInText>
          {leafHealthPhase !== 'healthy' && (
            <div className="tree-of-life__tooltip-warn">🍂 {leafHealthPhase === 'dying' ? t('treeInfo.leafDying') : t('treeInfo.leafWilting')}</div>
          )}
          {groundDry > 0 && (
            <div className="tree-of-life__tooltip-warn">
              🌾 {tv('treeInfo.dryGround', { n: Math.round(knowledgeGrowthMultiplier(groundDry) * 100) })}
            </div>
          )}
          {riskLevel !== 'LOW' && (
            <div className="tree-of-life__tooltip-warn">⚠️ {riskLevel === 'HIGH' ? t('treeInfo.riskHigh') : t('treeInfo.riskModerate')}</div>
          )}
        </div>

        {children && <FadeInText delayMs={650} className="tree-info-panel__extra">{children}</FadeInText>}
    </InfoFramePanel>
  )
}
