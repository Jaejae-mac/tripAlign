'use client'

/**
 * next-themes의 ThemeProvider를 서버 컴포넌트(layout.tsx)에서 사용할 수 있도록
 * 클라이언트 컴포넌트로 래핑합니다.
 * attribute="class": html 태그에 "dark" 클래스를 추가/제거하는 방식으로 테마 전환
 */
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
