'use client'

/**
 * 준비물 그룹 카드 컴포넌트
 * 그룹 이름과 진행도(완료/전체)를 보여주고, 하위 항목의 체크/추가/삭제를 처리합니다.
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { PackingGroupWithItems, PackingItem } from '@/types/checklist.types'

interface ChecklistGroupProps {
  group: PackingGroupWithItems
  /** 항목 체크/언체크 시 호출 — optimistic update는 부모가 담당 */
  onToggleItem: (itemId: string, isChecked: boolean) => void
  /** 새 항목 추가 시 호출 */
  onAddItem: (groupId: string, title: string) => Promise<void>
  /** 항목 삭제 시 호출 */
  onDeleteItem: (itemId: string) => void
  /** 그룹 전체 삭제 시 호출 */
  onDeleteGroup: (groupId: string) => void
}

export function ChecklistGroup({
  group,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onDeleteGroup,
}: ChecklistGroupProps) {
  // 항목 추가 인풋 표시 여부
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 인풋이 노출되면 자동 포커스
  useEffect(() => {
    if (isAddingItem) inputRef.current?.focus()
  }, [isAddingItem])

  const checkedCount = group.items.filter((i) => i.is_checked).length
  const totalCount = group.items.length

  /** 항목 추가 확정 */
  const handleAddItem = async () => {
    const title = newItemTitle.trim()
    if (!title) {
      setIsAddingItem(false)
      return
    }

    setIsSubmitting(true)
    try {
      await onAddItem(group.id, title)
      setNewItemTitle('')
      // 추가 후 인풋은 열어두어 연속 입력 가능하게 함
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddItem()
    if (e.key === 'Escape') {
      setIsAddingItem(false)
      setNewItemTitle('')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* 그룹 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-foreground truncate">
            {group.name}
          </span>
          {/* 진행도 배지 */}
          {totalCount > 0 && (
            <span
              className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor:
                  checkedCount === totalCount ? '#dcfce7' : '#f1f5f9',
                color: checkedCount === totalCount ? '#16a34a' : '#64748b',
              }}
            >
              {checkedCount}/{totalCount}
            </span>
          )}
        </div>
        {/* 그룹 삭제 버튼 */}
        <button
          onClick={() => onDeleteGroup(group.id)}
          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer ml-2 shrink-0"
          aria-label="그룹 삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 항목 목록 */}
      <ul className="divide-y divide-border/60">
        <AnimatePresence initial={false}>
          {group.items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onToggle={onToggleItem}
              onDelete={onDeleteItem}
            />
          ))}
        </AnimatePresence>
      </ul>

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
                onClick={() => {
                  setIsAddingItem(false)
                  setNewItemTitle('')
                }}
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

/** 개별 항목 행 — 체크박스 + 제목 + 삭제 버튼 */
function ChecklistItem({
  item,
  onToggle,
  onDelete,
}: {
  item: PackingItem
  onToggle: (itemId: string, isChecked: boolean) => void
  onDelete: (itemId: string) => void
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-3 px-4 py-2.5 group"
    >
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={(checked) => onToggle(item.id, checked as boolean)}
        className="shrink-0 cursor-pointer"
      />
      {/* 체크 시 취소선 + 흐리게 처리 */}
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
      {/* 삭제 버튼 — 호버 시만 표시 */}
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer shrink-0"
        aria-label="항목 삭제"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.li>
  )
}
