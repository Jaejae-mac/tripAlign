/**
 * 준비물 체크리스트 비즈니스 로직 서비스 레이어
 * 이름별 그룹(packing_groups)과 항목(packing_items)을 관리합니다.
 */
import { createClient } from '@/lib/supabase/client'
import type {
  PackingGroupWithItems,
  PackingGroup,
  PackingItem,
  CreatePackingGroupDto,
  CreatePackingItemDto,
} from '@/types/checklist.types'

/** 플랜의 모든 준비물 그룹과 하위 항목을 함께 조회 */
export async function getPackingGroups(planId: string): Promise<PackingGroupWithItems[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('packing_groups')
    .select(`
      *,
      items:packing_items(*)
    `)
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((group) => ({
    ...group,
    items: (group.items ?? []).sort(
      (a: PackingItem, b: PackingItem) => a.sort_order - b.sort_order
    ),
  }))
}

/** 새 준비물 그룹 추가 — sort_order는 현재 그룹 수로 설정 (맨 뒤) */
export async function createPackingGroup(
  planId: string,
  dto: CreatePackingGroupDto,
  currentCount: number
): Promise<PackingGroup> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('packing_groups')
    .insert({ plan_id: planId, name: dto.name, sort_order: currentCount })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 준비물 그룹 삭제 (하위 항목은 DB CASCADE로 자동 삭제) */
export async function deletePackingGroup(groupId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('packing_groups')
    .delete()
    .eq('id', groupId)

  if (error) throw new Error(error.message)
}

/** 그룹 순서 일괄 업데이트 — 드래그 앤 드롭 후 호출 */
export async function reorderPackingGroups(
  updates: { id: string; sort_order: number }[]
): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('packing_groups').update({ sort_order }).eq('id', id)
    )
  )
}

/** 준비물 항목 추가 — sort_order는 현재 항목 수로 설정 (맨 뒤) */
export async function createPackingItem(
  groupId: string,
  dto: CreatePackingItemDto,
  currentCount: number
): Promise<PackingItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('packing_items')
    .insert({ group_id: groupId, title: dto.title, sort_order: currentCount })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 준비물 항목 체크/언체크 토글 */
export async function togglePackingItem(
  itemId: string,
  isChecked: boolean
): Promise<PackingItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('packing_items')
    .update({ is_checked: isChecked })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 항목 순서 일괄 업데이트 — 드래그 앤 드롭 후 호출 */
export async function reorderPackingItems(
  updates: { id: string; sort_order: number }[]
): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('packing_items').update({ sort_order }).eq('id', id)
    )
  )
}

/** 준비물 항목 제목 수정 */
export async function updatePackingItemTitle(
  itemId: string,
  title: string
): Promise<PackingItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('packing_items')
    .update({ title })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 준비물 항목 삭제 */
export async function deletePackingItem(itemId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('packing_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(error.message)
}
