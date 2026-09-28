import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { MBTI_TREE_THEME, DEFAULT_USER_DATA, type MbtiType, type UserData, type Gender } from '../../types'
import type { AppSettings } from '../../context/AppContext'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import MiniTree from '../tree/MiniTree'
import GameAlert from '../ui/GameAlert'
import PasswordInput from '../ui/PasswordInput'
import '../leaderboard/leaderboardRow.css'
import { BADGE_ICONS } from '../../config/iconAssets'
import { ApiError } from '../../services/http'
import { validatePasswordStrength } from '../../utils/mockAuth'
import { useLanguage } from '../../context/LanguageContext'

const C_1 = 'rgba(116,198,157,.35)'
const C_2 = 'rgba(116,198,157,.2)'
const BORDER_3 = '#e2e8f0'
const BORDER_6 = 'rgba(116,198,157,.8)'
const BORDER_7 = '#e2e8f0'
const SHADOW_9 = 'rgba(45,106,79,.3)'

interface SettingsModalProps {
  settings?: AppSettings
  mbtiType?: MbtiType | null
  userData?: UserData // รับข้อมูลผู้ใช้จริงเข้ามาเพื่อแก้ไข
  onUpdateSettings?: (partial: Partial<AppSettings>) => void
  onUpdateUser?: (partial: Partial<UserData>) => void // ฟังก์ชันอัปเดตข้อมูลผู้ใช้
  /** [เพิ่มรอบนี้] ออกจากระบบ — เดิมไม่มี prop นี้เลย ปุ่มออกจากระบบมีแค่ใน NavBar */
  onLogout?: () => void
  /** [เพิ่มรอบนี้ — ข้อ 4] เปลี่ยนรหัสผ่าน — ต้อง throw ถ้ารหัสเดิมผิด (ดู UserContext.changePassword) */
  onChangePassword?: (data: { currentPassword: string; newPassword: string }) => Promise<void>
  /** [เพิ่มรอบนี้ — ข้อ 3] ลบบัญชีถาวร — เรียกหลังผ่าน confirm 2 ชั้นแล้วเท่านั้น */
  onDeleteAccount?: (password?: string) => Promise<void>
  onClose?: () => void
  /** [ใหม่ — ฟีเจอร์สตอรี่ ข้อ 5] เปิดตรงไปที่หน้าย่อยไหนทันทีตอน mount — ใช้ตอนกดปุ่ม
   *  "แก้ไขโปรไฟล์" จากหน้าโปรไฟล์ Story แล้วอยากให้เด้งมาหน้านี้ตรงๆ เลย ไม่ต้องกด "บัญชี"
   *  → "ตั้งค่าโปรไฟล์" อีกที (เป็น "หน้าตั้งค่าโปรไฟล์กลาง" ของทั้งเว็บจุดเดียวกันเป๊ะ ไม่ได้
   *  สร้างฟอร์มโปรไฟล์แยกซ้ำสำหรับ Story) */
  initialSubModal?: SubModalType
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false, soundEnabled: true, musicVolume: 60, sfxVolume: 80, strictMode: false,
  dailyQuestReminderEnabled: false, dailyQuestReminderTime: '09:00', questUnlockNotifyEnabled: true,
}

type SubModalType = 'profile' | 'notifications' | 'privacy' | 'security' | null


export default function SettingsModal({
  settings = DEFAULT_SETTINGS,
  mbtiType,
  userData = DEFAULT_USER_DATA,
  onUpdateSettings = () => {},
  onUpdateUser = () => {},
  onLogout = () => {},
  onChangePassword,
  onDeleteAccount,
  onClose = () => {},
  initialSubModal = null,
}: SettingsModalProps) {
  const { musicVolume, sfxVolume, darkMode, soundEnabled, strictMode, dailyQuestReminderEnabled, dailyQuestReminderTime, questUnlockNotifyEnabled } = settings
  const [confirmLogout, setConfirmLogout] = useState(false)
  const { t, language, setLanguage } = useLanguage()
  /** [เพิ่มรอบนี้ — ข้อ 3] ขั้นตอน confirm ลบบัญชี: 0 = ปิดอยู่, 1 = โมดัลอธิบายผล, 2 = โมดัลพิมพ์ยืนยัน */
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  /** [แก้ตามที่ระบุ] ยืนยันด้วยรหัสผ่านปัจจุบันก่อนลบเสมอ (ทั้ง mock และ backend จริง) */
  const [deletePassword, setDeletePassword] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const deleteReady = deletePassword.length > 0 && !isDeletingAccount
  const theme = MBTI_TREE_THEME[mbtiType as MbtiType] ?? MBTI_TREE_THEME.INFP
  const navigate = useNavigate()

  // [แก้บั๊ก] เดิม onClick={onLogout} เฉยๆ — เคลียร์ auth state แล้วไม่พาไปหน้า Welcome เลย
  // ผู้ใช้ค้างอยู่ที่ /dashboard ทั้งที่ isLoggedIn เป็น false แล้ว ต้อง navigate ต่อเสมอ
  // เรียก onLogout() ก่อนเพื่อเคลียร์ state แล้วค่อย navigate ในตัวจัดการเดียวกัน (batched
  // อยู่ใน event handler เดียวกัน) — กัน race condition ที่หน้า Welcome เห็น state login ค้าง
  const handleConfirmLogout = () => {
    onLogout()
    navigate('/', { replace: true })
  }

  // [เพิ่มรอบนี้ — ข้อ 3] ลบบัญชีถาวร — ปุ่ม "ลบถาวร" ใน modal ขั้นที่ 2 disabled จนกว่าจะพิมพ์
  // ข้อความยืนยันตรงเป๊ะ (กันกดพลาด) เรียก onDeleteAccount() แล้ว navigate ไปหน้า Welcome ทันที
  // แบบเดียวกับ handleConfirmLogout ด้านบน (เคลียร์ session แล้วต้อง navigate เสมอ)
  const handleConfirmDelete = async () => {
    if (!onDeleteAccount || isDeletingAccount) return
    setIsDeletingAccount(true)
    try {
      await onDeleteAccount(deletePassword)
      navigate('/', { replace: true })
    } catch (error) {
      setAlertMessage(error instanceof ApiError && error.status === 401 ? t('settings.wrongPassword') : t('settings.deleteFailed'))
      setDeletePassword('')
      setIsDeletingAccount(false)
      setDeleteStep(0)
    }
  }

  const [activeSubModal, setActiveSubModal] = useState<SubModalType>(initialSubModal)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  const handleExportData = () => {
    const dataStr = JSON.stringify(userData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bloom_me_data_${userData.username || 'user'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setAlertMessage(t('settings.exportDone'))
  }

  return (
    <Overlay onClose={onClose} accent={theme.accent}>
      {/* [แก้ตามที่ระบุ] แถบหัวสีสันมีชีวิตชีวา แทนหัวข้อลอยเดี่ยวๆ บนพื้นขาว */}
      <div
        className="settings-hero"
        style={{ background: SETTINGS_HERO_BG }}
      >
        <div className="settings-hero__blob" style={{ background: 'color-mix(in srgb, var(--g400) 10%, transparent)' }} aria-hidden="true" />
        <MiniTree theme={theme} size={56} />
        <div>
          <div className="settings-hero__title"><img src={BADGE_ICONS.settings} className="icon-img" alt="" /> {t('settings.title')}</div>
          {mbtiType && <div className="settings-hero__subtitle" style={{ color: 'var(--text)' }}>{theme.treeName} · {mbtiType}</div>}
        </div>
      </div>

      <div className="settings-grid">
        <Section label={t('settings.sound')} index={0} accent={theme.accent}>
          <button
            type="button"
            onClick={() => onUpdateSettings({ soundEnabled: !soundEnabled })}
            className="settings-toggle-row"
            style={{
              border: `1.5px solid ${soundEnabled ? SETTINGS_GOLD : 'var(--border-mid)'}`,
              background: soundEnabled ? SETTINGS_ON_TINT : 'var(--bg-card)',
            }}
          >
            <span>{soundEnabled ? t('settings.soundOn') : t('settings.soundOff')}</span>
            <span
              style={{
                width: 44, height: 24, borderRadius: 99, position: 'relative',
                background: soundEnabled ? SETTINGS_ON : 'var(--n200)', transition: 'background .25s',
              }}
            >
              <span
                className="settings-toggle-knob"
                style={{
                  position: 'absolute', top: 2, left: soundEnabled ? 22 : 2, width: 20, height: 20,
                  borderRadius: '50%', background: 'var(--fixed-white)', boxShadow: '0 1px 3px var(--glass-b-30)',
                }}
              />
            </span>
          </button>
        </Section>

        <Section label={t('settings.theme')} index={1} accent={theme.accent}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[false, true].map(dm => (
              <button
                key={String(dm)}
                type="button"
                onClick={() => onUpdateSettings({ darkMode: dm })}
                className="settings-choice-btn"
                style={{
                  border: `1.5px solid ${darkMode === dm ? SETTINGS_GOLD : 'var(--border-mid)'}`,
                  background: darkMode === dm ? SETTINGS_ON_TINT : 'var(--bg-card)',
                  transform: darkMode === dm ? 'scale(1.02)' : 'scale(1)',
                }}>
                {dm ? t('settings.dark') : t('settings.light')}
              </button>
            ))}
          </div>
        </Section>

        {/* [เพิ่มตามที่ระบุ] เลือกภาษา ไทย / English — ใช้ LanguageContext ตัวเดียวกับหน้า Welcome
            (จำค่าในเครื่อง localStorage "bloom:language") ปุ่มหน้าตาเดียวกับเลือกธีม */}
        <Section label={t('common.language')} index={2} accent={theme.accent}>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['th', 'en'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className="settings-choice-btn"
                aria-pressed={language === lang}
                style={{
                  border: `1.5px solid ${language === lang ? SETTINGS_GOLD : 'var(--border-mid)'}`,
                  background: language === lang ? SETTINGS_ON_TINT : 'var(--bg-card)',
                  transform: language === lang ? 'scale(1.02)' : 'scale(1)',
                }}>
                {lang === 'th' ? t('common.thai') : t('common.english')}
              </button>
            ))}
          </div>
        </Section>

        <Section label={t('settings.music')} index={2} accent={theme.accent}>
          <VolumeSlider value={musicVolume} onChange={v => onUpdateSettings({ musicVolume: v })} accent={theme.accent} />
        </Section>

        <Section label={t('settings.sfx')} index={3} accent={theme.accent}>
          <VolumeSlider value={sfxVolume} onChange={v => onUpdateSettings({ sfxVolume: v })} accent={theme.accent} />
        </Section>

        {/* [เพิ่มรอบนี้] สลับโหมดเคร่งครัด/ปกติ — ใช้สไตล์ปุ่มสลับเดียวกับ "เสียงทั้งหมด" ด้านบน
            ตามที่ระบุ (reuse ปุ่มสลับเดิม ไม่สร้างคอมโพเนนต์ใหม่) */}
        <Section label={t('settings.strict')} index={4} accent={theme.accent}>
          <button
            type="button"
            onClick={() => onUpdateSettings({ strictMode: !strictMode })}
            className="settings-toggle-row"
            style={{
              border: `1.5px solid ${strictMode ? SETTINGS_GOLD : 'var(--border-mid)'}`,
              background: strictMode ? SETTINGS_ON_TINT : 'var(--bg-card)',
            }}
          >
            <span>{strictMode ? t('settings.strictOn') : t('settings.strictOff')}</span>
            <span
              style={{
                width: 44, height: 24, borderRadius: 99, position: 'relative',
                background: strictMode ? SETTINGS_ON : 'var(--n200)', transition: 'background .25s',
              }}
            >
              <span
                className="settings-toggle-knob"
                style={{
                  position: 'absolute', top: 2, left: strictMode ? 22 : 2, width: 20, height: 20,
                  borderRadius: '50%', background: 'var(--fixed-white)', boxShadow: '0 1px 3px var(--glass-b-30)',
                }}
              />
            </span>
          </button>
        </Section>

        <Section label={t('settings.account')} index={5} accent={theme.accent} full>
          <div className="settings-account-grid">
            <SettingBtn icon="👤" label={t('settings.profile')} onClick={() => setActiveSubModal('profile')} accent={theme.accent} />
            <SettingBtn icon={<img src={BADGE_ICONS.notification} className="icon-img" alt="" />} label={t('settings.notifications')} onClick={() => setActiveSubModal('notifications')} accent={theme.accent} />
            <SettingBtn icon="🔒" label={t('settings.privacy')} onClick={() => setActiveSubModal('privacy')} accent={theme.accent} />
            <SettingBtn icon="📤" label={t('settings.export')} onClick={handleExportData} accent={theme.accent} />
          </div>
        </Section>

        {/* [เพิ่มรอบนี้ — ข้อ 5] หมวดใหม่ที่ยังไม่มีมาก่อน — ความปลอดภัยบัญชี (เปลี่ยนรหัสผ่าน
            แยกออกมาให้ทำงานจริง + placeholder รายการอุปกรณ์) */}
        <Section label={t('settings.security')} index={6} accent={theme.accent} full>
          <div className="settings-account-grid">
            <SettingBtn icon="🔑" label={t('settings.changePassword')} onClick={() => setActiveSubModal('security')} accent={theme.accent} />
          </div>
        </Section>

        {/* [เพิ่มรอบนี้ — ข้อ 5] หมวดใหม่ที่ยังไม่มีมาก่อน — แจ้งเตือนเควสประจำวัน/เควสปลดล็อกใหม่
            [หมายเหตุ] ตอนนี้บันทึกแค่ toggle+เวลาไว้ฝั่ง client (localStorage) เท่านั้น ยังไม่ได้
            ต่อกับ push notification จริง เพราะต้องมี service worker + backend ส่ง push ตามเวลา
            จริงถึงจะแจ้งเตือนได้ตอนไม่ได้เปิดแอปอยู่ — ดูสรุปท้ายบทสนทนาสำหรับสิ่งที่ต้องทำเพิ่ม */}
        <Section label={t('settings.learning')} index={7} accent={theme.accent} full>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={() => onUpdateSettings({ dailyQuestReminderEnabled: !dailyQuestReminderEnabled })}
              className="settings-toggle-row"
              style={{
                border: `1.5px solid ${dailyQuestReminderEnabled ? SETTINGS_GOLD : 'var(--border-mid)'}`,
                background: dailyQuestReminderEnabled ? SETTINGS_ON_TINT : 'var(--bg-card)',
              }}
            >
              <span>{dailyQuestReminderEnabled ? t('settings.dailyReminderOn') : t('settings.dailyReminderOff')}</span>
              <span style={{ width: 44, height: 24, borderRadius: 99, position: 'relative', background: dailyQuestReminderEnabled ? SETTINGS_ON : 'var(--n200)', transition: 'background .25s' }}>
                <span className="settings-toggle-knob" style={{ position: 'absolute', top: 2, left: dailyQuestReminderEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'var(--fixed-white)', boxShadow: '0 1px 3px var(--glass-b-30)' }} />
              </span>
            </button>

            {dailyQuestReminderEnabled && (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, padding: '10px 14px', background: SETTINGS_SOFT_TINT, borderRadius: 12, fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text)' }}>
                {t('settings.reminderTime')}
                <input
                  type="time"
                  value={dailyQuestReminderTime}
                  onChange={(e) => onUpdateSettings({ dailyQuestReminderTime: e.target.value })}
                  style={{ border: `1.5px solid var(--border)`, borderRadius: 8, padding: '6px 10px', fontFamily: 'var(--font-display)', background: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </label>
            )}

            <button
              type="button"
              onClick={() => onUpdateSettings({ questUnlockNotifyEnabled: !questUnlockNotifyEnabled })}
              className="settings-toggle-row"
              style={{
                border: `1.5px solid ${questUnlockNotifyEnabled ? SETTINGS_GOLD : 'var(--border-mid)'}`,
                background: questUnlockNotifyEnabled ? SETTINGS_ON_TINT : 'var(--bg-card)',
              }}
            >
              <span>{questUnlockNotifyEnabled ? t('settings.unlockNotifyOn') : t('settings.unlockNotifyOff')}</span>
              <span style={{ width: 44, height: 24, borderRadius: 99, position: 'relative', background: questUnlockNotifyEnabled ? SETTINGS_ON : 'var(--n200)', transition: 'background .25s' }}>
                <span className="settings-toggle-knob" style={{ position: 'absolute', top: 2, left: questUnlockNotifyEnabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'var(--fixed-white)', boxShadow: '0 1px 3px var(--glass-b-30)' }} />
              </span>
            </button>
          </div>
        </Section>

        {/* [แก้ตามที่ระบุ] ย้ายการลบบัญชีมาเป็นหมวด "จัดการบัญชี" ถัดจากการเรียนรู้/แจ้งเตือนเควส
            (เดิมเป็นโซนอันตรายแยกท้ายหน้า) — กดแล้วเตือนผลที่ตามมาก่อน แล้วพิมพ์ยืนยันอีกชั้น */}
        <Section label={t('settings.manageAccount')} index={8} accent={theme.accent} full>
          <div className="settings-account-grid">
            <SettingBtn icon="🗑️" label={t('settings.deactivateOrDelete')} onClick={() => setDeleteStep(1)} accent={theme.accent} />
          </div>
        </Section>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="settings-save-btn"
        style={{
          // [แก้ตามที่ระบุ] ปุ่มบันทึกสีเขียว (เดิมสีประจำ MBTI เช่น ESFP เป็นเหลือง)
          background: 'linear-gradient(135deg, var(--g500), var(--g700))',
          boxShadow: '0 6px 18px color-mix(in srgb, var(--g700) 35%, transparent)',
        }}>
        {t('settings.save')}
      </button>

      {/* ปุ่มออกจากระบบ — [แก้ตามที่ระบุ] ยาวเต็มแถวเท่าปุ่มบันทึก ขอบขาว (ธีมมืด) ไม่ใช่สีชมพู/แดง
          ไม่มีอีโมจิ — ยังแยกจากปุ่มบันทึกด้วยเส้นคั่น และต้องยืนยันอีกชั้นก่อนออกจริง */}
      <div className="settings-logout-zone">
        <button type="button" onClick={() => setConfirmLogout(true)} className="settings-logout-btn">
          {t('settings.logout')}
        </button>
      </div>

      {/* [แก้ตามที่ระบุ] ป็อปอัพยืนยันออกจากระบบ — กรอบ/ขอบแบบกระดานจัดอันดับ ป้ายหัว "ออกจากระบบ" */}
      {confirmLogout && (
        <div className="settings-logout-confirm" onClick={() => setConfirmLogout(false)}>
          <div className="settings-logout-confirm__card logout-lb-card lb-card" role="alertdialog" aria-labelledby="logout-confirm-text" onClick={(e) => e.stopPropagation()}>
            <div className="lb-banner logout-lb-card__banner">{t('settings.logout')}</div>
            <div style={{ fontSize: 34 }} aria-hidden="true">🚪</div>
            <p id="logout-confirm-text">{t('settings.logoutConfirmShort')}</p>
            <div className="settings-logout-confirm__actions">
              <button type="button" onClick={() => setConfirmLogout(false)}>{t('common.cancel')}</button>
              <button type="button" className="logout-lb-card__confirm" onClick={handleConfirmLogout}>{t('common.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ขั้นที่ 1 — อธิบายผลที่ตามมา · [แก้ตามที่ระบุ] กรอบแบบเดียวกับป็อปอัพออกจากระบบ */}
      {deleteStep === 1 && (
        <div className="settings-logout-confirm" onClick={() => setDeleteStep(0)}>
          <div className="settings-logout-confirm__card logout-lb-card lb-card" role="alertdialog" aria-labelledby="delete-confirm-title" onClick={(e) => e.stopPropagation()}>
            <div className="lb-banner logout-lb-card__banner" id="delete-confirm-title">{t('settings.deleteTitle')}</div>
            <div style={{ fontSize: 34 }} aria-hidden="true">⚠️</div>
            <p className="logout-lb-card__sub">{t('settings.deleteWarning')}</p>
            <div className="settings-logout-confirm__actions">
              <button type="button" onClick={() => setDeleteStep(0)}>{t('common.cancel')}</button>
              <button type="button" className="logout-lb-card__confirm" onClick={() => setDeleteStep(2)}>{t('settings.continue')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ขั้นที่ 2 — พิมพ์ยืนยันก่อนปุ่มลบถาวรจะกดได้ */}
      {deleteStep === 2 && (
        <div className="settings-logout-confirm" onClick={() => { setDeleteStep(0); setDeletePassword('') }}>
          <div className="settings-logout-confirm__card logout-lb-card lb-card" role="alertdialog" aria-labelledby="delete-password-text" onClick={(e) => e.stopPropagation()}>
            <div className="lb-banner logout-lb-card__banner">{t('settings.deleteTitle')}</div>
            <div style={{ fontSize: 34 }} aria-hidden="true">🗑️</div>
            <p id="delete-password-text" style={{ marginBottom: 10 }}>{t('settings.enterPasswordToDelete')}</p>
            <PasswordInput
              value={deletePassword}
              onChange={setDeletePassword}
              placeholder={t('settings.currentPassword')}
              autoComplete="current-password"
              style={{
                width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid color-mix(in srgb, var(--lb-gold-edge) 55%, transparent)', background: 'var(--input-bg)', color: 'var(--text)',
                fontSize: 'var(--fs-md)', marginBottom: 16, boxSizing: 'border-box',
              }}
            />
            <div className="settings-logout-confirm__actions">
              <button type="button" onClick={() => { setDeleteStep(0); setDeletePassword('') }}>{t('common.cancel')}</button>
              <button
                type="button"
                className="logout-lb-card__confirm"
                disabled={!deleteReady}
                style={{ opacity: !deleteReady ? 0.5 : 1, cursor: !deleteReady ? 'not-allowed' : 'pointer' }}
                onClick={handleConfirmDelete}
              >
                {isDeletingAccount ? t('settings.deleting') : t('settings.deleteForever')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub Modals ── */}
      {activeSubModal === 'profile' && (
        <SubModalTemplate title={t('settings.profile')} onClose={() => setActiveSubModal(null)} accent={theme.accent}>
          <ProfileSettingsForm userData={userData} accent={theme.accent} onSave={(data) => { onUpdateUser(data); setActiveSubModal(null); }} />
        </SubModalTemplate>
      )}

      {activeSubModal === 'notifications' && (
        <SubModalTemplate title={t('settings.notifications')} onClose={() => setActiveSubModal(null)} accent={theme.accent}>
          <MockToggleSettings
            options={['แจ้งเตือนเมื่อถึงเวลาทำเควส', 'สรุปสถิติประจำสัปดาห์', 'รับข่าวสารอัปเดตระบบ']}
            accent={theme.accent}
          />
        </SubModalTemplate>
      )}

      {activeSubModal === 'privacy' && (
        <SubModalTemplate title={t('settings.privacy')} onClose={() => setActiveSubModal(null)} accent={theme.accent}>
          <MockToggleSettings
            options={['อนุญาตให้ผู้อื่นเห็นระดับต้นไม้ (Leaderboard)', 'แสดงข้อมูล MBTI ของฉัน', 'แชร์ประวัติอารมณ์แบบไม่ระบุตัวตนเพื่อพัฒนาระบบ']}
            accent={theme.accent}
          />
        </SubModalTemplate>
      )}

      {activeSubModal === 'security' && (
        <SubModalTemplate title={t('settings.security')} onClose={() => setActiveSubModal(null)} accent={theme.accent}>
          <ChangePasswordForm accent={theme.accent} onChangePassword={onChangePassword} onDone={() => setActiveSubModal(null)} />
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: 'var(--fs-sm)', color: 'var(--text-sub)', marginBottom: 10 }}>💻 อุปกรณ์ที่เข้าสู่ระบบ</div>
            <div style={{ padding: 14, borderRadius: 12, background: SETTINGS_SOFT_TINT, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
              เร็วๆ นี้ — ฟีเจอร์นี้ต้องมีระบบ session ฝั่ง backend จริงถึงจะแสดงรายการอุปกรณ์/
              ตำแหน่งที่ล็อกอินอยู่ได้ถูกต้อง (mock ปัจจุบันมี session เดียวเสมอ)
            </div>
          </div>
        </SubModalTemplate>
      )}

      <GameAlert open={alertMessage !== null} message={alertMessage ?? ''} onClose={() => setAlertMessage(null)} />

      <style>{`
        @keyframes settingsSectionFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* [ใหม่] แถบหัวสีสัน */
        .settings-hero {
          position: relative;
          display: flex; align-items: center; gap: 14px;
          padding: 18px 20px;
          border-radius: var(--r-lg);
          margin-bottom: 22px;
          overflow: hidden;
        }
        .settings-hero__blob {
          position: absolute; top: -40%; right: -10%; width: 180px; height: 180px;
          border-radius: 50%; pointer-events: none;
        }
        .settings-hero__title {
          position: relative; font-family: var(--font-display); font-size: var(--fs-xl); color: var(--heading-accent);
        }
        .settings-hero__subtitle {
          position: relative; font-size: var(--fs-xs); font-weight: 700; margin-top: 2px;
        }

        /* [ใหม่] การ์ดของแต่ละ section — สีสัน ไม่ใช่พื้นขาวโล่งๆ */
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .settings-section {
          border-radius: var(--r-md);
          padding: 16px;
          border: 1px solid var(--border);
        }
        .settings-section--full { grid-column: 1 / -1; }
        .settings-section__label {
          font-size: var(--fs-sm); font-weight: 800; color: var(--text-sub); margin-bottom: 12px;
        }

        /* [แก้] มาตรฐานปุ่ม/แถวตั้งค่า: สูงอย่างน้อย 44px กดง่ายบนมือถือ */
        .settings-toggle-row {
          width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-radius: var(--r-md); cursor: pointer;
          font-family: var(--font-display); font-weight: 700; font-size: var(--fs-md); color: var(--text);
          transition: all .25s cubic-bezier(.34,1.56,.64,1);
        }
        .settings-choice-btn {
          flex: 1; min-height: 44px; padding: 12px; border-radius: var(--r-md); cursor: pointer;
          font-family: var(--font-display); font-weight: 700; font-size: var(--fs-md);
          color: var(--text); transition: all .2s;
        }
        .settings-account-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;
        }

        .settings-toggle-knob { transition: left .25s cubic-bezier(.34,1.56,.64,1); }

        .settings-save-btn {
          width: 100%; margin-top: 8px; min-height: 48px; padding: 14px; border: none; border-radius: var(--r-md);
          color: var(--fixed-white); font-family: var(--font-display); font-size: var(--fs-lg); cursor: pointer;
          transition: transform .15s, box-shadow .15s;
        }
        .settings-save-btn:hover { transform: translateY(-2px) scale(1.02); }
        .settings-save-btn:active { transform: translateY(1px) scale(.98); }

        @media (max-width: 640px) {
          .settings-hero { padding: 16px; }
          .settings-account-grid { grid-template-columns: 1fr; }
        }

        /* [เพิ่มรอบนี้] โซนออกจากระบบ — แยกจากกลุ่มปุ่มตั้งค่าอย่างชัดเจนด้วยเส้นคั่น + ระยะห่าง */
        .settings-logout-zone {
          margin-top: 20px; padding-top: 20px; border-top: 1px dashed var(--border);
        }
        /* ขนาด/ทรงเดียวกับ .settings-save-btn — ขอบขาวในธีมมืด / ขอบเข้ม (--text) ในธีมสว่าง
           (ขอบขาวบนพื้นหน้าสีอ่อนของธีมสว่างจะมองไม่เห็นเลย) */
        .settings-logout-btn {
          width: 100%; min-height: 48px; padding: 14px; border-radius: var(--r-md);
          border: 2px solid var(--text); background: transparent; color: var(--text);
          font-family: var(--font-display); font-size: var(--fs-lg); cursor: pointer;
          transition: transform .15s, background .15s;
        }
        [data-theme="dark"] .settings-logout-btn { border-color: var(--fixed-white); color: var(--fixed-white); }
        .settings-logout-btn:hover { transform: translateY(-2px); background: var(--glass-w-8); }
        .settings-logout-btn:active { transform: translateY(1px) scale(.98); }

        .settings-logout-confirm {
          position: fixed; inset: 0; z-index: 520; background: var(--glass-b-45);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .settings-logout-confirm__card {
          background: var(--bg-card); border-radius: var(--r-lg); padding: 28px 24px; max-width: 320px;
          width: 100%; text-align: center; box-shadow: var(--sh-card);
        }
        .settings-logout-confirm__card p { font-size: var(--fs-md); color: var(--text); margin: 12px 0 20px; font-weight: 700; }
        .settings-logout-confirm__actions { display: flex; gap: 10px; }
        .settings-logout-confirm__actions button {
          /* [แก้บั๊ก — พบระหว่างแก้ข้อ 7] เดิม background: var(--bg-body) — โทเคนนี้ไม่มีอยู่จริง
             ในระบบ (ไม่ได้ประกาศไว้ที่ :root เลย) และตรงนี้ไม่มี fallback ด้วย ตกเป็น "transparent"
             (ค่าเริ่มต้นของ background) เสมอ ปุ่ม "ยกเลิก" เลยไม่มีพื้นหลังจริงทั้ง 2 โหมด (บังเอิญ
             ยังอ่านออกเพราะพื้นหลังที่โผล่มาคือ .settings-logout-confirm__card ที่สีเข้ม/อ่อนตรง
             ข้ามกับ --text พอดีอยู่แล้ว แต่ก็ยังเป็นโทเคนที่ไม่มีจริง ไม่ควรอ้างอิงค้างไว้) เปลี่ยนเป็น
             var(--n100) ซึ่งเป็นโทเคนพื้นผิวรองที่ใช้จริงในระบบ (สลับ light/dark ถูกต้อง) */
          flex: 1; min-height: 44px; border-radius: var(--r-md); border: 1.5px solid var(--border);
          background: var(--n100); color: var(--text); font-weight: 800; font-size: var(--fs-sm); cursor: pointer;
        }
        .settings-logout-confirm__actions .is-danger {
          border-color: var(--red); background: var(--red); color: var(--fixed-white);
        }
        /* [แก้ตามที่ระบุ] ปุ่ม "ดำเนินการต่อ" สีเขียว (ปุ่มลบถาวรขั้นสุดท้ายยังเป็นสีแดง) */
        .settings-logout-confirm__actions .is-primary {
          border-color: var(--g600); background: var(--g600); color: var(--fixed-white);
        }
        /* ── ป็อปอัพออกจากระบบแบบกระดานจัดอันดับ ── */
        .settings-logout-confirm__card.logout-lb-card {
          position: relative; padding: 36px 22px 22px; border-radius: 22px;
          border: 2px solid var(--lb-gold-edge); font-family: var(--font-display);
          box-shadow: 0 4px 0 color-mix(in srgb, var(--lb-gold-edge) 60%, var(--g800)), 0 16px 36px var(--glass-b-30);
        }
        .logout-lb-card__banner { position: absolute; top: -17px; left: 50%; transform: translateX(-50%); font-size: 15px; white-space: nowrap; }
        .logout-lb-card p { color: var(--lb-card-text); font-family: var(--font-display); }
        .logout-lb-card p.logout-lb-card__sub {
          color: var(--lb-card-text-sub); font-size: var(--fs-sm); font-weight: 600; line-height: 1.7;
          margin: 8px 0 20px; text-align: left;
        }
        .logout-lb-card .settings-logout-confirm__actions button {
          font-family: var(--font-display); border: 2px solid color-mix(in srgb, var(--lb-gold-edge) 55%, transparent);
          background: color-mix(in srgb, var(--fixed-white) 50%, transparent); color: var(--lb-card-text);
        }
        [data-theme="dark"] .logout-lb-card .settings-logout-confirm__actions button { background: color-mix(in srgb, var(--g900) 45%, transparent); }
        /* ปุ่มยืนยัน: เขียวอ่อน (โหมดสว่าง) / เขียวเข้ม (โหมดมืด) */
        .logout-lb-card .settings-logout-confirm__actions .logout-lb-card__confirm {
          background: var(--g200); border-color: var(--g400); color: var(--n900);
        }
        [data-theme="dark"] .logout-lb-card .settings-logout-confirm__actions .logout-lb-card__confirm {
          background: var(--g700); border-color: var(--g500); color: var(--fixed-white);
        }
        .settings-logout-confirm__actions .is-danger:disabled {
          opacity: 0.5; cursor: not-allowed;
        }

      `}</style>
    </Overlay>
  )
}

/* ====================================================================
   Components ย่อย (Sub Components)
   ==================================================================== */

interface SectionProps { label: string; children: ReactNode; index: number; accent: string; full?: boolean }
function Section({ label, children, index, full = false }: SectionProps) {
  return (
    <div
      className={`settings-section${full ? ' settings-section--full' : ''}`}
      style={{
        background: SETTINGS_SOFT_TINT,
        animation: `settingsSectionFadeUp .4s ${index * 60}ms cubic-bezier(.22,1,.36,1) both`,
      }}
    >
      <div className="settings-section__label">{label}</div>
      {children}
    </div>
  )
}

interface VolumeSliderProps { value: number; onChange: (value: number) => void; accent: string }
function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  const prevVal = useRef(value)
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    if (value !== prevVal.current) {
      setPulse(true); setTimeout(() => setPulse(false), 500); prevVal.current = value
    }
  }, [value])
  const speakerIcon = value === 0 ? '🔇' : value < 40 ? '🔈' : value < 75 ? '🔉' : '🔊'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}>
      <span className={pulse ? 'speaker-pulse' : ''} style={{ fontSize: 24, display: 'inline-block', transition: 'none', width: 30, textAlign: 'center' }}>{speakerIcon}</span>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--fixed-white)', height: 8 }} />
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', width: 34, textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{value}%</span>
    </div>
  )
}

interface SettingBtnProps { icon: ReactNode; label: string; onClick: () => void; accent: string }
function SettingBtn({ icon, label, onClick }: SettingBtnProps) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-md)', transition: 'background .15s, transform .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = SETTINGS_ON_TINT; e.currentTarget.style.transform = 'translateX(2px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'none' }}>
      <span style={{ fontSize: 20 }}>{icon}</span>{label}
    </button>
  )
}

/* [แก้ตามที่ระบุ] หน้าตั้งค่าไม่ใช้สีประจำ MBTI (บางแบบเป็นเหลือง เช่น ESFP) กับตัวหนังสือ/เส้นขอบ/ปุ่มอีกต่อไป
   เส้นขอบ = ทองบางๆ · สถานะเปิด = เขียว · พื้นไฮไลต์ = เขียวอ่อนจางๆ */
const SETTINGS_GOLD = '#C9A13B'
const SETTINGS_ON = 'var(--g500)'
const SETTINGS_ON_TINT = 'color-mix(in srgb, var(--g400) 14%, transparent)'
const SETTINGS_SOFT_TINT = 'color-mix(in srgb, var(--g400) 7%, transparent)'
const SETTINGS_HERO_BG = 'linear-gradient(135deg, color-mix(in srgb, var(--g400) 18%, transparent), color-mix(in srgb, var(--g400) 4%, transparent))'

/** [แก้ตามที่ระบุ] เอาความเป็น "ป็อบอัพลอยกลางจอ" ออก — เปลี่ยนเป็น full-screen section
 *  เหมือน InventoryModal/ShopSection ทุกจุด (พื้นทึบเต็มจอ + ปุ่มปิดกากบาทลอยมุมขวาบน
 *  + เนื้อหาเริ่มที่ 72px ใต้ปุ่มนั้น) แทนการ์ดลอยกลางจอแบบเดิม
 *  [แก้รอบหลัง] maxWidth เดิม 480px แคบเกินไปเทียบกับ ShopSection (1100)/InventoryModal (900)
 *  จนดูเหมือนการ์ดแคบๆ ลอยอยู่กลางพื้นที่ว่าง ขยายเป็น 760px — ยังแคบกว่า Shop/Inventory
 *  เพราะเนื้อหาเป็นฟอร์ม/รายการตั้งค่า ไม่ใช่กริดการ์ดสินค้า กว้างเกินไปจะยืดฟอร์มจนอ่านยาก
 *  แต่ section ต่างๆ เรียงเป็นกริด 2 คอลัมน์ (ดู .settings-grid) เพื่อใช้พื้นที่ที่กว้างขึ้นจริง
 *  ไม่ใช่แค่เพิ่มระยะขอบว่างๆ */
export function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void; accent?: string }) {
  useLockBodyScroll()
  useEscapeKey(onClose)
  return (
    // [แก้ตามที่ระบุ] ทั้งหน้าตั้งค่าใช้ฟอนต์เดียวกับกระดานจัดอันดับ (--font-display) — ปุ่ม/ช่องกรอกสืบทอดด้วย
    <div className="settings-root" style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', overflowY: 'auto', fontFamily: 'var(--font-display)' }}>
      {/* ปุ่มปิด (กากบาท) ลอยมุมขวาบน — แบบเดียวกับหน้าโปรไฟล์ (ProfilePage.tsx) */}
      <button
        onClick={onClose}
        title="ปิด"
        aria-label="ปิดหน้าตั้งค่า"
        style={{
          position: 'fixed', top: 14, right: 14, zIndex: 20, width: 44, height: 44, borderRadius: 99,
          border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--sh-card)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <img src={BADGE_ICONS.close} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
      </button>
      <div
        className="settings-overlay-card"
        style={{
          maxWidth: 760, margin: '0 auto',
          // [แก้บั๊ก] ปุ่ม "ออกจากระบบ" ที่อยู่ล่างสุดของเนื้อหาโดน ActionMenuBar (z-index:1000,
          // ลอยทับทุก modal เสมอตามที่ตั้งใจ — ดู ActionMenuBar.css) บังตอนเลื่อนจนสุด เพราะ
          // เดิม padding-bottom (48px) น้อยกว่าความสูงจริงของแถบเมนูลอย (~100px/~80px มือถือ)
          // ใช้ --gpf-safe-bottom (โทเคนกลางใน index.css) บวกระยะห่างเพิ่มอีกนิด แทนเลขตายตัว
          // 72px = เว้นปุ่มปิดลอยมุมขวาบน (top 14 + สูง 44) ไม่ให้ทับแถบหัวบนจอแคบ
          padding: '72px 20px calc(var(--gpf-safe-bottom, 100px) + 24px)',
          boxShadow: 'none',
        }}>
        {children}
        <style>{`
          /* [แก้ตามที่ระบุ — ป็อบอัพต้องขึ้นกลางจอ] จางเข้าอย่างเดียว ไม่ใช้ transform: บรรพบุรุษที่มี
             transform ทำให้ลูกที่เป็น position:fixed (ป็อบอัพยืนยัน/หน้าย่อย) ยึดกับการ์ดนี้แทนจอ
             ป็อบอัพจึงไปโผล่ด้านบนของหน้าให้ต้องเลื่อนขึ้นไปดู และหน้าย่อยไม่คลุมเต็มจอ */
          @keyframes settingsOverlayCardPop {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .settings-overlay-card { animation: settingsOverlayCardPop .32s cubic-bezier(.22,1,.36,1) both; }
          .settings-root button, .settings-root input, .settings-root select, .settings-root textarea { font-family: inherit; }
          /* [แก้ตามที่ระบุ] ตัวหนังสือทั้งหน้า: ดำในธีมสว่าง / ขาวในธีมมืด (--text สลับตามธีม) */
          .settings-root { --text-sub: var(--text); --heading-accent: var(--text); color: var(--text); }
          /* [แก้ตามที่ระบุ] เส้นขอบการ์ดทุกหมวด + แถบหัว: ทอง (ธีมสว่าง) / ขาว (ธีมมืด) */
          .settings-root { --settings-edge: #C9A13B; }
          [data-theme="dark"] .settings-root { --settings-edge: var(--fixed-white); }
          .settings-root .settings-section,
          .settings-root .settings-hero {
            border: 1.5px solid var(--settings-edge);
            box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--fixed-white) 55%, transparent), 0 4px 14px var(--glass-b-12);
          }
        `}</style>
      </div>
    </div>
  )
}

/* ====================================================================
   Sub-Modals (หน้าต่างย่อยสำหรับบัญชี / แจ้งเตือน / ความเป็นส่วนตัว)
   ==================================================================== */

/** [แก้รอบนี้ — บั๊ก Navbar ทับหน้าย่อย] เดิม SubModalTemplate เป็น position:'absolute'; inset:0
 *  ซึ่ง "containing block" ที่แท้จริงคือ div ชั้นนอกสุดของ Overlay (position:fixed; inset:0)
 *  เพราะ .settings-overlay-card (ตัวที่มี padding-top:95px กันชน Navbar) ไม่ได้ตั้ง position
 *  ไว้เลย (เป็น static) — inset:0 จึงชิดขอบบนสุดของจอจริงๆ ข้าม padding-top:95px ไปเฉยๆ
 *  ทำให้ทุกหน้าย่อย (โปรไฟล์/แจ้งเตือน/ความเป็นส่วนตัว) โผล่ทับ Navbar เหมือนที่ภาพหน้าจอ
 *  ล่าสุดแสดง — แก้ที่ต้นตอโดยให้ SubModalTemplate เป็น position:'fixed'; inset:0 ของตัวเอง
 *  (ไม่พึ่งพา positioning context ของพ่อแม่อีกต่อไป) พร้อม padding-top:95px เท่ากับ Overlay
 *  หลักเป๊ะ และ z-index สูงกว่า Overlay (500) เพื่อให้ลอยทับหน้าตั้งค่าหลักได้ถูกต้อง */
function SubModalTemplate({ title, onClose, children }: { title: string, onClose: () => void, accent: string, children: ReactNode }) {
  const { t } = useLanguage()
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 510, overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px calc(var(--gpf-safe-bottom, 100px) + 24px)' }}>
        {/* [แก้ตามที่ระบุ] หน้าตาเดียวกับหน้าตั้งค่า: แถบหัวมีกรอบ + เนื้อหาในการ์ดขอบทอง
            ไม่มีปุ่มกากบาทด้านบน — ปิดด้วยปุ่มยาวด้านล่างปุ่มเดียว */}
        <div className="settings-hero" style={{ background: SETTINGS_HERO_BG }}>
          <div className="settings-hero__title">{title}</div>
        </div>
        <div className="settings-section" style={{ background: SETTINGS_SOFT_TINT }}>
          {children}
        </div>
        <button type="button" onClick={onClose} className="settings-logout-btn" style={{ marginTop: 20 }}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------
// ProfileSettingsForm: ดึงข้อมูลตอนสมัคร (userData) มาแสดง และเพิ่มเอฟเฟกต์ Focus
// ----------------------------------------------------------------------
function ProfileSettingsForm({ userData, onSave }: { userData: UserData, accent: string, onSave: (d: Partial<UserData>) => void }) {
  // นำข้อมูล UserData มาใส่เป็นค่าเริ่มต้นให้ฟอร์ม
  const [formData, setFormData] = useState({
    email: userData.email || '',
    username: userData.username || '',
    birthDate: userData.birthDate ? userData.birthDate.split('T')[0] : '', // ดึงมาเฉพาะวันที่ YYYY-MM-DD
    gender: userData.gender ?? 'FEMALE',
    height: userData.height?.toString() || '',
    weight: userData.weight?.toString() || '',
    mbtiType: userData.mbtiType || 'INFP',
    bio: userData.bio || '',
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userData.avatarUrl)
  const [isProfilePrivate, setIsProfilePrivate] = useState(userData.isProfilePrivate)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  /** [ใหม่ — ข้อ 5a] อัปโหลดรูปโปรไฟล์ — โปรเจกต์นี้ยังไม่มีระบบเก็บไฟล์ขึ้นเซิร์ฟเวอร์จริง
   *  (เหมือนรูปแนบโพสต์ใน ComposeStoryModal.tsx) จึงอ่านเป็น data URL ฝั่ง client ล้วนๆ ผ่าน
   *  FileReader ไปก่อน วันที่มี endpoint อัปโหลดไฟล์จริง ค่อยเปลี่ยนเป็นยิงไฟล์ขึ้นก่อนแล้ว
   *  ค่อยเก็บ URL จริงแทน */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      gender: formData.gender as Gender,
      height: formData.height ? Number(formData.height) : null,
      weight: formData.weight ? Number(formData.weight) : null,
      mbtiType: formData.mbtiType as MbtiType,
      bio: formData.bio.trim() || null,
      avatarUrl,
      isProfilePrivate,
    })
  }

  // ดีไซน์ปุ่มและฟอร์ม อ้างอิงจากความเรียบหรูของ Login.tsx
  const FOCUS_GLOW = `0 0 0 4px ${C_1}, 0 0 10px ${C_2}`
  const BLUR_SHADOW = 'none'

  // [แก้] ฟิลด์สูงอย่างน้อย 44px (เดิม padding 12px + fs 14 ≈ 38px ต่ำกว่ามาตรฐาน)
  //
  // [แก้บั๊ก — ตามที่ระบุ ข้อ 7] เดิม background: var(--bg-body, ${BG_4}) — "--bg-body" ไม่ใช่
  // โทเคนที่มีอยู่จริงในระบบ (ไม่ได้ประกาศไว้ที่ :root ใน index.css เลย) ทำให้ var() นี้ invalid
  // เสมอ ตกไปใช้ fallback (#f8fafc สีขาวอมฟ้าอ่อน) ตรงๆ ทุกครั้งไม่ว่าธีมไหน — ส่วน color ใช้
  // var(--text, ...) ซึ่ง --text เป็นโทเคนจริงที่ "สลับกลับด้าน" ตอน dark mode (เกือบดำ →
  // เกือบขาว ดู [data-theme="dark"] ใน index.css) ผลคือพอสลับ dark mode ได้ตัวอักษรเกือบขาว
  // บนพื้นหลังที่ยังขาวอมฟ้าเหมือนเดิม (ไม่เคยเข้มขึ้นเลย) อ่านไม่ออกเลย — บั๊กเดียวกับที่เคย
  // พบและแก้ไปแล้วใน Login.tsx (แถวคอมเมนต์อธิบายไว้ที่นั่น) ต่างกันตรงที่หน้านี้ฟิลด์วางอยู่บน
  // .settings-overlay-card ที่มี var(--bg-card) เป็นพื้นหลังจริงอยู่แล้ว (ไม่ใช่วิดีโอเต็มจอ
  // แบบ Login) จึงแก้ที่ต้นตอตรงๆ แทน: เปลี่ยนไปอ้าง var(--input-bg) ซึ่งเป็นโทเคนที่มีอยู่จริง
  // และสร้างมาเพื่อพื้นหลังช่องกรอกฟอร์มโดยเฉพาะ (สลับ light/dark คู่กับ --text ถูกต้องแล้ว)
  const fieldStyle = {
    width: '100%', minHeight: 44, padding: '13px 14px', borderRadius: 12, boxSizing: 'border-box' as const,
    border: `2px solid var(--n200, ${BORDER_3})`, fontSize: 'var(--fs-md)', fontFamily: 'var(--font-display)',
    outline: 'none', background: 'var(--input-bg)', color: 'var(--text)',
    boxShadow: BLUR_SHADOW, transition: 'all .3s ease', marginBottom: 14
  }

  const labelStyle = { display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--n500)', marginBottom: 6 }
  /** [เพิ่มรอบนี้] ฟิลด์ที่ถูกล็อก (อีเมล/MBTI ที่ตั้งแล้ว) ใช้สไตล์หม่นลงเพื่อสื่อว่าแก้ไขไม่ได้ */
  const lockedFieldStyle = { ...fieldStyle, background: 'var(--n100)', color: 'var(--n400)', cursor: 'not-allowed' }
  /** [เพิ่มรอบนี้] MBTI ล็อกถาวรหลังตั้งค่าครั้งแรกแล้ว — ธีมต้นไม้ผูกกับ MBTI โดยตรง
   *  เปลี่ยนไปมาจะทำให้ธีม/สถิติที่สะสมไว้ไม่สอดคล้องกัน */
  const mbtiAlreadySet = !!userData.mbtiType

  // เอฟเฟกต์ตอนกดพิมพ์ช่องต่างๆ
  // [แก้บั๊ก — ตามที่ระบุ ข้อ 7] เดิม focus ใช้ var(--fixed-white) (ขาวล้วนตายตัว ไม่กลับสีตอน
  // dark mode ตามชื่อ — ดูคำอธิบาย --fixed-white ใน index.css) ตอนโฟกัสพิมพ์ตัวอักษรจึงกลาย
  // เป็นขาวเกือบขาวบนพื้นขาวล้วนเสมอใน dark mode (ยิ่งแย่กว่าตอน blur อีก เพราะ blur เดิมยัง
  // สุ่มได้ backgroun อ่อนที่ไม่ใช่ขาวสนิทจาก fallback บั๊ก) เปลี่ยนเป็น var(--input-bg) ให้
  // ตรงกับ fieldStyle ด้านบน (โทเคนเดียวกัน สลับ light/dark ถูกต้อง) ส่วน handleFieldBlur มี
  // บั๊ก var(--bg-body, ...) แบบเดียวกับ fieldStyle เปลี่ยนเป็น var(--input-bg) เช่นกัน
  const handleFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.boxShadow = FOCUS_GLOW
    e.target.style.borderColor = BORDER_6
    e.target.style.background = 'var(--input-bg)'
  }
  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.boxShadow = BLUR_SHADOW
    e.target.style.borderColor= `var(--n200, ${BORDER_7})`
    e.target.style.background= 'var(--input-bg)'
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

      {/* [ใหม่ — ข้อ 5a] อัปโหลดรูปโปรไฟล์ + preview ก่อนบันทึก */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: 'var(--n200)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-sub)',
        }}>
          {avatarUrl ? <img src={avatarUrl} alt="รูปโปรไฟล์" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (formData.username.trim().charAt(0).toUpperCase() || '?')}
        </div>
        <div>
          <button
            type="button" onClick={() => avatarInputRef.current?.click()}
            style={{ minHeight: 44, padding: '9px 18px', borderRadius: 999, border: `1.5px solid ${SETTINGS_GOLD}`, background: 'transparent', color: 'var(--text)', fontWeight: 700, fontSize: 'var(--fs-sm)' }}
          >
            🖼️ เปลี่ยนรูปโปรไฟล์
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} hidden />
        </div>
      </div>

      <label style={labelStyle}>อีเมล</label>
      <input type="email" name="email" value={formData.email} readOnly style={lockedFieldStyle} title="อีเมลเปลี่ยนไม่ได้ — ใช้เป็นตัวยืนยันตัวตนหลักของบัญชี" />
      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--n300)', marginTop: -10, marginBottom: 14 }}>อีเมลใช้ยืนยันตัวตนของบัญชี ไม่สามารถแก้ไขได้</p>

      <label style={labelStyle}>ชื่อผู้ใช้ (Username)</label>
      <input type="text" name="username" value={formData.username} onChange={handleChange} onFocus={handleFieldFocus} onBlur={handleFieldBlur} style={fieldStyle} required />
      {/* [แก้รอบนี้] ช่อง "เปลี่ยนรหัสผ่าน" เดิมตรงนี้ไม่เคยทำงานจริง (formData.password ไม่มีทาง
          ไปถึง userApi ไหนเลย — onSave ส่งเข้า updateProfile ที่แก้เฉพาะ UserData ซึ่งไม่มี field
          รหัสผ่านอยู่แล้วตามที่ตั้งใจ ดูคอมเมนต์ที่ UserData ใน types.ts) ย้ายไปทำใหม่ให้ทำงานจริง
          ที่หมวด "ความปลอดภัยบัญชี" แทน (ตรวจรหัสเดิมก่อนเปลี่ยนจริงผ่าน userApi.changePassword) */}

      {/* [ใหม่ — ข้อ 5b] รายละเอียด/แนะนำตัว — ใช้ field เดียวกับ userData.bio ที่ StoryProfilePage
          แสดงอยู่แล้ว (จุดนี้คือที่แก้จริง ไม่มีฟอร์มแยกซ้ำใน Story อีกต่อไป) */}
      <label style={labelStyle}>รายละเอียด/แนะนำตัว</label>
      <textarea
        name="bio" value={formData.bio} onChange={handleChange} onFocus={handleFieldFocus} onBlur={handleFieldBlur}
        placeholder="เล่าเกี่ยวกับตัวคุณสั้นๆ..." rows={3}
        style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'var(--font-display)' }}
      />

      <label style={labelStyle}>วันเกิด</label>
      <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} onFocus={handleFieldFocus} onBlur={handleFieldBlur} style={fieldStyle} />

      {/* [ใหม่] เพศ — วางไว้ใกล้ส่วนสูง/น้ำหนักตามที่ระบุ เพราะใช้ร่วมกันเลือกภาพ "รูปร่างของคุณ"
          ในหน้าโปรไฟล์ (ดู getBodyTypeImagePath ใน bodyTypeAssets.ts) แก้ไขได้ปกติ ไม่ล็อกแบบ MBTI */}
      <label style={labelStyle}>เพศ</label>
      <select name="gender" value={formData.gender} onChange={handleChange} onFocus={handleFieldFocus} onBlur={handleFieldBlur} style={fieldStyle}>
        <option value="FEMALE">หญิง</option>
        <option value="MALE">ชาย</option>
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>ส่วนสูง (ซม.)</label>
          <input type="number" name="height" value={formData.height} onChange={handleChange} onFocus={handleFieldFocus} onBlur={handleFieldBlur} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>น้ำหนัก (กก.)</label>
          <input type="number" name="weight" value={formData.weight} onChange={handleChange} onFocus={handleFieldFocus} onBlur={handleFieldBlur} style={fieldStyle} />
        </div>
      </div>

      <label style={labelStyle}>MBTI</label>
      <select
        name="mbtiType" value={formData.mbtiType} onChange={handleChange}
        onFocus={mbtiAlreadySet ? undefined : handleFieldFocus} onBlur={mbtiAlreadySet ? undefined : handleFieldBlur}
        disabled={mbtiAlreadySet}
        style={mbtiAlreadySet ? lockedFieldStyle : fieldStyle}
      >
        <option value="INTJ">INTJ</option>
        <option value="INTP">INTP</option>
        <option value="ENTJ">ENTJ</option>
        <option value="ENTP">ENTP</option>
        <option value="INFJ">INFJ</option>
        <option value="INFP">INFP</option>
        <option value="ENFJ">ENFJ</option>
        <option value="ENFP">ENFP</option>
        <option value="ISTJ">ISTJ</option>
        <option value="ISFJ">ISFJ</option>
        <option value="ESTJ">ESTJ</option>
        <option value="ESFJ">ESFJ</option>
        <option value="ISTP">ISTP</option>
        <option value="ISFP">ISFP</option>
        <option value="ESTP">ESTP</option>
        <option value="ESFP">ESFP</option>
      </select>
      {mbtiAlreadySet && (
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--n300)', marginTop: -10, marginBottom: 14 }}>
          MBTI ตั้งได้ครั้งเดียว — ธีมต้นไม้และสถิติที่สะสมไว้ผูกกับ MBTI นี้อยู่แล้ว
        </p>
      )}

      {/* [ใหม่ — ข้อ 11] ปิดโปรไฟล์ทั้งบัญชี — คนอื่นกดดูโปรไฟล์เราจาก list เพื่อน/คนกดไลค์/
          คอมเมนต์ไม่ได้ เจอแค่ toast "โพสต์ปิดโปรไฟล์" แทน (ไม่เกี่ยวกับ isAnonymous ของแต่ละ
          โพสต์ซึ่งเป็นคนละ field — อันนั้นซ่อนเฉพาะโพสต์ อันนี้ปิดทั้งบัญชี) */}
      <button
        type="button"
        onClick={() => setIsProfilePrivate((v) => !v)}
        className="settings-toggle-row"
        style={{
          border: `1.5px solid ${isProfilePrivate ? SETTINGS_GOLD : 'var(--border-mid)'}`,
          background: isProfilePrivate ? SETTINGS_ON_TINT : 'var(--bg-card)',
          marginBottom: 14,
        }}
      >
        <span>{isProfilePrivate ? '🔒 ปิดโปรไฟล์อยู่ — คนอื่นดูโปรไฟล์เราไม่ได้' : '🔓 เปิดโปรไฟล์อยู่ — คนอื่นดูโปรไฟล์เราได้'}</span>
        <span style={{ width: 44, height: 24, borderRadius: 99, position: 'relative', background: isProfilePrivate ? SETTINGS_ON : 'var(--n200)', transition: 'background .25s' }}>
          <span className="settings-toggle-knob" style={{ position: 'absolute', top: 2, left: isProfilePrivate ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'var(--fixed-white)', boxShadow: '0 1px 3px var(--glass-b-30)' }} />
        </span>
      </button>

      <button
        type="submit"
        style={{ width: '100%', minHeight: 48, padding: 14, background: 'linear-gradient(135deg, var(--g500), var(--g700))', color: 'var(--fixed-white)', border: 'none', borderRadius: 12, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', marginTop: 12, cursor: 'pointer', transition: 'transform 0.2s', boxShadow: `0 4px 12px ${SHADOW_9}` }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
      >
        บันทึกข้อมูลโปรไฟล์
      </button>
    </form>
  )
}

/** [เพิ่มรอบนี้ — ข้อ 4/5] ฟอร์มเปลี่ยนรหัสผ่านจริง (แทนที่ช่องเดิมใน ProfileSettingsForm ที่
 * ไม่เคยทำงาน) ต้องกรอกรหัสผ่านปัจจุบันให้ถูกก่อน — ตรวจผ่าน userApi.changePassword (มี hash
 * เทียบจริงในโหมด mock ดู user.api.ts) */
function ChangePasswordForm({ onChangePassword, onDone }: {
  accent: string
  onChangePassword?: (data: { currentPassword: string; newPassword: string }) => Promise<void>
  onDone: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fieldStyle: CSSProperties = {
    width: '100%', minHeight: 44, padding: '13px 14px', borderRadius: 12, boxSizing: 'border-box',
    border: '2px solid var(--n200)', fontSize: 'var(--fs-md)', fontFamily: 'var(--font-display)',
    outline: 'none', background: 'var(--input-bg)', color: 'var(--text)', marginBottom: 14,
  }
  const labelStyle: CSSProperties = { display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--n500)', marginBottom: 6 }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const strengthIssue = validatePasswordStrength(newPassword)
    if (strengthIssue) { setErrorMessage(strengthIssue); return }
    if (newPassword !== confirmPassword) { setErrorMessage('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'); return }

    setIsSubmitting(true)
    try {
      await onChangePassword?.({ currentPassword, newPassword })
      setSuccessMessage('เปลี่ยนรหัสผ่านสำเร็จแล้ว')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      window.setTimeout(onDone, 1200)
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.userMessage : 'เปลี่ยนรหัสผ่านไม่สำเร็จ ลองอีกครั้ง')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={labelStyle}>รหัสผ่านปัจจุบัน</label>
      <PasswordInput value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" required style={fieldStyle} />

      <label style={labelStyle}>รหัสผ่านใหม่</label>
      <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="อย่างน้อย 8 ตัวอักษร มีตัวอักษรและตัวเลข" required style={fieldStyle} />

      <label style={labelStyle}>ยืนยันรหัสผ่านใหม่</label>
      <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" required style={fieldStyle} />

      {errorMessage && <div style={{ marginBottom: 14, fontSize: 'var(--fs-xs)', color: '#c0392b', fontWeight: 700 }}>⚠️ {errorMessage}</div>}
      {successMessage && <div style={{ marginBottom: 14, fontSize: 'var(--fs-xs)', color: 'var(--text)', fontWeight: 700 }}>✅ {successMessage}</div>}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: '100%', minHeight: 48, padding: 14, background: 'linear-gradient(135deg, var(--g500), var(--g700))', color: 'var(--fixed-white)', border: 'none',
          borderRadius: 12, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.6 : 1,
        }}
      >
        {isSubmitting ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
      </button>
    </form>
  )
}

function MockToggleSettings({ options }: { options: string[], accent: string }) {
  const [states, setStates] = useState(options.map(() => true))
  const toggle = (index: number) => setStates(prev => prev.map((s, i) => i === index ? !s : s))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {options.map((opt, i) => (
        <label key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, padding: '12px 14px', background: SETTINGS_SOFT_TINT, borderRadius: 12, cursor: 'pointer', fontSize: 'var(--fs-md)', color: 'var(--text)' }}>
          {opt}
          <input type="checkbox" checked={states[i]} onChange={() => toggle(i)} style={{ accentColor: 'var(--g600)', width: 22, height: 22, flexShrink: 0 }} />
        </label>
      ))}
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--n300)', textAlign: 'center', marginTop: 20 }}>
        * การตั้งค่านี้จะถูกบันทึกลงในระบบโดยอัตโนมัติ
      </div>
    </div>
  )
}
