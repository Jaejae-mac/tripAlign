'use client'

/**
 * 친구 초대 다이얼로그 (오너 전용)
 * 이메일로 친구를 초대하고, 대기 중인 초대 목록과 현재 멤버 목록을 관리합니다.
 */
import { useState, useEffect, useCallback } from 'react'
import { Loader2, UserPlus, X, Mail, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  inviteMember,
  getPlanInvitations,
  getPlanMembers,
  cancelInvitation,
  removeMember,
} from '@/services/invitation.service'
import { toast } from 'sonner'
import type { InvitationRole, PlanInvitation, PlanMember } from '@/types/invitation.types'

interface PlanInviteDialogProps {
  planId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

import { z } from 'zod'

/** Zod email 검증 — RFC 표준을 따르는 안전한 이메일 형식 검사 */
const emailSchema = z.string().email()
function isValidEmail(email: string) {
  return emailSchema.safeParse(email).success
}

const ROLE_LABELS: Record<InvitationRole, string> = {
  viewer: '읽기 전용',
  editor: '편집 가능',
}

export function PlanInviteDialog({ planId, open, onOpenChange }: PlanInviteDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InvitationRole>('viewer')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [invitations, setInvitations] = useState<PlanInvitation[]>([])
  const [members, setMembers] = useState<PlanMember[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)

  /** 초대 목록과 멤버 목록을 동시에 불러옴 */
  const fetchLists = useCallback(async () => {
    setIsLoadingList(true)
    try {
      const [invs, mems] = await Promise.all([
        getPlanInvitations(planId),
        getPlanMembers(planId),
      ])
      setInvitations(invs)
      setMembers(mems)
    } catch {
      toast.error('목록을 불러오지 못했습니다.')
    } finally {
      setIsLoadingList(false)
    }
  }, [planId])

  // 다이얼로그가 열릴 때 목록 새로고침
  useEffect(() => {
    if (open) {
      setEmail('')
      setRole('viewer')
      fetchLists()
    }
  }, [open, fetchLists])

  /** 초대 발송 */
  const handleInvite = async () => {
    if (!isValidEmail(email)) {
      toast.error('올바른 이메일 형식으로 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const newInvitation = await inviteMember(planId, email, role)
      setInvitations((prev) => [newInvitation, ...prev])
      setEmail('')
      toast.success(`${email}에게 초대를 보냈습니다.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '초대 발송에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /** pending 초대 취소 */
  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId)
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
      toast.success('초대를 취소했습니다.')
    } catch {
      toast.error('초대 취소에 실패했습니다.')
    }
  }

  /** 멤버 제거 */
  const handleRemoveMember = async (memberId: string, userId: string) => {
    const confirmed = window.confirm('이 멤버를 플랜에서 제거하시겠습니까?')
    if (!confirmed) return

    try {
      await removeMember(planId, userId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast.success('멤버를 제거했습니다.')
    } catch {
      toast.error('멤버 제거에 실패했습니다.')
    }
  }

  // pending 상태의 초대만 분리
  const pendingInvitations = invitations.filter((i) => i.status === 'pending')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-3rem)] sm:max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserPlus className="w-5 h-5 text-primary" />
            친구 초대
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* 이메일 + 권한 + 초대 버튼 */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {/* 권한 선택 */}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as InvitationRole)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
              >
                <option value="viewer">읽기 전용</option>
                <option value="editor">편집 가능</option>
              </select>
              {/* 이메일 입력 */}
              <Input
                type="email"
                placeholder="친구 이메일 입력"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleInvite()}
                className="flex-1"
              />
            </div>
            <Button
              onClick={handleInvite}
              disabled={isSubmitting || !email.trim()}
              className="w-full gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              초대 보내기
            </Button>
          </div>

          {isLoadingList ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* 대기 중인 초대 */}
              {pendingInvitations.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    초대 대기 중
                  </p>
                  <ul className="space-y-2">
                    {pendingInvitations.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {ROLE_LABELS[inv.role]}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                          aria-label="초대 취소"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 현재 멤버 */}
              {members.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      현재 멤버
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {members.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {member.user_id.slice(0, 8)}...
                          </p>
                          <span
                            className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5"
                            style={{
                              backgroundColor: member.role === 'editor' ? '#dbeafe' : '#f1f5f9',
                              color: member.role === 'editor' ? '#1d4ed8' : '#64748b',
                            }}
                          >
                            {ROLE_LABELS[member.role]}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                          aria-label="멤버 제거"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
