-- Phase 8: 지출 항목에 영수증 이미지 URL 컬럼 추가
-- Supabase Storage 버킷 'receipts'에 업로드된 이미지의 public URL을 저장합니다.
--
-- ⚠️ Supabase Storage 버킷 생성 필요:
--   1. Supabase 대시보드 → Storage → New Bucket
--   2. Bucket Name: receipts
--   3. Public bucket: ON (공개 URL로 이미지 접근)
--   4. File size limit: 5 MB
--   5. Allowed MIME types: image/jpeg, image/png, image/webp

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Storage 접근 정책: 인증된 사용자만 자신의 폴더에 업로드/삭제 가능
-- (아래 정책은 Supabase 대시보드 Storage 정책 탭에서 설정하거나 별도 마이그레이션으로 적용)
-- INSERT: bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
-- DELETE: bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
-- SELECT: bucket_id = 'receipts' (public read)
