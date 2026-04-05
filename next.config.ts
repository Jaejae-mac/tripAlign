import type { NextConfig } from "next";

const securityHeaders = [
  // 클릭재킹 방어 — 다른 사이트의 iframe 안에서 렌더링 금지
  { key: 'X-Frame-Options', value: 'DENY' },
  // MIME 스니핑 방어 — Content-Type을 변경해 스크립트로 실행되는 공격 차단
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 리퍼러 정보 — 같은 출처에서만 전체 경로 전송, 외부로는 origin 만 전송
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 브라우저 권한 제한 — 카메라/마이크/위치 등 불필요한 API 비활성화
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // XSS 필터 (구형 브라우저용) — 탐지 시 페이지 렌더링 차단
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 모든 경로에 보안 헤더 적용
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
