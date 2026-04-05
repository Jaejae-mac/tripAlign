/**
 * 플랜 공유 초대 서비스 레이어
 * 초대 발송(오너), 수락·거절(수신자), 멤버 관리, 공유 플랜 조회를 담당합니다.
 */
import { createClient } from '@/lib/supabase/client'
import type {
  InvitationRole,
  PlanInvitation,
  PlanMember,
  SharedPlanEntry,
  PendingInvitationEntry,
} from '@/types/invitation.types'

// ─────────────────────────────────────────────
// 오너 측 — 초대 발송 및 멤버 관리
// ─────────────────────────────────────────────

/**
 * 이메일로 친구를 플랜에 초대합니다.
 * - 현재 로그인 유저의 이름을 invited_by_name에 저장해 수신자 화면에 표시합니다.
 * - 자기 자신 초대, 중복 초대 여부는 클라이언트에서 먼저 검사합니다.
 */
export async function inviteMember(
  planId: string,
  email: string,
  role: InvitationRole
): Promise<PlanInvitation> {
  const supabase = createClient()

  // 현재 로그인 유저 정보 조회 (초대자 이름 저장용)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  // 자기 자신 초대 방지
  if (user.email?.toLowerCase() === email.toLowerCase()) {
    throw new Error('자기 자신은 초대할 수 없습니다.')
  }

  const inviterName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? '알 수 없음'

  const { data, error } = await supabase
    .from('plan_invitations')
    .insert({
      plan_id: planId,
      invited_by: user.id,
      invited_by_name: inviterName,
      email: email.toLowerCase().trim(),
      role,
    })
    .select()
    .single()

  if (error) {
    // DB UNIQUE 제약 위반 → 이미 초대된 이메일
    if (error.code === '23505') throw new Error('이미 초대된 이메일입니다.')
    throw new Error(error.message)
  }

  return data
}

/** 특정 플랜의 초대 목록 조회 (오너용 — pending/accepted/rejected 전체) */
export async function getPlanInvitations(planId: string): Promise<PlanInvitation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('plan_invitations')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

/** 특정 플랜의 수락된 멤버 목록 조회 (오너용) */
export async function getPlanMembers(planId: string): Promise<PlanMember[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('plan_members')
    .select('*')
    .eq('plan_id', planId)
    .order('joined_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * 멤버를 플랜에서 제거합니다 (오너가 추방 또는 본인이 나가기).
 * DB 함수 remove_member를 호출하여 plan_members 삭제와 invitation 레코드 정리를 원자적으로 처리합니다.
 * - 클라이언트에서 auth.users.email을 조회할 수 없으므로 서버 함수에서 처리합니다.
 * - 오너와 본인 모두 호출 가능하며, 권한 검증도 함수 내에서 수행합니다.
 */
export async function removeMember(planId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('remove_member', {
    p_plan_id: planId,
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
}

/** pending 초대를 취소합니다 (오너용) */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('plan_invitations')
    .delete()
    .eq('id', invitationId)

  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────
// 수신자 측 — 초대 확인 및 수락/거절
// ─────────────────────────────────────────────

/**
 * 나에게 온 pending 초대 목록을 조회합니다.
 * RLS `invitations_invitee_select` 정책이 현재 유저의 이메일로 자동 필터링합니다.
 * travel_plans 조인으로 플랜 제목·목적지를 함께 가져와 수락 카드에 표시합니다.
 */
export async function getMyPendingInvitations(): Promise<PendingInvitationEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('plan_invitations')
    .select('*, travel_plans(id, title, destination, cover_image)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as PendingInvitationEntry[]
}

/**
 * 초대를 수락합니다.
 * DB 함수 `accept_invitation`을 호출하여 plan_members에 삽입합니다.
 * (invitee는 plan_members에 직접 INSERT 권한이 없으므로 SECURITY DEFINER 함수로 처리)
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('accept_invitation', {
    p_invitation_id: invitationId,
  })

  if (error) throw new Error(error.message)
}

/** 초대를 거절합니다. DB 함수 `reject_invitation` 호출. */
export async function rejectInvitation(invitationId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reject_invitation', {
    p_invitation_id: invitationId,
  })

  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────
// 공유 플랜 목록 조회
// ─────────────────────────────────────────────

/**
 * 내가 멤버로 수락된 공유 플랜 목록을 조회합니다.
 * RLS `members_self_select` 정책이 현재 유저 기준으로 자동 필터링합니다.
 */
export async function getSharedPlans(): Promise<SharedPlanEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('plan_members')
    .select('plan_id, role, joined_at, travel_plans(*)')
    .order('joined_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SharedPlanEntry[]
}
