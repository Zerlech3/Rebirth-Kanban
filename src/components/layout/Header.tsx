'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/store/notification.store'
import { User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Search, Moon, Sun, LogOut, User as UserIcon, Settings } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'

interface HeaderProps {
  user: User | null
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { unreadCount } = useNotificationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Çıkış yapıldı')
    router.push('/login')
    router.refresh()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U'

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 h-14 flex items-center px-4 gap-4 flex-shrink-0 z-30 sticky top-0 shadow-sm">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-sm ml-8 lg:ml-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            type="text"
            placeholder="Kart veya board ara... (/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm bg-gray-100/80 dark:bg-gray-800/80 border-transparent focus:border-blue-400 rounded-full transition-all"
            onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery('') }}
          />
        </div>
      </form>

      <div className="flex items-center gap-1 ml-auto">
        {/* Dark mode toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Tema değiştir"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        )}

        {/* Notifications */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full relative text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" title="Bildirimler">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus:ring-2 focus:ring-blue-500 ml-1">
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-blue-400 transition-all">
              <AvatarImage src={user?.avatar_url ?? ''} alt={user?.full_name ?? ''} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{user?.full_name}</span>
                <span className="text-xs text-gray-500 font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')} className="flex items-center gap-2 cursor-pointer">
              <UserIcon className="w-4 h-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/admin')} className="flex items-center gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              Yönetim
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 dark:text-red-400 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
