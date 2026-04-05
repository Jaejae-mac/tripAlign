/**
 * 준비물 체크리스트 관련 타입 정의
 * packing_groups(이름별 그룹)와 packing_items(항목)로 구성됩니다.
 */

/** DB의 packing_groups 테이블 레코드 */
export interface PackingGroup {
  id: string
  plan_id: string
  name: string
  created_at: string
}

/** DB의 packing_items 테이블 레코드 */
export interface PackingItem {
  id: string
  group_id: string
  title: string
  is_checked: boolean
  created_at: string
}

/** 그룹과 하위 항목을 함께 담는 뷰 모델 */
export interface PackingGroupWithItems extends PackingGroup {
  items: PackingItem[]
}

/** 그룹 생성 DTO */
export interface CreatePackingGroupDto {
  name: string
}

/** 항목 생성 DTO */
export interface CreatePackingItemDto {
  title: string
}
