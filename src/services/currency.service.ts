/**
 * 환율 서비스
 * open.er-api.com (USD 기준)에서 환율을 가져와 KRW 환산율을 계산합니다.
 *
 * [이전 버그] frankfurter.app (ECB 기준)은 KRW를 미지원 → data.rates.KRW = undefined → 전체 NaN
 * [수정] open.er-api.com은 KRW를 포함하여 rates.KRW가 직접 제공됨
 *
 * 공식: 1 외화 = (rates.KRW / rates.외화) KRW
 *   예) USD 기준 KRW=1408.5, EUR=0.926 → 1 EUR = 1408.5 / 0.926 ≈ 1521 KRW
 */
import type { Currency } from '@/types/expense.types'

/** 1 외화 = N KRW 형태의 환율 맵 */
export type KrwRates = Record<Currency, number>

/** open.er-api.com /v6/latest/USD 응답 형태 */
interface OpenExchangeRateResponse {
  base_code: string
  rates: Record<string, number>
}

// 모듈 레벨 메모리 캐시 — 세션 내 반복 API 호출 방지
let _cache: { rates: KrwRates; ts: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1시간

/**
 * 각 통화의 KRW 환산율을 반환합니다. (1 외화 = N KRW)
 * 캐시가 유효하면 재사용하고, 만료 시 /api/exchange-rates를 새로 호출합니다.
 */
export async function fetchKrwRates(): Promise<KrwRates> {
  const now = Date.now()

  // 캐시가 유효한 경우 재사용
  if (_cache && now - _cache.ts < CACHE_TTL_MS) {
    return _cache.rates
  }

  const res = await fetch('/api/exchange-rates')
  if (!res.ok) throw new Error('환율 API 호출 실패')

  const data: OpenExchangeRateResponse = await res.json()

  // KRW 기준값 검증 — open.er-api.com은 KRW를 포함하므로 undefined면 API 에러
  const baseKrw = data.rates['KRW']
  if (!baseKrw || isNaN(baseKrw)) {
    throw new Error('KRW 환율 데이터를 찾을 수 없습니다.')
  }

  // 1 외화 = (rates.KRW / rates.외화) KRW 공식으로 환산율 계산
  const rates: KrwRates = {
    KRW: 1,
    USD: baseKrw / (data.rates['USD'] ?? NaN),
    EUR: baseKrw / (data.rates['EUR'] ?? NaN),
    JPY: baseKrw / (data.rates['JPY'] ?? NaN),
    CNY: baseKrw / (data.rates['CNY'] ?? NaN),
  }

  // 계산된 환율에 NaN이나 0 이하 값이 있으면 캐시하지 않고 에러
  const hasInvalidRate = Object.values(rates).some((r) => isNaN(r) || r <= 0)
  if (hasInvalidRate) {
    throw new Error('유효하지 않은 환율 데이터입니다.')
  }

  _cache = { rates, ts: now }
  return rates
}

/**
 * 금액을 KRW로 환산합니다 (소수점 반올림).
 * KRW 그대로이면 변환 없이 반환합니다.
 */
export function convertToKrw(
  amount: number,
  currency: Currency,
  rates: KrwRates
): number {
  if (currency === 'KRW') return amount
  return Math.round(amount * rates[currency])
}
