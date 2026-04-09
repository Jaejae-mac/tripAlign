'use client'

/**
 * 지출 요약 카드
 * 총 지출 카운트업 애니메이션, 예산 대비 진행 바,
 * 카테고리별 도넛 차트, 카테고리별 막대 그래프를 보여줍니다.
 */
import { useEffect, useRef } from 'react'
import { motion, animate } from 'framer-motion'
import { TrendingDown, Wallet } from 'lucide-react'
import { calcSummaryByCategory } from '@/services/expense.service'
import { convertToKrw } from '@/services/currency.service'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import { ExpenseDonutChart } from './ExpenseDonutChart'
import type { KrwRates } from '@/services/currency.service'
import type { Expense } from '@/types/expense.types'

/**
 * 숫자가 0에서 목표값까지 카운트업되는 컴포넌트
 * expenses가 바뀔 때마다 새 값으로 다시 애니메이션
 */
function AnimatedTotal({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const controls = animate(0, value, {
      duration: 0.7,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (v) => {
        node.textContent = Math.round(v).toLocaleString()
      },
    })
    return controls.stop
  }, [value])

  return <span ref={ref}>0</span>
}

interface ExpenseSummaryProps {
  expenses: Expense[]
  /** 지출일별 환율 맵 — 있으면 각 지출의 지출일 환율로 KRW 환산 합계 표시 */
  ratesByDate?: Record<string, KrwRates>
  /** 여행 총 예산 — 있으면 예산 대비 진행 바 표시 */
  budget?: number | null
  /** 예산 통화 코드 */
  budgetCurrency?: string | null
}

export function ExpenseSummary({ expenses, ratesByDate, budget, budgetCurrency }: ExpenseSummaryProps) {
  const summaries = calcSummaryByCategory(expenses)

  // 원시 합계 (통화 무시) — 단일 통화일 때만 의미 있음
  const rawTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const currency = expenses[0]?.currency ?? 'KRW'
  const hasNonKrw = expenses.some((e) => e.currency !== 'KRW')

  // 외화 포함 시 지출일별 환율로 전체 KRW 환산 합계 계산
  const krwTotal =
    ratesByDate && hasNonKrw
      ? expenses.reduce((sum, e) => {
          const rates = ratesByDate[e.date]
          return sum + (rates ? convertToKrw(e.amount, e.currency, rates) : e.amount)
        }, 0)
      : null

  /**
   * 주 표시 합계: 외화 포함+환율 있으면 KRW 환산값, 아니면 원시 합계
   * 10,000원 + 30 EUR → 10,030원(❌) 대신 ≈ 55,000원(✅)으로 표시
   */
  const displayTotal = krwTotal ?? rawTotal
  const displayCurrency = krwTotal !== null ? 'KRW' : currency

  /**
   * 카테고리별 KRW 환산 합계 — 막대 그래프·도넛 차트 비율 계산에 사용
   * 지출일별 환율을 적용해 통화가 다른 지출의 비율을 정확히 계산
   */
  const krwCategoryMap = ratesByDate
    ? expenses.reduce((map, e) => {
        const rates = ratesByDate[e.date]
        const krw = rates ? convertToKrw(e.amount, e.currency, rates) : e.amount
        map.set(e.category, (map.get(e.category) ?? 0) + krw)
        return map
      }, new Map<string, number>())
    : null

  /**
   * 예산 진행 바 색상:
   * 60% 미만 → 초록(안전), 60~80% → 주황(주의), 80% 초과 → 빨강(위험)
   */
  const budgetProgress = budget && budget > 0
    ? Math.min((displayTotal / budget) * 100, 100)
    : null

  const budgetBarColor =
    budgetProgress === null ? ''
    : budgetProgress >= 80 ? '#ef4444'   // red-500
    : budgetProgress >= 60 ? '#f97316'   // orange-500
    : '#22c55e'                           // green-500

  const remainingBudget = budget ? budget - displayTotal : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white rounded-2xl p-4 border border-border space-y-4"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {/* 총 지출 — 카운트업 애니메이션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            총 지출
          </span>
        </div>
        <div className="text-right">
          {/* 외화 포함 시 KRW 환산 합계가 주 표시값, 아니면 원시 합계 */}
          <span className="text-xl font-bold text-foreground">
            <AnimatedTotal value={displayTotal} />
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {displayCurrency}
            </span>
          </span>
          {/* KRW 환산 적용 시 "지출일 기준 환율" 레이블 표시 */}
          {krwTotal !== null && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              지출일 기준 환율
            </p>
          )}
        </div>
      </div>

      {/* 예산 대비 진행 바 — 예산이 설정된 경우에만 표시 */}
      {budget && budgetProgress !== null && (
        <div className="space-y-2">
          {/* 예산 헤더 */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" />
              <span>예산</span>
              <span className="font-medium text-foreground">
                {budget.toLocaleString()} {budgetCurrency ?? displayCurrency}
              </span>
            </div>
            <span
              className="font-semibold tabular-nums"
              style={{ color: budgetBarColor }}
            >
              {budgetProgress.toFixed(1)}%
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${budgetProgress}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              style={{ backgroundColor: budgetBarColor }}
            />
          </div>

          {/* 남은 예산 / 초과 금액 */}
          <p className="text-xs text-right">
            {remainingBudget !== null && remainingBudget >= 0 ? (
              <span className="text-muted-foreground">
                남은 예산{' '}
                <span className="font-medium text-foreground">
                  {remainingBudget.toLocaleString()} {budgetCurrency ?? displayCurrency}
                </span>
              </span>
            ) : (
              <span className="font-medium text-red-500">
                예산 {Math.abs(remainingBudget ?? 0).toLocaleString()} {budgetCurrency ?? displayCurrency} 초과
              </span>
            )}
          </p>
        </div>
      )}

      {/* 카테고리별 도넛 차트 — 2개 이상의 카테고리가 있을 때 표시 */}
      {summaries.length >= 2 && (
        <>
          <div className="h-px bg-border" />
          <ExpenseDonutChart
            expenses={expenses}
            krwCategoryMap={krwCategoryMap}
            displayTotal={displayTotal}
            displayCurrency={displayCurrency}
          />
        </>
      )}

      {/* 카테고리별 막대 그래프 */}
      <div className="space-y-2.5">
        {summaries.map(({ category, total: catRawTotal }) => {
          const config = CATEGORY_CONFIG[category]
          // 환율 있으면 KRW 환산 카테고리 합계 사용, 없으면 raw 합계
          const catDisplayTotal = krwCategoryMap?.get(category) ?? catRawTotal
          // displayTotal 기준으로 비율 계산 (통화 단위 통일)
          const percentage = displayTotal > 0 ? (catDisplayTotal / displayTotal) * 100 : 0

          return (
            <div key={category}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5">
                  <config.Icon
                    className="w-3.5 h-3.5"
                    style={{ color: config.color }}
                  />
                  <span className="text-muted-foreground">{config.label}</span>
                  <span className="text-muted-foreground/60">({percentage.toFixed(0)}%)</span>
                </div>
                <span className="font-medium text-foreground">
                  {catDisplayTotal.toLocaleString()} {displayCurrency}
                </span>
              </div>
              {/* 비율 막대 */}
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
