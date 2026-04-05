/**
 * 서버(Server Component, API Route, Server Action)에서 사용하는 Supabase 클라이언트
 * Next.js의 cookies()를 활용해 세션을 읽고 씁니다.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 무시 — middleware가 세션 갱신을 처리합니다.
          }
        },
      },
    }
  )
}
