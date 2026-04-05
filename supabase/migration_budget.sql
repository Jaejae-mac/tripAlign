-- ============================================================
-- [마이그레이션] travel_plans 테이블에 budget 컬럼 추가
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================

-- 예산 금액 컬럼 추가 (선택 입력이므로 NULL 허용)
ALTER TABLE travel_plans
  ADD COLUMN IF NOT EXISTS budget NUMERIC(14, 2) CHECK (budget >= 0);

-- 예산 통화 코드 컬럼 추가 (기본값 'KRW')
ALTER TABLE travel_plans
  ADD COLUMN IF NOT EXISTS budget_currency TEXT DEFAULT 'KRW'
    CHECK (budget_currency IN ('KRW', 'USD', 'JPY', 'EUR', 'CNY'));
