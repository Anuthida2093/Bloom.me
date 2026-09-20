import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LazyMotion, domAnimation } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import { AudioProvider } from './context/AudioContext'
import ErrorBoundary from './components/common/ErrorBoundary'
import RouteFallback from './components/common/RouteFallback'
import { ApiError } from './services/http'

/*============================================================================*\
  App — [แก้รอบนี้]
   1. แยก bundle ตาม route ด้วย React.lazy — เดิมทุก route โหลด bundle เดียวกันหมด
      หน้า Login จึงต้องดาวน์โหลด framer-motion + ต้นไม้ + ระบบเควสทั้งชุดก่อน
      ถึงจะแสดงช่องกรอกรหัสผ่านได้
   2. ครอบ ErrorBoundary — เดิมถ้าคอมโพเนนต์ไหน throw ระหว่างเรนเดอร์ ผู้ใช้เห็นจอขาว
   3. เพิ่ม QueryClientProvider — ชั้นจัดการข้อมูลจากเซิร์ฟเวอร์ (cache/refetch/retry)
   4. LazyMotion + domAnimation — โหลดเฉพาะฟีเจอร์ของ framer-motion ที่ใช้จริง
      ประหยัดประมาณ 25KB gzip โดยเปลี่ยนแค่ <motion.div> เป็น <m.div>

  ลำดับ Provider สำคัญและห้ามสลับ:
    QueryClient → AppProvider (User → Progress → UI) → AudioProvider
    AudioProvider ต้องอยู่ในสุดเพราะอ่าน settings.soundEnabled จาก UIContext
\*============================================================================*/

const WelcomeModal = lazy(() => import('./components/welcome/WelcomeModal'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const MBTISelect = lazy(() => import('./pages/MBTISelect'))
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // ไม่ลองใหม่กับ error ที่ลองกี่ครั้งก็ได้ผลเดิม (401/403/404) — เสียเวลาผู้ใช้เปล่าๆ
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false
        return failureCount < 2
      },
    },
    mutations: { retry: 0 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AudioProvider>
          <LazyMotion features={domAnimation}>
            <ErrorBoundary scope="แอปพลิเคชัน">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<WelcomeModal />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/mbti" element={<MBTISelect />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ErrorBoundary scope="หน้าหลัก">
                        <Dashboard />
                      </ErrorBoundary>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </LazyMotion>
        </AudioProvider>
      </AppProvider>
    </QueryClientProvider>
  )
}