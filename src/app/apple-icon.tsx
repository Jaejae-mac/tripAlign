/**
 * Next.js App Router 특수 파일 — iOS Apple Touch 아이콘 자동 생성
 * <link rel="apple-touch-icon"> 태그를 자동 삽입합니다.
 * iOS Safari에서 "홈화면에 추가" 시 이 아이콘이 사용됩니다.
 *
 * 주의: Satori(ImageResponse 렌더러)는 SVG stroke를 지원하지 않으므로
 * fill 기반으로 렌더링해야 합니다.
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
          background: '#0D9488',   // 브랜드 primary teal — 고대비 배경
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* MapPin: fill 기반 (Satori는 stroke 미지원) */}
        <svg width="110" height="110" viewBox="0 0 24 24">
          {/* 핀 외곽 — 흰색 fill */}
          <path
            d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"
            fill="white"
          />
          {/* 핀 구멍 — 배경색과 동일하게 채워서 구멍 효과 */}
          <circle cx="12" cy="10" r="3" fill="#0D9488" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
