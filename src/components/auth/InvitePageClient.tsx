'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle } from 'lucide-react'

interface InvitePageClientProps {
  invite: {
    workspace_id: string | null
    board_id: string | null
    email: string
    role: string
    workspace: { name: string } | null
    board: { title: string } | null
  }
  token: string
}

export default function InvitePageClient({ invite, token }: InvitePageClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [email, setEmail] = useState(invite.email)
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [fullName, setFullName] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const targetName = invite.workspace?.name || invite.board?.title || 'Çalışma Alanı'

  const handleAccept = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Daveti kabul etmek için önce giriş yapın')
          return
        }
        toast.error(data.error || 'Hata oluştu')
        return
      }
      setAccepted(true)
      toast.success('Davet kabul edildi!')
      setTimeout(() => {
        if (data.workspace_id) router.push(`/workspace/${data.workspace_id}`)
        else if (data.board_id) router.push(`/board/${data.board_id}`)
        else router.push('/dashboard')
      }, 1500)
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    const supabase = createClient()
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { toast.error('Giriş başarısız: ' + error.message); return }
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        if (error) { toast.error('Kayıt başarısız: ' + error.message); return }
      }
      toast.success('Giriş yapıldı! Davet kabul ediliyor...')
      await handleAccept()
    } finally {
      setAuthLoading(false)
    }
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Davet Kabul Edildi!</h1>
          <p className="text-gray-500 text-sm">Yönlendiriliyorsunuz...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Çalışma Alanı Daveti</h1>
          <p className="text-gray-500 text-sm mt-1">
            <strong>{targetName}</strong> çalışma alanına davet edildiniz
          </p>
          <p className="text-xs text-gray-400 mt-1">Rol: {invite.role}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3">
          {!isLogin && (
            <div className="space-y-1">
              <Label>Ad Soyad</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Adınız Soyadınız" required />
            </div>
          )}
          <div className="space-y-1">
            <Label>E-posta</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-posta" required />
          </div>
          <div className="space-y-1">
            <Label>Şifre</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifre" required />
          </div>
          <Button type="submit" className="w-full" disabled={authLoading || loading}>
            {authLoading || loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isLogin ? 'Giriş Yap ve Daveti Kabul Et' : 'Kayıt Ol ve Daveti Kabul Et'}
          </Button>
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-sm text-blue-600 hover:underline">
            {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
