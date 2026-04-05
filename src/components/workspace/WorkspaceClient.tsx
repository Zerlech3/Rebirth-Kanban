'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Workspace, Board, WorkspaceMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Star, Settings, Users, Layout, Loader2, Trash2, UserMinus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkspaceClientProps {
  workspace: Workspace
  boards: Board[]
  members: WorkspaceMember[]
  currentUserId: string
  isOwner: boolean
}

const BG_COLORS = ['#0079bf', '#d29034', '#519839', '#b04632', '#89609e', '#cd5a91']

const BOARD_TEMPLATES = [
  {
    id: 'blank',
    label: 'Boş Board',
    description: 'Sıfırdan başla',
    lists: [],
  },
  {
    id: 'musteri_projesi',
    label: 'Müşteri Projesi',
    description: 'Briefing → Analiz → Uygulama → Review → Teslim',
    lists: ['Briefing', 'Analiz', 'Uygulama', 'Review', 'Teslim'],
  },
  {
    id: 'haftalik_sprint',
    label: 'Haftalık Sprint',
    description: 'Backlog → Bu Hafta → Devam Eden → Test → Tamamlandı',
    lists: ['Backlog', 'Bu Hafta', 'Devam Eden', 'Test', 'Tamamlandı'],
  },
  {
    id: 'crm',
    label: 'Müşteri İlişkileri (CRM)',
    description: 'Potansiyel → İlk Görüşme → Teklif → Anlaşma → Aktif Müşteri',
    lists: ['Potansiyel', 'İlk Görüşme', 'Teklif', 'Anlaşma', 'Aktif Müşteri'],
  },
  {
    id: 'ic_operasyon',
    label: 'İç Operasyon',
    description: 'Yapılacak → Devam Eden → Beklemede → Tamamlandı',
    lists: ['Yapılacak', 'Devam Eden', 'Beklemede', 'Tamamlandı'],
  },
]

export default function WorkspaceClient({
  workspace,
  boards: initialBoards,
  members: initialMembers,
  currentUserId,
  isOwner,
}: WorkspaceClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'boards'
  const [boards, setBoards] = useState<Board[]>(initialBoards)
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers)

  // Board creation modal state
  const [createBoardOpen, setCreateBoardOpen] = useState(false)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardBg, setNewBoardBg] = useState(BG_COLORS[0])
  const [newBoardVisibility, setNewBoardVisibility] = useState<'private' | 'workspace' | 'public'>('workspace')
  const [selectedTemplate, setSelectedTemplate] = useState('blank')
  const [creatingBoard, setCreatingBoard] = useState(false)

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'employee' | 'manager'>('employee')
  const [inviting, setInviting] = useState(false)

  // Settings state
  const [wsName, setWsName] = useState(workspace.name)
  const [wsDescription, setWsDescription] = useState(workspace.description || '')
  const [savingSettings, setSavingSettings] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletingWs, setDeletingWs] = useState(false)

  const supabase = createClient()

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return
    setCreatingBoard(true)
    try {
      const { data: newBoard, error } = await supabase
        .from('boards')
        .insert({
          workspace_id: workspace.id,
          title: newBoardTitle.trim(),
          background: newBoardBg,
          visibility: newBoardVisibility,
          is_starred: false,
          is_archived: false,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (error) { toast.error('Board oluşturulamadı'); return }

      // Add creator as board admin
      await supabase.from('board_members').insert({
        board_id: newBoard.id,
        user_id: currentUserId,
        role: 'admin',
      })

      // Şablon listelerini oluştur
      const template = BOARD_TEMPLATES.find((t) => t.id === selectedTemplate)
      if (template && template.lists.length > 0) {
        await supabase.from('lists').insert(
          template.lists.map((title, position) => ({
            board_id: newBoard.id,
            title,
            position,
          }))
        )
      }

      setBoards((prev) => [newBoard, ...prev])
      setNewBoardTitle('')
      setNewBoardBg(BG_COLORS[0])
      setNewBoardVisibility('workspace')
      setSelectedTemplate('blank')
      setCreateBoardOpen(false)
      toast.success('Board oluşturuldu')
    } finally {
      setCreatingBoard(false)
    }
  }

  const toggleStar = async (board: Board, e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await supabase
      .from('boards')
      .update({ is_starred: !board.is_starred })
      .eq('id', board.id)
    if (!error) {
      setBoards((prev) =>
        prev.map((b) => b.id === board.id ? { ...b, is_starred: !b.is_starred } : b)
      )
      toast.success(board.is_starred ? 'Favorilerden kaldırıldı' : 'Favorilere eklendi')
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (res.ok) {
        toast.success('Davet gönderildi')
        setInviteEmail('')
        setInviteOpen(false)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Davet gönderilemedi')
      }
    } finally {
      setInviting(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!wsName.trim()) return
    setSavingSettings(true)
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: wsName.trim(), description: wsDescription })
        .eq('id', workspace.id)
      if (error) { toast.error('Kaydedilemedi'); return }
      toast.success('Ayarlar kaydedildi')
      router.refresh()
    } finally {
      setSavingSettings(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    setDeletingWs(true)
    try {
      const { error } = await supabase.from('workspaces').delete().eq('id', workspace.id)
      if (error) { toast.error('Silinemedi'); return }
      toast.success('Çalışma alanı silindi')
      router.push('/dashboard')
    } finally {
      setDeletingWs(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspace.id)
      .eq('user_id', userId)
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
      toast.success('Üye kaldırıldı')
    }
  }

  const tabs = [
    { value: 'boards', label: "Board'lar", icon: Layout },
    { value: 'members', label: 'Üyeler', icon: Users },
    ...(isOwner ? [{ value: 'settings', label: 'Ayarlar', icon: Settings }] : []),
  ]

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {/* Workspace Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{workspace.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={(val) => router.push(`/workspace/${workspace.id}?tab=${val}`)}>
          <TabsList className="mb-6">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Boards Tab */}
          <TabsContent value="boards">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* Create Board Button */}
              <button
                onClick={() => setCreateBoardOpen(true)}
                className="h-24 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Yeni Board</span>
              </button>

              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="relative h-24 rounded-xl cursor-pointer group overflow-hidden"
                  style={{ backgroundColor: board.background.startsWith('#') ? board.background : '#0079bf' }}
                >
                  {/* Background image */}
                  {!board.background.startsWith('#') && (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${board.background})` }}
                    />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white font-semibold text-sm leading-tight drop-shadow">{board.title}</p>
                  </div>
                  {/* Star button */}
                  <button
                    onClick={(e) => toggleStar(board, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/20"
                  >
                    <Star
                      className={cn('w-3.5 h-3.5', board.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-white')}
                    />
                  </button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Üyeler ({members.length})
                </h2>
                {isOwner && (
                  <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Üye Davet Et
                  </Button>
                )}
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {members.map((member) => {
                  const memberUser = (member as WorkspaceMember & { users?: { id: string; full_name: string; email: string; avatar_url: string | null; role: string } }).users ?? member.user
                  return (
                    <div key={member.user_id} className="flex items-center gap-4 px-4 py-3">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={memberUser?.avatar_url ?? ''} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm">
                          {memberUser?.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {memberUser?.full_name ?? 'Bilinmeyen'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{memberUser?.email}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize flex-shrink-0">
                        {member.role}
                      </Badge>
                      {isOwner && member.user_id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-500 flex-shrink-0"
                          onClick={() => handleRemoveMember(member.user_id)}
                          title="Üyeyi kaldır"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
                {members.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    Henüz üye yok
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab (owner only) */}
          {isOwner && (
            <TabsContent value="settings">
              <div className="max-w-lg space-y-8">
                {/* Edit form */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Genel Ayarlar</h2>
                  <div className="space-y-2">
                    <Label htmlFor="ws-name">Çalışma Alanı Adı</Label>
                    <Input
                      id="ws-name"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      placeholder="Çalışma alanı adı"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ws-desc">Açıklama</Label>
                    <Textarea
                      id="ws-desc"
                      value={wsDescription}
                      onChange={(e) => setWsDescription(e.target.value)}
                      placeholder="Açıklama (opsiyonel)"
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full">
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Kaydet
                  </Button>
                </div>

                {/* Danger Zone */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900 p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Tehlikeli Bölge</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Bu çalışma alanını silerseniz, tüm board&apos;lar ve içerikleri kalıcı olarak silinir.
                  </p>
                  {!deleteConfirm ? (
                    <Button
                      variant="ghost"
                      className="text-red-600 border border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 gap-2"
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Çalışma Alanını Sil
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-red-600">Emin misiniz? Bu işlem geri alınamaz.</p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          className="bg-red-600 text-white hover:bg-red-700 gap-2"
                          onClick={handleDeleteWorkspace}
                          disabled={deletingWs}
                        >
                          {deletingWs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Evet, Sil
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>
                          İptal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Create Board Modal */}
      <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Board Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Şablon seçimi */}
            <div className="space-y-2">
              <Label>Şablon</Label>
              <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto">
                {BOARD_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`text-left p-2.5 rounded-lg border-2 transition-all ${
                      selectedTemplate === t.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-title">Board Adı *</Label>
              <Input
                id="board-title"
                placeholder="Board adı"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBoard() }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Arka Plan Rengi</Label>
              <div className="flex gap-2 flex-wrap">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewBoardBg(color)}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-all',
                      newBoardBg === color ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110' : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              {/* Preview */}
              <div
                className="h-16 rounded-lg mt-2 transition-colors"
                style={{ backgroundColor: newBoardBg }}
              />
            </div>

            <div className="space-y-2">
              <Label>Görünürlük</Label>
              <Select
                value={newBoardVisibility}
                onValueChange={(v) => setNewBoardVisibility(v as 'private' | 'workspace' | 'public')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Özel</SelectItem>
                  <SelectItem value="workspace">Çalışma Alanı</SelectItem>
                  <SelectItem value="public">Herkese Açık</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreateBoard}
                disabled={!newBoardTitle.trim() || creatingBoard}
                className="flex-1"
              >
                {creatingBoard ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Oluştur
              </Button>
              <Button variant="ghost" onClick={() => setCreateBoardOpen(false)}>
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Member Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Üye Davet Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-posta Adresi *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="ornek@sirket.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as 'employee' | 'manager')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Çalışan</SelectItem>
                  <SelectItem value="manager">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="flex-1"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Davet Gönder
              </Button>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
