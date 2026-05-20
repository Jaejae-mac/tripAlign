'use client'

/**
 * Google OAuth 로그인 버튼
 * - 일반 브라우저: 동일 탭 리다이렉트
 * - iOS PWA standalone: 외부 Safari에서 OAuth (WKWebView 우회)
 * - 인앱 브라우저(카카오톡·인스타 등): 외부 브라우저 유도 안내
 */
import { useState, useEffect } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type BrowserEnv = 'normal' | 'ios-pwa' | 'inapp'

function detectEnv(): BrowserEnv {
  if (typeof navigator === 'undefined') return 'normal'
  const ua = navigator.userAgent

  // 주요 인앱 브라우저 UA 감지
  if (/KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|Line\/|NAVER|NaverSearch|MicroMessenger/i.test(ua)) {
    return 'inapp'
  }
  // iOS PWA 홈화면 standalone 모드
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) {
    return 'ios-pwa'
  }
  return 'normal'
}

function getAppName(ua: string): string {
  if (/KAKAOTALK/i.test(ua)) return '카카오톡'
  if (/Instagram/i.test(ua)) return '인스타그램'
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return '페이스북'
  if (/Line\//i.test(ua)) return 'LINE'
  if (/NAVER|NaverSearch/i.test(ua)) return '네이버'
  if (/MicroMessenger/i.test(ua)) return '위챗'
  return '현재 앱'
}

// ── 인앱 브라우저 안내 ─────────────────────────────────────────
function InAppBrowserNotice() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const appName = getAppName(ua)
  const isAndroid = /Android/i.test(ua)
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const [copied, setCopied] = useState(false)

  const openExternal = () => {
    if (isAndroid) {
      // Android: intent URL로 Chrome 강제 오픈
      window.location.href =
        'intent://' +
        url.replace(/^https?:\/\//, '') +
        '#Intent;scheme=https;action=android.intent.action.VIEW;end'
    } else {
      // iOS: window.open으로 Safari 오픈 시도
      window.open(url, '_blank')
    }
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('주소 복사에 실패했습니다.')
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex gap-2.5">
        <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
        <p className="text-sm text-amber-800 leading-snug">
          <strong>{appName}</strong> 내 브라우저에서는 Google 로그인을 사용할 수 없습니다.
          {isAndroid
            ? ' 아래 버튼으로 외부 브라우저에서 열어주세요.'
            : ' Safari에서 열어주세요.'}
        </p>
      </div>

      <Button
        onClick={openExternal}
        className="w-full gap-2 cursor-pointer"
        style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
      >
        <ExternalLink className="w-4 h-4" />
        외부 브라우저에서 열기
      </Button>

      {/* iOS는 programmatic open이 막히는 경우가 있어 URL 복사 제공 */}
      {!isAndroid && (
        <button
          onClick={copyUrl}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '복사됨' : '주소 복사 후 Safari에 붙여넣기'}
        </button>
      )}
    </div>
  )
}

// ── Google 로그인 버튼 ─────────────────────────────────────────
export function GoogleLoginButton() {
  const [env, setEnv] = useState<BrowserEnv>('normal')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setEnv(detectEnv())
  }, [])

  // 인앱 브라우저: 버튼 대신 안내 UI 표시
  if (env === 'inapp') {
    return <InAppBrowserNotice />
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback`

      if (env === 'ios-pwa') {
        // iOS PWA: WKWebView를 우회하여 외부 Safari에서 OAuth 진행
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true },
        })
        if (error) throw error
        if (data.url) {
          window.open(data.url, '_blank')
          toast.info('Safari에서 로그인 완료 후 앱으로 돌아오세요.', { duration: 6000 })
        }
        setIsLoading(false)
      } else {
        // 일반 브라우저: 동일 탭 리다이렉트
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        })
        if (error) throw error
      }
    } catch {
      toast.error('Google 로그인에 실패했습니다. 다시 시도해 주세요.')
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="w-full h-11 gap-3 bg-white hover:bg-gray-50 text-gray-700 border border-border font-medium cursor-pointer transition-colors duration-200"
      variant="outline"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {isLoading ? '로그인 중...' : 'Google로 계속하기'}
    </Button>
  )
}
