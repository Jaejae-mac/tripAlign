/**
 * 여행 플랜 비즈니스 로직 서비스 레이어
 * Supabase 클라이언트를 받아 플랜 CRUD를 처리합니다.
 * 컴포넌트가 DB 로직을 직접 알지 않아도 되도록 분리합니다.
 */
import { createClient } from '@/lib/supabase/client'
import type { TravelPlan, CreatePlanDto, UpdatePlanDto } from '@/types/plan.types'

/** 현재 로그인한 사용자의 플랜 목록 조회 */
export async function getPlans(): Promise<TravelPlan[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('travel_plans')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

/** 특정 플랜 단건 조회 */
export async function getPlanById(planId: string): Promise<TravelPlan> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('travel_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 새 플랜 생성 */
export async function createPlan(dto: CreatePlanDto): Promise<TravelPlan> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  const { data, error } = await supabase
    .from('travel_plans')
    .insert({ ...dto, user_id: user.id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 플랜 수정 */
export async function updatePlan(
  planId: string,
  dto: UpdatePlanDto
): Promise<TravelPlan> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('travel_plans')
    .update(dto)
    .eq('id', planId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 플랜 삭제 (연관된 day_schedules, expenses는 DB CASCADE로 자동 삭제) */
export async function deletePlan(planId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('travel_plans')
    .delete()
    .eq('id', planId)

  if (error) throw new Error(error.message)
}
