import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Önce giriş yapın' }, { status: 401 })

  const { data: invite } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('token', params.token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) return NextResponse.json({ error: 'Geçersiz davet' }, { status: 400 })

  if (invite.workspace_id) {
    await supabase.from('workspace_members').upsert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role,
    }, { onConflict: 'workspace_id,user_id' })
  }

  if (invite.board_id) {
    await supabase.from('board_members').upsert({
      board_id: invite.board_id,
      user_id: user.id,
      role: 'member',
    }, { onConflict: 'board_id,user_id' })
  }

  await supabase
    .from('invite_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({
    workspace_id: invite.workspace_id,
    board_id: invite.board_id,
  })
}
