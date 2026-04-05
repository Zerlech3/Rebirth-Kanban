import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function ensureBucket(supabase: ReturnType<typeof createClient>, name: string) {
  await supabase.storage.createBucket(name, { public: true, fileSizeLimit: 10485760 })
  await supabase.storage.updateBucket(name, { public: true })
}

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await ensureBucket(supabase, 'attachments')
    await ensureBucket(supabase, 'avatars')

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
