/**
 * Next.js App Router 특수 파일 — Web App Manifest 자동 생성
 * /manifest.webmanifest 경로로 서빙되며 <link rel="manifest"> 태그를 자동 삽입합니다.
 * Android Chrome에서 "홈화면에 추가" 시 이 설정이 사용됩니다.
 */
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TripAlign',
    short_name: 'TripAlign',
    description: '여행 일정과 지출을 한 곳에서 스마트하게 정리하세요.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0D9488',
    background_color: '#F0FDFA',
    icons: [
      {
        // App Router가 icon.tsx를 /icon.png 경로로 서빙
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
