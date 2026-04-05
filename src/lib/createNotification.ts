import { createClient } from '@/lib/supabase/client'

interface NotificationPayload {
  userId: string
  type: string
  title: string
  message: string
  linkUrl?: string
}

/** Tek bir kullanıcıya bildirim oluşturur (client-side). */
export async function createNotification(payload: NotificationPayload) {
  const supabase = createClient()
  await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link_url: payload.linkUrl ?? null,
    is_read: false,
  })
}

/** Birden fazla kullanıcıya aynı bildirimi gönderir. */
export async function createNotifications(userIds: string[], payload: Omit<NotificationPayload, 'userId'>) {
  if (userIds.length === 0) return
  const supabase = createClient()
  await supabase.from('notifications').insert(
    userIds.map((userId) => ({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link_url: payload.linkUrl ?? null,
      is_read: false,
    }))
  )
}
