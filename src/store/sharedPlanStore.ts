/**
 * 공유 플랜 전역 상태 (Zustand)
 * 내가 수락한 공유 플랜 목록과 아직 수락/거절하지 않은 pending 초대 목록을 관리합니다.
 */
import { create } from 'zustand'
import type { TravelPlan } from '@/types/plan.types'
import type { InvitationRole, PendingInvitationEntry } from '@/types/invitation.types'
import {
  getSharedPlans,
  getMyPendingInvitations,
  acceptInvitation,
  rejectInvitation,
  removeMember,
} from '@/services/invitation.service'
import { createClient } from '@/lib/supabase/client'
import { useLoadingStore } from '@/store/loadingStore'

interface SharedPlanState {
  /** 수락이 완료된 공유 플랜 목록 */
  sharedPlans: TravelPlan[]
  /** plan_id → 내 권한 매핑 */
  roleMap: Map<string, InvitationRole>
  /** 수락/거절 대기 중인 초대 목록 */
  pendingInvitations: PendingInvitationEntry[]
  isLoading: boolean
  error: string | null

  /** 수락된 공유 플랜 목록을 서버에서 불러옴 */
  fetchSharedPlans: () => Promise<void>
  /** pending 초대 목록을 서버에서 불러옴 */
  fetchPendingInvitations: () => Promise<void>
  /** 초대 수락 — plan_members에 등록 후 sharedPlans에 추가 */
  handleAccept: (invitationId: string) => Promise<void>
  /** 초대 거절 — pendingInvitations에서만 제거 */
  handleReject: (invitationId: string) => Promise<void>
  /** 공유 플랜 나가기 (멤버 본인 삭제) */
  leaveSharedPlan: (planId: string) => Promise<void>
}

export const useSharedPlanStore = create<SharedPlanState>((set, get) => ({
  sharedPlans: [],
  roleMap: new Map(),
  pendingInvitations: [],
  isLoading: false,
  error: null,

  fetchSharedPlans: async () => {
    useLoadingStore.getState().show()
    set({ isLoading: true, error: null })
    try {
      const entries = await getSharedPlans()
      const plans = entries.map((e) => e.travel_plans)
      const roleMap = new Map<string, InvitationRole>(
        entries.map((e) => [e.plan_id, e.role])
      )
      set({ sharedPlans: plans, roleMap, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '공유 플랜을 불러오지 못했습니다.',
        isLoading: false,
      })
    } finally {
      useLoadingStore.getState().hide()
    }
  },

  fetchPendingInvitations: async () => {
    try {
      const invitations = await getMyPendingInvitations()
      set({ pendingInvitations: invitations })
    } catch {
      // 실패해도 UI 진입은 차단하지 않음
    }
  },

  handleAccept: async (invitationId: string) => {
    const invitation = get().pendingInvitations.find((i) => i.id === invitationId)
    if (!invitation) return

    // 1. optimistic: pending 목록에서 즉시 제거
    set((state) => ({
      pendingInvitations: state.pendingInvitations.filter((i) => i.id !== invitationId),
    }))

    useLoadingStore.getState().show('초대를 수락하는 중입니다')
    try {
      await acceptInvitation(invitationId)

      // 2. 수락 후 공유 플랜 목록에 추가
      const newPlan = invitation.travel_plans as TravelPlan
      set((state) => {
        const newRoleMap = new Map(state.roleMap)
        newRoleMap.set(invitation.plan_id, invitation.role)
        return {
          sharedPlans: [newPlan, ...state.sharedPlans],
          roleMap: newRoleMap,
        }
      })
    } catch {
      // 실패 시 pending 목록 복원
      set((state) => ({
        pendingInvitations: [invitation, ...state.pendingInvitations],
      }))
      throw new Error('초대 수락에 실패했습니다.')
    } finally {
      useLoadingStore.getState().hide()
    }
  },

  handleReject: async (invitationId: string) => {
    const invitation = get().pendingInvitations.find((i) => i.id === invitationId)
    if (!invitation) return

    // optimistic: pending 목록에서 즉시 제거
    set((state) => ({
      pendingInvitations: state.pendingInvitations.filter((i) => i.id !== invitationId),
    }))

    useLoadingStore.getState().show('초대를 거절하는 중입니다')
    try {
      await rejectInvitation(invitationId)
    } catch {
      // 실패 시 복원
      set((state) => ({
        pendingInvitations: [invitation, ...state.pendingInvitations],
      }))
      throw new Error('초대 거절에 실패했습니다.')
    } finally {
      useLoadingStore.getState().hide()
    }
  },

  leaveSharedPlan: async (planId: string) => {
    // 현재 로그인 유저 ID 조회
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('로그인이 필요합니다.')

    // optimistic: 목록에서 즉시 제거
    const removed = get().sharedPlans.find((p) => p.id === planId)
    set((state) => ({
      sharedPlans: state.sharedPlans.filter((p) => p.id !== planId),
    }))

    try {
      await removeMember(planId, user.id)
      // roleMap에서도 제거
      set((state) => {
        const newRoleMap = new Map(state.roleMap)
        newRoleMap.delete(planId)
        return { roleMap: newRoleMap }
      })
    } catch {
      // 실패 시 복원
      if (removed) {
        set((state) => ({
          sharedPlans: [...state.sharedPlans, removed],
        }))
      }
      throw new Error('플랜 나가기에 실패했습니다.')
    }
  },
}))
