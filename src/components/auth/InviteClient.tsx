'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface InviteInfo {
  id: string
  workspace_id: string | null
  board_id: string | null
  email: string
  role: string
  workspaces?: { name: string } | null
  boards?: { title: string } | null
}

interface InviteClientProps {
  invite: InviteInfo
  token: string
}

export default function InviteClient({ invite, token }: InviteClientProps) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const targetName =
    invite.workspaces?.name
      ? invite.workspaces.name
      : invite.boards?.title
      ? invite.boards.title
      : 'Çalışma Alanı'

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Daveti kabul etmek için giriş yapmanız gerekiyor')
          router.push(`/login?redirect=/invite/${token}`)
          return
        }
        toast.error(data.error || 'Davet kabul edilemedi')
        return
      }

      setAccepted(true)
      toast.success('Davet başarıyla kabul edildi!')

      setTimeout(() => {
        if (data.board_id) {
          router.push(`/board/${data.board_id}`)
        } else if (data.workspace_id) {
          router.push(`/workspace/${data.workspace_id}`)
        } else {
          router.push('/dashboard')
        }
      }, 1500)
    } finally {
      setAccepting(false)
    }
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Davet Kabul Edildi!</h1>
          <p className="text-gray-500 dark:text-gray-400">Yönlendiriliyorsunuz...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto">
          <span className="text-white font-bold text-2xl">R</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Çalışma Alanı Daveti</h1>
          <p className="text-gray-500 dark:text-gray-400">
            <strong className="text-gray-800 dark:text-gray-200">{targetName}</strong> adlı{' '}
            {invite.workspaces ? 'çalışma alanına' : "board'a"} davet edildiniz.
          </p>
          <p className="text-sm text-gray-400">
            Rol: <span className="capitalize font-medium text-gray-600 dark:text-gray-300">{invite.role}</span>
          </p>
        </div>

        <Button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full h-11 text-base"
        >
          {accepting ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : null}
          Daveti Kabul Et
        </Button>

        <p className="text-xs text-gray-400">
          Daveti kabul etmek için giriş yapmanız gerekebilir.
        </p>
      </div>
    </div>
  )
}
