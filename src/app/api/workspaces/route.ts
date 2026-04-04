import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { name, description } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'İsim zorunlu' }, { status: 400 })

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ name: name.trim(), description, owner_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Creator'ı admin olarak ekle
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'admin',
  })

  return NextResponse.json(workspace, { status: 201 })
}
