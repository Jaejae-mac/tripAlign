-- ============================================================
-- 플랜 공유 & 초대 기능 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================

-- ============================================================
-- 1. plan_invitations — 이메일 기반 초대 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id         UUID NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  invited_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_name TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('viewer', 'editor')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, email)
);

-- ============================================================
-- 2. plan_members — 수락 완료된 멤버 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id   UUID NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('viewer', 'editor')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, user_id)
);

-- ============================================================
-- 3. RLS 활성화
-- ============================================================
ALTER TABLE plan_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_members     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. plan_invitations RLS 정책
-- ============================================================

-- 오너: 자기 플랜의 초대 목록 조회
CREATE POLICY "invitations_owner_select" ON plan_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = plan_invitations.plan_id
        AND travel_plans.user_id = auth.uid()
    )
  );

-- 오너: 초대 발송 (INSERT)
CREATE POLICY "invitations_owner_insert" ON plan_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = plan_invitations.plan_id
        AND travel_plans.user_id = auth.uid()
    )
  );

-- 오너: 초대 취소/정리 (DELETE)
CREATE POLICY "invitations_owner_delete" ON plan_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = plan_invitations.plan_id
        AND travel_plans.user_id = auth.uid()
    )
  );

-- 수신자: 자신의 이메일로 온 pending 초대 조회
-- auth.email() 은 JWT에서 현재 유저 이메일을 반환하는 Supabase 헬퍼 (auth.users 직접 접근 불필요)
CREATE POLICY "invitations_invitee_select" ON plan_invitations
  FOR SELECT USING (
    email = auth.email()
    AND status = 'pending'
  );

-- 수신자: 자신의 초대 레코드 삭제 (플랜 나가기 후 재초대 허용을 위한 정리)
CREATE POLICY "invitations_invitee_delete" ON plan_invitations
  FOR DELETE USING (
    email = auth.email()
  );

-- ============================================================
-- 5. plan_members RLS 정책
-- ============================================================

-- 오너: 자기 플랜의 멤버 목록 조회 + 멤버 제거 (DELETE는 remove_member 함수가 처리)
CREATE POLICY "members_owner_all" ON plan_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = plan_members.plan_id
        AND travel_plans.user_id = auth.uid()
    )
  );

-- 멤버 본인: 자신의 멤버 레코드 조회
CREATE POLICY "members_self_select" ON plan_members
  FOR SELECT USING (user_id = auth.uid());

-- 멤버 본인: 플랜 나가기 (자신의 레코드만 삭제)
CREATE POLICY "members_self_delete" ON plan_members
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 6. travel_plans 추가 RLS — 멤버 읽기 허용
-- ============================================================

-- 수락된 멤버도 플랜 상세 조회 가능
CREATE POLICY "travel_plans_member_read" ON travel_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = travel_plans.id
        AND plan_members.user_id = auth.uid()
    )
  );

-- pending 초대 수신자도 플랜 미리보기 가능 (수락 알림 카드에 제목/목적지 표시용)
CREATE POLICY "travel_plans_invitee_pending_read" ON travel_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plan_invitations
      WHERE plan_invitations.plan_id = travel_plans.id
        AND plan_invitations.email = auth.email()
        AND plan_invitations.status = 'pending'
    )
  );

-- ============================================================
-- 7. 하위 테이블 멤버 읽기 정책
-- ============================================================

CREATE POLICY "day_schedules_member_read" ON day_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = day_schedules.plan_id
        AND plan_members.user_id = auth.uid()
    )
  );

CREATE POLICY "schedule_items_member_read" ON schedule_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM day_schedules ds
      JOIN plan_members pm ON pm.plan_id = ds.plan_id
      WHERE ds.id = schedule_items.day_schedule_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_member_read" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plan_members
      WHERE plan_members.plan_id = expenses.plan_id
        AND plan_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. 초대 수락 함수 (SECURITY DEFINER)
--    수신자는 plan_members에 직접 INSERT 권한이 없으므로 함수로 우회합니다.
-- ============================================================
CREATE OR REPLACE FUNCTION accept_invitation(p_invitation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_role    TEXT;
BEGIN
  -- 현재 유저 이메일로 온 pending 초대인지 검증 (auth.email()은 호출자 이메일 반환)
  SELECT plan_id, role
    INTO v_plan_id, v_role
    FROM plan_invitations
   WHERE id = p_invitation_id
     AND email = auth.email()
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION '유효하지 않은 초대입니다.';
  END IF;

  -- plan_members에 삽입 (이미 멤버라면 role 업데이트)
  INSERT INTO plan_members (plan_id, user_id, role)
  VALUES (v_plan_id, auth.uid(), v_role)
  ON CONFLICT (plan_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- 초대 상태를 accepted로 업데이트
  UPDATE plan_invitations
     SET status = 'accepted'
   WHERE id = p_invitation_id;
END;
$$;

-- ============================================================
-- 9. 초대 거절 함수 (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION reject_invitation(p_invitation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE plan_invitations
     SET status = 'rejected'
   WHERE id = p_invitation_id
     AND email = auth.email()
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION '유효하지 않은 초대입니다.';
  END IF;
END;
$$;

-- ============================================================
-- 10. 멤버 제거 함수 (SECURITY DEFINER)
--     오너가 멤버를 추방하거나 본인이 플랜을 나갈 때 사용합니다.
--     plan_members 삭제 + 해당 유저의 invitation 레코드 삭제 (재초대 허용)를 원자적으로 처리합니다.
--     * 클라이언트에서 auth.users.email을 직접 조회할 수 없으므로 서버 함수로 처리합니다.
-- ============================================================
CREATE OR REPLACE FUNCTION remove_member(p_plan_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- 오너이거나 본인인 경우만 허용
  IF NOT (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE id = p_plan_id AND user_id = auth.uid()
    )
    OR auth.uid() = p_user_id
  ) THEN
    RAISE EXCEPTION '권한이 없습니다.';
  END IF;

  -- 제거할 유저의 이메일 조회 (초대 레코드 삭제에 필요)
  SELECT email INTO v_user_email
    FROM auth.users
   WHERE id = p_user_id;

  -- plan_members에서 제거
  DELETE FROM plan_members
   WHERE plan_id = p_plan_id AND user_id = p_user_id;

  -- 해당 이메일의 초대 레코드 삭제 (재초대 시 UNIQUE 충돌 방지)
  IF v_user_email IS NOT NULL THEN
    DELETE FROM plan_invitations
     WHERE plan_id = p_plan_id AND email = v_user_email;
  END IF;
END;
$$;

-- ============================================================
-- 11. 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_plan_invitations_plan_id ON plan_invitations(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_invitations_email   ON plan_invitations(email);
CREATE INDEX IF NOT EXISTS idx_plan_invitations_status  ON plan_invitations(status);
CREATE INDEX IF NOT EXISTS idx_plan_members_plan_id     ON plan_members(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_members_user_id     ON plan_members(user_id);
