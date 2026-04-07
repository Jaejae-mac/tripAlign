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
          background: '#0D9488',
          borderRadius: '20%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 260, color: 'white' }}>✈️</span>
      </div>
    ),
    { ...size }
  )
}
