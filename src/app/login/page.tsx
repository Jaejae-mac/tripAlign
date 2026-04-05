/**
 * 로그인 페이지
 * Google OAuth로 로그인합니다. 인증 후 메인 페이지(/)로 이동합니다.
 */
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { MapPin, CalendarDays, Wallet, Plane } from 'lucide-react'

// 서비스 특징 목록 — 이모지 대신 Lucide SVG 아이콘 사용
const FEATURES = [
  { Icon: CalendarDays, label: '일별 일정 관리', color: 'text-sky-500',    bg: 'bg-sky-50'    },
  { Icon: Wallet,       label: '지출 가계부',    color: 'text-orange-500', bg: 'bg-orange-50' },
  { Icon: Plane,        label: '여행 플랜 저장', color: 'text-violet-500', bg: 'bg-violet-50' },
] as const

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-sm">
        {/* 로고 및 서비스 소개 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            TripAlign
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            여행 일정과 지출을<br />한 곳에서 스마트하게 관리하세요
          </p>
        </div>

        {/* 로그인 카드 */}
        <div
          className="bg-white rounded-2xl p-8 border border-border"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-1">
            시작하기
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Google 계정으로 간편하게 로그인하세요
          </p>

          <GoogleLoginButton />

          {/* 에러 메시지 */}
          <LoginError searchParams={searchParams} />
        </div>

        {/* 서비스 특징 요약 */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {FEATURES.map(({ Icon, label, color, bg }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              {label}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

/** URL 쿼리에 error 파라미터가 있을 때 에러 메시지를 보여줍니다 */
async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  if (!params.error) return null

  return (
    <p className="mt-4 text-sm text-destructive text-center">
      로그인에 실패했습니다. 다시 시도해 주세요.
    </p>
  )
}
