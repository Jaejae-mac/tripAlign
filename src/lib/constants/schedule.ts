/**
 * 일정 카테고리 상수
 * 아이콘, 색상, 레이블을 한 곳에서 관리합니다.
 * 일정 항목과 가계부 모두 이 설정을 공유합니다.
 */
import {
  Utensils,
  Camera,
  BedDouble,
  Bus,
  ShoppingBag,
  MoreHorizontal,
} from 'lucide-react'
import type { ScheduleCategory } from '@/types/schedule.types'
import type { ExpenseCategory } from '@/types/expense.types'
import type { LucideIcon } from 'lucide-react'

interface CategoryConfig {
  Icon: LucideIcon
  label: string
  color: string
}

/** 일정/지출 카테고리별 아이콘, 색상, 한국어 레이블 */
export const CATEGORY_CONFIG: Record<
  ScheduleCategory | ExpenseCategory,
  CategoryConfig
> = {
  food: {
    Icon: Utensils,
    label: '식사',
    color: '#F59E0B',
  },
  tour: {
    Icon: Camera,
    label: '관광',
    color: '#10B981',
  },
  stay: {
    Icon: BedDouble,
    label: '숙박',
    color: '#6366F1',
  },
  transport: {
    Icon: Bus,
    label: '교통',
    color: '#3B82F6',
  },
  shopping: {
    Icon: ShoppingBag,
    label: '쇼핑',
    color: '#EC4899',
  },
  etc: {
    Icon: MoreHorizontal,
    label: '기타',
    color: '#6B7280',
  },
}

/** 선택 UI에서 사용하는 카테고리 옵션 목록 */
export const SCHEDULE_CATEGORIES: ScheduleCategory[] = [
  'food',
  'tour',
  'stay',
  'transport',
  'shopping',
  'etc',
]

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food',
  'transport',
  'stay',
  'tour',
  'shopping',
  'etc',
]
