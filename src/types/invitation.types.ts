/**
 * 플랜 공유 초대 관련 타입 정의
 * 초대 발송(오너) → 수락/거절(수신자) → 멤버 등록 흐름을 지원합니다.
 */
import type { TravelPlan } from './plan.types'

/** 멤버 권한: viewer(읽기 전용) | editor(일정·지출 편집 가능) */
export type InvitationRole = 'viewer' | 'editor'

/** 초대 상태 */
export type InvitationStatus = 'pending' | 'accepted' | 'rejected'

/** plan_invitations 테이블 행 */
export interface PlanInvitation {
  id: string
  plan_id: string
  invited_by: string
  /** 수신자 화면에 표시할 초대자 이름 (Google 이름 or 이메일) */
  invited_by_name: string
  email: string
  role: InvitationRole
  status: InvitationStatus
  created_at: string
}

/** plan_members 테이블 행 — 수락이 완료된 멤버 */
export interface PlanMember {
  id: string
  plan_id: string
  user_id: string
  role: InvitationRole
  joined_at: string
}

/** getSharedPlans() Supabase join 결과 — plan_members + travel_plans */
export interface SharedPlanEntry {
  plan_id: string
  role: InvitationRole
  joined_at: string
  travel_plans: TravelPlan
}

/**
 * getMyPendingInvitations() Supabase join 결과
 * 수신자가 수락/거절 카드에서 플랜 제목·목적지를 미리 볼 수 있도록 포함
 */
export interface PendingInvitationEntry extends PlanInvitation {
  travel_plans: Pick<TravelPlan, 'id' | 'title' | 'destination' | 'cover_image'>
}
