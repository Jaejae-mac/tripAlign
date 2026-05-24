'use client'

/**
 * 지출 추가/수정 다이얼로그
 * 날짜, 카테고리, 제목, 금액, 통화, 환율, 메모, 영수증을 입력해 지출을 기록합니다.
 * 외화 선택 시 건별 환율 직접 지정 섹션이 나타납니다.
 * editingExpense가 있으면 수정 모드로 동작합니다.
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, RefreshCw, ImagePlus, X } from 'lucide-react'
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
import { uploadReceiptImage, deleteReceiptImage } from '@/services/storage.service'
import { fetchKrwRates } from '@/services/currency.service'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CATEGORY_CONFIG, EXPENSE_CATEGORIES } from '@/lib/constants/schedule'
import { CURRENCY_UNITS } from '@/types/exchange-rate.types'
import { cn } from '@/lib/utils'
import type { ExpenseFormData, Expense, Currency } from '@/types/expense.types'
import type { KrwRates } from '@/services/currency.service'

// 영수증 이미지 제한
const MAX_RECEIPT_SIZE_MB = 5
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const CURRENCIES: Currency[] = ['KRW', 'USD', 'JPY', 'EUR', 'CNY']

/** 외화 여부 확인 */
function isForeignCurrency(currency: Currency): boolean {
  return currency !== 'KRW'
}

// 폼 유효성 검사 스키마
const expenseSchema = z
  .object({
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
    rateMode: z.enum(['plan', 'custom']),
    // 건별 환율 입력값 (custom 모드에서만 필수)
    exchangeRate: z.string(),
  })
  .superRefine((data, ctx) => {
    // custom 모드이고 외화일 때만 환율 유효성 검사
    if (data.rateMode === 'custom' && isForeignCurrency(data.currency as Currency)) {
      const v = Number(data.exchangeRate)
      if (!data.exchangeRate || isNaN(v) || v <= 0 || v > 9999999) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '유효한 환율을 입력해주세요.',
          path: ['exchangeRate'],
        })
      }
    }
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

  // 선택된 날짜 기준 API 환율 — 플랜 환율 미리보기 및 "채우기" 기능에 사용
  const [apiRates, setApiRates] = useState<KrwRates | null>(null)
  const [isRateLoading, setIsRateLoading] = useState(false)

  // 영수증 이미지 관련 상태
  // receiptFile: 새로 선택한 파일, receiptPreview: 로컬 미리보기 URL, receiptCleared: 기존 영수증 삭제 요청
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [receiptCleared, setReceiptCleared] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      rateMode: 'plan',
      exchangeRate: '',
    },
  })

  const selectedCategory = watch('category')
  const selectedCurrency = watch('currency') as Currency
  const selectedDate = watch('date')
  const rateMode = watch('rateMode')
  const showRateSection = isForeignCurrency(selectedCurrency)

  // 통화별 기준 단위 — JPY: 100, 나머지: 1
  const currencyUnit = CURRENCY_UNITS[selectedCurrency] ?? 1

  /** 선택된 날짜의 API 환율을 가져와 미리보기용으로 저장 */
  const loadApiRate = useCallback(async (date: string) => {
    setIsRateLoading(true)
    try {
      const rates = await fetchKrwRates(date || undefined)
      setApiRates(rates)
    } catch {
      setApiRates(null)
    } finally {
      setIsRateLoading(false)
    }
  }, [])

  // 날짜 또는 외화 선택 변경 시 API 환율 재조회
  useEffect(() => {
    if (!showRateSection) return
    loadApiRate(selectedDate)
  }, [selectedDate, showRateSection, loadApiRate])

  // 통화가 KRW로 바뀌면 환율 모드를 초기화
  useEffect(() => {
    if (!isForeignCurrency(selectedCurrency)) {
      setValue('rateMode', 'plan')
      setValue('exchangeRate', '')
    }
  }, [selectedCurrency, setValue])

  /** 수정 모드: 기존 값으로 폼 초기화 */
  useEffect(() => {
    if (open && editingExpense) {
      setValue('date', editingExpense.date)
      setValue('category', editingExpense.category)
      setValue('title', editingExpense.title)
      setValue('amount', String(editingExpense.amount))
      setValue('currency', editingExpense.currency)
      setValue('memo', editingExpense.memo ?? '')
      setValue('rateMode', editingExpense.rate_mode ?? 'plan')
      // custom 모드라면 저장된 환율값을 입력 필드에 복원
      if (editingExpense.rate_mode === 'custom' && editingExpense.exchange_rate != null) {
        setValue('exchangeRate', String(editingExpense.exchange_rate))
      } else {
        setValue('exchangeRate', '')
      }
    } else {
      reset({
        date: new Date().toISOString().slice(0, 10),
        category: 'etc',
        title: '',
        amount: '',
        currency: 'KRW',
        memo: '',
        rateMode: 'plan',
        exchangeRate: '',
      })
    }
    // 다이얼로그가 열릴 때마다 영수증 상태 초기화
    setReceiptFile(null)
    setReceiptPreview(null)
    setReceiptCleared(false)
  }, [editingExpense, open, setValue, reset])

  /** 영수증 파일 선택 처리 */
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 타입 검사
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('JPG, PNG, WebP 이미지만 첨부할 수 있습니다.')
      return
    }
    // 파일 크기 검사 (5MB)
    if (file.size > MAX_RECEIPT_SIZE_MB * 1024 * 1024) {
      toast.error(`이미지 크기는 ${MAX_RECEIPT_SIZE_MB}MB 이하여야 합니다.`)
      return
    }

    setReceiptFile(file)
    setReceiptCleared(false)
    // 로컬 미리보기 URL 생성
    const previewUrl = URL.createObjectURL(file)
    setReceiptPreview(previewUrl)
    // input 값 초기화 (같은 파일 재선택 허용)
    e.target.value = ''
  }

  /** 영수증 제거 처리 (새 파일 또는 기존 URL 제거) */
  const handleReceiptRemove = () => {
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview)
    }
    setReceiptFile(null)
    setReceiptPreview(null)
    setReceiptCleared(true)
  }

  // 현재 표시할 영수증 이미지 — 새로 선택한 미리보기 > 기존 저장된 URL
  const displayReceiptUrl = receiptPreview ?? (
    !receiptCleared && isEditing ? (editingExpense?.receipt_url ?? null) : null
  )

  /** API 환율값을 건별 환율 입력 필드에 채우기 */
  const fillWithApiRate = () => {
    if (!apiRates) return
    const krwPer1Unit = apiRates[selectedCurrency]
    if (!krwPer1Unit) return
    // unit 기준으로 환산 (예: JPY → 100 * 9.64 = 964)
    const rounded = Math.round(krwPer1Unit * currencyUnit)
    setValue('exchangeRate', String(rounded), { shouldValidate: true })
  }

  /** 지출 저장 (추가 또는 수정) */
  const onSubmit = async (values: ExpenseFormValues) => {
    const parsedAmount = Number(values.amount)
    const unit = CURRENCY_UNITS[values.currency] ?? 1
    const isCustom = values.rateMode === 'custom' && isForeignCurrency(values.currency as Currency)

    try {
      // 영수증 업로드를 위해 현재 로그인한 사용자 ID 조회
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id

      if (isEditing && editingExpense) {
        // 1. 영수증 처리: 새 파일 업로드 or 기존 삭제
        let receiptUrl: string | null = editingExpense.receipt_url ?? null

        if (receiptFile && userId) {
          try {
            // 기존 영수증이 있으면 먼저 삭제
            if (editingExpense.receipt_url) {
              await deleteReceiptImage(editingExpense.receipt_url)
            }
            receiptUrl = await uploadReceiptImage(userId, planId, editingExpense.id, receiptFile)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[영수증 업로드 실패]', msg)
            toast.error(`영수증 업로드 실패: ${msg}`)
            return
          }
        } else if (receiptCleared) {
          if (editingExpense.receipt_url) {
            await deleteReceiptImage(editingExpense.receipt_url)
          }
          receiptUrl = null
        }

        // 2. 지출 수정 (영수증 URL 포함)
        await updateExpense(editingExpense.id, {
          date: values.date,
          category: values.category,
          title: values.title,
          amount: parsedAmount,
          currency: values.currency,
          memo: values.memo || undefined,
          rate_mode: isCustom ? 'custom' : 'plan',
          exchange_rate: isCustom ? Number(values.exchangeRate) : null,
          unit,
          receipt_url: receiptUrl,
        })
        toast.success('지출이 수정되었습니다.')
      } else {
        // 1. 지출 먼저 생성 (영수증 없이) — 업로드에 ID가 필요하기 때문
        const newExpense = await createExpense({
          plan_id: planId,
          date: values.date,
          category: values.category,
          title: values.title,
          amount: parsedAmount,
          currency: values.currency,
          memo: values.memo || undefined,
          rate_mode: isCustom ? 'custom' : 'plan',
          exchange_rate: isCustom ? Number(values.exchangeRate) : null,
          unit,
        })

        // 2. 영수증 파일이 있으면 업로드 후 URL 저장
        if (receiptFile && userId) {
          try {
            const receiptUrl = await uploadReceiptImage(userId, planId, newExpense.id, receiptFile)
            await updateExpense(newExpense.id, { receipt_url: receiptUrl })
          } catch (err) {
            // 영수증 업로드 실패는 지출 추가 성공과 독립 처리 — 실제 오류 내용 표시
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[영수증 업로드 실패]', msg)
            toast.error(`영수증 업로드 실패: ${msg}`)
          }
        }

        toast.success('지출이 추가되었습니다.')
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[지출 저장 실패]', msg)
      toast.error(isEditing ? '지출 수정에 실패했습니다.' : '지출 추가에 실패했습니다.')
    }
  }

  /** 플랜 환율 미리보기 텍스트 — 선택된 날짜 기준 API 환율 표시 */
  const planRatePreview = (() => {
    if (!apiRates) return null
    const krwPer1Unit = apiRates[selectedCurrency]
    if (!krwPer1Unit) return null
    const krwForUnit = Math.round(krwPer1Unit * currencyUnit)
    return `${currencyUnit} ${selectedCurrency} ≈ ${krwForUnit.toLocaleString()}원`
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 모바일: 바텀시트 / 데스크탑: 중앙 모달 */}
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

          {/* ── 카테고리 ── */}
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
                      backgroundColor: isSelected ? `${config.color}20` : 'transparent',
                      borderColor: isSelected ? config.color : 'var(--border)',
                      color: isSelected ? config.color : 'var(--muted-foreground)',
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

          {/* ── 금액 + 통화 ── */}
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="amount" className="text-sm font-medium">금액</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="any"
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

          {/* ── 환율 설정 (외화 선택 시만 표시) ── */}
          {showRateSection && (
            <div className="space-y-2.5 rounded-xl bg-muted/50 border border-border px-3.5 py-3">
              <p className="text-xs font-medium text-muted-foreground">환율 설정</p>

              {/* 플랜 환율 사용 옵션 */}
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  className="mt-0.5 accent-primary cursor-pointer"
                  checked={rateMode === 'plan'}
                  onChange={() => {
                    setValue('rateMode', 'plan')
                    setValue('exchangeRate', '')
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">플랜 환율 사용</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {isRateLoading ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        조회 중...
                      </span>
                    ) : planRatePreview ? (
                      <>
                        {selectedDate} 기준 {planRatePreview}
                      </>
                    ) : (
                      '날짜 기준 API 환율 자동 적용'
                    )}
                  </p>
                </div>
              </label>

              {/* 이 건에만 지정 옵션 */}
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  className="mt-0.5 accent-primary cursor-pointer"
                  checked={rateMode === 'custom'}
                  onChange={() => {
                    setValue('rateMode', 'custom')
                    // 처음 선택 시 API 환율로 자동 채우기
                    if (!watch('exchangeRate')) fillWithApiRate()
                  }}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-medium leading-tight">이 건에만 직접 지정</p>

                  {/* custom 모드일 때 입력 필드 표시 */}
                  {rateMode === 'custom' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {/* 단위 레이블 */}
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {currencyUnit} {selectedCurrency} =
                        </span>
                        {/* 환율 입력 */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            placeholder="0"
                            {...register('exchangeRate')}
                            className={cn(
                              'h-8 text-sm',
                              errors.exchangeRate && 'border-destructive'
                            )}
                          />
                          <span className="text-xs text-muted-foreground shrink-0">원</span>
                        </div>
                      </div>

                      {/* API 환율로 채우기 버튼 */}
                      <button
                        type="button"
                        onClick={fillWithApiRate}
                        disabled={isRateLoading || !apiRates}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={cn('w-3 h-3', isRateLoading && 'animate-spin')} />
                        {planRatePreview
                          ? `API 환율로 채우기 (${planRatePreview})`
                          : 'API 환율로 채우기'}
                      </button>

                      {errors.exchangeRate && (
                        <p className="text-xs text-destructive">{errors.exchangeRate.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

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

          {/* ── 영수증 첨부 (선택) ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              영수증 <span className="text-muted-foreground font-normal">(선택)</span>
            </Label>

            {displayReceiptUrl ? (
              // 영수증 미리보기 — 섬네일 + 제거 버튼
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayReceiptUrl}
                    alt="영수증 미리보기"
                    className="w-full h-full object-cover rounded-xl border border-border"
                  />
                  {/* X 버튼 — 영수증 제거 */}
                  <button
                    type="button"
                    onClick={handleReceiptRemove}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                    aria-label="영수증 제거"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-primary hover:text-primary/80 transition-colors duration-150 cursor-pointer underline-offset-2 hover:underline"
                >
                  이미지 교체
                </button>
              </div>
            ) : (
              // 파일 선택 버튼
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border',
                  'text-sm text-muted-foreground hover:text-foreground hover:border-primary/50',
                  'transition-all duration-150 cursor-pointer w-full justify-center'
                )}
              >
                <ImagePlus className="w-4 h-4 shrink-0" />
                영수증 사진 첨부
              </button>
            )}

            {/* 허용 형식 및 크기 안내 */}
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP · 최대 {MAX_RECEIPT_SIZE_MB}MB
            </p>

            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={handleReceiptFileChange}
            />
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
