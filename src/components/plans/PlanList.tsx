'use client'

/**
 * 플랜 목록 컴포넌트
 * 플랜 카드들을 그리드로 나열하고, 없을 때는 빈 상태 UI를 보여줍니다.
 * Framer Motion으로 카드가 순차적으로 등장하는 stagger 애니메이션을 적용합니다.
 */
import { useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Plus, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanCard } from './PlanCard'
import { usePlanStore } from '@/store/planStore'

// 카드 목록 컨테이너 — 자식 카드가 순차적으로 등장하도록 stagger 설정
const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

// 개별 카드 등장 애니메이션 — 아래에서 위로 페이드인
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

interface PlanListProps {
  onCreateClick: () => void
  /** 현재 로그인 유저 ID — 각 플랜 카드에서 오너 여부를 판별할 때 사용 */
  userId: string
}

export function PlanList({ onCreateClick, userId }: PlanListProps) {
  const { plans, isLoading, fetchPlans } = usePlanStore()

  // 화면에 처음 나타날 때 플랜 목록을 불러옵니다
  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  // 로딩 중 스켈레톤 UI
  if (isLoading && plans.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-xl bg-white/60 animate-pulse border border-border"
          />
        ))}
      </div>
    )
  }

  // 플랜이 없을 때 빈 상태 UI
  if (plans.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MapPin className="w-9 h-9 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          아직 여행 플랜이 없어요
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          첫 번째 여행 플랜을 만들고<br />일정과 지출을 함께 관리해보세요!
        </p>
        <Button
          onClick={onCreateClick}
          className="gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          플랜 만들기
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <AnimatePresence mode="popLayout">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            variants={cardVariants}
            exit="exit"
            layout
            whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
          >
            <PlanCard plan={plan} isOwner={plan.user_id === userId} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
