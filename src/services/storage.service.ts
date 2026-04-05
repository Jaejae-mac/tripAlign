/**
 * Supabase Storage 서비스
 * 여행 플랜 커버 이미지 업로드 및 삭제를 담당합니다.
 *
 * 버킷: cover-images (public)
 * 파일 경로 규칙: {userId}/{planId}.{ext}
 *   - 같은 플랜 ID로 재업로드 시 upsert로 덮어씌워 파일이 중복 생성되지 않음
 */
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'cover-images'

/**
 * 커버 이미지를 Storage에 업로드하고 public URL을 반환합니다.
 * 같은 planId가 있으면 덮어씌웁니다 (upsert).
 */
export async function uploadCoverImage(
  userId: string,
  planId: string,
  file: File
): Promise<string> {
  const supabase = createClient()

  // 확장자 추출 (예: "image/jpeg" → "jpg")
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const path = `${userId}/${planId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`이미지 업로드 실패: ${error.message}`)

  // 퍼블릭 URL 반환
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Storage에서 커버 이미지를 삭제합니다.
 * publicUrl에서 파일 경로를 추출해 사용합니다.
 * 실패해도 UI 흐름에 영향 없도록 에러를 조용히 처리합니다.
 */
export async function deleteCoverImage(publicUrl: string): Promise<void> {
  const supabase = createClient()

  // URL에서 버킷 이후 경로 추출
  // 예: .../object/public/cover-images/userId/planId.jpg → userId/planId.jpg
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return

  const path = publicUrl.slice(idx + marker.length)
  await supabase.storage.from(BUCKET).remove([path])
}
