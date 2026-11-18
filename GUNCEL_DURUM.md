# Fit Sihirbaz — Güncel Durum (Kasım 2026)

> Bu belge, diğer `.md` dosyalarından (CLAUDE, BACKEND, WEB, MOBIL, DATABASE, ROADMAP) **daha günceldir**.
> Çelişki varsa bu belge geçerlidir. Eski belgeler tasarım niyetini anlatır; burada gerçekte ne olduğu yazılıdır.

## Karar: web öncelikli

Önce web ürünü olgunlaşır. `apps/mobile` dondurulmuştur (silinmedi, derleniyor, bakım yapılmıyor). Tüm iş mantığı
API'dedir; web yalnızca arayüzdür. Mobil ve masaüstü sonradan aynı API'yi kullanır.

## Belgelerdeki bilinen eskimeler

- `db/`, `backend/`, `web/`, `mobil/` klasörleri **yoktur**; ilgili belgeler kök dizindedir.
- ROADMAP'teki "e-posta yok / deployment yok / rate limit yok" maddeleri artık yapılmıştır.
- README'deki test sayısı eskidir (güncel: shared 125 + api 348).

## Bu dönemde eklenenler

| Alan | Ne yapıldı | Nerede |
|---|---|---|
| Güvenlik | Seed production'da çalışmaz (`SEED_DEMO=true` gerekir), gerçek admin için `pnpm db:create-admin` | `packages/db/seed` |
| Güvenlik | Mock ödeme simülasyonu production'da kapalı (`ALLOW_MOCK_PAYMENTS`), yer tutucu secret'lar production'da reddedilir | `apps/api/src/config`, `payments` |
| Güvenlik | Webhook imzası ham gövdeyle doğrulanır | `payments.controller.ts` |
| Güvenlik | Refresh token rotasyonu, sunucu tarafı iptal, çalıntı tespiti (`RefreshToken`) | `apps/api/src/auth` |
| Güvenlik | Yükleme: önce yetki, içerik (magic number) doğrulaması, uzantı türden gelir | `apps/api/src/uploads` |
| Takip | Danışan günü: yedim/kısmen/yemedim, plan dışı besin, su; diyetisyen görünümü, uyum %, yorum | `apps/api/src/tracking`, `/danisan/gunluk` |
| Diyet | Taslak → "Danışana Gönder" (ACTIVE), danışan taslağı göremez, "Diyetlerim" | `diet-plans`, `/danisan/plan` |
| Paket | Paket içinde seans hakkı, online / yüz yüze / ikisi, kalan seans, geçerlilik | `appointments`, `packages` |
| Kayıt | Detaylı danışan profili (meslek, hobi, spor, alerji, kilo, şehir, bütçe...), iki adımlı kayıt | `/kayit`, `ClientDetailsForm` |
| KVKK | Aydınlatma + koşullar + sağlık verisi açık rızası, sürümlü `ConsentRecord` | `auth.register`, `/kvkk-aydinlatma` |
| Besin | USDA SR Legacy: 2.469 temel gıda (toplam 2.586) | `pnpm db:import-usda` |
| Eşleştirme | Danışana özel diyetisyen sıralaması, şeffaf puan + gerekçe | `dietitians/ranking.ts`, `/diyetisyenler` |
| Vitrin | Danışan değişimi, açık izinle (varsayılan anonim, fotoğrafsız) | `apps/api/src/showcase` |

## Sıralama algoritması (özet)

`apps/api/src/dietitians/ranking.ts`. Puan 0-100: uzmanlık %35, konum/görüşme türü %20, bütçe %15, kalite %20
(Bayes ortalaması: 1 yorumlu 5.0, çok yorumlu 4.8'i geçemez), deneyim %10. Eksik veri nötr sayılır. **Komisyon,
ödeme veya reklam sıralamaya girmez** (bunu bozan bir değişiklik testte yakalanır). Yalnızca onaylı (VERIFIED)
diyetisyenler önerilir.

## Besin verisi

```bash
# 1) https://fdc.nal.usda.gov/download-datasets -> "SR Legacy" CSV zip'ini indirip açın (kamu malı, CC0)
# 2) önizleme (veritabanına yazmaz):
USDA_DIR=<açılan klasör> pnpm db:import-usda -- --dry-run
# 3) içe aktar (tekrar çalıştırmak güvenlidir, çoğaltmaz):
USDA_DIR=<açılan klasör> pnpm db:import-usda
```

Türkçe isimler sözlükle otomatik çevrilmiştir (kapsam ~%95); özgün İngilizce ad `nameEn`'dedir ve aramada kullanılır.
**TürKomp eklenmedi**: resmi bir veri tabanıdır, kullanım için lisans/yazılı izin gerekebilir. Mimari
(`FoodSource`) yeni kaynağa hazırdır. **FatSecret** (barkod) eklenmedi: ücretsiz paketin kullanım/saklama koşulları
ve Türkiye kapsamı doğrulanmadan bağlanmamalı; API anahtarı gerektirir.

## Açık işler ve riskler

1. **KVKK metinleri taslaktır** (`/kvkk-aydinlatma`, `/kullanim-kosullari`): hukukçu incelemesi, VERBİS ve gerçek
   şirket bilgileri şart. Hesap/veri silme akışı **yoktur**. Sağlık verisi erişim audit logu yoktur.
2. **Ödeme hâlâ mock**; canlıda ödeme kapalıdır. Gerçek sağlayıcı (iyzico/PayTR) için önce plan (CLAUDE.md kural 5).
3. **Dosyalar yerel diske** yazılıyor (Render'da geçici). Gerçek kullanıcı öncesi R2/S3 şart.
4. **`dietitians.search` onaysız diyetisyenleri de listeler** (öneriler listelemez). Davranış bilerek mi seçildi,
   karar verilmeli.
5. Randevu seans hakkı kontrolü iki eşzamanlı istekte hakkı aşabilir (veritabanı kilidi yok); düşük risk.
6. Mobil uygulama dondurulmuş: yeni özelliklerin (takip, vitrin, sıralama, detaylı kayıt) mobil ekranı yok.
7. Canlıya çıkmadan: CI/CD, Sentry, yedekleme, e-posta (Resend anahtarı) hâlâ yok.
8. Besin Türkçe çevirileri otomatiktir; admin panelinden elle düzeltilmeli.

## Sık komutlar

```bash
docker compose up -d                 # Postgres + Redis
pnpm db:generate && pnpm db:migrate  # (DATABASE_URL ortamda olmalı; kökteki .env Prisma CLI'ye otomatik geçmez)
pnpm db:seed                         # demo veri (yalnızca geliştirme)
pnpm dev:api    # http://localhost:4000
pnpm dev:web    # http://localhost:3000
pnpm typecheck && pnpm test
```

Windows notu: `pnpm` yerine `corepack pnpm` kullanılabilir (yönetici yetkisi gerekmez). Giriş hız sınırı
(15 dk'da 10 deneme) yerelde test ederken takılırsa: `docker compose exec redis redis-cli DEL "ratelimit:auth.login:::1"`.

Demo hesaplar (şifre `Demo1234`): `ayse.yilmaz@fitsihirbaz.com` (diyetisyen), `elif.sahin@example.com` (danışan,
aktif planı ve takip verisi var), `can.ozturk@example.com`, `deniz.aydin@example.com`, `mehmet.demir@fitsihirbaz.com`.
