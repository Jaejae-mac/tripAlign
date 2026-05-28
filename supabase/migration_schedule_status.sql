-- ============================================================
-- schedule_items 방문 상태(status) 컬럼 추가/정합성 보정 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- 컬럼이 없으면 DEFAULT와 함께 추가, 이미 있으면 DEFAULT를 보장합니다.
-- ============================================================

ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'completed'));

-- 컬럼은 있으나 DEFAULT가 없는 경우 보정
ALTER TABLE schedule_items
  ALTER COLUMN status SET DEFAULT 'pending';

-- NOT NULL 컬럼이 기본값 없이 추가되어 NULL이 된 기존 행 보정
UPDATE schedule_items SET status = 'pending' WHERE status IS NULL;
