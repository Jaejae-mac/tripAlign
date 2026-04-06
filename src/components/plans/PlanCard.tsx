'use client'

/**
 * 여행 플랜 카드 컴포넌트
 * 메인 페이지의 그리드에 나열되는 개별 플랜 카드입니다.
 * 플랜 제목, 목적지, 여행 기간, 총 일수를 보여줍니다.
 */
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { MapPin, Calendar, Trash2, MoreVertical, UserPlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { usePlanStore } from '@/store/planStore'
import { toast } from 'sonner'
import { useState } from 'react'
import { PlanInviteDialog } from './PlanInviteDialog'
import type { TravelPlan } from '@/types/plan.types'

// 목적지별 배경 그라디언트 (커버 이미지 없을 때 표시)
const COVER_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-violet-400 to-purple-600',
  'from-orange-400 to-rose-500',
  'from-amber-400 to-orange-500',
]

interface PlanCardProps {
  plan: TravelPlan
  /** 현재 로그인 유저가 이 플랜의 오너인지 여부 — 오너만 초대 메뉴를 볼 수 있습니다 */
  isOwner?: boolean
}

export function PlanCard({ plan, isOwner = false }: PlanCardProps) {
  const router = useRouter()
  const { removePlan } = usePlanStore()
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  const [imageError, setImageError] = useState(false)

  // 플랜 ID의 첫 글자로 그라디언트 색상을 결정 (일관성 유지)
  const gradientIndex =
    plan.id.charCodeAt(0) % COVER_GRADIENTS.length
  const gradient = COVER_GRADIENTS[gradientIndex]

  // 여행 기간 계산
  const startDate = parseISO(plan.start_date)
  const endDate = parseISO(plan.end_date)
  const totalDays = differenceInDays(endDate, startDate) + 1

  /** 플랜 상세 페이지로 이동 */
  const handleCardClick = () => {
    router.push(`/plans/${plan.id}`)
  }

  /** 플랜 삭제 확인 및 실행 */
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 전파 차단
    const confirmed = window.confirm(
      `"${plan.title}" 플랜을 삭제하시겠습니까?\n모든 일정과 가계부 데이터가 함께 삭제됩니다.`
    )
    if (!confirmed) return

    try {
      await removePlan(plan.id)
      toast.success('플랜이 삭제되었습니다.')
    } catch {
      toast.error('플랜 삭제에 실패했습니다.')
    }
  }

  return (
    <Card
      onClick={handleCardClick}
      className="group overflow-hidden border-border cursor-pointer p-0"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* 커버 영역 — w-full 명시로 fill 이미지 컨테이너 크기 보장 */}
      <div className="relative w-full h-36 flex items-end p-4 overflow-hidden">
        {/* 커버 이미지 or 그라디언트 배경 */}
        {plan.cover_image && !imageError ? (
          <Image
            src={plan.cover_image}
            alt={plan.title}
            fill
            className="object-cover"
            sizes="100vw"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}
        {/* 하단 그래디언트 오버레이 — 텍스트 가독성 향상 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* 목적지 표시 */}
        <div className="relative flex items-center gap-1 text-white/95 text-xs font-medium drop-shadow-sm">
          <MapPin className="w-3 h-3" />
          {plan.destination || '목적지 미정'}
        </div>

        {/* 총 일수 — 우측 하단 */}
        <div className="relative ml-auto text-white/90 text-xs font-semibold drop-shadow-sm">
          {totalDays}일
        </div>

        {/* 더보기 메뉴 버튼 */}
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 bg-white/20 hover:bg-white/40 text-white border-0 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
                <span className="sr-only">더보기</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* 오너만 친구 초대 메뉴 표시 */}
              {isOwner && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsInviteDialogOpen(true)
                  }}
                  className="cursor-pointer gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  친구 초대
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive cursor-pointer gap-2"
              >
                <Trash2 className="w-4 h-4" />
                플랜 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 친구 초대 다이얼로그 — 오너일 때만 렌더링 */}
      {isOwner && (
        <PlanInviteDialog
          planId={plan.id}
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
        />
      )}

      {/* 정보 영역 */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground text-base truncate mb-2 group-hover:text-primary transition-colors duration-200">
          {plan.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            {format(startDate, 'M월 d일', { locale: ko })} ~{' '}
            {format(endDate, 'M월 d일', { locale: ko })}
          </span>
        </div>
      </div>
    </Card>
  )
}
