'use client'

/**
 * 일정 항목 상세 팝업
 * 일정 셀을 클릭하면 화면 중앙에 모든 필드를 표시합니다.
 * 방문 상태 토글, 수정, 삭제 액션을 제공합니다.
 */
import { useEffect, useState } from 'react'
import { Clock, MapPin, Phone, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteScheduleItem, updateScheduleItem } from '@/services/schedule.service'
import { toast } from 'sonner'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import type { ScheduleItem as ScheduleItemType, VisitStatus } from '@/types/schedule.types'

interface ScheduleItemDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ScheduleItemType
  onEdit: () => void
  onDeleted: () => void
}

export function ScheduleItemDetailDialog({
  open,
  onOpenChange,
  item,
  onEdit,
  onDeleted,
}: ScheduleItemDetailDialogProps) {
  const [status, setStatus] = useState<VisitStatus>(item.status ?? 'pending')
  const [isDeleting, setIsDeleting] = useState(false)

  const category = CATEGORY_CONFIG[item.category]
  const isCompleted = status === 'completed'

  // item이 바뀔 때(카드에서 상태 토글 후 팝업 재진입) 상태 동기화
  useEffect(() => {
    setStatus(item.status ?? 'pending')
  }, [item.status])

  /** 방문 상태 낙관적 토글 */
  const handleToggleStatus = async () => {
    const next: VisitStatus = isCompleted ? 'pending' : 'completed'
    setStatus(next)
    try {
      await updateScheduleItem(item.id, { status: next })
    } catch {
      setStatus(status)
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  /** 일정 삭제 */
  const handleDelete = async () => {
    const confirmed = window.confirm(`"${item.title}" 일정을 삭제하시겠습니까?`)
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteScheduleItem(item.id)
      toast.success('일정이 삭제되었습니다.')
      onDeleted()
      onOpenChange(false)
    } catch {
      toast.error('일정 삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  /** 수정: 팝업 먼저 닫고 수정 다이얼로그 열기 */
  const handleEdit = () => {
    onOpenChange(false)
    onEdit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={[
        // 모바일: 바텀시트 override → 화면 중앙 고정
        'inset-x-auto bottom-auto',
        'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-[calc(100%-2rem)] rounded-2xl border px-5 py-5',
        'max-h-[85vh] overflow-y-auto',
        // 데스크탑: sm+ 기본값 유지 (max-w 덮어쓰기)
        'sm:max-w-md',
      ].join(' ')}>
        {/* 헤더: 아이콘 + 제목 + 시간 + 카테고리 배지 */}
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
                {item.title}
              </DialogTitle>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {item.time.slice(0, 5)}
                    {item.end_time ? ` ~ ${item.end_time.slice(0, 5)}` : ''}
                  </span>
                </div>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `${category.color}15`,
                    color: category.color,
                  }}
                >
                  {category.label}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 본문 */}
        <div className="space-y-4 py-2">
          {/* 방문 상태 토글 */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">방문 상태</span>
            <button
              onClick={handleToggleStatus}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                cursor-pointer transition-all duration-200 border
                ${isCompleted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {isCompleted ? '방문완료' : '방문예정'}
            </button>
          </div>

          {/* 장소 */}
          {item.location && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">장소</p>
              <div className="flex items-start gap-1.5 text-sm text-foreground">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span>{item.location}</span>
              </div>
            </div>
          )}

          {/* 전화번호 */}
          {item.phone && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">전화번호</p>
              <div className="flex items-center gap-1.5 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`tel:${item.phone}`}
                  className="text-primary hover:underline"
                >
                  {item.phone}
                </a>
              </div>
            </div>
          )}

          {/* 메모 (전체 표시, line-clamp 없음) */}
          {item.description && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">메모</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          )}
        </div>

        {/* 푸터: 삭제 / 수정 */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={handleDelete}
            className="flex-1 cursor-pointer text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
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
