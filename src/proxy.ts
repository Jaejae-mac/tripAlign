/**
 * Next.js 프록시 — 모든 요청에서 Supabase 세션 쿠키를 자동으로 갱신합니다.
 * 인증 여부·약관 동의 여부에 따라 적절한 페이지로 안내합니다.
 *
 * 보호 규칙:
 * - 미로그인 + 보호 라우트 → /login
 * - 로그인O + 미동의 + 보호 라우트 → /consent?next={원래경로}
 * - 로그인O + 동의완료 + /consent 재접근 → /
 * - 로그인O + /login 접근 → /
 * - /login, /terms, /privacy, /auth/* → 공개 (체크 생략)
 *
 * (Next.js 16+에서 middleware.ts 대신 proxy.ts 사용)
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/types/consent.types'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 세션 쿠키 갱신을 위한 Supabase 클라이언트 생성
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() 대신 getUser() 사용 — 서버에서 실제 API 검증 수행
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 1. 공개 라우트: 인증·동의 체크 없이 통과
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname.startsWith('/auth/')

  if (isPublicRoute) {
    // 이미 로그인한 유저가 /login 접근 시 메인으로 이동
    if (user && pathname === '/login') {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      return NextResponse.redirect(homeUrl)
    }
    return supabaseResponse
  }

  // 2. 보호 라우트: 미로그인 시 로그인 페이지로
  const isProtected = pathname === '/' || pathname.startsWith('/plans')

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 3. 로그인된 유저 — 약관 동의 여부 확인
  // 성능 최적화: id와 버전만 조회 (전체 row 불필요)
  if (user) {
    const { data: consent } = await supabase
      .from('user_consents')
      .select('id, terms_version, privacy_version')
      .eq('user_id', user.id)
      .maybeSingle()

    const hasValidConsent =
      !!consent &&
      consent.terms_version === CURRENT_TERMS_VERSION &&
      consent.privacy_version === CURRENT_PRIVACY_VERSION

    const isConsentPage = pathname === '/consent'

    // 3-a. 동의 완료 유저가 /consent 재방문 → 메인으로 이동 (중복 동의 방지)
    if (isConsentPage && hasValidConsent) {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/'
      return NextResponse.redirect(homeUrl)
    }

    // 3-b. 미동의 유저가 /consent 이외의 보호 라우트 접근 → /consent로 안내
    if (!hasValidConsent && !isConsentPage && isProtected) {
      const consentUrl = request.nextUrl.clone()
      consentUrl.pathname = '/consent'
      consentUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(consentUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  // 정적 파일, 이미지, favicon 제외한 모든 경로에 프록시 적용
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
