# 🏗️ TRELLO CLONE — Sistem Tasarım Dokümanı
### Hizmet & Danışmanlık Şirketi İçin İş Akış Yönetim Sistemi

---

## 📋 GENEL BAKIŞ

**Proje Adı:** TaskFlow (veya şirket adınıza göre değiştirilebilir)  
**Sektör:** Hizmet / Danışmanlık  
**Kullanıcı Sayısı:** 5-20 kişi  (Kullanacak ama tasarım istediğim kadar kişiyi kaldırabilecek)
**Hedef:** Trello'nun %100'üne yakın bir iş akış yönetim sistemi  

---

## 🧩 MODÜL 1: KULLANICI SİSTEMİ

### 1.1 Kayıt & Giriş (Authentication)

| Özellik | Açıklama |
|---------|----------|
| E-posta ile kayıt | Ad, soyad, e-posta, şifre, profil fotoğrafı |
| Giriş sistemi | E-posta + şifre ile login |
| Şifremi unuttum | E-posta ile şifre sıfırlama linki |
| Oturum yönetimi | JWT token ile session kontrolü |
| Çıkış yapma | Token'ı geçersiz kılma |

### 1.2 Kullanıcı Profili

| Alan | Tip | Zorunlu |
|------|-----|---------|
| Profil fotoğrafı | Image (URL) | Hayır |
| Ad Soyad | String | Evet |
| E-posta | String (unique) | Evet |
| Telefon | String | Hayır |
| Pozisyon/Unvan | String | Hayır |
| Departman | String | Hayır |
| Bio/Açıklama | Text | Hayır |
| Kayıt tarihi | DateTime | Otomatik |

### 1.3 Kullanıcı Rolleri & Yetkileri

| Rol | Board Oluştur | Üye Ekle/Çıkar | Board Sil | Kart Düzenle | Sadece Görüntüle | Raporları Gör | Sistem Ayarları |
|-----|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Yönetici** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Çalışan** | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Misafir** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## 🧩 MODÜL 2: WORKSPACE (Çalışma Alanı)

### 2.1 Workspace Yapısı

Workspace, şirketin tüm board'larını barındıran en üst seviye konteynerdir.

| Özellik | Açıklama |
|---------|----------|
| Workspace adı | Şirket/takım adı |
| Workspace açıklaması | Kısa tanım |
| Workspace logosu | Görsel |
| Üye listesi | Workspace'e dahil tüm kullanıcılar |
| Davet sistemi | E-posta ile üye davet etme |
| Görünürlük | Özel (sadece üyeler) veya Şirket içi |

### 2.2 Workspace İş Akışı

```
Workspace Oluştur → Üye Davet Et → Board'lar Oluştur → Çalışmaya Başla
```

---

## 🧩 MODÜL 3: BOARD (Pano) SİSTEMİ

### 3.1 Board Özellikleri

| Özellik | Açıklama |
|---------|----------|
| Board adı | Proje/iş adı |
| Board açıklaması | Detaylı tanım |
| Arka plan rengi/görseli | Özelleştirilebilir tema |
| Görünürlük | Özel, Workspace, Herkese açık |
| Yıldızlama (Favoriler) | Sık kullanılan board'ları üste sabitleme |
| Board üyeleri | Atanan kullanıcılar |
| Oluşturulma tarihi | Otomatik |
| Son güncelleme | Otomatik |
| Arşivleme | Board'u pasife alma |

### 3.2 Board Üye Yetkileri

| Yetki | Admin | Normal Üye | Gözlemci |
|-------|:---:|:---:|:---:|
| Liste oluştur/sil | ✅ | ✅ | ❌ |
| Kart oluştur/sil | ✅ | ✅ | ❌ |
| Üye ekle/çıkar | ✅ | ❌ | ❌ |
| Board ayarları | ✅ | ❌ | ❌ |
| Görüntüleme | ✅ | ✅ | ✅ |

### 3.3 Board Şablonları (Danışmanlık Sektörü İçin)

1. **Müşteri Projesi** → Listeler: Briefing | Analiz | Uygulama | Review | Teslim
2. **Haftalık Sprint** → Listeler: Backlog | Bu Hafta | Devam Eden | Test | Tamamlandı
3. **Müşteri İlişkileri (CRM)** → Listeler: Potansiyel | İlk Görüşme | Teklif | Anlaşma | Aktif Müşteri
4. **İç Operasyon** → Listeler: Yapılacak | Devam Eden | Beklemede | Tamamlandı

---

## 🧩 MODÜL 4: LİSTE (List) SİSTEMİ

### 4.1 Liste Özellikleri

| Özellik | Açıklama |
|---------|----------|
| Liste adı | Aşama/kategori adı |
| Sıralama (position) | Sürükle-bırak ile sıra değişimi |
| Kart sayısı göstergesi | Listede kaç kart var |
| Liste rengi/etiketi | Görsel ayrım |
| Liste limiti (WIP Limit) | Maksimum kart sayısı sınırı |
| Arşivleme | Listeyi pasife alma |
| Listeyi kopyalama | Tüm kartlarıyla birlikte klonlama |
| Tüm kartları taşıma | Başka listeye toplu taşıma |
| Tüm kartları arşivleme | Listedeki tüm kartları arşive alma |

### 4.2 Liste İş Akışı

```
Liste Oluştur → Kartları Ekle → Sürükle-Bırak ile Sırala → Arşivle/Sil
```

### 4.3 Varsayılan Liste Yapıları

Danışmanlık projesi için önerilen varsayılan akış:

```
📥 Gelen Talepler → 📋 Planlanan → 🔄 Devam Eden → 👀 İnceleme → ✅ Tamamlandı
```

---

## 🧩 MODÜL 5: KART (Card) SİSTEMİ

### 5.1 Kart Ana Özellikleri

| Özellik | Açıklama |
|---------|----------|
| Kart başlığı | Görev/iş adı |
| Kart açıklaması | Markdown destekli detaylı açıklama |
| Kapak görseli | Kartın üstünde görünen görsel |
| Atanan kişiler | Bir veya birden fazla kullanıcı |
| Etiketler (Labels) | Renkli kategoriler |
| Son tarih (Due Date) | Başlangıç ve bitiş tarihi |
| Öncelik seviyesi | Düşük, Normal, Yüksek, Acil |
| Tahmini süre | Saat bazında iş tahmini |
| Konum (Position) | Liste içindeki sıra |
| Oluşturulma tarihi | Otomatik |
| Arşivleme | Kartı pasife alma |

### 5.2 Etiket (Label) Sistemi

| Renk | Varsayılan Kullanım |
|------|-------------------|
| 🔴 Kırmızı | Acil / Kritik |
| 🟠 Turuncu | Yüksek Öncelik |
| 🟡 Sarı | Orta Öncelik |
| 🟢 Yeşil | Düşük Öncelik |
| 🔵 Mavi | Bilgi / Referans |
| 🟣 Mor | Müşteri Talebi |
| ⚫ Siyah | Beklemede |

Etiketler özelleştirilebilir — kendi adlarınızı ve renklerinizi tanımlayabilirsiniz.

### 5.3 Checklist (Yapılacaklar Listesi)

Her kartta birden fazla checklist olabilir:

```
Checklist: "Teklif Hazırlığı"
  ☑ Müşteri ihtiyaç analizi
  ☑ Maliyet hesaplama
  ☐ Sunum hazırlama
  ☐ Müşteriye gönderim
  
İlerleme: 2/4 (%50)
```

| Özellik | Açıklama |
|---------|----------|
| Checklist adı | Başlık |
| Checklist maddeleri | Alt görevler |
| İlerleme çubuğu | Yüzdelik tamamlanma göstergesi |
| Maddeye kişi atama | Her alt göreve ayrı kişi |
| Maddeye tarih atama | Her alt göreve ayrı deadline |

### 5.4 Yorum Sistemi

| Özellik | Açıklama |
|---------|----------|
| Yorum yazma | Metin tabanlı yorum |
| Markdown desteği | Zengin metin formatı |
| @mention | Kullanıcı etiketleme |
| Yorum düzenleme | Kendi yorumunu güncelleme |
| Yorum silme | Kendi yorumunu kaldırma |
| Yorum tarihi | Otomatik zaman damgası |

### 5.5 Dosya Ekleme (Attachments)

| Özellik | Açıklama |
|---------|----------|
| Dosya yükleme | Bilgisayardan dosya ekleme |
| URL ekleme | Link olarak ekleme |
| Dosya önizleme | Resim, PDF gibi dosyaları önizleme |
| Dosya indirme | Eklenen dosyaları indirme |
| Dosya boyut limiti | Maks. 10MB (ayarlanabilir) |
| Desteklenen formatlar | PDF, DOC, XLS, PNG, JPG, vb. |

### 5.6 Aktivite Logu (Activity Log)

Her kartta yapılan tüm işlemlerin kronolojik kaydı:

```
→ Ahmet kartı "Devam Eden" listesine taşıdı — 2 saat önce
→ Elif yorum ekledi — 3 saat önce  
→ Mehmet "Müşteri Toplantısı" checklist'ini oluşturdu — Dün
→ Ayşe kartı oluşturdu — 2 gün önce
```

### 5.7 Kart Detay Modalı (Card Detail View)

Kart açıldığında görünecek modal pencere yapısı:

```
┌─────────────────────────────────────────────────┐
│  📝 Kart Başlığı                    [Kapak]     │
│  Liste: Devam Eden                               │
│─────────────────────────────────────────────────│
│                                                   │
│  👥 Üyeler: [Avatar1] [Avatar2] [+]              │
│  🏷️ Etiketler: [Acil] [Müşteri Talebi]          │
│  📅 Tarih: 15 Nis - 20 Nis  ⚠️ Yaklaşıyor       │
│  ⏱️ Tahmini Süre: 8 saat                         │
│                                                   │
│  📄 AÇIKLAMA                                      │
│  ─────────────                                    │
│  Markdown destekli açıklama alanı...              │
│                                                   │
│  ✅ CHECKLIST: Teklif Hazırlığı (2/4)            │
│  ─────────────────────────────                    │
│  ☑ Müşteri analizi                                │
│  ☑ Maliyet hesaplama                              │
│  ☐ Sunum hazırlama                                │
│  ☐ Müşteriye gönderim                             │
│                                                   │
│  📎 EKLER                                         │
│  ─────                                            │
│  📄 teklif_v2.pdf (2.3 MB)                       │
│  🖼️ mockup.png (890 KB)                          │
│                                                   │
│  💬 YORUMLAR                                      │
│  ──────────                                       │
│  [Avatar] Ahmet: Müşteri onay verdi ✓             │
│  [Avatar] Elif: @Mehmet sunumu kontrol eder misin? │
│                                                   │
│  📊 AKTİVİTE                                     │
│  ──────────                                       │
│  → Ahmet kartı taşıdı — 2 saat önce              │
│  → Elif yorum ekledi — 3 saat önce                │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 🧩 MODÜL 6: SÜRÜKLE-BIRAK (Drag & Drop)

### 6.1 Desteklenen İşlemler

| İşlem | Açıklama |
|-------|----------|
| Kart → aynı liste içinde | Sıra değiştirme |
| Kart → farklı listeye | Listelar arası taşıma |
| Liste → board içinde | Listelerin sırasını değiştirme |

### 6.2 Teknik Gereksinim

- React DnD veya @hello-pangea/dnd kütüphanesi
- Optimistic UI (taşıma anında hemen görsel güncelleme)
- Position değeri güncelleme (backend sync)

---

## 🧩 MODÜL 7: BİLDİRİM SİSTEMİ

### 7.1 Bildirim Türleri

| Tetikleyici | Bildirim Mesajı |
|-------------|----------------|
| Karta atanma | "Ahmet sizi 'Teklif Hazırla' kartına atadı" |
| Kart yorumu | "Elif 'Proje X' kartına yorum ekledi" |
| @mention | "Mehmet sizi bir yorumda etiketledi" |
| Son tarih yaklaşma | "⚠️ 'Rapor Teslim' kartının tarihi yarın doluyor" |
| Son tarih geçme | "🔴 'Müşteri Sunum' kartının tarihi geçti!" |
| Kart taşıma | "Ahmet 'Teklif' kartını 'Tamamlandı' listesine taşıdı" |
| Board'a davet | "Yeni board'a davet edildiniz: Proje Alpha" |
| Checklist tamamlama | "Tüm maddeler tamamlandı: 'Teklif Hazırlığı'" |

### 7.2 Bildirim Kanalları

| Kanal | Açıklama |
|-------|----------|
| Uygulama içi (in-app) | Sağ üst köşede bildirim zili 🔔 |
| E-posta | Önemli bildirimleri e-posta ile gönderme |
| Bildirim merkezi | Tüm bildirimlerin listelendiği panel |
| Okundu/Okunmadı | Bildirim durumu takibi |

---

## 🧩 MODÜL 8: ARAMA & FİLTRELEME

### 8.1 Global Arama

- Board adına göre arama
- Kart başlığı ve açıklamasında arama
- Etiketlere göre filtreleme
- Kişiye göre filtreleme
- Tarihe göre filtreleme

### 8.2 Board İçi Filtreler

```
Filtre: [Etiket ▼] [Üye ▼] [Tarih ▼] [Öncelik ▼]
```

Filtrelendiğinde eşleşmeyen kartlar soluk/gizli olur.

---

## 🧩 MODÜL 9: RAPORLAMA & İSTATİSTİK

### 9.1 Dashboard Metrikleri

| Metrik | Açıklama |
|--------|----------|
| Toplam aktif kart | Arşivlenmemiş kartların sayısı |
| Tamamlanan kartlar | Bu hafta/ay tamamlanan |
| Geciken kartlar | Son tarihi geçmiş kartlar |
| Kişi bazlı iş yükü | Kime kaç kart atanmış |
| Liste bazlı dağılım | Hangi listede kaç kart var |
| Ortalama tamamlanma süresi | Kartların bitirilme hızı |

### 9.2 Görsel Raporlar

- **Bar Chart:** Liste bazlı kart dağılımı
- **Pie Chart:** Etiket bazlı görev dağılımı
- **Line Chart:** Haftalık/aylık tamamlanma trendi
- **Heatmap:** Günlük aktivite yoğunluğu
- **Kanban Metrics:** WIP limitleri ve akış verimliliği

---

## 🧩 MODÜL 10: TEKNİK MİMARİ (Önerilen)

### 10.1 Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React / Next.js + TypeScript |
| UI Kütüphanesi | Tailwind CSS + shadcn/ui |
| State Yönetimi | Zustand veya Redux Toolkit |
| Drag & Drop | @hello-pangea/dnd |
| Backend | Node.js + Express veya Next.js API Routes |
| Veritabanı | PostgreSQL (Supabase) veya MongoDB |
| Auth | NextAuth.js veya Supabase Auth |
| Dosya Depolama | Supabase Storage veya AWS S3 |
| Gerçek zamanlı | WebSocket veya Supabase Realtime |
| Deployment | Coolify (kendi sunucun) + GitHub + Supabase |

### 10.2 Veritabanı Şeması (Ana Tablolar)

```
users
├── id (UUID, PK)
├── email (unique)
├── password_hash
├── full_name
├── avatar_url
├── role (admin | manager | employee | guest)
├── phone
├── position
├── department
├── created_at
└── updated_at

workspaces
├── id (UUID, PK)
├── name
├── description
├── logo_url
├── owner_id (FK → users)
├── created_at
└── updated_at

workspace_members
├── workspace_id (FK)
├── user_id (FK)
├── role
└── joined_at

boards
├── id (UUID, PK)
├── workspace_id (FK)
├── title
├── description
├── background (color/image)
├── visibility (private | workspace | public)
├── is_starred (boolean)
├── is_archived (boolean)
├── created_by (FK → users)
├── created_at
└── updated_at

board_members
├── board_id (FK)
├── user_id (FK)
├── role (admin | member | observer)
└── joined_at

lists
├── id (UUID, PK)
├── board_id (FK)
├── title
├── position (integer)
├── wip_limit (integer, nullable)
├── is_archived (boolean)
├── created_at
└── updated_at

cards
├── id (UUID, PK)
├── list_id (FK)
├── title
├── description (text, markdown)
├── position (integer)
├── cover_image_url
├── priority (low | normal | high | urgent)
├── due_date_start (datetime)
├── due_date_end (datetime)
├── estimated_hours (float)
├── is_archived (boolean)
├── created_by (FK → users)
├── created_at
└── updated_at

card_members
├── card_id (FK)
├── user_id (FK)
└── assigned_at

labels
├── id (UUID, PK)
├── board_id (FK)
├── name
├── color
└── created_at

card_labels
├── card_id (FK)
└── label_id (FK)

checklists
├── id (UUID, PK)
├── card_id (FK)
├── title
├── position (integer)
└── created_at

checklist_items
├── id (UUID, PK)
├── checklist_id (FK)
├── title
├── is_completed (boolean)
├── assigned_to (FK → users, nullable)
├── due_date (datetime, nullable)
├── position (integer)
└── created_at

comments
├── id (UUID, PK)
├── card_id (FK)
├── user_id (FK)
├── content (text, markdown)
├── created_at
└── updated_at

attachments
├── id (UUID, PK)
├── card_id (FK)
├── user_id (FK)
├── file_name
├── file_url
├── file_size (integer)
├── file_type (string)
├── created_at
└── updated_at

activities
├── id (UUID, PK)
├── board_id (FK)
├── card_id (FK, nullable)
├── user_id (FK)
├── action_type (string)
├── description (text)
├── metadata (JSON)
└── created_at

notifications
├── id (UUID, PK)
├── user_id (FK)
├── type (string)
├── title
├── message
├── link_url
├── is_read (boolean)
├── created_at
└── read_at
```

---

## 🧩 MODÜL 11: SAYFA YAPISI & NAVIGASYON

### 11.1 Sayfa Haritası

```
/ (Ana Sayfa / Login)
├── /register (Kayıt)
├── /login (Giriş)
├── /forgot-password (Şifre Sıfırlama)
│
├── /dashboard (Ana Panel)
│   ├── Son Aktiviteler
│   ├── Favori Board'lar
│   └── Atanan Kartlar
│
├── /workspace/:id (Çalışma Alanı)
│   ├── Board Listesi
│   ├── Üyeler
│   └── Ayarlar
│
├── /board/:id (Board Görünümü — ANA SAYFA)
│   ├── Listeler + Kartlar (Kanban View)
│   ├── Board Menüsü (sağ panel)
│   │   ├── Hakkında
│   │   ├── Arka Plan Değiştir
│   │   ├── Üyeler
│   │   ├── Filtreler
│   │   ├── Etiketler
│   │   ├── Aktivite Logu
│   │   ├── Arşiv
│   │   └── Ayarlar
│   └── Kart Modal (overlay)
│
├── /profile (Profil Sayfası)
│   ├── Profil Bilgileri
│   ├── Şifre Değiştirme
│   └── Bildirim Tercihleri
│
├── /notifications (Bildirim Merkezi)
│
├── /reports (Raporlar — Yönetici+)
│   ├── Genel Özet
│   ├── Kişi Bazlı
│   ├── Board Bazlı
│   └── Tarih Bazlı
│
└── /admin (Yönetim Paneli — Sadece Admin)
    ├── Kullanıcı Yönetimi
    ├── Workspace Ayarları
    └── Sistem Ayarları
```

---

## 🧩 MODÜL 12: PROMPT PLANI (Verdant AI İçin)

Sistemi aşama aşama build etmek için önerilen prompt sıralaması:

### Aşama 1: Temel Altyapı
```
Prompt 1: Auth sistemi (Login, Register, Forgot Password)
Prompt 2: Kullanıcı profili ve ayarlar sayfası
Prompt 3: Layout (Sidebar, Header, Navigasyon)
```

### Aşama 2: Core Kanban
```
Prompt 4: Workspace oluşturma ve listeleme
Prompt 5: Board oluşturma, listeleme, favori/arşiv
Prompt 6: Liste oluşturma, sıralama, CRUD işlemleri
Prompt 7: Kart oluşturma, detay modalı, temel bilgiler
Prompt 8: Sürükle-bırak (kartlar ve listeler arası)
```

### Aşama 3: Kart Detayları
```
Prompt 9: Etiket (label) sistemi
Prompt 10: Checklist sistemi
Prompt 11: Yorum sistemi
Prompt 12: Dosya ekleme sistemi
Prompt 13: Aktivite logu
Prompt 14: Kart üye atama & tarih yönetimi
```

### Aşama 4: İleri Özellikler
```
Prompt 15: Bildirim sistemi (in-app)
Prompt 16: Arama ve filtreleme
Prompt 17: Dashboard ve raporlama
Prompt 18: Admin paneli ve kullanıcı yönetimi
Prompt 19: Board şablonları
Prompt 20: Responsive tasarım ve son rötuşlar
```

---

## ✅ SONRAKİ ADIMLAR

1. Bu dokümanı inceleyin ve eksik/fazla bulduğunuz özellikleri belirleyin
2. Her modül için detaylı prompt'ları birlikte hazırlayalım
3. Verdant AI'da aşama aşama geliştirmeye başlayın
4. Her aşamadan sonra test ve iyileştirme yapın

---

> 📌 **Not:** Bu doküman yaşayan bir belgedir. Geliştirme sürecinde güncellenecektir.
