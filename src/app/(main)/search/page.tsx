import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SearchClient from '@/components/search/SearchClient'

export const metadata: Metadata = { title: 'Arama' }

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const query = searchParams.q?.trim() ?? ''

  if (!query) {
    return <SearchClient query="" cards={[]} boards={[]} />
  }

  const likeQuery = `%${query}%`

  // Kart ara (başlık + açıklama)
  const { data: cards } = await supabase
    .from('cards')
    .select(`
      id, title, description, priority, due_date_end, is_archived, list_id,
      lists (id, title, boards (id, title, background))
    `)
    .or(`title.ilike.${likeQuery},description.ilike.${likeQuery}`)
    .eq('is_archived', false)
    .limit(20)

  // Board ara
  const { data: boards } = await supabase
    .from('boards')
    .select('id, title, background, workspace_id')
    .ilike('title', likeQuery)
    .eq('is_archived', false)
    .limit(10)

  return <SearchClient query={query} cards={cards || []} boards={boards || []} />
}
