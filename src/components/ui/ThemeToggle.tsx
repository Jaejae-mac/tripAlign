'use client'

/**
 * 라이트/다크 모드를 전환하는 토글 버튼
 * 라이트 모드에서는 Moon 아이콘, 다크 모드에서는 Sun 아이콘을 표시합니다.
 */
import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // 서버/클라이언트 hydration 불일치 방지 — 마운트 전에는 아이콘을 렌더하지 않음
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return <div className="w-8 h-8" />
  }

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="w-8 h-8 cursor-pointer text-muted-foreground hover:text-foreground"
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </Button>
  )
}
