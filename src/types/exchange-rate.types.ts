/**
 * 환율 설정 관련 타입 정의
 * 플랜별 자동/수동 환율 모드를 지원합니다.
 */

/** 환율 모드: 자동(API) 또는 수동(직접 입력) */
export type RateMode = 'auto' | 'manual'

/** 통화별 기준 단위 — JPY는 100엔 기준, 나머지는 1단위 */
export const CURRENCY_UNITS: Record<string, number> = {
  USD: 1,
  EUR: 1,
  JPY: 100,
  CNY: 1,
}

/** DB에서 조회한 플랜 환율 설정 */
export interface PlanExchangeRate {
  id: string
  plan_id: string
  currency: string      // 'USD' | 'JPY' | 'EUR' | 'CNY'
  custom_rate: number   // unit 기준 KRW 금액 (예: 100 JPY = 964 KRW → custom_rate = 964, unit = 100)
  unit: number          // 기준 단위 (JPY: 100, 나머지: 1)
  mode: RateMode
  updated_at: string
}

/** 환율 upsert 요청 DTO */
export interface UpsertExchangeRateDto {
  plan_id: string
  currency: string
  custom_rate: number
  unit: number
  mode: RateMode
}
