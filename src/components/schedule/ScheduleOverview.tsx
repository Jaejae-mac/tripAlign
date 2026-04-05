'use client'

/**
 * 전체 일정 오버뷰 컴포넌트
 * 여행 기간의 모든 날짜와 등록된 일정 항목을 한눈에 보여줍니다.
 * 날짜 헤더를 클릭하면 해당 날짜의 일별 뷰로 이동합니다.
 */
import { motion } from 'framer-motion'
import { eachDayOfInterval, parseISO, format, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronRight, Sunrise } from 'lucide-react'
import { CATEGORY_CONFIG } from '@/lib/constants/schedule'
import type { TravelPlanClient } from '@/types/plan.types'
import type { DaySchedule, ScheduleItem } from '@/types/schedule.types'

interface ScheduleOverviewProps {
  plan: TravelPlanClient
  /** getDaySchedules()로 가져온 전체 날짜별 일정 데이터 */
  daySchedules: DaySchedule[]
  isLoading: boolean
  /** 날짜 헤더 클릭 시 해당 날짜의 일별 뷰로 이동 */
  onSelectDay: (date: Date) => void
}

export function ScheduleOverview({
  plan,
  daySchedules,
  isLoading,
  onSelectDay,
}: ScheduleOverviewProps) {
  // 여행 기간 전체 날짜 배열
  const dates = eachDayOfInterval({
    start: parseISO(plan.start_date),
    end: parseISO(plan.end_date),
  })

  // 등록된 일정이 하나라도 있는지 확인
  const hasAnyItems = daySchedules.some((d) => d.items.length > 0)

  if (isLoading) {
    return (
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card animate-pulse">
            <div className="h-12 bg-muted/60 rounded-t-xl" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 일정이 하나도 없으면 빈 상태 표시
  if (!hasAnyItems) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center justify-center py-16 text-muted-foreground"
      >
        <Sunrise className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">아직 등록된 일정이 없어요</p>
        <p className="text-xs mt-1 opacity-70">일별 보기에서 일정을 추가해보세요</p>
      </motion.div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {dates.map((date, dayIndex) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayData = daySchedules.find((d) => d.date === dateStr)
        const items = dayData?.items ?? []
        const hasItems = items.length > 0

        return (
          <motion.div
            key={dateStr}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            // 각 날짜 섹션이 0.04초 간격으로 순차적으로 등장
            transition={{ duration: 0.2, delay: dayIndex * 0.04 }}
          >
            <DaySection
              date={date}
              dayNumber={dayIndex + 1}
              items={items}
              hasItems={hasItems}
              onSelect={() => onSelectDay(date)}
            />
          </motion.div>
        )
      })}
    </div>
  )
}

/** 날짜별 섹션 카드 */
function DaySection({
  date,
  dayNumber,
  items,
  hasItems,
  onSelect,
}: {
  date: Date
  dayNumber: number
  items: ScheduleItem[]
  hasItems: boolean
  onSelect: () => void
}) {
  return (
    <div
      className={`rounded-xl border overflow-hidden transition-shadow duration-200 ${
        hasItems
          ? 'border-border bg-card shadow-sm hover:shadow-md cursor-pointer'
          : 'border-dashed border-border/60 bg-muted/20'
      }`}
      onClick={onSelect}
    >
      {/* 날짜 헤더 */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 ${
          hasItems ? 'bg-muted/30' : ''
        }`}
      >
        <div className="flex items-center gap-2.5">
          {/* Day N 배지 */}
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            D{dayNumber}
          </span>
          {/* 날짜 텍스트 */}
          <span className={`text-sm font-medium ${hasItems ? 'text-foreground' : 'text-muted-foreground'}`}>
            {format(date, 'M월 d일 (EEE)', { locale: ko })}
          </span>
          {/* 항목 수 칩 */}
          {hasItems && (
            <span className="text-[11px] text-muted-foreground">
              {items.length}개
            </span>
          )}
        </div>
        {/* 클릭 유도 아이콘 */}
        <ChevronRight
          className={`w-4 h-4 transition-colors duration-150 ${
            hasItems ? 'text-muted-foreground' : 'text-border'
          }`}
        />
      </div>

      {/* 항목 목록 또는 빈 상태 */}
      {hasItems ? (
        <ul className="divide-y divide-border/50">
          {items.map((item) => (
            <ScheduleItemRow key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <div className="px-4 py-2 text-xs text-muted-foreground/60">
          일정 없음
        </div>
      )}
    </div>
  )
}

/** 개별 일정 항목 행 */
function ScheduleItemRow({ item }: { item: ScheduleItem }) {
  const config = CATEGORY_CONFIG[item.category]

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      {/* 카테고리 색상 점 */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: config.color }}
      />
      {/* 시간 */}
      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
        {item.time.slice(0, 5)}
      </span>
      {/* 제목 */}
      <span className="text-sm text-foreground truncate flex-1">{item.title}</span>
      {/* 카테고리 레이블 */}
      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
        style={{
          backgroundColor: `${config.color}18`,
          color: config.color,
        }}
      >
        {config.label}
      </span>
    </li>
  )
}
