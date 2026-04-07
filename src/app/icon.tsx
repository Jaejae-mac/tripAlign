/**
 * Next.js App Router 특수 파일 — 앱 아이콘 자동 생성
 * /icon.png 경로로 서빙되며 <link rel="icon"> 태그를 자동 삽입합니다.
 * manifest.ts의 icons[].src와 일치해야 합니다.
 */
import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
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
        <svg width="280" height="280" viewBox="0 0 24 24">
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
