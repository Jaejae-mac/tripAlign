'use client'

/**
 * 가계부 탭 메인 뷰
 * 총 지출 요약, 카테고리 필터 칩, 날짜별 지출 목록을 보여줍니다.
 */
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ExpenseSummary } from './ExpenseSummary'
import { ExpenseItem } from './ExpenseItem'
import { ExpenseAddDialog } from './ExpenseAddDialog'
import { ExpenseItemDetailDialog } from './ExpenseItemDetailDialog'
import { getExpenses, deleteExpense } from '@/services/expense.service'
import { fetchKrwRates, convertToKrw } from '@/services/currency.service'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import { toast } from 'sonner'
import type { Expense, ExpenseCategory } from '@/types/expense.types'
import type { KrwRates } from '@/services/currency.service'

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
  // 환율 정보 — 실패해도 앱 동작에 영향 없이 undefined 유지
  const [krwRates, setKrwRates] = useState<KrwRates | undefined>(undefined)
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

  // 화면에 처음 나타날 때 당일 환율 조회 (실패해도 KRW 환산 없이 정상 동작)
  useEffect(() => {
    fetchKrwRates()
      .then(setKrwRates)
      .catch(() => {})
  }, [])

  /** 지출 셀 클릭 시 상세 팝업 열기 */
  const handleView = (expense: Expense) => {
    setViewingExpense(expense)
    setIsDetailOpen(true)
  }

  /** 지출 항목 삭제 */
  const handleDelete = async (expenseId: string) => {
    const confirmed = window.confirm('이 지출 내역을 삭제하시겠습니까?')
    if (!confirmed) return

    try {
      await deleteExpense(expenseId)
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
          <div key={i} className="h-16 rounded-xl bg-white animate-pulse border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 지출 추가 버튼 */}
      <div className="flex justify-end">
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
                : 'bg-white text-muted-foreground border-border hover:border-primary/40'
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
                    : 'bg-white text-muted-foreground border-border hover:border-primary/40'
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
          krwRates={krwRates}
          budget={budget}
          budgetCurrency={budgetCurrency}
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
              const krwDayTotal =
                krwRates && dayHasNonKrw
                  ? dayExpenses.reduce(
                      (sum, e) => sum + convertToKrw(e.amount, e.currency, krwRates),
                      0
                    )
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
                            krwRates={krwRates}
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
          krwRates={krwRates}
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
    </div>
  )
}
