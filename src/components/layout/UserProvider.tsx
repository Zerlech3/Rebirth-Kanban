'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { User } from '@/types'

interface UserProviderProps {
  children: React.ReactNode
  profile: User | null
}

export default function UserProvider({ children, profile }: UserProviderProps) {
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    setUser(profile)
  }, [profile, setUser])

  return <>{children}</>
}
