/**
 * 환율 API 라우트
 * open.er-api.com (USD 기준, KRW 포함 170+ 통화 지원)에서 환율을 가져옵니다.
 * frankfurter.app(ECB 기준)은 KRW를 미지원하므로 사용 불가.
 *
 * Next.js 권장 캐시 패턴: 모듈 레벨 revalidate + fetch cache: 'force-cache'
 */

export const revalidate = 3600 // 서버에서 1시간마다 갱신

// 자체 도메인에서만 호출 가능하도록 CORS 제한
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET',
}

export async function GET() {
  try {
    // USD 기준으로 모든 통화(KRW 포함) 환율 조회
    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { cache: 'force-cache' }
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    return Response.json(data, { headers: corsHeaders })
  } catch {
    return Response.json(
      { error: '환율 정보를 가져오지 못했습니다.' },
      { status: 500, headers: corsHeaders }
    )
  }
}
