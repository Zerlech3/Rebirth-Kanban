import { createClient } from '@/lib/supabase/server'
import InvitePageClient from '@/components/auth/InvitePageClient'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Davet' }

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from('invite_tokens')
    .select('*, workspace:workspaces(name), board:boards(title)')
    .eq('token', params.token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Geçersiz Davet Linki</h1>
          <p className="text-gray-500 text-sm">Bu davet linki geçersiz veya süresi dolmuş.</p>
        </div>
      </div>
    )
  }

  return <InvitePageClient invite={invite} token={params.token} />
}