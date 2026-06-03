'use client'

/**
 * 하루 일정 카드
 * 특정 날짜의 시간별 일정 목록을 보여주고,
 * + 버튼으로 새 일정 항목을 추가할 수 있습니다.
 * AnimatePresence로 항목 추가/삭제 시 부드러운 애니메이션을 제공합니다.
 */
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Sunrise, Map, MapPin, Search, X, Star, Phone } from 'lucide-react'
import usePlacesAutocomplete from 'use-places-autocomplete'
import { Button } from '@/components/ui/button'
import { ScheduleItem } from './ScheduleItem'
import { ScheduleAddDrawer } from './ScheduleAddDrawer'
import { ScheduleItemDetailDialog } from './ScheduleItemDetailDialog'
import { getScheduleItemsByDate } from '@/services/schedule.service'
import { useMapsLoaded } from '@/components/providers/GoogleMapsProvider'
import { toast } from 'sonner'
import type { ScheduleItem as ScheduleItemType } from '@/types/schedule.types'

/** 오늘 요일의 영업시간 텍스트 추출 */
function getTodayHours(weekdayText: string[]): string | null {
  const dayIndex = new Date().getDay()
  const googleIndex = dayIndex === 0 ? 6 : dayIndex - 1
  return weekdayText[googleIndex] ?? null
}

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
  // SSR에서는 document가 없으므로 클라이언트 마운트 후에만 portal을 렌더링
  const [mounted, setMounted] = useState(false)

  // 지도 검색/POI 클릭으로 선택된 장소 (상세정보 포함)
  const [selectedPlace, setSelectedPlace] = useState<{
    location: string; lat: number | null; lng: number | null; place_id: string | null
    isLoadingDetails?: boolean
    rating?: number | null; userRatingCount?: number | null
    address?: string | null; phone?: string | null
    isOpenNow?: boolean | null; todayHours?: string | null
    priceLevel?: number | null
  } | null>(null)

  // 현재 사용자 위치 (지도 열기 시 Geolocation API로 조회)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // 지도에서 "일정에 추가" 클릭 시 Drawer에 자동 입력할 장소
  const [prefilledPlace, setPrefilledPlace] = useState<{
    location: string; lat: number | null; lng: number | null; place_id: string | null; phone?: string | null
  } | null>(null)

  // Google Maps API 로드 여부
  const mapsLoaded = useMapsLoaded()

  // 지도 바텀시트 내 장소 검색 자동완성
  const {
    ready: mapPlacesReady,
    value: mapPlacesValue,
    setValue: setMapPlacesValue,
    suggestions: { status: mapStatus, data: mapSuggestions },
    clearSuggestions: clearMapSuggestions,
    init: initMapPlaces,
  } = usePlacesAutocomplete({
    initOnMount: false,
    requestOptions: { language: 'ko' },
    debounce: 300,
    cache: false,
  })

  const dateStr = format(date, 'yyyy-MM-dd')

  /** 해당 날짜의 일정 목록을 서버에서 불러옵니다 */
  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getScheduleItemsByDate(planId, dateStr)
      setItems(data)
    } catch (err) {
      console.error('[DayCard] 일정 목록 로드 실패:', err)
      toast.error('일정을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [planId, dateStr])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => { setMounted(true) }, [])

  // Maps API 로드 완료 시 지도 바텀시트 내 Places Autocomplete 초기화
  useEffect(() => {
    if (mapsLoaded) initMapPlaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded])

  // 지도 바텀시트가 열릴 때 현재 위치 조회
  useEffect(() => {
    if (!isMapOpen || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* 권한 거부 시 조용히 무시 */ }
    )
  }, [isMapOpen])

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

  /** 지도 위 POI 직접 클릭 시 selectedPlace 업데이트 — DayMapView에서 PlacesService 조회 후 호출 */
  const handleMapPlaceClick = useCallback((place: {
    location: string; lat: number; lng: number; place_id: string
    rating?: number | null; userRatingCount?: number | null
    address?: string | null; phone?: string | null
    isOpenNow?: boolean | null; todayHours?: string | null
    priceLevel?: number | null
  }) => {
    setSelectedPlace({ ...place, isLoadingDetails: false })
  }, [])

  /** 지도 바텀시트 닫기 + 검색 상태 초기화 */
  const handleMapClose = () => {
    setIsMapOpen(false)
    setSelectedPlace(null)
    setMapPlacesValue('', false)
    clearMapSuggestions()
  }

  /** 지도 검색에서 장소 선택 → PlacesService로 상세정보 조회 후 float 카드 표시 */
  const handleMapPlaceSelect = (placeId: string, description: string) => {
    clearMapSuggestions()
    setMapPlacesValue(description, false)
    // 즉시 로딩 상태로 float 카드 표시
    setSelectedPlace({ location: description, lat: null, lng: null, place_id: placeId, isLoadingDetails: true })
    if (typeof google === 'undefined' || !google.maps?.places) return
    const tempDiv = document.createElement('div')
    const service = new google.maps.places.PlacesService(tempDiv)
    service.getDetails(
      {
        placeId,
        fields: ['geometry', 'name', 'rating', 'user_ratings_total', 'formatted_address', 'formatted_phone_number', 'opening_hours', 'price_level'],
        language: 'ko',
      } as google.maps.places.PlaceDetailsRequest,
      (result, status) => {
        const ok = status === google.maps.places.PlacesServiceStatus.OK
        const lat = result?.geometry?.location?.lat() ?? null
        const lng = result?.geometry?.location?.lng() ?? null
        const todayHours =
          ok && result?.opening_hours?.weekday_text
            ? getTodayHours(result.opening_hours.weekday_text)
            : null
        setSelectedPlace({
          location: result?.name ?? description,
          lat,
          lng,
          place_id: placeId,
          isLoadingDetails: false,
          rating: result?.rating ?? null,
          userRatingCount: result?.user_ratings_total ?? null,
          address: result?.formatted_address ?? null,
          phone: result?.formatted_phone_number ?? null,
          isOpenNow: result?.opening_hours?.isOpen?.() ?? null,
          todayHours,
          priceLevel: result?.price_level ?? null,
        })
      }
    )
  }

  /** 지도에서 선택한 장소를 일정 추가 Drawer에 자동 입력 */
  const handleAddSelectedPlace = () => {
    if (!selectedPlace) return
    setPrefilledPlace({
      location: selectedPlace.location,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      place_id: selectedPlace.place_id,
      phone: selectedPlace.phone,
    })
    handleMapClose()
    setEditingItem(null)
    setIsAddDrawerOpen(true)
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
          {/* 지도 보기 버튼 — 항상 활성화, 바텀시트 내에서 장소 검색 가능 */}
          <Button
            onClick={() => setIsMapOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 cursor-pointer"
            title="지도를 열어 경로 확인 및 장소 검색"
          >
            <Map className="w-3.5 h-3.5" />
            지도
          </Button>

          {/* 일정 추가 버튼 */}
          <Button
            onClick={() => {
              setEditingItem(null)
              setPrefilledPlace(null)
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
          if (!open) {
            setEditingItem(null)
            setPrefilledPlace(null)
          }
        }}
        planId={planId}
        date={dateStr}
        editingItem={editingItem}
        prefilledPlace={prefilledPlace}
        onSaved={handleSaved}
      />

      {/* 지도 뷰 바텀시트 — document.body에 portal로 렌더링
          DayCardCarousel의 motion.div가 transform을 유지해 fixed 자식의 containing block을
          뷰포트 대신 자신으로 교체하기 때문에, portal로 이 컨테이너 바깥에 마운트해야 함 */}
      {mounted && createPortal(
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
                onClick={handleMapClose}
              />
              {/* 바텀시트 */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl overflow-hidden bg-background"
                style={{ height: '70vh' }}
              >
                {/* 헤더 */}
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
                    onClick={handleMapClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
                    aria-label="닫기"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 장소 검색바 — z-10으로 지도 영역 위에 드롭다운이 표시됨 */}
                <div className="relative z-10 px-4 py-2 border-b shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={mapPlacesValue}
                      onChange={(e) => {
                        setMapPlacesValue(e.target.value)
                        // 새 검색 시작 시 이전 선택 초기화
                        setSelectedPlace(null)
                      }}
                      placeholder={mapPlacesReady ? '장소 검색...' : '지도 로드 중...'}
                      disabled={!mapPlacesReady}
                      className="w-full pl-9 pr-8 h-9 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                    {mapPlacesValue && (
                      <button
                        type="button"
                        onClick={() => {
                          setMapPlacesValue('', false)
                          setSelectedPlace(null)
                          clearMapSuggestions()
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        aria-label="검색어 지우기"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 자동완성 드롭다운 */}
                  {mapStatus === 'OK' && mapSuggestions.length > 0 && (
                    <ul className="absolute left-4 right-4 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                      {mapSuggestions.map(({ place_id, description, structured_formatting }) => (
                        <li key={place_id}>
                          <button
                            type="button"
                            onClick={() => handleMapPlaceSelect(place_id, description)}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors cursor-pointer"
                          >
                            <p className="text-sm font-medium text-foreground truncate">
                              {structured_formatting.main_text}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {structured_formatting.secondary_text}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 지도 영역 + 선택 장소 float 카드 */}
                <div className="flex-1 overflow-hidden relative">
                  <DayMapView items={items} selectedPlace={selectedPlace} onPlaceClick={handleMapPlaceClick} userLocation={userLocation} />

                  {/* 선택된 장소 float 카드 — 지도 위 하단에 표시 */}
                  <AnimatePresence>
                    {selectedPlace && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-3 left-3 right-3 z-10 bg-background/95 backdrop-blur-sm rounded-xl border border-border p-3 shadow-lg"
                      >
                        {/* 장소명 */}
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            {selectedPlace.location}
                          </p>
                        </div>

                        {/* 상세정보 영역 */}
                        {selectedPlace.isLoadingDetails ? (
                          // 로딩 스켈레톤
                          <div className="mt-2 ml-6 space-y-1.5">
                            <div className="h-3.5 w-28 bg-muted rounded animate-pulse" />
                            <div className="h-3.5 w-40 bg-muted rounded animate-pulse" />
                            <div className="h-3.5 w-36 bg-muted rounded animate-pulse" />
                          </div>
                        ) : (
                          <div className="mt-1.5 ml-6 space-y-1">
                            {/* 평점 + 가격대 */}
                            {(selectedPlace.rating != null || selectedPlace.priceLevel != null) && (
                              <div className="flex items-center gap-2">
                                {selectedPlace.rating != null && (
                                  <div className="flex items-center gap-0.5">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span className="text-xs font-semibold text-foreground">
                                      {selectedPlace.rating.toFixed(1)}
                                    </span>
                                    {selectedPlace.userRatingCount != null && (
                                      <span className="text-xs text-muted-foreground ml-0.5">
                                        ({selectedPlace.userRatingCount.toLocaleString()})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {selectedPlace.priceLevel != null && selectedPlace.priceLevel > 0 && (
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {'₩'.repeat(selectedPlace.priceLevel)}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* 영업 상태 + 오늘 영업시간 */}
                            {selectedPlace.todayHours && (
                              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                {selectedPlace.isOpenNow !== null && (
                                  <span className={selectedPlace.isOpenNow
                                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                    : 'text-red-500 font-medium'
                                  }>
                                    {selectedPlace.isOpenNow ? '영업 중' : '영업 종료'}
                                  </span>
                                )}
                                <span className="text-muted-foreground">
                                  {selectedPlace.todayHours.split(': ')[1] ?? selectedPlace.todayHours}
                                </span>
                              </div>
                            )}

                            {/* 주소 */}
                            {selectedPlace.address && (
                              <p className="text-xs text-muted-foreground truncate">{selectedPlace.address}</p>
                            )}

                            {/* 전화번호 */}
                            {selectedPlace.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{selectedPlace.phone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full mt-2.5 gap-1.5 cursor-pointer"
                          style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
                          onClick={handleAddSelectedPlace}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          일정에 추가
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
