/**
 * 전역 로딩 상태 (Zustand)
 * PlaneLoader 오버레이를 표시/숨기는 단일 진실 공급원입니다.
 * store 액션 내부에서 getState().show() / getState().hide()로 호출합니다.
 */
import { create } from 'zustand'

interface LoadingState {
  isLoading: boolean
  /** 로더 아래 표시할 메시지 (빈 문자열이면 기본 문구 표시) */
  message: string
  /** 비행기 로더 표시 */
  show: (message?: string) => void
  /** 비행기 로더 숨김 */
  hide: () => void
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: '',
  show: (message = '') => set({ isLoading: true, message }),
  hide: () => set({ isLoading: false, message: '' }),
}))
