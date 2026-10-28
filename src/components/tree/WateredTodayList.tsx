import { useQuery } from '@tanstack/react-query'
import { getWateredMeToday } from '../../services/api/friendWater.api'
import { queryKeys } from '../../services/queryKeys'
import { useLanguage } from '../../context/LanguageContext'
import { WaterDrop } from '../friends/FriendWater'

/** [ใหม่ตามที่ระบุ] แผงข้อมูลต้นไม้: วันนี้ใครรดน้ำให้เราบ้าง (ชื่อ + เวลา) */
export default function WateredTodayList() {
  const { t } = useLanguage()
  const { data: list = [] } = useQuery({ queryKey: queryKeys.wateredMeToday, queryFn: getWateredMeToday, staleTime: 30_000 })

  return (
    <div className="tree-stats-panel__section" style={{ animationDelay: '210ms' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-sub)', marginBottom: 8 }}>💧 {t('stats.wateredToday')}</div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('stats.wateredNone')}</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((w) => (
            <li key={w.friendId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)' }}>
              <WaterDrop status="full" size={16} />
              <span style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.username}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(w.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
