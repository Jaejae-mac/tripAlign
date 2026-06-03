'use client'

/**
 * 하루 일정 경로 지도 뷰
 * lat/lng가 있는 일정 항목들을 번호 마커로 표시하고
 * 마커 클릭 시 일정 제목과 시간을 InfoWindow로 팝업합니다.
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { MapPin, Loader2 } from 'lucide-react'
import { useMapsLoaded } from '@/components/providers/GoogleMapsProvider'
import type { ScheduleItem } from '@/types/schedule.types'
import { createCategoryMarkerIcon } from '@/lib/utils/mapMarkers'

/** 오늘 요일의 영업시간 텍스트 추출 */
function getTodayHours(weekdayText: string[]): string | null {
  const dayIndex = new Date().getDay()
  const googleIndex = dayIndex === 0 ? 6 : dayIndex - 1
  return weekdayText[googleIndex] ?? null
}

interface DayMapViewProps {
  items: ScheduleItem[]
  /** 지도 검색에서 선택된 장소 — 파란색 마커로 별도 표시 */
  selectedPlace?: { lat: number | null; lng: number | null; location: string; place_id: string | null } | null
  /** 지도 위 POI 클릭 시 장소 상세정보를 부모에게 전달 */
  onPlaceClick?: (place: {
    location: string; lat: number; lng: number; place_id: string
    rating?: number | null; userRatingCount?: number | null
    address?: string | null; phone?: string | null
    isOpenNow?: boolean | null; todayHours?: string | null
    priceLevel?: number | null
  }) => void
  /** 지도 열기 시 현재 사용자 위치 — 기존 일정 없을 때 지도를 이 위치로 이동 */
  userLocation?: { lat: number; lng: number } | null
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

// 지도 기본 옵션 — 불필요한 UI 최소화
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: true,
}

export function DayMapView({ items, selectedPlace, onPlaceClick, userLocation }: DayMapViewProps) {
  const mapsLoaded = useMapsLoaded()

  // Maps JS API 로드 전 로딩 표시
  if (!mapsLoaded) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">지도 불러오는 중...</span>
      </div>
    )
  }

  // lat/lng가 있는 항목만 지도에 표시
  const mappableItems = items.filter(
    (item): item is ScheduleItem & { lat: number; lng: number } =>
      item.lat !== null && item.lng !== null
  )

  // 클릭한 마커의 인덱스 (InfoWindow 표시용)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  // panTo 호출을 위해 map 인스턴스를 ref로 보관
  const mapRef = useRef<google.maps.Map | null>(null)

  // 지도 초기 중심 — 좌표 원시값을 deps로 써서 객체 참조를 안정적으로 유지
  // center prop이 리렌더마다 새 객체로 생성되면 @react-google-maps/api가
  // map.setCenter()를 재호출해 panTo 결과를 덮어쓰는 버그가 발생하므로 useMemo 필수
  const firstLat = mappableItems[0]?.lat ?? selectedPlace?.lat ?? userLocation?.lat ?? null
  const firstLng = mappableItems[0]?.lng ?? selectedPlace?.lng ?? userLocation?.lng ?? null
  const center = useMemo(
    () =>
      firstLat !== null && firstLng !== null
        ? { lat: firstLat, lng: firstLng }
        : { lat: 37.5665, lng: 126.978 },
    [firstLat, firstLng]
  )

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    // 기존 일정 마커 + 검색 선택 마커를 합산해 전체가 보이도록 범위 조정
    const validSelectedCoord =
      selectedPlace?.lat != null && selectedPlace?.lng != null
        ? { lat: selectedPlace.lat as number, lng: selectedPlace.lng as number }
        : null
    const allCoords = [
      ...mappableItems.map((item) => ({ lat: item.lat, lng: item.lng })),
      ...(validSelectedCoord ? [validSelectedCoord] : []),
    ]
    if (allCoords.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      allCoords.forEach((coord) => bounds.extend(coord))
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 })
    }
  }, [mappableItems, selectedPlace])

  // selectedPlace가 변경되면 지도를 해당 위치로 이동
  useEffect(() => {
    if (selectedPlace?.lat != null && selectedPlace?.lng != null && mapRef.current) {
      mapRef.current.panTo({ lat: selectedPlace.lat as number, lng: selectedPlace.lng as number })
    }
  }, [selectedPlace])

  // 현재 위치가 설정되고 기존 일정 마커가 없을 때만 현재 위치로 이동
  useEffect(() => {
    if (userLocation && mapRef.current && mappableItems.length === 0) {
      mapRef.current.panTo(userLocation)
    }
  }, [userLocation, mappableItems.length])

  /** 마커 클릭 시 해당 핀을 지도 중앙으로 이동 후 InfoWindow 표시 */
  const handleMarkerClick = useCallback((index: number, lat: number, lng: number) => {
    setActiveIndex(index)
    mapRef.current?.panTo({ lat, lng })
  }, [])

  /** 지도 위 POI 클릭 — 구글 기본 팝업을 억제하고 장소 상세정보를 조회해 부모에 전달 */
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    const iconEvent = event as google.maps.IconMouseEvent
    if (!iconEvent.placeId || !event.latLng || !onPlaceClick) return
    event.stop()
    const lat = event.latLng.lat()
    const lng = event.latLng.lng()
    const placeId = iconEvent.placeId
    const tempDiv = document.createElement('div')
    const service = new google.maps.places.PlacesService(tempDiv)
    service.getDetails(
      {
        placeId,
        fields: ['name', 'rating', 'user_ratings_total', 'formatted_address', 'formatted_phone_number', 'opening_hours', 'price_level'],
        language: 'ko',
      } as google.maps.places.PlaceDetailsRequest,
      (result, status) => {
        const ok = status === google.maps.places.PlacesServiceStatus.OK
        const name = ok && result?.name ? result.name : placeId
        const todayHours =
          ok && result?.opening_hours?.weekday_text
            ? getTodayHours(result.opening_hours.weekday_text)
            : null
        onPlaceClick({
          location: name,
          lat,
          lng,
          place_id: placeId,
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
  }, [onPlaceClick])

  // 기존 일정도 없고 검색 선택된 장소도 없을 때만 빈 상태 표시
  if (mappableItems.length === 0 && !selectedPlace && !userLocation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10 gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <MapPin className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">장소를 검색해보세요</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          위 검색바에서 장소를 찾아 일정에 추가하거나,
          <br />일정 추가 시 Google Places로 선택하면 지도에 표시됩니다
        </p>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={14}
      options={MAP_OPTIONS}
      onLoad={handleMapLoad}
      onClick={handleMapClick}
    >
      {mappableItems.map((item, index) => (
        <Marker
          key={item.id}
          position={{ lat: item.lat, lng: item.lng }}
          icon={createCategoryMarkerIcon(item.category, index)}
          // 방문완료 항목은 흐리게 표시
          opacity={item.status === 'completed' ? 0.5 : 1}
          onClick={() => handleMarkerClick(index, item.lat, item.lng)}
        >
          {/* 마커 클릭 시 일정 정보 InfoWindow — disableAutoPan으로 지도 자동이동 방지 */}
          {activeIndex === index && (
            <InfoWindow
              position={{ lat: item.lat, lng: item.lng }}
              onCloseClick={() => setActiveIndex(null)}
              options={{ disableAutoPan: true }}
            >
              <div className="px-1 py-0.5 min-w-[120px]">
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.time.slice(0, 5)}</p>
                {item.location && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                    {item.location}
                  </p>
                )}
              </div>
            </InfoWindow>
          )}
        </Marker>
      ))}

      {/* 검색에서 선택된 장소 마커 — 파란색 원으로 기존 마커와 구분 */}
      {selectedPlace?.lat != null && selectedPlace?.lng != null && (
        <Marker
          position={{ lat: selectedPlace.lat as number, lng: selectedPlace.lng as number }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
          }}
        />
      )}

      {/* 현재 위치 마커 — 진한 파란 점으로 표시 */}
      {userLocation && (
        <Marker
          position={userLocation}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#2563eb',
            fillOpacity: 0.85,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }}
        />
      )}
    </GoogleMap>
  )
}
