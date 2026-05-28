/**
 * 메인 페이지 (서버 컴포넌트)
 * 로그인한 사용자의 여행 플랜 목록을 보여줍니다.
 * proxy.ts(미들웨어)가 이미 getUser()로 JWT를 검증했으므로
 * 여기서는 getSession()으로 쿠키를 읽기만 합니다 (추가 네트워크 왕복 없음).
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainPageClient } from './MainPageClient'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // proxy.ts에서 미인증 시 이미 리다이렉트하지만 방어적 체크 유지
  if (!session?.user) redirect('/login')

  return <MainPageClient user={session.user} />
}
