/**
 * 루트 로딩 UI (Next.js Suspense 폴백)
 * 홈화면 아이콘으로 PWA를 실행하거나 클라이언트 내비게이션 중
 * 서버 데이터를 기다리는 동안 즉시 표시되는 스플래시 화면입니다.
 */
import { Plane } from 'lucide-react'

export default function Loading() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6"
      style={{ backgroundColor: '#F0FDFA' }}
    >
      {/* 앱 로고 영역 */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md"
          style={{ backgroundColor: '#0D9488' }}
        >
          <Plane className="w-8 h-8 text-white -rotate-45" />
        </div>
        <span className="text-xl font-bold" style={{ color: '#0D9488' }}>
          TripAlign
        </span>
      </div>

      {/* 도트 웨이브 애니메이션 */}
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: '#0D9488',
              animation: `pulse 1.2s ease-in-out ${i * 0.12}s infinite`,
              opacity: 0.3,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.15; transform: scale(0.85); }
          50%       { opacity: 0.9;  transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
