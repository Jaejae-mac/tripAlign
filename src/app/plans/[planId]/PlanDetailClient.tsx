'use client'

/**
 * 플랜 상세 클라이언트 컴포넌트
 * 상단에 플랜 정보와 탭 네비게이션(일정 / 가계부)을 보여주고,
 * 선택된 탭에 따라 DayCardCarousel 또는 ExpenseView를 렌더링합니다.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ArrowLeft, MapPin, Calendar, Wallet, Pencil, PackageCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/Header'
import { DayCardCarousel } from '@/components/schedule/DayCardCarousel'
import { ExpenseView } from '@/components/wallet/ExpenseView'
import { ChecklistView } from '@/components/checklist/ChecklistView'
import { PlanEditDialog } from '@/components/plans/PlanEditDialog'
import type { TravelPlanClient } from '@/types/plan.types'
import type { User } from '@supabase/supabase-js'

interface PlanDetailClientProps {
  /** user_id는 서버에서만 사용하므로 클라이언트 props에서 제외 */
  plan: TravelPlanClient
  user: User
  /** 현재 로그인 유저가 플랜 오너인지 여부 — 오너만 수정 버튼을 볼 수 있습니다 */
  isOwner: boolean
}

export function PlanDetailClient({ plan: initialPlan, user, isOwner }: PlanDetailClientProps) {
  const router = useRouter()
  // 수정 후 즉시 UI에 반영되도록 로컬 상태로 관리 (user_id 제외)
  const [plan, setPlan] = useState<TravelPlanClient>(initialPlan)
  const [activeTab, setActiveTab] = useState<'schedule' | 'wallet' | 'checklist'>('schedule')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const startDate = parseISO(plan.start_date)
  const endDate = parseISO(plan.end_date)
  const totalDays = differenceInDays(endDate, startDate) + 1

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4">
        {/* 플랜 헤더 — 페이지 진입 시 아래에서 위로 페이드인 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pt-4 pb-2"
        >
          {/* 뒤로가기 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </Button>

          {/* 플랜 제목 & 수정 버튼 */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground leading-tight">
              {plan.title}
            </h1>
            {/* 오너만 수정 버튼 표시 */}
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditDialogOpen(true)}
                className="w-8 h-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                <span className="sr-only">플랜 수정</span>
              </Button>
            )}
          </div>

          {/* 플랜 정보 */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {plan.destination}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(startDate, 'yyyy.MM.dd', { locale: ko })} ~{' '}
              {format(endDate, 'yyyy.MM.dd', { locale: ko })}
            </span>
            <span className="text-primary font-medium">{totalDays}일</span>
          </div>
        </motion.div>

        {/* 탭 네비게이션 */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'schedule' | 'wallet' | 'checklist')}
          className="flex-1"
        >
          <div className="pt-3">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="schedule" className="gap-2 cursor-pointer">
                <Calendar className="w-4 h-4" />
                일정
              </TabsTrigger>
              <TabsTrigger value="wallet" className="gap-2 cursor-pointer">
                <Wallet className="w-4 h-4" />
                가계부
              </TabsTrigger>
              <TabsTrigger value="checklist" className="gap-2 cursor-pointer">
                <PackageCheck className="w-4 h-4" />
                준비물
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 탭 콘텐츠 — AnimatePresence로 탭 전환 페이드 애니메이션 */}
          <AnimatePresence mode="wait">
            {activeTab === 'schedule' && (
              <TabsContent key="schedule" value="schedule" className="mt-0" forceMount>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DayCardCarousel plan={plan} />
                </motion.div>
              </TabsContent>
            )}
            {activeTab === 'wallet' && (
              <TabsContent key="wallet" value="wallet" className="mt-0 py-4" forceMount>
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ExpenseView
                    planId={plan.id}
                    budget={plan.budget}
                    budgetCurrency={plan.budget_currency}
                  />
                </motion.div>
              </TabsContent>
            )}
            {activeTab === 'checklist' && (
              <TabsContent key="checklist" value="checklist" className="mt-0" forceMount>
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChecklistView planId={plan.id} />
                </motion.div>
              </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
      </main>

      {/* 플랜 수정 다이얼로그 — 오너만 접근 가능 */}
      {isOwner && (
        <PlanEditDialog
          plan={plan}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdated={(updated) => setPlan(updated)}
        />
      )}
    </div>
  )
}
