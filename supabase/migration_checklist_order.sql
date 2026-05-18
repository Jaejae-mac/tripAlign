-- ============================================================
-- 준비물 체크리스트 순서(sort_order) 컬럼 추가 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================

-- 1. packing_groups 에 sort_order 컬럼 추가
ALTER TABLE packing_groups
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 기존 데이터의 sort_order를 created_at 순으로 초기화
UPDATE packing_groups
SET sort_order = sub.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY plan_id ORDER BY created_at ASC) - 1 AS rn
  FROM packing_groups
) sub
WHERE packing_groups.id = sub.id;

-- 2. packing_items 에 sort_order 컬럼 추가
ALTER TABLE packing_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 기존 데이터의 sort_order를 created_at 순으로 초기화
UPDATE packing_items
SET sort_order = sub.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at ASC) - 1 AS rn
  FROM packing_items
) sub
WHERE packing_items.id = sub.id;

-- 3. 정렬 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_packing_groups_plan_order ON packing_groups(plan_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_packing_items_group_order ON packing_items(group_id, sort_order);
