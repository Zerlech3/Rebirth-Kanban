'use client'

import { useEffect, useState } from 'react'
import { Board, List, Label, BoardView } from '@/types'
import { useBoardStore } from '@/store/board.store'
import { LayoutDashboard, Calendar, Table2, Star, Settings } from 'lucide-react'
import KanbanView from './KanbanView/KanbanView'
import CalendarView from './CalendarView/CalendarView'
import TableView from './TableView/TableView'
import BoardMenu from './BoardMenu/BoardMenu'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface BoardClientProps {
  board: Board
  initialLists: List[]
  labels: Label[]
  currentUserId: string
}

export default function BoardClient({ board, initialLists, labels, currentUserId }: BoardClientProps) {
  const { setBoard, setLists, activeView, setActiveView, lists } = useBoardStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isStarred, setIsStarred] = useState(board.is_starred)
  const router = useRouter()

  useEffect(() => {
    setBoard(board)
    setLists(initialLists)
  }, [board, initialLists, setBoard, setLists])

  const toggleStar = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('boards')
      .update({ is_starred: !isStarred })
      .eq('id', board.id)
    if (!error) {
      setIsStarred(!isStarred)
      toast.success(isStarred ? 'Favorilerden kaldırıldı' : 'Favorilere eklendi')
      router.refresh()
    }
  }

  const boardBg = board.background.startsWith('#')
    ? { backgroundColor: board.background }
    : { backgroundImage: `url(${board.background})`, backgroundSize: 'cover' }

  return (
    <div className="h-full flex flex-col" style={boardBg}>
      {/* Board Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-white font-bold text-lg">{board.title}</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={toggleStar}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-white/20 rounded-lg p-0.5 gap-0.5">
            {(['kanban', 'calendar', 'table'] as BoardView[]).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeView === view
                    ? 'bg-white text-gray-900'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                {view === 'kanban' && <LayoutDashboard className="w-3.5 h-3.5" />}
                {view === 'calendar' && <Calendar className="w-3.5 h-3.5" />}
                {view === 'table' && <Table2 className="w-3.5 h-3.5" />}
                {view === 'kanban' ? 'Kanban' : view === 'calendar' ? 'Takvim' : 'Tablo'}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 gap-1.5"
            onClick={() => setMenuOpen(true)}
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs">Menü</span>
          </Button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'kanban' && (
          <KanbanView
            lists={lists}
            boardId={board.id}
            labels={labels}
            currentUserId={currentUserId}
            boardMembers={board.members || []}
          />
        )}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'table' && <TableView labels={labels} />}
      </div>

      {/* Board Menu Drawer */}
      {menuOpen && (
        <BoardMenu
          board={board}
          labels={labels}
          currentUserId={currentUserId}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}
