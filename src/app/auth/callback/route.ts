/**
 * Google OAuth 콜백 처리 라우트
 * Supabase가 인증 후 이 URL로 리다이렉트하면, 인가 코드를 세션으로 교환합니다.
 * 세션 교환 후 약관 동의 여부를 확인하여 미동의 신규 유저는 /consent 페이지로 안내합니다.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasConsented } from '@/services/consent.service'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  // 오픈 리다이렉트 공격 방지
  // - 절대 경로(http://, //evil.com 등)는 모두 '/'로 초기화
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 세션 교환 성공 후 현재 유저 조회
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // 약관 동의 여부 확인 — 미동의(신규 유저) 또는 약관 버전 변경 시 /consent로 이동
        const consented = await hasConsented(supabase, user.id)
        if (!consented) {
          // 동의 완료 후 원래 목적지로 돌아올 수 있도록 next를 체인
          next = `/consent?next=${encodeURIComponent(next)}`
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // 환경변수에 등록된 허용 호스트만 신뢰 — 미등록 호스트는 origin 사용
        const allowedHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '')
        const trustedHost = allowedHost && forwardedHost === allowedHost
          ? forwardedHost
          : new URL(origin).host
        return NextResponse.redirect(`https://${trustedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // 인증 실패 시 에러 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
