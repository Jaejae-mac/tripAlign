-- =============================================================
-- expenses 테이블 — 건별 환율 지정 지원 컬럼 추가
--
-- rate_mode = 'plan'   : 기존 플랜 환율(자동 API / 플랜 수동) 사용
-- rate_mode = 'custom' : 이 지출 건에만 적용할 환율을 직접 지정
--
-- exchange_rate: unit 기준 KRW 금액
--   예) 100 JPY = 964 KRW → exchange_rate = 964, unit = 100
--   예)   1 USD = 1380 KRW → exchange_rate = 1380, unit = 1
-- =============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS rate_mode TEXT NOT NULL DEFAULT 'plan'
    CHECK (rate_mode IN ('plan', 'custom')),
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS unit INTEGER NOT NULL DEFAULT 1;
