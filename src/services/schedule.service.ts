/**
 * 일정 비즈니스 로직 서비스 레이어
 * 날짜별 카드(day_schedules)와 시간별 항목(schedule_items)을 관리합니다.
 */
import { createClient } from '@/lib/supabase/client'
import type {
  DaySchedule,
  ScheduleItem,
  CreateScheduleItemDto,
  UpdateScheduleItemDto,
} from '@/types/schedule.types'

/**
 * 플랜의 모든 날짜별 일정을 조회합니다.
 * 각 날짜에 속한 시간별 항목(items)도 함께 가져옵니다.
 */
export async function getDaySchedules(planId: string): Promise<DaySchedule[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('day_schedules')
    .select(`
      *,
      items:schedule_items(*)
    `)
    .eq('plan_id', planId)
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  // 각 날짜의 일정 항목을 시간순으로 정렬
  return (data ?? []).map((day) => ({
    ...day,
    items: (day.items ?? []).sort((a: ScheduleItem, b: ScheduleItem) =>
      a.time.localeCompare(b.time)
    ),
  }))
}

/** 특정 날짜의 일정 항목만 조회 */
export async function getScheduleItemsByDate(
  planId: string,
  date: string
): Promise<ScheduleItem[]> {
  const supabase = createClient()

  // 1. 해당 날짜의 day_schedule 조회
  const { data: daySchedule, error: dayError } = await supabase
    .from('day_schedules')
    .select('id')
    .eq('plan_id', planId)
    .eq('date', date)
    .maybeSingle()   // 해당 날짜 레코드가 없을 때 406 대신 null 반환

  if (dayError || !daySchedule) return []

  // 2. 해당 day_schedule의 일정 항목 조회 (시간순 정렬)
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('day_schedule_id', daySchedule.id)
    .order('time', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/** 새 일정 항목 추가 (day_schedule이 없으면 자동 생성) */
export async function createScheduleItem(
  planId: string,
  date: string,
  dto: Omit<CreateScheduleItemDto, 'day_schedule_id'>
): Promise<ScheduleItem> {
  const supabase = createClient()

  // 1. 해당 날짜의 day_schedule 조회 또는 생성 (upsert)
  const { data: daySchedule, error: dayError } = await supabase
    .from('day_schedules')
    .upsert({ plan_id: planId, date }, { onConflict: 'plan_id,date' })
    .select()
    .single()

  if (dayError) throw new Error(dayError.message)

  // 2. 일정 항목 생성
  const { data, error } = await supabase
    .from('schedule_items')
    .insert({ ...dto, day_schedule_id: daySchedule.id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 일정 항목 수정 */
export async function updateScheduleItem(
  itemId: string,
  dto: UpdateScheduleItemDto
): Promise<ScheduleItem> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('schedule_items')
    .update(dto)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** 일정 항목 삭제 */
export async function deleteScheduleItem(itemId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('schedule_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(error.message)
}
