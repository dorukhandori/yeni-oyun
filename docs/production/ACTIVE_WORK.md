# Aktif iş panosu — çakışma önleme

> **Bu dosya git ile senkron çalışır, canlı bir tahta.** Herhangi bir ajan/oturum (Claude Code, Grok, Cursor — fark etmez) buraya bakmadan yeni bir iş başlatmaz.
> Protokolün tamamı: `AGENTS.md` § Çoklu-ajan koordinasyonu.

## Kural — özet

1. `git pull origin master`
2. Bu dosyayı oku — biri aynı dosyalarda/alanda mı çalışıyor kontrol et.
3. Aşağıdaki tabloya kendi satırını ekle → commit + push **sadece bu dosya**, hemen.
4. İşe başla. Küçük/sık commit tercih et.
5. Bitince: satırını **silme** — çıktısı commit'liyse "son kapanan işler"e, commit edilmediyse "beklemede"ye taşı (bkz. aşağı). Asıl işini `git pull --rebase` sonrası push et.

Aynı dosyada/alanda zaten bir satır varsa: ya bekle, ya sahiple/diğer oturumla konuşup alanı böl, ya da başka bir iş seç. Kör kör üstüne yazma — 15 Ağu 2026'da tam bunun bedelini ödedik (bkz. `roadmap.md` K34/K35 civarı, aynı işi iki ayrı oturum paralel yaptı).

**Üç durum var:** **aktif** (şu an sürüyor) → **beklemede** (iş bitti, diskte duruyor, commit edilmedi/sahip onaylamadı) → **kapandı** (commit edildi). "Bitti ama commit yok" bir satırı silmeye yetmez — o zaman çıktı, disklerde durduğu hâlde tabloda görünmez olur.

---

## Şu an aktif olanlar

| Kim | Başladı | Dosyalar / alan | Ne yapıyor |
|---|---|---|---|
| Cursor (Grok, bu oturum) | 2026-08-16 | `src/render/stage.ts`, `src/constants.ts` | Ada güzelleştirme dilimi 1: V9 güneş diski + `#ffcf80` hale (art-bible §2, zaten onaylı). Directional light gölge için yerinde kalır; görünür güneş gökyüzünde aynı yönde. |

---

## Beklemede — üretildi, commit edilmedi, sahip onayı bekliyor

| Kim | Tarih | Dosyalar / alan | Ne bekliyor |
|---|---|---|---|

---

## Son kapanan işler (bilgi amaçlı, isteğe bağlı — silinebilir)

| Kim | Tarih | Dosyalar / alan | Ne yapıldı |
|---|---|---|---|
| Claude (technical-director + ana oturum) | 2026-08-16 | `scripts/asset-qa/**`, `docs/production/asset-testing-platform.md`, `docs/production/visual-change-gate.md`, `package.json` + lock, `src/main.ts` + `src/game.ts` (DEV `__LOTOPHAGOI_TEST_HOOKS__`) | Asset test kapısı: `npm run test:assets` 6/6 PASS. Bilinen 46 bulgu `baseline.json`'da; yeni sapma kırmızı. |
| Claude (art-director) | 2026-08-16 | `docs/art/asset-prompt-playbook.md` | Operasyonel üretim akışı (A0–A6) + prompt kararlılığı örnekleri (B0–B11). |
| Claude (producer + ana oturum) | 2026-08-16 | `docs/research/lotophagoi-research-index.md`, `docs/production/agent-roster-update-proposal.md`, `.claude/agents/**`, `CLAUDE.md`, `AGENTS.md`, `docs/art/pipeline.md` §8, `docs/production/roadmap.md` K36/K37 | Roster + Paca nicks uygulandı; `test:assets` §8 kapı satırı. |
| Claude (art-director) | 2026-08-16 | `docs/research/lotophagoi-visual-quality-benchmark.md` | V1–V11 görsel boşluk envanteri (kod yok). |
| Claude (yeni oturum) | 2026-08-15 | Hub storybook arkaplan (ASSET-052) + kontrast yaması | Commit `44edd67`. |
| Claude (bu oturum) | 2026-08-15 | `vite.config.ts`, `src/main.ts`, `index.html`, `src/ui/hud.css` | Build-time versiyon etiketi |
| Claude (bu oturum) | 2026-08-15 | `index.html` (#hubScreen), `src/ui/hud.css` (.hub-*) | Hub hover büyüme + parşömen bilgi etiketi |
