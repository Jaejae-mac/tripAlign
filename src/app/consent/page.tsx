/**
 * 약관 동의 페이지 (서버 컴포넌트)
 * 신규 유저가 Google 로그인 후 처음 방문하는 화면입니다.
 * 미로그인 시 로그인 페이지로, 이미 동의한 유저는 메인으로 자동 이동합니다.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConsent } from '@/services/consent.service'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/types/consent.types'
import { ConsentForm } from '@/components/consent/ConsentForm'

interface ConsentPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const supabase = await createClient()

  // 로그인 상태 확인 — 미로그인 시 로그인 페이지로
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 이미 현재 버전 약관에 동의한 유저 처리 (미들웨어 이중 방어)
  const consent = await getConsent(supabase, user.id)
  if (
    consent &&
    consent.terms_version === CURRENT_TERMS_VERSION &&
    consent.privacy_version === CURRENT_PRIVACY_VERSION
  ) {
    redirect('/')
  }

  // 동의 완료 후 이동할 URL (기본값: 메인 페이지)
  const params = await searchParams
  const rawNext = params.next ?? '/'
  // 오픈 리다이렉트 방어: /로 시작하는 내부 경로만 허용
  const nextUrl =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  return <ConsentForm nextUrl={nextUrl} />
}
