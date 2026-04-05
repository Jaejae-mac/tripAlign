/**
 * 가계부 지출 비즈니스 로직 서비스 레이어
 * 플랜별 지출 내역을 관리합니다.
 */
import { createClient } from '@/lib/supabase/client'
import type {
  Expense,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseSummaryByCategory,
} from '@/types/expense.types'

/** 플랜의 전체 지출 목록 조회 (날짜 오름차순) */
export async function getExpenses(planId: string): Promise<Expense[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('plan_id', planId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/** 새 지출 항목 추가 */
export async function createExpense(dto: CreateExpenseDto): Promise<Expense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert(dto)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 지출 항목 수정 */
export async function updateExpense(
  expenseId: string,
  dto: UpdateExpenseDto
): Promise<Expense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .update(dto)
    .eq('id', expenseId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 지출 항목 삭제 */
export async function deleteExpense(expenseId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  if (error) throw new Error(error.message)
}

/**
 * 카테고리별 지출 합계 계산
 * DB가 아닌 클라이언트에서 집계합니다 (실시간 UI 업데이트 편의성)
 */
export function calcSummaryByCategory(
  expenses: Expense[]
): ExpenseSummaryByCategory[] {
  const categoryMap = new Map<string, number>()

  expenses.forEach(({ category, amount }) => {
    const current = categoryMap.get(category) ?? 0
    categoryMap.set(category, current + amount)
  })

  return Array.from(categoryMap.entries()).map(([category, total]) => ({
    category: category as ExpenseSummaryByCategory['category'],
    total,
    // 통화가 혼재할 경우 첫 번째 통화 기준으로 표시 (개선 여지 있음)
    currency: expenses.find((e) => e.category === category)?.currency ?? 'KRW',
  }))
}
