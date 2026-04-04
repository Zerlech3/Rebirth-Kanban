'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { List, Label, BoardMember } from '@/types'
import { useBoardStore } from '@/store/board.store'
import { createClient } from '@/lib/supabase/client'
import ListColumn from '../../list/ListColumn'
import AddListButton from '../../list/AddListButton'
import { toast } from 'sonner'

interface KanbanViewProps {
  lists: List[]
  boardId: string
  labels: Label[]
  currentUserId: string
  boardMembers: BoardMember[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function KanbanView({ lists: _lists, boardId, labels, currentUserId, boardMembers }: KanbanViewProps) {
  const { moveCard, moveList, lists: storeLists } = useBoardStore()

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const supabase = createClient()

    if (type === 'LIST') {
      const newLists = Array.from(storeLists)
      const [removed] = newLists.splice(source.index, 1)
      newLists.splice(destination.index, 0, removed)

      newLists.forEach((list, idx) => {
        moveList(list.id, idx)
      })

      // Persist to DB
      await Promise.all(
        newLists.map((list, idx) =>
          supabase.from('lists').update({ position: idx }).eq('id', list.id)
        )
      )
      return
    }

    // Card move — sadece aktif (arşivlenmemiş) kartları kullan
    const sourceList = storeLists.find((l) => l.id === source.droppableId)
    const destList = storeLists.find((l) => l.id === destination.droppableId)
    if (!sourceList || !destList) return

    // Görsel sırayla aynı filtreleme (ListColumn ile tutarlı)
    const sourceActive = (sourceList.cards || [])
      .filter((c) => !c.is_archived)
      .sort((a, b) => a.position - b.position)

    const movedCard = sourceActive[source.index]
    if (!movedCard) return

    // WIP limit kontrolü
    if (
      source.droppableId !== destination.droppableId &&
      destList.wip_limit !== null &&
      (destList.cards || []).filter((c) => !c.is_archived).length >= destList.wip_limit
    ) {
      toast.error(`Bu liste WIP limitine ulaştı (max ${destList.wip_limit} kart)`)
      return
    }

    // Optimistic UI güncelle
    moveCard(movedCard.id, source.droppableId, destination.droppableId, destination.index)

    // Aynı liste içinde sıralama
    if (source.droppableId === destination.droppableId) {
      const reordered = [...sourceActive]
      reordered.splice(source.index, 1)
      reordered.splice(destination.index, 0, movedCard)
      await Promise.all(
        reordered.map((card, idx) =>
          supabase.from('cards').update({ position: idx }).eq('id', card.id)
        )
      )
      return
    }

    // Farklı listeler arası taşıma
    await supabase
      .from('cards')
      .update({ list_id: destination.droppableId, position: destination.index })
      .eq('id', movedCard.id)

    // Hedef listedeki aktif kartları yeniden sırala
    const destActive = (destList.cards || [])
      .filter((c) => !c.is_archived && c.id !== movedCard.id)
      .sort((a, b) => a.position - b.position)

    destActive.splice(destination.index, 0, movedCard)

    await Promise.all(
      destActive.map((card, idx) =>
        supabase.from('cards').update({ position: idx }).eq('id', card.id)
      )
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" type="LIST" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-3 h-full overflow-x-auto p-4 items-start"
          >
            {storeLists.map((list, index) => (
              <Draggable key={list.id} draggableId={list.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`flex-shrink-0 ${snapshot.isDragging ? 'opacity-80' : ''}`}
                  >
                    <ListColumn
                      list={list}
                      dragHandleProps={provided.dragHandleProps}
                      labels={labels}
                      currentUserId={currentUserId}
                      boardMembers={boardMembers}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <AddListButton boardId={boardId} />
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
