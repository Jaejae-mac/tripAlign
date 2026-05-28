'use client'

/**
 * 환율 설정 다이얼로그
 * 플랜별로 각 통화의 환율을 자동(API) 또는 수동(직접 입력)으로 설정합니다.
 * - 자동 모드: 지출 입력일 기준 API 환율 자동 적용
 * - 수동 모드: "1 USD = X원", "100 JPY = X원" 형식으로 직접 입력
 */
import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, PencilLine } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { fetchKrwRates } from '@/services/currency.service'
import { upsertExchangeRate } from '@/services/exchange-rate.service'
import { CURRENCY_UNITS } from '@/types/exchange-rate.types'
import type { PlanExchangeRate, RateMode } from '@/types/exchange-rate.types'
import type { KrwRates } from '@/services/currency.service'

/** 설정 가능한 외화 목록 */
const CURRENCIES = ['USD', 'EUR', 'JPY', 'CNY'] as const
type ForeignCurrency = (typeof CURRENCIES)[number]

/** 통화 표시명 */
const CURRENCY_LABELS: Record<ForeignCurrency, string> = {
  USD: '미국 달러',
  EUR: '유로',
  JPY: '일본 엔',
  CNY: '중국 위안',
}

/** 통화별 입력 단위 표시 ("1 USD" 또는 "100 JPY") */
function getUnitLabel(currency: ForeignCurrency): string {
  const unit = CURRENCY_UNITS[currency] ?? 1
  return `${unit} ${currency}`
}

/** 통화별 로컬 편집 상태 */
interface CurrencyState {
  mode: RateMode
  inputValue: string  // 사용자가 입력 중인 KRW 금액 (문자열로 관리)
}

interface ExchangeRateSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  /** 현재 저장된 플랜 환율 설정 목록 */
  planRates: PlanExchangeRate[]
  /** 설정 저장 완료 후 부모에게 알려 상태를 갱신하도록 함 */
  onSaved: () => void
}

export function ExchangeRateSettingsDialog({
  open,
  onOpenChange,
  planId,
  planRates,
  onSaved,
}: ExchangeRateSettingsDialogProps) {
  // 오늘 API 환율 (자동 모드 미리보기용)
  const [todayRates, setTodayRates] = useState<KrwRates | null>(null)
  const [isRatesLoading, setIsRatesLoading] = useState(false)

  // 통화별 편집 상태 — 다이얼로그가 열릴 때 planRates 기반으로 초기화
  const [currencyStates, setCurrencyStates] = useState<Record<ForeignCurrency, CurrencyState>>(
    () => buildInitialState(planRates)
  )

  const [isSaving, setIsSaving] = useState(false)

  /** DB에 저장된 planRates로부터 폼 초기 상태 생성 */
  function buildInitialState(rates: PlanExchangeRate[]): Record<ForeignCurrency, CurrencyState> {
    const initial: Record<ForeignCurrency, CurrencyState> = {
      USD: { mode: 'auto', inputValue: '' },
      EUR: { mode: 'auto', inputValue: '' },
      JPY: { mode: 'auto', inputValue: '' },
      CNY: { mode: 'auto', inputValue: '' },
    }
    rates.forEach((r) => {
      const cur = r.currency as ForeignCurrency
      if (CURRENCIES.includes(cur)) {
        initial[cur] = {
          mode: r.mode,
          inputValue: r.mode === 'manual' ? String(r.custom_rate) : '',
        }
      }
    })
    return initial
  }

  // 다이얼로그가 열릴 때마다 최신 planRates로 폼 상태 재설정
  useEffect(() => {
    if (open) {
      setCurrencyStates(buildInitialState(planRates))
    }
  }, [open, planRates])

  /** 다이얼로그가 열릴 때 오늘 API 환율 조회 */
  const loadTodayRates = useCallback(async () => {
    setIsRatesLoading(true)
    try {
      const rates = await fetchKrwRates()
      setTodayRates(rates)
    } catch {
      // 환율 미리보기 실패는 조용히 처리 (필수 기능 아님)
      setTodayRates(null)
    } finally {
      setIsRatesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadTodayRates()
  }, [open, loadTodayRates])

  /** 통화 모드 변경 (자동 ↔ 수동 토글) */
  function handleModeToggle(currency: ForeignCurrency) {
    setCurrencyStates((prev) => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        mode: prev[currency].mode === 'auto' ? 'manual' : 'auto',
      },
    }))
  }

  /** 수동 입력값 변경 */
  function handleInputChange(currency: ForeignCurrency, value: string) {
    // 숫자와 소수점만 허용
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return
    setCurrencyStates((prev) => ({
      ...prev,
      [currency]: { ...prev[currency], inputValue: value },
    }))
  }

  /** 자동 환율값을 수동 입력란에 복사 (편집 시작점으로 활용) */
  function handleFillAutoRate(currency: ForeignCurrency) {
    if (!todayRates) return
    const unit = CURRENCY_UNITS[currency] ?? 1
    // API 환율: 1 외화 = N KRW → unit 기준으로 변환
    const krwPerUnit = Math.round(todayRates[currency as keyof KrwRates] * unit)
    setCurrencyStates((prev) => ({
      ...prev,
      [currency]: {
        mode: 'manual',
        inputValue: String(krwPerUnit),
      },
    }))
  }

  /** 변경된 환율 설정 저장 */
  async function handleSave() {
    // 수동 모드인데 입력값이 없거나 0이면 경고
    const invalidCurrencies = CURRENCIES.filter((cur) => {
      const state = currencyStates[cur]
      return state.mode === 'manual' && (
        state.inputValue === '' || Number(state.inputValue) <= 0
      )
    })

    if (invalidCurrencies.length > 0) {
      toast.error(`수동 환율을 입력해주세요: ${invalidCurrencies.join(', ')}`)
      return
    }

    setIsSaving(true)
    try {
      // 모든 통화를 병렬로 저장
      await Promise.all(
        CURRENCIES.map((currency) => {
          const state = currencyStates[currency]
          const unit = CURRENCY_UNITS[currency] ?? 1
          return upsertExchangeRate({
            plan_id:     planId,
            currency,
            custom_rate: state.mode === 'manual' ? Number(state.inputValue) : 0,
            unit,
            mode:        state.mode,
          })
        })
      )
      toast.success('환율 설정이 저장되었습니다.')
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error('환율 설정 저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  /** 특정 통화의 오늘 API 환율을 "unit 기준 KRW" 형태로 반환 */
  function getAutoRateLabel(currency: ForeignCurrency): string {
    if (!todayRates) return '...'
    const unit = CURRENCY_UNITS[currency] ?? 1
    const krwPerUnit = Math.round(todayRates[currency as keyof KrwRates] * unit)
    return `${krwPerUnit.toLocaleString()}원`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <PencilLine className="w-4 h-4 text-primary" />
            환율 설정
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            수동 모드에서는 직접 입력한 환율로 KRW 금액을 계산합니다
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {CURRENCIES.map((currency) => {
            const state = currencyStates[currency]
            const isManual = state.mode === 'manual'
            const unitLabel = getUnitLabel(currency)

            return (
              <div key={currency} className="space-y-2">
                {/* 통화 헤더 — 이름 + 모드 토글 버튼 */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-foreground">{currency}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      {CURRENCY_LABELS[currency]}
                    </span>
                  </div>

                  {/* 자동/수동 모드 토글 */}
                  <button
                    type="button"
                    onClick={() => handleModeToggle(currency)}
                    className={[
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-150 cursor-pointer',
                      isManual
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/30',
                    ].join(' ')}
                  >
                    {isManual ? (
                      <>
                        <PencilLine className="w-3 h-3" />
                        수동
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        자동
                      </>
                    )}
                  </button>
                </div>

                {/* 자동 모드: 현재 API 환율 표시 */}
                {!isManual && (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">{unitLabel} =</span>
                    <div className="flex items-center gap-2">
                      {isRatesLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-sm font-medium text-foreground">
                          {getAutoRateLabel(currency)}
                        </span>
                      )}
                      {/* 자동 환율을 수동 입력 시작점으로 복사 */}
                      {todayRates && (
                        <button
                          type="button"
                          onClick={() => handleFillAutoRate(currency)}
                          className="text-xs text-primary/70 hover:text-primary underline underline-offset-2 cursor-pointer transition-colors"
                        >
                          수동 입력
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 수동 모드: 직접 입력 필드 */}
                {isManual && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {unitLabel} =
                    </span>
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={state.inputValue}
                        onChange={(e) => handleInputChange(currency, e.target.value)}
                        placeholder="금액 입력"
                        className="pr-8 text-sm h-9"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        원
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 저장 버튼 */}
        <div className="px-5 pb-5 pt-1">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full gap-2 cursor-pointer font-semibold"
            style={{ backgroundColor: 'var(--brand-cta, #F97316)' }}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? '저장 중...' : '환율 설정 저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
