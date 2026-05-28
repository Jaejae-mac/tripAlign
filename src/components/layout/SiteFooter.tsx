/**
 * 사이트 공통 푸터
 * 로그인 페이지·약관 동의 페이지 등 공개 화면 하단에 표시됩니다.
 * 약관 전문 열람 링크, 개인정보 담당자 연락처, 저작권을 제공합니다.
 */
import Link from 'next/link'
import { FileText, Mail } from 'lucide-react'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-8 pb-6 space-y-3" aria-label="사이트 푸터">

      {/* 약관 조회 링크 */}
      <nav
        aria-label="약관 링크"
        className="flex items-center justify-center gap-1 flex-wrap"
      >
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 min-h-11 text-xs text-muted-foreground hover:text-primary hover:bg-white/60 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          서비스 이용약관
        </Link>

        <span className="text-border text-xs select-none">·</span>

        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 min-h-11 text-xs text-muted-foreground hover:text-primary hover:bg-white/60 rounded-lg transition-colors duration-150 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          개인정보처리방침
        </Link>
      </nav>

      {/* 개인정보 담당자 연락처 */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Mail className="w-3.5 h-3.5 shrink-0" />
        <span>개인정보 문의</span>
        <a
          href="mailto:privacy@tripalign.app"
          className="hover:text-primary underline underline-offset-2 transition-colors duration-150 cursor-pointer"
        >
          privacy@tripalign.app
        </a>
      </div>

      {/* 저작권 */}
      <p className="text-center text-xs text-muted-foreground/60">
        © {currentYear} TripAlign. All rights reserved.
      </p>
    </footer>
  )
}
