/**
 * Next.js App Router 특수 파일 — iOS Apple Touch 아이콘 자동 생성
 * <link rel="apple-touch-icon"> 태그를 자동 삽입합니다.
 * iOS Safari에서 "홈화면에 추가" 시 이 아이콘이 사용됩니다.
 */
import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#F0FDFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* MapPin SVG (lucide-react MapPin 경로 인라인) */}
        <svg
          width="100"
          height="100"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0D9488"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
