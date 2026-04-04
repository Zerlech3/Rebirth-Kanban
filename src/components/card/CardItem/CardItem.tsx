'use client'

import { Card, Label } from '@/types'
import { CheckSquare, Clock } from 'lucide-react'
import { format, isBefore, addDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface CardItemProps {
  card: Card
  labels: Label[]
  onClick: () => void
}

export default function CardItem({ card, labels, onClick }: CardItemProps) {
  const now = new Date()
  const dueDate = card.due_date_end ? new Date(card.due_date_end) : null
  const isOverdue = dueDate ? isBefore(dueDate, now) : false
  const isDueSoon = dueDate && !isOverdue ? isBefore(dueDate, addDays(now, 2)) : false

  // card.labels = [{label_id, label: {id, name, color}}] (Supabase join alias)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const cardLabels: Label[] = (card.labels ?? [])
    .map((cl: any) => {
      // Nested alias: cl.label
      if (cl?.label?.color) return cl.label as Label
      // Direct Label object
      if (cl?.color) return cl as Label
      // Fallback: find in board labels array by label_id
      return labels.find((l) => l.id === cl?.label_id) ?? null
    })
    .filter((l): l is Label => l !== null)
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const totalChecklistItems =
    card.checklists?.reduce((acc, cl) => acc + (cl.items?.length ?? 0), 0) ?? 0
  const completedChecklistItems =
    card.checklists?.reduce(
      (acc, cl) => acc + (cl.items?.filter((i) => i.is_completed).length ?? 0),
      0
    ) ?? 0

  const priorityBorderColors: Record<string, string> = {
    low: 'border-l-green-400',
    normal: '',
    high: 'border-l-orange-400',
    urgent: 'border-l-red-500',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-600',
        card.priority !== 'normal' && `border-l-4 ${priorityBorderColors[card.priority]}`
      )}
    >
      {/* Cover image */}
      {card.cover_image_url && (
        <div
          className="h-28 rounded-t-lg bg-cover bg-center"
          style={{ backgroundImage: `url(${card.cover_image_url})` }}
        />
      )}

      <div className="p-2.5">
        {/* Labels */}
        {cardLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {cardLabels.slice(0, 4).map((label) => (
              <span
                key={label.id}
                className="h-2 w-8 rounded-full"
                style={{ backgroundColor: label.color }}
                title={label.name}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug mb-2">
          {card.title}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Due date */}
            {dueDate && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                  isOverdue
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : isDueSoon
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <Clock className="w-3 h-3" />
                {format(dueDate, 'd MMM', { locale: tr })}
              </span>
            )}

            {/* Checklist */}
            {totalChecklistItems > 0 && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  completedChecklistItems === totalChecklistItems
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <CheckSquare className="w-3 h-3" />
                {completedChecklistItems}/{totalChecklistItems}
              </span>
            )}
          </div>

          {/* Member avatars */}
          {card.members && card.members.length > 0 && (
            <div className="flex -space-x-1">
              {card.members.slice(0, 3).map((m) => (
                <div
                  key={m.user_id}
                  className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-gray-700 flex items-center justify-center text-white text-[9px] font-bold"
                  title={m.user?.full_name}
                >
                  {m.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
