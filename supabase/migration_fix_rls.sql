-- ============================================================
-- RLS 무한 재귀(42P17) 버그 픽스
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================
-- 발생 원인:
--   INSERT INTO travel_plans ... RETURNING * 실행 시
--   RETURNING이 SELECT 정책을 평가하면서 순환 참조 발생
--
--   사이클 1: travel_plans_invitee_pending_read → plan_invitations 조회
--              → invitations_owner_select → travel_plans 조회 → 무한 재귀
--
--   사이클 2: travel_plans_member_read → plan_members 조회
--              → members_owner_all → travel_plans 조회 → 무한 재귀
-- ============================================================

-- ============================================================
-- Fix 1: invitations_owner_select 재작성
--   기존: travel_plans.user_id 를 JOIN해서 오너 확인 → 순환 발생
--   수정: invited_by = auth.uid() 직접 비교 (플랜 오너 = 초대 발신자)
-- ============================================================
DROP POLICY IF EXISTS "invitations_owner_select" ON plan_invitations;
CREATE POLICY "invitations_owner_select" ON plan_invitations
  FOR SELECT USING (invited_by = auth.uid());

-- ============================================================
-- Fix 2: SECURITY DEFINER 함수로 travel_plans를 RLS 없이 조회
--   members_owner_all 정책이 travel_plans를 참조할 때
--   SECURITY DEFINER 함수를 통해 RLS 평가를 우회합니다.
-- ============================================================
CREATE OR REPLACE FUNCTION is_plan_owner(p_plan_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM travel_plans
    WHERE id = p_plan_id
      AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- Fix 3: members_owner_all 재작성
--   기존: travel_plans를 직접 JOIN → 순환 발생
--   수정: SECURITY DEFINER 함수(is_plan_owner) 호출
-- ============================================================
DROP POLICY IF EXISTS "members_owner_all" ON plan_members;
CREATE POLICY "members_owner_all" ON plan_members
  FOR ALL USING (is_plan_owner(plan_id));
