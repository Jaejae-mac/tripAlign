-- ============================================================
-- Phase 10: Google Maps 지도 연동 마이그레이션
-- schedule_items 테이블에 좌표 및 장소 ID 컬럼 추가
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS lat       NUMERIC(9, 6),  -- 위도 (Google Places 선택 시 자동 입력)
  ADD COLUMN IF NOT EXISTS lng       NUMERIC(9, 6),  -- 경도 (Google Places 선택 시 자동 입력)
  ADD COLUMN IF NOT EXISTS place_id  TEXT;           -- Google Places ID (평점·영업시간 재조회용)

-- place_id 기반 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_schedule_items_place_id
  ON schedule_items(place_id);
