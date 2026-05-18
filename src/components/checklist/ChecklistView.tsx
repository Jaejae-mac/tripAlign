'use client'

/**
 * 준비물 체크리스트 탭 메인 뷰
 * 그룹 카드 목록과 전체 진행도를 표시하며, 그룹/항목 CRUD와
 * 드래그 앤 드롭 그룹 순서 변경을 처리합니다.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Luggage, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
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
  reorderPackingGroups,
} from '@/services/checklist.service'
import { toast } from 'sonner'
import type { PackingGroupWithItems } from '@/types/checklist.types'

interface ChecklistViewProps {
  planId: string
}

// ── 정렬 가능한 그룹 래퍼 ────────────────────────────────────
interface SortableGroupCardProps {
  group: PackingGroupWithItems
  isDraggingAny: boolean
  onToggleItem: (itemId: string, isChecked: boolean) => void
  onAddItem: (groupId: string, title: string) => Promise<void>
  onDeleteItem: (itemId: string) => void
  onDeleteGroup: (groupId: string) => void
  onReorderItems: (groupId: string, from: number, to: number) => void
}

function SortableGroupCard({
  group,
  isDraggingAny,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onDeleteGroup,
  onReorderItems,
}: SortableGroupCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.98 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <ChecklistGroup
          group={group}
          dragHandleProps={{ ...attributes, ...listeners }}
          isDraggingAny={isDraggingAny}
          onToggleItem={onToggleItem}
          onAddItem={onAddItem}
          onDeleteItem={onDeleteItem}
          onDeleteGroup={onDeleteGroup}
          onReorderItems={onReorderItems}
        />
      </motion.div>
    </div>
  )
}

// ── 메인 뷰 ─────────────────────────────────────────────────
export function ChecklistView({ planId }: ChecklistViewProps) {
  const [groups, setGroups] = useState<PackingGroupWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false)
  const groupInputRef = useRef<HTMLInputElement>(null)

  // 터치/마우스 모두 지원 — 8px 이동 후 드래그 시작 (스크롤과 충돌 방지)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  useEffect(() => { fetchGroups() }, [fetchGroups])
  useEffect(() => {
    if (isAddingGroup) groupInputRef.current?.focus()
  }, [isAddingGroup])

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)
  const checkedItems = groups.reduce(
    (sum, g) => sum + g.items.filter((i) => i.is_checked).length,
    0
  )
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  // ── 그룹 DnD 핸들러 ────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveDragId(String(active.id))
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveDragId(null)
    if (!over || active.id === over.id) return

    const oldIndex = groups.findIndex((g) => g.id === active.id)
    const newIndex = groups.findIndex((g) => g.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // 즉시 UI 반영 (optimistic)
    const reordered = arrayMove(groups, oldIndex, newIndex)
    setGroups(reordered)

    // DB 동기화 (순서 번호 재부여)
    try {
      await reorderPackingGroups(
        reordered.map((g, i) => ({ id: g.id, sort_order: i }))
      )
    } catch {
      // 실패 시 되돌리기
      setGroups(groups)
      toast.error('순서 저장에 실패했습니다.')
    }
  }

  // ── 그룹 CRUD ───────────────────────────────────────────────
  const handleAddGroup = async () => {
    const name = newGroupName.trim()
    if (!name) { setIsAddingGroup(false); return }

    setIsGroupSubmitting(true)
    try {
      const newGroup = await createPackingGroup(planId, { name }, groups.length)
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
    if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupName('') }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('이 그룹과 모든 항목을 삭제하시겠습니까?')) return
    try {
      await deletePackingGroup(groupId)
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
    } catch {
      toast.error('그룹 삭제에 실패했습니다.')
    }
  }

  // ── 항목 CRUD ───────────────────────────────────────────────
  const handleAddItem = async (groupId: string, title: string) => {
    const group = groups.find((g) => g.id === groupId)
    try {
      const newItem = await createPackingItem(groupId, { title }, group?.items.length ?? 0)
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

  const handleToggleItem = async (itemId: string, isChecked: boolean) => {
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

  // ── 항목 순서 변경 (그룹 내부에서 발생, 여기서 state 업데이트) ──
  const handleReorderItems = (groupId: string, from: number, to: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return { ...g, items: arrayMove(g.items, from, to) }
      })
    )
  }

  // ── 스켈레톤 ───────────────────────────────────────────────
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
      {/* 전체 진행도 요약 카드 */}
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

      {/* 그룹 카드 목록 — DnD 컨텍스트로 감싸기 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={groups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {groups.map((group) => (
              <SortableGroupCard
                key={group.id}
                group={group}
                isDraggingAny={activeDragId !== null}
                onToggleItem={handleToggleItem}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
                onDeleteGroup={handleDeleteGroup}
                onReorderItems={handleReorderItems}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
              onClick={() => { setIsAddingGroup(false); setNewGroupName('') }}
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

      {/* 빈 상태 */}
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
