'use client'

/**
 * 플랜 수정 다이얼로그
 * 기존 플랜의 제목, 목적지, 여행 날짜, 커버 이미지를 수정합니다.
 */
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
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
import { updatePlan } from '@/services/plan.service'
import { deleteCoverImage } from '@/services/storage.service'
import { usePlanStore } from '@/store/planStore'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TravelPlan, TravelPlanClient } from '@/types/plan.types'
import type { DateRange } from 'react-day-picker'

const CURRENCIES = ['KRW', 'USD', 'JPY', 'EUR', 'CNY'] as const

const planSchema = z.object({
  title: z
    .string()
    .min(1, '여행 이름을 입력해주세요.')
    .max(50, '50자 이내로 입력해주세요.'),
  destination: z
    .string()
    .min(1, '목적지를 입력해주세요.')
    .max(50, '50자 이내로 입력해주세요.'),
  budget: z.number().min(0, '0 이상의 금액을 입력해주세요.').optional(),
  budget_currency: z.string(),
})

type PlanFormValues = z.infer<typeof planSchema>

interface PlanEditDialogProps {
  plan: TravelPlanClient
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 수정된 플랜을 반환할 때 user_id는 제외합니다 */
  onUpdated: (updated: TravelPlanClient) => void
}

export function PlanEditDialog({
  plan,
  open,
  onOpenChange,
  onUpdated,
}: PlanEditDialogProps) {
  const { fetchPlans } = usePlanStore()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: parseISO(plan.start_date),
    to: parseISO(plan.end_date),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(plan.cover_image)
  const [userId, setUserId] = useState<string>('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      title: plan.title,
      destination: plan.destination,
      budget: plan.budget ?? undefined,
      budget_currency: plan.budget_currency ?? 'KRW',
    },
  })

  // 다이얼로그가 열릴 때마다 현재 플랜 값으로 폼 초기화
  useEffect(() => {
    if (open) {
      reset({
        title: plan.title,
        destination: plan.destination,
        budget: plan.budget ?? undefined,
        budget_currency: plan.budget_currency ?? 'KRW',
      })
      setDateRange({
        from: parseISO(plan.start_date),
        to: parseISO(plan.end_date),
      })
      setCoverImageUrl(plan.cover_image)
      // 이미지 업로드에 필요한 userId 가져오기
      createClient().auth.getUser().then(({ data }) => {
        if (data.user) setUserId(data.user.id)
      })
    }
  }, [open, plan, reset])

  const onSubmit = async (values: PlanFormValues) => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('여행 날짜를 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      // 이미지가 제거된 경우 — 기존 Storage 파일 삭제
      if (plan.cover_image && coverImageUrl === null) {
        await deleteCoverImage(plan.cover_image).catch(() => {})
      }

      const updated = await updatePlan(plan.id, {
        title: values.title,
        destination: values.destination,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        cover_image: coverImageUrl ?? undefined,
        // 예산을 지운 경우 null로 저장, 값이 있으면 저장
        budget: values.budget ?? null,
        budget_currency: values.budget_currency,
      })
      toast.success('플랜이 수정되었습니다.')
      // user_id는 클라이언트에 노출하지 않음
      const { user_id: _uid, ...updatedClient } = updated
      onUpdated(updatedClient)
      onOpenChange(false)
      // 메인 페이지 플랜 목록도 갱신
      fetchPlans()
    } catch {
      toast.error('플랜 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">플랜 수정</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          {/* 커버 이미지 수정 */}
          <div className="space-y-1.5">
            <Label>커버 이미지</Label>
            <CoverImageUpload
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              userId={userId}
              planId={plan.id}
            />
          </div>

          {/* 여행 이름 */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">여행 이름</Label>
            <Input
              id="edit-title"
              {...register('title')}
              className={cn(errors.title && 'border-destructive')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* 목적지 */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-destination">목적지</Label>
            <Input
              id="edit-destination"
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
              <select
                {...register('budget_currency')}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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

          {/* 날짜 범위 */}
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
                    '날짜 선택'
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
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
