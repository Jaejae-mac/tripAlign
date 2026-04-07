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
          background: '#0D9488',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 90, color: 'white' }}>✈️</span>
      </div>
    ),
    { ...size }
  )
}
