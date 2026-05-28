/**
 * 서비스 이용약관 전문 페이지
 * 약관 동의 화면의 "약관 보기" 링크를 통해 접근하며, 로그인 없이도 열람 가능합니다.
 */
'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// 현재 약관 버전 (약관 개정 시 업데이트)
const TERMS_VERSION = '2026년 4월 9일'

export default function TermsPage() {
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
        <h1 className="text-base font-semibold">서비스 이용약관</h1>
      </header>

      {/* 약관 본문 */}
      <main className="max-w-2xl mx-auto px-5 py-8 text-sm text-foreground leading-relaxed space-y-8">
        <div className="text-muted-foreground text-xs">
          최종 개정일: {TERMS_VERSION}
        </div>

        {/* 제1조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제1조 (목적)</h2>
          <p>
            이 약관은 TripAlign 서비스(이하 "서비스")를 운영·제공하는 운영자(이하 "회사")와
            서비스를 이용하는 회원(이하 "회원") 사이의 권리·의무 및 책임사항,
            기타 필요한 사항을 규정하는 것을 목적으로 합니다.
          </p>
        </section>

        {/* 제2조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제2조 (정의)</h2>
          <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>"서비스"란 회사가 제공하는 여행 일정 관리 및 지출 기록 웹 서비스를 의미합니다.</li>
            <li>"회원"이란 서비스에 접속하여 이 약관에 동의하고 회사와 이용계약을 체결한 자를 의미합니다.</li>
            <li>"계정"이란 회원의 식별 및 서비스 이용을 위해 회원이 설정하고 회사가 인증한 이메일 주소 등의 정보를 의미합니다.</li>
            <li>"콘텐츠"란 회원이 서비스 내에서 작성·등록·저장한 여행 플랜, 일정, 지출 내역 등 일체의 정보를 의미합니다.</li>
          </ol>
        </section>

        {/* 제3조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제3조 (약관의 효력 및 변경)</h2>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>이 약관은 회원이 동의한 시점부터 효력이 발생합니다.</li>
            <li>
              회사는 합리적인 사유가 있을 경우 약관을 변경할 수 있으며,
              변경된 약관은 적용일로부터 최소 7일 전(불이익 변경의 경우 30일 전)에
              서비스 공지사항 또는 이메일을 통해 고지합니다.
            </li>
            <li>고지 기간 내에 이의 없이 서비스를 계속 이용하면 변경 약관에 동의한 것으로 간주합니다.</li>
          </ol>
        </section>

        {/* 제4조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제4조 (이용계약의 체결)</h2>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>이용계약은 회원이 이 약관에 동의하고 서비스 가입을 신청하면 성립합니다.</li>
            <li>회사는 다음 각 호의 경우 가입 신청을 승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다.
              <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                <li>타인의 명의·정보를 도용한 경우</li>
                <li>만 14세 미만인 경우</li>
                <li>부정한 목적으로 서비스를 이용하려는 경우</li>
              </ul>
            </li>
          </ol>
        </section>

        {/* 제5조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제5조 (서비스의 제공 및 변경)</h2>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>회사는 다음 서비스를 제공합니다.
              <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                <li>여행 플랜 작성·관리 서비스</li>
                <li>일정 및 지출 기록 서비스</li>
                <li>플랜 공유 및 협업 서비스</li>
                <li>기타 회사가 정하는 서비스</li>
              </ul>
            </li>
            <li>회사는 서비스의 내용을 변경할 경우 변경 사유와 내용을 사전에 공지합니다.</li>
            <li>서비스는 연중무휴 24시간 제공을 원칙으로 하나, 점검·장애 발생 시 일시 중단될 수 있습니다.</li>
          </ol>
        </section>

        {/* 제6조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제6조 (회원의 의무)</h2>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>회원은 서비스 이용 시 관련 법령 및 이 약관을 준수하여야 합니다.</li>
            <li>회원은 타인의 권리를 침해하거나 불법·유해한 콘텐츠를 등록·유포하여서는 안 됩니다.</li>
            <li>회원은 자신의 계정·비밀번호를 타인에게 양도·대여하여서는 안 됩니다.</li>
            <li>회원은 회사의 사전 동의 없이 서비스를 영리 목적으로 이용하여서는 안 됩니다.</li>
          </ol>
        </section>

        {/* 제7조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제7조 (콘텐츠의 관리)</h2>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>회원이 서비스 내에 등록한 콘텐츠의 저작권은 회원에게 귀속됩니다.</li>
            <li>
              회원은 서비스 이용 목적 범위 내에서 콘텐츠를 이용할 수 있도록
              회사에 비독점적·무상의 이용권을 부여합니다.
            </li>
            <li>회원이 탈퇴하면 회원이 등록한 콘텐츠는 즉시 삭제됩니다. 단, 타인에게 공유된 콘텐츠는 예외가 있을 수 있습니다.</li>
          </ol>
        </section>

        {/* 제8조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제8조 (책임 제한)</h2>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>회사는 천재지변, 불가항력적 사유로 서비스를 제공하지 못한 경우 책임이 면제됩니다.</li>
            <li>회사는 회원이 서비스를 이용하여 발생한 손해(콘텐츠 손실, 개인 판단에 의한 거래 등)에 대해 책임을 지지 않습니다.</li>
            <li>회사는 무료로 제공되는 서비스 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 손해배상 책임을 지지 않습니다.</li>
          </ol>
        </section>

        {/* 제9조 */}
        <section className="space-y-2">
          <h2 className="font-bold text-base">제9조 (분쟁 해결)</h2>
          <p>
            서비스와 관련하여 분쟁이 발생한 경우, 회사와 회원은 원만한 해결을 위해
            성실히 협의합니다. 협의가 이루어지지 않을 경우 관할 법원은 민사소송법에 따릅니다.
          </p>
        </section>

        <div className="pt-4 pb-8 text-xs text-muted-foreground border-t border-border">
          부칙: 이 약관은 {TERMS_VERSION}부터 시행됩니다.
        </div>
      </main>
    </div>
  )
}
