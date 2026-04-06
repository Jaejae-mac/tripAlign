'use client'

/**
 * 지출 추가/수정 다이얼로그
 * 날짜, 카테고리, 제목, 금액, 통화, 메모를 입력해 지출을 기록합니다.
 * editingExpense가 있으면 수정 모드로 동작합니다.
 * 모바일: 바텀시트 / 데스크탑: 중앙 모달
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createExpense, updateExpense } from '@/services/expense.service'
import { toast } from 'sonner'
import { CATEGORY_CONFIG, EXPENSE_CATEGORIES } from '@/lib/constants/schedule'
import { cn } from '@/lib/utils'
import type { ExpenseFormData, Expense, Currency } from '@/types/expense.types'

const CURRENCIES: Currency[] = ['KRW', 'USD', 'JPY', 'EUR', 'CNY']

// 폼 유효성 검사 스키마
// amount는 string으로 받아 서비스 호출 시 Number()로 변환합니다
const expenseSchema = z.object({
  date: z.string().min(1, '날짜를 입력해주세요.'),
  category: z.enum(['food', 'transport', 'stay', 'tour', 'shopping', 'etc']),
  title: z
    .string()
    .min(1, '내용을 입력해주세요.')
    .max(50, '50자 이내로 입력해주세요.'),
  amount: z
    .string()
    .min(1, '금액을 입력해주세요.')
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99999999,
      '유효한 금액을 입력해주세요.'
    ),
  currency: z.enum(['KRW', 'USD', 'JPY', 'EUR', 'CNY']),
  memo: z.string().max(100, '100자 이내로 입력해주세요.'),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

interface ExpenseAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  editingExpense: Expense | null
  onSaved: () => void
}

export function ExpenseAddDialog({
  open,
  onOpenChange,
  planId,
  editingExpense,
  onSaved,
}: ExpenseAddDialogProps) {
  const isEditing = !!editingExpense

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      category: 'etc',
      title: '',
      amount: '',
      currency: 'KRW',
      memo: '',
    },
  })

  const selectedCategory = watch('category')
  const selectedCurrency = watch('currency')

  // 수정 모드일 때 기존 값으로 폼 초기화
  useEffect(() => {
    if (open && editingExpense) {
      // 수정 모드: setValue()로 각 필드를 직접 업데이트
      // watch('category'), watch('currency')는 setValue 패턴으로 제어되므로
      // reset()보다 setValue()가 watch 구독을 더 안정적으로 갱신함
      setValue('date', editingExpense.date)
      setValue('category', editingExpense.category)
      setValue('title', editingExpense.title)
      setValue('amount', String(editingExpense.amount))
      setValue('currency', editingExpense.currency)
      setValue('memo', editingExpense.memo ?? '')
    } else {
      reset({
        date: new Date().toISOString().slice(0, 10),
        category: 'etc',
        title: '',
        amount: '',
        currency: 'KRW',
        memo: '',
      })
    }
  }, [editingExpense, open, setValue, reset])

  /** 지출 저장 (추가 또는 수정) */
  const onSubmit = async (values: ExpenseFormValues) => {
    const parsedAmount = Number(values.amount)

    try {
      if (isEditing && editingExpense) {
        await updateExpense(editingExpense.id, {
          date: values.date,
          category: values.category,
          title: values.title,
          amount: parsedAmount,
          currency: values.currency,
          memo: values.memo || undefined,
        })
        toast.success('지출이 수정되었습니다.')
      } else {
        await createExpense({
          plan_id: planId,
          date: values.date,
          category: values.category,
          title: values.title,
          amount: parsedAmount,
          currency: values.currency,
          memo: values.memo || undefined,
        })
        toast.success('지출이 추가되었습니다.')
      }

      onSaved()
      onOpenChange(false)
    } catch {
      toast.error(
        isEditing ? '지출 수정에 실패했습니다.' : '지출 추가에 실패했습니다.'
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 모바일: 바텀시트 / 데스크탑: 중앙 모달 — dialog.tsx에서 처리 */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? '지출 수정' : '지출 추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-5 py-1">

          {/* ── 날짜 ── */}
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-sm font-medium">날짜</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className={cn('w-full', errors.date && 'border-destructive')}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* ── 카테고리 — 3열 그리드로 균일하게 배치 ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">카테고리</Label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat]
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setValue('category', cat)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer border',
                      'min-w-0 w-full'
                    )}
                    style={{
                      backgroundColor: isSelected
                        ? `${config.color}20`
                        : 'transparent',
                      borderColor: isSelected ? config.color : 'var(--border)',
                      color: isSelected
                        ? config.color
                        : 'var(--muted-foreground)',
                    }}
                  >
                    <config.Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{config.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── 내용 ── */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium">내용</Label>
            <Input
              id="title"
              placeholder="예: 라멘 식사"
              {...register('title')}
              className={cn('w-full', errors.title && 'border-destructive')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* ── 금액 + 통화 — grid로 overflow 방지 ── */}
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="amount" className="text-sm font-medium">금액</Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                placeholder="0"
                {...register('amount')}
                className={cn('w-full', errors.amount && 'border-destructive')}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">통화</Label>
              {/* position="popper"로 Portal이 trigger 기준으로 정확히 배치됨 */}
              <Select
                value={selectedCurrency}
                onValueChange={(v) => setValue('currency', v as Currency)}
              >
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[110px]">
                  {CURRENCIES.map((currency) => (
                    <SelectItem
                      key={currency}
                      value={currency}
                      className="cursor-pointer"
                    >
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── 메모 (선택) ── */}
          <div className="space-y-1.5">
            <Label htmlFor="memo" className="text-sm font-medium">
              메모 <span className="text-muted-foreground font-normal">(선택)</span>
            </Label>
            <Textarea
              id="memo"
              placeholder="추가 메모를 입력하세요..."
              rows={2}
              {...register('memo')}
              className="w-full resize-none"
            />
            {errors.memo && (
              <p className="text-xs text-destructive">{errors.memo.message}</p>
            )}
          </div>

          {/* ── 취소 / 저장 버튼 ── */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 cursor-pointer"
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
