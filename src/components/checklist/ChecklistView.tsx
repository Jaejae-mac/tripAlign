'use client'

/**
 * 준비물 체크리스트 탭 메인 뷰
 * 이름별 그룹 카드 목록과 전체 진행도 요약을 보여주고, 그룹/항목 CRUD를 처리합니다.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Luggage, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChecklistGroup } from './ChecklistGroup'
import {
  getPackingGroups,
  createPackingGroup,
  deletePackingGroup,
  createPackingItem,
  togglePackingItem,
  deletePackingItem,
} from '@/services/checklist.service'
import { toast } from 'sonner'
import type { PackingGroupWithItems } from '@/types/checklist.types'

interface ChecklistViewProps {
  planId: string
}

export function ChecklistView({ planId }: ChecklistViewProps) {
  const [groups, setGroups] = useState<PackingGroupWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 그룹 추가 인풋 상태
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false)
  const groupInputRef = useRef<HTMLInputElement>(null)

  /** 준비물 그룹 전체 불러오기 */
  const fetchGroups = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getPackingGroups(planId)
      setGroups(data)
    } catch {
      toast.error('준비물 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [planId])

  // 탭이 처음 렌더링될 때 데이터 로드
  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // 그룹 추가 인풋이 열리면 포커스
  useEffect(() => {
    if (isAddingGroup) groupInputRef.current?.focus()
  }, [isAddingGroup])

  // 전체 통계 계산
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)
  const checkedItems = groups.reduce(
    (sum, g) => sum + g.items.filter((i) => i.is_checked).length,
    0
  )
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  /** 그룹 추가 확정 */
  const handleAddGroup = async () => {
    const name = newGroupName.trim()
    if (!name) {
      setIsAddingGroup(false)
      return
    }

    setIsGroupSubmitting(true)
    try {
      const newGroup = await createPackingGroup(planId, { name })
      // 빈 items 배열과 함께 목록에 추가
      setGroups((prev) => [...prev, { ...newGroup, items: [] }])
      setNewGroupName('')
      setIsAddingGroup(false)
    } catch {
      toast.error('그룹 추가에 실패했습니다.')
    } finally {
      setIsGroupSubmitting(false)
    }
  }

  const handleGroupKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddGroup()
    if (e.key === 'Escape') {
      setIsAddingGroup(false)
      setNewGroupName('')
    }
  }

  /** 그룹 삭제 */
  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('이 그룹과 모든 항목을 삭제하시겠습니까?')) return
    try {
      await deletePackingGroup(groupId)
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
    } catch {
      toast.error('그룹 삭제에 실패했습니다.')
    }
  }

  /** 항목 추가 */
  const handleAddItem = async (groupId: string, title: string) => {
    try {
      const newItem = await createPackingItem(groupId, { title })
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, items: [...g.items, newItem] } : g
        )
      )
    } catch {
      toast.error('항목 추가에 실패했습니다.')
      throw new Error('항목 추가 실패')
    }
  }

  /** 항목 체크 토글 — 즉시 UI 반영(optimistic) 후 서버 동기화 */
  const handleToggleItem = async (itemId: string, isChecked: boolean) => {
    // 즉시 UI 업데이트 (서버 응답 대기 없이)
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((item) =>
          item.id === itemId ? { ...item, is_checked: isChecked } : item
        ),
      }))
    )

    try {
      await togglePackingItem(itemId, isChecked)
    } catch {
      // 실패 시 이전 상태로 되돌리기
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((item) =>
            item.id === itemId ? { ...item, is_checked: !isChecked } : item
          ),
        }))
      )
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  /** 항목 삭제 */
  const handleDeleteItem = async (itemId: string) => {
    try {
      await deletePackingItem(itemId)
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.filter((item) => item.id !== itemId),
        }))
      )
    } catch {
      toast.error('항목 삭제에 실패했습니다.')
    }
  }

  // 스켈레톤 로딩 상태
  if (isLoading) {
    return (
      <div className="py-6 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card h-24 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="py-4 space-y-4">
      {/* 전체 진행도 요약 카드 — 항목이 하나라도 있을 때만 표시 */}
      {totalItems > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">전체 진행도</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--brand-cta)' }}>
              {checkedItems}/{totalItems}
            </span>
          </div>
          {/* 진행 바 */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: 'var(--brand-cta)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          {progressPercent === 100 && (
            <p className="text-xs text-green-600 font-medium mt-1.5">
              모든 준비물을 챙겼습니다!
            </p>
          )}
        </motion.div>
      )}

      {/* 그룹 카드 목록 */}
      <AnimatePresence initial={false}>
        {groups.map((group) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <ChecklistGroup
              group={group}
              onToggleItem={handleToggleItem}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onDeleteGroup={handleDeleteGroup}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 그룹 추가 UI */}
      <AnimatePresence mode="wait">
        {isAddingGroup ? (
          <motion.div
            key="group-input"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 flex items-center gap-2"
          >
            <Input
              ref={groupInputRef}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={handleGroupKeyDown}
              placeholder="그룹 이름 입력 (예: 의류, 세면도구)"
              className="h-8 text-sm flex-1 bg-background"
              disabled={isGroupSubmitting}
            />
            <Button
              size="sm"
              onClick={handleAddGroup}
              disabled={isGroupSubmitting || !newGroupName.trim()}
              className="h-8 px-3 cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
            >
              추가
            </Button>
            <button
              onClick={() => {
                setIsAddingGroup(false)
                setNewGroupName('')
              }}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              aria-label="취소"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="add-group-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="outline"
              onClick={() => setIsAddingGroup(true)}
              className="w-full gap-2 cursor-pointer border-dashed"
            >
              <Plus className="w-4 h-4" />
              그룹 추가
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 빈 상태 — 그룹이 없을 때 안내 */}
      {groups.length === 0 && !isAddingGroup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center py-12 text-muted-foreground"
        >
          <Luggage className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">아직 준비물이 없어요</p>
          <p className="text-xs mt-1 opacity-70">
            그룹을 추가하고 챙겨야 할 물건을 정리해보세요
          </p>
        </motion.div>
      )}
    </div>
  )
}
