import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'TripAlign — 여행 일정과 지출을 한 곳에서'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const fontData = await readFile(
    join(process.cwd(), 'public/fonts/NotoSansKR-Bold.ttf')
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0D9488 0%, #065F55 100%)',
          fontFamily: '"Noto Sans KR"',
          padding: '64px',
        }}
      >
        {/* 아이콘 배지 */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          {/* MapPin SVG */}
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              fill="white"
            />
          </svg>
        </div>

        {/* 서비스명 */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-3px',
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          TripAlign
        </div>

        {/* 태그라인 */}
        <div
          style={{
            fontSize: 34,
            color: 'rgba(255,255,255,0.80)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          여행 일정과 지출을 한 곳에서 스마트하게
        </div>

        {/* 구분선 + URL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 48,
          }}
        >
          <div style={{ width: 40, height: 2, background: 'rgba(255,255,255,0.35)' }} />
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.55)' }}>
            trip-align.vercel.app
          </div>
          <div style={{ width: 40, height: 2, background: 'rgba(255,255,255,0.35)' }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Noto Sans KR',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  )
}
