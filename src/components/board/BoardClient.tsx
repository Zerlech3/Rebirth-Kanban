'use client'

import { useEffect, useState } from 'react'
import { Board, List, Label, BoardView } from '@/types'
import { useBoardStore } from '@/store/board.store'
import { LayoutDashboard, Calendar, Table2, Star, Settings, Filter, X } from 'lucide-react'
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

export interface BoardFilters {
  labelIds: string[]
  memberIds: string[]
  priority: string[]
  dueDate: 'overdue' | 'upcoming' | 'no_date' | null
}

const EMPTY_FILTERS: BoardFilters = { labelIds: [], memberIds: [], priority: [], dueDate: null }

export default function BoardClient({ board, initialLists, labels, currentUserId }: BoardClientProps) {
  const { setBoard, setLists, activeView, setActiveView, lists } = useBoardStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [isStarred, setIsStarred] = useState(board.is_starred)
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS)
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

  const hasActiveFilters =
    filters.labelIds.length > 0 ||
    filters.memberIds.length > 0 ||
    filters.priority.length > 0 ||
    filters.dueDate !== null

  const toggleLabel = (id: string) =>
    setFilters((f) => ({ ...f, labelIds: f.labelIds.includes(id) ? f.labelIds.filter((x) => x !== id) : [...f.labelIds, id] }))

  const toggleMember = (id: string) =>
    setFilters((f) => ({ ...f, memberIds: f.memberIds.includes(id) ? f.memberIds.filter((x) => x !== id) : [...f.memberIds, id] }))

  const togglePriority = (p: string) =>
    setFilters((f) => ({ ...f, priority: f.priority.includes(p) ? f.priority.filter((x) => x !== p) : [...f.priority, p] }))

  const boardBg = board.background.startsWith('#')
    ? { backgroundColor: board.background }
    : board.background.startsWith('linear-gradient') || board.background.startsWith('radial-gradient')
    ? { backgroundImage: board.background }
    : { backgroundImage: `url(${board.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }

  const boardMembers = board.members || []

  return (
    <div className="h-full flex flex-col" style={boardBg}>
      {/* Board Header */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-black/20 backdrop-blur-sm flex-shrink-0 gap-2">
        {/* Sol: başlık + yıldız + filtre */}
        <div className="flex items-center gap-1.5 min-w-0">
          <h1 className="text-white font-bold text-sm md:text-lg truncate max-w-[120px] md:max-w-none">{board.title}</h1>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-white hover:bg-white/20" onClick={toggleStar}>
            <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 flex-shrink-0 relative ${hasActiveFilters ? 'text-yellow-300 bg-white/20' : 'text-white hover:bg-white/20'}`}
            onClick={() => setFilterOpen((p) => !p)}
            title="Filtrele"
          >
            <Filter className="w-3.5 h-3.5" />
            {hasActiveFilters && (
              <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-gray-900 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {filters.labelIds.length + filters.memberIds.length + filters.priority.length + (filters.dueDate ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {/* Sağ: view switcher + menü */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center bg-white/20 rounded-lg p-0.5 gap-0.5">
            {(['kanban', 'calendar', 'table'] as BoardView[]).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                title={view === 'kanban' ? 'Kanban' : view === 'calendar' ? 'Takvim' : 'Tablo'}
                className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeView === view ? 'bg-white text-gray-900' : 'text-white hover:bg-white/20'
                }`}
              >
                {view === 'kanban' && <LayoutDashboard className="w-3.5 h-3.5" />}
                {view === 'calendar' && <Calendar className="w-3.5 h-3.5" />}
                {view === 'table' && <Table2 className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">
                  {view === 'kanban' ? 'Kanban' : view === 'calendar' ? 'Takvim' : 'Tablo'}
                </span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setMenuOpen(true)} title="Menü">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {filterOpen && (
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
          <div className="flex items-start gap-6 flex-wrap">
            {/* Etiketler */}
            {labels.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Etiketler</p>
                <div className="flex gap-1.5 flex-wrap">
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border-2 transition-all ${
                        filters.labelIds.includes(label.id) ? 'border-gray-900 dark:border-white scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: label.color, color: '#fff' }}
                    >
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Üyeler */}
            {boardMembers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Üyeler</p>
                <div className="flex gap-1.5 flex-wrap">
                  {boardMembers.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => toggleMember(m.user_id)}
                      title={m.user?.full_name}
                      className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center transition-all ${
                        filters.memberIds.includes(m.user_id)
                          ? 'ring-2 ring-offset-1 ring-blue-500 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: '#2563eb' }}
                    >
                      {m.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Öncelik */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Öncelik</p>
              <div className="flex gap-1.5">
                {[
                  { value: 'low', label: 'Düşük', color: 'bg-green-100 text-green-700 border-green-300' },
                  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-300' },
                  { value: 'high', label: 'Yüksek', color: 'bg-orange-100 text-orange-700 border-orange-300' },
                  { value: 'urgent', label: 'Acil', color: 'bg-red-100 text-red-700 border-red-300' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => togglePriority(p.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-2 transition-all ${p.color} ${
                      filters.priority.includes(p.value) ? 'border-gray-900 dark:border-gray-900 scale-105' : 'border-transparent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tarih */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Tarih</p>
              <div className="flex gap-1.5">
                {[
                  { value: 'overdue', label: '🔴 Geciken' },
                  { value: 'upcoming', label: '⚠️ Yaklaşan' },
                  { value: 'no_date', label: 'Tarihi yok' },
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setFilters((f) => ({ ...f, dueDate: f.dueDate === d.value ? null : d.value as BoardFilters['dueDate'] }))}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-2 transition-all ${
                      filters.dueDate === d.value
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Temizle */}
            {hasActiveFilters && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-4"
              >
                <X className="w-3 h-3" /> Filtreleri Temizle
              </button>
            )}
          </div>
        </div>
      )}

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'kanban' && (
          <KanbanView
            lists={lists}
            boardId={board.id}
            labels={labels}
            currentUserId={currentUserId}
            boardMembers={boardMembers}
            filters={filters}
          />
        )}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'table' && <TableView labels={labels} filters={filters} />}
      </div>

      {menuOpen && (
        <BoardMenu board={board} labels={labels} currentUserId={currentUserId} onClose={() => setMenuOpen(false)} />
      )}
    </div>
  )
}
