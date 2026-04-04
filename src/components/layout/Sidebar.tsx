'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Bell,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  Star,
  Building2,
  Menu,
  X,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface SidebarProps {
  workspaces: { id: string; name: string; logo_url: string | null }[]
  starredBoards: { id: string; title: string; background: string; workspace_id: string }[]
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/notifications', icon: Bell, label: 'Bildirimler' },
  { href: '/reports', icon: BarChart2, label: 'Raporlar' },
  { href: '/admin', icon: Settings, label: 'Yönetim' },
]

export default function Sidebar({ workspaces, starredBoards }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<string[]>([])
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [wsName, setWsName] = useState('')
  const [wsDesc, setWsDesc] = useState('')
  const [wsLoading, setWsLoading] = useState(false)

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    )
  }

  const handleCreateWorkspace = async () => {
    if (!wsName.trim()) { toast.error('İsim zorunlu'); return }
    setWsLoading(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: wsName.trim(), description: wsDesc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Hata'); return }
      toast.success('Çalışma alanı oluşturuldu')
      setCreateWorkspaceOpen(false)
      setWsName(''); setWsDesc('')
      router.push(`/workspace/${data.id}`)
      router.refresh()
    } catch { toast.error('Bir hata oluştu') }
    finally { setWsLoading(false) }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        {!collapsed && (
          <span className="font-bold text-gray-900 dark:text-white text-lg">Rebirth</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {/* Ana Navigasyon */}
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </div>
          </Link>
        ))}

        {/* Yıldızlı Board'lar */}
        {starredBoards.length > 0 && !collapsed && (
          <div className="pt-4">
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Star className="w-3 h-3" />
              Favoriler
            </div>
            {starredBoards.map((board) => (
              <Link key={board.id} href={`/board/${board.id}`}>
                <div className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  pathname === `/board/${board.id}`
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}>
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ background: board.background }}
                  />
                  <span className="truncate">{board.title}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Workspace'ler */}
        {!collapsed && (
          <div className="pt-4">
            <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Çalışma Alanları
              </span>
              <button
                onClick={() => setCreateWorkspaceOpen(true)}
                className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Yeni Çalışma Alanı"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {workspaces.map((ws) => (
              <div key={ws.id}>
                <button
                  onClick={() => toggleWorkspace(ws.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  {expandedWorkspaces.includes(ws.id) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {expandedWorkspaces.includes(ws.id) && (
                  <div className="ml-4 space-y-1">
                    <Link href={`/workspace/${ws.id}`}>
                      <div className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors',
                        pathname === `/workspace/${ws.id}`
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                      )}>
                        Board&apos;lar
                      </div>
                    </Link>
                    <Link href={`/workspace/${ws.id}?tab=members`}>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
                        Üyeler
                      </div>
                    </Link>
                    <Link href={`/workspace/${ws.id}?tab=settings`}>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
                        Ayarlar
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {!collapsed && <span className="ml-2 text-xs">Daralt</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-white dark:bg-gray-900 rounded-lg p-2 shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-hidden',
          'hidden lg:flex lg:flex-col',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile
          mobileOpen && '!flex fixed inset-y-0 left-0 z-40 w-64 lg:relative lg:z-auto'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Workspace Oluşturma Modalı */}
      <Dialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Çalışma Alanı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">İsim *</label>
              <Input
                placeholder="Çalışma alanı adı"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Açıklama</label>
              <Textarea
                placeholder="Opsiyonel açıklama..."
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateWorkspaceOpen(false)}>İptal</Button>
              <Button onClick={handleCreateWorkspace} disabled={wsLoading || !wsName.trim()}>
                {wsLoading ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
