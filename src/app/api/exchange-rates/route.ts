/**
 * 환율 API 라우트
 * - 날짜 없음: open.er-api.com (USD 기준, KRW 포함 170+ 통화) — 오늘 환율
 * - ?date=YYYY-MM-DD: fawaz-ahmed/currency-api — 역사적 환율 (무료, 키 불필요)
 *
 * 두 API 모두 같은 { base_code, rates } 형태로 반환해 파싱 로직을 통일합니다.
 */

export const revalidate = 3600 // 서버에서 1시간마다 갱신

// 자체 도메인에서만 호출 가능하도록 CORS 제한
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') // "2024-03-06" | null

  try {
    if (date) {
      // 역사적 환율: fawaz-ahmed/currency-api (과거 날짜 → 영구 캐시)
      const res = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`,
        { cache: 'force-cache' }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // fawaz-ahmed 응답: { "usd": { "krw": 1333.14, "eur": 0.9218, ... } }
      // → 기존 OpenExchangeRateResponse 포맷으로 변환해 파싱 로직 재사용
      return Response.json(
        {
          base_code: 'USD',
          rates: {
            KRW: data.usd?.krw,
            USD: 1,
            EUR: data.usd?.eur,
            JPY: data.usd?.jpy,
            CNY: data.usd?.cny,
          },
        },
        { headers: corsHeaders }
      )
    }

    // 오늘 환율: 기존 open.er-api.com (KRW 포함 직접 지원)
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
