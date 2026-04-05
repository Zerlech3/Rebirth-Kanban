'use client'

import { useState } from 'react'
import { Board, Label } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, Info, Palette, Users, Tag, Clock, Archive, ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useBoardStore } from '@/store/board.store'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface BoardMenuProps {
  board: Board
  labels: Label[]
  currentUserId: string
  onClose: () => void
}

type Panel = null | 'about' | 'background' | 'members' | 'labels' | 'activity' | 'archive'

const BG_COLORS = ['#0079bf', '#d29034', '#519839', '#b04632', '#89609e', '#cd5a91', '#00aecc', '#838c91']

const BG_GRADIENTS = [
  'linear-gradient(135deg, #0052cc 0%, #00b8d4 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
  'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
  'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
  'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
  'linear-gradient(135deg, #701a75 0%, #be185d 100%)',
  'linear-gradient(135deg, #1e3a5f 0%, #0f766e 100%)',
]

export default function BoardMenu({ board, labels: initialLabels, currentUserId, onClose }: BoardMenuProps) {
  const [panel, setPanel] = useState<Panel>(null)
  const [labels, setLabels] = useState<Label[]>(initialLabels)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#0079bf')
  const [activities, setActivities] = useState<{ id: string; description: string; created_at: string }[]>([])
  const [archivedCards, setArchivedCards] = useState<{ id: string; title: string; list_id: string }[]>([])
  const [boardMembers, setBoardMembers] = useState<{ user_id: string; role: string; user?: { full_name: string; email: string } }[]>(board.members || [])
  const [description, setDescription] = useState(board.description || '')
  const [savingDesc, setSavingDesc] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { lists } = useBoardStore()

  const openPanel = async (p: Panel) => {
    setPanel(p)
    if (p === 'activity') {
      const { data } = await supabase
        .from('activities')
        .select('id, description, created_at')
        .eq('board_id', board.id)
        .order('created_at', { ascending: false })
        .limit(30)
      setActivities(data || [])
    }
    if (p === 'archive') {
      const listIds = lists.map((l) => l.id)
      if (listIds.length === 0) { setArchivedCards([]); return }
      const { data } = await supabase
        .from('cards')
        .select('id, title, list_id')
        .eq('is_archived', true)
        .in('list_id', listIds)
      setArchivedCards(data || [])
    }
    if (p === 'members') {
      const { data } = await supabase
        .from('board_members')
        .select('user_id, role, user:users(full_name, email)')
        .eq('board_id', board.id)
      setBoardMembers((data as typeof boardMembers) || [])
    }
  }

  const handleBgChange = async (bg: string) => {
    await supabase.from('boards').update({ background: bg }).eq('id', board.id)
    toast.success('Arka plan güncellendi')
    router.refresh()
  }

  const handleSaveDesc = async () => {
    setSavingDesc(true)
    await supabase.from('boards').update({ description }).eq('id', board.id)
    setSavingDesc(false)
    toast.success('Açıklama kaydedildi')
    router.refresh()
  }

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return
    const { data, error } = await supabase
      .from('labels')
      .insert({ board_id: board.id, name: newLabelName.trim(), color: newLabelColor })
      .select()
      .single()
    if (error) { toast.error('Etiket eklenemedi'); return }
    setLabels((prev) => [...prev, data])
    setNewLabelName('')
    toast.success('Etiket eklendi')
  }

  const handleDeleteLabel = async (labelId: string) => {
    await supabase.from('labels').delete().eq('id', labelId)
    setLabels((prev) => prev.filter((l) => l.id !== labelId))
    toast.success('Etiket silindi')
  }

  const handleUnarchive = async (cardId: string) => {
    await supabase.from('cards').update({ is_archived: false }).eq('id', cardId)
    setArchivedCards((prev) => prev.filter((c) => c.id !== cardId))
    toast.success('Kart arşivden çıkarıldı')
    router.refresh()
  }

  const menuItems = [
    { id: 'about' as Panel, icon: Info, label: 'Hakkında' },
    { id: 'background' as Panel, icon: Palette, label: 'Arka Plan' },
    { id: 'members' as Panel, icon: Users, label: 'Üyeler' },
    { id: 'labels' as Panel, icon: Tag, label: 'Etiketler' },
    { id: 'activity' as Panel, icon: Clock, label: 'Aktivite' },
    { id: 'archive' as Panel, icon: Archive, label: 'Arşiv' },
  ]

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        {panel ? (
          <button onClick={() => setPanel(null)} className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ChevronLeft className="w-4 h-4" />
            {menuItems.find((m) => m.id === panel)?.label}
          </button>
        ) : (
          <h2 className="font-semibold text-gray-900 dark:text-white">Board Menüsü</h2>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Ana menü */}
        {!panel && (
          <div className="p-2">
            {menuItems.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => openPanel(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Hakkında */}
        {panel === 'about' && (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Board Adı</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{board.title}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Açıklama</p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Board açıklaması ekle..."
                rows={3}
                className="text-sm"
              />
              <Button size="sm" className="mt-2" onClick={handleSaveDesc} disabled={savingDesc}>
                {savingDesc ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        )}

        {/* Arka Plan */}
        {panel === 'background' && (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gradyanlar</p>
              <div className="grid grid-cols-4 gap-2">
                {BG_GRADIENTS.map((g) => (
                  <button
                    key={g}
                    onClick={() => handleBgChange(g)}
                    className="h-12 rounded-lg hover:scale-105 transition-transform ring-2 ring-transparent hover:ring-white shadow-sm"
                    style={{ background: g }}
                    title="Seç"
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Düz Renkler</p>
              <div className="grid grid-cols-4 gap-2">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleBgChange(color)}
                    className="h-10 rounded-lg hover:scale-105 transition-transform ring-2 ring-transparent hover:ring-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fotoğraf URL</p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://images.unsplash.com/..."
                  className="text-xs h-8"
                  id="bg-url-input"
                />
                <button
                  onClick={() => {
                    const val = (document.getElementById('bg-url-input') as HTMLInputElement)?.value
                    if (val?.startsWith('http')) handleBgChange(val)
                  }}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  Uygula
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Üyeler */}
        {panel === 'members' && (
          <div className="p-4 space-y-2">
            {boardMembers.length === 0 && (
              <p className="text-sm text-gray-500">Üye bulunamadı</p>
            )}
            {boardMembers.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {m.user?.full_name?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.user?.full_name ?? 'Bilinmeyen'}</p>
                  <p className="text-xs text-gray-500 truncate">{m.user?.email}</p>
                </div>
                <span className="text-xs text-gray-400 capitalize">{m.role}</span>
              </div>
            ))}
          </div>
        )}

        {/* Etiketler */}
        {panel === 'labels' && (
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              {labels.map((label) => (
                <div key={label.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{label.name}</span>
                  <button
                    onClick={() => handleDeleteLabel(label.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Yeni Etiket</p>
              <Input
                placeholder="Etiket adı"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-1 flex-wrap">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewLabelColor(c)}
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: c, outline: newLabelColor === c ? '2px solid white' : 'none', outlineOffset: '1px' }}
                  />
                ))}
              </div>
              <Button size="sm" className="w-full gap-1" onClick={handleAddLabel} disabled={!newLabelName.trim()}>
                <Plus className="w-3.5 h-3.5" />
                Ekle
              </Button>
            </div>
          </div>
        )}

        {/* Aktivite */}
        {panel === 'activity' && (
          <div className="p-4 space-y-3">
            {activities.length === 0 && (
              <p className="text-sm text-gray-500">Aktivite bulunamadı</p>
            )}
            {activities.map((a) => (
              <div key={a.id} className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{a.description}</p>
                  <p className="text-xs text-gray-400">{format(new Date(a.created_at), 'd MMM, HH:mm', { locale: tr })}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Arşiv */}
        {panel === 'archive' && (
          <div className="p-4 space-y-2">
            {archivedCards.length === 0 && (
              <p className="text-sm text-gray-500">Arşivlenmiş kart yok</p>
            )}
            {archivedCards.map((card) => (
              <div key={card.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{card.title}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 px-2 flex-shrink-0"
                  onClick={() => handleUnarchive(card.id)}
                >
                  Geri Al
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
