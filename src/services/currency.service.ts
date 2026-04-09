/**
 * 환율 서비스
 * - fetchKrwRates(date?) : 날짜별 KRW 환산율 반환
 *   - date 없음 → 오늘 환율 (open.er-api.com, 1시간 캐시)
 *   - date 있음 → 지출일 역사적 환율 (fawaz-ahmed, 24시간 캐시)
 *
 * 공식: 1 외화 = (rates.KRW / rates.외화) KRW
 *   예) USD 기준 KRW=1408.5, EUR=0.926 → 1 EUR = 1408.5 / 0.926 ≈ 1521 KRW
 */
import type { Currency } from '@/types/expense.types'

/** 1 외화 = N KRW 형태의 환율 맵 */
export type KrwRates = Record<Currency, number>

/** /api/exchange-rates 응답 형태 */
interface OpenExchangeRateResponse {
  base_code: string
  rates: Record<string, number>
}

// 날짜 키별 메모리 캐시 (cacheKey → {rates, ts})
// 오늘 환율 키: 'today', 역사적 환율 키: 'YYYY-MM-DD'
const _cacheByDate = new Map<string, { rates: KrwRates; ts: number }>()
const TTL_TODAY_MS   = 60 * 60 * 1000       // 1시간 (오늘 환율)
const TTL_HISTORY_MS = 24 * 60 * 60 * 1000  // 24시간 (과거 날짜 = 불변)

/**
 * 각 통화의 KRW 환산율을 반환합니다. (1 외화 = N KRW)
 * @param date - "YYYY-MM-DD" 형태의 지출일. 없으면 오늘 환율 사용.
 */
export async function fetchKrwRates(date?: string): Promise<KrwRates> {
  const cacheKey = date ?? 'today'
  const ttl = date ? TTL_HISTORY_MS : TTL_TODAY_MS
  const now = Date.now()

  // 캐시 유효 시 재사용
  const cached = _cacheByDate.get(cacheKey)
  if (cached && now - cached.ts < ttl) return cached.rates

  const url = date ? `/api/exchange-rates?date=${date}` : '/api/exchange-rates'
  const res = await fetch(url)
  if (!res.ok) throw new Error('환율 API 호출 실패')

  const data: OpenExchangeRateResponse = await res.json()

  // KRW 기준값 검증
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

  const hasInvalidRate = Object.values(rates).some((r) => isNaN(r) || r <= 0)
  if (hasInvalidRate) throw new Error('유효하지 않은 환율 데이터입니다.')

  _cacheByDate.set(cacheKey, { rates, ts: now })
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
