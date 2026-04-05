'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBoardStore } from '@/store/board.store'
import { Card, List } from '@/types'

/**
 * Board sayfasında Supabase Realtime kullanarak
 * kart ve liste değişikliklerini otomatik yansıtır.
 */
export function useRealtimeBoard(boardId: string) {
  const { addCard, updateCard, removeCard, addList, updateList, removeList } = useBoardStore()

  useEffect(() => {
    if (!boardId) return
    const supabase = createClient()

    // Kartlar kanalı
    const cardChannel = supabase
      .channel(`board-cards-${boardId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cards' },
        (payload) => {
          const card = payload.new as Card
          // Sadece bu board'daki listelere ait kartlar
          addCard(card.list_id, card)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cards' },
        (payload) => {
          const card = payload.new as Card
          updateCard(card.id, card)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cards' },
        (payload) => {
          const card = payload.old as Card
          removeCard(card.id)
        }
      )
      .subscribe()

    // Listeler kanalı
    const listChannel = supabase
      .channel(`board-lists-${boardId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` },
        (payload) => {
          const list = payload.new as List
          addList({ ...list, cards: [] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` },
        (payload) => {
          const list = payload.new as List
          updateList(list.id, list)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` },
        (payload) => {
          const list = payload.old as List
          removeList(list.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(cardChannel)
      supabase.removeChannel(listChannel)
    }
  }, [boardId, addCard, updateCard, removeCard, addList, updateList, removeList])
}
