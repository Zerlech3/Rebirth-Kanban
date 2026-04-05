'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, LayoutDashboard, CheckSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface SearchCard {
  id: string
  title: string
  description: string | null
  priority: string
  due_date_end: string | null
  list_id: string
  lists: { id: string; title: string; boards: { id: string; title: string; background: string } | null } | null
}

interface SearchBoard {
  id: string
  title: string
  background: string
  workspace_id: string
}

interface SearchClientProps {
  query: string
  cards: SearchCard[]
  boards: SearchBoard[]
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}
const priorityLabels: Record<string, string> = { low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil' }

export default function SearchClient({ query, cards, boards }: SearchClientProps) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(query)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Kart veya board ara..."
          className="pl-10 h-11 text-base"
          autoFocus
        />
      </form>

      {query && (
        <p className="text-sm text-gray-500">
          &quot;<span className="font-medium text-gray-800 dark:text-gray-200">{query}</span>&quot; için {cards.length + boards.length} sonuç bulundu
        </p>
      )}

      {/* Board'lar */}
      {boards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Board&apos;lar ({boards.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {boards.map((board) => (
              <Link key={board.id} href={`/board/${board.id}`}>
                <div className="relative h-20 rounded-xl overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
                  <div
                    className="absolute inset-0"
                    style={{ background: board.background.startsWith('#') ? board.background : `url(${board.background}) center/cover` }}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                  <div className="absolute bottom-2 left-3">
                    <p className="text-white font-semibold text-sm">{board.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Kartlar */}
      {cards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Kartlar ({cards.length})
          </h2>
          <div className="space-y-2">
            {cards.map((card) => {
              const boardId = card.lists?.boards?.id
              return (
                <Link key={card.id} href={boardId ? `/board/${boardId}` : '#'}>
                  <div className="flex items-center gap-4 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{card.title}</p>
                      {card.lists && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {card.lists.boards?.title} → {card.lists.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`${priorityColors[card.priority]} text-xs`}>
                        {priorityLabels[card.priority]}
                      </Badge>
                      {card.due_date_end && (
                        <span className="text-xs text-gray-500">
                          {format(new Date(card.due_date_end), 'd MMM', { locale: tr })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {query && cards.length === 0 && boards.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Sonuç bulunamadı</p>
          <p className="text-sm text-gray-400">Farklı bir arama terimi deneyin</p>
        </div>
      )}
    </div>
  )
}
