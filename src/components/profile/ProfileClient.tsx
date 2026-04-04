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
import { Camera, Loader2, Lock, Bell, User as UserIcon } from 'lucide-react'

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingAvatar(true)

    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Avatar yüklenemedi')
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const cacheBusted = `${publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: cacheBusted })
      .eq('id', userId)

    if (updateError) {
      toast.error('Avatar URL güncellenemedi')
    } else {
      setAvatarUrl(cacheBusted)
      if (authUser) setUser({ ...authUser, avatar_url: cacheBusted })
      toast.success('Avatar güncellendi')
    }
    setUploadingAvatar(false)
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
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-xl bg-blue-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors">
                  {uploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-white" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{fullName || 'İsimsiz'}</p>
                <p className="text-sm text-gray-500">{profile?.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">Profil fotoğrafı yüklemek için tıklayın</p>
              </div>
            </div>

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
