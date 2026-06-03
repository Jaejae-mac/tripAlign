'use client'

/**
 * 일정 추가/수정 다이얼로그
 * 화면 정중앙에 모달로 표시되며 시간, 제목, 카테고리, 장소, 메모를 입력합니다.
 * 장소 입력 시 Google Places Autocomplete로 자동완성되며 lat/lng/place_id를 함께 저장합니다.
 * editingItem이 있으면 수정 모드, 없으면 추가 모드로 동작합니다.
 */
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Phone, MapPin, X } from 'lucide-react'
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useMapsLoaded } from '@/components/providers/GoogleMapsProvider'
import { createScheduleItem, updateScheduleItem } from '@/services/schedule.service'
import { toast } from 'sonner'
import { CATEGORY_CONFIG, SCHEDULE_CATEGORIES } from '@/lib/constants/schedule'
import { cn } from '@/lib/utils'
import { TimeSelect } from './TimeSelect'
import type { ScheduleFormData, ScheduleItem, ScheduleCategory } from '@/types/schedule.types'

// 폼 유효성 검사 스키마
const scheduleSchema = z.object({
  time: z.string().min(1, '시간을 입력해주세요.'),
  end_time: z.string().optional(),
  title: z
    .string()
    .min(1, '일정 제목을 입력해주세요.')
    .max(50, '50자 이내로 입력해주세요.'),
  description: z.string().max(200, '200자 이내로 입력해주세요.'),
  category: z.enum(['food', 'tour', 'stay', 'transport', 'shopping', 'etc']),
  location: z.string().max(200, '200자 이내로 입력해주세요.'),
  phone: z.string().max(20, '20자 이내로 입력해주세요.'),
})

interface ScheduleAddDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  date: string
  editingItem: ScheduleItem | null
  /** 지도에서 장소 선택 후 일정 추가 시 자동으로 장소 필드를 채워줍니다 */
  prefilledPlace?: { location: string; lat: number | null; lng: number | null; place_id: string | null; phone?: string | null } | null
  onSaved: () => void
}

export function ScheduleAddDrawer({
  open,
  onOpenChange,
  planId,
  date,
  editingItem,
  prefilledPlace,
  onSaved,
}: ScheduleAddDrawerProps) {
  const isEditing = !!editingItem

  // 종료 시간 활성화 여부
  const [hasEndTime, setHasEndTime] = useState(false)

  // Google Places에서 선택된 좌표·장소 ID (폼 스키마 외부에서 관리)
  const [placeCoords, setPlaceCoords] = useState<{
    lat: number | null
    lng: number | null
    place_id: string | null
  }>({ lat: null, lng: null, place_id: null })

  const dropdownRef = useRef<HTMLDivElement>(null)

  // GoogleMapsProvider에서 Maps JS API 로드 완료 여부를 받아옵니다
  const mapsLoaded = useMapsLoaded()

  // Places Autocomplete 훅
  // initOnMount: false — Maps API 로드 완료 전에 window.google.maps.places에 접근하면
  // "Google Maps Places API library must be loaded" 에러가 발생하므로, 수동으로 init합니다.
  const {
    ready: placesReady,
    value: placesValue,
    setValue: setPlacesValue,
    suggestions: { status, data: suggestions },
    clearSuggestions,
    init: initPlaces,
  } = usePlacesAutocomplete({
    initOnMount: false,
    requestOptions: {
      // 전세계 검색이 기본값 — 한국 사용자를 위해 한국어 우선 결과를 선호하도록 설정
      language: 'ko',
    },
    debounce: 300,
    // 다이얼로그가 닫히면 초기화되도록 캐시 유지하지 않음
    cache: false,
  })

  // Maps API 로드가 완료되면 Places Autocomplete를 초기화합니다
  useEffect(() => {
    if (mapsLoaded) {
      initPlaces()
    }
    // initPlaces는 use-places-autocomplete 내부에서 useCallback([])으로 안정적 참조 보장
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      time: '',
      end_time: undefined,
      title: '',
      description: '',
      category: 'etc',
      location: '',
      phone: '',
    },
  })

  const selectedCategory = watch('category')
  const formTimeValue = watch('time')
  const formEndTimeValue = watch('end_time')
  // X 버튼 노출 여부 판단용
  const watchPhone = watch('phone')
  const watchDescription = watch('description')

  // 수정 모드에서 시간을 즉시 파생 (비동기 체인 없이)
  const timeValue = (open && editingItem)
    ? editingItem.time.slice(0, 5)
    : formTimeValue
  const endTimeValue = (open && editingItem?.end_time)
    ? editingItem.end_time.slice(0, 5)
    : (formEndTimeValue ?? '')

  // 수정 모드 초기화
  useEffect(() => {
    if (open && editingItem) {
      const hasEnd = !!editingItem.end_time
      setHasEndTime(hasEnd)
      setValue('time', editingItem.time.slice(0, 5))
      setValue('end_time', hasEnd ? editingItem.end_time!.slice(0, 5) : undefined)
      setValue('title', editingItem.title)
      setValue('description', editingItem.description ?? '')
      setValue('category', editingItem.category)
      setValue('location', editingItem.location ?? '')
      setValue('phone', editingItem.phone ?? '')
      // 기존 좌표·place_id 복원
      setPlaceCoords({
        lat: editingItem.lat ?? null,
        lng: editingItem.lng ?? null,
        place_id: editingItem.place_id ?? null,
      })
      setPlacesValue(editingItem.location ?? '', false)
    } else {
      setHasEndTime(false)
      setPlaceCoords({ lat: null, lng: null, place_id: null })
      setPlacesValue('', false)
      reset({
        time: '',
        end_time: undefined,
        title: '',
        description: '',
        category: 'etc',
        // 지도에서 장소 선택 후 열렸으면 location, phone을 자동 입력
        location: (open && prefilledPlace) ? prefilledPlace.location : '',
        phone: (open && prefilledPlace?.phone) ? prefilledPlace.phone : '',
      })
      // 지도에서 선택한 장소의 좌표·place_id 자동 복원
      if (open && prefilledPlace) {
        setPlacesValue(prefilledPlace.location, false)
        setPlaceCoords({
          lat: prefilledPlace.lat,
          lng: prefilledPlace.lng,
          place_id: prefilledPlace.place_id,
        })
      }
    }
  }, [editingItem, open, prefilledPlace, setValue, reset, setPlacesValue])

  /** 종료 시간 체크박스 토글 */
  const handleEndTimeToggle = (checked: boolean) => {
    setHasEndTime(checked)
    if (!checked) setValue('end_time', undefined)
  }

  /** Places Autocomplete 항목 선택 */
  const handlePlaceSelect = async (
    placeId: string,
    description: string
  ) => {
    clearSuggestions()
    setPlacesValue(description, false)
    setValue('location', description)

    try {
      // 1. 주소를 좌표로 변환
      const results = await getGeocode({ placeId })
      const { lat, lng } = await getLatLng(results[0])
      setPlaceCoords({ lat, lng, place_id: placeId })
    } catch {
      // 좌표 변환 실패 시 텍스트 주소만 저장 (지도 표시 안 됨)
      setPlaceCoords({ lat: null, lng: null, place_id: placeId })
    }
  }

  /** 장소 초기화 */
  const handleClearLocation = () => {
    setPlacesValue('', false)
    setValue('location', '')
    setPlaceCoords({ lat: null, lng: null, place_id: null })
    clearSuggestions()
  }

  /** 전화번호 초기화 */
  const handleClearPhone = () => {
    setValue('phone', '')
  }

  /** 메모 초기화 */
  const handleClearDescription = () => {
    setValue('description', '')
  }

  /** 일정 저장 (추가 또는 수정) */
  const onSubmit = async (values: ScheduleFormData) => {
    try {
      if (isEditing && editingItem) {
        // 수정 모드: 빈 값 → null 전송 → Supabase가 DB를 NULL로 업데이트
        // (undefined는 payload에서 제외되어 기존값이 그대로 유지됨)
        await updateScheduleItem(editingItem.id, {
          time: values.time,
          end_time: hasEndTime && values.end_time ? values.end_time : null,
          title: values.title,
          description: values.description || null,
          category: values.category,
          location: values.location || null,
          phone: values.phone || null,
          lat: placeCoords.lat,
          lng: placeCoords.lng,
          place_id: placeCoords.place_id,
        })
        toast.success('일정이 수정되었습니다.')
      } else {
        // 추가 모드: 빈 값 → undefined (Supabase payload에서 제외 = DB 기본값 사용)
        await createScheduleItem(planId, date, {
          time: values.time,
          end_time: hasEndTime && values.end_time ? values.end_time : undefined,
          title: values.title,
          description: values.description || undefined,
          category: values.category,
          location: values.location || undefined,
          phone: values.phone || undefined,
          lat: placeCoords.lat ?? undefined,
          lng: placeCoords.lng ?? undefined,
          place_id: placeCoords.place_id ?? undefined,
        })
        toast.success('일정이 추가되었습니다.')
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error('[ScheduleAddDrawer] 일정 저장 실패:', err)
      toast.error(
        isEditing ? '일정 수정에 실패했습니다.' : '일정 추가에 실패했습니다.'
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">
            {isEditing ? '일정 수정' : '일정 추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* 제목 + 시간 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="예: 츠키지 시장 방문"
                {...register('title')}
                className={cn(errors.title && 'border-destructive')}
              />
            </div>

            <div className="space-y-1.5">
              <Label>시간</Label>
              <TimeSelect
                value={timeValue}
                onChange={(val) => setValue('time', val)}
                error={!!errors.time}
              />
              {hasEndTime && (
                <TimeSelect
                  value={endTimeValue ?? ''}
                  onChange={(val) => setValue('end_time', val)}
                />
              )}
              <div className="flex items-center gap-1.5 pt-0.5">
                <Checkbox
                  id="has-end-time"
                  checked={hasEndTime}
                  onCheckedChange={(checked) => handleEndTimeToggle(!!checked)}
                  className="cursor-pointer w-3.5 h-3.5"
                />
                <Label
                  htmlFor="has-end-time"
                  className="text-xs cursor-pointer text-muted-foreground"
                >
                  종료 시간
                </Label>
              </div>
            </div>
          </div>
          {errors.time && (
            <p className="text-xs text-destructive -mt-3">{errors.time.message}</p>
          )}
          {errors.title && (
            <p className="text-xs text-destructive -mt-3">{errors.title.message}</p>
          )}

          {/* 카테고리 선택 */}
          <div className="space-y-2">
            <Label>카테고리</Label>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat]
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setValue('category', cat as ScheduleCategory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer border"
                    style={{
                      backgroundColor: isSelected ? `${config.color}20` : 'transparent',
                      borderColor: isSelected ? config.color : 'var(--border)',
                      color: isSelected ? config.color : 'var(--muted-foreground)',
                    }}
                  >
                    <config.Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 장소 — Google Places Autocomplete */}
          <div className="space-y-1.5">
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              장소 (선택)
            </Label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Input
                  id="location"
                  value={placesValue}
                  onChange={(e) => {
                    setPlacesValue(e.target.value)
                    setValue('location', e.target.value)
                    // 직접 입력 시 좌표 초기화
                    setPlaceCoords({ lat: null, lng: null, place_id: null })
                  }}
                  placeholder={
                    placesReady
                      ? '예: 롯데월드타워, 츠키지 시장, Eiffel Tower'
                      : '장소 검색 준비 중...'
                  }
                  disabled={!placesReady && !isEditing}
                  className="pr-8"
                />
                {/* 입력값이 있을 때 X 버튼으로 초기화 */}
                {placesValue && (
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="장소 초기화"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 자동완성 드롭다운 */}
              {status === 'OK' && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map(({ place_id, description, structured_formatting }) => (
                    <li key={place_id}>
                      <button
                        type="button"
                        onClick={() => handlePlaceSelect(place_id, description)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-medium text-foreground truncate">
                          {structured_formatting.main_text}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {structured_formatting.secondary_text}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Google Places로 선택된 경우 좌표 확보 안내 */}
            {placeCoords.place_id && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                지도에 핀이 등록됩니다
              </p>
            )}
          </div>

          {/* 전화번호 */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              전화번호 (선택)
            </Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="예: 03-3547-5765"
                {...register('phone')}
                className={cn(errors.phone && 'border-destructive', watchPhone && 'pr-8')}
              />
              {/* 입력값이 있을 때 X 버튼으로 초기화 */}
              {watchPhone && (
                <button
                  type="button"
                  onClick={handleClearPhone}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="전화번호 초기화"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label htmlFor="description">메모 (선택)</Label>
            <div className="relative">
              <Textarea
                id="description"
                placeholder="추가 정보를 입력하세요..."
                rows={3}
                {...register('description')}
                className={cn('resize-none', watchDescription && 'pr-8')}
              />
              {/* 입력값이 있을 때 X 버튼으로 초기화 */}
              {watchDescription && (
                <button
                  type="button"
                  onClick={handleClearDescription}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="메모 초기화"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-2 pb-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 gap-2 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? '수정 완료' : '추가하기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
