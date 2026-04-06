'use client'

/**
 * 전역 비행기 로딩 오버레이
 * DB/서버 요청 대기 중 화면 중앙에 "· · · ✈ · · ·" 애니메이션을 표시합니다.
 * layout.tsx에 마운트되어 useLoadingStore의 isLoading 값을 구독합니다.
 */
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Plane } from 'lucide-react'
import { useLoadingStore } from '@/store/loadingStore'

/**
 * 물결 효과로 깜빡이는 점 하나
 * delay 값으로 좌→우 wave 순서를 만들어 비행기 경로를 표현합니다.
 */
function TrailDot({ delay }: { delay: number }) {
  const prefersReduced = useReducedMotion()

  return (
    <motion.span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: 'var(--brand-primary)' }}
      animate={prefersReduced
        ? { opacity: 0.4 }
        : { opacity: [0.15, 0.9, 0.15] }
      }
      transition={{
        duration: 1.2,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  )
}

export function PlaneLoader() {
  const { isLoading, message } = useLoadingStore()
  const prefersReduced = useReducedMotion()

  return (
    <AnimatePresence>
      {isLoading && (
        /* 반투명 blur 오버레이 — z-[200]으로 모든 Dialog(z-50)보다 상위에 표시 */
        <motion.div
          key="plane-loader-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/70 backdrop-blur-md"
          aria-live="polite"
          aria-label="로딩 중"
          role="status"
        >
          {/* 글래스모피즘 카드 */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col items-center gap-5 rounded-2xl bg-white/90 px-12 py-9 shadow-lg border border-border"
          >
            {/* · · · ✈ · · · 행 */}
            <div className="flex items-center gap-3">
              {/* 왼쪽 trail 점 3개 — wave delay 0 → 0.2 */}
              <TrailDot delay={0} />
              <TrailDot delay={0.1} />
              <TrailDot delay={0.2} />

              {/* 비행기 — 위아래 bobbing으로 "비행 중" 느낌 */}
              <motion.div
                className="mx-1"
                animate={prefersReduced ? {} : { y: [0, -7, 0] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {/* -rotate-45: 비행기 아이콘을 우상향(↗) 방향으로 회전 */}
                <Plane
                  className="w-8 h-8 -rotate-45"
                  style={{ color: 'var(--brand-primary)' }}
                />
              </motion.div>

              {/* 오른쪽 leading 점 3개 — wave delay 0.3 → 0.5 */}
              <TrailDot delay={0.3} />
              <TrailDot delay={0.4} />
              <TrailDot delay={0.5} />
            </div>

            {/* 메시지 — 없으면 기본 문구 */}
            <p className="text-sm text-muted-foreground font-medium tracking-wide">
              {message || '잠시만 기다려주세요'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
