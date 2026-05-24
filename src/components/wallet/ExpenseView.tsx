'use client'

/**
 * 가계부 탭 메인 뷰
 * 총 지출 요약, 카테고리 필터 칩, 날짜별 지출 목록을 보여줍니다.
 */
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Receipt, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ExpenseSummary } from './ExpenseSummary'
import { ExpenseItem } from './ExpenseItem'
import { ExpenseAddDialog } from './ExpenseAddDialog'
import { ExpenseItemDetailDialog } from './ExpenseItemDetailDialog'
import { ExchangeRateSettingsDialog } from './ExchangeRateSettingsDialog'
import { getExpenses, deleteExpense } from '@/services/expense.service'
import { deleteReceiptImage } from '@/services/storage.service'
import { getPlanExchangeRates } from '@/services/exchange-rate.service'
import { fetchKrwRates, convertToKrw } from '@/services/currency.service'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import { toast } from 'sonner'
import type { Expense, ExpenseCategory } from '@/types/expense.types'
import type { KrwRates } from '@/services/currency.service'
import type { PlanExchangeRate } from '@/types/exchange-rate.types'

interface ExpenseViewProps {
  planId: string
  /** 여행 총 예산 — 있으면 ExpenseSummary에 진행 바 표시 */
  budget?: number | null
  budgetCurrency?: string | null
}

/** 카테고리 필터 목록 — '전체' + 6개 카테고리 */
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food', 'transport', 'stay', 'tour', 'shopping', 'etc',
]

/** 지출 목록을 날짜별로 그룹화 */
function groupByDate(expenses: Expense[]): Map<string, Expense[]> {
  const map = new Map<string, Expense[]>()
  expenses.forEach((expense) => {
    const key = expense.date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(expense)
  })
  return map
}

export function ExpenseView({ planId, budget, budgetCurrency }: ExpenseViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  // 상세 팝업
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  // 날짜별 API 환율 맵 (raw) — 지출일 기준 환율
  const [apiRatesByDate, setApiRatesByDate] = useState<Record<string, KrwRates>>({})
  // 플랜에 저장된 수동 환율 설정 목록
  const [planRates, setPlanRates] = useState<PlanExchangeRate[]>([])
  // 환율 설정 다이얼로그 표시 여부
  const [isRateSettingsOpen, setIsRateSettingsOpen] = useState(false)
  // 카테고리 필터 — 'all'이면 전체 표시
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all')

  /** 지출 목록 불러오기 */
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getExpenses(planId)
      setExpenses(data)
    } catch {
      toast.error('지출 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [planId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  /** 플랜에 저장된 수동 환율 설정 조회 */
  const fetchPlanRates = useCallback(async () => {
    try {
      const rates = await getPlanExchangeRates(planId)
      setPlanRates(rates)
    } catch {
      // 환율 설정 조회 실패 시 기본값(빈 배열)으로 유지 — 자동 환율이 사용됨
    }
  }, [planId])

  useEffect(() => {
    fetchPlanRates()
  }, [fetchPlanRates])

  // expenses 로드 완료 후 고유 날짜 추출 → 지출일별 API 환율 병렬 fetch
  useEffect(() => {
    if (expenses.length === 0) return
    const uniqueDates = [...new Set(expenses.map((e) => e.date))]
    Promise.all(
      uniqueDates.map((date) =>
        fetchKrwRates(date)
          .then((rates) => ({ date, rates }))
          .catch(() => null)
      )
    ).then((results) => {
      const map: Record<string, KrwRates> = {}
      results.forEach((r) => { if (r) map[r.date] = r.rates })
      setApiRatesByDate(map)
    })
  }, [expenses])

  /**
   * 플랜 수동 환율이 설정된 통화 목록
   * 지출 항목 카드에서 플랜 수동 환율 아이콘 표시에 사용
   */
  const manualCurrencies = new Set(
    planRates.filter((r) => r.mode === 'manual').map((r) => r.currency)
  )

  /**
   * 날짜별 최종 환율: API 환율 + 플랜 수동 설정 override
   * 수동 모드인 통화는 API 환율 대신 직접 입력한 값으로 덮어씌움
   */
  const ratesByDate: Record<string, KrwRates> = {}
  for (const [date, apiRates] of Object.entries(apiRatesByDate)) {
    const effectiveRates = { ...apiRates }
    planRates.forEach((r) => {
      if (r.mode === 'manual' && r.custom_rate > 0) {
        const krwPer1Unit = r.custom_rate / r.unit
        ;(effectiveRates as Record<string, number>)[r.currency] = krwPer1Unit
      }
    })
    ratesByDate[date] = effectiveRates
  }

  /**
   * 지출 건별 최종 유효 환율을 반환합니다.
   * 우선순위: 1) 건별 수동 환율 → 2) 플랜 환율(자동/수동) → 3) API 자동 환율
   * API 환율이 아직 로드되지 않았으면 undefined 반환 → 호출자가 fallback 처리
   */
  function getEffectiveRates(expense: Expense): KrwRates | undefined {
    const base = ratesByDate[expense.date]
    if (!base) return undefined  // 환율 로드 전 — 빈 객체로 NaN 발생 방지
    if (expense.rate_mode === 'custom' && expense.exchange_rate != null) {
      // 건별 환율 override — exchange_rate는 unit 기준 KRW 금액
      const krwPer1Unit = expense.exchange_rate / (expense.unit ?? 1)
      return { ...base, [expense.currency]: krwPer1Unit } as KrwRates
    }
    return base
  }

  /**
   * 지출 ID → 최종 유효 환율 맵 (ExpenseSummary, ExpenseItem에 전달)
   * undefined인 경우(환율 미로드)는 맵에서 제외 → 수신측에서 e.amount로 fallback
   */
  const effectiveRatesByExpenseId: Record<string, KrwRates> = {}
  expenses.forEach((e) => {
    const rates = getEffectiveRates(e)
    if (rates) effectiveRatesByExpenseId[e.id] = rates
  })

  /** 지출 셀 클릭 시 상세 팝업 열기 */
  const handleView = (expense: Expense) => {
    setViewingExpense(expense)
    setIsDetailOpen(true)
  }

  /** 지출 항목 삭제 — 영수증 이미지가 있으면 Storage에서도 함께 삭제 */
  const handleDelete = async (expenseId: string) => {
    const confirmed = window.confirm('이 지출 내역을 삭제하시겠습니까?')
    if (!confirmed) return

    const target = expenses.find((e) => e.id === expenseId)

    try {
      await deleteExpense(expenseId)
      // DB 삭제 후 영수증 이미지가 있으면 Storage에서도 삭제
      // Storage 삭제 실패는 지출 삭제 성공과 독립적으로 처리 (UX 차단 방지)
      if (target?.receipt_url) {
        deleteReceiptImage(target.receipt_url).catch((err) => {
          console.error('[영수증 이미지 삭제 실패]', err)
        })
      }
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
      toast.success('지출이 삭제되었습니다.')
    } catch {
      toast.error('지출 삭제에 실패했습니다.')
    }
  }

  // 선택된 카테고리로 필터링 — 'all'이면 전체
  const filteredExpenses = selectedCategory === 'all'
    ? expenses
    : expenses.filter((e) => e.category === selectedCategory)

  const groupedExpenses = groupByDate(filteredExpenses)
  const sortedDates = Array.from(groupedExpenses.keys()).sort()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-card animate-pulse border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 지출 추가 버튼 + 환율 설정 버튼 */}
      <div className="flex items-center justify-between">
        {/* 환율 설정 버튼 — 수동 환율이 하나라도 있으면 강조 표시 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsRateSettingsOpen(true)}
          className={[
            'gap-1.5 cursor-pointer text-xs',
            manualCurrencies.size > 0
              ? 'text-primary font-medium'
              : 'text-muted-foreground',
          ].join(' ')}
        >
          <Settings2 className="w-3.5 h-3.5" />
          환율 설정
          {manualCurrencies.size > 0 && (
            <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-xs">
              수동 {manualCurrencies.size}
            </span>
          )}
        </Button>

        <Button
          onClick={() => {
            setEditingExpense(null)
            setIsAddDialogOpen(true)
          }}
          size="sm"
          className="gap-1.5 cursor-pointer"
          style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
        >
          <Plus className="w-3.5 h-3.5" />
          지출 추가
        </Button>
      </div>

      {/* 카테고리 필터 칩 — 지출이 1개 이상일 때만 표시 */}
      {expenses.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* 전체 칩 */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              whitespace-nowrap shrink-0 border transition-all duration-200 cursor-pointer
              ${selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
              }
            `}
          >
            전체
          </button>

          {/* 카테고리별 칩 */}
          {EXPENSE_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat]
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  whitespace-nowrap shrink-0 border transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? 'text-white border-transparent'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                  }
                `}
                style={isSelected ? { backgroundColor: config.color, borderColor: config.color } : {}}
              >
                <config.Icon
                  className="w-3 h-3"
                  style={{ color: isSelected ? 'white' : config.color }}
                />
                {config.label}
              </button>
            )
          })}
        </div>
      )}

      {/* 총 지출 요약 */}
      {filteredExpenses.length > 0 && (
        <ExpenseSummary
          expenses={filteredExpenses}
          effectiveRatesByExpenseId={effectiveRatesByExpenseId}
          budget={budget}
          budgetCurrency={budgetCurrency}
          manualCurrencies={manualCurrencies}
        />
      )}

      {/* 날짜별 지출 목록 */}
      <AnimatePresence mode="wait">
        {filteredExpenses.length === 0 ? (
          // 빈 상태 — 필터 결과 없음 vs 지출 없음 구분
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Receipt className="w-7 h-7 text-primary/60" />
            </div>
            {selectedCategory === 'all' ? (
              <>
                <p className="text-sm text-muted-foreground">아직 지출 내역이 없어요</p>
                <p className="text-xs text-muted-foreground mt-1">
                  + 지출 추가 버튼으로 여행 경비를 기록해보세요
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {CATEGORY_CONFIG[selectedCategory].label} 카테고리의 지출 내역이 없어요
              </p>
            )}
          </motion.div>
        ) : (
          // 날짜 그룹이 순차적으로 등장하는 stagger 컨테이너
          <motion.div
            key={`list-${selectedCategory}`}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.07 } },
            }}
            className="space-y-6"
          >
            {sortedDates.map((dateStr) => {
              const dayExpenses = groupedExpenses.get(dateStr)!
              const dayRawTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
              const dayHasNonKrw = dayExpenses.some((e) => e.currency !== 'KRW')
              const allSameCurrency = dayExpenses.every(
                (e) => e.currency === dayExpenses[0]?.currency
              )
              // 날짜 합계는 각 지출의 건별 유효 환율로 계산 (건별 환율 반영)
              const krwDayTotal = dayHasNonKrw
                ? dayExpenses.reduce((sum, e) => {
                    const rates = effectiveRatesByExpenseId[e.id]
                    return rates ? sum + convertToKrw(e.amount, e.currency, rates) : sum + e.amount
                  }, 0)
                : null

              return (
                <motion.div
                  key={dateStr}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
                  }}
                >
                  {/* 날짜 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {format(parseISO(dateStr), 'M월 d일 (EEE)', { locale: ko })}
                    </h3>
                    <div className="text-right">
                      {krwDayTotal !== null && !allSameCurrency ? (
                        <span className="text-sm font-medium text-primary">
                          ≈ {krwDayTotal.toLocaleString()}원
                        </span>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-primary">
                            {dayRawTotal.toLocaleString()}
                            {dayExpenses[0]?.currency}
                          </span>
                          {krwDayTotal !== null && (
                            <p className="text-xs text-muted-foreground">
                              ≈ {krwDayTotal.toLocaleString()}원
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* 해당 날짜의 지출 항목들 */}
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {dayExpenses.map((expense, idx) => (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0, transition: { duration: 0.2, delay: idx * 0.04 } }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
                        >
                          <ExpenseItem
                            expense={expense}
                            krwRates={effectiveRatesByExpenseId[expense.id]}
                            manualCurrencies={manualCurrencies}
                            onView={() => handleView(expense)}
                            onEdit={() => {
                              setEditingExpense(expense)
                              setIsAddDialogOpen(true)
                            }}
                            onDelete={() => handleDelete(expense.id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <Separator className="mt-4" />
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 지출 상세 팝업 */}
      {viewingExpense && (
        <ExpenseItemDetailDialog
          open={isDetailOpen}
          onOpenChange={(open) => {
            setIsDetailOpen(open)
            if (!open) setViewingExpense(null)
          }}
          expense={viewingExpense}
          krwRates={effectiveRatesByExpenseId[viewingExpense.id]}
          onEdit={() => {
            setEditingExpense(viewingExpense)
            setIsAddDialogOpen(true)
          }}
          onDelete={() => handleDelete(viewingExpense.id)}
        />
      )}

      {/* 지출 추가/수정 다이얼로그 */}
      <ExpenseAddDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) setEditingExpense(null)
        }}
        planId={planId}
        editingExpense={editingExpense}
        onSaved={fetchExpenses}
      />

      {/* 환율 설정 다이얼로그 */}
      <ExchangeRateSettingsDialog
        open={isRateSettingsOpen}
        onOpenChange={setIsRateSettingsOpen}
        planId={planId}
        planRates={planRates}
        onSaved={fetchPlanRates}
      />
    </div>
  )
}
