'use client'

import { useState, useMemo } from 'react'
import { useBoardStore } from '@/store/board.store'
import { Card, Label } from '@/types'
import { format, isBefore } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type SortField = 'title' | 'priority' | 'due_date_end' | 'list'
type SortDir = 'asc' | 'desc'

import { BoardFilters } from '../BoardClient'

interface TableViewProps {
  labels: Label[]
  filters: BoardFilters
}

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
const priorityLabels: Record<string, string> = { low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil' }
const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function TableView({ labels, filters }: TableViewProps) {
  const { lists } = useBoardStore()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('list')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterList, setFilterList] = useState<string>('')

  const rows = useMemo(() => {
    const now = new Date()
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    let all: (Card & { listTitle: string })[] = []
    lists.forEach(l => {
      ;(l.cards || [])
        .filter(c => !c.is_archived)
        .forEach(c => all.push({ ...c, listTitle: l.title }))
    })

    if (search) all = all.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    if (filterPriority) all = all.filter(c => c.priority === filterPriority)
    if (filterList) all = all.filter(c => c.list_id === filterList)
    // Board-level filters
    if (filters.labelIds.length > 0) all = all.filter(c => (c.labels ?? []).some(l => filters.labelIds.includes(l.id)))
    if (filters.memberIds.length > 0) all = all.filter(c => (c.members ?? []).some(m => filters.memberIds.includes(m.user_id)))
    if (filters.priority.length > 0) all = all.filter(c => filters.priority.includes(c.priority))
    if (filters.dueDate === 'overdue') all = all.filter(c => c.due_date_end && new Date(c.due_date_end) < now)
    if (filters.dueDate === 'upcoming') all = all.filter(c => c.due_date_end && new Date(c.due_date_end) >= now && new Date(c.due_date_end) <= threeDaysLater)
    if (filters.dueDate === 'no_date') all = all.filter(c => !c.due_date_end)

    all.sort((a, b) => {
      let cmp = 0
      if (sortField === 'title') cmp = a.title.localeCompare(b.title, 'tr')
      else if (sortField === 'priority') cmp = priorityOrder[a.priority] - priorityOrder[b.priority]
      else if (sortField === 'list') cmp = a.listTitle.localeCompare(b.listTitle, 'tr')
      else if (sortField === 'due_date_end') {
        if (!a.due_date_end && !b.due_date_end) cmp = 0
        else if (!a.due_date_end) cmp = 1
        else if (!b.due_date_end) cmp = -1
        else cmp = new Date(a.due_date_end).getTime() - new Date(b.due_date_end).getTime()
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return all
  }, [lists, search, sortField, sortDir, filterPriority, filterList])

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronUp className="w-3 h-3 opacity-20" />

  const now = new Date()

  return (
    <div className="h-full flex flex-col bg-white/10 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-black/20">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
          <input
            type="text"
            placeholder="Kart ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/20 outline-none focus:bg-white/30 w-48"
          />
        </div>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg bg-white/20 text-white border border-white/20 outline-none"
        >
          <option value="">Tüm Öncelikler</option>
          <option value="urgent">Acil</option>
          <option value="high">Yüksek</option>
          <option value="normal">Normal</option>
          <option value="low">Düşük</option>
        </select>
        <select
          value={filterList}
          onChange={e => setFilterList(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-lg bg-white/20 text-white border border-white/20 outline-none"
        >
          <option value="">Tüm Listeler</option>
          {lists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <span className="text-white/60 text-xs ml-auto">{rows.length} kart</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort('title')}>
                    Kart Başlığı <SortIcon field="title" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort('list')}>
                    Liste <SortIcon field="list" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort('priority')}>
                    Öncelik <SortIcon field="priority" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <button className="flex items-center gap-1 hover:text-gray-700" onClick={() => toggleSort('due_date_end')}>
                    Son Tarih <SortIcon field="due_date_end" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Üyeler</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Etiketler</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Checklist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map(card => {
                const isOverdue = card.due_date_end && isBefore(new Date(card.due_date_end), now)
                const totalItems = card.checklists?.reduce((a, c) => a + (c.items?.length || 0), 0) ?? 0
                const doneItems = card.checklists?.reduce((a, c) => a + (c.items?.filter(i => i.is_completed).length || 0), 0) ?? 0
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cardLabels = (card.labels ?? []).map((cl: any) => cl?.label || labels.find(l => l.id === cl?.label_id)).filter(Boolean)

                return (
                  <tr key={card.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {card.priority !== 'normal' && (
                          <div className={cn('w-1 h-4 rounded-full flex-shrink-0', {
                            'bg-green-400': card.priority === 'low',
                            'bg-orange-400': card.priority === 'high',
                            'bg-red-500': card.priority === 'urgent',
                          })} />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{card.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
                        {card.listTitle}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', priorityColors[card.priority])}>
                        {priorityLabels[card.priority]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {card.due_date_end ? (
                        <span className={cn('text-xs', isOverdue ? 'text-red-600 font-medium' : 'text-gray-500')}>
                          {format(new Date(card.due_date_end), 'd MMM yyyy', { locale: tr })}
                          {isOverdue && ' ⚠️'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(card.members || []).slice(0, 3).map((m: any) => (
                          <div
                            key={m.user_id}
                            className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[9px] font-bold"
                            title={m.user?.full_name}
                          >
                            {(m.user?.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {cardLabels.slice(0, 3).map((label: any) => (
                          <span key={label.id} className="w-4 h-2 rounded-full" style={{ backgroundColor: label.color }} title={label.name} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {totalItems > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(doneItems / totalItems) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{doneItems}/{totalItems}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Gösterilecek kart bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
