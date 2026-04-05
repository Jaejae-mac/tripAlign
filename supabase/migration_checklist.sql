-- ============================================================
-- 준비물 체크리스트 기능 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================

-- ============================================================
-- 1. packing_groups — 이름별 준비물 그룹 테이블
--    예: "의류", "세면도구", "여권/서류" 등
-- ============================================================
CREATE TABLE IF NOT EXISTS packing_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id    UUID NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. packing_items — 그룹에 속한 준비물 항목 테이블
--    각 항목은 is_checked로 완료 여부를 표시합니다.
-- ============================================================
CREATE TABLE IF NOT EXISTS packing_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES packing_groups(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. RLS 활성화
-- ============================================================
ALTER TABLE packing_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_items  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. packing_groups RLS 정책
-- ============================================================

-- 오너: 자기 플랜의 그룹 전체 CRUD
CREATE POLICY "packing_groups_owner_all" ON packing_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = packing_groups.plan_id
        AND travel_plans.user_id = auth.uid()
    )
  );

-- 편집 가능 멤버: 그룹 읽기 + 추가 + 삭제
CREATE POLICY "packing_groups_editor_all" ON packing_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = packing_groups.plan_id
        AND plan_members.user_id = auth.uid()
        AND plan_members.role = 'editor'
    )
  );

-- 읽기 전용 멤버: 그룹 읽기만 허용
CREATE POLICY "packing_groups_viewer_read" ON packing_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = packing_groups.plan_id
        AND plan_members.user_id = auth.uid()
        AND plan_members.role = 'viewer'
    )
  );

-- ============================================================
-- 5. packing_items RLS 정책
-- ============================================================

-- 오너: 자기 플랜 항목 전체 CRUD
CREATE POLICY "packing_items_owner_all" ON packing_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM packing_groups pg
      JOIN travel_plans tp ON tp.id = pg.plan_id
      WHERE pg.id = packing_items.group_id
        AND tp.user_id = auth.uid()
    )
  );

-- 편집 가능 멤버: 항목 전체 CRUD (체크/추가/삭제)
CREATE POLICY "packing_items_editor_all" ON packing_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM packing_groups pg
      JOIN plan_members pm ON pm.plan_id = pg.plan_id
      WHERE pg.id = packing_items.group_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'editor'
    )
  );

-- 읽기 전용 멤버: 항목 읽기만 허용
CREATE POLICY "packing_items_viewer_read" ON packing_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM packing_groups pg
      JOIN plan_members pm ON pm.plan_id = pg.plan_id
      WHERE pg.id = packing_items.group_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'viewer'
    )
  );

-- ============================================================
-- 6. 인덱스 — 자주 조회하는 컬럼 최적화
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_packing_groups_plan_id ON packing_groups(plan_id);
CREATE INDEX IF NOT EXISTS idx_packing_items_group_id ON packing_items(group_id);
