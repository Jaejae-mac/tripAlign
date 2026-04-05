'use client'

/**
 * 플랜 생성 다이얼로그
 * 플랜 이름, 목적지, 여행 날짜 범위, 커버 이미지를 입력받아 새 플랜을 생성합니다.
 */
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CoverImageUpload } from './CoverImageUpload'
import { usePlanStore } from '@/store/planStore'
import { createClient } from '@/lib/supabase/client'
import { deleteCoverImage } from '@/services/storage.service'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

// 지원 통화 목록 — 지출 탭과 동일한 기준
const CURRENCIES = ['KRW', 'USD', 'JPY', 'EUR', 'CNY'] as const

// 폼 유효성 검사 스키마
const planSchema = z.object({
  title: z
    .string()
    .min(1, '여행 이름을 입력해주세요.')
    .max(50, '50자 이내로 입력해주세요.'),
  destination: z
    .string()
    .min(1, '목적지를 입력해주세요.')
    .max(50, '50자 이내로 입력해주세요.'),
  // 예산은 선택 입력 — register의 setValueAs로 빈 문자열을 undefined로 변환 후 검증
  budget: z.number().min(0, '0 이상의 금액을 입력해주세요.').optional(),
  budget_currency: z.string(),
})

type PlanFormValues = z.infer<typeof planSchema>

interface PlanCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlanCreateDialog({ open, onOpenChange }: PlanCreateDialogProps) {
  const router = useRouter()
  const { addPlan } = usePlanStore()
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)

  // 새 플랜의 ID를 미리 생성해 이미지 파일 경로에 사용
  // SSR 시 crypto.randomUUID()가 서버/클라이언트 다른 값 → hydration 오류 방지를 위해
  // 빈 문자열로 초기화 후 마운트 시(클라이언트에서만) 생성
  const tempPlanIdRef = useRef<string>('')
  useEffect(() => {
    if (!tempPlanIdRef.current) {
      tempPlanIdRef.current = crypto.randomUUID()
    }
  }, [])

  // 로그인한 사용자 ID 조회 (이미지 경로 생성용)
  const [userId, setUserId] = useState<string>('')
  // 다이얼로그가 열릴 때 userId를 가져옴 — 렌더 본문 side effect 금지로 useEffect 사용
  useEffect(() => {
    if (!open) return
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [open])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: { budget_currency: 'KRW' },
  })

  /** 폼 초기화 및 다이얼로그 닫기 */
  const handleClose = () => {
    // 업로드된 이미지가 있지만 저장하지 않고 닫으면 Storage에서 삭제
    if (coverImageUrl) {
      deleteCoverImage(coverImageUrl).catch(() => {})
    }
    reset()
    setDateRange(undefined)
    setCoverImageUrl(null)
    // 다음 열기를 위해 새 임시 ID 생성 (클라이언트에서만 실행되므로 여기서는 직접 호출 가능)
    tempPlanIdRef.current = crypto.randomUUID()
    onOpenChange(false)
  }

  /** 플랜 생성 제출 */
  const onSubmit = async (values: PlanFormValues) => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('여행 날짜를 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const newPlan = await addPlan({
        title: values.title,
        destination: values.destination,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        cover_image: coverImageUrl ?? undefined,
        budget: values.budget,
        budget_currency: values.budget_currency,
      })

      toast.success('플랜이 생성되었습니다!')
      // 성공 후 상태 초기화 (coverImageUrl은 이미 DB에 저장됐으므로 삭제하지 않음)
      reset()
      setDateRange(undefined)
      setCoverImageUrl(null)
      tempPlanIdRef.current = crypto.randomUUID()
      onOpenChange(false)
      // 생성 후 플랜 상세 페이지로 이동
      router.push(`/plans/${newPlan.id}`)
    } catch {
      toast.error('플랜 생성에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">새 여행 플랜</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          {/* 커버 이미지 업로드 */}
          <div className="space-y-1.5">
            <Label>커버 이미지</Label>
            <CoverImageUpload
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              userId={userId}
              planId={tempPlanIdRef.current}
            />
          </div>

          {/* 여행 이름 입력 */}
          <div className="space-y-1.5">
            <Label htmlFor="title">여행 이름</Label>
            <Input
              id="title"
              placeholder="예: 도쿄 벚꽃 여행"
              {...register('title')}
              className={cn(errors.title && 'border-destructive')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* 목적지 입력 */}
          <div className="space-y-1.5">
            <Label htmlFor="destination">목적지</Label>
            <Input
              id="destination"
              placeholder="예: 일본 도쿄"
              {...register('destination')}
              className={cn(errors.destination && 'border-destructive')}
            />
            {errors.destination && (
              <p className="text-xs text-destructive">
                {errors.destination.message}
              </p>
            )}
          </div>

          {/* 예산 입력 (선택) */}
          <div className="space-y-1.5">
            <Label>예산 <span className="text-muted-foreground font-normal text-xs">(선택)</span></Label>
            <div className="flex gap-2">
              {/* 통화 선택 */}
              <select
                {...register('budget_currency')}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* 예산 금액 입력 */}
              <Input
                type="number"
                min={0}
                placeholder="예: 500000"
                {...register('budget', {
                  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                })}
                className={cn('flex-1', errors.budget && 'border-destructive')}
              />
            </div>
            {errors.budget && (
              <p className="text-xs text-destructive">{errors.budget.message}</p>
            )}
          </div>

          {/* 여행 날짜 선택 */}
          <div className="space-y-1.5">
            <Label>여행 날짜</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal cursor-pointer',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from && dateRange?.to ? (
                    <>
                      {format(dateRange.from, 'yyyy.MM.dd', { locale: ko })} ~{' '}
                      {format(dateRange.to, 'yyyy.MM.dd', { locale: ko })}
                    </>
                  ) : (
                    '시작일 ~ 종료일 선택'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  locale={ko}
                  disabled={{ before: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="cursor-pointer"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-cta)' }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '생성 중...' : '플랜 생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
