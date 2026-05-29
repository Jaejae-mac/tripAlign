'use client'

/**
 * 준비물 그룹 카드 컴포넌트
 * 미완료 항목은 상단, 완료 항목은 하단에 고정 배치됩니다.
 * 각 섹션 내에서 드래그 앤 드롭으로 순서를 변경할 수 있으며,
 * 완료 항목이 미완료 항목 위로 올라오는 것은 구조적으로 차단됩니다.
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { reorderPackingItems } from '@/services/checklist.service'
import { toast } from 'sonner'
import type { PackingGroupWithItems, PackingItem } from '@/types/checklist.types'

interface ChecklistGroupProps {
  group: PackingGroupWithItems
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isDraggingAny: boolean
  onToggleItem: (itemId: string, isChecked: boolean) => void
  onAddItem: (groupId: string, title: string) => Promise<void>
  onDeleteItem: (itemId: string) => void
  onDeleteGroup: (groupId: string) => void
  // from/to 인덱스 대신 새로운 전체 순서 ID 배열을 전달
  onSetItemOrder: (groupId: string, orderedIds: string[]) => void
  onUpdateItemTitle: (itemId: string, title: string) => Promise<void>
}

// ── 정렬 가능한 항목 행 ───────────────────────────────────────
interface SortableItemRowProps {
  item: PackingItem
  isEditing: boolean
  editValue: string
  onEditChange: (itemId: string, value: string) => void
  onToggle: (itemId: string, isChecked: boolean) => void
  onDelete: (itemId: string) => void
}

function SortableItemRow({
  item,
  isEditing,
  editValue,
  onEditChange,
  onToggle,
  onDelete,
}: SortableItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 border-b border-border/60 last:border-b-0 bg-card transition-colors ${
        isDragging ? 'opacity-40 z-10 relative shadow-md' : ''
      }`}
    >
      {/* 항목 드래그 핸들 — 편집 모드에서 숨김 */}
      {!isEditing && (
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
          aria-label="항목 순서 변경"
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}

      <Checkbox
        checked={item.is_checked}
        onCheckedChange={(checked) => onToggle(item.id, checked as boolean)}
        className="shrink-0 cursor-pointer"
        disabled={isEditing}
      />

      {/* 편집 모드: input / 일반 모드: span */}
      {isEditing ? (
        <input
          value={editValue}
          onChange={(e) => onEditChange(item.id, e.target.value)}
          className="flex-1 text-sm min-w-0 bg-background text-foreground rounded px-2 py-1 border border-border/80 focus:border-orange-400 focus:outline-none"
        />
      ) : (
        <span
          className="flex-1 text-sm transition-all duration-200"
          style={{
            textDecoration: item.is_checked ? 'line-through' : 'none',
            opacity: item.is_checked ? 0.45 : 1,
            color: 'var(--foreground)',
          }}
        >
          {item.title}
        </span>
      )}

      {/* 삭제 버튼 — 편집 모드에서만 표시 */}
      {isEditing && (
        <button
          onClick={() => onDelete(item.id)}
          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
          aria-label="항목 삭제"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  )
}

// ── 그룹 카드 ────────────────────────────────────────────────
export function ChecklistGroup({
  group,
  dragHandleProps,
  isDraggingAny,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onDeleteGroup,
  onSetItemOrder,
  onUpdateItemTitle,
}: ChecklistGroupProps) {
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (isAddingItem) inputRef.current?.focus()
  }, [isAddingItem])

  // 미완료/완료 항목 분리 — 각 섹션은 sort_order 순 유지
  const uncheckedItems = group.items.filter((i) => !i.is_checked)
  const checkedItems = group.items.filter((i) => i.is_checked)

  const checkedCount = checkedItems.length
  const totalCount = group.items.length

  // ── 편집 모드 토글 ────────────────────────────────────────
  const handleToggleEdit = async () => {
    if (!isEditing) {
      const initial: Record<string, string> = {}
      group.items.forEach((item) => { initial[item.id] = item.title })
      setEditedTitles(initial)
      setIsEditing(true)
    } else {
      const changed = group.items.filter(
        (item) =>
          editedTitles[item.id] !== undefined &&
          editedTitles[item.id].trim() !== '' &&
          editedTitles[item.id].trim() !== item.title
      )
      if (changed.length > 0) {
        setIsSaving(true)
        try {
          await Promise.all(
            changed.map((item) => onUpdateItemTitle(item.id, editedTitles[item.id].trim()))
          )
        } catch {
          toast.error('일부 항목 저장에 실패했습니다.')
        } finally {
          setIsSaving(false)
        }
      }
      setIsEditing(false)
      setEditedTitles({})
    }
  }

  // ── 미완료 섹션 DnD ──────────────────────────────────────
  const handleUncheckedDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return

    const oldIndex = uncheckedItems.findIndex((i) => i.id === active.id)
    const newIndex = uncheckedItems.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // 새 순서: 재배열된 미완료 + 기존 완료 순서 유지
    const reorderedUnchecked = arrayMove(uncheckedItems, oldIndex, newIndex)
    const newOrder = [...reorderedUnchecked, ...checkedItems]
    onSetItemOrder(group.id, newOrder.map((i) => i.id))

    try {
      await reorderPackingItems(
        newOrder.map((item, idx) => ({ id: item.id, sort_order: idx }))
      )
    } catch {
      // 실패 시 되돌리기
      onSetItemOrder(group.id, group.items.map((i) => i.id))
      toast.error('항목 순서 저장에 실패했습니다.')
    }
  }

  // ── 완료 섹션 DnD ────────────────────────────────────────
  const handleCheckedDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return

    const oldIndex = checkedItems.findIndex((i) => i.id === active.id)
    const newIndex = checkedItems.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // 새 순서: 기존 미완료 순서 유지 + 재배열된 완료
    const reorderedChecked = arrayMove(checkedItems, oldIndex, newIndex)
    const newOrder = [...uncheckedItems, ...reorderedChecked]
    onSetItemOrder(group.id, newOrder.map((i) => i.id))

    try {
      await reorderPackingItems(
        newOrder.map((item, idx) => ({ id: item.id, sort_order: idx }))
      )
    } catch {
      onSetItemOrder(group.id, group.items.map((i) => i.id))
      toast.error('항목 순서 저장에 실패했습니다.')
    }
  }

  // ── 항목 추가 ─────────────────────────────────────────────
  const handleAddItem = async () => {
    const title = newItemTitle.trim()
    if (!title) { setIsAddingItem(false); return }

    setIsSubmitting(true)
    try {
      await onAddItem(group.id, title)
      setNewItemTitle('')
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddItem()
    if (e.key === 'Escape') { setIsAddingItem(false); setNewItemTitle('') }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* 그룹 헤더 */}
      <div
        className={`flex items-center gap-1 px-3 py-3 border-b border-border transition-colors duration-200 ${
          isEditing
            ? 'bg-amber-50 dark:bg-amber-950/30'
            : 'bg-muted/40'
        }`}
      >
        {/* 그룹 드래그 핸들 — 편집 모드에서 숨김 */}
        {!isEditing && (
          <button
            {...dragHandleProps}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none p-0.5"
            aria-label="그룹 순서 변경"
            tabIndex={-1}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0 flex-1 ml-0.5">
          <span className="font-semibold text-sm text-foreground truncate">
            {group.name}
          </span>
          {totalCount > 0 && (
            <span
              className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                checkedCount === totalCount
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {checkedCount}/{totalCount}
            </span>
          )}
        </div>

        {/* 편집/완료 토글 버튼 */}
        <button
          onClick={handleToggleEdit}
          disabled={isSaving}
          className="text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-60"
          style={{
            color: isEditing ? '#ffffff' : 'var(--muted-foreground)',
            backgroundColor: isEditing ? 'var(--brand-cta)' : 'transparent',
          }}
        >
          {isSaving ? '저장 중...' : isEditing ? '완료' : '편집'}
        </button>

        {/* 그룹 삭제 버튼 — 편집 모드가 아닐 때만 표시 */}
        {!isEditing && (
          <button
            onClick={() => onDeleteGroup(group.id)}
            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer ml-1 shrink-0"
            aria-label="그룹 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── 미완료 항목 섹션 ── */}
      {uncheckedItems.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleUncheckedDragEnd}
        >
          <SortableContext
            items={uncheckedItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul>
              {uncheckedItems.map((item) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  isEditing={isEditing}
                  editValue={editedTitles[item.id] ?? item.title}
                  onEditChange={(id, val) =>
                    setEditedTitles((prev) => ({ ...prev, [id]: val }))
                  }
                  onToggle={onToggleItem}
                  onDelete={onDeleteItem}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* ── 완료 항목 구분선 ── */}
      {checkedItems.length > 0 && (
        <div className="px-3 py-1.5 border-t border-dashed border-border/60 bg-muted/20">
          <span className="text-[11px] text-muted-foreground/60 font-medium">완료된 항목</span>
        </div>
      )}

      {/* ── 완료 항목 섹션 ── */}
      {checkedItems.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCheckedDragEnd}
        >
          <SortableContext
            items={checkedItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul>
              {checkedItems.map((item) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  isEditing={isEditing}
                  editValue={editedTitles[item.id] ?? item.title}
                  onEditChange={(id, val) =>
                    setEditedTitles((prev) => ({ ...prev, [id]: val }))
                  }
                  onToggle={onToggleItem}
                  onDelete={onDeleteItem}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* 항목 추가 영역 */}
      <div className="px-4 py-2.5">
        <AnimatePresence mode="wait">
          {isAddingItem ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="항목 입력 후 Enter"
                className="h-8 text-sm flex-1"
                disabled={isSubmitting}
              />
              <Button
                size="sm"
                onClick={handleAddItem}
                disabled={isSubmitting || !newItemTitle.trim()}
                className="h-8 px-3 cursor-pointer shrink-0"
                style={{ backgroundColor: 'var(--brand-cta)', color: 'white' }}
              >
                추가
              </Button>
              <button
                onClick={() => { setIsAddingItem(false); setNewItemTitle('') }}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                aria-label="취소"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingItem(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              항목 추가
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
