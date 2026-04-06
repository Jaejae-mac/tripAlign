'use client'

/**
 * 일정 추가/수정 다이얼로그
 * 화면 정중앙에 모달로 표시되며 시간, 제목, 카테고리, 장소, 메모를 입력합니다.
 * editingItem이 있으면 수정 모드, 없으면 추가 모드로 동작합니다.
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Phone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { createScheduleItem, updateScheduleItem } from '@/services/schedule.service'
import { toast } from 'sonner'
import { CATEGORY_CONFIG, SCHEDULE_CATEGORIES } from '@/lib/constants/schedule'
import { cn } from '@/lib/utils'
import { TimeSelect } from './TimeSelect'
import type { ScheduleFormData, ScheduleItem, ScheduleCategory } from '@/types/schedule.types'

// 폼 유효성 검사 스키마
const scheduleSchema = z.object({
  time: z.string().min(1, '시간을 입력해주세요.'),
  end_time: z.string().optional(),
  title: z
    .string()
    .min(1, '일정 제목을 입력해주세요.')
    .max(50, '50자 이내로 입력해주세요.'),
  description: z.string().max(200, '200자 이내로 입력해주세요.'),
  category: z.enum(['food', 'tour', 'stay', 'transport', 'shopping', 'etc']),
  location: z.string().max(100, '100자 이내로 입력해주세요.'),
  phone: z.string().max(20, '20자 이내로 입력해주세요.'),
})

interface ScheduleAddDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  date: string
  editingItem: ScheduleItem | null
  onSaved: () => void
}

export function ScheduleAddDrawer({
  open,
  onOpenChange,
  planId,
  date,
  editingItem,
  onSaved,
}: ScheduleAddDrawerProps) {
  const isEditing = !!editingItem

  // 종료 시간 활성화 여부 (폼이 아닌 로컬 상태로 관리)
  const [hasEndTime, setHasEndTime] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      time: '',
      end_time: undefined,
      title: '',
      description: '',
      category: 'etc',
      location: '',
      phone: '',
    },
  })

  const selectedCategory = watch('category')
  // 폼 내부 상태 (제출 시 사용)
  const formTimeValue = watch('time')
  const formEndTimeValue = watch('end_time')

  // 수정 모드에서는 editingItem에서 직접 display 값을 파생합니다.
  // useEffect → setValue → watch 의 비동기 체인을 거치지 않아
  // Dialog가 열리는 첫 렌더에서 즉시 올바른 시간을 표시할 수 있습니다.
  const timeValue = (open && editingItem)
    ? editingItem.time.slice(0, 5)
    : formTimeValue
  const endTimeValue = (open && editingItem?.end_time)
    ? editingItem.end_time.slice(0, 5)
    : (formEndTimeValue ?? '')

  // 수정 모드일 때 기존 값으로 폼 초기화
  useEffect(() => {
    if (open && editingItem) {
      // 수정 모드: reset() 대신 setValue()를 사용해야 watch('time') 구독이 올바르게 갱신됨
      // reset()은 register()로 등록되지 않은 필드(time)의 watch 구독을 트리거하지 않는 경우가 있음
      const hasEnd = !!editingItem.end_time
      setHasEndTime(hasEnd)
      setValue('time', editingItem.time.slice(0, 5))
      setValue('end_time', hasEnd ? editingItem.end_time!.slice(0, 5) : undefined)
      setValue('title', editingItem.title)
      setValue('description', editingItem.description ?? '')
      setValue('category', editingItem.category)
      setValue('location', editingItem.location ?? '')
      setValue('phone', editingItem.phone ?? '')
    } else {
      // 추가 모드 또는 다이얼로그 닫힐 때: 폼을 초기 상태로 리셋
      setHasEndTime(false)
      reset({
        time: '',
        end_time: undefined,
        title: '',
        description: '',
        category: 'etc',
        location: '',
        phone: '',
      })
    }
  }, [editingItem, open, setValue, reset])

  /** 종료 시간 체크박스 토글 */
  const handleEndTimeToggle = (checked: boolean) => {
    setHasEndTime(checked)
    if (!checked) {
      // 체크 해제 시 종료 시간 값 초기화
      setValue('end_time', undefined)
    }
  }

  /** 일정 저장 (추가 또는 수정) */
  const onSubmit = async (values: ScheduleFormData) => {
    try {
      const dto = {
        time: values.time,
        end_time: hasEndTime && values.end_time ? values.end_time : undefined,
        title: values.title,
        description: values.description || undefined,
        category: values.category,
        location: values.location || undefined,
        phone: values.phone || undefined,
      }

      if (isEditing && editingItem) {
        await updateScheduleItem(editingItem.id, dto)
        toast.success('일정이 수정되었습니다.')
      } else {
        await createScheduleItem(planId, date, dto)
        toast.success('일정이 추가되었습니다.')
      }

      onSaved()
      onOpenChange(false)
    } catch {
      toast.error(
        isEditing ? '일정 수정에 실패했습니다.' : '일정 추가에 실패했습니다.'
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 모바일: 바텀시트 / 데스크탑: 중앙 모달 — dialog.tsx에서 처리 */}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">
            {isEditing ? '일정 수정' : '일정 추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* 제목 + 시간 — 모바일: 제목 위 / 시간 아래 / sm 이상: 가로 배치(제목 좌, 시간 우) */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="예: 츠키지 시장 방문"
                {...register('title')}
                className={cn(errors.title && 'border-destructive')}
              />
            </div>

            <div className="space-y-1.5">
              <Label>시간</Label>

              {/* 시작 시간 */}
              <TimeSelect
                value={timeValue}
                onChange={(val) => setValue('time', val)}
                error={!!errors.time}
              />

              {/* 종료 시간 — 체크 시 시작 시간 바로 아래 동일 위치에 표시 */}
              {hasEndTime && (
                <TimeSelect
                  value={endTimeValue ?? ''}
                  onChange={(val) => setValue('end_time', val)}
                />
              )}

              {/* 종료 시간 추가 토글 */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <Checkbox
                  id="has-end-time"
                  checked={hasEndTime}
                  onCheckedChange={(checked) => handleEndTimeToggle(!!checked)}
                  className="cursor-pointer w-3.5 h-3.5"
                />
                <Label
                  htmlFor="has-end-time"
                  className="text-xs cursor-pointer text-muted-foreground"
                >
                  종료 시간
                </Label>
              </div>
            </div>
          </div>
          {errors.time && (
            <p className="text-xs text-destructive -mt-3">{errors.time.message}</p>
          )}
          {errors.title && (
            <p className="text-xs text-destructive -mt-3">{errors.title.message}</p>
          )}

          {/* 카테고리 선택 */}
          <div className="space-y-2">
            <Label>카테고리</Label>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat]
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setValue('category', cat as ScheduleCategory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer border"
                    style={{
                      backgroundColor: isSelected
                        ? `${config.color}20`
                        : 'transparent',
                      borderColor: isSelected ? config.color : 'var(--border)',
                      color: isSelected ? config.color : 'var(--muted-foreground)',
                    }}
                  >
                    <config.Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 장소 */}
          <div className="space-y-1.5">
            <Label htmlFor="location">장소 (선택)</Label>
            <Input
              id="location"
              placeholder="예: 도쿄도 주오구 츠키지 5-2-1"
              {...register('location')}
            />
          </div>

          {/* 전화번호 */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              전화번호 (선택)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="예: 03-3547-5765"
              {...register('phone')}
              className={cn(errors.phone && 'border-destructive')}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label htmlFor="description">메모 (선택)</Label>
            <Textarea
              id="description"
              placeholder="추가 정보를 입력하세요..."
              rows={3}
              {...register('description')}
              className="resize-none"
            />
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-2 pb-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? '수정 완료' : '추가하기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
