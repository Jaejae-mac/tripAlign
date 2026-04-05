/**
 * 일정(Schedule) 관련 타입 정의
 * 날짜별 카드와 시간별 일정 항목 구조를 정의합니다.
 */

/** 방문 상태 */
export type VisitStatus = 'pending' | 'completed'

/** 일정 카테고리 목록 */
export type ScheduleCategory =
  | 'food'       // 식사
  | 'tour'       // 관광
  | 'stay'       // 숙박
  | 'transport'  // 교통
  | 'shopping'   // 쇼핑
  | 'etc'        // 기타

/** DB에서 조회한 시간별 일정 항목 */
export interface ScheduleItem {
  id: string
  day_schedule_id: string
  time: string           // HH:mm 형식 (예: "09:30")
  end_time: string | null // 종료 시간 — 없으면 null
  title: string
  description: string | null
  category: ScheduleCategory
  location: string | null
  phone: string | null    // 전화번호 — 없으면 null
  status: VisitStatus  // 'pending'(방문예정) | 'completed'(방문완료)
  created_at: string
}

/** 새 일정 항목 생성 시 DTO */
export interface CreateScheduleItemDto {
  day_schedule_id: string
  time: string
  end_time?: string
  title: string
  description?: string
  category: ScheduleCategory
  location?: string
  phone?: string
}

/** 일정 항목 수정 시 DTO */
export interface UpdateScheduleItemDto {
  time?: string
  end_time?: string
  title?: string
  description?: string
  category?: ScheduleCategory
  location?: string
  phone?: string
  status?: VisitStatus
}

/** 날짜별 일정 카드 */
export interface DaySchedule {
  id: string
  plan_id: string
  date: string  // ISO 날짜 문자열
  items: ScheduleItem[]
}

/** 일정 추가/수정 폼 데이터 */
export interface ScheduleFormData {
  time: string
  end_time?: string
  title: string
  description: string
  category: ScheduleCategory
  location: string
  phone: string
}
