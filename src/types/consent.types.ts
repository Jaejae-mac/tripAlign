/**
 * 약관 동의 관련 타입 정의
 * DB 테이블(user_consents)과 폼 상태를 연결하는 공유 타입입니다.
 */

/** DB의 user_consents 테이블 row 타입 */
export interface UserConsent {
  id: string
  user_id: string
  terms_version: string
  privacy_version: string
  age_confirmed: boolean
  marketing_agreed: boolean
  consented_at: string
}

/** 동의 저장 시 서비스 레이어로 전달하는 DTO */
export interface SaveConsentDto {
  terms_version: string
  privacy_version: string
  age_confirmed: boolean
  marketing_agreed: boolean
}

/** 약관 동의 폼의 체크박스 상태 타입 (React Hook Form 용) */
export interface ConsentFormValues {
  terms_agreed: boolean      // [필수] 서비스 이용약관 동의
  privacy_agreed: boolean    // [필수] 개인정보처리방침 동의
  age_confirmed: boolean     // [필수] 만 14세 이상 확인
  marketing_agreed: boolean  // [선택] 마케팅 수신 동의
}

/**
 * 현재 적용 중인 약관 버전 (날짜 문자열)
 * 약관 개정 시 이 상수를 업데이트하면 기존 동의 유저도 재동의 흐름으로 안내됩니다.
 */
export const CURRENT_TERMS_VERSION = '2026-04-09' as const
export const CURRENT_PRIVACY_VERSION = '2026-04-09' as const
