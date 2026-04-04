import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import WorkspaceClient from '@/components/workspace/WorkspaceClient'

export const metadata: Metadata = { title: 'Çalışma Alanı' }

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!workspace) notFound()

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .eq('workspace_id', params.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  const { data: members } = await supabase
    .from('workspace_members')
    .select('*, users(id, full_name, email, avatar_url, role)')
    .eq('workspace_id', params.id)

  const isOwner = workspace.owner_id === user.id

  return (
    <WorkspaceClient
      workspace={workspace}
      boards={boards || []}
      members={members || []}
      currentUserId={user.id}
      isOwner={isOwner}
    />
  )
}
