'use client'

/**
 * 날짜별 일정 스와이프 캐러셀
 * 탭 첫 진입 시 전체 일정 오버뷰를 보여주고, 일별 보기로 전환할 수 있습니다.
 * 상단 달력 아이콘을 눌러 원하는 날짜로 바로 이동할 수 있습니다.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { eachDayOfInterval, parseISO, format, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarIcon, ChevronLeft, ChevronRight, LayoutList, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { DayCard } from './DayCard'
import { ScheduleOverview } from './ScheduleOverview'
import { getDaySchedules } from '@/services/schedule.service'
import type { TravelPlanClient } from '@/types/plan.types'
import type { DaySchedule } from '@/types/schedule.types'

interface DayCardCarouselProps {
  plan: TravelPlanClient
}

export function DayCardCarousel({ plan }: DayCardCarouselProps) {
  // 여행 기간의 모든 날짜 배열 생성
  const dates = eachDayOfInterval({
    start: parseISO(plan.start_date),
    end: parseISO(plan.end_date),
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // 뷰 모드 — 탭 첫 진입 시 전체 오버뷰 화면부터 표시
  const [viewMode, setViewMode] = useState<'overview' | 'day'>('overview')

  /**
   * 오버뷰 → 일별 뷰 전환 시 이동할 인덱스를 임시 저장
   * emblaApi는 캐러셀이 마운트된 후에야 초기화되므로,
   * 클로저 대신 ref로 보관해 emblaApi 초기화 시점에 읽어야 함
   */
  const pendingScrollRef = useRef<number | null>(null)

  // 전체 일정 데이터 — 오버뷰 화면에서 사용
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([])
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)

  // embla carousel 초기화 — 터치 스와이프 자동 활성화
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
  })

  // 컴포넌트 마운트 시 전체 일정 데이터를 한 번만 로드
  useEffect(() => {
    getDaySchedules(plan.id)
      .then(setDaySchedules)
      .catch(() => {})
      .finally(() => setIsOverviewLoading(false))
  }, [plan.id])

  /** 슬라이드 변경 시 현재 인덱스 동기화 */
  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCurrentIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  /**
   * emblaApi가 초기화(캐러셀 마운트)될 때 대기 중인 인덱스로 스크롤
   * 오버뷰 → 일별 뷰 전환 시 emblaApi는 null이므로 직접 호출 불가.
   * pendingScrollRef에 목표 인덱스를 저장해두면 이 effect가 처리함.
   */
  useEffect(() => {
    if (!emblaApi || pendingScrollRef.current === null) return
    emblaApi.scrollTo(pendingScrollRef.current, true) // true = 애니메이션 없이 즉시 이동
    pendingScrollRef.current = null
  }, [emblaApi])

  /**
   * 특정 날짜로 이동 — 오버뷰에서 날짜 클릭 or 달력 팝오버에서 선택 시 사용
   * 오버뷰 모드일 때 emblaApi === null이므로 ref에 인덱스를 저장하고
   * 캐러셀이 마운트된 후 위 useEffect가 실행해줌
   */
  const goToDay = useCallback(
    (date: Date) => {
      const index = dates.findIndex((d) => isSameDay(d, date))
      if (index < 0) return
      pendingScrollRef.current = index  // 목표 인덱스를 ref에 저장
      setCurrentIndex(index)
      setViewMode('day')
      setIsCalendarOpen(false)
    },
    [dates]  // emblaApi 의존성 제거 — ref 사용으로 클로저 캡처 불필요
  )

  /** 오버뷰 → Day 1부터 일별 보기로 전환 */
  const goToDayView = useCallback(() => {
    setViewMode('day')
  }, [])

  /** 이전/다음 날짜로 이동 */
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const currentDate = dates[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === dates.length - 1

  return (
    <div className="flex flex-col">
      {/* 상단 네비게이션 바 — 뷰 모드에 따라 다른 내용 표시 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white sticky top-14 z-30">
        <AnimatePresence mode="wait">
          {viewMode === 'overview' ? (
            // 오버뷰 모드: 전체 일정 제목 + 일별 보기 버튼
            <motion.div
              key="overview-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between w-full"
            >
              <span className="text-sm font-semibold text-foreground">
                전체 일정
              </span>
              <button
                onClick={goToDayView}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                일별 보기
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : (
            // 일별 모드: 전체 보기 버튼 + 기존 날짜 네비게이션
            <motion.div
              key="day-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between w-full"
            >
              {/* 전체 보기로 돌아가기 버튼 */}
              <button
                onClick={() => setViewMode('overview')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-16"
                aria-label="전체 일정 보기"
              >
                <LayoutList className="w-3.5 h-3.5" />
                전체
              </button>

              {/* 현재 날짜 표시 + 달력 팝오버 */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors duration-150 cursor-pointer">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">
                      {format(currentDate, 'M월 d일 (EEE)', { locale: ko })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {currentIndex + 1}/{dates.length}일
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => date && goToDay(date)}
                    disabled={(date) =>
                      date < parseISO(plan.start_date) ||
                      date > parseISO(plan.end_date)
                    }
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>

              {/* 이전/다음 버튼 자리 맞춤 (오른쪽 균형용) */}
              <div className="flex gap-0.5 w-16 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={scrollPrev}
                  disabled={isFirst}
                  className="w-8 h-8 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={scrollNext}
                  disabled={isLast}
                  className="w-8 h-8 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 뷰 모드에 따른 콘텐츠 렌더링 */}
      <AnimatePresence mode="wait">
        {viewMode === 'overview' ? (
          // 전체 일정 오버뷰
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <ScheduleOverview
              plan={plan}
              daySchedules={daySchedules}
              isLoading={isOverviewLoading}
              onSelectDay={goToDay}
            />
          </motion.div>
        ) : (
          // 일별 캐러셀 뷰
          <motion.div
            key="day-carousel"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {/* 날짜 인디케이터
                7일 이하: 모든 도트 표시
                8일 이상: 현재 위치 중심 슬라이딩 윈도우로 5개만 표시 */}
            <div className="flex justify-center items-center gap-1.5 py-2 bg-white">
              {dates.length <= 7 ? (
                dates.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className="transition-all duration-200 rounded-full cursor-pointer"
                    style={{
                      width: i === currentIndex ? '20px' : '6px',
                      height: '6px',
                      backgroundColor:
                        i === currentIndex ? 'var(--brand-primary)' : 'var(--border)',
                    }}
                  />
                ))
              ) : (
                <>
                  {currentIndex > 2 && (
                    <span className="text-xs text-muted-foreground leading-none">···</span>
                  )}
                  {dates
                    .map((_, i) => i)
                    .filter(
                      (i) =>
                        i >= Math.max(0, currentIndex - 2) &&
                        i <= Math.min(dates.length - 1, currentIndex + 2)
                    )
                    .map((i) => (
                      <button
                        key={i}
                        onClick={() => emblaApi?.scrollTo(i)}
                        className="transition-all duration-200 rounded-full cursor-pointer"
                        style={{
                          width: i === currentIndex ? '20px' : '6px',
                          height: '6px',
                          backgroundColor:
                            i === currentIndex
                              ? 'var(--brand-primary)'
                              : 'var(--border)',
                        }}
                      />
                    ))}
                  {currentIndex < dates.length - 3 && (
                    <span className="text-xs text-muted-foreground leading-none">···</span>
                  )}
                </>
              )}
            </div>

            {/* embla carousel 뷰포트 */}
            <div className="embla" ref={emblaRef}>
              <div className="embla__container">
                {dates.map((date, index) => (
                  <div key={date.toISOString()} className="embla__slide">
                    {/* 현재 날짜 ±1 범위만 렌더링해 성능 최적화 */}
                    {Math.abs(index - currentIndex) <= 1 ? (
                      <DayCard
                        planId={plan.id}
                        date={date}
                        dayNumber={index + 1}
                      />
                    ) : (
                      <div className="h-96" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
