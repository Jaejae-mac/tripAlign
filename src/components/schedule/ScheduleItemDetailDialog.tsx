'use client'

/**
 * 일정 항목 상세 팝업
 * 일정 셀을 클릭하면 화면 중앙에 모든 필드를 표시합니다.
 * place_id가 있는 경우 Google Places API로 평점·영업시간을 불러와 표시합니다.
 * 방문 상태 토글, 수정, 삭제, 구글 지도 길안내 기능을 제공합니다.
 */
import { useEffect, useState } from 'react'
import { Clock, MapPin, Phone, Loader2, Star, Navigation, Footprints, ExternalLink } from 'lucide-react'
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

// Google Places Details에서 필요한 필드만 정의
interface PlaceDetails {
  rating: number | null
  userRatingCount: number | null
  isOpenNow: boolean | null
  openingHoursText: string | null
}

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
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const category = CATEGORY_CONFIG[item.category]
  const isCompleted = status === 'completed'

  // item이 바뀔 때 상태 동기화
  useEffect(() => {
    setStatus(item.status ?? 'pending')
  }, [item.status])

  // 팝업이 열릴 때 place_id가 있으면 Google Places Details 조회
  useEffect(() => {
    if (!open || !item.place_id) {
      setPlaceDetails(null)
      return
    }

    // Google Maps JS API가 로드되어 있지 않으면 스킵
    if (typeof google === 'undefined' || !google.maps?.places) return

    setIsLoadingDetails(true)

    // PlacesService는 DOM 요소가 필요하므로 임시 div 사용
    const tempDiv = document.createElement('div')
    const service = new google.maps.places.PlacesService(tempDiv)

    service.getDetails(
      {
        placeId: item.place_id,
        fields: ['rating', 'user_ratings_total', 'opening_hours'],
        language: 'ko',
      },
      (result, status) => {
        setIsLoadingDetails(false)
        if (status !== google.maps.places.PlacesServiceStatus.OK || !result) return

        setPlaceDetails({
          rating: result.rating ?? null,
          userRatingCount: result.user_ratings_total ?? null,
          isOpenNow: result.opening_hours?.isOpen?.() ?? null,
          openingHoursText:
            result.opening_hours?.weekday_text
              ? getTodayHours(result.opening_hours.weekday_text)
              : null,
        })
      }
    )
  }, [open, item.place_id])

  /** 오늘 요일의 영업시간 텍스트 추출 (예: "월요일: 09:00 ~ 22:00") */
  function getTodayHours(weekdayText: string[]): string | null {
    const dayIndex = new Date().getDay() // 0=일, 1=월, ..., 6=토
    // Google API 반환 순서: 월(0)~일(6)
    const googleIndex = dayIndex === 0 ? 6 : dayIndex - 1
    return weekdayText[googleIndex] ?? null
  }

  /** 구글 지도 길안내 URL 생성 */
  function buildMapsUrl(travelmode: 'transit' | 'walking') {
    const base = 'https://www.google.com/maps/dir/?api=1'
    if (item.lat && item.lng) {
      return `${base}&destination=${item.lat},${item.lng}&destination_place_id=${item.place_id ?? ''}&travelmode=${travelmode}`
    }
    // 좌표가 없으면 장소명으로 폴백
    return `${base}&destination=${encodeURIComponent(item.location ?? '')}&travelmode=${travelmode}`
  }

  /** 구글 지도에서 장소 열기 (길안내 아님, 장소 정보 뷰) */
  function buildPlaceUrl() {
    if (item.place_id) {
      // Maps URLs API: query_place_id로 정확한 장소를 핀포인트합니다
      // ?q=place_id:xxx 형식은 텍스트 검색으로 처리돼 "찾을 수 없음" 오류 발생
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location ?? '')}&query_place_id=${item.place_id}`
    }
    if (item.lat && item.lng) {
      return `https://www.google.com/maps?q=${item.lat},${item.lng}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location ?? '')}`
  }

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
        'inset-x-auto bottom-auto',
        'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-[calc(100%-2rem)] rounded-2xl border px-5 py-5',
        'max-h-[85vh] overflow-y-auto',
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
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-muted border-border text-muted-foreground hover:bg-muted/60'
                }
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
              {isCompleted ? '방문완료' : '방문예정'}
            </button>
          </div>

          {/* 장소 */}
          {item.location && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">장소</p>

              {/* 장소명 + 구글 지도 열기 링크 */}
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <a
                  href={buildPlaceUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {item.location}
                  <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                </a>
              </div>

              {/* 평점·영업시간 — place_id가 있을 때만 표시 */}
              {item.place_id && (
                <div className="ml-5 space-y-1.5">
                  {isLoadingDetails ? (
                    // 로딩 스켈레톤
                    <div className="space-y-1.5">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-36 bg-muted rounded animate-pulse" />
                    </div>
                  ) : placeDetails ? (
                    <>
                      {/* 평점 */}
                      {placeDetails.rating !== null && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-semibold text-foreground">
                              {placeDetails.rating.toFixed(1)}
                            </span>
                          </div>
                          {placeDetails.userRatingCount !== null && (
                            <span className="text-xs text-muted-foreground">
                              ({placeDetails.userRatingCount.toLocaleString()}개 리뷰)
                            </span>
                          )}
                        </div>
                      )}

                      {/* 오늘 영업시간 + 영업 여부 */}
                      {placeDetails.openingHoursText && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span
                            className={`font-medium ${
                              placeDetails.isOpenNow === null
                                ? 'text-muted-foreground'
                                : placeDetails.isOpenNow
                                ? 'text-emerald-600'
                                : 'text-red-500'
                            }`}
                          >
                            {placeDetails.isOpenNow === null
                              ? ''
                              : placeDetails.isOpenNow
                              ? '영업 중'
                              : '영업 종료'}
                          </span>
                          <span className="text-muted-foreground">
                            {/* "월요일: 09:00 ~ 22:00" 형태에서 시간 부분만 표시 */}
                            {placeDetails.openingHoursText.split(': ')[1] ?? placeDetails.openingHoursText}
                          </span>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}

              {/* 길안내 버튼 — 장소가 있을 때 항상 표시 */}
              <div className="flex gap-2 ml-5 mt-2">
                <a
                  href={buildMapsUrl('transit')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  대중교통
                </a>
                <a
                  href={buildMapsUrl('walking')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  도보
                </a>
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

          {/* 메모 */}
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
