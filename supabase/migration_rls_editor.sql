-- ============================================================
-- editor 멤버 쓰기 권한 RLS 정책 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================
-- 발생 원인:
--   migration_sharing.sql에서 day_schedules, schedule_items, expenses 테이블에
--   editor 멤버의 INSERT/UPDATE/DELETE 정책이 누락되어
--   editor 권한으로 초대된 멤버가 일정/지출을 추가·수정할 수 없습니다.
-- ============================================================

-- ============================================================
-- 1. day_schedules — editor 멤버 쓰기 허용
-- ============================================================
CREATE POLICY "day_schedules_editor_write" ON day_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = day_schedules.plan_id
        AND plan_members.user_id = auth.uid()
        AND plan_members.role = 'editor'
    )
  );

-- ============================================================
-- 2. schedule_items — editor 멤버 쓰기 허용
--    day_schedule → plan_members 체인으로 editor 확인
-- ============================================================
CREATE POLICY "schedule_items_editor_write" ON schedule_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM day_schedules ds
      JOIN plan_members pm ON pm.plan_id = ds.plan_id
      WHERE ds.id = schedule_items.day_schedule_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'editor'
    )
  );

-- ============================================================
-- 3. expenses — editor 멤버 쓰기 허용
-- ============================================================
CREATE POLICY "expenses_editor_write" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = expenses.plan_id
        AND plan_members.user_id = auth.uid()
        AND plan_members.role = 'editor'
    )
  );
