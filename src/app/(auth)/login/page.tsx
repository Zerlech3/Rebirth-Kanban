import { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Giriş Yap' }

export default function LoginPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Hoş geldiniz</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Hesabınıza giriş yapın</p>
      <LoginForm />
    </>
  )
}
