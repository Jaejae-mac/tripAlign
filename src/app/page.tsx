/**
 * 메인 페이지 (서버 컴포넌트)
 * 로그인한 사용자의 여행 플랜 목록을 보여줍니다.
 * 미들웨어에서 인증을 보호하므로, 여기서는 user 정보만 가져옵니다.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainPageClient } from './MainPageClient'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 미들웨어에서 처리되지만, 방어적으로 한 번 더 체크
  if (!user) redirect('/login')

  return <MainPageClient user={user} />
}
