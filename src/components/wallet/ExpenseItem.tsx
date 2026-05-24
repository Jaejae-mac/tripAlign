'use client'

/**
 * 지출 항목 카드
 * 카테고리 아이콘, 제목, 금액, 메모를 보여주고 수정/삭제 메뉴를 제공합니다.
 * 외화 지출의 경우 당일 환율 기준 KRW 환산 금액을 함께 표시합니다.
 */
import { MoreVertical, Pencil, Trash2, PencilLine, BadgeDollarSign } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import { convertToKrw } from '@/services/currency.service'
import type { KrwRates } from '@/services/currency.service'
import type { Expense } from '@/types/expense.types'

interface ExpenseItemProps {
  expense: Expense
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  /** 환율 정보 — 없으면 KRW 환산 표시 생략 */
  krwRates?: KrwRates
  /** 수동 환율이 적용 중인 통화 목록 — 해당 통화면 수동 아이콘 표시 */
  manualCurrencies?: Set<string>
}

export function ExpenseItem({ expense, onView, onEdit, onDelete, krwRates, manualCurrencies }: ExpenseItemProps) {
  const category = CATEGORY_CONFIG[expense.category]

  // 외화인 경우에만 KRW 환산 금액 계산 (환율 정보가 없으면 null)
  const krwAmount =
    krwRates && expense.currency !== 'KRW'
      ? convertToKrw(expense.amount, expense.currency, krwRates)
      : null

  // 건별 직접 지정 환율인지 확인 (최우선 — 다른 수동 환율과 구분)
  const isCustomRate = expense.rate_mode === 'custom'
  // 플랜 수동 환율이 적용 중인지 확인 (건별 환율이 없을 때만)
  const isPlanManualRate = !isCustomRate && !!(manualCurrencies?.has(expense.currency))

  return (
    <div
      className="flex items-center gap-3 bg-card rounded-xl p-3.5 border border-border"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* 클릭 영역: 아이콘 + 정보 + 금액 — 탭하면 상세 팝업 오픈 */}
      <div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={onView}
      >
        {/* 카테고리 아이콘 */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${category.color}15` }}
        >
          <category.Icon
            className="w-4 h-4"
            style={{ color: category.color }}
          />
        </div>

        {/* 지출 정보 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {expense.title}
          </p>
          {expense.memo && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {expense.memo}
            </p>
          )}
        </div>

        {/* 금액 + KRW 환산 */}
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-foreground">
            {expense.amount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{expense.currency}</p>
          {/* 외화일 때 KRW 환산 금액 표시 — 환율 종류에 따라 아이콘 구분 */}
          {krwAmount !== null && (
            <p className="text-xs text-primary/70 mt-0.5 flex items-center justify-end gap-0.5">
              ≈ {krwAmount.toLocaleString()}원
              {/* 건별 직접 지정 환율: 달러 배지 아이콘 */}
              {isCustomRate && (
                <BadgeDollarSign className="w-2.5 h-2.5 text-primary/60 shrink-0" aria-label="건별 직접 지정 환율" />
              )}
              {/* 플랜 수동 환율: 연필 아이콘 */}
              {isPlanManualRate && (
                <PencilLine className="w-2.5 h-2.5 text-primary/50 shrink-0" aria-label="플랜 수동 환율 적용 중" />
              )}
            </p>
          )}
        </div>
      </div>

      {/* 더보기 메뉴 — stopPropagation으로 카드 클릭 차단 */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 shrink-0 cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
              <span className="sr-only">더보기</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
              <Pencil className="w-4 h-4" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
