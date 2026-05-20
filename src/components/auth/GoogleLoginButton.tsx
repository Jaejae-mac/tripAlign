'use client'

/**
 * Google OAuth 로그인 버튼
 * 클릭 시 Supabase를 통해 Google OAuth 플로우를 시작합니다.
 *
 * iOS PWA(홈화면 앱)는 WKWebView에서 실행되므로 Google이 차단합니다.
 * 이 경우 skipBrowserRedirect로 URL을 받아 외부 Safari에서 열어 우회합니다.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/** iOS PWA 홈화면 standalone 모드 여부 */
function isIOSStandalone(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  return (
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback`

      if (isIOSStandalone()) {
        // iOS PWA: WKWebView를 우회하여 외부 Safari에서 OAuth 진행
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true },
        })
        if (error) throw error
        if (data.url) {
          window.open(data.url, '_blank')
          toast.info('Safari에서 로그인 완료 후 앱으로 돌아오세요.', {
            duration: 6000,
          })
        }
        setIsLoading(false)
      } else {
        // 일반 브라우저: 동일 탭 내 리다이렉트
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
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isLoading ? '로그인 중...' : 'Google로 계속하기'}
    </Button>
  )
}
