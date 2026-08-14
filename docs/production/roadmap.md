# Yol haritası — Lotophagoi (Lotus Adası)

> **Durum:** canlı doküman — her faz bitiminde güncellenir
> **Tarih:** 2026-08-14
> **Sahibi:** `producer` (koordinasyon noktası). Karar veren: sahip.
> **Otorite:** bu dosya karar vermez, **kararların nerede olduğunu gösterir.** Oynanış `docs/design/`, görsel dil `docs/art/`, ekran/akış `docs/ux/`. Çelişkide `docs/design/` kazanır.
> **Kapsam notu:** `variants/cave-farm/` arşiv, bu haritanın dışında.

Bu dosyanın tek işi şu soruyu tek bakışta cevaplamak: **şu an neredeyiz, sırada ne var.**

---

## 1. Şu an neredeyiz (dürüst özet)

### 1.1 Tasarım

| Doküman | Beyan edilen durum | Gerçek |
|---|---|---|
| `game-concept.md` | taslak — sahip onayı bekliyor | 4 karar kapalı (ad, zıplama yok, menü var, Lotophagoi kimliği ima), 4 açık soru duruyor |
| `gdd-lotus-collection.md` | tasarlandı — onay + playtest bekliyor | eksiksiz; 5 açık soru |
| `gdd-memory-system.md` | tasarlandı — onay + playtest bekliyor | eksiksiz; 3 açık soru + 2 playtest'e ertelenmiş değer |
| `level-lotus-island.md` | taslak — onay bekliyor | 28 çiçeğin el yerleşimi, 12 gemi, kroki hazır; 5 açık soru |
| `scenario.md` | taslak — onay bekliyor | beat'ler + tüm oyun içi metin hazır; 4 açık soru |
| `tuning.md` | ilk pas | **tam sayı listesi hazır** (artık §12 Kiklop algılanma sistemi dahil); 4+ değer playtest'e ertelenmiş (bkz. §11, §11.4, §12) |
| `multi-island-concept.md` *(yeni)* | M7 + K27–K29 kapandı | 3 duraklı koşu kararı verildi ve gerçek dokümanlara yazıldı; kendisi hâlâ bir karar kaydı, tuning kaynağı değil |
| `level-cyclops-cave.md` *(yeni, `island-designer`)* | taslak — sahip onayı bekliyor, **kilitli** (dokunulmuyor) | Kiklop Mağarası'nın kroki + bölgeleri + algılanma sistemi önerisi hazır; 6 açık soru (1 tanesi — respawn konumu — `gdd-detection-cyclops.md` ile kapandı) |
| `gdd-detection-cyclops.md` *(yeni, `game-designer`)* | onaylandı (kavramsal), sayılar 🔬 | Kiklop'un algılanma sistemi karara bağlandı; sabitler `tuning.md` §12'de |

**Sonuç:** tasarım tarafı yazım olarak neredeyse tamam, **onay olarak hiç kapanmadı.** Tek resmî onay `docs/art/art-bible.md` (Intake kapısı, 14 Ağu 2026).

### 1.2 Art / pipeline

- **Higgsfield MCP hâlâ bağlı değil.** Yerine `scripts/gen-assets.mjs` ile **Gemini API doğrudan yolu** kuruldu (`npm run gen:assets`); anahtar sırası `.env.local` → `../game-project/.env.local` fallback. **Görsel üretim yolu çalışıyor.** Veo/video yolu yazıldı ama **hiç doğrulanmadı.**
- **P0 üçlüsü üretildi ve sahip onayladı (14 Ağu 2026):**
  - ASSET-001 Doryseus turnaround → `art-source/ref/` — **referans**, kodun nişan aldığı hedef, oyuna girmiyor (14 Ağu 2026: karakter adı Odysseus'tan **Doryseus**'a değişti — asset dosya/etiket senkronizasyonu `art-director`'ın işi, ayrı görev)
  - ASSET-002 lotus 4 aşama sayfası → `art-source/ref/`
  - ASSET-003 ada key art → `art-source/media/` — **sadece pazarlama**, sahip kararıyla oyun kod/sahnesine hiç girmeyecek
- **ASSET-004..007 entegre:** lotus sayfası kırpıldı + alpha-key'lendi → `public/assets/textures/lotus_{bud_01,half_02,bloom_03,wilt_04}_albedo_512.png` → `src/world/lotus.ts`'te billboard `THREE.Sprite`. Prosedürel taç yaprak geometrisinin yerini aldı; **pad + sap hâlâ prosedürel.**
- `asset-registry.md` ve `public/assets/assets.csv` güncel ve tutarlı (34 kalem: 5 integrated, 2 accepted, 27 planned).
- **Yazılmamış:** `pipeline.md` §5'in altı adımlık still→video→spritesheet zincirini tek komuta indiren script.

### 1.3 Kod

`npm run build` / `tsc --noEmit` **temiz geçiyor.** Oyun oynanır: yürü, topla, taşı, teslim et, 12'de ayrıl, gün dolarsa dusk, unutuş dolarsa gemide yeniden doğ.

**Var olan:** 3. şahıs kamera rig, prosedürel ada + lagün + deniz, 34 lotus (4 aşama + gone), 12 gemili filo (direk bezi = ilerleme göstergesi), 3 Lotophagos + tek seferlik ikram, gün saati + güneş yayı, haze post-process (vinyet + doygunluk + kenar erimesi), web-audio dalga + lowpass, parçacık burst'leri, dokunmatik kontroller, final kartları.

**Tasarımda var, kodda YOK:**

| Eksik | Kaynak | Etki |
|---|---|---|
| `HARVEST_HOLD` (E'yi 1,2 s basılı tut) + ilerleme halkası + hareketle iptal | lotus GDD §3.1 | Oyunun tek "savunmasız anı" hiç yok; E anlık |
| Solmuş çiçek cezası (`MEM_WITHERED_PENALTY`) | lotus GDD §3.1/8 | Dört aşamadan biri mekanik olarak ölü |
| Dört unutuş eşiği + histerezis (25/50/75/100) | memory GDD §3.2 | Kodda tek eşik var (`blindThreshold` 0.8) |
| Yürüyüş sapması (eşik 3) | memory GDD §4.3 | Yok |
| `MEM_GRACE` 10 s son şans | memory GDD §4.4 | Kodda 6 s "pinned" + gemide yeniden doğuş |
| Deterministik olgunlaşma (`LOTUS_PHASE_SEED`) | lotus GDD §4.1, sütun P3 | Kod `Math.random()` + `timeJitter` kullanıyor → **rota öğrenilemez, P3 çökük** |
| El yerleşimli 28 çiçek | `level-lotus-island.md` §2–4 | Kod 3 bölgeye prosedürel saçıyor |
| Başlık / nasıl oynanır / hakkında ekranları | `ux/screens.md` | Yok — oyun doğrudan başlıyor |
| Açılış 3 satırlık overlay | `ux/screens.md` §3, `scenario.md` A1–A3 | Yok |
| Esc → duraklat, sekme arka planda → duraklat | memory GDD §5 | Yok; `input.ts` Escape'i hiç dinlemiyor |
| DOM pusula (alt orta, eşik 50'de gider) | `ux/hud.md` | Yerine 3D dünya oku var, 0.8'de soluyor |
| Muğlak teslim sayacı (`HUD_VAGUE_COUNTER`) | memory GDD §10 | Yok |
| Dalga sesinin lowpass'tan muafiyeti | memory GDD §9 | **İhlal:** `waveGain → filter → master`, dalga da filtreleniyor |

**Tasarımda YOK, kodda VAR (çelişki):**

- **Ekranda unutuş barı** (`index.html` `#memFill` + `hud.ts` `NOTES` metinleri). `gdd-memory-system.md` §10, `ux/hud.md` kabul kriterleri ve `asset-registry.md` P2 notu bunu **açıkça yasaklıyor** ("ölçek ekranın kendisidir"). CLAUDE.md de "no forgetting meter drawn on screen" diyor. → Bkz. §4-K1.

### 1.4 Kod ↔ `tuning.md` sapması (en büyük tek risk)

`constants.ts` `tuning.md`'den **önce** yazıldı ve onunla hiç eşitlenmedi. İsimlendirme bile farklı (`ISLAND.radius` vs `ISLAND_RADIUS`).

| Değer | `tuning.md` | `constants.ts` | Kat |
|---|---|---|---|
| Ada yarıçapı | 70 m | 26 | **0,37×** |
| Oyuncu hızı | 4.5 m/s | 6.2 | 1,38× |
| Çanta kapasitesi | 4 | 6 | 1,5× |
| Lotus sayısı | 28 | 34 | 1,2× |
| Aşama süreleri | 45 / 25 / 30 / 20 (döngü 120 s) | 14 / 11 / 26 / 16 + 12 "gone" + %45 jitter | uyumsuz |
| Gemi konumu | (0, −60) | (11.5, 19.5) | uyumsuz |
| Teslim menzili | 4.0 m | 7.4 | 1,85× |
| Unutuş ölçeği | 0–100 puan | 0–1 float | ölçek farkı |
| Pasif kazanç | 0.25 p/s | 0.007 → **0.7 p/s** | 2,8× |
| Koku / lagün | 0.35 p/s | 0.009 → **0.9 p/s** | 2,6× |
| Taşınan başına | 0.15 p/s | 0.005 → **0.5 p/s** | 3,3× |
| Deniz iyileşmesi | −6.0 p/s | 0.12 → **−12 p/s** | 2× |
| Gemi aurası | −2.0 p/s | 0.22 → **−22 p/s** | **11×** |
| Teslim iyileşmesi | −10 / çiçek | sabit −18 (adetten bağımsız) | uyumsuz |
| Gün uzunluğu | 420 s | 420 | ✅ |
| Hedef / filo / Lotophagos | 12 / 12 / 3×2 | 12 / 12 / 3×2 | ✅ |

**Okuma:** kod, `tuning.md`'nin **küçültülmüş ve hızlandırılmış** bir versiyonu. Kendi içinde tutarlı olabilir (ada 2,7 kat küçük olduğu için oranlar da hızlı) ama **hiçbir tasarım kabul kriteri bu kodda geçmez** ve playtest'e ertelenen 3 değer ölçülemez. Tek tek düzeltilecek bir şey değil; **tek bir ölçek kararı** gerekiyor (§4-K2).

### 1.4a K1/K2/K3 çözümü: iki world profile (14 Ağu 2026)

Sahip'in tek karar olarak verdiği cevap: yukarıdaki sapma tablosu "ya doc ya kod" değil, **iki paralel world profile** ile çözüldü. `src/constants.ts` artık `ACTIVE_PROFILE: "test" | "real"` (varsayılan `"test"`, `?profile=real` URL parametresiyle boot'ta ezilebilir — geçici dev switch, Faz 4'te gerçek ada-seçim UI'ı gelene kadar) ile seçilen bir `PROFILES` tablosundan `ISLAND.radius`, `PLAYER.speed`, `LOTUS.count`/`carryCap`, `SHIP.pos`/`range` ve `MEMORY`'nin altı oranını (`islandGain`, `perCarriedGain`, `lagoonGain`, `pickSpike`, `shipRecover`, `seaRecover`) besliyor. `real` profilin oranları `tuning.md` §5'in puan/s değerlerinin 100'e bölünmüş hâli (bkz. `tuning.md`'deki motor notu). Davranış farkları: `WORLD.showMemoryBar` (`hud.ts` `#memory` panelini `real`'de hiç güncellemiyor/gizliyor) ve `WORLD.lossMode` (`test` = mevcut yumuşak respawn; `real` = yeni `"gameover"` fazı — sert kayıp, sadece "Yeniden oyna").

**Bu çözüm kapsam dışı bıraktığı şey — artık ayrı bir kararla çözüldü:** çoklu-ada/"challenger" sistemi (sahip'in ayrıca istediği, dungeon-tasarımcısı-ajanı benzeri bir kavram) bu placeholder'ın üstüne oturacaktı. **`docs/design/multi-island-concept.md`'de M7 kapandı (2026-08-14, Seçenek 3), sonrasında K27–K29 ile üç bağımlı onay da kapandı:** **3 durak** (Lotus Adası + Kiklop Mağarası + Sirenler Geçidi — Kirke Adası şimdilik kapsam dışı), unutuş duraklar arası taşınıyor (`MEM_ISLAND_RELIEF_PCT = 0.4` öneri, kısmi iyileşme payıyla). M1–M6 (üretim biçimi, oturum uzunluğu, hangi duraklar, unutuş taşıma formülü, hedef dağılımı, `island-designer` agent'ı) `multi-island-concept.md` §6'da sonuca bağlandı; sonuçlar artık **gerçek dokümanlara da yazıldı**: `gdd-memory-system.md` (§3.1 madde 1/9, §3.5, §4.4), `tuning.md` (§3.0, §5, §10, §11.4), `game-concept.md` (§2, §7, Kapanan kararlar), `level-lotus-island.md` (üstbilgi notu). **Yeni `.claude/agents/island-designer.md` oluşturuldu**, `producer.md` routing tablosuna eklendi. **⚠️ Aynı gün, "hub yok" alt-maddesi tersine çevrildi:** sahip gerçek bir hub istedi (bkz. K2'nin ek notu, K27/K30, `multi-island-concept.md` §9). Unutuş taşıma ve hedef dağılımı **değişmedi**, sadece tetik "hub'a dönüş"e taşındı; koşu-bazlı kayıp (eski cümle: "kayıp finali koşu bazlı") **yeniden açık, kapanmadı** — bkz. K27. **Hâlâ yazılmayan:** Kiklop ve Sirenler'in kendi `level-*.md` dosyaları (bkz. Faz 2.6b/2.6c), hub'ın kendisi (Faz 4.9) ve buradaki `real` world-profile'ın 3 durak için ayrı ayrı örneklenmesi (kod tarafı, `gameplay-programmer`'ın işi).

**Bilinen sınırlama (kapsam dışı bırakıldı, izlenmeli):** `real` profil sadece yukarıdaki sayıları değiştiriyor; `LAGOON`, `LOTUS.zones` (34'e göre el/prosedürel yerleşim, `real`de 28'e **kırpılıyor**, yeniden yerleşmiyor), `PLAYER.spawn`, `FLEET`, `LOTOPHAGOS.spots` ve `CAMERA` hâlâ test-ölçekli koordinatlar/mesafeler. Sonuç: `real` profilde oyuncu (5.5, 22.5)'te doğuyor ama gemi artık (0, −60)'ta — ilk turda uzun bir yürüyüş. Bu, Faz 2.6'nın (el yerleşimli 28 çiçek + tam seviye tasarımı) kapsamı; şimdilik dokunulmadı.

| Değişen dosya | Ne değişti |
|---|---|
| `src/constants.ts` | `ACTIVE_PROFILE`, `PROFILES`, `WORLD` export'u; `ISLAND.radius`, `SHIP.pos`/`range`, `PLAYER.speed`, `LOTUS.count`/`carryCap`, `MEMORY`'nin 6 oranı artık profile'dan geliyor |
| `src/world/lotus.ts` | `LOTUS.count` daha küçükse zone spot'ları kırpılıyor (`spots.length = LOTUS.count`) |
| `src/types.ts` | `Phase` union'a `"gameover"` eklendi |
| `src/game.ts` | `WORLD.lossMode`'a göre `"lost"` (yumuşak) vs `"gameover"` (sert) dallanması; yeni `"gameover"` `step()` bloğu |
| `src/ui/hud.ts` | `showCard` kind'ına `"gameover"`; `WORLD.showMemoryBar` false ise `#memory` paneli hiç dokunulmuyor/gizli |
| `docs/design/tuning.md` | §5 başına motor-tarafı 0–100→0–1 dönüşüm notu |

---

## 2. Fazlar

Her faz tek başına oynanır bir build bırakır. Faz içindeki her madde **tek oturumda** bitecek boyutta yazıldı. Köşeli parantez ajanı gösterir.

---

### Faz 0 — Oynanır prototip ✅ BİTTİ

**Hedef:** çekirdek döngünün ekranda dönmesi.
**Bitiş kriteri:** ✅ topla → taşı → teslim et → 12'de ayrıl; iki final; `tsc` temiz; `npm run dev` çalışıyor.
**Ne bitti:** `4f50411` ilk commit + bu oturumdaki asset entegrasyonu (aşağıda).

| # | İş | Rol | Durum |
|---|---|---|---|
| 0.1 | Ada/deniz/lagün, kamera rig, hareket | `gameplay-programmer` | ✅ |
| 0.2 | Lotus tarlası, 4 aşama, topla/teslim | `gameplay-programmer` | ✅ |
| 0.3 | Unutuş v0 (tek eşik) + haze post-process | `gameplay-programmer` | ✅ |
| 0.4 | 12 gemili filo + direk bezi ilerlemesi | `gameplay-programmer` | ✅ |
| 0.5 | Gemini doğrudan üretim yolu (`scripts/gen-assets.mjs`) | `art-director` | ✅ |
| 0.6 | P0 üçlüsü üretimi + sahip onayı (ASSET-001/002/003) | `art-director` | ✅ |
| 0.7 | Lotus sayfasının kırpılıp alpha-key'lenmesi → 4 billboard sprite (ASSET-004..007) | `art-director` + `gameplay-programmer` | ✅ |
| 0.8 | `asset-registry.md` + `assets.csv` eşitlemesi | `art-director` | ✅ |

---

### Faz 1 — Tek doğruluk kaynağı: `tuning.md` ↔ `constants.ts`

**Hedef:** koddaki her oynanış sayısının `tuning.md`'de bir satırı olsun; ikisi arasında sapma **sıfır**.
**Bitiş kriteri (ölçülebilir):**
- `tuning.md`'deki her `UPPER_SNAKE_CASE` sabitin `constants.ts`'te birebir adıyla karşılığı var; fazladan/eksik sabit yok.
- Bir fark tablosu üretildi ve **her satır için sahip "doc kazanır" ya da "kod kazanır" dedi**; kaybeden taraf düzeltildi.
- Oyun hâlâ oynanıyor (`tsc` temiz + elle 1 tam tur).

**Tahmini kapsam:** 3–4 oturum.
**Bağımlılık / risk:** **Bu fazın çıktısı Faz 2, 3 ve 5'in tamamını belirler.** Ada yarıçapı 26 → 70 kararı verilirse çiçek yerleşimi, gemi konumu, kamera mesafesi ve tüm unutuş oranları birlikte değişir — Faz 2'nin maliyeti iki katına çıkar. 26'da kalınırsa `tuning.md`'nin yarısı yeniden yazılır. **Bu faz açılmadan Faz 2'ye geçilmemeli** — yoksa yanlış sayı üstüne mekanik inşa edilir.

| # | İş | Rol |
|---|---|---|
| 1.1 | `tuning.md` ↔ `constants.ts` tam fark tablosu; her satır için öneri + gerekçe (**karar yok, seçenek**) | `game-designer` |
| 1.2 | Sahip oturumu: ölçek kararı (§4-K2) + fark tablosundaki satır satır onay | sahip + `producer` |
| 1.3 | `constants.ts`'i `tuning.md` adlandırmasına geçir (`UPPER_SNAKE_CASE`, saniye/metre sözleşmesi) | `gameplay-programmer` |
| 1.4 | Kazanan değerleri uygula; oyun çalışır durumda kalsın (tek commit'te tek grup) | `gameplay-programmer` |
| 1.5 | Kaybeden tarafta `tuning.md` düzeltmesi + değişiklik günlüğü | `game-designer` |
| 1.6 | Unutuşu 0–1'den 0–100 puana çevir (ya da tersine karar verilirse doc'u çevir) | `gameplay-programmer` |

---

### Faz 2 — Çekirdek mekanik tamamlama

**Hedef:** iki GDD'nin kabul kriterlerinin **hepsinin** kodda geçmesi.
**Bitiş kriteri:** `gdd-lotus-collection.md` §8'deki 10 kriter + `gdd-memory-system.md` §8'deki 14 kriter, `qa-tester` tarafından tek tek koşulup **geçti** işaretlenmiş; deterministiklik testi (aynı tohum → aynı evre) geçiyor.

**Tahmini kapsam:** 6–8 oturum (Lotus Adası'nın çekirdek mekaniği, 2.1–2.9) **+ tahmini 3 ek oturum** (14 Ağu 2026, K29 sonucu ve `gdd-detection-cyclops.md` onayı — Kiklop ve Sirenler'in kendi el yerleşimleri 2.6b/2.6c, artı Kiklop'un algılanma sistemi 2.6e). **Toplam ~9–11 oturum.** Kapsam eskiye göre kabaca 2.6 özelinde **3× büyüdü** (1 durak → 3 durak) ve Kiklop'a özgü yeni bir sistem (algılanma) eklendi; 2.1–2.5 ve 2.7–2.9 paylaşılan sistemler olduğu için bir kez yazılıyor, çarpılmıyor.
**Bağımlılık / risk:** Faz 1'e **sert bağımlı**. 2.6 (el yerleşimi) ada ölçeği kararı olmadan yapılamaz. 2.2 (harvest hold) HUD halkası gerektirir → Faz 4 ile küçük bir kesişme; halkanın dünya-uzayı versiyonu burada, DOM tarafı Faz 4'te. 2.6b/2.6c, Kiklop/Sirenler'in `island-designer` level-spec'leri yazılmadan başlayamaz.

| # | İş | Rol |
|---|---|---|
| 2.1 | Deterministik olgunlaşma: `LOTUS_PHASE_SEED`, `Math.random()` ve `timeJitter` çıkar, faz formülü (`GDD §4.1`) | `gameplay-programmer` |
| 2.2 | `HARVEST_HOLD` basılı tutma + ilerleme + `HARVEST_CANCEL_MOVE` ile sıfırlama + dünya-uzayı halka | `gameplay-programmer` |
| 2.3 | Solmuş çiçek cezası (`MEM_WITHERED_PENALTY`) + kahverengi flaş + ses | `gameplay-programmer` |
| 2.4 | Unutuş dört eşiği + `MEM_THRESHOLD_HYSTERESIS` + `MEM_GRACE` geri sayımı (artık koşu bazlı — bkz. `gdd-memory-system.md` §3.1 madde 9) | `gameplay-programmer` |
| 2.5 | Yürüyüş sapması (eşik 3, `DRIFT_MAX_ANGLE` / `DRIFT_PERIOD`) | `gameplay-programmer` |
| 2.6 | Lotus Adası'nın (1. durak) çiçeklerinin el yerleşimi ayrı veri dosyasına (`islandLayout.ts`), `constants.ts`'e gömme — alt-hedef artık 12 değil **5** (bkz. `tuning.md` §3.0) | `game-designer` + `gameplay-programmer` |
| 2.6b | Kiklop Mağarası'nın (2. durak) el yerleşimi (mağara geometrisi, oda-başı öğe sayıları) — **level-spec hazır ve kilitli** (`level-cyclops-cave.md`, `island-designer`), geometri sabitleri henüz `tuning.md`'ye taşınmadı (bkz. `tuning.md` §12'nin altındaki not) | `gameplay-programmer` |
| 2.6c *(yeni, K29 sonucu)* | Sirenler Geçidi'nin (3. durak) el yerleşimi + yerel twist (cazibe/sürüklenme, mevcut `DRIFT_*` kodunun yeniden kullanımı) — `island-designer`'ın level-spec'ine bağlı, henüz yazılmadı | `island-designer` + `gameplay-programmer` |
| 2.6d *(yeni, K29 sonucu; hub'a dönüşle güncellendi, K30)* | Hub'a dönüş: `MEM_ISLAND_RELIEF_PCT` formülünün uygulanması (bkz. `gdd-memory-system.md` §3.5, `tuning.md` §5.2, yalnızca başarılı tamamlanışta) + Hub'dan durak seçimi akışı (serbest sıra, bkz. `multi-island-concept.md` §9.1) | `gameplay-programmer` |
| 2.6e *(yeni, 14 Ağu 2026, `gdd-detection-cyclops.md` onayından sonra)* | Kiklop Mağarası'nın **algılanma (tespit) sistemi**: `DETECT_*` 2×2 oran matrisi, Polyphemos'un deterministik evre döngüsü (`CYCLOPS_CYCLE`), yakalanma olayı (`onCaught` → çanta sıfırlama + `CAUGHT_MEM_SPIKE`). Sabitler `tuning.md` §12'de, davranış kuralları/kabul kriterleri `gdd-detection-cyclops.md`'de. **Yeni bir sistem — mevcut hiçbir mekanik envanteri istemsizce azaltmıyordu, bu ilk örnek** (bkz. `gdd-detection-cyclops.md` §1.1). 2.6b'ye bağımlı (mağara geometrisi/oda ışık tanımları olmadan test edilemez). | `gameplay-programmer` |
| 2.7 | Koku modeli: `SCENT_RADIUS` tabanlı, **yığılmayan** — mevcut "lagündeyse" kontrolünün yerine | `gameplay-programmer` |
| 2.8 | Deniz/gemi iyileşmesi `SHORE_WET_BAND` + `SHIP_AURA_RADIUS` ile; iç göl iyileştirmesin | `gameplay-programmer` |
| 2.9 | Kayıp finali davranışı (§4-K3 kararına göre, **artık koşu bazlı** — §4-K27) + Esc/sekme duraklatması | `gameplay-programmer` |

---

### Faz 3 — Unutuşun ifadesi (post-process + ses)

**Hedef:** unutuşun **görünür ve duyulur** olması; barsız anlatım (sütun P2).
**Bitiş kriteri:** `tuning.md` §5.4'teki beş `FX_*` eğrisi kodda; ekran görüntüsüyle 4 eşik ayırt edilebiliyor; dalga sesi eşik 3'te hâlâ duyuluyor ve lowpass'tan muaf; hiçbir geçiş 1,5 s'den kısa değil (fotosensitivite).

**Tahmini kapsam:** 3–4 oturum.
**Bağımlılık / risk:** Faz 2.4'e bağlı (eşikler olmadan eğri yok). Risk: mevcut `hazePass.ts` tek `amount` uniformu ile çalışıyor; dört ayrı eğriye ayrılması shader'ı yeniden yazmayı gerektirebilir — `technical-director` performans bütçesine bakmalı (bloom + haze + 6 örnekli blur zaten var).

| # | İş | Rol |
|---|---|---|
| 3.1 | `hazePass` → ayrı uniform'lar: vinyet / doygunluk / bulanıklık / sis mesafesi | `gameplay-programmer` |
| 3.2 | `FX_*` eğrilerinin `constants.ts`'ten sürülmesi; süt beyazı vinyet (siyah değil) | `gameplay-programmer` |
| 3.3 | Ses: lowpass süpürme (18 kHz → 900 Hz) + **dalga sesini filtre dışına al** | `gameplay-programmer` |
| 3.4 | Uğultu katmanı (eşik 2+) + lir bozulması | `gameplay-programmer` |
| 3.5 | Post-process bütçe ölçümü (hedef FPS, kare süresi) | `technical-director` |
| 3.6 | Dört eşiğin görsel doğrulaması, art bible §4 ile karşılaştırma | `art-director` |

---

### Faz 4 — UX kabuğu ve HUD

> **Öncelik notu (14 Ağu 2026, sahip kararı):** bu fazın "Başlık / Hub / Nasıl oynanır / Hakkında / Açılış / Pause" iskeleti artık **erken önceliğe alınmalı** — sahip Faz 1–3 tamamlanmadan Hub akışının (Başlık → Ada seçimi → durak) planlanmasını istedi, uygulamaya alınma sırası değil ama **tasarımının** öne çekilmesi. `docs/ux/screens.md`, `ia.md`, `user-flow.md` bu akışı bugün (2026-08-14) tasarım-tam olarak kurdu (bkz. `ux/screens.md` §3 "Hub (Ada seçimi)", yeni). **Bu not sıralamayı henüz değiştirmiyor** — hangi maddelerin Faz 1–3'ten önce/paralel yapılabileceğine (ör. 4.5/4.6/4.7'nin Hub'a göre genişletilmiş hâli, statik/mock veriyle bile önce inşa edilebilir mi) `producer` bir sonraki tam faz geçişinde karar verecek. Aşağıdaki tablo şimdilik **eski (hub'sız) kapsamla** yazılı durumda; Hub eklenince 4.5/4.6/4.7 genişler ve yeni maddeler eklenir (bkz. alttaki ek not).

**Hedef:** `docs/ux/` dokümanlarının ekrana çıkması; HUD'ın **kaybolmayı** doğru yapması.
**Bitiş kriteri:** `ux/hud.md` "Acceptance Criteria" listesindeki 8 maddenin **hepsi** işaretli (özellikle "unutuş barı, sayısı, yüzdesi **yok**"); `ux/screens.md` içindeki ekranlar (Başlık / **Hub** / Nasıl oynanır / Hakkında / Açılış / Pause / Durak sonu / Koşu sonu) gezilebilir; klavyeyle tam gezinilebilir, odak halkası görünür.

**Tahmini kapsam:** 4–5 oturum (Hub eklenmesiyle muhtemelen **+1–2 oturum** — yeni ekran türü + kilit/durum mantığı, bkz. `ux/screens.md` §3).
**Bağımlılık / risk:** 4.1 (bar kaldırma) **§4-K1 kararına bağlı** — sahip onayı gelmeden dokunulmaz. 4.4 (muğlak sayaç) `HUD_VAGUE_COUNTER` playtest değeri; Faz 6'da ölçülecek, burada sadece anahtarlanabilir olarak yazılır. **Yeni risk:** Hub'ın kilit/ilerleme mekanizması (`ux/screens.md` §3.3, K30 aşağıda) ve durak-kaybının koşuyu bitirip bitirmediği (aynı doküman §10) açık kararlar — 4.5/4.6/4.7'nin Hub'lı hâli bu iki karar netleşmeden **tam** kodlanamaz, ama Başlık/Nasıl oynanır/Hakkında/Hub'ın statik iskeleti (3 kart, hepsi açık varsayımıyla) bağımsız yapılabilir.

| # | İş | Rol |
|---|---|---|
| 4.1 | Unutuş barının kaldırılması (§4-K1 onayından sonra) + `index.html` temizliği | `ui-programmer` |
| 4.2 | DOM pusula (alt orta): eşik 1'de titrer, eşik 2'de `HUD_FADE_TIME` ile gider | `ui-programmer` |
| 4.3 | Eşik 3'te tüm HUD + prompt'un solarak gitmesi, geri gelmesi | `ui-programmer` |
| 4.4 | Muğlak teslim sayacı (`HUD_VAGUE_COUNTER`, anahtarlanabilir) | `ui-programmer` |
| 4.5 | Başlık + Nasıl oynanır + Hakkında ekranları | `ui-programmer` |
| 4.6 | Açılış 3 satırlık overlay (durağa göre — `scenario.md` A1–A3 Lotus için, diğerleri `island-designer` yazınca), ilk oyunda atlanmaz | `ui-programmer` |
| 4.7 | Pause menüsü (Devam / Durağı yeniden başlat / Hub'a dön / Ana menü) + Esc bağlaması | `ui-programmer` |
| 4.8 | Akış denetimi: klavye gezinimi, odak halkası, kontrast ≥ 4.5:1, 44 px hedef | `ux-designer` |
| 4.9 *(yeni, 14 Ağu 2026)* | **Hub (Ada seçimi) ekranı**: 3 durak kartı, kilit/hazır/tamamlandı durumu (ikon+metin), klavye gezinimi — bkz. `ux/screens.md` §3 | `ui-programmer` |
| 4.10 *(yeni, 14 Ağu 2026)* | Durak sonu ekranlarının buton hedeflerinin Hub'a bağlanması (Ayrılış → Hub'a dön / Koşu sonu; Unutulma → §10'daki karara göre) | `ui-programmer` |
| 4.11 *(yeni, 14 Ağu 2026)* | Koşu sonu ekranı (yalnızca 3. durak tamamlanınca / olası koşu-bazlı kayıpta) | `ui-programmer` |

---

### Faz 5 — Görsel geçiş (art)

**Hedef:** ada, gemi ve karakterin art bible'a ve onaylanmış referanslara yaklaşması.
**Bitiş kriteri:** ASSET-008..023 ve 031..033'ten sahip'in seçtiği alt kümenin `pipeline.md` §8 kabul kapısını geçmesi + `assets.csv`'de satırının olması; `sailor.ts` ASSET-001 turnaround'a yön olarak yaklaşmış (siluet, palet, kıyafet hatları) — birebir eşleşme değil.

**Tahmini kapsam:** 5–8 oturum (kapsam sahip'in seçtiği asset sayısına bağlı).
**Bağımlılık / risk:** Faz 1'in ada ölçeği kararı doku tekrar sıklığını (tileable kum/ot) etkiler. **Faz 2–4'e paralel yürütülebilir** — tek çakışma noktası `sailor.ts` (Faz 2'de harvest pozu gerekecek). Risk: 27 planned kalemin hepsi üretilirse kapsam patlar; **sahip bir alt küme seçmeli.**

**Not (14 Ağu 2026, `multi-island-concept.md` M7):** bu fazın "reuse bütçesi" varsayımı **tek biome** (Ege kıyısı) için yazıldı. Seçenek 3 kapandığına göre en az 2 yeni durak (Kiklop mağarası, Sirenler kayalığı — bkz. `multi-island-concept.md` §6/M3) muhtemelen **kendi palet/doku/silüet setini** ister; K5'in "27 kalem tek ada için bile fazla" uyarısı N durak ile katlanıyor. Faz 5 kapsamı, hangi duraklar seçilirse seçilsin, o duraklar netleşmeden yeniden boyutlandırılmamalı.

| # | İş | Rol |
|---|---|---|
| 5.1 | Sailor mesh'ini turnaround referansına yaklaştırma (siluet + palet + kıyafet) | `art-director` + `gameplay-programmer` |
| 5.2 | Kapsam seçimi: 27 planned kalemden MVP alt kümesi (öneri: kum, ıslak kum, kavruk ot, sazlık billboard, köpük hattı) | `art-director` + sahip |
| 5.3 | Seçilen tileable dokuların üretimi + §8 kabul kapısı + `assets.csv` satırları | `art-director` |
| 5.4 | Nilüfer yaprağı / pad + sap: prosedürelden dokuya mı, prosedürel mi kalsın kararı | `art-director` |
| 5.5 | Spritesheet zincirini tek komuta indiren script (`pipeline.md` §5) | `technical-director` |
| 5.6 | Doryseus yürüme/toplama/teslim animasyon denemesi (5.5'e bağlı, **riskli**: Veo yolu hiç doğrulanmadı) | `art-director` |
| 5.7 | Gökyüzü / uzak tepe backdrop | `art-director` |

---

### Faz 6 — QA + playtest ölçümü

**Hedef:** ertelenmiş üç sayının **ölçümle** kapanması ve build'in bozuk olmadığının kanıtlanması.
**Bitiş kriteri:** `tuning.md` §11'deki 6 ölçümün log verisi var; `DAY_LENGTH`, `MEM_SEA_RECOVER`, `HUD_VAGUE_COUNTER` üçü de karara bağlanmış (değiştir/koru) ve `tuning.md`'ye tarihiyle yazılmış; iki GDD'nin kabul kriter listeleri yeşil; bilinen açık bug sayısı kayıtlı.

**Tahmini kapsam:** 3–4 oturum + gerçek oyuncu süresi.
**Bağımlılık / risk:** Faz 2 ve 3 bitmeden **anlamsız** — eksik mekanikle ölçülen sayı yanlış sayıdır. Risk: solo projede "acemi oyuncu" bulmak; sahip kendi ilk turunu ölçemez (haritayı biliyor).

| # | İş | Rol |
|---|---|---|
| 6.1 | Test stratejisi + kanıt gereksinimleri (neyi, nasıl, hangi eşikle) | `qa-lead` |
| 6.2 | Otomatik log: 6 ölçümün telemetrisi (konsol/JSON, oyuncuya görünmez) | `gameplay-programmer` |
| 6.3 | İki GDD kabul kriter listesinin tek tek koşulması + bug raporları | `qa-tester` |
| 6.4 | Gerçek oturum(lar): en az bir haritayı bilmeyen oyuncu | sahip |
| 6.5 | Ölçüm sonuçlarının okunması + üç değerin karara bağlanması | `game-designer` |
| 6.6 | `tuning.md` §11 kapanışı + kapanan kararlar tablosuna işleme | `game-designer` |

---

### Faz 7 — Cilalama ve teslim

**Hedef:** paylaşılabilir bir web build + medya.
**Bitiş kriteri:** `npm run build` üretimi bir URL'de çalışıyor; `assets.csv` `public/assets/` altındaki **her** dosyayı kapsıyor (`pipeline.md` §7 zorunluluğu); AI kullanım beyanı oyun içinde/README'de var; trailer (ASSET-030) sahip onayından geçti.

**Tahmini kapsam:** 2–3 oturum.
**Bağımlılık / risk:** Faz 6'ya bağlı. Veo yolu doğrulanmadıysa trailer plan B gerektirir (gameplay capture + still montaj).

| # | İş | Rol |
|---|---|---|
| 7.1 | Performans bütçesi doğrulaması + build boyutu | `technical-director` |
| 7.2 | Manifest bütünlüğü denetimi (dosya ↔ csv birebir) | `art-director` |
| 7.3 | Announce trailer (ASSET-030) | `art-director` |
| 7.4 | AI beyanı + künye + README | `producer` |
| 7.5 | Yayın öncesi son geçiş (release readiness) | `qa-lead` |

---

## 3. Faz bağımlılık haritası

```
Faz 0 ✅
   │
   ▼
Faz 1  (ölçek + sayı hizalama)  ◄── burada tıkalıyız
   │
   ├──────────────► Faz 5 (art) — paralel yürüyebilir
   ▼
Faz 2  (mekanik)
   │
   ├──► Faz 3 (unutuş ifadesi)
   └──► Faz 4 (UX/HUD)
             │
             ▼
          Faz 6 (QA + playtest)
             │
             ▼
          Faz 7 (teslim)
```

---

## 4. Açık kararlar — sahip onayı bekliyor

Tek liste. Numaralar kalıcı; karar verilince satır silinmez, **sonuç ve tarih yazılır.**

### 4.1 Bloke edici (bir sonraki fazı durduruyor)

| # | Karar | Durum | Neyi bloke ediyor |
|---|---|---|---|
| **K1** | **Ekranda unutuş barı kalsın mı?** Kod barı çiziyor (`#memFill` + "Aklın yerinde/Tatlı bir ağırlık…" metinleri); `gdd-memory-system.md` §10, `ux/hud.md` kabul listesi, `asset-registry.md` P2 notu ve CLAUDE.md **hepsi yasaklıyor**. Ya kod düzeltilecek ya dört doküman. | **kapandı (14 Ağu 2026):** sahip kararı — iki world profile. `test` = "test adası", barı korur (mevcut davranış). `real` = gerçek ada, bar hiç render edilmiyor/güncellenmiyor. Bkz. §1.4a. | (artık bloke etmiyor — bkz. §1.4a) |
| **K2** | **Ada ölçeği hangisi?** `tuning.md` 70 m / 4,5 m/s / 28 çiçek / 4 kapasite mi, kod 26 / 6,2 / 34 / 6 mı? Ara çözüm de mümkün ama **iki taraf birden ayarlanamaz** (`tuning.md` §11.1 uyarısı). | **kapandı (14 Ağu 2026):** ara çözüm değil, **iki paralel profil**. `test` = mevcut kod değerleri (26 m / 6.2 m/s / 34 lotus / kapasite 6), değişmedi. `real` = `tuning.md` değerleri (70 m / 4.5 m/s / 28 lotus / kapasite 4, gemi (0,-60), teslim menzili 4.0 m). Bkz. §1.4a. **Ek karar (14 Ağu 2026, `multi-island-concept.md` M7):** sahip K2'ye cevap verirken soruyu büyüttü — "gerçek adalar challenger, çoklu olsun." Bu, ayrı bir dokümanda (`docs/design/multi-island-concept.md`) M7 olarak kapatıldı: **Seçenek 3** (elle-tasarlanmış Odysseia durakları, hub yok, tek koşu, unutuş taşınıyor). Yani `real` profili artık **tek adanın değil, her durağın** ölçeği olacak — bu satırdaki 70 m / 4.5 m/s / 28 çiçek / 4 kapasite değerleri hâlâ geçerli ama artık *bir* durağın (Lotus Adası'nın) değerleri, koşunun tamamının değil. **Kapsam netleşti (14 Ağu 2026):** sahip K27–K29'u onayladı — **3 durak** (Kirke dahil değil, ileride 4. olarak eklenebilir). Sonuçlar `gdd-memory-system.md`, `tuning.md`, `game-concept.md`, `level-lotus-island.md` içine yazıldı. | (artık bloke etmiyor — bkz. §1.4a) |
| **K3** | **Unutuş dolunca ne olur?** GDD: `MEM_GRACE` bitince **kayıp finali** (oyun biter). Kod + CLAUDE.md: yumuşak kayıp, gemide yeniden doğuş, unutuş 0.45'e iner. İkisi farklı oyun. | **kapandı (14 Ağu 2026):** ikisi de doğru, profile göre. `test` = yumuşak kayıp (mevcut, gemide yeniden doğuş). `real` = sert kayıp — yeni `"gameover"` fazı, sadece "Yeniden oyna" (baştan başlar), gemiye ışınlanma yok. Bkz. §1.4a. **Genişleme (14 Ağu 2026, K27):** `real`in sert kaybı artık **koşu bazlı** — 3 duraklı koşuda herhangi bir durakta `MEM_GRACE` dolması tüm koşuyu bitirir, sadece o durağı değil. Bkz. `gdd-memory-system.md` §3.1 madde 9. | (artık bloke etmiyor — bkz. §1.4a) |
| **K4** | **Tasarım dokümanları onaylandı mı?** `game-concept`, iki GDD, `level`, `scenario`, `tuning` — hepsi hâlâ "onay bekliyor" durumunda. Onaysız doküman üstüne kod yazmak Faz 2'yi riske atıyor. | açık | Faz 2 |
| **K27** | **Koşu-bazlı kayıp onayı** (`multi-island-concept.md` M4'ün örtük sonucu, ayrıca soruldu) — bir durakta unutuş dolarsa **tüm koşu** mu biter, yoksa ada bazlı bir checkpoint mi var? | **kesin kapandı (14 Ağu 2026, ikinci ve son karar):** hub geri geldiği için ilk karar (tüm koşu biter) geçersiz kaldı, yeniden açıldı (bkz. K30 madde 4), ve şu şekilde kapandı: **sadece o durak biter** — oyuncu hub'a döner (bağışlamasız, `MEM_ISLAND_RELIEF_PCT` uygulanmaz), başka bir durak ya da aynısını tekrar seçebilir. `gdd-memory-system.md` §3.1 madde 9 buna göre güncellenecek. | (kapandı) |
| **K28** | **Oturum süresi genişlemesi** — `game-concept.md` §2'deki "5–10 dakika" koşunun tamamı için mi, tek durak için mi geçerli olacak? | **kapandı (14 Ağu 2026):** koşunun tamamı için **~20–30 dakika**. Her durak eski tek-ada ölçeğinde (~5–10 dk) kalıyor. `game-concept.md` §2'ye yazıldı. **Ek not (aynı gün, hub'a dönüş sonrası):** sayı **değişmedi** — hub bir seçim ekranı olarak tasarlanmalı (gezinme süresi ihmal edilebilir), yoksa bütçe şişer. `multi-island-concept.md` §9.4. | (kapandı) |
| **K29** | **Kaç ve hangi durak?** `multi-island-concept.md` §6/M3'te Lotus + Kiklop + Sirenler + opsiyonel Kirke önerilmişti. | **kapandı (14 Ağu 2026):** **3 durak** — Lotus Adası (1./çapa) + Kiklop Mağarası (2.) + Sirenler Geçidi (3.). **Kirke Adası şimdilik kapsam dışı** (ileride 4. durak olarak eklenebilir). `game-concept.md`, `tuning.md` §3.0'a yazıldı. Hub kararı bunu etkilemedi — hâlâ aynı 3 durak, artık serbest sırayla. | (kapandı) |
| **K30** *(14 Ağu 2026)* | **Hub geri geldi — `multi-island-concept.md` M7'nin "hub yok" kararını tersine çeviriyor.** Sahip artık gerçek bir Hub (Başlık → Ada seçimi) istiyor. Bu, K27 (koşu-bazlı kayıp) ve M4'ün (unutuş taşıma formülü) hub'sız-koşu varsayımıyla nasıl bir arada duracağını yeniden açıyor. | **tamamen kapandı (14 Ağu 2026):** (1) **Unutuş taşıma (M4):** hub sıfırlamıyor, `MEM_ISLAND_RELIEF_PCT` tetiği "hub'a dönüş"e taşındı, yalnızca başarılı tamamlanışta uygulanıyor. (2) **`RUN_TARGET_TOTAL`:** değişmedi, hâlâ 12/durak-başı-sabit-alt-hedef. (3) **Oturum süresi:** ~20–30 dk değişmedi. (4) **Durak kaybı:** sahip onayladı — **sadece o durak biter**, oyuncu hub'a döner (bağışlamasız). Bkz. K27. (5) **Hub kilit modeli:** sahip **Seçenek C — Hibrit** onayladı (ilk koşuda sıralı kilit Lotus→Kiklop→Sirenler, koşu bir kez bitince o oturumda serbest seçim). `ux/screens.md` §3.3'e işlenecek. | (kapandı) |

### 4.2 Kapsam kararları

| # | Karar | Durum |
|---|---|---|
| **K5** | **Faz 5 art kapsamı:** 27 planned asset'in hangileri MVP'ye girecek? (öneri: 5 kalemlik alt küme) | açık |
| **K6** | **Key art nerede kullanılacak?** | **kapandı (14 Ağu 2026, tersine çevrildi):** eski karar ("oyun sahnesine hiç girmez") sahip tarafından değiştirildi — key art artık **oyun içi ekranlarda da** kullanılıyor, en azından Başlık ekranı arkaplanı (bkz. `ux/screens.md` §1). `asset-registry.md` ASSET-003'ün "olası başlık ekranı arka planı (karar bekliyor)" notu artık **evet**e dönüyor — dosya kendisi henüz güncellenmedi, bu `art-director`'ın işi. Hub ekranının arkaplanının da aynı key art'ı mı kullanacağı yoksa ayrı bir kompozisyon mu isteyeceği (3 durağı temsil etmesi gerektiği için) ayrı bir açık soru, `art-director`'a devredildi. |
| **K7** | **Veo/video yolu denenecek mi?** `gen-assets.mjs` video kolu hiç çalıştırılmadı. Trailer buna bağlı; plan B gameplay capture. | açık |
| **K8** | **Higgsfield MCP hâlâ hedef mi?** Gemini doğrudan yolu çalışıyor. MCP'ye geçmenin bugün somut kazancı ne? | açık |

### 4.3 Doküman içi açık sorular (dosya bazında)

| # | Kaynak | Soru |
|---|---|---|
| K9 | *(kapandı — taşındı, bkz. §4.4)* | ~~Oyuncu Odysseus mu, isimsiz tayfa mı?~~ |
| K10 | `game-concept.md` 2 | Hedef 12 sabit mi, zorluk seçeneği olacak mı? |
| K11 | `game-concept.md` 3 | Final ekranında skor/süre gösterilsin mi? (şu an gösterilmiyor) |
| K12 | `game-concept.md` 4 | Türkçe tek dil mi? |
| K13 | `gdd-lotus-collection.md` 2 | Yarı açık evrede kalan süre gösterilsin mi? |
| K14 | `gdd-lotus-collection.md` 3 | Solmuş cezası (+12) çok mu sert? |
| K15 | `gdd-lotus-collection.md` 4 | 12/12'de dümene basmak gereksiz bir tuş mu? |
| K16 | `gdd-lotus-collection.md` 5 | Hasat sonrası bitki tomurcuğa mı dönsün, kaybolsun mu? (tomurcuk seçildi, onay lazım) |
| K17 | `gdd-memory-system.md` 2 | Uğultu ne kadar rahatsız edici olmalı? |
| K18 | `gdd-memory-system.md` 3 | Unutuş mekaniği oyun başında açıklanmalı mı? |
| K19 | `tuning.md` 1 | `MEM_ON_HARVEST` sabit mi, artan mı? |
| K20 | `tuning.md` 2 | Lotophagos takası oyunu kırıyor mu? (playtest adayı) |
| K21 | `tuning.md` 3 | `FX_*` değerleri debug paneline mi taşınsın? |
| K22 | `level-lotus-island.md` 1–5 | Tepe değer mi · direk bezi okunur mu · kuzey kayalığı boş mu · faz eşleşmesi keşfedilir mi · 140 m çap doğru mu |
| K23 | `scenario.md` 1–4 | Açılış atlanabilir mi · kayıp finali huzurlu mu kalsın · beat 3 kamera kaçışı · minimal ayar menüsü |

### 4.4 Kapanmış ama dokümanda hâlâ açık görünenler (temizlik)

| # | Konu | Gerçek |
|---|---|---|
| K24 | **Gemi sayısı** — `asset-registry.md` satır 92 ve `art-bible.md` satır 175 hâlâ "tek gemi mi 12 gemi mi belirsiz" diyor | **Kapandı:** `level-lotus-island.md` krokisi 12 gemi diyor, `constants.ts` `FLEET.count = 12` ve kod 12 gemiyi çiziyor. İki art dokümanındaki `[?]` notu silinmeli. |
| K25 | **Zıplama** | Kapalı (yok). Kodda da yok. ✅ |
| K26 | **Oyun adı** | Lotophagoi. `index.html` `<title>` hâlâ "Lotus Adası — Odysseia IX". Küçük temizlik. |
| K9 | **Oyuncu Odysseus mu, isimsiz tayfa mı?** (eski `game-concept.md` §Açık sorular 1) | **Kapandı (14 Ağu 2026, sahip kararı):** oyuncu **Doryseus** — Homeros'un Odysseus'u değil, oyun için orijinal bir karakter. Diğer denizciler/NPC'ler kolektif olarak **"unutulmuş tayfa"** olarak anılıyor. Destan adı ("Odysseia") değişmedi. `game-concept.md`, `scenario.md`, `level-lotus-island.md`, `src/constants.ts`, `src/world/ship.ts`, `AGENTS.md`'de uygulandı. **Henüz uygulanmayan:** ASSET-001 turnaround'ın dosya/etiket adı (`docs/art/` — `art-director`'ın işi, ayrı görev). |

---

## 5. Şimdi ne yapmalıyız

**Tek adım: Faz 1.1 — `tuning.md` ↔ `constants.ts` fark tablosunu çıkart.**

- Kim: `game-designer`
- Ne üretir: her sapan değer için tek satır — doc değeri, kod değeri, hangisi neden kazanmalı, kazananın diğer sistemlere maliyeti (özellikle ada yarıçapı → çiçek yerleşimi → tur süresi → unutuş oranları zinciri).
- **Karar vermez, seçenek üretir.** Sahip tek oturumda satır satır onaylar (Faz 1.2).
- Neden bu: kodda bugün yazılan her mekanik yanlış sayı üstüne oturuyor, playtest'e ertelenen 3 değer ölçülemez durumda ve art tarafındaki doku tekrar sıklığı bile ada ölçeğine bağlı. **Bu karar açılmadan yapılan her iş yeniden yapılır.**
- Süre: bir oturum.

Bu adımla birlikte sahip'e sadece **K1, K2, K3** sorulacak (üç bloke edici karar). Kalan 20 soru bu haritada duruyor, sırası geldiğinde açılacak — hepsi bugün cevaplanmak zorunda değil.
