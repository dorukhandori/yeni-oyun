# K35 leaderboard — Supabase kurulumu (sahip için adım adım)

Bu klasördeki `k35-leaderboard.sql`, "Beş yeter" (K35) online speedrun tablosunun
tamamıdır: tablolar, RLS politikaları ve `submit_k35_score` fonksiyonu.

**Bu adımlar yapılmadan da oyun tamamen çalışır.** Anahtar yoksa
`isLeaderboardEnabled()` `false` döner, hiçbir ağ çağrısı yapılmaz, leaderboard
ekranı "çevrimiçi tablo kapalı" der. Yani aşağıdakiler bir *bloklayıcı* değil, bir
*açma* işlemidir.

Tasarım kuralları: `docs/design/gdd-lotus-island-run.md` §10.
İstemci: `src/net/leaderboard.ts`.

---

## 1. Supabase projesi aç

1. <https://supabase.com> → **Start your project** → GitHub ile giriş yap.
2. **New project**:
   - **Name:** `lotophagoi` (fark etmez)
   - **Database Password:** üret ve bir parola yöneticisine kaydet — buna bir daha
     ihtiyacın olmayacak, ama kaybedersen sıfırlama gerekir.
   - **Region:** `Central EU (Frankfurt)` — Türkiye'ye en yakın olan.
   - **Plan:** Free.
3. Proje hazır olana kadar ~2 dakika bekle.

## 2. SQL'i çalıştır

1. Sol menüden **SQL Editor** → **New query**.
2. `scripts/supabase/k35-leaderboard.sql` dosyasının **tamamını** kopyala, editöre
   yapıştır.
3. **Run** (⌘+Enter). Alt panelde "Success. No rows returned" görmelisin.
4. Dosya idempotent — ikinci kez çalıştırmak güvenlidir, mevcut skorları silmez.

Doğrulama: sol menü **Table Editor** → `k35_leaderboard`, `k35_submit_log` ve
`k35_secret` tablolarını görmelisin. `k35_secret` içinde tek satır ve rastgele
bir `salt` olmalı.

## 3. Anahtarları al

Sol menü **Project Settings** → **API**:

- **Project URL** → `https://xxxxxxxxxxxx.supabase.co`
- **Project API keys** → **`anon` `public`** satırındaki uzun JWT.

> ⚠️ Aynı sayfadaki **`service_role`** anahtarını **asla** kopyalama, `.env`e
> yazma, GitHub'a koyma veya sohbete yapıştırma. `anon` anahtarının bundle'da
> görünmesi tasarım gereğidir (yayımlanmak üzere üretilmiş bir JWT'dir, güvenlik
> sınırı RLS'tir); `service_role` ise RLS'i tamamen atlar.

## 4. Yerelde çalıştırmak için `.env.local`

Repo kökündeki `.env.local` dosyasına (yoksa oluştur — `.gitignore`'da) şunları ekle:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Sonra dev sunucuyu **yeniden başlat** (`npm run dev`) — Vite `VITE_*`
değişkenlerini yalnız açılışta okur.

## 5. GitHub Pages canlı sürümü için

GitHub'da repo → **Settings** → **Secrets and variables** → **Actions**:

1. **Variables** sekmesi → **New repository variable**
   - Name: `VITE_SUPABASE_URL`
   - Value: proje URL'in
2. **Secrets** sekmesi → **New repository secret**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: anon JWT

> Not: `.github/workflows/deploy-pages.yml` şu an bu ikisini build adımına
> **enjekte etmiyor**. Canlıda leaderboard'u açmak istediğinde "Build for Pages"
> adımına şunu eklemek gerekiyor:
>
> ```yaml
>       - name: Build for Pages
>         run: npm run build:pages
>         env:
>           VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
>           VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
> ```
>
> Bu değişiklik bilerek yapılmadı — deploy pipeline'ına dokunmak ayrı bir onay
> istiyor, ve anahtarlar yokken build zaten hatasız geçiyor.

## 6. Haftalık uyanık tutma

Supabase ücretsiz katmanı **7 gün hareketsiz kalan projeyi duraklatır.**
`.github/workflows/supabase-keepalive.yml` haftada bir tabloya bir okuma isteği
atarak bunu engeller. `VITE_SUPABASE_URL` repository variable'ı tanımlı değilse
workflow sessizce atlar, hata vermez — yani adım 5'i yapmadan da repo yeşil kalır.

---

## Sorun giderme

| Belirti | Sebep | Çare |
|---|---|---|
| Ekranda "Çevrimiçi tablo bu sürümde kapalı." | Build env görmedi | `.env.local` doğru mu, `npm run dev` yeniden başlatıldı mı |
| "Sunucu şu an tabloyu veremiyor." | SQL çalıştırılmadı ya da anahtar yanlış (401/404) | Adım 2'yi tekrar çalıştır, adım 3'teki anahtarı yeniden kopyala |
| "Süre geçersiz görünüyor" | Koşu 45 sn'den kısa | Beklenen davranış; eşik `tuning.md` §11.6 |
| "Sunucu bu adı kabul etmedi." | Postgres `[[:alnum:]]` istemcinin `\p{L}` kümesinden dar | Latin harf/rakamla başlayıp biten bir ad seç |
| Skor gitti ama tabloda yok | Eski kişisel rekorun daha hızlıydı (`kept`) | Beklenen davranış — tablo nick başına yalnız en iyiyi tutar |
