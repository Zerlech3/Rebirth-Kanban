'use client'

import { Board, Label } from '@/types'
import { Button } from '@/components/ui/button'
import { X, Info, Palette, Users, Tag, Clock, Archive } from 'lucide-react'

interface BoardMenuProps {
  board: Board
  labels: Label[]
  currentUserId: string
  onClose: () => void
}

export default function BoardMenu({ board, labels, currentUserId, onClose }: BoardMenuProps) {
  // Suppress unused-variable warnings for future use
  void board
  void labels
  void currentUserId

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">Board Menüsü</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {[
          { icon: Info, label: 'Hakkında' },
          { icon: Palette, label: 'Arka Plan' },
          { icon: Users, label: 'Üyeler' },
          { icon: Tag, label: 'Etiketler' },
          { icon: Clock, label: 'Aktivite' },
          { icon: Archive, label: 'Arşiv' },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
