'use client'

/**
 * 플랜 초대 알림 카드 (수신자용)
 * "OOO님이 [플랜명] 플랜에 초대했습니다" 형태로 표시하고
 * 수락/거절 버튼을 제공합니다.
 */
import { useState } from 'react'
import { Bell, MapPin, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useSharedPlanStore } from '@/store/sharedPlanStore'
import type { PendingInvitationEntry } from '@/types/invitation.types'

interface InvitationNoticeCardProps {
  invitation: PendingInvitationEntry
}

const ROLE_LABELS = {
  viewer: '읽기 전용',
  editor: '편집 가능',
} as const

export function InvitationNoticeCard({ invitation }: InvitationNoticeCardProps) {
  const { handleAccept, handleReject } = useSharedPlanStore()
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const plan = invitation.travel_plans

  const onAccept = async () => {
    setIsAccepting(true)
    try {
      await handleAccept(invitation.id)
      toast.success(`[${plan.title}] 플랜에 참여했습니다!`)
    } catch {
      toast.error('초대 수락에 실패했습니다.')
    } finally {
      setIsAccepting(false)
    }
  }

  const onReject = async () => {
    setIsRejecting(true)
    try {
      await handleReject(invitation.id)
      toast.success('초대를 거절했습니다.')
    } catch {
      toast.error('초대 거절에 실패했습니다.')
    } finally {
      setIsRejecting(false)
    }
  }

  const isLoading = isAccepting || isRejecting

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-amber-200 bg-amber-50/80 p-4"
    >
      <div className="flex items-start gap-3">
        {/* 알림 아이콘 */}
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-amber-600" />
        </div>

        <div className="flex-1 min-w-0">
          {/* 초대 메시지 */}
          <p className="text-sm text-foreground leading-snug">
            <span className="font-semibold">{invitation.invited_by_name}</span>
            님이{' '}
            <span className="font-semibold text-primary">[{plan.title}]</span>{' '}
            플랜에 초대했습니다.
          </p>

          {/* 플랜 목적지 + 권한 배지 */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {plan.destination}
            </span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: invitation.role === 'editor' ? '#dbeafe' : '#f1f5f9',
                color: invitation.role === 'editor' ? '#1d4ed8' : '#64748b',
              }}
            >
              {ROLE_LABELS[invitation.role]}
            </span>
          </div>

          {/* 수락/거절 버튼 */}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={onAccept}
              disabled={isLoading}
              className="h-7 text-xs gap-1 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
            >
              {isAccepting && <Loader2 className="w-3 h-3 animate-spin" />}
              수락
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              disabled={isLoading}
              className="h-7 text-xs text-muted-foreground cursor-pointer"
            >
              {isRejecting && <Loader2 className="w-3 h-3 animate-spin" />}
              거절
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
