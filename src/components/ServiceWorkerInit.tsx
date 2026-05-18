'use client'

/**
 * 서비스 워커 등록 컴포넌트
 * layout.tsx에 마운트되어 앱 실행 시 /sw.js를 등록합니다.
 * 서비스 워커가 앱 셸을 캐싱하여 이후 콜드 스타트 시 즉시 표시합니다.
 */
import { useEffect } from 'react'

export function ServiceWorkerInit() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          // 서비스 워커 등록 실패는 앱 동작에 영향 없음 (점진적 향상)
        })
    }
  }, [])

  return null
}
