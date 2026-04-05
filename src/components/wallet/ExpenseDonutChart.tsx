'use client'

/**
 * 카테고리별 지출 비율을 보여주는 SVG 도넛 차트 컴포넌트
 * 외부 라이브러리 없이 순수 SVG stroke-dasharray 기법으로 구현합니다.
 * 각 세그먼트는 화면에 처음 나타날 때 시계 방향으로 그려지는 애니메이션이 적용됩니다.
 */
import { useEffect, useRef } from 'react'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import type { Expense, ExpenseCategory } from '@/types/expense.types'

interface ExpenseDonutChartProps {
  expenses: Expense[]
  /** 환율 환산된 KRW 카테고리 합계 — 있으면 환산값 기준으로 비율 계산 */
  krwCategoryMap?: Map<string, number> | null
  /** 환율 환산된 전체 합계 */
  displayTotal: number
  displayCurrency: string
}

// SVG 도넛 반지름 및 기본 상수
const CX = 50
const CY = 50
const RADIUS = 38
const STROKE_WIDTH = 14
const CIRCUMFERENCE = 2 * Math.PI * RADIUS  // ≈ 238.76

// 세그먼트 사이 간격 (px 단위, 원 둘레 기준)
const GAP = 2

interface Segment {
  category: ExpenseCategory
  length: number   // 원 둘레 상 실제 길이
  offset: number   // 시작 위치 (누적)
  color: string
  label: string
  percentage: number
}

/** 지출 배열에서 카테고리별 세그먼트 데이터 계산 */
function buildSegments(
  expenses: Expense[],
  krwCategoryMap: Map<string, number> | null | undefined,
  displayTotal: number
): Segment[] {
  if (displayTotal === 0) return []

  // 카테고리 합계 집계
  const categoryTotals = new Map<ExpenseCategory, number>()
  expenses.forEach((e) => {
    const value = krwCategoryMap?.get(e.category) ?? e.amount
    // krwCategoryMap은 카테고리별 누적 합계이므로 한 번만 설정
    if (!categoryTotals.has(e.category)) {
      categoryTotals.set(e.category, value)
    }
  })

  // 중복 방지: krwCategoryMap이 있으면 해당 값 우선 사용
  if (krwCategoryMap) {
    categoryTotals.clear()
    krwCategoryMap.forEach((value, cat) => {
      categoryTotals.set(cat as ExpenseCategory, value)
    })
  }

  const segments: Segment[] = []
  let cumulativeOffset = 0

  categoryTotals.forEach((total, category) => {
    const percentage = (total / displayTotal) * 100
    // 너무 작은 세그먼트(1% 미만)는 시각적으로 표시하기 어려우므로 최소 길이 보장
    const rawLength = (percentage / 100) * CIRCUMFERENCE
    const length = Math.max(rawLength - GAP, 0)

    segments.push({
      category,
      length,
      offset: cumulativeOffset,
      color: CATEGORY_CONFIG[category].color,
      label: CATEGORY_CONFIG[category].label,
      percentage,
    })

    cumulativeOffset += rawLength  // gap 포함 길이로 offset 계산
  })

  return segments
}

/**
 * 개별 세그먼트 원 — 마운트 시 0 → 실제 길이로 stroke-dasharray 애니메이션
 * CSS transition을 사용해 브라우저 부담 없이 부드럽게 표현합니다.
 */
function DonutSegment({
  segment,
  delay,
}: {
  segment: Segment
  delay: number
}) {
  const circleRef = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const el = circleRef.current
    if (!el) return

    // 처음에 길이 0으로 설정 후 딜레이를 두어 실제 길이로 전환 → 그려지는 효과
    el.style.strokeDasharray = `0 ${CIRCUMFERENCE}`
    const timer = setTimeout(() => {
      el.style.transition = `stroke-dasharray 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`
      el.style.strokeDasharray = `${segment.length} ${CIRCUMFERENCE - segment.length}`
    }, 50)

    return () => clearTimeout(timer)
  }, [segment.length, delay])

  return (
    <circle
      ref={circleRef}
      cx={CX}
      cy={CY}
      r={RADIUS}
      fill="none"
      stroke={segment.color}
      strokeWidth={STROKE_WIDTH}
      // strokeDashoffset: 각 세그먼트의 시작 위치를 12시 방향 기준으로 설정
      // CIRCUMFERENCE * 0.25를 더하면 12시 방향에서 시작 (SVG 기본은 3시 방향)
      strokeDashoffset={-(segment.offset) + CIRCUMFERENCE * 0.25}
      strokeLinecap="butt"
    />
  )
}

export function ExpenseDonutChart({
  expenses,
  krwCategoryMap,
  displayTotal,
  displayCurrency,
}: ExpenseDonutChartProps) {
  const segments = buildSegments(expenses, krwCategoryMap, displayTotal)

  if (segments.length === 0) return null

  return (
    <div className="flex items-center gap-4">
      {/* SVG 도넛 차트 */}
      <div className="relative shrink-0 w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-0">
          {/* 배경 트랙 — 데이터 없는 부분을 연한 회색으로 채움 */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={STROKE_WIDTH}
          />
          {/* 카테고리별 세그먼트 — 뒤에서 앞으로 쌓이므로 역순 렌더 */}
          {[...segments].reverse().map((seg, i) => (
            <DonutSegment
              key={seg.category}
              segment={seg}
              delay={i * 80}
            />
          ))}
        </svg>

        {/* 중앙 텍스트: 총 지출 금액 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-muted-foreground leading-none mb-0.5">총 지출</span>
          <span className="text-xs font-bold text-foreground leading-none">
            {displayTotal.toLocaleString()}
          </span>
          <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
            {displayCurrency}
          </span>
        </div>
      </div>

      {/* 범례 — 카테고리 색상 + 레이블 + 비율 */}
      <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {segments.map((seg) => (
          <div key={seg.category} className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-muted-foreground truncate">
              {seg.label}
            </span>
            <span className="text-xs font-medium text-foreground ml-auto shrink-0">
              {seg.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
