'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBoardStore } from '@/store/board.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function AddListButton({ boardId }: { boardId: string }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const { addList, lists } = useBoardStore()

  const handleAdd = async () => {
    if (!title.trim()) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('lists')
      .insert({ board_id: boardId, title: title.trim(), position: lists.length })
      .select()
      .single()

    if (error) { toast.error('Liste eklenemedi'); return }
    addList(data)
    setTitle('')
    setAdding(false)
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex-shrink-0 w-72 h-12 flex items-center gap-2 px-4 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Liste ekle
      </button>
    )
  }

  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 space-y-2">
      <Input
        placeholder="Liste adı..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd()
          if (e.key === 'Escape') { setAdding(false); setTitle('') }
        }}
        autoFocus
        className="h-8 text-sm"
      />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={handleAdd} disabled={!title.trim()}>Ekle</Button>
        <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setTitle('') }}>İptal</Button>
      </div>
    </div>
  )
}
