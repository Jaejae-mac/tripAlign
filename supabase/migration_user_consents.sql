-- =====================================================
-- user_consents: 약관 동의 이력 테이블
-- 신규 유저가 서비스 이용약관·개인정보처리방침에 동의한 기록을 저장합니다.
-- 약관 개정 시 terms_version / privacy_version 상수를 올려 재동의를 유도할 수 있습니다.
-- =====================================================

CREATE TABLE IF NOT EXISTS user_consents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- auth.users 와 연결 — 탈퇴 시 자동 삭제
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 동의한 약관 버전 (날짜 문자열: 'YYYY-MM-DD')
  terms_version    TEXT NOT NULL,
  privacy_version  TEXT NOT NULL,

  -- 만 14세 이상 확인 (법적 동의 유효 조건)
  age_confirmed    BOOLEAN NOT NULL DEFAULT FALSE,

  -- 선택 동의: 마케팅 수신 (필수 항목과 물리적으로 분리된 컬럼)
  marketing_agreed BOOLEAN NOT NULL DEFAULT FALSE,

  -- 동의 일시
  consented_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 유저당 하나의 레코드만 허용 → upsert(onConflict: 'user_id') 패턴 지원
  UNIQUE (user_id)
);

-- RLS 활성화 — 인증된 본인 데이터만 읽기/쓰기 허용
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_consents_owner_all"
  ON user_consents
  FOR ALL
  USING (auth.uid() = user_id);

-- user_id 조회 성능 최적화 (미들웨어에서 매 요청마다 조회)
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id
  ON user_consents (user_id);
