-- ============================================================
-- plan_exchange_rates 테이블
-- 플랜별 통화 환율 설정을 저장합니다.
-- mode = 'auto'  → API 환율 사용 (기본값)
-- mode = 'manual' → custom_rate / unit 으로 직접 입력한 환율 사용
-- ============================================================

CREATE TABLE plan_exchange_rates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID        NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  currency    TEXT        NOT NULL,                -- 'USD' | 'JPY' | 'EUR' | 'CNY'
  custom_rate NUMERIC(14, 4) NOT NULL DEFAULT 0,  -- unit 기준 KRW 금액 (예: 100 JPY = 964 KRW → 964)
  unit        INTEGER     NOT NULL DEFAULT 1,      -- 기준 단위 (JPY: 100, 나머지: 1)
  mode        TEXT        NOT NULL DEFAULT 'auto', -- 'auto' | 'manual'
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, currency)                       -- 플랜당 통화별 1행만 허용
);

-- RLS 활성화
ALTER TABLE plan_exchange_rates ENABLE ROW LEVEL SECURITY;

-- 플랜 소유자: 전체 CRUD 허용
CREATE POLICY "owner_all" ON plan_exchange_rates
  USING (
    plan_id IN (
      SELECT id FROM travel_plans WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    plan_id IN (
      SELECT id FROM travel_plans WHERE user_id = auth.uid()
    )
  );

-- 공유 멤버: 읽기만 허용
CREATE POLICY "member_read" ON plan_exchange_rates
  FOR SELECT
  USING (
    plan_id IN (
      SELECT plan_id FROM plan_members WHERE user_id = auth.uid()
    )
  );

-- plan_id 기준 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_plan_exchange_rates_plan_id
  ON plan_exchange_rates (plan_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_plan_exchange_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plan_exchange_rates_updated_at
  BEFORE UPDATE ON plan_exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_exchange_rates_updated_at();
