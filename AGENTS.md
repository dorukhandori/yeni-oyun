# yeni-oyun — CCGS studio

Sahiple Türkçe. Kod/commit İngilizce. Stüdyo işletim sistemi: **Claude Code Game Studios** (agent/skill seti `game-project`’ten alındı → `.cursor/`).

## Oyun

**Lotophagoi** (Lotus Adası) — Vite + TypeScript + **Three.js (r185)** 3D prototipi. Title → Hub → **Lotus kartı = asıl oyun** (`real`: 12 lotus, batış kayıp, unutuş = gameover). Hub uydusu **Beş yeter** = K35 kenar görev (5 rastgele, gün döner). Sanrı figürleri: `docs/design/gdd-lotus-hallucination.md`. Kenar otoritesi: `docs/design/gdd-lotus-island-run.md`.

- Çalıştır: `npm run dev` → http://localhost:5173/
- Telefon (canlı): **https://dorukhandori.github.io/yeni-oyun/** (master merge + GitHub Pages Actions)
- Build: `npm run build` · Pages build: `npm run build:pages`
- Kod kökü: `src/`
- Glowsprig mağara-çiftlik varyantı: `variants/cave-farm/` (ana oyuna dokunma)

## Nasıl çalışır

Cursor’da slash yok. Skill adı söyle veya ajan çağır.

| İhtiyacın | Ajan / skill |
|---|---|
| Bugün ne? | `help` veya `producer` |
| Mekanik / tasarım | `game-designer` · `design-system` · `quick-design` |
| Prototip dilim | `prototyper` · `prototype` · `vertical-slice` |
| Oynanış kodu (Three.js/TS) | `gameplay-programmer` · `prototyper` |
| UI / HUD | `ui-programmer` · `ux-designer` · `team-ui` |
| Görsel / art yönü | `art-director` · `art-bible` · `asset-spec` |
| QA / playtest | `qa-lead` · `qa-tester` · `playtest-report` · `smoke-check` |
| Sprint / risk | `producer` · `sprint-plan` |
| Mimari | `technical-director` · `architecture-decision` |

Unity / Unreal specialist ajanlar kitte duruyor; bu repo Vite + Three.js — onları yalnızca bilinçli engine değişiminde kullan.

## Asset pipeline

Kaynak sistem: ZEUS⚡️ (@zeuuss_01) — *"How to Run a Game Studio Solo with Claude Code + Higgsfield MCP"*, 5 Ağustos 2026
<https://x.com/zeuuss_01/article/2085112087605342552> (tam metin doğrulandı 2026-08-14). **"Paid partnership"** — Higgsfield sponsorlu playbook; yöntemi alıyoruz, maliyet/performans iddialarını satıcı kaynaklı sayıyoruz.

**Üç katman:** **Opus 5 / Fable 5** = tasarım motoru · **Claude Code** = build motoru · **Higgsfield MCP** = medya motoru (tek connector URL, 30+ model).
**Hat:** Intake (sahip ~20 dk) → Design → Media + Build **paralel** → QA + teslim (sahip ~25 dk). İnsan yalnızca bu **iki kapıya** dokunur.
Higgsfield **3D mesh üretmez** — çıktı ancak texture / billboard / skybox / UI sprite / trailer / stil referansı olur; oyun içi görsel koddan çıkar. Hattın sınırı: AAA değil, **concept-to-trailer-to-prototype**.

| Doküman | Ne işe yarar |
|---|---|
| `docs/art/pipeline.md` | Hattın tamamı: iki insan kapısı, Higgsfield erişimi, animasyon hattı, klasör/isim kuralı, kabul kapısı |
| `docs/art/art-bible.md` | Görsel dil: Ege altın saat paleti (hex), ışık felsefesi, **unutma estetiği**, yasaklar |
| `docs/art/asset-registry.md` | Ne gerekiyor, hangi sınıf, hangi durum, hangi öncelik |
| `docs/art/prompts/` | Higgsfield prompt şablonları — `_anatomy.md` ortak iskelet |
| `public/assets/assets.csv` | **Shipping manifest** — her asset için prompt + model + seed; build ile yayına çıkar |
| `.cursor/rules/asset-pipeline.mdc` | Bağlayıcı kurallar |

Akış sırası: Intake onayı (art bible) → registry satırı → prompt şablonu → üretim → kabul kapısı (`pipeline.md` §8) → `assets.csv` satırı → `public/assets/` veya `art-source/media/`.
Hareketli karakter: still → AI video → frame extraction → palette quantize → elle temizlik → spritesheet (`pipeline.md` §5).

**Durum:** Higgsfield bağlı değil (`pipeline.md` §3). Erişim gelene kadar üretim yok, yalnızca plan.
Ham dosyalar `art-source/` altında ve git'e girmez; oyuna giren dosyalar `public/assets/` altında.
Saha araştırması: `docs/research/ai-pipeline-games.md` (okunur, değiştirilmez).

## Kaynak

Agent/rule/skill kopyası: `/Users/dori/Desktop/game-project/.cursor/`  
Canopy-kilitli kurallar: `.cursor/rules/reference-canopy/` (alwaysApply kapalı)

## Çoklu-ajan koordinasyonu (Claude Code + Grok + Cursor aynı repo'da)

Bu repoda aynı anda birden fazla AI oturumu çalışabiliyor — hepsi aynı `origin/master`'a push atıyor, kimi zaman aynı yerel makinede bile. 15 Ağu 2026'da bunun bedelini gördük: eşzamanlı yoğun yazma trafiği yerel dosya sistemini bozdu (dosyalar 0 byte okundu, `tsc` "is not a module" hatası verdi — temiz `git clone` ile düzeltildi), ve iki ayrı oturum habersizce aynı işi (ada ölçek büyütme, karakter fizik düzeltmesi) paralel yaptı.

**Kural — her oturum, her iş öncesi:**

1. `git pull origin master` — en güncel hali al.
2. `docs/production/ACTIVE_WORK.md`'yi oku — biri aynı dosyalarda/alanda mı çalışıyor kontrol et.
3. Kendi satırını ekle (kim/ne zaman/hangi dosyalar/ne yapıyor) → commit + push **sadece bu dosya**, hemen.
4. İşe başla. Küçük/sık commit tercih et — bir özelliği bitirmeden saatlerce yerelde tutma.
5. Bitince: `ACTIVE_WORK.md`'deki satırını sil → commit + push. Asıl işi de `git pull --rebase` sonrası push et; çakışma çıkarsa elle çöz, kör kör üzerine yazma.

**Kaçınılacaklar (bugünden ders):**

- Aynı anda 2. bir `npm run dev`/`vite preview` başlatma — önce `lsof -i :5173` ile portu kontrol et.
- `git worktree` kullandıysan iş bitince `git worktree remove` yap; arkasında process (özellikle `vite preview`) bırakma — silinen bir worktree'ye bağlı process paylaşılan `node_modules`'a yazmaya devam edip bozulmaya yol açabiliyor.
- Disk doluluğu (`df -h`) — %90 üstü riskli, uzun/paralel oturum öncesi kontrol et.
- `docs/production/roadmap.md`'ye K-numaralı kararları **silmeden**, sonuç+tarihle ekleyerek yaz — bu, herkesin okuduğu tek doğruluk kaynağı; K-madde numarasını asla tekrar kullanma, hep yeni numara aç.

**Grok'a özel not:** `AGENTS.md` + `docs/production/roadmap.md` + `docs/production/ACTIVE_WORK.md` — sahibin her Grok oturumu başında link/paste ile vermesi gereken minimum üç dosya. Claude Code oturumları `CLAUDE.md`'yi otomatik okuyor; Grok'un böyle bir mekanizması yok, sahip hatırlatmazsa bu protokolden habersiz kalır.

## Yasak

Commit ancak sahip isterse. Dev server’ı (`npm run dev`) gereksiz yere öldürme.
