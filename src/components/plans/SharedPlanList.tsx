'use client'

/**
 * 공유된 플랜 목록 컴포넌트
 * 상단에 pending 초대 알림 카드, 하단에 수락된 공유 플랜 그리드를 표시합니다.
 */
import { useEffect } from 'react'
import { Bell, Loader2, Share2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useSharedPlanStore } from '@/store/sharedPlanStore'
import { InvitationNoticeCard } from './InvitationNoticeCard'
import { SharedPlanCard } from './SharedPlanCard'

export function SharedPlanList() {
  const {
    sharedPlans,
    roleMap,
    pendingInvitations,
    isLoading,
    fetchSharedPlans,
    fetchPendingInvitations,
  } = useSharedPlanStore()

  // 화면에 처음 나타날 때 pending 초대 목록과 공유 플랜 목록을 동시에 불러옴
  useEffect(() => {
    fetchPendingInvitations()
    fetchSharedPlans()
  }, [fetchPendingInvitations, fetchSharedPlans])

  // 데이터 로딩 중 스피너 표시
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasContent = pendingInvitations.length > 0 || sharedPlans.length > 0

  return (
    <div className="space-y-6">
      {/* ── 초대 알림 섹션 ── */}
      <AnimatePresence mode="popLayout">
        {pendingInvitations.length > 0 && (
          <section className="space-y-3">
            {/* 섹션 헤더 */}
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">
                초대 {pendingInvitations.length}건
              </span>
            </div>

            {/* 초대 알림 카드 목록 */}
            {pendingInvitations.map((invitation) => (
              <InvitationNoticeCard key={invitation.id} invitation={invitation} />
            ))}
          </section>
        )}
      </AnimatePresence>

      {/* ── 공유된 플랜 그리드 ── */}
      {sharedPlans.length > 0 && (
        <section className="space-y-3">
          {pendingInvitations.length > 0 && (
            <div className="h-px bg-border" />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sharedPlans.map((plan) => (
              <SharedPlanCard
                key={plan.id}
                plan={plan}
                role={roleMap.get(plan.id) ?? 'viewer'}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 완전 빈 상태 ── */}
      {!hasContent && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Share2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">공유된 플랜이 없어요.</p>
          <p className="text-xs text-muted-foreground">친구에게 초대를 요청해보세요.</p>
        </div>
      )}
    </div>
  )
}
