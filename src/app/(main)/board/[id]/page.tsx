import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import BoardClient from '@/components/board/BoardClient'

export const metadata: Metadata = { title: 'Board' }

export default async function BoardPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: board } = await supabase
    .from('boards')
    .select(`
      *,
      members:board_members (
        user_id, role,
        user:users (id, full_name, email, avatar_url)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!board) notFound()

  const { data: lists } = await supabase
    .from('lists')
    .select(`
      *,
      cards (
        *,
        members:card_members (user_id, user:users (id, full_name, avatar_url)),
        labels:card_labels (label_id, label:labels (id, name, color)),
        checklists (id, items:checklist_items (id, is_completed))
      )
    `)
    .eq('board_id', params.id)
    .eq('is_archived', false)
    .order('position')
    .order('position', { referencedTable: 'cards' })

  const { data: labels } = await supabase
    .from('labels')
    .select('*')
    .eq('board_id', params.id)

  // Board yaratıcısı VEYA board_members kaydı olan kullanıcı erişebilir
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const isMember = (board as any).members?.some((m: { user_id: string }) => m.user_id === user.id)
    || (board as any).created_by === user.id
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (!isMember) redirect('/dashboard')

  return (
    <BoardClient
      board={board}
      initialLists={lists || []}
      labels={labels || []}
      currentUserId={user.id}
    />
  )
}
