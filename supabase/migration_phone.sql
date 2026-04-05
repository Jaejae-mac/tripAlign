-- ============================================================
-- schedule_items 전화번호 컬럼 추가 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================
ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS phone TEXT;
