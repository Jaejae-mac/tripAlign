/**
 * 지출(가계부) 관련 타입 정의
 * 여행 플랜마다 연결된 지출 내역을 관리합니다.
 */

/** 지출 카테고리 */
export type ExpenseCategory =
  | 'food'        // 식비
  | 'transport'   // 교통
  | 'stay'        // 숙박
  | 'tour'        // 관광/입장료
  | 'shopping'    // 쇼핑
  | 'etc'         // 기타

/** 지원 통화 목록 */
export type Currency = 'KRW' | 'USD' | 'JPY' | 'EUR' | 'CNY'

/** 건별 환율 모드 */
export type ExpenseRateMode = 'plan' | 'custom'

/** DB에서 조회한 지출 항목 */
export interface Expense {
  id: string
  plan_id: string
  date: string          // ISO 날짜 문자열
  category: ExpenseCategory
  title: string
  amount: number
  currency: Currency
  memo: string | null
  created_at: string
  // 건별 환율 필드 (migration_expense_exchange_rate.sql 추가)
  rate_mode: ExpenseRateMode   // 'plan' | 'custom'
  exchange_rate: number | null // unit 기준 KRW 금액 (custom 모드에서만 사용)
  unit: number                 // 기준 단위 (JPY: 100, 나머지: 1)
  // 영수증 이미지 URL (migration_expense_receipt.sql 추가)
  receipt_url: string | null
}

/** 새 지출 항목 생성 시 DTO */
export interface CreateExpenseDto {
  plan_id: string
  date: string
  category: ExpenseCategory
  title: string
  amount: number
  currency: Currency
  memo?: string
  rate_mode?: ExpenseRateMode
  exchange_rate?: number | null
  unit?: number
  receipt_url?: string | null
}

/** 지출 수정 시 DTO */
export interface UpdateExpenseDto {
  date?: string
  category?: ExpenseCategory
  title?: string
  amount?: number
  currency?: Currency
  memo?: string
  rate_mode?: ExpenseRateMode
  exchange_rate?: number | null
  unit?: number
  receipt_url?: string | null
}

/** 지출 추가/수정 폼 데이터 */
export interface ExpenseFormData {
  date: Date
  category: ExpenseCategory
  title: string
  amount: number
  currency: Currency
  memo: string
}

/** 카테고리별 합계 요약 */
export interface ExpenseSummaryByCategory {
  category: ExpenseCategory
  total: number
  currency: Currency
}
