/**
 * 페이지 콘텐츠 로딩 중 표시되는 인라인 로딩 인디케이터 (Next.js Suspense 폴백)
 *
 * 루트 layout의 {children} Suspense 경계가 RSC 스트리밍을 기다리는 동안 표시됩니다.
 * 전체화면이 아닌 콘텐츠 영역 내부에만 표시되므로, SplashScreen과 시각적으로
 * 구분되며 RSC 스트리밍이 지연돼도 화면 전체를 영구 차단하지 않습니다.
 */
export default function Loading() {
  return (
    // pointer-events: none — RSC 스트리밍 중에도 뒤쪽 요소 클릭이 통과됩니다
    <div className="flex items-center justify-center min-h-[50vh]" style={{ pointerEvents: 'none' }}>
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: '#0D9488',
              animation: `loading-dot 1.2s ease-in-out ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes loading-dot {
          0%, 100% { opacity: 0.15; transform: scale(0.85); }
          50%       { opacity: 0.9;  transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
