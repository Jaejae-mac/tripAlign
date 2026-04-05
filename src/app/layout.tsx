/**
 * 앱 최상위 레이아웃
 * 모든 페이지에 공통으로 적용되는 메타데이터, 폰트, Toaster를 설정합니다.
 */
import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'TripAlign',
  description: '여행 일정과 지출을 한 곳에서 스마트하게 정리하세요.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        {/* 전역 토스트 알림 */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
