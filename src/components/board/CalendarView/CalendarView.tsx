'use client'

import { useState, useMemo } from 'react'
import { useBoardStore } from '@/store/board.store'
import { Card } from '@/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const priorityColors: Record<string, string> = {
  low: 'bg-green-500',
  normal: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

export default function CalendarView() {
  const { lists } = useBoardStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [, setSelectedCard] = useState<Card | null>(null)

  // Tüm aktif kartları düzleştir
  const allCards = useMemo(() => {
    return lists.flatMap(l => (l.cards || []).filter(c => !c.is_archived && c.due_date_end))
  }, [lists])

  // Takvim günleri (6 hafta x 7 gün grid)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

  const getCardsForDay = (day: Date) =>
    allCards.filter(c => c.due_date_end && isSameDay(new Date(c.due_date_end), day))

  return (
    <div className="h-full flex flex-col bg-white/10 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-white font-semibold text-lg min-w-36 text-center">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </h2>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs" onClick={() => setCurrentDate(new Date())}>
          Bugün
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg h-full flex flex-col">
          {/* Gün başlıkları */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {weekDays.map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Günler */}
          <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${Math.ceil(calendarDays.length / 7)}, minmax(80px, 1fr))` }}>
            {calendarDays.map((day, i) => {
              const dayCards = getCardsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isCurrentMonth = isSameMonth(day, currentDate)
              return (
                <div
                  key={i}
                  className={cn(
                    'border-r border-b border-gray-100 dark:border-gray-800 p-1.5 min-h-[80px]',
                    !isCurrentMonth && 'bg-gray-50 dark:bg-gray-900/50',
                    i % 7 === 6 && 'border-r-0'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                    isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayCards.slice(0, 3).map(card => (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className={cn(
                          'text-[10px] text-white rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity',
                          priorityColors[card.priority] || 'bg-blue-500'
                        )}
                        title={card.title}
                      >
                        {card.title}
                      </div>
                    ))}
                    {dayCards.length > 3 && (
                      <div className="text-[10px] text-gray-500 pl-1">+{dayCards.length - 3} daha</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 bg-black/10">
        {Object.entries({ low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil' }).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded-full', priorityColors[key])} />
            <span className="text-white/70 text-xs">{label}</span>
          </div>
        ))}
        <span className="text-white/50 text-xs ml-auto">Sadece son tarihi olan kartlar gösterilir</span>
      </div>
    </div>
  )
}
