-- ============================================================
-- [마이그레이션] cover-images Storage 버킷 생성 및 RLS 정책 설정
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ============================================================

-- ============================================================
-- 1. cover-images 버킷 생성 (public, 5MB 제한)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cover-images',
  'cover-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================================
-- 2. RLS 정책 설정
-- 파일 경로 규칙: {userId}/{planId}.{ext}
-- → (storage.foldername(name))[1] 이 userId와 일치해야 업로드 허용
-- ============================================================

-- 2-1. 공개 읽기 — 누구나 이미지 URL로 조회 가능 (Public 버킷)
CREATE POLICY "cover_images_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'cover-images');

-- 2-2. 인증된 사용자: 자신의 폴더({userId}/)에만 업로드
CREATE POLICY "cover_images_auth_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cover-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2-3. 인증된 사용자: 자신의 이미지 덮어쓰기 (upsert 옵션에 필요)
CREATE POLICY "cover_images_auth_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'cover-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2-4. 인증된 사용자: 자신의 이미지 삭제
CREATE POLICY "cover_images_auth_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cover-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
