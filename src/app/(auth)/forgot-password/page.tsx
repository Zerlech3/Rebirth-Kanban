import { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Şifre Sıfırla' }

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Şifremi unuttum</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">E-posta adresinize sıfırlama linki göndereceğiz</p>
      <ForgotPasswordForm />
    </>
  )
}
