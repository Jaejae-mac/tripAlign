/**
 * 플랜별 환율 설정 서비스
 * 수동 환율 조회·저장 기능을 제공합니다.
 * 실제 환율 계산(API fetch)은 currency.service.ts가 담당합니다.
 */
import { createBrowserClient } from '@supabase/ssr'
import type { PlanExchangeRate, UpsertExchangeRateDto } from '@/types/exchange-rate.types'

/** 브라우저 전용 Supabase 클라이언트 생성 */
function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * 플랜의 모든 통화 환율 설정을 조회합니다.
 * 저장된 항목이 없으면 빈 배열을 반환합니다.
 */
export async function getPlanExchangeRates(planId: string): Promise<PlanExchangeRate[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('plan_exchange_rates')
    .select('*')
    .eq('plan_id', planId)

  if (error) throw new Error(`환율 설정 조회 실패: ${error.message}`)
  return (data ?? []) as PlanExchangeRate[]
}

/**
 * 플랜의 특정 통화 환율을 저장합니다.
 * 이미 해당 통화 설정이 있으면 덮어씁니다 (upsert).
 */
export async function upsertExchangeRate(dto: UpsertExchangeRateDto): Promise<PlanExchangeRate> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('plan_exchange_rates')
    .upsert(
      {
        plan_id:     dto.plan_id,
        currency:    dto.currency,
        custom_rate: dto.custom_rate,
        unit:        dto.unit,
        mode:        dto.mode,
      },
      { onConflict: 'plan_id,currency' }
    )
    .select()
    .single()

  if (error) throw new Error(`환율 설정 저장 실패: ${error.message}`)
  return data as PlanExchangeRate
}

/**
 * 특정 통화의 환율 모드를 '자동'으로 초기화합니다.
 * 수동으로 입력한 값은 유지되지만 mode가 'auto'로 변경됩니다.
 */
export async function resetToAuto(planId: string, currency: string): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase
    .from('plan_exchange_rates')
    .update({ mode: 'auto' })
    .eq('plan_id', planId)
    .eq('currency', currency)

  if (error) throw new Error(`환율 초기화 실패: ${error.message}`)
}
