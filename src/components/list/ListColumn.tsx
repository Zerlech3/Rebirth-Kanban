'use client'

import { useState } from 'react'
import { Droppable, Draggable, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import { List, Label, BoardMember, Card } from '@/types'
import { useBoardStore } from '@/store/board.store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CardItem from '../card/CardItem/CardItem'
import CardModal from '../card/CardModal/CardModal'
import { MoreHorizontal, Plus, GripVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ListColumnProps {
  list: List
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined
  labels: Label[]
  currentUserId: string
  boardMembers: BoardMember[]
}

export default function ListColumn({ list, dragHandleProps, labels, currentUserId, boardMembers }: ListColumnProps) {
  const { addCard, removeList, updateList } = useBoardStore()
  const [addingCard, setAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [listTitle, setListTitle] = useState(list.title)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const supabase = createClient()

  const activeCards = (list.cards || [])
    .filter((c) => !c.is_archived)
    .sort((a, b) => a.position - b.position)

  const isOverLimit = list.wip_limit !== null && activeCards.length >= list.wip_limit

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return
    const { data, error } = await supabase
      .from('cards')
      .insert({
        list_id: list.id,
        title: newCardTitle.trim(),
        position: activeCards.length,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (error) { toast.error('Kart eklenemedi'); return }
    addCard(list.id, data)
    setNewCardTitle('')
    setAddingCard(false)
  }

  const handleArchiveList = async () => {
    const { error } = await supabase.from('lists').update({ is_archived: true }).eq('id', list.id)
    if (!error) removeList(list.id)
    else toast.error('Liste arşivlenemedi')
  }

  const handleRenameList = async () => {
    if (!listTitle.trim() || listTitle === list.title) { setEditingTitle(false); return }
    const { error } = await supabase.from('lists').update({ title: listTitle.trim() }).eq('id', list.id)
    if (!error) updateList(list.id, { title: listTitle.trim() })
    else toast.error('Liste adı değiştirilemedi')
    setEditingTitle(false)
  }

  return (
    <div className="w-72 flex flex-col bg-gray-100 dark:bg-gray-800 rounded-xl max-h-full">
      {/* List Header */}
      <div className="flex items-center gap-2 px-3 py-2.5" {...(dragHandleProps ?? {})}>
        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab flex-shrink-0" />
        {editingTitle ? (
          <Input
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            onBlur={handleRenameList}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameList()
              if (e.key === 'Escape') setEditingTitle(false)
            }}
            className="h-7 text-sm font-semibold flex-1"
            autoFocus
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-semibold text-gray-800 dark:text-gray-200 truncate"
            onClick={() => setEditingTitle(true)}
          >
            {list.title}
          </button>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isOverLimit && (
            <span className="text-xs text-orange-500 font-medium" title="WIP limit aşıldı">⚠</span>
          )}
          <span className="text-xs text-gray-500">
            {activeCards.length}{list.wip_limit !== null ? `/${list.wip_limit}` : ''}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors outline-none">
              <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAddingCard(true)}>Kart Ekle</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingTitle(true)}>İsmi Değiştir</DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchiveList} className="text-red-500">Arşivle</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards */}
      <Droppable droppableId={list.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[8px] ${
              snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg' : ''
            }`}
          >
            {activeCards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? 'opacity-80 rotate-2' : ''}
                  >
                    <CardItem
                      card={card}
                      labels={labels}
                      onClick={() => setSelectedCard(card)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add Card */}
      <div className="px-2 pb-2">
        {addingCard ? (
          <div className="space-y-1.5">
            <textarea
              className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kart başlığı girin..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard() }
                if (e.key === 'Escape') setAddingCard(false)
              }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={handleAddCard} disabled={!newCardTitle.trim()}>Ekle</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingCard(false); setNewCardTitle('') }}>İptal</Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setAddingCard(true)}
          >
            <Plus className="w-4 h-4" />
            Kart ekle
          </Button>
        )}
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          cardId={selectedCard.id}
          boardId={list.board_id}
          labels={labels}
          boardMembers={boardMembers}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}
