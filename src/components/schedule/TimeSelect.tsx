'use client'

/**
 * 커스텀 시간 선택기 컴포넌트
 * 네이티브 time input 대신 shadcn Select 두 개로 시(hour)와 분(minute)을 선택합니다.
 * 브라우저의 네이티브 타임피커 팝업이 Dialog를 덮는 문제를 해결합니다.
 */
import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// 시간 옵션: 00 ~ 23
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

// 분 옵션: 5분 단위
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

interface TimeSelectProps {
  /** 현재 값 — "HH:mm" 형식 (예: "09:30"). 빈 문자열이면 미선택 상태 */
  value: string
  onChange: (val: string) => void
  /** 유효성 오류 시 테두리 색상 변경 */
  error?: boolean
}

export function TimeSelect({ value, onChange, error }: TimeSelectProps) {
  /**
   * 내부 상태로 시/분을 각각 관리합니다.
   * lazy initializer를 사용해 마운트 시점의 value 값을 즉시 파싱합니다.
   * (useState('')로 초기화하면 useEffect가 실행되기 전까지 빈 값이 표시되는 문제가 있음)
   */
  const [internalHour, setInternalHour] = useState<string>(() => {
    if (value && value.includes(':')) return value.split(':')[0] ?? ''
    return ''
  })
  const [internalMinute, setInternalMinute] = useState<string>(() => {
    if (value && value.includes(':')) return value.split(':')[1] ?? ''
    return ''
  })

  // 외부 value가 변경되면 내부 상태를 동기화 (폼 리셋, 수정 모드 재진입 등)
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':')
      setInternalHour(h ?? '')
      setInternalMinute(m ?? '')
    } else {
      setInternalHour('')
      setInternalMinute('')
    }
  }, [value])

  /** 시 또는 분 변경 시 — 내부 상태를 먼저 업데이트하고, 양쪽 모두 채워졌을 때 외부에 통지 */
  const handleChange = (type: 'hour' | 'minute', val: string) => {
    const nextHour = type === 'hour' ? val : internalHour
    const nextMinute = type === 'minute' ? val : internalMinute

    // 내부 상태 즉시 반영 (re-render에서 선택값이 사라지지 않도록)
    if (type === 'hour') setInternalHour(val)
    else setInternalMinute(val)

    // 시/분이 모두 선택됐을 때만 부모에게 최종 값 전달
    if (nextHour && nextMinute) {
      onChange(`${nextHour}:${nextMinute}`)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* 시(hour) 선택 */}
      <Select value={internalHour} onValueChange={(v) => handleChange('hour', v)}>
        <SelectTrigger
          className={cn(
            'w-[88px] text-sm',
            error && 'border-destructive'
          )}
        >
          <SelectValue placeholder="시" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}시
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground text-sm font-medium select-none">:</span>

      {/* 분(minute) 선택 */}
      <Select value={internalMinute} onValueChange={(v) => handleChange('minute', v)}>
        <SelectTrigger
          className={cn(
            'w-[88px] text-sm',
            error && 'border-destructive'
          )}
        >
          <SelectValue placeholder="분" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}분
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
