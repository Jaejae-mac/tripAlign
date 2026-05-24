'use client'

/**
 * 약관 동의 폼 컴포넌트
 * 신규 유저가 서비스 시작 전 필수·선택 약관에 동의하는 화면입니다.
 * 법적 요구사항: 필수(이용약관·개인정보처리방침·만 14세)와 선택(마케팅)을 명확히 분리합니다.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, Loader2, ChevronRight, Minus } from 'lucide-react'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { saveConsent } from '@/services/consent.service'
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from '@/types/consent.types'
import type { ConsentFormValues } from '@/types/consent.types'
import { toast } from 'sonner'
import Link from 'next/link'

// ─── Zod 유효성 검사 스키마 ───────────────────────────────────────────────────
// 필수 항목은 반드시 true여야 하며, 선택 항목은 true/false 모두 허용합니다.
const consentSchema = z.object({
  terms_agreed: z
    .boolean()
    .refine((val) => val === true, { message: '서비스 이용약관에 동의해주세요.' }),
  privacy_agreed: z
    .boolean()
    .refine((val) => val === true, { message: '개인정보처리방침에 동의해주세요.' }),
  age_confirmed: z
    .boolean()
    .refine((val) => val === true, { message: '만 14세 이상 확인이 필요합니다.' }),
  marketing_agreed: z.boolean(), // 선택 동의 — 어떤 값이든 허용
})

interface ConsentFormProps {
  nextUrl: string // 동의 완료 후 이동할 URL (서버 컴포넌트에서 전달)
}

export function ConsentForm({ nextUrl }: ConsentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { handleSubmit, control, watch, setValue, formState: { errors } } =
    useForm<ConsentFormValues>({
      resolver: zodResolver(consentSchema),
      defaultValues: {
        terms_agreed: false,
        privacy_agreed: false,
        age_confirmed: false,
        marketing_agreed: false,
      },
    })

  // 현재 체크박스 상태를 실시간으로 관찰
  const termsAgreed = watch('terms_agreed')
  const privacyAgreed = watch('privacy_agreed')
  const ageConfirmed = watch('age_confirmed')
  const marketingAgreed = watch('marketing_agreed')

  // 필수 항목 3개가 모두 체크됐는지 확인 → 시작하기 버튼 활성화 조건
  const requiredAllChecked = termsAgreed && privacyAgreed && ageConfirmed

  // 전체 동의 상태
  // shadcn/ui Checkbox는 checked/indeterminate를 시각적으로 구분하지 않으므로
  // boolean만 사용하고 부분 체크 표시는 별도 아이콘(Minus)으로 처리합니다.
  const allChecked = requiredAllChecked && marketingAgreed
  const someChecked = termsAgreed || privacyAgreed || ageConfirmed || marketingAgreed

  /** 전체 동의 버튼 토글 — 모두 체크됐으면 전체 해제, 아니면 전체 선택 */
  const handleAllToggle = () => {
    const newValue = !allChecked
    // shouldValidate 없이 값만 설정 — 동시 다중 setValue 호출 시 과도한 re-render 방지
    setValue('terms_agreed', newValue)
    setValue('privacy_agreed', newValue)
    setValue('age_confirmed', newValue)
    setValue('marketing_agreed', newValue)
  }

  /** 약관 동의 저장 및 다음 페이지로 이동 */
  const onSubmit = async (values: ConsentFormValues) => {
    // 오픈 리다이렉트 방지: 반드시 /로 시작하는 내부 경로만 허용
    const safeNextUrl =
      nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : '/'

    setIsSubmitting(true)
    try {
      await saveConsent({
        terms_version: CURRENT_TERMS_VERSION,
        privacy_version: CURRENT_PRIVACY_VERSION,
        age_confirmed: values.age_confirmed,
        marketing_agreed: values.marketing_agreed,
      })
      // push 후 refresh: 미들웨어가 새 요청에서 동의 완료를 인식하도록 캐시 무효화
      router.push(safeNextUrl)
      router.refresh()
    } catch {
      toast.error('동의 처리 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">

        {/* ─── 로고 및 안내 문구 ─────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-1"
            style={{ backgroundColor: 'color-mix(in srgb, #0D9488 15%, transparent)' }}
          >
            <MapPin className="w-7 h-7" style={{ color: 'var(--brand-primary, #0D9488)' }} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">TripAlign</h1>
          <p className="text-sm text-muted-foreground">
            서비스 시작을 위해 약관에 동의해주세요
          </p>
        </div>

        {/* ─── 약관 동의 카드 ───────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl p-6 border border-border space-y-5"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* 전체 동의
                shadcn/ui Checkbox는 checked/indeterminate 상태를 시각적으로 구분하지 않음.
                (CheckboxPrimitive.Indicator가 두 상태 모두에서 동일한 아이콘을 렌더링)
                → boolean checked + 별도 Minus 아이콘으로 부분 체크 상태를 직접 표현 */}
            <div className="flex items-center gap-3 select-none mb-5">
              {/* 커스텀 체크박스 버튼: 전체/부분/미선택 3가지 상태를 명확히 표현 */}
              <button
                type="button"
                id="all-agree"
                onClick={handleAllToggle}
                aria-label="전체 동의"
                aria-checked={allChecked}
                role="checkbox"
                className={[
                  'size-5 shrink-0 rounded-[4px] border flex items-center justify-center cursor-pointer transition-colors duration-150',
                  allChecked
                    ? 'bg-primary border-primary text-primary-foreground'  // 전체 선택
                    : someChecked
                    ? 'bg-primary/20 border-primary text-primary'          // 부분 선택 (Minus 아이콘)
                    : 'border-input bg-transparent',                       // 미선택
                ].join(' ')}
              >
                {allChecked && <svg viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 7l4 4 6-6"/></svg>}
                {!allChecked && someChecked && <Minus className="size-3" />}
              </button>
              <Label
                htmlFor="all-agree"
                className="text-sm font-bold cursor-pointer"
              >
                전체 동의
              </Label>
            </div>

            <Separator className="mb-5" />

            {/* ─── 필수 항목 ─────────────────────────────────────────── */}
            <div className="space-y-4" role="group" aria-label="필수 동의 항목">

              {/* 서비스 이용약관 동의 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Controller
                      control={control}
                      name="terms_agreed"
                      render={({ field }) => (
                        <Checkbox
                          id="terms"
                          checked={field.value}
                          // Radix UI는 boolean | "indeterminate"를 전달 → 명시적으로 boolean 변환
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          aria-required="true"
                          aria-describedby={errors.terms_agreed ? 'terms-error' : undefined}
                        />
                      )}
                    />
                    <Label
                      htmlFor="terms"
                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                      <span className="text-destructive text-xs font-medium">[필수]</span>
                      서비스 이용약관 동의
                    </Label>
                  </div>
                  {/* 약관 전문 보기 링크 */}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors duration-150 shrink-0 cursor-pointer"
                    aria-label="서비스 이용약관 전문 보기 (새 탭)"
                  >
                    보기
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {/* 에러 메시지: aria-live로 스크린리더에 알림 */}
                {errors.terms_agreed && (
                  <p
                    id="terms-error"
                    className="text-xs text-destructive pl-7"
                    role="alert"
                    aria-live="polite"
                  >
                    {errors.terms_agreed.message}
                  </p>
                )}
              </div>

              {/* 개인정보처리방침 동의 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Controller
                      control={control}
                      name="privacy_agreed"
                      render={({ field }) => (
                        <Checkbox
                          id="privacy"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          aria-required="true"
                          aria-describedby={errors.privacy_agreed ? 'privacy-error' : undefined}
                        />
                      )}
                    />
                    <Label
                      htmlFor="privacy"
                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                      <span className="text-destructive text-xs font-medium">[필수]</span>
                      개인정보처리방침 동의
                    </Label>
                  </div>
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors duration-150 shrink-0 cursor-pointer"
                    aria-label="개인정보처리방침 전문 보기 (새 탭)"
                  >
                    보기
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                {errors.privacy_agreed && (
                  <p
                    id="privacy-error"
                    className="text-xs text-destructive pl-7"
                    role="alert"
                    aria-live="polite"
                  >
                    {errors.privacy_agreed.message}
                  </p>
                )}
              </div>

              {/* 만 14세 이상 확인 */}
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Controller
                    control={control}
                    name="age_confirmed"
                    render={({ field }) => (
                      <Checkbox
                        id="age"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        aria-required="true"
                        aria-describedby={errors.age_confirmed ? 'age-error' : undefined}
                      />
                    )}
                  />
                  <Label
                    htmlFor="age"
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <span className="text-destructive text-xs font-medium">[필수]</span>
                    만 14세 이상입니다
                  </Label>
                </div>
                {errors.age_confirmed && (
                  <p
                    id="age-error"
                    className="text-xs text-destructive pl-7"
                    role="alert"
                    aria-live="polite"
                  >
                    {errors.age_confirmed.message}
                  </p>
                )}
              </div>
            </div>

            <Separator className="my-5" />

            {/* ─── 선택 항목 — 필수와 시각적으로 명확히 구분 ─────────── */}
            <div role="group" aria-label="선택 동의 항목">
              <div className="flex items-center gap-3">
                <Controller
                  control={control}
                  name="marketing_agreed"
                  render={({ field }) => (
                    <Checkbox
                      id="marketing"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <Label
                  htmlFor="marketing"
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <span className="text-muted-foreground text-xs font-medium">[선택]</span>
                  마케팅 정보 수신 동의
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-7 mt-1">
                여행 혜택·신규 기능 소식을 이메일로 받아보실 수 있습니다.
              </p>
            </div>

            {/* ─── 시작하기 버튼 ──────────────────────────────────────── */}
            <Button
              type="submit"
              className="w-full mt-6 gap-2 cursor-pointer font-semibold"
              style={{ backgroundColor: 'var(--brand-cta, #F97316)' }}
              disabled={!requiredAllChecked || isSubmitting}
              aria-disabled={!requiredAllChecked || isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '처리 중...' : '시작하기'}
            </Button>

            {/* 필수 항목 미동의 안내 */}
            {!requiredAllChecked && (
              <p className="text-xs text-muted-foreground text-center mt-2" aria-live="polite">
                필수 항목에 모두 동의하시면 서비스를 이용하실 수 있습니다.
              </p>
            )}
          </form>
        </div>

        {/* 공통 푸터 — 약관 링크·연락처·저작권 */}
        <SiteFooter />

      </div>
    </div>
  )
}
