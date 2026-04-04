import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { email, role = 'employee' } = await request.json()
  if (!email) return NextResponse.json({ error: 'E-posta zorunlu' }, { status: 400 })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('invite_tokens').insert({
    workspace_id: params.id,
    email,
    token,
    role,
    invited_by: user.id,
    expires_at: expiresAt,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

  const { data: inviter } = await supabase.from('users').select('full_name').eq('id', user.id).single()
  const { data: workspace } = await supabase.from('workspaces').select('name').eq('id', params.id).single()

  // Resend'i lazy olarak oluştur (build time'da env olmayabilir)
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'noreply@rebirth.fatihalgan.com',
      to: email,
      subject: `${inviter?.full_name} sizi ${workspace?.name} çalışma alanına davet etti`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Çalışma Alanı Daveti</h2>
          <p>${inviter?.full_name} sizi <strong>${workspace?.name}</strong> çalışma alanına davet etti.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#0079bf;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
            Daveti Kabul Et
          </a>
          <p style="color:#666;font-size:12px;margin-top:24px;">Bu link 7 gün geçerlidir.</p>
        </div>
      `,
    })
  } catch {
    // E-posta gönderilemedi ama davet token'ı oluşturuldu
    console.warn('E-posta gönderilemedi. Davet linki:', inviteUrl)
  }

  return NextResponse.json({ success: true, inviteUrl })
}
