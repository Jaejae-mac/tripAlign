# TripAlign TODO

> 아래 체크리스트는 Claude가 다음 작업 시 참조합니다.
> 완료된 항목은 `- [x]`로 표시하세요.

---

## Phase 8 — 빠른 성과 (예상 1-2일)

### 영수증 사진 첨부
- [x] `supabase/migration_expense_receipt.sql` — `expenses.receipt_url TEXT` 컬럼 추가
- [x] `storage.service.ts` 에 `uploadReceiptImage(planId, expenseId, file)` 함수 추가
- [x] `ExpenseAddDialog` — 사진 첨부 버튼 + 미리보기 추가
- [x] `ExpenseItemDetailDialog` — 영수증 이미지 전체 보기 추가
- [ ] Supabase 대시보드에서 `receipts` 버킷 생성 (public, 5MB, JPG/PNG/WebP)

### 다크모드
- [x] `src/app/globals.css` 에 `.dark body` 배경 및 `--brand-bg` 다크 변수 추가
- [x] `src/app/layout.tsx` 에 `ThemeProvider` 적용 (`next-themes` 이미 설치됨)
- [x] `src/components/ui/ThemeToggle.tsx` 생성 — Sun/Moon 아이콘 토글 버튼
- [x] `src/components/layout/Header.tsx` 에 ThemeToggle 버튼 추가
- [x] Header 배경 `bg-white/80` → `bg-card/80` (다크모드 대응)

---

## Phase 9 — 핵심 UX (예상 3-4일)

### 플래너 ↔ 가계부 연동
- [ ] `supabase/migration_schedule_cost.sql` — `schedule_items.estimated_cost NUMERIC`, `cost_currency TEXT` 컬럼 추가
- [ ] `ScheduleAddDrawer` — "예상 비용" 입력 필드 추가 (선택 항목)
- [ ] `expense.service.ts` — `getExpensesByDate(planId, date)` 함수 추가
- [ ] `DayCard` 하단에 **당일 실제 지출 미니 요약** 표시 (합계 + 외화 환산)
- [ ] 일정 카드에 **예상 vs 실제 비용** 비교 UI (예상 비용이 있을 때만 표시)

### 날씨 정보 연동
- [ ] OpenWeatherMap API 키 발급 → `.env.local` 에 `OPENWEATHERMAP_API_KEY` 추가
- [ ] `src/app/api/weather/route.ts` — 목적지 + 날짜 → 날씨 데이터 반환
- [ ] `src/services/weather.service.ts` — `fetchWeatherForecast(city, dates[])` 구현
- [ ] `DayCard` 상단에 날씨 아이콘 + 기온 표시 (맑음/흐림/비/눈)
- [ ] 플랜 상세 헤더에 여행 기간 날씨 요약 (5일치 미니 아이콘 줄)

---

## Phase 10 — 차별화 기능 (예상 5-7일)

### 지도 연동 (Kakao Maps 권장 / Google Maps 대안)
- [ ] Kakao Developers 앱 등록 → `.env.local` 에 `NEXT_PUBLIC_KAKAO_MAP_KEY` 추가
- [ ] `supabase/migration_schedule_location.sql` — `schedule_items.lat FLOAT`, `lng FLOAT` 컬럼 추가
- [ ] `ScheduleAddDrawer` — 장소 검색 입력창 추가 (Kakao 로컬 API)
- [ ] 검색 결과 선택 시 `lat`, `lng`, `location` 자동 입력
- [ ] `src/components/schedule/MapView.tsx` — 하루 일정 경로 지도 컴포넌트 생성
  - 방문 순서대로 번호 핀 + 경로 연결선 표시
  - 핀 클릭 → 해당 일정 상세 팝업
- [ ] `DayCard` 에 "지도 보기" 버튼 추가 → MapView 바텀 시트
- [ ] 플랜 상세에 "전체 경로 지도" 뷰 추가 (선택)

---

## 참고 사항

- Phase 11–13은 `memory/project_travel_wallet_future.md` 에 별도 메모됨
- Supabase Storage 버킷: `cover-images` 기존 버킷 재사용 or `receipts` 신규 버킷
- `schedule_items.location` 컬럼은 이미 DB에 존재 (문자열 → lat/lng 확장)
- `next-themes` 패키지 이미 `package.json`에 설치됨
