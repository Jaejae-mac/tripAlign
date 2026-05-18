/**
 * TripAlign Service Worker
 *
 * 전략:
 * - 정적 자산 (_next/static/*): Cache-first — 빌드 해시로 영구 캐시
 * - HTML 네비게이션: Stale-while-revalidate — 캐시 셸을 즉시 표시 후 백그라운드 갱신
 * - API 요청 / Supabase: Network-only — 항상 최신 데이터 사용
 */

const STATIC_CACHE = 'tripalign-static-v1'
const SHELL_CACHE  = 'tripalign-shell-v1'

// 앱 셸 URL 목록 (빌드 후 실제 _next 경로 자동 수집)
const SHELL_URLS = ['/', '/login']

// ── Install: 앱 셸 프리캐시 ────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // 네트워크 오류 시에도 설치가 실패하지 않도록 개별 처리
      Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  )
})

// ── Activate: 구버전 캐시 정리 ────────────────────────────
self.addEventListener('activate', (e) => {
  const valid = new Set([STATIC_CACHE, SHELL_CACHE])
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !valid.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: 요청 유형별 캐싱 전략 ─────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // 다른 origin 요청은 서비스 워커가 처리하지 않음 (Supabase API 등)
  if (url.origin !== self.location.origin) return

  // POST / non-GET 요청은 캐시하지 않음
  if (request.method !== 'GET') return

  // 정적 자산: Cache-first (빌드 해시로 변경 없음 보장)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()))
            }
            return res
          })
      )
    )
    return
  }

  // HTML 네비게이션: Stale-while-revalidate
  // 캐시된 셸을 즉시 반환하면서 백그라운드에서 최신 버전을 받아 업데이트
  if (request.mode === 'navigate') {
    e.respondWith(
      caches.open(SHELL_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((res) => {
              if (res.ok) {
                cache.put(request, res.clone())
              }
              return res
            })
            .catch(() => cached) // 오프라인 시 캐시 폴백

          // 캐시가 있으면 즉시 반환 (검은 화면 방지), 없으면 네트워크 대기
          return cached || networkFetch
        })
      })
    )
    return
  }

  // 이미지/폰트: Cache-first with network fallback
  if (
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()))
            }
            return res
          })
      )
    )
  }
})
