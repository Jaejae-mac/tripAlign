/**
 * Next.js 프록시 — 모든 요청에서 Supabase 세션 쿠키를 자동으로 갱신합니다.
 * 인증이 필요한 라우트를 보호하고, 미인증 사용자는 로그인 페이지로 리다이렉트합니다.
 *
 * (Next.js 16+에서 middleware.ts 대신 proxy.ts 사용)
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // getSession() 대신 getUser()를 사용해야 합니다 — 서버에서 실제 API 검증 수행
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 인증이 필요한 경로에서 미인증 사용자를 로그인 페이지로 리다이렉트
  const isProtected =
    pathname === '/' || pathname.startsWith('/plans')

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 이미 로그인한 사용자가 로그인 페이지 접근 시 메인으로 리다이렉트
  if (user && pathname === '/login') {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}

export const config = {
  // 정적 파일, 이미지, favicon 제외한 모든 경로에 프록시 적용
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
