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

| Kim | Tarih | Dosyalar / alan | Ne yapıyor |
|---|---|---|---|
| Claude (`producer` / `@nile`, bu oturum) | 2026-08-17 | **yalnız** `docs/production/ACTIVE_WORK.md` + Paca kartları LOT-54 (epic) / LOT-55–59 | K35 online speedrun challenge (nick + timer + leaderboard) **scope/plan turu — bitti**. Sadece okuma yaptım: `src/game.ts`, `src/ui/menu.ts`, `src/constants.ts`, `docs/design/gdd-lotus-island-run.md`, `docs/ux/screens.md`. **Hiçbir kaynak dosyaya yazmadım** — implementasyon (LOT-57/58) sahip iki bloklayıcı karara (LOT-55 tasarım, LOT-56 backend) cevap verene kadar Backlog'ta. Yukarıdaki ada-donatım dilimiyle dosya çakışması yok. |
| Claude (`technical-director` / `@axiom`, bu oturum) | 2026-08-17 | **yalnız** `docs/production/ACTIVE_WORK.md` + Paca LOT-56 / LOT-57 / LOT-58 yorumları | LOT-56 K35 online leaderboard **backend mimarisi — plan turu, kod yok**. Supabase şeması + RLS + `submit_k35_score` RPC, GitHub Pages env/secret planı, `src/net/leaderboard.ts` istemci sözleşmesi (LOT-57/58 buradan okuyacak). Salt okuma: `src/game.ts`, `src/types.ts`, `src/ui/menu.ts`, `src/constants.ts`, `package.json`, `.github/workflows/deploy-pages.yml`. **Hiçbir kaynak dosyaya yazmıyorum**; implementasyon ayrı turda. |
| — | — | — | (bu oturumun deniz/gemi dilimi push'ta) |

**Not — diğer oturumlar:** ada kiti GLB'leri (ASSET-068–073) `master`'da. Deniz artık Gerstner ızgara (`sea.ts` + `oceanWaves.ts`); ada kiti dokunulmasın. Thallope (LOT-39) ayrı aile.

---

## Beklemede — üretildi, commit edilmedi, sahip onayı bekliyor

Şu an boş. LOT-52 kahraman gövdesi yerelde duruyor (GLB + `constants.ts` filo=1); sahip canlı eşitlemesine bu turda dahil edilmedi.

**Not — diğer oturumlar için (Cursor/Grok dahil), 2026-08-17 (güncel):** Thallope'un ayak rotasyonu sorunu araştırıldı (kök neden: bacak kemiklerinde `bone roll` hiç ayarlanmadı, kutup hedefi düzeltmesi + rotasyon kilitleme denendi, ikisi de etkisiz) — **sahip kararıyla v1 olarak kabul edildi, düzeltilmedi.** Detay: Paca LOT-34. Bu asset'e dokunacak biri (rotasyonu düzeltmeyi denerse) rig'i muhtemelen roll değerleriyle baştan kurup Rigify'yi yeniden üretmesi gerekeceğini bilsin — tek başına foot_ik/kutup hedefi düzeltmesi yetmiyor.

**Sahibe açık not (hiçbir commit'i beklemiyor, ayrı bir eylem):** CLAUDE.md'deki "rig'siz Doryseus / bilinen boşluk" satırı artık eski — GLB'de `preset:idle/walk/run` zaten var, ikili düzeyde doğrulandı (2026-08-17). İzin sistemi CLAUDE.md düzenlemesini blokladığı için **sahibin kendi eliyle** güncellemesi gerekiyor.

---

## Son kapanan işler (bilgi amaçlı, isteğe bağlı — silinebilir)

| Kim | Tarih | Dosyalar / alan | Ne yapıldı |
|---|---|---|---|
| Claude (`producer` / `@nile`, bu oturum) | 2026-08-17 | `src/constants.ts` (`PONDS`/`PATHS`/`FROGS` + `FLORA` yoğunluk + `PALETTE.frog*`), `src/world/terrain.ts`, **yeni** `src/world/{ponds,paths,frogs}.ts`, `docs/design/level-lotus-island.md` §8, `docs/art/asset-registry.md` P7 | LOT-53 ada donatım katmanı: belli belirsiz patikalar (bake'lenmiş maske, tek doku fetch), 4 dekoratif golet (`real`) / 1 (`test`), golet+göl kenarı kurbağalar (prosedürel kod mesh, mekanik etkisi yok), scatter yoğunluk geçişi. **Dış asset pipeline kullanılmadı** — `public/assets/`'e tek dosya eklenmedi, kredi harcanmadı. `sea.ts`/`ship.ts`/`oceanWaves.ts` **okundu ama değiştirilmedi**. Üç gerçek hata ölçülerek bulunup düzeltildi: (1) su diski çukur yarıçapına göre boyutlanıp kıyıda havada kalıyordu → çözülen su hattı; (2) sabit boy nilüfer yaprağı sandbox havuzunu örtüyordu → orana bağlandı; (3) **`SEA_TEX.overlapMeters` (10 m) bandına giren golete okyanus çiziliyordu** (`floorY` +0,05 > havza −0,75), havuzun yarısı krem köpük oluyordu → `siteFits()` artık bu bandı reddediyor. Sahip "işler bitince pushla, bana bir şey sorma" dedi; doğrulama sonrası push edildi. |
| Cursor (Grok, bu oturum) · `@byte` / `@iris` | 2026-08-17 | `src/world/{sea,oceanWaves,ship}.ts`, `ship_hero_03_mesh_8000.glb` | LOT-52 42 m kahraman gövde + Gerstner deniz + pruvadan kuma kahverengi kaya patikası. Sahip bu haliyle push istedi. |
| Cursor (Grok, bu oturum) · `@iris` | 2026-08-17 | `scripts/blender/build_island_kit.py`, `public/assets/models/{rock_chalk_*,flora_olive,flora_cypress,flora_reed}*`, `docs/art/{asset-registry.md,specs/lot-28-island-interior.md}` | LOT-45 / LOT-28 dilim 1: Blender ada kiti GLB'leri Pages'e. Kod (`islandKit.ts`) zaten `master`'daydı; mesh dosyaları untracked kaldığı için canlıda fallback kod mesh görünüyordu. Güneş (`593f027`) de canlıda yoktu — sonraki Pages job GitHub 429/502 ile düştü. |
| Cursor (Grok, bu oturum) · `@byte` / `@iris` | 2026-08-17 | `src/render/{stage,hazePass,sunDisk}.ts`, `src/constants.ts`, `src/world/terrain.ts` (uzak tepe), `scripts/blender/build_sun_god.py`, `sky_sungod_01_mesh_1200.glb` | Commit `593f027`. LOT-49 ada ışığı (bible §3) + LOT-50 güneş tanrısı v1. Sahip park etti, yine de canlıya istedi. |
| Cursor (Grok, bu oturum) · `@byte` | 2026-08-17 | `src/world/thallope.ts`, `src/game.ts`, `public/assets/{models,ref}/creature_thallope_*` | Commit `2d6ea69`. LOT-39 Thallope ada spawn. Ayak yaw v1 (LOT-34). Push bu oturum. |
| Cursor (Grok, bu oturum) · `@glyph` | 2026-08-17 | `src/ui/fullscreen.ts`, `src/ui/hud.css`, `docs/ux/{screens.md,hud.md}` | Commit `11d59f3`. LOT-51 iOS follow-up: Tam ekran düğmesi iPhone'da da görünür, native API yoksa görünür alana sığdırır. Pushlandı. |
| Cursor (Grok, bu oturum) · `@glyph` | 2026-08-17 | `src/ui/fullscreen.ts`, `src/ui/hud.css`, `src/main.ts`, `src/game.ts`, `docs/ux/{screens.md,hud.md}` | Commit `9b2ceae`. LOT-51 (Paca Done): telefon tarayıcı tam ekran gir/çık + visualViewport kabuk. Pushlandı. |
| Claude (ana oturum + `producer`/@nile + `ui-programmer`/@glyph) | 2026-08-17 | `docs/production/asset-pipeline-loop-plan.md` (yeni), `workbench.html`, `src/workbench/{main.ts,viewer.ts,workbench.css}` (yeni), `vite.config.ts` | Commit `ab05d22`. LOT-32 (Paca Done): jenerik GLB/animasyon önizleme sahnesi + `/__workbench/models` dev-only listeleme endpoint'i + "dış klip ekle" (ayrı dosyanın kliplerini yüklü modele bağlama, LOT-37'nin ihtiyacı). Üç gerçek hata bulunup düzeltildi: (1) `[hidden]` CSS'te eziliyordu, (2) `<canvas>`'ın flexbox min-width'i paneli ekran dışına itiyordu (sahip "bomboş sahne" diye yakaladı), (3) dış-klip-ekle klipsiz modelde erişilemezdi (asıl kullanım senaryosu). Ayrıca: Blender kuruldu (Homebrew), `ahujasid/blender-mcp` seçilip Claude Code'a bağlandı (`claude_desktop_config.json` düzenlendi, restart sonrası doğrulandı), eklenti dosyası Blender'a kopyalandı — Blender içi etkinleştirme adımı hâlâ sahipte. Sahip onayladı ("HARIKA PUSHLA!"), pushlandı. |
| Claude (bu oturum) | 2026-08-17 | `src/constants.ts`, `src/game.ts`, `src/world/terrain.ts`, `scripts/gen-tripo-retexture.mjs`, `public/assets/models/char_doryseus_02_{textured,rig}_8000.glb` | Commit `04ba77f`. LOT-27 gerçek çözüm: Tripo'nun kendi `texture_model` retexture'ı (Meshy değil), gerçek doku, `cardinalViews.ts` silindi. Ardından iki playtest hatası ölçülerek düzeltildi: uçma (`meshYLift` 0.08→0.01) ve yanlış yön (`meshFacing` π→-π/2). Sonra rig: Tripo rig+retarget, `preset:idle/walk/run`, gerçek WASD ile yürüme animasyonu doğrulandı. Ayrıca hareket motoru denetimi: statik nesnelerle (kaya/ağaç/sütun) çarpışma yoktu, `terrain.ts` + `game.ts`'e eklendi, gerçek `step()`'e karşı doğrulandı. Sahip onayladı, push edildi.
| Cursor (Grok, bu oturum) | 2026-08-16 | `src/world/sailor.ts`, `src/world/gltf.ts`, `public/assets/models/`, `scripts/gen-mesh.mjs`, `scripts/gen-meshy.mjs` | LOT-27: Tripo Doryseus GLB playable (`meshFacing` π, Hip bind pin). Sprite-projeksiyon shader iptal (beyaz boya). Meshy 4-view retexture script hazır; `MESHY_API_KEY` yok. |
| Cursor (Grok, bu oturum) | 2026-08-16 | `src/render/sunDisk.ts`, `src/render/stage.ts`, `src/world/sea.ts` | V9 güneş diski + su yansıması. |
| Cursor (Grok, bu oturum) | 2026-08-16 | `src/world/terrain.ts`, flora webp | Billboard ağaç reddi → hacimli kod mesh + flora alpha. |
| Cursor (Grok, bu oturum) | 2026-08-16 | `.cursor/rules/paca-identity.mdc`, `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc` | Sprint + kart-önce-iş kuralı sahip onayıyla commit edildi; Paca Sprint 2 (LOT-17–23) açık. |
| Claude (technical-director + ana oturum) | 2026-08-16 | `scripts/asset-qa/**`, `docs/production/asset-testing-platform.md`, `docs/production/visual-change-gate.md`, `package.json` + lock, `src/main.ts` + `src/game.ts` (DEV `__LOTOPHAGOI_TEST_HOOKS__`) | Asset test kapısı: `npm run test:assets` 6/6 PASS. Bilinen 46 bulgu `baseline.json`'da; yeni sapma kırmızı. |
| Claude (art-director) | 2026-08-16 | `docs/art/asset-prompt-playbook.md` | Operasyonel üretim akışı (A0–A6) + prompt kararlılığı örnekleri (B0–B11). |
| Claude (producer + ana oturum) | 2026-08-16 | `docs/research/lotophagoi-research-index.md`, `docs/production/agent-roster-update-proposal.md`, `.claude/agents/**`, `CLAUDE.md`, `AGENTS.md`, `docs/art/pipeline.md` §8, `docs/production/roadmap.md` K36/K37 | Roster + Paca nicks uygulandı; `test:assets` §8 kapı satırı. |
| Claude (art-director) | 2026-08-16 | `docs/research/lotophagoi-visual-quality-benchmark.md` | V1–V11 görsel boşluk envanteri (kod yok). |
| Claude (yeni oturum) | 2026-08-15 | Hub storybook arkaplan (ASSET-052) + kontrast yaması | Commit `44edd67`. |
| Claude (bu oturum) | 2026-08-15 | `vite.config.ts`, `src/main.ts`, `index.html`, `src/ui/hud.css` | Build-time versiyon etiketi |
| Claude (bu oturum) | 2026-08-15 | `index.html` (#hubScreen), `src/ui/hud.css` (.hub-*) | Hub hover büyüme + parşömen bilgi etiketi |
