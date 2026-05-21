'use client'

import { useState, useEffect } from 'react'
import { Plane } from 'lucide-react'

/**
 * 앱 초기 로드 스플래시 화면
 *
 * SSR로 서버에서 렌더링되어 초기 HTML에 포함되므로,
 * JS가 로드되기 전에도 검은 화면 없이 브랜드 화면을 보여줍니다.
 * React 하이드레이션이 완료되면 자동으로 페이드 아웃합니다.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // 하이드레이션 완료 직후 페이드 아웃 시작
    setVisible(false)
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        backgroundColor: '#F0FDFA',
        transition: 'opacity 0.5s ease, visibility 0.5s ease',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 앱 로고 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: '#0D9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(13,148,136,0.35)',
          }}
        >
          <Plane style={{ width: 32, height: 32, color: 'white', transform: 'rotate(-45deg)' }} />
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0D9488', letterSpacing: '-0.01em' }}>
          TripAlign
        </span>
      </div>

      {/* 도트 웨이브 애니메이션 — CSS 애니메이션이라 JS 없이도 동작 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#0D9488',
              animation: `splash-dot 1.2s ease-in-out ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes splash-dot {
          0%, 100% { opacity: 0.15; transform: scale(0.85); }
          50%       { opacity: 0.9;  transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
