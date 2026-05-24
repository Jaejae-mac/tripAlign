/**
 * 개인정보처리방침 전문 페이지
 * 약관 동의 화면의 "개인정보처리방침 보기" 링크를 통해 접근하며, 로그인 없이도 열람 가능합니다.
 * Google OAuth를 통해 수집되는 개인정보 항목을 명시합니다.
 */
'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// 현재 개인정보처리방침 버전
const PRIVACY_VERSION = '2026년 4월 9일'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">개인정보처리방침</h1>
      </header>

      {/* 본문 */}
      <main className="max-w-2xl mx-auto px-5 py-8 text-sm text-foreground leading-relaxed space-y-8">
        <div className="text-muted-foreground text-xs">
          최종 개정일: {PRIVACY_VERSION}
        </div>

        <p>
          TripAlign(이하 "회사")은 개인정보보호법 및 정보통신망 이용촉진 및 정보보호 등에 관한
          법률(이하 "정보통신망법")에 따라 이용자의 개인정보를 보호하고, 이와 관련된 권리를
          보장하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        {/* 제1조 */}
        <section className="space-y-3">
          <h2 className="font-bold text-base">제1조 (수집하는 개인정보 항목 및 수집 방법)</h2>

          <div className="space-y-1">
            <p className="font-medium">1. 수집 항목</p>
            <p className="text-muted-foreground mb-2">
              회사는 Google OAuth 2.0 소셜 로그인을 통해 다음 정보를 수집합니다.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium border-b border-border pb-2">
                <span>수집 항목</span>
                <span>수집 목적</span>
                <span>필수 여부</span>
              </div>
              {[
                ['이메일 주소', '회원 식별·로그인·공유 초대', '필수'],
                ['프로필 이름(표시명)', '서비스 내 닉네임 표시', '필수'],
                ['Google 고유 식별자(UID)', '계정 연동 및 인증', '필수'],
                ['프로필 사진 URL', '프로필 이미지 표시', '선택'],
              ].map(([item, purpose, required]) => (
                <div key={item} className="grid grid-cols-3 gap-2 text-xs">
                  <span>{item}</span>
                  <span className="text-muted-foreground">{purpose}</span>
                  <span className={required === '필수' ? 'text-destructive' : 'text-muted-foreground'}>
                    {required}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-medium">2. 수집 방법</p>
            <p>Google LLC에서 제공하는 OAuth 2.0 인증 흐름을 통해 이용자의 동의 하에 수집합니다.</p>
          </div>

          <div className="space-y-1">
            <p className="font-medium">3. 제3자(Google) 정보 수신</p>
            <p>
              회사는 Google LLC로부터 위 항목의 정보를 제공받습니다. Google의 개인정보처리방침은{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                https://policies.google.com/privacy
              </a>
              에서 확인하실 수 있습니다.
            </p>
          </div>
        </section>

        {/* 제2조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제2조 (개인정보의 수집·이용 목적)</h2>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>회원 가입 및 본인 확인</li>
            <li>서비스 제공 및 운영 (여행 플랜, 일정, 지출 관리)</li>
            <li>플랜 공유 및 협업 기능 제공 (이메일 기반 초대)</li>
            <li>부정 이용 방지 및 서비스 개선</li>
            <li>법령에 따른 의무 이행</li>
          </ol>
        </section>

        {/* 제3조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제3조 (개인정보의 보유 및 이용 기간)</h2>
          <p>
            수집된 개인정보는 회원 탈퇴 시까지 보유·이용합니다.
            단, 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-medium border-b border-border pb-2">
              <span>관련 법령</span>
              <span>보존 기간</span>
            </div>
            {[
              ['전자상거래법: 계약·청약철회 기록', '5년'],
              ['전자상거래법: 소비자 불만·분쟁 처리 기록', '3년'],
              ['통신비밀보호법: 서비스 방문 기록', '3개월'],
            ].map(([law, period]) => (
              <div key={law} className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">{law}</span>
                <span>{period}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 제4조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제4조 (개인정보의 제3자 제공)</h2>
          <p>
            회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            단, 다음의 경우는 예외로 합니다.
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>이용자가 사전에 동의한 경우 (예: 플랜 공유 시 상대방에게 이름·이메일 표시)</li>
            <li>법령의 규정에 의하거나 수사 기관의 요청이 있는 경우</li>
          </ol>
        </section>

        {/* 제5조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제5조 (개인정보의 처리 위탁)</h2>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-medium border-b border-border pb-2">
              <span>수탁 업체</span>
              <span>위탁 업무</span>
            </div>
            {[
              ['Supabase Inc.', '데이터베이스 및 인증 서비스 운영'],
              ['Vercel Inc.', '서비스 호스팅 및 CDN'],
            ].map(([company, task]) => (
              <div key={company} className="grid grid-cols-2 gap-2 text-xs">
                <span>{company}</span>
                <span className="text-muted-foreground">{task}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 제6조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제6조 (이용자의 권리 및 행사 방법)</h2>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ol>
          <p className="text-muted-foreground">
            회원 탈퇴를 통해 개인정보의 삭제를 직접 처리할 수 있습니다.
            그 밖의 권리 행사는 개인정보보호 담당자에게 이메일로 요청하세요.
          </p>
        </section>

        {/* 제7조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제7조 (개인정보 자동 수집 장치의 설치·운영 및 거부)</h2>
          <p>
            회사는 서비스 개선을 위해 세션 쿠키를 사용합니다.
            브라우저 설정에서 쿠키를 거부할 수 있으나, 이 경우 로그인 유지 등 일부 기능이 제한될 수 있습니다.
          </p>
        </section>

        {/* 제8조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제8조 (개인정보보호 담당자)</h2>
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
            <p><span className="font-medium">담당자:</span> TripAlign 개인정보보호 담당자</p>
            <p>
              <span className="font-medium">이메일:</span>{' '}
              <a
                href="mailto:privacy@tripalign.app"
                className="text-primary underline underline-offset-2"
              >
                privacy@tripalign.app
              </a>
            </p>
          </div>
        </section>

        <div className="pt-4 pb-8 text-xs text-muted-foreground border-t border-border">
          이 개인정보처리방침은 {PRIVACY_VERSION}부터 시행됩니다.
        </div>
      </main>
    </div>
  )
}
