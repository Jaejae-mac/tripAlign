'use client'

/**
 * 공유된 플랜 카드 (수신자용)
 * PlanCard와 동일한 UI를 사용하되, 더보기 메뉴에 "플랜 나가기"만 표시합니다.
 * 카드 하단에 권한 배지(viewer/editor)를 표시합니다.
 */
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { MapPin, Calendar, MoreVertical, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useSharedPlanStore } from '@/store/sharedPlanStore'
import { toast } from 'sonner'
import type { TravelPlan } from '@/types/plan.types'
import type { InvitationRole } from '@/types/invitation.types'

interface SharedPlanCardProps {
  plan: TravelPlan
  role: InvitationRole
}

// PlanCard와 동일한 그라디언트 fallback 목록
const GRADIENTS = [
  'from-blue-400 to-indigo-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
]

const ROLE_LABELS: Record<InvitationRole, string> = {
  viewer: '읽기 전용',
  editor: '편집 가능',
}

export function SharedPlanCard({ plan, role }: SharedPlanCardProps) {
  const router = useRouter()
  const { leaveSharedPlan } = useSharedPlanStore()
  const [isLeaving, setIsLeaving] = useState(false)

  const startDate = parseISO(plan.start_date)
  const endDate = parseISO(plan.end_date)
  const totalDays = differenceInDays(endDate, startDate) + 1
  const gradient = GRADIENTS[plan.id.charCodeAt(0) % GRADIENTS.length]

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = window.confirm(`[${plan.title}] 플랜에서 나가시겠습니까?`)
    if (!confirmed) return

    setIsLeaving(true)
    try {
      await leaveSharedPlan(plan.id)
      toast.success('플랜에서 나갔습니다.')
    } catch {
      toast.error('플랜 나가기에 실패했습니다.')
    } finally {
      setIsLeaving(false)
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
    >
      <Card
        className="overflow-hidden cursor-pointer border-border hover:shadow-md transition-shadow duration-200"
        onClick={() => router.push(`/plans/${plan.id}`)}
      >
        {/* 커버 영역 */}
        <div className="relative h-36 bg-muted overflow-hidden">
          {plan.cover_image ? (
            <Image
              src={plan.cover_image}
              alt={plan.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
          )}

          {/* 어두운 하단 그라디언트 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* 목적지 — 좌측 하단 */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{plan.destination}</span>
          </div>

          {/* 총 일수 — 우측 하단 */}
          <div className="absolute bottom-3 right-3">
            <span className="text-xs font-semibold text-white/90">{totalDays}일</span>
          </div>

          {/* 더보기 메뉴 — 우측 상단 */}
          <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isLeaving}
                  className="w-8 h-8 bg-black/30 hover:bg-black/50 text-white border-0 cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                  <span className="sr-only">더보기</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleLeave}
                  className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  플랜 나가기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 정보 영역 */}
        <div className="p-4 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-1">
              {plan.title}
            </h3>
            {/* 권한 배지 */}
            <span
              className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: role === 'editor' ? '#dbeafe' : '#f1f5f9',
                color: role === 'editor' ? '#1d4ed8' : '#64748b',
              }}
            >
              {ROLE_LABELS[role]}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              {format(startDate, 'yyyy.MM.dd', { locale: ko })} ~{' '}
              {format(endDate, 'yyyy.MM.dd', { locale: ko })}
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
