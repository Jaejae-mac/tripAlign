'use client'

/**
 * 하루 일정 경로 지도 뷰
 * lat/lng가 있는 일정 항목들을 번호 마커로 표시하고
 * 마커 클릭 시 일정 제목과 시간을 InfoWindow로 팝업합니다.
 */
import { useState, useCallback } from 'react'
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { MapPin, Loader2 } from 'lucide-react'
import { useMapsLoaded } from '@/components/providers/GoogleMapsProvider'
import type { ScheduleItem } from '@/types/schedule.types'

interface DayMapViewProps {
  items: ScheduleItem[]
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }

// 지도 기본 옵션 — 불필요한 UI 최소화
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
}

export function DayMapView({ items }: DayMapViewProps) {
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

  // 지도 중심: 첫 번째 항목 기준, 없으면 서울 기본값
  const center =
    mappableItems.length > 0
      ? { lat: mappableItems[0].lat, lng: mappableItems[0].lng }
      : { lat: 37.5665, lng: 126.978 }

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    // 2개 이상의 마커가 있으면 전체가 보이도록 자동 범위 조정
    if (mappableItems.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      mappableItems.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }))
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 40, left: 40 })
    }
  }, [mappableItems])

  if (mappableItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10 gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <MapPin className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">지도에 표시할 장소가 없어요</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          일정 추가 시 장소를 Google Places로 검색하면
          <br />지도에 경로가 표시됩니다
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
    >
      {mappableItems.map((item, index) => (
        <Marker
          key={item.id}
          position={{ lat: item.lat, lng: item.lng }}
          label={{
            text: String(index + 1),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px',
          }}
          // 방문완료 항목은 흐리게 표시
          opacity={item.status === 'completed' ? 0.5 : 1}
          onClick={() => setActiveIndex(index)}
        >
          {/* 마커 클릭 시 일정 정보 InfoWindow */}
          {activeIndex === index && (
            <InfoWindow
              position={{ lat: item.lat, lng: item.lng }}
              onCloseClick={() => setActiveIndex(null)}
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
    </GoogleMap>
  )
}
