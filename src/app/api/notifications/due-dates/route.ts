import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/notifications/due-dates
 * Son tarihi yaklaşan veya geçmiş kartlar için bildirim oluşturur.
 * Cron job ile günlük çağrılabilir.
 * Güvenlik: CRON_SECRET header ile korunuyor.
 */
export async function GET(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 59, 999)

  // Son tarihi bugün veya yarın dolacak aktif kartları bul
  const { data: upcomingCards } = await supabase
    .from('cards')
    .select('id, title, due_date_end, card_members(user_id)')
    .eq('is_archived', false)
    .not('due_date_end', 'is', null)
    .gte('due_date_end', now.toISOString())
    .lte('due_date_end', tomorrow.toISOString())

  // Son tarihi geçmiş aktif kartları bul
  const { data: overdueCards } = await supabase
    .from('cards')
    .select('id, title, due_date_end, card_members(user_id)')
    .eq('is_archived', false)
    .not('due_date_end', 'is', null)
    .lt('due_date_end', now.toISOString())

  const notifications: { user_id: string; type: string; title: string; message: string; link_url: string | null; is_read: boolean }[] = []

  // Yaklaşan tarihi olan kart bildirimleri
  for (const card of upcomingCards ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberIds: string[] = (card.card_members as any[])?.map((m: { user_id: string }) => m.user_id) ?? []
    for (const userId of memberIds) {
      // Aynı gün zaten bildirim gönderilmişse tekrar gönderme
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'due_date_reminder')
        .ilike('message', `%${card.id}%`)
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
        .maybeSingle()
      if (existing) continue

      notifications.push({
        user_id: userId,
        type: 'due_date_reminder',
        title: '⚠️ Son tarih yaklaşıyor',
        message: `"${card.title}" kartının son tarihi yaklaşıyor (${card.id})`,
        link_url: null,
        is_read: false,
      })
    }
  }

  // Geciken kart bildirimleri
  for (const card of overdueCards ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberIds: string[] = (card.card_members as any[])?.map((m: { user_id: string }) => m.user_id) ?? []
    for (const userId of memberIds) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'due_date_overdue')
        .ilike('message', `%${card.id}%`)
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
        .maybeSingle()
      if (existing) continue

      notifications.push({
        user_id: userId,
        type: 'due_date_overdue',
        title: '🔴 Son tarih geçti',
        message: `"${card.title}" kartının son tarihi geçti (${card.id})`,
        link_url: null,
        is_read: false,
      })
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }

  return NextResponse.json({
    sent: notifications.length,
    upcoming: upcomingCards?.length ?? 0,
    overdue: overdueCards?.length ?? 0,
  })
}
