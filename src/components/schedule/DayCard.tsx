'use client'

/**
 * 하루 일정 카드
 * 특정 날짜의 시간별 일정 목록을 보여주고,
 * + 버튼으로 새 일정 항목을 추가할 수 있습니다.
 * AnimatePresence로 항목 추가/삭제 시 부드러운 애니메이션을 제공합니다.
 */
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Sunrise, Map, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScheduleItem } from './ScheduleItem'
import { ScheduleAddDrawer } from './ScheduleAddDrawer'
import { ScheduleItemDetailDialog } from './ScheduleItemDetailDialog'
import { getScheduleItemsByDate } from '@/services/schedule.service'
import { toast } from 'sonner'
import type { ScheduleItem as ScheduleItemType } from '@/types/schedule.types'

// GoogleMap은 브라우저 전용 → SSR 비활성화
const DayMapView = dynamic(
  () => import('./DayMapView').then((m) => m.DayMapView),
  { ssr: false, loading: () => <div className="flex-1 bg-muted animate-pulse" /> }
)

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
  // 지도 뷰 바텀시트
  const [isMapOpen, setIsMapOpen] = useState(false)

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

        <div className="flex items-center gap-2">
          {/* 지도 보기 버튼 — 좌표가 있는 항목이 1개 이상일 때만 활성화 */}
          <Button
            onClick={() => setIsMapOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 cursor-pointer"
            disabled={!items.some((i) => i.lat !== null && i.lng !== null)}
            title="일정 경로 지도 보기"
          >
            <Map className="w-3.5 h-3.5" />
            지도
          </Button>

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
      </div>

      {/* 일정 목록 */}
      {isLoading ? (
        // 로딩 스켈레톤
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-card animate-pulse border border-border" />
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

      {/* 지도 뷰 바텀시트 — 화면 하단에서 슬라이드 업 */}
      <AnimatePresence>
        {isMapOpen && (
          <>
            {/* 딤 배경 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMapOpen(false)}
            />
            {/* 바텀시트 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl overflow-hidden bg-background"
              style={{ height: '65vh' }}
            >
              {/* 핸들 + 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">
                    {format(date, 'M월 d일', { locale: ko })} 일정 경로
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({items.filter((i) => i.lat !== null).length}개 장소)
                  </span>
                </div>
                <button
                  onClick={() => setIsMapOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 지도 영역 */}
              <div className="flex-1 overflow-hidden">
                <DayMapView items={items} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
