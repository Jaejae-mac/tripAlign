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
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  // 각 그룹의 항목을 추가된 순서대로 정렬
  return (data ?? []).map((group) => ({
    ...group,
    items: (group.items ?? []).sort(
      (a: PackingItem, b: PackingItem) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }))
}

/** 새 준비물 그룹 추가 */
export async function createPackingGroup(
  planId: string,
  dto: CreatePackingGroupDto
): Promise<PackingGroup> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('packing_groups')
    .insert({ plan_id: planId, name: dto.name })
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

/** 준비물 항목 추가 */
export async function createPackingItem(
  groupId: string,
  dto: CreatePackingItemDto
): Promise<PackingItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('packing_items')
    .insert({ group_id: groupId, title: dto.title })
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

/** 준비물 항목 삭제 */
export async function deletePackingItem(itemId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('packing_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(error.message)
}
