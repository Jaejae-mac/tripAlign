/**
 * 여행 플랜 관련 타입 정의
 * DB 스키마와 1:1 대응하며, 컴포넌트와 서비스 레이어가 이 타입을 공유합니다.
 */

/** DB에서 조회한 여행 플랜 원본 타입 */
export interface TravelPlan {
  id: string
  user_id: string
  title: string
  destination: string
  start_date: string // ISO 날짜 문자열 (YYYY-MM-DD)
  end_date: string
  cover_image: string | null
  /** 여행 총 예산 — 설정하지 않으면 null */
  budget: number | null
  /** 예산 통화 코드 — 기본값 'KRW' */
  budget_currency: string | null
  created_at: string
}

/**
 * 클라이언트 컴포넌트에서 사용하는 플랜 타입
 * user_id는 서버에서만 필요하므로 제외해 클라이언트 노출을 방지합니다.
 */
export type TravelPlanClient = Omit<TravelPlan, 'user_id'>

/** 새 플랜 생성 시 서버로 보내는 DTO */
export interface CreatePlanDto {
  title: string
  destination: string
  start_date: string
  end_date: string
  cover_image?: string
  budget?: number
  budget_currency?: string
}

/** 플랜 수정 시 서버로 보내는 DTO */
export interface UpdatePlanDto {
  title?: string
  destination?: string
  start_date?: string
  end_date?: string
  cover_image?: string
  budget?: number | null
  budget_currency?: string
}

/** 플랜 생성 폼 데이터 (React Hook Form용) */
export interface PlanFormData {
  title: string
  destination: string
  startDate: Date
  endDate: Date
}
