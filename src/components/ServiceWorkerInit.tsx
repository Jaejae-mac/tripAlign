'use client'

/**
 * 서비스 워커 등록 컴포넌트
 * layout.tsx에 마운트되어 앱 실행 시 /sw.js를 등록합니다.
 * 서비스 워커가 앱 셸을 캐싱하여 이후 콜드 스타트 시 즉시 표시합니다.
 */
import { useEffect } from 'react'

export function ServiceWorkerInit() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV === 'development') {
      // 개발환경: 기존 SW를 모두 해제합니다.
      // 개발 중 JS 파일은 content hash 없이 동일한 이름으로 재빌드되므로,
      // SW가 구버전 JS를 캐시해 핫 리로드 반영이 안 되는 문제를 방지합니다.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()))
      return
    }

    // 프로덕션에서만 SW 등록 (콜드 스타트 캐싱 활성화)
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [])

  return null
}
