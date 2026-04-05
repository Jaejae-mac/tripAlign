'use client'

/**
 * 앱 공통 헤더
 * 로고, 사용자 아바타, 로그아웃 메뉴를 포함합니다.
 */
import { useRouter } from 'next/navigation'
import { MapPin, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  /** 로그아웃 처리 후 로그인 페이지로 이동 */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('로그아웃되었습니다.')
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('로그아웃에 실패했습니다.')
    }
  }

  // 사용자 이름 첫 글자 (아바타 폴백용)
  const userInitial =
    user.user_metadata?.full_name?.charAt(0) ??
    user.email?.charAt(0)?.toUpperCase() ??
    'U'

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 — 클릭 시 메인 페이지로 이동 */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity duration-150"
          aria-label="메인 페이지로 이동"
        >
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base text-foreground">
            TripAlign
          </span>
        </button>

        {/* 사용자 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full cursor-pointer">
              <Avatar className="w-8 h-8 border-2 border-border">
                <AvatarImage
                  src={user.user_metadata?.avatar_url}
                  alt={user.user_metadata?.full_name ?? '사용자'}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">
                {user.user_metadata?.full_name ?? '사용자'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
