import { Metadata } from 'next'
import RegisterForm from '@/components/auth/RegisterForm'

export const metadata: Metadata = { title: 'Kayıt Ol' }

export default function RegisterPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Hesap oluştur</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Hemen ücretsiz başlayın</p>
      <RegisterForm />
    </>
  )
}
