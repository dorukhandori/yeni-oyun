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
| — | — | — | — |

---

## Beklemede — üretildi, commit edilmedi, sahip onayı bekliyor

| Kim | Tarih | Dosyalar / alan | Ne bekliyor |
|---|---|---|---|
| Claude (bu oturum) | 2026-08-16 | `src/constants.ts`, `src/world/sailor.ts`, `scripts/gen-tripo-retexture.mjs`, `public/assets/models/char_doryseus_02_textured_8000.glb`, `art-source/raw/char_doryseus_01_tripo_retex.glb` | **LOT-27 asıl çözüm — sahip onayıyla üretildi, doğrulandı, sahip görünümü onayladı.** Sahip düzeltti: Meshy değil, Tripo. Tripo'nun kendi `texture_model` retexture task'ı var (`docs.tripo3d.ai` — düz metinde endpoint yazmıyor, aday yolları deneyip `POST /v3/models/texture`'ı buldum: bare GET 405 döndü, 404 değil, credit harcamadan route'un var olduğunu doğruladı). Orijinal mesh'in Tripo task ID'si hiç kaydedilmemişti, o yüzden `gen-tripo-retexture.mjs --regen-and-texture` önce geometriyi (aynı kilitli ASSET-041..044, `texture:false`) yeniden üretti (task `613e1c54...`), sonra o task'ı retexture etti (task `56fb1681...`, 10 kredi). Sonuç: `art-source/raw/char_doryseus_01_tripo_retex.glb` → `public/assets/models/char_doryseus_02_textured_8000.glb`. Dondurulmuş test-hook + `meshHold.rotation.y` doğrudan döndürerek açı açı doğrulandı: 90°=gerçek ense, 270°=gerçek yüz, 0°/180°=doğru ayna profiller. `cardinalViews.ts` silindi. `SAILOR.mesh` yeni GLB, `meshEnabled: true`. **Eksik: rig yok**, yürürken statik bind pose — ayrı takip işi.
| Claude (bu oturum) | 2026-08-16 | `src/world/terrain.ts`, `src/game.ts` | Sahip: "hareket motorunu yaz, tüm fizik kurallarına uygun, hatasız." Mevcut kinematik controller'ı (`game.ts` `step()`) denetledim — sabit 60 Hz dt, yay-tabanlı ivme, zemin/eğim snap, sığ su, sınır yumuşak-bölgesi zaten sağlamdı. Gerçek boşluk: **hiçbir statik nesneyle çarpışma yoktu** — kayalara, ağaç gövdelerine, tapınak sütunlarına yürüyerek geçiliyordu (`game.ts`'de "collis/obstacle" için sıfır eşleşme). `terrain.ts`'e `Collider{x,z,radius}` listesi eklendi (selvi/zeytin gövde yarıçapı, kaya `0.55×ölçek`, lagün kayıları hariç — onlar sığ su enkazı, katı değil; tapınak sütunları). `game.ts`'e konum-düzeltme + hız-projeksiyonu çözümleyici eklendi (2 geçiş, komşu çakışmaları için). Gerçek `step()` fonksiyonuna karşı doğrulandı (`__LOTOPHAGOI_TEST_HOOKS__.freeze()` + `runSteps`, sahte pozisyon/hız enjekte edip gerçek üretim kodunu çalıştırarak): yalıtılmış bir kolider'e gömülü başlangıç → tek adımda kayan noktaya kadar dur (ölçülen mesafe `minDist`'e 14 basamak kesinlikte eşit); sürekli hızla yaklaşma → tam `minDist`'te durup titremeden kalıyor (60 adım boyunca sabit). Tünelleme yok, jitter yok. `tsc` temiz, konsolda yalnızca ortam-kaynaklı pointer-lock uyarısı var. **Kapsam dışı bırakılan (bilinçli):** kamera-engel çarpışması (kamera hâlâ kayaların/ağaçların içinden geçebilir — ayrı, daha büyük bir özellik), gemi/tepe-bulmacası/basamak-taşı çarpışması (kendi etkileşim menzilleri var, dokunmadım), sanrı figürleri/lotophagoi NPC'leri (tasarım gereği zaten engellemiyor). Sahip hard-refresh ile kayalara/ağaçlara yürüyüp denemeli.
| Claude (bu oturum) | 2026-08-17 | `src/constants.ts` | Sahip ekran görüntüsü: "havada uçuyor" + W'de sağ profil / S'de sol profil (arka/ön değil). İkisini de `__LOTOPHAGOI_TEST_HOOKS__.freeze()` + gerçek `sailor.root`/kamera pozisyonu üzerinden ölçtüm, tahmin etmedim: (1) **Uçma** — `fitGltfHeight` doğru zeminliyordu (ölçülen boşluk ~0), görsel terrain mesh de analitik `heightAt()` ile eşleşiyordu (ışın izleme farkı ~0.00016 m); tek suçlu, eski düşük-poli mesh için ayarlanmış `SAILOR.meshYLift=0.08` idi — char_doryseus_02 için gereksiz, `0.01`'e düşürdüm. (2) **Yön** — `char_doryseus_02`'nin kendi yerel "ön" ekseni `facing` kuralından 90° kayık çıktı (ölçülen: `facing=0`'da profil görünüyor, gerçek ön/arka değil); `SAILOR.meshFacing`'i `π`'den `-π/2`'ye çevirdim. Ekran görüntüsüyle doğrulandı: `facing=π` (W) → gerçek ense, `facing=0` (S) → gerçek yüz (simetrik, iki göz), `facing=π/2` (D) → temiz yan profil. `tsc` temiz. Sahip hard-refresh ile gerçek WASD'de bakmalı.
| Claude (bu oturum) | 2026-08-17 | `src/constants.ts`, `scripts/gen-mesh.mjs` (yol argümanı, kod değişmedi), `public/assets/models/char_doryseus_02_rig_8000.glb`, `art-source/raw/char_doryseus_02_rig.glb` | Sahip: "yürüme ve koşma yeteneği kazandıralım." `gen-mesh.mjs --animate --glb art-source/raw/char_doryseus_01_tripo_retex.glb` çalıştırdım (sahip'in bu oturumdaki genel onayı kapsamında — ayrıca sormadım, "kazandıralım" zaten talimat): rig-check riggable=true/biped, rig 23a41f8a başarılı, ama retarget bd7c82f4 script'in 5 dk poll penceresinde "queued 0%" takılı kaldı ve script timeout'la çıktı (script'in kendi hata mesajı yanlışlıkla "3 min" diyor, gerçek POLL_ATTEMPTS×POLL_MS=5 dk — script'in kendi bug'ı, ayrı not). Task'ı Tripo tarafında sorguladım, script pes ettikten sonra da devam ediyormuş — 2 dk sonra `success` oldu, tekrar üretime gerek kalmadan `model_url`'i doğrudan indirdim (kredi tasarrufu). Sonuç GLB'de doğrulandı: `preset:idle`/`preset:walk`/`preset:run` klipleri, 1 skin, doku/materyal korunmuş (`export_with_geometry`). `SAILOR.meshRig` artık bu dosyayı gösteriyor. Rigging bind pose'u hafifçe değiştirebileceği için uçma + yön düzeltmelerini BU dosyaya karşı da yeniden doğruladım (aynı yöntem): boşluk hâlâ ~0.01 (meshYLift ile eşleşiyor), W/S hâlâ gerçek ense/yüz. Gerçek WASD ile (`keydown`/`keyup` KeyW) yürüme animasyonunun oynadığını ekran görüntüsüyle doğruladım — orta-adım pozu (bacaklar açık, kollar sallanıyor), artık statik bind pose değil. Koşu (`runHold=10` sn basılı tutma) ayrı test edilmedi, aynı kod yolunu kullanıyor. `tsc` temiz, konsolda yalnızca ortam-kaynaklı pointer-lock uyarısı var. Sahip hard-refresh ile gerçek WASD + uzun W basılı tutup koşuyu denemeli.

---

## Son kapanan işler (bilgi amaçlı, isteğe bağlı — silinebilir)

| Kim | Tarih | Dosyalar / alan | Ne yapıldı |
|---|---|---|---|
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
