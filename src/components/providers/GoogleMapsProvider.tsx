'use client'

/**
 * Google Maps JS API를 앱 전체에서 한 번만 로드하는 Provider
 * useJsApiLoader를 사용해 로딩 중에도 자식 컴포넌트를 즉시 렌더링합니다.
 * (LoadScript는 로딩 완료 전까지 children을 블로킹하므로 SplashScreen 문제 발생)
 */
import { createContext, useContext } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'

// 컴포넌트 외부에 선언해야 리렌더링 시 재로드를 막을 수 있습니다
const LIBRARIES: Libraries = ['places']

// Maps JS API 로드 완료 여부를 하위 컴포넌트에서 사용할 수 있는 Context
const GoogleMapsContext = createContext(false)
export const useMapsLoaded = () => useContext(GoogleMapsContext)

interface GoogleMapsProviderProps {
  children: React.ReactNode
}

// API 키가 있을 때만 실제 로드 훅을 호출하는 내부 컴포넌트
// (훅은 조건부 호출 불가이므로 분리)
function GoogleMapsLoader({
  apiKey,
  children,
}: {
  apiKey: string
  children: React.ReactNode
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'ko',
    region: 'KR',
  })

  return (
    <GoogleMapsContext.Provider value={isLoaded}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // API 키 없으면 Maps 로드 없이 children 즉시 렌더링
  if (!apiKey) {
    return (
      <GoogleMapsContext.Provider value={false}>
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  return <GoogleMapsLoader apiKey={apiKey}>{children}</GoogleMapsLoader>
}
