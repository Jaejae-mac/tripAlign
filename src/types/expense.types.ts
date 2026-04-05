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
}

/** 지출 수정 시 DTO */
export interface UpdateExpenseDto {
  date?: string
  category?: ExpenseCategory
  title?: string
  amount?: number
  currency?: Currency
  memo?: string
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
