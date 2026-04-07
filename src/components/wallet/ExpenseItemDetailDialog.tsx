'use client'

/**
 * 지출 항목 상세 팝업
 * 지출 셀을 클릭하면 화면 중앙에 모든 필드를 표시합니다.
 * 수정, 삭제 액션을 제공합니다.
 */
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import { convertToKrw } from '@/services/currency.service'
import type { KrwRates } from '@/services/currency.service'
import type { Expense } from '@/types/expense.types'

interface ExpenseItemDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense
  krwRates?: KrwRates
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseItemDetailDialog({
  open,
  onOpenChange,
  expense,
  krwRates,
  onEdit,
  onDelete,
}: ExpenseItemDetailDialogProps) {
  const category = CATEGORY_CONFIG[expense.category]

  const krwAmount =
    krwRates && expense.currency !== 'KRW'
      ? convertToKrw(expense.amount, expense.currency, krwRates)
      : null

  /** 수정: 팝업 먼저 닫고 수정 다이얼로그 열기 */
  const handleEdit = () => {
    onOpenChange(false)
    onEdit()
  }

  /** 삭제: 팝업 닫고 부모의 handleDelete에 위임 */
  const handleDelete = () => {
    onOpenChange(false)
    onDelete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={[
        // 모바일: 바텀시트 override → 화면 중앙 고정
        'inset-x-auto bottom-auto',
        'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-[calc(100%-2rem)] rounded-2xl border px-5 py-5',
        'max-h-[85vh] overflow-y-auto',
        // 데스크탑: sm+ 기본값 유지
        'sm:max-w-md',
      ].join(' ')}>
        {/* 헤더: 아이콘 + 제목 + 카테고리 배지 */}
        <DialogHeader className="pb-2 text-left">
          <div className="flex gap-3 items-start">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `${category.color}15` }}
            >
              <category.Icon className="w-5 h-5" style={{ color: category.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold leading-snug">
                {expense.title}
              </DialogTitle>
              <span
                className="inline-block mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: `${category.color}15`,
                  color: category.color,
                }}
              >
                {category.label}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* 본문 */}
        <div className="space-y-4 py-2">
          {/* 금액 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">금액</p>
            <p className="text-2xl font-bold text-foreground">
              {expense.amount.toLocaleString()}
              <span className="text-base font-medium text-muted-foreground ml-1">
                {expense.currency}
              </span>
            </p>
            {krwAmount !== null && (
              <p className="text-sm text-primary/70">
                ≈ {krwAmount.toLocaleString()}원
              </p>
            )}
          </div>

          {/* 날짜 */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">날짜</p>
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>
                {format(parseISO(expense.date), 'M월 d일 (EEE)', { locale: ko })}
              </span>
            </div>
          </div>

          {/* 메모 (전체 표시) */}
          {expense.memo && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">메모</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {expense.memo}
              </p>
            </div>
          )}
        </div>

        {/* 푸터: 삭제 / 수정 */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            className="flex-1 cursor-pointer text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            삭제
          </Button>
          <Button
            type="button"
            onClick={handleEdit}
            className="flex-1 cursor-pointer"
            style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
          >
            수정
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
