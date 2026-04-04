import { create } from 'zustand'
import { Board, List, Card, BoardView } from '@/types'

interface BoardStore {
  board: Board | null
  lists: List[]
  activeView: BoardView
  filterLabels: string[]
  filterMembers: string[]
  filterPriority: string | null
  setBoard: (board: Board | null) => void
  setLists: (lists: List[]) => void
  setActiveView: (view: BoardView) => void
  setFilterLabels: (labels: string[]) => void
  setFilterMembers: (members: string[]) => void
  setFilterPriority: (priority: string | null) => void
  addList: (list: List) => void
  updateList: (id: string, data: Partial<List>) => void
  removeList: (id: string) => void
  addCard: (listId: string, card: Card) => void
  updateCard: (cardId: string, data: Partial<Card>) => void
  removeCard: (cardId: string) => void
  moveCard: (cardId: string, fromListId: string, toListId: string, newPosition: number) => void
  moveList: (listId: string, newPosition: number) => void
  clearFilters: () => void
}

export const useBoardStore = create<BoardStore>((set) => ({
  board: null,
  lists: [],
  activeView: 'kanban',
  filterLabels: [],
  filterMembers: [],
  filterPriority: null,

  setBoard: (board) => set({ board }),
  setLists: (lists) => set({ lists }),
  setActiveView: (view) => set({ activeView: view }),
  setFilterLabels: (labels) => set({ filterLabels: labels }),
  setFilterMembers: (members) => set({ filterMembers: members }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),

  addList: (list) =>
    set((state) => ({ lists: [...state.lists, { ...list, cards: [] }] })),

  updateList: (id, data) =>
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? { ...l, ...data } : l)),
    })),

  removeList: (id) =>
    set((state) => ({ lists: state.lists.filter((l) => l.id !== id) })),

  addCard: (listId, card) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId ? { ...l, cards: [...(l.cards || []), card] } : l
      ),
    })),

  updateCard: (cardId, data) =>
    set((state) => ({
      lists: state.lists.map((l) => ({
        ...l,
        cards: (l.cards || []).map((c) => (c.id === cardId ? { ...c, ...data } : c)),
      })),
    })),

  removeCard: (cardId) =>
    set((state) => ({
      lists: state.lists.map((l) => ({
        ...l,
        cards: (l.cards || []).filter((c) => c.id !== cardId),
      })),
    })),

  moveCard: (cardId, fromListId, toListId, newPosition) =>
    set((state) => {
      const fromList = state.lists.find((l) => l.id === fromListId)
      const card = fromList?.cards?.find((c) => c.id === cardId)
      if (!card) return state

      // Aynı liste içinde sıralama
      if (fromListId === toListId) {
        return {
          lists: state.lists.map((l) => {
            if (l.id !== fromListId) return l
            const active = (l.cards || [])
              .filter((c) => !c.is_archived && c.id !== cardId)
              .sort((a, b) => a.position - b.position)
            const archived = (l.cards || []).filter((c) => c.is_archived)
            active.splice(newPosition, 0, { ...card, position: newPosition })
            return { ...l, cards: [...active.map((c, i) => ({ ...c, position: i })), ...archived] }
          }),
        }
      }

      // Farklı listeler arası taşıma
      const updatedCard = { ...card, list_id: toListId, position: newPosition }
      return {
        lists: state.lists.map((l) => {
          if (l.id === fromListId) {
            return { ...l, cards: (l.cards || []).filter((c) => c.id !== cardId) }
          }
          if (l.id === toListId) {
            const active = (l.cards || [])
              .filter((c) => !c.is_archived)
              .sort((a, b) => a.position - b.position)
            active.splice(newPosition, 0, updatedCard)
            const archived = (l.cards || []).filter((c) => c.is_archived)
            return { ...l, cards: [...active.map((c, i) => ({ ...c, position: i })), ...archived] }
          }
          return l
        }),
      }
    }),

  moveList: (listId, newPosition) =>
    set((state) => ({
      lists: state.lists
        .map((l) => (l.id === listId ? { ...l, position: newPosition } : l))
        .sort((a, b) => a.position - b.position),
    })),

  clearFilters: () =>
    set({ filterLabels: [], filterMembers: [], filterPriority: null }),
}))
