/**
 * TripAlign Service Worker
 *
 * 전략:
 * - 정적 자산 (_next/static/*): Cache-first — 빌드 해시로 영구 캐시 (배포마다 새 해시)
 * - HTML 네비게이션: SW 미개입 — 브라우저가 직접 처리
 * - 이미지/폰트: Cache-first with network fallback
 * - API / Supabase: Network-only
 *
 * ⚠️ navigate 요청을 SW가 가로채면 proxy.ts의 서버 리다이렉트(미인증 → /login 등)가
 *    opaqueredirect 응답으로 돌아오고, Safari PWA는 이를 엄격히 차단합니다:
 *    "Response served by service worker has redirections"
 *    따라서 navigate 요청은 SW를 통과시키지 않고 브라우저가 직접 처리하도록 합니다.
 */

const STATIC_CACHE = 'tripalign-static-v4'

// ── Install: skipWaiting으로 즉시 활성화 ──────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting())
})

// ── Activate: 구버전 캐시 전체 삭제 ──────────────────────
self.addEventListener('activate', (e) => {
  const valid = new Set([STATIC_CACHE])
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

  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return

  // HTML 네비게이션: SW 미개입
  // proxy.ts가 서버 사이드 리다이렉트를 발생시키는데, SW가 navigate를 가로채면
  // fetch(request)는 redirect:'manual' 모드로 동작해 opaqueredirect를 반환합니다.
  // Safari는 respondWith(opaqueredirect)를 에러로 처리하므로 SW가 개입하지 않습니다.
  if (request.mode === 'navigate') return

  // 정적 자산: Cache-first (빌드 해시가 다르면 자동으로 새 파일 요청됨)
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

  // 이미지/폰트: Cache-first with network fallback
  if (request.destination === 'image' || request.destination === 'font') {
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
