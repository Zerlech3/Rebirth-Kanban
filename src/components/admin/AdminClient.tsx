'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, UserRole } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Search, ShieldCheck, Users, Briefcase, UserCheck } from 'lucide-react'

type AdminUser = Pick<User, 'id' | 'full_name' | 'email' | 'role' | 'avatar_url' | 'created_at' | 'department' | 'position'>

interface AdminClientProps {
  users: AdminUser[]
  currentUserId: string
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Yönetici',
  employee: 'Çalışan',
  guest: 'Misafir',
}

const roleBadgeVariants: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'destructive',
  manager: 'default',
  employee: 'secondary',
  guest: 'outline',
}

export default function AdminClient({ users, currentUserId }: AdminClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    )
  }, [users, search])

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    managers: users.filter((u) => u.role === 'manager').length,
    employees: users.filter((u) => u.role === 'employee').length,
  }), [users])

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setUpdatingRole(userId)
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    setUpdatingRole(null)
    if (error) {
      toast.error('Rol güncellenemedi')
    } else {
      toast.success('Rol güncellendi')
      router.refresh()
    }
  }

  const initials = (name: string | null) =>
    (name ?? 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Yönetim Paneli</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Toplam Kullanıcı" value={stats.total} bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard icon={<ShieldCheck className="w-5 h-5 text-red-500" />} label="Adminler" value={stats.admins} bg="bg-red-50 dark:bg-red-900/20" />
        <StatCard icon={<Briefcase className="w-5 h-5 text-purple-500" />} label="Yöneticiler" value={stats.managers} bg="bg-purple-50 dark:bg-purple-900/20" />
        <StatCard icon={<UserCheck className="w-5 h-5 text-green-500" />} label="Çalışanlar" value={stats.employees} bg="bg-green-50 dark:bg-green-900/20" />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim, e-posta veya departmana göre ara..."
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kullanıcı</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Departman</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pozisyon</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kayıt Tarihi</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={u.avatar_url ?? ''} />
                        <AvatarFallback className="text-xs bg-blue-500 text-white">
                          {initials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{u.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{u.department ?? '—'}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{u.position ?? '—'}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">
                    {format(new Date(u.created_at), 'd MMM yyyy', { locale: tr })}
                  </td>
                  <td className="py-3 px-4">
                    {u.id === currentUserId ? (
                      <Badge variant={roleBadgeVariants[u.role as UserRole]}>
                        {roleLabels[u.role as UserRole] ?? u.role}
                      </Badge>
                    ) : (
                      <div className="w-32">
                        <Select
                          value={u.role}
                          onValueChange={(val) => handleRoleChange(u.id, val as UserRole)}
                          disabled={updatingRole === u.id}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Yönetici</SelectItem>
                            <SelectItem value="employee">Çalışan</SelectItem>
                            <SelectItem value="guest">Misafir</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">Kullanıcı bulunamadı</div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
}) {
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}
