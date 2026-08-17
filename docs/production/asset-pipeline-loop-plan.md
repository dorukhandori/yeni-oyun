# Asset üretim döngüsü — Blender MCP + Tripo planı

> **Ne bu:** `docs/art/pipeline.md` (nasıl üretiriz) ve `docs/production/asset-testing-platform.md` (üretilmiş asset'i nasıl denetleriz) arasındaki **eksik parçayı** kapatan plan — üretim *sırasında* çalışan, görsel hedefe (mockup) karşı otomatik skorlayan bir iterasyon döngüsü, artı ayrı bir elle-bakma aracı (§4). Henüz kod yok; bu doküman KAPI 1 (intake) onayı içindir.
> **Tarih:** 2026-08-17 · **Yazan:** ana oturum (Claude Code) · **Durum:** taslak, sahip onayı bekliyor.
> **Kaynak:** Chong-U (@chongdashu), Grok 4.6 + Cursor + Blender MCP + Meshy + Unity CLI videosu, X paylaşımı <https://x.com/chongdashu/status/2089139349371973645>. Tweet metni + video bölüm başlıkları (chapters) doğrudan çekildi (2026-08-17, `vxtwitter.com` aynası üzerinden — X'in kendisi 402 döndürdü): *"1. Mockups with Grok Imagine Image 2.0 · 2. Mini gauntlet loops to generate assets + polish · 3. Meshy for characters · 4. Grok 4.6 for gameplay · 5. Elevenlabs for sfx and bgm"* + 14 zaman damgalı bölüm (00:00 Intro → 12:16 Wrap Up, tam liste §4.1 notunda). **Sınır:** videonun görsel akışı/konuşması izlenmedi, yalnızca metin/bölüm başlıkları doğrulandı — bölüm başlıkları sahibin ilk sözlü özetiyle örtüşüyor, bu yüzden [K] etiketleri o özete + bu başlıklara dayanıyor. İkinci kaynak: `docs/research/ai-pipeline-games.md` §4.5 *Bawk to the Future* (aynı deseni — Tripo + GPT→Blender — bağımsız doğruluyor, zaten bu repoda var).

## Etiket sözleşmesi

`pipeline.md` ile aynı disiplin, kaynağı bu dokümanın kaynağı:

| Etiket | Anlamı |
|---|---|
| **[K]** | Video bölüm başlıklarında/tweet metninde açıkça var, ya da sahibin ilk özetiyle doğrulanmış. Videonun görsel içeriği izlenmedi — bu satırın sınırı. |
| **[A]** | `ai-pipeline-games.md` §4.5'te bağımsız doğrulanmış saha pratiği, ya da bu doküman içinde bu oturumda GitHub repo sayfası/README üzerinden doğrudan doğrulanmış dış kaynak (yıldız sayısı, lisans, dosya yapısı — tahmin değil). |
| **[P]** | Proje kararı — kaynakta yok, bu oturumun ya da sahibin sohbette verdiği karar. |
| **[?]** | Doğrulanmamış / sahip onayı bekliyor. |

---

## 1. Neden bu üçüncü doküman gerekiyor

**[P]** İki mevcut doküman farklı işler yapıyor, üçüncüsü aradaki boşluk:

| Doküman | Ne zaman çalışır | Ne yapar | Ne yapmaz |
|---|---|---|---|
| `pipeline.md` | üretim öncesi/sırası | Prompt anatomisi, hangi asset hangi vendor'dan (Gemini still, Tripo mesh), isimlendirme, manifest | Üretilen çıktının hedefe ne kadar yakın olduğunu **ölçmez** — bu iş `art-bible.md §8` listesiyle **sahibin gözüne** bırakılmış |
| `asset-testing-platform.md` | üretim sonrası, ship öncesi | `npm run test:assets`: manifest bütünlüğü, isimlendirme, indirme bütçesi, palet ΔE, kontrast, ekran regresyonu | Yeni bir asset **üretmez**, üretimi **yönlendirmez** — sadece zaten üretilmiş, diske yazılmış bir dosyayı denetler |
| **bu doküman** | üretim *sırasında*, tekrarlı (§3) + üretimle ship arası, elle (§4) | Chong-U'nun deseni: mockup'a karşı otomatik kıyas + döngü, artı jenerik bir "bak ve dene" aracı | Ship kararı vermez (o hâlâ §8 + `test:assets`'in işi) |

Videodaki cümleyle: mevcut iki dokümanımız "başta mockup üret" ve "sonda kontrol et" adımlarını zaten kapsıyor. **Ortadaki iterasyon halkası** — üretir, kendi çıktısına bakar, düzeltir, tekrar bakar — bizde hiç yok. Bugünkü akış tek atımlık: Tripo bir GLB üretir, sahip §8 checklist'iyle gözle bakar, olmadıysa yeniden prompt yazılır. Bu, videoda "insan onayı" olarak kalması gereken KAPI 2'yi (`pipeline.md §1.1`), aslında hâlâ **ajanın kapatması gereken** bir iç döngüyü de dolduracak şekilde kullanıyor.

---

## 2. Videodan çıkan desen — üç asset sınıfı, üç yol

**[K]** Chong-U'nun kendi ağzından çizdiği sınır: cansız/basit hacim (ada, slime) Blender MCP'yle iyi çıkıyor; humanoid (rakun) çıkmadı, o noktada Meshy'ye geçiyor. **[A]** Bağımsız doğrulama: *Bawk to the Future* geliştiricisi de aynı sonuca kendi projesinde ulaşmış — "the most significant weakness... is the generated 3D models, for which I used Tripo" ve GPT→Blender'ın (yapıcı/araç-tabanlı) diffusion image-to-3D'den daha "doğru yol" olduğunu düşünüyor.

Bizde bu üç sınıf zaten örtük olarak var, sadece hiçbiri "Blender MCP" ayağına sahip değil:

| Asset sınıfı | Video'da | Bizde bugün | Bizde önerilen |
|---|---|---|---|
| Basit hacim (kaya, sütun, koru, gemi parçası) | Blender MCP, canlı iterasyon | Kod mesh (`terrain.ts` içinde elle geometri) VEYA Tripo (image-to-3D, tek atım) | **[P]** Blender MCP — parametrik, tekrarlanabilir, dokusuz/palet-tint uyumlu (`pipeline.md §5.1`'in "neden dokusuz" mantığıyla zaten örtüşüyor) |
| Humanoid (Doryseus, NPC) | Meshy | Tripo (`gen-mesh.mjs`, `gen-tripo-retexture.mjs`) — CLAUDE.md'de bağlayıcı karar | **değişmiyor** — Tripo kalır |
| Rig üstüne özel animasyon (el sallama, teslim anı, unutuş sendelemesi) | Blender MCP, hazır rig'in üstüne custom clip | **daraltıldı (2026-08-17, `producer` GLB'yi ikili düzeyde inceledi):** `char_doryseus_02_rig_8000.glb` zaten `preset:idle`/`preset:walk`/`preset:run` taşıyor — genel hareket bitti. CLAUDE.md'deki "bilinen boşluk: rig/animasyon yok" satırı **artık eski**, `char_doryseus_02_textured_8000.glb` (doku dosyası, klipsiz) ile karıştırılmış olmalı — sahip düzeltmeli, bu doküman CLAUDE.md'ye yazamıyor | **[P]** Kalan tek soru **özel klipler** (el sallama, teslim jesti, unutuş sendelemesi) — Blender MCP ile mevcut rig üstünde elle clip. Genel hareket kütüphanesi kapandı, ek iş gerekmiyor |
| Genel hareket kütüphanesi (idle/walk/run) | Meshy'nin hazır rig'i | Tripo `--animate` — zaten koşulmuş (`04ba77f` commit'inde "gerçek WASD ile yürüme animasyonu doğrulandı") | **zaten var, ek iş yok** |

---

## 3. Görsel-geri-bildirimli iterasyon döngüsü — asıl yeni parça

**[P]** Bu bölümün tamamı öneri; kaynakta yok, `test:assets`'in mevcut altyapısından türetiliyor.

### 3.1 Neden sıfırdan kurulmuyor

`asset-testing-platform.md §4.1`'in kararı hâlâ geçerli: **bir tarayıcı, üç kontrol** — Playwright + Chromium zaten `public/assets/` render'larından screenshot alıp piksel kıyaslıyor (C6 regression), baskın renk çıkarıyor (C4 palette). İterasyon döngüsü aynı altyapıyı **farklı bir amaçla** kullanır: referans = git geçmişindeki bir baseline değil, `art-source/ref/` altındaki mockup still'i.

### 3.2 Önerilen akış

```
1. Mockup zaten var — art-source/ref/ altında onaylı still (pipeline.md §5.1 adım 1)
2. Üretici script (Blender MCP ya da Tripo) bir GLB/sahne üretir
3. Three.js sahnesine geçici olarak yüklenir (loadGltf, tintGltf)
4. Playwright, sabit kamera açısından screenshot alır
   (test:assets'in __LOTOPHAGOI_TEST_HOOKS__ freeze/runSteps deterministik altyapısı — asset-testing-platform.md §4.5/§4.6 — aynen tekrar kullanılır, sıfırdan kurulmaz)
5. Screenshot ile mockup arasında bir yakınlık skoru:
   - v0 (ucuz): C4'ün baskın-renk + palet dE mantığının genellemesi — mockup'ın baskın renkleri ile
     render'ın baskın renkleri arasında dE farkı
   - v1 (daha doğru, [?] maliyet-fayda tartışılmalı): bir görüntü-anlama modeline (ör. bu oturumun
     kendisi, Read tool'uyla screenshot'a bakıp 1-10 skor vermesi) iki görüntüyü yan yana verip
     "mockup'a benzerlik" sorusu — insan kararına en yakın ama her turda bir model çağrısı demek
6. Skor eşiğin altındaysa: üretici parametreleri (Blender MCP komut dizisi ya da Tripo prompt/seed)
   değiştirilip 2'ye dönülür
7. Skor eşiği geçince ya da tur sayısı tükenince (ör. 5-8 tur) döngü durur, sahibe haber verilir
```

### 3.3 `/loop` primitifi zaten elimizde

**[P]** Bu oturumun kendi araç setinde `/loop` skill'i var — "bir prompt'u tekrarlı çalıştır, aralığı kendin belirle" tam olarak videodaki "Mini Gauntlet / `/loop` (2-5 dk)" karşılığı. Sıfırdan bir zamanlayıcı/döngü mekanizması yazmaya gerek yok; `/loop <asset-iterasyon-prompt'u>` çağrısı, döngünün "her turda skor kontrol et, düşükse devam et, yeterliyse `stop`" mantığını zaten taşıyabilir. Bunu ayrı bir script yerine bir **prompt deseni** olarak belgelemek yeterli olabilir — ilk denemede karar verilecek.

### 3.4 Nereye oturur — `scripts/pipeline/` mi, ayrı mı

`asset-testing-platform.md §3`'ün önerdiği ayrım korunur: **`pipeline/` yazar, `asset-qa/` okur.** Bu döngü *sahneye geçici yükleme + screenshot* yapıyor ama **`public/assets/`'e kalıcı yazmıyor** (skor eşiği geçene kadar hiçbir şey ship edilmez) — yani ne tam "üretim" ne tam "doğrulama", ikisinin arasında üçüncü bir kategori: **iterasyon**. Öneri: `scripts/pipeline/iterate/` altında ayrı bir alt klasör, `asset-qa/lib/browser.mjs`'i **okuma amaçlı** import edebilir (asset-testing-platform.md §3'teki "ters yön yasak" kuralı ihlal edilmez çünkü `iterate/` `asset-qa/`'dan okuyor, `asset-qa/` `iterate/`'ten değil).

---

## 4. Asset önizleme sahnesi — workbench

**[P]** Bu bölüm videoda yok. 2026-08-17 sohbetinde sahip başka bir yetenek istedi: "tüm assetlerin özelliklerinin denenebildiği (yürüme animasyonu, koşma animasyonu vs.) özelleştirilen kıyafetlerin filan ayrı ayrı karakter üzerinde tek tıkla giydirilip test edilebildiği bir platform." Doğrulama: video bölüm başlıkları (14 bölüm, tam liste üstteki kaynak notunda) tek tek kontrol edildi — "wardrobe/outfit/clothing/customization" hiçbirinde geçmiyor; en yakını **09:19 Meshy for Animations** (hazır animasyon kütüphanesini rig'li karaktere uygulama, kıyafet değil). Yani bu, videodan gelen bir madde değil — **sahibin platforma eklediği ayrı bir istek**, sohbette netleşti: genel bir devtool, belirli bir Lotophagoi mekaniğine bağlı değil.

### 4.1 Ne değil, ne

§3'teki iterasyon döngüsünden farkı: döngü **otomatik** skorlayıp kendi kararını veriyor, workbench ise **insanın elle bakıp karar verdiği** bir araç — otomasyon değil, gözlem. `test:assets`'ten farkı: o zaten diske yazılmış, manifeste girmiş bir dosyayı denetliyor; workbench bir asset manifeste girmeden **önce**, "bu böyle mi duruyor" diye bakılan ara istasyon.

### 4.2 Kapsam — bugün Lotophagoi'de

Lotophagoi'de şu an bir kıyafet/ekipman mekaniği **yok** (`docs/design/` GDD'lerinde böyle bir sistem geçmiyor) — yani "kıyafeti karaktere giydir" özelliğinin bugün test edecek somut bir hedefi yok. Ama aracın kendisi buna bağlı değil; tarif tamamen jenerik: herhangi bir GLB'yi boş bir sahneye yükle, üstündeki animasyon clip'lerini oynat, birden fazla GLB'yi (örn. gövde + ayrı bir prop) aynı sahnede yan yana koy. Bugünden somut kullanım alanları:

- Tripo `--animate` çıktısını (idle/walk/run preset'leri) oyuna hiç bağlamadan izole kontrol etmek
- Doryseus GLB varyantlarını (`char_doryseus_01_rig_8000.glb` vs `char_doryseus_02_textured_8000.glb`) yan yana kıyaslamak
- Gelecekte bir NPC mesh'i geldiğinde aynı şekilde bakmak

Bir kıyafet/ekipman mekaniği ileride tasarlanırsa (bu bir `game-designer` kararı, GDD'ye girer — bu doküman öyle bir mekanik önermiyor) aynı araç bir GLB'yi bir kemik soketine (bone socket) tak/çıkar şeklinde genişler. Bugün inşa edilirken bunu öngörüp mimariyi şişirmeye gerek yok — sadece "tek GLB yükle" yerine "listeden N GLB yükle, birini ana iskelet say" esnekliği yeterli.

### 4.3 Nereye oturur

Oyunun kendi giriş noktasından (`index.html` → `src/main.ts`) bağımsız, ikinci bir Vite girişi (`preview.html` gibi) — aynı `npm run dev` sunucusu üzerinden servis edilir, ayrı bir toolchain gerekmez. `src/world/gltf.ts`'teki `loadGltf`/`tintGltf` paylaşılır; workbench bunları çağırır ama `game.ts`'in state machine'ine hiç girmez. `__LOTOPHAGOI_TEST_HOOKS__`'un "prod build'e sızmama" disiplinine benzer bir garanti burada da gerekir — `npm run build`/`build:pages` çıktısında workbench route'u olmamalı, `asset-testing-platform.md §4.6`'daki doğrulama yöntemi (build çıktısında string arama) tekrar kullanılabilir.

### 4.4 §6'nın "çıkarılmaya hazır" listesine en güçlü aday bu

Bu araç, plandaki diğer parçalardan (iterasyon döngüsü, QA gate) daha az Lotophagoi'ye bağımlı — palet okumuyor, eşik okumuyor, `assets.csv` okumuyor; sadece "bir GLB'yi yükle, göster." §6'daki iki koşul (kanıtlanmış + ikinci tüketici) beklenmeden bile **baştan tamamen jenerik yazılabilir** — hiçbir Lotophagoi varsayımı koymadan. Planın erken çıkarılabilecek tek parçası muhtemelen bu.

### 4.5 Mimari referans — sıfırdan icat edilmiyor

**[A]** 2026-08-17'de gerçek GitHub repo sayfalarından doğrulandı (yıldız sayıları, README, dosya yapısı — tahmin değil). İki ayrı araç sınıfı var, plan boyunca karıştırılmaması gereken ayrım tam burada netleşiyor:

| Sınıf | Kim bakıyor | Örnek | Bizde karşılığı |
|---|---|---|---|
| İnsan-yüzlü, etkileşimli önizleyici | bir geliştirici elle tıklıyor | `tk256ailab/vrm-viewer`, `pixiv/three-vrm`, `google/model-viewer` | **§4 workbench** |
| Ajan-yüzlü, headless skorlayıcı | otomasyon, insan yok | bulunamadı — en yakın emsal Needle Inspector, ama o da interaktif (aşağıda) | **§3 iterasyon döngüsü** |

**Workbench (§4) için doğrudan kopyalanacak mimari** — [`tk256ailab/vrm-viewer`](https://github.com/tk256ailab/vrm-viewer) (Three.js + `@pixiv/three-vrm`, framework yok):

- Tek `index.html`, vanilla JS/CSS — build tooling yükü yok
- **Sekmeli panel:** Model / Animasyon / Poz / Yüz — her biri kendi kontrol setiyle izole
- Model: drag&drop ya da dosya seçici
- Animasyon: klip listesi + play/pause + crossfade
- Kamera: sol-tık döndür, sağ-tık kaydır, scroll zoom

Bizim §4 workbench'i bu şablonu birebir izleyebilir: `workbench.html` (2026-08-17 düzeltmesi — `preview.html` değil, `npm run preview` zaten `vite preview` demek, isim çakışırdı), framework yok, sekmeler (Model / Animasyon / ileride Kıyafet), yükleyici olarak `src/world/gltf.ts`'teki `loadGltf`/`tintGltf`. Sıfırdan panel tasarımı icat edilmiyor. **Lisans notu:** `tk256ailab/vrm-viewer`'ın kendi lisansı doğrulanamadı (üç referans reposu gibi net değil) — oradan kod kopyalanmıyor, yalnızca panel/sekme deseni örnek alınıyor.

**Diğer referanslar (gömülebilir/permissive lisanslı, mimari fikir için):**

- [`google/model-viewer`](https://github.com/google/model-viewer) — 8.2k⭐, Apache 2.0 — herhangi bir glTF'yi tarayıcıda gösteren gömülebilir web component
- [`pixiv/three-vrm`](https://github.com/pixiv/three-vrm) — 2.1k⭐, MIT — Three.js'te rig'li humanoid + animasyon API'si; workbench'in animasyon oynatma mantığı buna bakılarak yazılabilir
- [`umasteeringgroup/UMA`](https://github.com/umasteeringgroup/UMA) — 848⭐, MIT — Unity'de kıyafet/saç/silah katmanlama + animasyon önizleme; bizde birebir kullanılamaz (Unity) ama "slot" mimarisi ileride bir kıyafet mekaniği tasarlanırsa referans

**Ajan-yüzlü tarafta (§3) hazır ürün yok — asıl özgün kısmımız burası.** En yakın emsal [Needle Inspector](https://needle.tools/needle-inspector-devtools-for-threejs) (needle.tools): Chrome extension, three.js sahnelerine canlı bağlanıyor, sahne ağacı + kaynak/performans paneli + **MCP ile Claude/Cursor bağlantısı** (`npx needle-cloud start`) sunuyor — yani "ajanı 3D sahneye bağlamak" fikri gerçekten kanıtlanmış. Ama mimarisi **interaktif/extension tabanlı**; local canlı düzenleme + AI-editing zaten ücretli (Pro) katmanda. Bizim ihtiyacımız — **headless, scriptable, ücretsiz, CI'da koşabilir** (Playwright, `asset-testing-platform.md` altyapısı) — farklı bir sınıf. Adapte edilmiyor, ama §3'ün yönünün mimari olarak tuhaf olmadığını doğruluyor.

---

## 5. Blender MCP bağlantısı — pratik engel

**Durum (2026-08-17):**

1. **Blender kurulu mu?** ✅ **Evet** — `brew install --cask blender` ile kuruldu, `/Applications/Blender.app` (5.2.0), `blender` komutu PATH'te, ana oturum tarafından doğrulandı.
2. **Hangi eklenti?** ✅ **`ahujasid/blender-mcp`** — sahip seçti (2026-08-17). Gerekçe: daha olgun, resmi `claude mcp add` desteği, Poly Haven/Hyper3D gibi hazır asset kütüphaneleri §2'nin basit-hacim dalını zenginleştiriyor. Alternatif (`jaskirat1616/grok-blender-mcp`, ekran görüntüsü/vision-feedback yeteneği) elenmedi ama tercih edilmedi — gerekçe: §3'ün skorlaması zaten Blender'ın kendi ekranında değil, GLB Three.js'e yüklendikten sonra Playwright ile oluyor, yani Blender-içi ekran görüntüsü bizim akışta kritik değil.
3. **Bağlantı nereye?** ✅ **Claude Code tarafı bağlandı.** Sahip "ikisine de" dedi; `claude mcp add` bu ortamda çalışmadı (bu masaüstü uygulaması standalone CLI değil, kendi gömülü `claude` ikilisini kullanıyor) — gerçek mekanizma `~/Library/Application Support/Claude/claude_desktop_config.json`'a `mcpServers.blender` girişi eklemekmiş (Claude Desktop'ın "Settings → Developer → Edit Config" akışının dosya karşılığı), ana oturum ekledi, sahip restart etti, `mcp__blender__*` araçları göründü. Eklenti dosyası da kopyalandı (`uvx blender-mcp install-addon` → `~/Library/Application Support/Blender/5.2/scripts/addons/blender_mcp.py`). **Kalan tek adım tamamen GUI, sahibin elinde:** Blender'da Preferences → Add-ons → "Interface: Blender MCP"yi kapat-aç (ya da Blender'ı yeniden başlat), sonra "Start MCP Server"a tıkla. Cursor tarafı hâlâ ayrı — Settings → MCP'den aynı `{"command":"uvx","args":["blender-mcp"]}` girişi sahip tarafından eklenmeli.

**Not:** §4'teki workbench bu adımlardan bağımsız — Blender MCP bağlantısı tamamlanmadan da bugün başlanabilir (bkz. §6 sıra 0, zaten başlatıldı — LOT-32).

---

## 6. Önerilen sıra

**[P]**

| Sıra | İş | Kim | Bağımlılık |
|---|---|---|---|
| 0 | §4 workbench'in ilk sürümü — §4.5'teki `vrm-viewer` deseni (framework yok, sekmeli panel), `workbench.html`. **Test matrisi (2026-08-17 düzeltmesi):** Model sekmesi `char_doryseus_02_textured_8000.glb` ile (klipsiz — bu durum da test edilmeli), Animasyon sekmesi `char_doryseus_02_rig_8000.glb` ile (`preset:idle`/`preset:walk`/`preset:run`, doğrulandı) | `ui-programmer` (LOT-32, Paca) | **yok — bugün başlanabilir**, hiçbir açık soruya bağlı değil |
| 1 | ~~§5'teki iki soruyu kapat~~ Blender kuruldu + eklenti seçildi (§5) — kalan: sahip `claude mcp add blender uvx blender-mcp` çalıştırır + Blender'ı bir kere açar (LOT-33, Paca) | sahip | yok |
| 2 | Blender MCP ile **tek bir basit prop** dene (§2 tablosundaki G1 mantığı — koruluk değil, tek kaya) — canlı döngü olmadan, tek atım, sadece bağlantı çalışıyor mu diye | `technical-director` ya da `gameplay-programmer` | 1 |
| 3 | §3.2 v0 skorlayıcıyı (ucuz, dE tabanlı) `scripts/pipeline/iterate/` altında, §7'nin "çıkarılmaya hazır" kuralına uyarak (palet/yol hardcode edilmez, parametre) kur; tek prop üzerinde tur sayısı/eşik değerini gözlemle | `technical-director` | 2 |
| 4 | `/loop` prompt desenini belgele (§3.3), 3'ün üstüne bir tur gerçekten koştur, sonucu bu dokümana ekle | ana oturum | 3 |
| 5 | Rig'siz Doryseus sorunu: Tripo `--animate` mi, Blender MCP custom clip mi — ikisi de mi — karar | `game-designer` + `technical-director` | 1 |
| 6 | Genel akışı `pipeline.md`'e bir bölüm olarak bağla (bu doküman kalıcı referans, `pipeline.md` ona işaret eder — CLAUDE.md § Design authority'nin "tek kaynak" ilkesi) | `art-director` | 3, 4 |

---

## 7. Çoklu-proje pozisyonlanması — ayrı repo mu, içeride mi

**[P]** Sahip kararı (2026-08-17, sohbette): bu pipeline **ileride farklı oyunlarda da** kullanılacak, evrensel bir asset üretim/test platformu hedefleniyor. Bu bölüm o hedefi bu doküma bağlıyor.

**Ayrım — iki farklı şey karıştırılmasın:**

| | Paylaşılabilir mi | Neden |
|---|---|---|
| **Pipeline** (Blender MCP orkestrasyonu, iterasyon/skor döngüsü, QA kontrol modülleri, workbench, prompt anatomisi) | **evet** | Süreç oyundan bağımsız — mockup→üret→skorla→kontrol et mantığı hangi oyunda çalıştığından etkilenmez |
| **Üretilmiş asset içeriği** (GLB, texture, spritesheet) | **hayır, çoğunlukla** | Her oyunun görsel dili farklı — `tintGltf(PALETTE.*)` ile Lotophagoi paletine boyanmış bir kaya, Canopy'nin (Unity URP, farklı estetik — `~/Desktop/game-project`) sahnesine uymaz. **"Assetleri depolamak/yönetmek kolaylaşır" beklentisi burada kısmen yanlış hedefte** — gerçek kazanç ortak bir asset deposu değil, ortak bir üretim hızıdır. Gerçekten paylaşılabilecek küçük bir alt küme: jenerik UI ikonu, ortak fx/particle, palet-öncesi çıplak mesh (tint'lenmemiş) — hero içerik (karakter, ada-özel prop) değil. |

**Sıralama — neden şimdi fiziksel ayırma yapılmıyor:**

1. Döngünün tek turu bile koşmadı — kanıtlanmamış bir sürece genel arayüz tasarlamak tahminle çalışır, genelde yanlış çıkar.
2. Bugün `asset-testing-platform.md`'nin C4/C5/C6'sı `art-bible.md`/`ux/screens.md` eşiklerini **doğrudan okuyor** — Lotophagoi'ye gömülü. Ayırmak için önce bunun config-edilebilir hale gelmesi gerekiyor.
3. İkinci gerçek tüketici (Canopy ya da başka bir oyun) henüz bu pipeline'ı istemiyor — arayüzün doğru şeklini ancak ikinci somut kullanım gösterir.

**Bunun yerine şimdiden yapılacak — "çıkarılmaya hazır" yazmak:**

- `scripts/pipeline/iterate/` içindeki yeni kod, Lotophagoi'ye özgü değerleri (palet hex'leri, dosya yolları, isimlendirme kuralı) **parametre olarak alsın**, dosya içine hardcode etmesin — çağıran taraf (bugün: `pipeline.md §5.1`'in okuduğu `art-bible.md`) bu değerleri geçirir.
- Blender MCP komut dizileri ve skor mantığı, hangi oyunun `public/assets/`'ine yazdığından habersiz kalsın — çıktı yolu da parametre.
- §4 workbench zaten baştan jenerik yazılabilir (§4.4) — bu ilkeyi en çok kanıtlayacak parça o.

**Fiziksel ayırma tetikleyicisi (ikisi birden gerekli):**

1. Döngü Lotophagoi'de en az bir gerçek asset üzerinde kanıtlandı (skorlayıp durdu, sahip onayladı) **ve**
2. Canopy ya da başka bir proje bu pipeline'ı **şimdi gerçekten** istiyor — hipotetik değil, aktif ihtiyaç

O noktada taşınacak olan `scripts/pipeline/` + `scripts/asset-qa/`'nın motor-bağımsız çekirdeği (manifest/naming/budget/palette mantığı, workbench) — ekran görüntüsü alma adımı (Playwright+Vite ↔ Unity CLI) her oyunda ayrı bir adaptör olarak kalır, o kısım hiçbir zaman tam paylaşılmaz.

---

## 8. Açık sorular (karar bekliyor)

1. **v0 mü v1 mi skorlayıcı?** Ucuz-kaba (dE) mi, pahalı-doğru (model çağrısı, her turda) mı — yoksa ikisi kademeli mi (önce dE ile kaba ele, sonra ince tur model çağrısı)? → sahip + `technical-director`
2. **Kaç tur/eşik makul?** Video "2-5 dk" diyor ama tur sayısı vermiyor; bizim maliyet yapımız (Tripo API kredisi, Blender MCP'nin kendi hızı) farklı olabilir. → ilk denemeden sonra ölçülecek, tahmin edilmeyecek
3. **`iterate/` çıktısı hiç `public/assets/`'e sızmasın diye nasıl garanti edilir?** `asset-qa/`'nın "hiçbir dosyaya yazmaz" garantisine benzer bir sözleşme gerekiyor — kod yazılırken netleşecek. → `technical-director`
4. **Bu doküman `pipeline.md`'e mi gömülür, ayrı mı kalır?** Şu an ayrı çünkü henüz kanıtlanmamış bir plan; `pipeline.md §1`'in "tasarım otoritesi" ilkesi gereği kanıtlanınca oraya taşınabilir ya da oradan referans verilebilir. → `art-director`, adım 3-4 sonrası
5. **Workbench'in (§4) UI'ı ne kadar cilalı olmalı?** Dev-only bir araç için çıplak HTML dropdown'lar yeterli mi, yoksa gerçekten "tek tık" hissi veren bir arayüz mü? → `ui-programmer`, ilk sürümden sonra
