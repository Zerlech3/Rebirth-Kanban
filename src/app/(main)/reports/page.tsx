import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from '@/components/reports/ReportsClient'

export const metadata: Metadata = { title: 'Raporlar' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: cards } = await supabase
    .from('cards')
    .select('id, priority, is_archived, due_date_end, created_at, list_id, lists(title, board_id)')
    .eq('is_archived', false)

  const { data: members } = await supabase
    .from('card_members')
    .select('user_id, cards(id, is_archived), users(full_name)')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ReportsClient cards={(cards || []) as any} members={(members || []) as any} />
}
