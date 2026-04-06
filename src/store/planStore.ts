/**
 * 여행 플랜 전역 상태 (Zustand)
 * 플랜 목록과 현재 선택된 플랜을 전역으로 관리합니다.
 */
import { create } from 'zustand'
import type { TravelPlan, CreatePlanDto } from '@/types/plan.types'
import {
  getPlans,
  createPlan as createPlanService,
  deletePlan as deletePlanService,
} from '@/services/plan.service'
import { useLoadingStore } from '@/store/loadingStore'

interface PlanState {
  plans: TravelPlan[]
  currentPlan: TravelPlan | null
  isLoading: boolean
  error: string | null

  // 액션
  fetchPlans: () => Promise<void>
  addPlan: (dto: CreatePlanDto) => Promise<TravelPlan>
  removePlan: (planId: string) => Promise<void>
  setCurrentPlan: (plan: TravelPlan | null) => void
  clearError: () => void
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  currentPlan: null,
  isLoading: false,
  error: null,

  /** 사용자의 플랜 목록을 서버에서 불러와 상태에 저장 */
  fetchPlans: async () => {
    useLoadingStore.getState().show()
    set({ isLoading: true, error: null })
    try {
      const plans = await getPlans()
      set({ plans, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '플랜을 불러오지 못했습니다.',
        isLoading: false,
      })
    } finally {
      useLoadingStore.getState().hide()
    }
  },

  /** 새 플랜을 생성하고 목록 맨 앞에 추가 */
  addPlan: async (dto: CreatePlanDto) => {
    useLoadingStore.getState().show('플랜을 생성하는 중입니다')
    set({ isLoading: true, error: null })
    try {
      const newPlan = await createPlanService(dto)
      set((state) => ({
        plans: [newPlan, ...state.plans],
        isLoading: false,
      }))
      return newPlan
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '플랜 생성에 실패했습니다.',
        isLoading: false,
      })
      throw err
    } finally {
      useLoadingStore.getState().hide()
    }
  },

  /** 플랜을 삭제하고 목록에서 제거 */
  removePlan: async (planId: string) => {
    useLoadingStore.getState().show('플랜을 삭제하는 중입니다')
    set({ isLoading: true, error: null })
    try {
      await deletePlanService(planId)
      set((state) => ({
        plans: state.plans.filter((p) => p.id !== planId),
        currentPlan:
          state.currentPlan?.id === planId ? null : state.currentPlan,
        isLoading: false,
      }))
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '플랜 삭제에 실패했습니다.',
        isLoading: false,
      })
      throw err
    } finally {
      useLoadingStore.getState().hide()
    }
  },

  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  clearError: () => set({ error: null }),
}))
