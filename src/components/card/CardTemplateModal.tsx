'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/input'
import { X, CheckSquare, FileText, Search, Loader2 } from 'lucide-react'

interface ChecklistItemData { title: string }
interface ChecklistData { title: string; items: ChecklistItemData[] }

interface CardTemplate {
  id: string
  title: string
  description: string | null
  checklist_data: ChecklistData[]
  created_by: string
  created_at: string
}

interface CardTemplateModalProps {
  onClose: () => void
  onSelect: (template: CardTemplate) => void
}

export default function CardTemplateModal({ onClose, onSelect }: CardTemplateModalProps) {
  const supabase = createClient()
  const currentUser = useAuthStore((s) => s.user)
  const [templates, setTemplates] = useState<CardTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!currentUser) return
    supabase
      .from('card_templates')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTemplates((data as CardTemplate[]) ?? [])
        setLoading(false)
      })
  }, [currentUser, supabase])

  const filtered = templates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  const totalItems = (t: CardTemplate) =>
    t.checklist_data.reduce((a, cl) => a + cl.items.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-80 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Kart Şablonları</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Şablon ara..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">
              {templates.length === 0 ? 'Henüz şablon yok.\nKart modalından şablon olarak kaydedin.' : 'Şablon bulunamadı'}
            </p>
          ) : (
            <div className="p-2 space-y-1">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{t.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {t.description && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <FileText className="w-3 h-3" /> Açıklama
                          </span>
                        )}
                        {totalItems(t) > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <CheckSquare className="w-3 h-3" /> {totalItems(t)} madde
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
