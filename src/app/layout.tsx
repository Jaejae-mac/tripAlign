/**
 * 앱 최상위 레이아웃
 * 모든 페이지에 공통으로 적용되는 메타데이터, 폰트, Toaster를 설정합니다.
 */
import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { PlaneLoader } from '@/components/ui/PlaneLoader'
import { ServiceWorkerInit } from '@/components/ServiceWorkerInit'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(
    (() => {
      const raw = process.env.NEXT_PUBLIC_APP_URL || 'trip-align.vercel.app'
      return raw.startsWith('http') ? raw : `https://${raw}`
    })()
  ),
  title: 'TripAlign',
  description: '여행 일정과 지출을 한 곳에서 스마트하게 정리하세요.',
  icons: { icon: '/favicon.ico', apple: '/apple-icon.png' },
  openGraph: {
    title: 'TripAlign',
    description: '여행 일정과 지출을 한 곳에서 스마트하게 정리하세요.',
    siteName: 'TripAlign',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TripAlign',
    description: '여행 일정과 지출을 한 곳에서 스마트하게 정리하세요.',
  },
  // iOS "홈화면에 추가" 시 전체화면 앱처럼 실행
  appleWebApp: {
    capable: true,
    title: 'TripAlign',
    statusBarStyle: 'default',
    // 콜드 스타트 시 검은 화면 대신 브랜드 스플래시 표시 (iOS 전용)
    startupImage: [
      // iPhone 15 Pro Max, 14 Pro Max (430pt × 932pt @3x)
      {
        url: '/splash/splash-1290x2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 15 Pro, 15, 14 Pro (393pt × 852pt @3x)
      {
        url: '/splash/splash-1179x2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 14 Plus, 13 Pro Max, 12 Pro Max (428pt × 926pt @3x)
      {
        url: '/splash/splash-1284x2778.png',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 14, 13, 12 (390pt × 844pt @3x)
      {
        url: '/splash/splash-1170x2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 11, XR (414pt × 896pt @2x)
      {
        url: '/splash/splash-1080x1920.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPhone SE 3rd gen (375pt × 667pt @2x)
      {
        url: '/splash/splash-750x1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 12.9" (1024pt × 1366pt @2x)
      {
        url: '/splash/splash-2048x2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 11" (834pt × 1194pt @2x)
      {
        url: '/splash/splash-1668x2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad 10th gen (820pt × 1180pt @2x)
      {
        url: '/splash/splash-1620x2160.png',
        media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0D9488',   // Android 상태바 색상 (브랜드 teal)
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full antialiased" style={{ backgroundColor: '#F0FDFA' }}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* 전역 토스트 알림 */}
        <Toaster position="top-center" richColors />
        {/* 전역 비행기 로딩 오버레이 — DB/서버 요청 대기 시 표시 */}
        <PlaneLoader />
        {/* 서비스 워커 등록 — 앱 셸 캐싱으로 콜드 스타트 검은 화면 방지 */}
        <ServiceWorkerInit />
      </body>
    </html>
  )
}
