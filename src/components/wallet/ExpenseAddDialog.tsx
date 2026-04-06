'use client'

/**
 * 지출 추가/수정 다이얼로그
 * 날짜, 카테고리, 제목, 금액, 통화, 메모를 입력해 지출을 기록합니다.
 * editingExpense가 있으면 수정 모드로 동작합니다.
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
// (z.coerce.number()는 react-hook-form 제네릭과 타입 충돌이 있어 string으로 처리)
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
      // watch('category'), watch('currency')는 register()가 아닌 setValue 패턴으로 제어되므로
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
    // amount는 string으로 폼에서 받아, 서비스 호출 전 number로 변환합니다
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* 날짜 */}
          <div className="space-y-1.5">
            <Label htmlFor="date">날짜</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className={cn(errors.date && 'border-destructive')}
            />
          </div>

          {/* 카테고리 선택 */}
          <div className="space-y-2">
            <Label>카테고리</Label>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat]
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setValue('category', cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer border"
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
                    <config.Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 내용 */}
          <div className="space-y-1.5">
            <Label htmlFor="title">내용</Label>
            <Input
              id="title"
              placeholder="예: 라멘 식사"
              {...register('title')}
              className={cn(errors.title && 'border-destructive')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* 금액 + 통화 */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="amount">금액</Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                placeholder="0"
                {...register('amount')}
                className={cn(errors.amount && 'border-destructive')}
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label>통화</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(v) => setValue('currency', v as Currency)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label htmlFor="memo">메모 (선택)</Label>
            <Textarea
              id="memo"
              placeholder="추가 메모를 입력하세요..."
              rows={2}
              {...register('memo')}
              className="resize-none"
            />
          </div>

          {/* 취소/저장 버튼 — 항상 좌우 나란히 배치 */}
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
