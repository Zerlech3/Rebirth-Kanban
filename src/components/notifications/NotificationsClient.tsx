'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/store/notification.store'
import { Notification } from '@/types'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  Bell, CheckSquare, MessageSquare, Tag, Clock, Users, CheckCheck,
} from 'lucide-react'

interface NotificationsClientProps {
  initialNotifications: Notification[]
  userId: string
}

const notificationIcon = (type: string) => {
  switch (type) {
    case 'card_assigned': return <Users className="w-4 h-4 text-blue-500" />
    case 'card_comment': return <MessageSquare className="w-4 h-4 text-purple-500" />
    case 'card_mention': return <Tag className="w-4 h-4 text-orange-500" />
    case 'due_date_reminder': return <Clock className="w-4 h-4 text-red-500" />
    case 'board_invite': return <CheckSquare className="w-4 h-4 text-green-500" />
    default: return <Bell className="w-4 h-4 text-gray-500" />
  }
}

export default function NotificationsClient({ initialNotifications, userId }: NotificationsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { notifications, setNotifications, addNotification, markAsRead, markAllAsRead } = useNotificationStore()

  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications, setNotifications])

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addNotification(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, addNotification])

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read)
    if (unread.length === 0) return
    await Promise.all(
      unread.map((n) =>
        supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', n.id)
      )
    )
    markAllAsRead()
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notification.id)
      markAsRead(notification.id)
    }
    if (notification.link_url) {
      router.push(notification.link_url)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bildirimler</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} okunmamış bildirim</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
            <CheckCheck className="w-4 h-4" />
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Henüz bildiriminiz yok</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                !notification.is_read ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {notificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                    {notification.title}
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {format(new Date(notification.created_at), 'd MMM HH:mm', { locale: tr })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
              </div>
              {!notification.is_read && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
