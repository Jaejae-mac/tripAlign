/**
 * TripAlign Service Worker
 *
 * 전략:
 * - 정적 자산 (_next/static/*): Cache-first — 빌드 해시로 영구 캐시 (배포마다 새 해시)
 * - HTML 네비게이션: Network-first — 항상 최신 HTML을 가져와 청크 버전 불일치 방지
 *   오프라인일 때만 캐시 폴백 사용
 * - 이미지/폰트: Cache-first with network fallback
 * - API / Supabase: Network-only
 *
 * ⚠️ HTML을 stale-while-revalidate로 캐시하면 새 배포 후 이전 청크 URL을 참조해
 *    404가 발생하고 앱이 동작하지 않는 문제가 있으므로 network-first를 사용합니다.
 */

const STATIC_CACHE = 'tripalign-static-v2'
const SHELL_CACHE  = 'tripalign-shell-v2'

const SHELL_URLS = ['/', '/login']

// ── Install: 앱 셸 프리캐시 ────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  )
})

// ── Activate: 구버전 캐시 전체 삭제 ──────────────────────
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

  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return

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

  // HTML 네비게이션: Network-first
  // 새 배포 후 이전 HTML 캐시가 구 청크를 참조해 앱이 깨지는 문제 방지
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            caches.open(SHELL_CACHE).then((c) => c.put(request, res.clone()))
          }
          return res
        })
        .catch(() => caches.match(request)) // 오프라인 폴백
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
