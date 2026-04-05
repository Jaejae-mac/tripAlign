'use client'

/**
 * 시간별 일정 항목 컴포넌트
 * 시간, 카테고리 아이콘, 제목, 장소를 보여주고
 * 방문 상태(방문예정/방문완료) 토글 및 수정/삭제 메뉴를 제공합니다.
 */
import { useState } from 'react'
import { Clock, MapPin, Phone, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { deleteScheduleItem, updateScheduleItem } from '@/services/schedule.service'
import { toast } from 'sonner'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import type { ScheduleItem as ScheduleItemType, VisitStatus } from '@/types/schedule.types'

interface ScheduleItemProps {
  item: ScheduleItemType
  onEdit: () => void
  onDeleted: () => void
}

export function ScheduleItem({ item, onEdit, onDeleted }: ScheduleItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  // 서버 상태 기본값: DB에 컬럼이 없는 기존 데이터를 위해 'pending' 폴백
  const [status, setStatus] = useState<VisitStatus>(item.status ?? 'pending')

  const category = CATEGORY_CONFIG[item.category]
  const isCompleted = status === 'completed'

  /** 방문 상태를 pending ↔ completed로 즉시 토글 (optimistic update) */
  const handleToggleStatus = async () => {
    const next: VisitStatus = isCompleted ? 'pending' : 'completed'
    setStatus(next) // 먼저 UI 업데이트
    try {
      await updateScheduleItem(item.id, { status: next })
    } catch {
      setStatus(status) // 실패 시 원래 값으로 복원
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  /** 일정 항목 삭제 */
  const handleDelete = async () => {
    const confirmed = window.confirm(`"${item.title}" 일정을 삭제하시겠습니까?`)
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteScheduleItem(item.id)
      toast.success('일정이 삭제되었습니다.')
      onDeleted()
    } catch {
      toast.error('일정 삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={`
        flex gap-3 rounded-xl p-4 border transition-all duration-200
        ${isCompleted
          ? 'bg-emerald-50/60 border-emerald-100'
          : 'bg-white border-border hover:shadow-md'
        }
      `}
      style={{ boxShadow: isCompleted ? undefined : 'var(--shadow-sm)' }}
    >
      {/* 카테고리 아이콘 */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-opacity duration-200 ${isCompleted ? 'opacity-50' : ''}`}
        style={{ backgroundColor: `${category.color}15` }}
      >
        <category.Icon
          className="w-5 h-5"
          style={{ color: category.color }}
        />
      </div>

      {/* 일정 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* 제목 — 완료 시 흐리게 처리 */}
            <p className={`font-medium text-sm truncate transition-colors duration-200 ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {item.title}
            </p>

            {/* 시간 + 카테고리 레이블 */}
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {item.time.slice(0, 5)}
                {item.end_time ? ` ~ ${item.end_time.slice(0, 5)}` : ''}
              </span>
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: `${category.color}15`,
                  color: category.color,
                }}
              >
                {category.label}
              </span>
            </div>

            {/* 장소 */}
            {item.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{item.location}</span>
              </div>
            )}

            {/* 전화번호 */}
            {item.phone && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Phone className="w-3 h-3 shrink-0" />
                <span>{item.phone}</span>
              </div>
            )}

            {/* 설명 */}
            {item.description && (
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {item.description}
              </p>
            )}
          </div>

          {/* 우측: 상태 배지 + 더보기 메뉴 */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 방문 상태 토글 배지 */}
            <button
              onClick={handleToggleStatus}
              className={`
                flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium
                cursor-pointer transition-all duration-200 border
                ${isCompleted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }
              `}
              aria-label="방문 상태 변경"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-gray-400'}`}
              />
              {isCompleted ? '방문완료' : '방문예정'}
            </button>

            {/* 더보기 메뉴 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
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
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
