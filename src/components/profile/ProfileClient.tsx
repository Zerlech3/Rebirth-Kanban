'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth.store'
import { User, NotificationPreference } from '@/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Camera, Loader2, Lock, Bell, User as UserIcon, Trash2, ZoomIn } from 'lucide-react'

interface ProfileClientProps {
  profile: User | null
  preferences: NotificationPreference | null
}

export default function ProfileClient({ profile, preferences }: ProfileClientProps) {
  const supabase = createClient()
  const { user: authUser, setUser } = useAuthStore()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [position, setPosition] = useState(profile?.position ?? '')
  const [department, setDepartment] = useState(profile?.department ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [prefs, setPrefs] = useState<NotificationPreference | null>(preferences)
  const [savingPrefs, setSavingPrefs] = useState(false)

  const userId = authUser?.id ?? profile?.id ?? ''

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  // Görseli kare kırp ve 400x400'e küçült
  const resizeToSquare = (file: File, maxPx = 400): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const size = Math.min(img.width, img.height, maxPx)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        const sx = (img.width - Math.min(img.width, img.height)) / 2
        const sy = (img.height - Math.min(img.width, img.height)) / 2
        const srcSize = Math.min(img.width, img.height)
        ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size)
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas boş')), 'image/jpeg', 0.88)
      }
      img.onerror = reject
      img.src = url
    })

  // Dosya seçilince kırp ve önizle (henüz yükleme yok)
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const blob = await resizeToSquare(file, 400)
      const url = URL.createObjectURL(blob)
      setPreviewBlob(blob)
      setPreviewUrl(url)
    } catch {
      toast.error('Görsel işlenemedi')
    }
  }

  // Önizleme onaylandıktan sonra gerçek yükleme
  const handleConfirmUpload = async () => {
    if (!previewBlob || !userId) return
    setUploadingAvatar(true)

    // Bucket'ı hazırla
    await fetch('/api/storage/init', { method: 'POST' })

    const path = `${userId}/avatar.jpg`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, previewBlob, { upsert: true, contentType: 'image/jpeg' })

    if (uploadError) {
      toast.error('Avatar yüklenemedi: ' + uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const cacheBusted = `${publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('users').update({ avatar_url: cacheBusted }).eq('id', userId)

    if (updateError) {
      toast.error('Avatar kaydedilemedi')
    } else {
      setAvatarUrl(cacheBusted)
      if (authUser) setUser({ ...authUser, avatar_url: cacheBusted })
      toast.success('Profil fotoğrafı güncellendi')
    }
    setUploadingAvatar(false)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewBlob(null)
    setPreviewUrl(null)
  }

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewBlob(null)
    setPreviewUrl(null)
  }

  // Fotoğrafı kaldır
  const handleRemoveAvatar = async () => {
    if (!userId) return
    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`])
    await supabase.from('users').update({ avatar_url: null }).eq('id', userId)
    setAvatarUrl('')
    if (authUser) setUser({ ...authUser, avatar_url: null })
    toast.success('Profil fotoğrafı kaldırıldı')
  }

  const handleSaveProfile = async () => {
    if (!userId) return
    setSavingProfile(true)
    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName, phone, position, department, bio })
      .eq('id', userId)
    setSavingProfile(false)
    if (error) {
      toast.error('Profil güncellenemedi')
    } else {
      if (authUser) setUser({ ...authUser, full_name: fullName, phone, position, department, bio })
      toast.success('Profil güncellendi')
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      toast.error('Şifre güncellenemedi: ' + error.message)
    } else {
      toast.success('Şifre güncellendi')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const handleSavePrefs = async () => {
    if (!prefs || !userId) return
    setSavingPrefs(true)
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        card_assigned: prefs.card_assigned,
        card_comment: prefs.card_comment,
        card_mention: prefs.card_mention,
        due_date_reminder: prefs.due_date_reminder,
        board_invite: prefs.board_invite,
        email_notifications: prefs.email_notifications,
      })
      .eq('user_id', userId)
    setSavingPrefs(false)
    if (error) {
      toast.error('Bildirim tercihleri güncellenemedi')
    } else {
      toast.success('Bildirim tercihleri kaydedildi')
    }
  }

  const togglePref = (key: keyof NotificationPreference) => {
    if (!prefs) return
    setPrefs((prev) => prev ? { ...prev, [key]: !prev[key as keyof NotificationPreference] } : prev)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Hesap Ayarları</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">
            <UserIcon className="w-4 h-4 mr-1.5" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="password">
            <Lock className="w-4 h-4 mr-1.5" />
            Şifre
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-1.5" />
            Bildirimler
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ─────────────────────────────── */}
        <TabsContent value="profile">
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <Avatar className="w-20 h-20 ring-2 ring-offset-2 ring-transparent group-hover:ring-blue-400 transition-all">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="text-xl bg-blue-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors shadow-md">
                  {uploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-white" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelected} disabled={uploadingAvatar} />
                </label>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{fullName || 'İsimsiz'}</p>
                <p className="text-sm text-gray-500">{profile?.email}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <label className="text-xs text-blue-500 hover:underline cursor-pointer flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" /> Fotoğraf değiştir
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelected} disabled={uploadingAvatar} />
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="text-xs text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Kaldır
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Önizleme Modal */}
            {previewUrl && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-72 text-center space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Profil Fotoğrafı Önizleme</h3>
                  <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-blue-400 shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Önizleme" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Fotoğrafınız otomatik olarak kare kırpıldı. Nasıl görünüyor?</p>
                  <div className="flex gap-3">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={handleCancelPreview}>
                      İptal
                    </Button>
                    <Button size="sm" className="flex-1" onClick={handleConfirmUpload} disabled={uploadingAvatar}>
                      {uploadingAvatar && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      Kaydet
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ad Soyad</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad Soyad" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 5xx xxx xx xx" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pozisyon</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Yazılım Geliştirici" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departman</label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Mühendislik" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hakkımda</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kendinizi tanıtın..."
                  rows={3}
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Değişiklikleri Kaydet
            </Button>
          </div>
        </TabsContent>

        {/* ── Password Tab ────────────────────────────── */}
        <TabsContent value="password">
          <div className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mevcut Şifre</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni Şifre</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni Şifre (Tekrar)</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Şifreyi Güncelle
            </Button>
          </div>
        </TabsContent>

        {/* ── Notifications Tab ───────────────────────── */}
        <TabsContent value="notifications">
          <div className="space-y-4">
            {prefs ? (
              <>
                <NotifToggle
                  label="Kart atandığında bildir"
                  description="Size bir kart atandığında bildirim alırsınız"
                  checked={prefs.card_assigned}
                  onChange={() => togglePref('card_assigned')}
                />
                <NotifToggle
                  label="Yorum yapıldığında bildir"
                  description="Kartlarınıza yorum eklendiğinde bildirim alırsınız"
                  checked={prefs.card_comment}
                  onChange={() => togglePref('card_comment')}
                />
                <NotifToggle
                  label="Bahsedildiğinizde bildir"
                  description="Bir yorumda bahsedildiğinizde bildirim alırsınız"
                  checked={prefs.card_mention}
                  onChange={() => togglePref('card_mention')}
                />
                <NotifToggle
                  label="Bitiş tarihi hatırlatıcısı"
                  description="Kart bitiş tarihi yaklaştığında bildirim alırsınız"
                  checked={prefs.due_date_reminder}
                  onChange={() => togglePref('due_date_reminder')}
                />
                <NotifToggle
                  label="Board davetleri"
                  description="Bir board'a davet edildiğinizde bildirim alırsınız"
                  checked={prefs.board_invite}
                  onChange={() => togglePref('board_invite')}
                />
                <NotifToggle
                  label="E-posta bildirimleri"
                  description="Bildirimleri e-posta ile de alın"
                  checked={prefs.email_notifications}
                  onChange={() => togglePref('email_notifications')}
                />
                <Button onClick={handleSavePrefs} disabled={savingPrefs}>
                  {savingPrefs && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Tercihleri Kaydet
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">Bildirim tercihleri bulunamadı.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotifToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
