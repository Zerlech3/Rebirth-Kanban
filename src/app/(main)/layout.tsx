import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import UserProvider from '@/components/layout/UserProvider'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, logo_url')
    .or(`owner_id.eq.${user.id},id.in.(${
      (await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id))
        .data?.map((m) => m.workspace_id).join(',') || 'null'
    })`)
    .order('created_at')

  const { data: starredBoards } = await supabase
    .from('boards')
    .select('id, title, background, workspace_id')
    .eq('is_starred', true)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(10)

  return (
    <UserProvider profile={profile}>
      <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-950">
        <Sidebar workspaces={workspaces || []} starredBoards={starredBoards || []} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={profile} />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
