'use client'

/**
 * 메인 페이지 클라이언트 컴포넌트
 * "내 플랜" / "공유된 플랜" 탭을 제공하고, 공유 탭에 pending 초대 배지를 표시합니다.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/Header'
import { PlanList } from '@/components/plans/PlanList'
import { SharedPlanList } from '@/components/plans/SharedPlanList'
import { PlanCreateDialog } from '@/components/plans/PlanCreateDialog'
import { useSharedPlanStore } from '@/store/sharedPlanStore'
import type { User } from '@supabase/supabase-js'

// 탭 콘텐츠 전환 시 슬라이드 방향을 결정하는 variants
const tabVariants = {
  enterFromRight: { opacity: 0, x: 20 },
  enterFromLeft:  { opacity: 0, x: -20 },
  center:         { opacity: 1, x: 0 },
  exitToLeft:     { opacity: 0, x: -20 },
  exitToRight:    { opacity: 0, x: 20 },
}

interface MainPageClientProps {
  user: User
}

export function MainPageClient({ user }: MainPageClientProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my')

  // pending 초대 개수를 탭 배지에 표시하기 위해 스토어 구독
  const pendingCount = useSharedPlanStore((s) => s.pendingInvitations.length)

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {/* 탭 네비게이션 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'my' | 'shared')}
        >
          {/* 탭 헤더 — 탭 트리거와 "플랜 작성하기" 버튼을 같은 줄에 배치 */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <TabsList className="h-9">
              <TabsTrigger value="my" className="cursor-pointer px-4">
                내 플랜
              </TabsTrigger>
              <TabsTrigger value="shared" className="cursor-pointer px-4 relative">
                공유된 플랜
                {/* pending 초대가 있을 때 주황 점 배지 표시 */}
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 플랜 작성 버튼 — "내 플랜" 탭에서만 표시 */}
            <AnimatePresence>
              {activeTab === 'my' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gap-2 cursor-pointer shrink-0"
                    style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">플랜 작성하기</span>
                    <span className="sm:hidden">새 플랜</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── 내 플랜 탭 ── */}
          <TabsContent value="my" className="mt-0">
            <AnimatePresence mode="wait">
              {activeTab === 'my' && (
                <motion.div
                  key="my"
                  variants={tabVariants}
                  initial="enterFromLeft"
                  animate="center"
                  exit="exitToLeft"
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <PlanList
                    userId={user.id}
                    onCreateClick={() => setIsCreateDialogOpen(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ── 공유된 플랜 탭 ── */}
          <TabsContent value="shared" className="mt-0">
            <AnimatePresence mode="wait">
              {activeTab === 'shared' && (
                <motion.div
                  key="shared"
                  variants={tabVariants}
                  initial="enterFromRight"
                  animate="center"
                  exit="exitToRight"
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <SharedPlanList />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </main>

      {/* 플랜 생성 다이얼로그 */}
      <PlanCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}
