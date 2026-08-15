# Aktif iş panosu — çakışma önleme

> **Bu dosya git ile senkron çalışır, canlı bir tahta.** Herhangi bir ajan/oturum (Claude Code, Grok, Cursor — fark etmez) buraya bakmadan yeni bir iş başlatmaz.
> Protokolün tamamı: `AGENTS.md` § Çoklu-ajan koordinasyonu.

## Kural — özet

1. `git pull origin master`
2. Bu dosyayı oku — biri aynı dosyalarda/alanda mı çalışıyor kontrol et.
3. Aşağıdaki tabloya kendi satırını ekle → commit + push **sadece bu dosya**, hemen.
4. İşe başla. Küçük/sık commit tercih et.
5. Bitince: satırını sil (ya da "bitti" diye işaretle) → commit + push. Asıl işini `git pull --rebase` sonrası push et.

Aynı dosyada/alanda zaten bir satır varsa: ya bekle, ya sahiple/diğer oturumla konuşup alanı böl, ya da başka bir iş seç. Kör kör üstüne yazma — 15 Ağu 2026'da tam bunun bedelini ödedik (bkz. `roadmap.md` K34/K35 civarı, aynı işi iki ayrı oturum paralel yaptı).

---

## Şu an aktif olanlar

_(şu an boş — kimse aktif iş bildirmedi)_

| Kim | Başladı | Dosyalar / alan | Ne yapıyor |
|---|---|---|---|

---

## Son kapanan işler (bilgi amaçlı, isteğe bağlı — silinebilir)

| Kim | Tarih | Dosyalar / alan | Ne yapıldı |
|---|---|---|---|
| Claude (yeni oturum — önceki dolmuştu) | 2026-08-15 | `public/assets/ui/ui_hubmap_storybook_01_albedo_1344.webp` (yeni), `src/ui/hud.css` (.hub-map, .hub-island-name, .hub-quest-name, .hub-island-badge.*), `docs/art/asset-registry.md` (ASSET-052), `public/assets/assets.csv` | Önceki oturumun bıraktığı Hub arkaplan/çerçeve yeniden tasarımını bitirdi: 3 taslak konsept (chart/storybook/atlas) sahibe sunuldu, **storybook** seçildi, Gemini ile üretildi (Higgsfield değil — bağlı değil, script zaten Gemini kullanıyor), `.hub-map`'e entegre edildi. Yeni arkaplan busy olduğu için ada adı/rozet metinleri düşük kontrasta düşmüştü — krem text-shadow + opak rozet pilleriyle düzeltildi (screens.md §3.5 kontrast gereksinimi). Henüz commit edilmedi, sahip onayı bekleniyor. |
| Claude (bu oturum) | 2026-08-15 | `vite.config.ts`, `src/main.ts`, `index.html`, `src/ui/hud.css` | Build-time versiyon etiketi |
| Claude (bu oturum) | 2026-08-15 | `index.html` (#hubScreen), `src/ui/hud.css` (.hub-*) | Hub'a hover büyüme + parşömen bilgi etiketi eklendi (4 durak) |
