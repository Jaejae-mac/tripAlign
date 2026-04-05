'use client'

/**
 * 커버 이미지 업로드 컴포넌트
 * 파일 선택 → Supabase Storage 업로드 → 미리보기를 한 번에 처리합니다.
 * PlanCreateDialog와 PlanEditDialog 양쪽에서 재사용됩니다.
 */
import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, X, Loader2 } from 'lucide-react'
import { uploadCoverImage } from '@/services/storage.service'
import { toast } from 'sonner'

interface CoverImageUploadProps {
  /** 현재 표시 중인 이미지 URL (편집 시 기존 값, 없으면 null) */
  value: string | null
  /** 업로드 완료 후 새 URL이, 제거 시 null이 전달됩니다 */
  onChange: (url: string | null) => void
  userId: string
  /** 이미지 파일 경로에 사용되는 플랜 ID */
  planId: string
}

export function CoverImageUpload({
  value,
  onChange,
  userId,
  planId,
}: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  /** 파일 선택 후 즉시 Storage에 업로드하고 URL을 부모에 전달 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일만 허용 (MIME 타입 검증)
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    // 5MB 이하만 허용
    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // userId가 아직 로드되지 않은 경우 업로드 차단
    // (다이얼로그 open 직후 비동기로 userId를 가져오는 타이밍 이슈 방어)
    if (!userId) {
      toast.error('잠시 후 다시 시도해주세요.')
      return
    }

    setIsUploading(true)
    try {
      const url = await uploadCoverImage(userId, planId, file)
      onChange(url)
    } catch {
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
      // 같은 파일 재선택도 가능하도록 input 초기화
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  /** 이미지 제거 — Storage 삭제는 폼 저장 시 처리, 여기서는 UI만 초기화 */
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div className="space-y-1.5">
      {/* 숨겨진 파일 입력 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 업로드 영역 */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`
          relative w-full h-36 rounded-xl border-2 overflow-hidden
          transition-colors duration-200
          ${value
            ? 'border-border cursor-default'
            : 'border-dashed border-border hover:border-primary/50 cursor-pointer bg-secondary/30'
          }
        `}
      >
        {value ? (
          <>
            {/* 업로드된 이미지 미리보기 */}
            <Image
              src={value}
              alt="커버 이미지 미리보기"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 448px"
              // cache-busting: 방금 업로드한 이미지가 CDN 캐시 없이 바로 표시되도록
              unoptimized
            />
            {/* 어두운 오버레이 — X 버튼 가독성 향상 */}
            <div className="absolute inset-0 bg-black/20" />
            {/* 이미지 제거 버튼 */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors cursor-pointer"
              aria-label="이미지 제거"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {/* 클릭해서 변경 안내 */}
            <div className="absolute bottom-2 left-2">
              <span
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded-full cursor-pointer hover:bg-black/60 transition-colors"
              >
                클릭하여 변경
              </span>
            </div>
          </>
        ) : (
          /* 이미지 없을 때 — 업로드 유도 UI */
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Camera className="w-7 h-7 opacity-50" />
            <span className="text-xs">커버 이미지 추가 (선택)</span>
            <span className="text-xs opacity-60">JPG, PNG, WebP · 최대 5MB</span>
          </div>
        )}

        {/* 업로드 중 오버레이 */}
        {isUploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
