/**
 * 플랜 상세 페이지 (서버 컴포넌트)
 * 플랜 정보를 서버에서 가져와 클라이언트 컴포넌트에 전달합니다.
 * 탭을 통해 일정(Schedule) / 가계부(Wallet) 뷰를 전환합니다.
 */
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlanDetailClient } from './PlanDetailClient'

interface PlanDetailPageProps {
  params: Promise<{ planId: string }>
}

export default async function PlanDetailPage({ params }: PlanDetailPageProps) {
  const { planId } = await params
  const supabase = await createClient()

  // 현재 로그인한 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 플랜 정보 조회 (RLS가 자동으로 본인 소유 여부를 체크합니다)
  const { data: plan, error } = await supabase
    .from('travel_plans')
    .select('*')
    .eq('id', planId)
    .single()

  // 플랜이 없거나 접근 권한이 없는 경우 404
  if (error || !plan) notFound()

  // 현재 유저가 플랜 소유자인지 서버에서 계산 (오너만 수정 버튼을 볼 수 있음)
  const isOwner = plan.user_id === user.id

  // user_id는 서버에서만 필요하므로 클라이언트에 전달하지 않음
  const { user_id: _ownerId, ...planWithoutUserId } = plan

  return <PlanDetailClient plan={planWithoutUserId} user={user} isOwner={isOwner} />
}
