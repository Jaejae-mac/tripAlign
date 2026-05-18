-- ============================================================
-- 준비물 체크리스트 순서(sort_order) 컬럼 추가 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 아래 4단계를 순서대로 실행하세요.
-- (UPDATE...FROM 패턴이 Supabase 파서와 충돌하여 DO 블록으로 대체)
-- ============================================================

-- ── 1단계: packing_groups sort_order 컬럼 추가 ──────────────
ALTER TABLE packing_groups
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ── 2단계: packing_items sort_order 컬럼 추가 ───────────────
ALTER TABLE packing_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- ── 3단계: 기존 데이터 순서 초기화 (created_at 기준) ─────────
DO $$
DECLARE
  v_plan UUID;
  v_group UUID;
  v_id UUID;
  v_n INTEGER;
BEGIN
  FOR v_plan IN SELECT DISTINCT plan_id FROM packing_groups LOOP
    v_n := 0;
    FOR v_id IN
      SELECT id FROM packing_groups
      WHERE plan_id = v_plan ORDER BY created_at ASC
    LOOP
      UPDATE packing_groups SET sort_order = v_n WHERE id = v_id;
      v_n := v_n + 1;
    END LOOP;
  END LOOP;

  FOR v_group IN SELECT DISTINCT group_id FROM packing_items LOOP
    v_n := 0;
    FOR v_id IN
      SELECT id FROM packing_items
      WHERE group_id = v_group ORDER BY created_at ASC
    LOOP
      UPDATE packing_items SET sort_order = v_n WHERE id = v_id;
      v_n := v_n + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- ── 4단계: 정렬 성능을 위한 인덱스 ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_packing_groups_plan_order ON packing_groups(plan_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_packing_items_group_order ON packing_items(group_id, sort_order);
