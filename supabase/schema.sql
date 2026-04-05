-- ============================================================
-- Travel Plan Wallet - Supabase DB 스키마
-- Supabase 대시보드 > SQL Editor에서 이 파일을 실행하세요
-- ============================================================

-- UUID 확장 활성화 (Supabase 기본 활성화됨)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 여행 플랜 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  destination      TEXT NOT NULL DEFAULT '',
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  cover_image      TEXT,
  -- 여행 예산 (선택 입력 — NULL 허용)
  budget           NUMERIC(14, 2) CHECK (budget >= 0),
  budget_currency  TEXT DEFAULT 'KRW'
                     CHECK (budget_currency IN ('KRW', 'USD', 'JPY', 'EUR', 'CNY')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 시작일은 종료일보다 이전이어야 함
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- ============================================================
-- 2. 날짜별 일정 카드 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS day_schedules (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id    UUID NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 플랜 내에서 날짜는 중복 불가 (upsert 지원)
  UNIQUE (plan_id, date)
);

-- ============================================================
-- 3. 시간별 일정 항목 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_schedule_id  UUID NOT NULL REFERENCES day_schedules(id) ON DELETE CASCADE,
  time             TIME NOT NULL,        -- 시작 시간 HH:mm 형식
  end_time         TIME,                 -- 종료 시간 HH:mm 형식 (선택)
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL DEFAULT 'etc'
                     CHECK (category IN ('food', 'tour', 'stay', 'transport', 'shopping', 'etc')),
  location         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- [마이그레이션] 기존 테이블에 end_time 컬럼 추가
-- 이미 테이블이 존재하는 경우 아래 SQL을 Supabase SQL Editor에서 실행하세요:
-- ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS end_time TIME;
-- ============================================================

-- ============================================================
-- 4. 지출(가계부) 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id    UUID NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  category   TEXT NOT NULL DEFAULT 'etc'
               CHECK (category IN ('food', 'transport', 'stay', 'tour', 'shopping', 'etc')),
  title      TEXT NOT NULL,
  amount     NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency   TEXT NOT NULL DEFAULT 'KRW'
               CHECK (currency IN ('KRW', 'USD', 'JPY', 'EUR', 'CNY')),
  memo       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS) 설정
-- 사용자는 자신의 데이터만 읽고 수정할 수 있습니다
-- ============================================================

ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- travel_plans: 본인 소유 데이터만 CRUD 허용
CREATE POLICY "travel_plans_owner_all" ON travel_plans
  FOR ALL USING (auth.uid() = user_id);

-- day_schedules: 플랜 소유자만 접근 허용
CREATE POLICY "day_schedules_owner_all" ON day_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = day_schedules.plan_id
        AND travel_plans.user_id = auth.uid()
    )
  );

-- schedule_items: day_schedule → plan 소유자 체인으로 확인
CREATE POLICY "schedule_items_owner_all" ON schedule_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM day_schedules
      JOIN travel_plans ON travel_plans.id = day_schedules.plan_id
      WHERE day_schedules.id = schedule_items.day_schedule_id
        AND travel_plans.user_id = auth.uid()
    )
  );

-- expenses: 플랜 소유자만 접근 허용
CREATE POLICY "expenses_owner_all" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM travel_plans
      WHERE travel_plans.id = expenses.plan_id
        AND travel_plans.user_id = auth.uid()
    )
  );

-- ============================================================
-- 인덱스 - 자주 조회하는 컬럼 최적화
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_travel_plans_user_id ON travel_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_day_schedules_plan_id ON day_schedules(plan_id);
CREATE INDEX IF NOT EXISTS idx_day_schedules_date ON day_schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_day_id ON schedule_items(day_schedule_id);
CREATE INDEX IF NOT EXISTS idx_expenses_plan_id ON expenses(plan_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
