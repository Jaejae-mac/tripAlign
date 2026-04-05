'use client'

/**
 * 지출 항목 카드
 * 카테고리 아이콘, 제목, 금액, 메모를 보여주고 수정/삭제 메뉴를 제공합니다.
 * 외화 지출의 경우 당일 환율 기준 KRW 환산 금액을 함께 표시합니다.
 */
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
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
  onEdit: () => void
  onDelete: () => void
  /** 환율 정보 — 없으면 KRW 환산 표시 생략 */
  krwRates?: KrwRates
}

export function ExpenseItem({ expense, onEdit, onDelete, krwRates }: ExpenseItemProps) {
  const category = CATEGORY_CONFIG[expense.category]

  // 외화인 경우에만 KRW 환산 금액 계산 (환율 정보가 없으면 null)
  const krwAmount =
    krwRates && expense.currency !== 'KRW'
      ? convertToKrw(expense.amount, expense.currency, krwRates)
      : null

  return (
    <div
      className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-border"
      style={{ boxShadow: 'var(--shadow-sm)' }}
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
        {/* 외화일 때 KRW 환산 금액 표시 */}
        {krwAmount !== null && (
          <p className="text-xs text-primary/70 mt-0.5">
            ≈ {krwAmount.toLocaleString()}원
          </p>
        )}
      </div>

      {/* 더보기 메뉴 */}
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
  )
}
