'use client'

/**
 * 하루 일정 카드
 * 특정 날짜의 시간별 일정 목록을 보여주고,
 * + 버튼으로 새 일정 항목을 추가할 수 있습니다.
 * AnimatePresence로 항목 추가/삭제 시 부드러운 애니메이션을 제공합니다.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Sunrise } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScheduleItem } from './ScheduleItem'
import { ScheduleAddDrawer } from './ScheduleAddDrawer'
import { ScheduleItemDetailDialog } from './ScheduleItemDetailDialog'
import { getScheduleItemsByDate } from '@/services/schedule.service'
import { toast } from 'sonner'
import type { ScheduleItem as ScheduleItemType } from '@/types/schedule.types'

interface DayCardProps {
  planId: string
  date: Date
  dayNumber: number
}

export function DayCard({ planId, date, dayNumber }: DayCardProps) {
  const [items, setItems] = useState<ScheduleItemType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false)
  // 수정 중인 일정 항목 (null이면 추가 모드)
  const [editingItem, setEditingItem] = useState<ScheduleItemType | null>(null)
  // 상세 팝업
  const [viewingItem, setViewingItem] = useState<ScheduleItemType | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const dateStr = format(date, 'yyyy-MM-dd')

  /** 해당 날짜의 일정 목록을 서버에서 불러옵니다 */
  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getScheduleItemsByDate(planId, dateStr)
      setItems(data)
    } catch {
      toast.error('일정을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [planId, dateStr])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  /** 일정 추가/수정 완료 후 목록 갱신 */
  const handleSaved = () => {
    setEditingItem(null)
    fetchItems()
  }

  /** 셀 클릭 시 상세 팝업 열기 */
  const handleView = (item: ScheduleItemType) => {
    setViewingItem(item)
    setIsDetailOpen(true)
  }

  /** 수정 버튼 클릭 시 해당 항목으로 Drawer 열기 */
  const handleEdit = (item: ScheduleItemType) => {
    setEditingItem(item)
    setIsAddDrawerOpen(true)
  }

  /** 일정 삭제 후 로컬 상태에서 즉시 제거 */
  const handleDeleted = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  return (
    <div className="min-h-[calc(100vh-200px)] pb-20">
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          {/* Day N 뱃지 */}
          <span className="inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded-lg bg-primary/10 text-primary text-xs font-bold tracking-wide">
            D{dayNumber}
          </span>
          <div className="text-base font-semibold text-foreground">
            {format(date, 'M월 d일 EEEE', { locale: ko })}
          </div>
        </div>

        {/* 일정 추가 버튼 */}
        <Button
          onClick={() => {
            setEditingItem(null)
            setIsAddDrawerOpen(true)
          }}
          size="sm"
          className="gap-1.5 cursor-pointer"
          style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
        >
          <Plus className="w-3.5 h-3.5" />
          일정 추가
        </Button>
      </div>

      {/* 일정 목록 */}
      {isLoading ? (
        // 로딩 스켈레톤
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white animate-pulse border border-border" />
          ))}
        </div>
      ) : items.length === 0 ? (
        // 빈 상태 UI
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Sunrise className="w-7 h-7 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground">아직 일정이 없어요</p>
          <p className="text-xs text-muted-foreground mt-1">
            + 일정 추가 버튼으로 이날의 계획을 채워보세요
          </p>
        </motion.div>
      ) : (
        // 시간별 일정 항목 목록 — 추가/삭제 시 AnimatePresence로 애니메이션
        <motion.div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <ScheduleItem
                  item={item}
                  onView={() => handleView(item)}
                  onEdit={() => handleEdit(item)}
                  onDeleted={() => handleDeleted(item.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* 일정 상세 팝업 */}
      {viewingItem && (
        <ScheduleItemDetailDialog
          open={isDetailOpen}
          onOpenChange={(open) => {
            setIsDetailOpen(open)
            if (!open) setViewingItem(null)
          }}
          item={viewingItem}
          onEdit={() => handleEdit(viewingItem)}
          onDeleted={() => {
            handleDeleted(viewingItem.id)
            setIsDetailOpen(false)
            setViewingItem(null)
          }}
        />
      )}

      {/* 일정 추가/수정 Drawer */}
      <ScheduleAddDrawer
        open={isAddDrawerOpen}
        onOpenChange={(open) => {
          setIsAddDrawerOpen(open)
          if (!open) setEditingItem(null)
        }}
        planId={planId}
        date={dateStr}
        editingItem={editingItem}
        onSaved={handleSaved}
      />
    </div>
  )
}
