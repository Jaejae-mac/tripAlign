/**
 * 약관 동의 서비스 레이어
 * DB의 user_consents 테이블과 상호작용하여 동의 여부 조회·저장을 담당합니다.
 *
 * - hasConsented / getConsent: 서버 전용 (callback route, middleware, 서버 컴포넌트)
 * - saveConsent: 클라이언트 전용 (ConsentForm 제출 시 호출)
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { UserConsent, SaveConsentDto } from '@/types/consent.types'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/types/consent.types'

/**
 * 해당 유저가 현재 버전 약관에 동의했는지 확인합니다 (서버 전용).
 * 미들웨어와 OAuth 콜백에서 주입받은 서버 Supabase 클라이언트를 사용합니다.
 *
 * 버전이 다른 경우(약관 개정 시)도 미동의로 처리하여 재동의를 유도합니다.
 */
export async function hasConsented(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('terms_version, privacy_version')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return false

    // 저장된 버전이 현재 버전과 다르면 재동의 필요
    return (
      data.terms_version === CURRENT_TERMS_VERSION &&
      data.privacy_version === CURRENT_PRIVACY_VERSION
    )
  } catch {
    // 조회 실패 시 안전하게 미동의로 처리
    return false
  }
}

/**
 * 동의 레코드 전체를 조회합니다 (서버 전용).
 * 약관 동의 페이지의 방어적 체크(이미 동의한 유저 차단)에 사용합니다.
 */
export async function getConsent(
  supabase: SupabaseClient,
  userId: string
): Promise<UserConsent | null> {
  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return null
    return data as UserConsent
  } catch {
    return null
  }
}

/**
 * 약관 동의를 저장합니다 (클라이언트 전용).
 * 이미 동의 레코드가 있을 경우 upsert로 덮어씁니다 (약관 개정 재동의 처리).
 */
export async function saveConsent(dto: SaveConsentDto): Promise<void> {
  const supabase = createClient()

  // 현재 로그인 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요합니다.')

  const { error } = await supabase.from('user_consents').upsert(
    {
      user_id: user.id,
      terms_version: dto.terms_version,
      privacy_version: dto.privacy_version,
      age_confirmed: dto.age_confirmed,
      marketing_agreed: dto.marketing_agreed,
      consented_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' } // 동일 유저 재동의 시 기존 레코드 업데이트
  )

  if (error) throw new Error(error.message)
}
