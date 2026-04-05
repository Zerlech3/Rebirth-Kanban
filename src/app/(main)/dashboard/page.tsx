import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Star, Clock, CheckSquare, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import { tr } from 'date-fns/locale'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Favori board'lar
  const { data: starredBoards } = await supabase
    .from('boards')
    .select('id, title, background, workspace_id, updated_at')
    .eq('is_starred', true)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(8)

  // Bana atanan kartlar
  const { data: assignedCards } = await supabase
    .from('card_members')
    .select(`
      card_id,
      cards (
        id, title, priority, due_date_end, is_archived,
        lists (id, title, boards (id, title))
      )
    `)
    .eq('user_id', user.id)
    .limit(20)

  const activeCards = assignedCards
    ?.map((m) => m.cards)
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((c: any) => !c.is_archived)
    .slice(0, 10) ?? []

  const now = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overdueCards = activeCards.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) => c.due_date_end && isBefore(new Date(c.due_date_end), now)
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingCards = activeCards.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c: any) =>
      c.due_date_end &&
      isAfter(new Date(c.due_date_end), now) &&
      isBefore(new Date(c.due_date_end), addDays(now, 3))
  )

  // Son aktiviteler
  const { data: recentActivities } = await supabase
    .from('activities')
    .select('id, description, action_type, created_at, users (full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(10)

  const priorityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  }

  const priorityLabels: Record<string, string> = {
    low: 'Düşük',
    normal: 'Normal',
    high: 'Yüksek',
    urgent: 'Acil',
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: CheckSquare, color: 'blue', count: activeCards.length, label: 'Atanan Kart' },
          { icon: Clock, color: 'orange', count: upcomingCards.length, label: 'Yaklaşan' },
          { icon: AlertTriangle, color: 'red', count: overdueCards.length, label: 'Geciken' },
        ].map(({ icon: Icon, color, count, label }) => (
          <Card key={label}>
            <CardContent className="p-3 sm:pt-6 sm:px-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${color}-600 dark:text-${color}-400`} />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Favori Board'lar */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Favori Board&apos;lar
            </h2>
          </div>

          {starredBoards && starredBoards.length > 0 ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3">
              {starredBoards.map((board) => (
                <Link key={board.id} href={`/board/${board.id}`}>
                  <div className="group relative h-24 rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
                    <div
                      className="absolute inset-0"
                      style={{ background: board.background.startsWith('#') ? board.background : `url(${board.background}) center/cover` }}
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute bottom-3 left-3">
                      <p className="text-white font-semibold text-sm">{board.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Henüz favori board yok</p>
                <p className="text-xs text-gray-400">Board&apos;u yıldızlayarak buraya ekleyin</p>
              </CardContent>
            </Card>
          )}

          {/* Atanan Kartlar */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Bana Atanan Kartlar</h2>
            {activeCards.length > 0 ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {activeCards.map((card: any) => (
                  <Card key={card.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {card.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {card.lists?.boards?.title} → {card.lists?.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={priorityColors[card.priority] + ' text-xs'}>
                            {priorityLabels[card.priority]}
                          </Badge>
                          {card.due_date_end && (
                            <span className={`text-xs ${isBefore(new Date(card.due_date_end), now) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {format(new Date(card.due_date_end), 'd MMM', { locale: tr })}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Size atanmış kart bulunmuyor</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Son Aktiviteler */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Son Aktiviteler
          </h2>
          {recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(activity.created_at), 'd MMM, HH:mm', { locale: tr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Henüz aktivite yok</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
