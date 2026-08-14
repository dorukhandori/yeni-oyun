# WebGPU geçiş fizibilitesi — Lotophagoi

> **Durum:** araştırma + öneri. **Karar verilmedi, kod yazılmadı.**
> **Tarih:** 2026-08-14
> **Yazan:** `technical-director` · **Karar veren:** sahip
> **Kapsam:** `WebGPURenderer`'a geçiş, Poseidon (FFT okyanus) ve Gaia/Dryad/EZ-Tree kütüphanelerinin bu projeye maliyeti.
> **Not:** bu doküman oynanış kararı vermez. Görsel hedefi `docs/art/art-bible.md`, mekaniği `docs/design/` belirler; burada sadece **teknik maliyet ve risk** var.

---

## 0. Tek paragraf özet

WebGL2 fallback iddiası **doğru** — ama kurtardığı şey oyunun *çalışması*, geçişi yapmak istediğimiz *özellik* değil. Poseidon compute shader'la çalışıyor; WebGL2 fallback backend'inde compute yok, dolayısıyla fallback'e düşen kullanıcıda **okyanus çalışmaz**. Ayrıca `WebGPURenderer` `ShaderMaterial`/`ShaderPass`/`EffectComposer` desteklemiyor: gökyüzü shader'ımız ve **`hazePass` — oyunun kalbi olan unutuş post-process'i — TSL ile sıfırdan yazılmak zorunda.** Buna karşılık r160 → r185 sürüm sıçraması bizim kodumuzda **tek bir tip hatası bile üretmiyor** (ölçüldü, §2.3). Yani "sürümü yükseltmek" ucuz, "renderer'ı değiştirmek" pahalı — ikisi aynı iş değil ve **ayrılabilir.**

---

## 1. İddianın doğrulanması: WebGPURenderer gerçekten WebGL2'ye düşüyor mu?

### 1.1 Evet, doğru

- `three/webgpu` ve `three/tsl` giriş noktaları **r167'den beri** standart pakette; ek kurulum yok. Kurulu `three@0.185.1` paketinin `exports` alanı bunu doğruluyor: `"./webgpu": "./build/three.webgpu.js"`, `"./tsl": "./build/three.tsl.js"`.
- Resmî manual: renderer varsayılan olarak WebGPU backend'i dener, tarayıcı desteklemiyorsa **otomatik olarak WebGL2 backend'ine düşer** ve konsola `THREE.WebGPURenderer: WebGPU is not available, running under WebGL2 backend.` yazar.
- Manuel zorlama da var: `new THREE.WebGPURenderer({ forceWebGL: true })` — test için WebGL2 yolunu zorlar.
- Yani "TSL yaz, three hangi backend'de koşacağına kendi karar versin" modeli **gerçek.**

### 1.2 Ama üç yıldız var — ve üçü de bizi tam ortadan vuruyor

**(a) Compute shader fallback'te çalışmaz.**
WebGL2'de compute shader yok. WebGPU backend'inde yazdığın compute işi, fallback'e düşen kullanıcıda **sessizce hiç çalışmaz** (hata da vermez). Poseidon'un kaynağını okudum — `src/ocean/fft.js`, `spectrum.js`, `Ocean.js` dosyalarının hepsi `three/tsl`'den `Fn()` + `compute()` kullanıyor (fft.js'te 7 ayrı `compute()` çağrısı). Poseidon **compute-FFT** bir sistem. Sonuç: **fallback okyanusu kurtarmıyor.** Fallback'te ayrı bir su implementasyonu tutmak zorundayız.

**(b) `ShaderMaterial` / `RawShaderMaterial` / `onBeforeCompile` `WebGPURenderer`'da desteklenmiyor.**
Bu backend'den bağımsız — WebGL2 backend'inde bile desteklenmiyor, çünkü materyal sistemi tümden node tabanlı. Resmî manual'in ifadesi: *"This part of your application must be ported to node materials and TSL."* Bizde bu kalemler:
- `src/render/stage.ts:48` — gökyüzü gradyanı (`ShaderMaterial`, ~20 satır GLSL)
- `src/render/hazePass.ts` — `ShaderPass` (yani içi `ShaderMaterial`), 81 satır, 12 örnekli radyal blur + desatürasyon + vinyet. **Bu dosya oyunun kalbi.**

**(c) `EffectComposer` `WebGPURenderer` ile çalışmıyor.**
Node tabanlı `PostProcessing` sınıfı kullanılıyor (r183'te `RenderPipeline` olarak yeniden adlandırıldı; r185 build'inde iki isim de var — doğruladım). `RenderPass` → `pass(scene, camera)`, `UnrealBloomPass` → `bloom()` node'u (`three/addons/tsl/display/BloomNode.js`, r185'te mevcut — doğruladım), `ShaderPass` → elle yazılmış TSL node'u.

### 1.3 Ve WebGPU otomatik olarak daha hızlı değil

Bu beklentiyi baştan düzeltmek lazım: three.js issue tracker'ında ve forumda tekrarlayan bir şikâyet var — **instance'lanmamış çok sayıda mesh içeren sahnelerde `WebGPURenderer`, `WebGLRenderer`'dan yavaş** (bildirilen aralık 2x–4x yavaş; UBO sisteminin render-item sayısıyla ölçeklenmemesi bilinen bir sorun). Bizim sahnemiz zaten "merge edilmiş geometri + az sayıda mesh" disiplininde olduğu için muhtemelen bu tuzağa düşmeyiz, ama **"WebGPU = daha hızlı" varsayımıyla yola çıkmak yanlış.** Kazanç görsel kalitede (compute ile mümkün olan efektler), otomatik FPS'te değil.

---

## 2. Bize özel maliyet

### 2.1 Bugünkü durum (ölçüldü)

| Ölçü | Değer |
|---|---|
| `npm run build` çıktısı | `570.7 kB` ham / **`150.35 kB` gzip** JS + 10.6 kB CSS |
| Kaynak büyüklüğü | 4.229 satır TS, 26 dosya |
| `MeshStandardMaterial` kullanımı | 43 |
| `SpriteMaterial` | 12 |
| `MeshBasicMaterial` | 6 · `PointsMaterial` 1 |
| `ShaderMaterial` | **1** (gökyüzü) |
| `onBeforeCompile` | **0** |
| `three` | `0.160.1` (npm'deki güncel: `0.185.1`) |

**İyi haber:** `onBeforeCompile` hiç kullanmamışız ve tek bir `ShaderMaterial` var. Standart materyaller (`MeshStandard`, `MeshBasic`, `Sprite`, `Points`) `three/webgpu` altında **otomatik olarak node materyal karşılıklarına eşleniyor** — 62 materyalin 61'i migration'da elle dokunulmadan çalışır. Bu, bu kod tabanının en büyük şansı. Bir yıl önce Gaia/Dryad tarzı `onBeforeCompile` enjeksiyonları yapmış olsaydık tablo çok farklı olurdu (bkz. §5 — tam da bu yüzden o kütüphaneler bir tuzak).

### 2.2 Elden geçmesi gereken dosyalar

| Dosya | İş | Zorluk | Not |
|---|---|---|---|
| `src/render/stage.ts` | `WebGLRenderer` → `WebGPURenderer`, `await renderer.init()`, `EffectComposer` → `RenderPipeline` node grafiği | **Orta** | `createStage` **async** olmak zorunda → `startGame` async → `main.ts` zaten `void startGame()` çağırıyor, orası sorunsuz |
| `src/render/stage.ts` gökyüzü | 20 satır GLSL → TSL | Düşük | Basit gradyan, birebir çevrilir |
| `src/render/hazePass.ts` | 81 satır GLSL → TSL node | **Yüksek — asıl risk** | 12 örnekli radyal blur, luma desatürasyon, nefes alan puls, vinyet. Görsel eşdeğerliği **göz kararı** doğrulanmak zorunda; bu efekt oyunun anlatısı |
| Bloom | `UnrealBloomPass` → `bloom()` node | Düşük-orta | Parametreler birebir eşleşmiyor, `RENDER.bloomStrength/radius/threshold` **yeniden tune** edilecek |
| `OutputPass` + `outputColorSpace` | pipeline'ın çıkış node'una taşınır | Düşük | Bugün haze'i **kasten `OutputPass`'tan sonra** çalıştırıyoruz (display space). Node grafiğinde bu sırayı korumak elle kurulacak |
| `src/game.ts:640` `stage.render()` | node pipeline `render()` | Düşük | Sabit 60 Hz `step()` döngüsü **etkilenmez** — WebGPU'nun async'liği sadece init'te |
| `src/world/*.ts` (12 dosya) | — | **Yok** | Standart materyaller otomatik eşlenir; `mergeGeometries` node tarafında da geçerli |
| `src/world/sea.ts` | Poseidon'a geçilirse yerini bırakır, **ama silinmez** — fallback su olarak kalır | — | §4'e bakınız |
| Gölge / tonemap / fog | Davranış farkı riski | Orta | `PCFSoftShadowMap`, `ACESFilmicToneMapping`, `FogExp2` node tarafında var ama **birebir aynı görüntüyü vermeyebilir**; `RENDER.*` sabitleri yeniden tune edilebilir |

### 2.3 Sürüm sıçraması r160 → r185: ölçüldü, sanılandan ucuz

"r170+ gerekir" bilgisi **eksik**: `three/webgpu` r167'de geldi, ama bugün doğru hedef **en güncel sürüm (`0.185.1`)** — WebGPU tarafı hâlâ hızlı değişiyor, arada kalmanın anlamı yok.

Tahmin yürütmek yerine ölçtüm: kaynak ağacımızın birebir kopyasını `three@0.185.1` + `@types/three@0.185.4` ile tip kontrolünden geçirdim.

**Sonuç: three kaynaklı sıfır hata.** (Tek çıkan hata `import.meta.env` içindi — o da test kopyasına `vite/client` tiplerini koymadığım için, three ile ilgisi yok.)

Bizi ilgilendirebilecek bilinen kırıcı değişiklikler de bizde yok:
- `useLegacyLights` r165'te kaldırıldı → biz hiç kullanmıyoruz (0 eşleşme)
- `colorSpace` API'si r152'de yerleşti, r160'ta zaten yeni API'yi kullanıyoruz (`tex.colorSpace = THREE.SRGBColorSpace`, `renderer.outputColorSpace`)
- `EffectComposer`/`UnrealBloomPass`/`OutputPass`/`ShaderPass`/`BufferGeometryUtils` r185 addons'ta **hâlâ mevcut** (doğrulandı)

**Bunun anlamı büyük:** `three`'yi 0.185'e yükseltmek, `WebGPURenderer`'a geçmekten **tamamen bağımsız ve neredeyse bedava** bir iş. WebGL yolunda kalıp da güncel sürüme çıkabiliriz. Tip kontrolü temiz olsa da çalışma zamanı görüntüsü (gölge/tonemap nüansları) göz kontrolü ister — 25 sürümlük fark yine de bir yarım oturumluk göz denetimi demektir.

### 2.4 Bundle bütçesi (Faz 7.1'i doğrudan etkiler)

`three` r185 resmi build'leri, gzip:

| Build | Ham | Gzip |
|---|---|---|
| `three.module.min.js` (WebGL) | 366 kB | **87 kB** |
| `three.webgpu.min.js` | 668 kB | **185 kB** |
| `three.tsl.js` | 34 kB | 7 kB |

Node materyal sistemi tree-shake'e WebGL yoluna göre daha dirençli. Bugünkü **150 kB gzip** toplam bundle'ımızın, geçiş sonrası **~250–290 kB gzip** bandına çıkmasını beklemek gerçekçi. Faz 7.1'in "build boyutu" maddesi için bu **~1.8x** demek. Bir web prototipi için hâlâ kabul edilebilir, ama bedava değil ve **roadmap Faz 7.1'e bu satır yazılmalı.**

### 2.5 `hazePass` çakışması — açıkça yazıyorum

Roadmap satır 193 zaten şunu söylüyor: `hazePass` bugün tek bir `amount` uniform'uyla çalışıyor ve tasarım tarafı bunu **dört ayrı eğriye** ayırmak istiyor; bu shader'ı yeniden yazmayı gerektirebilir.

Yani `hazePass`'in önünde **iki ayrı yeniden yazma** duruyor: biri tasarım kaynaklı (4 eğri), biri teknoloji kaynaklı (TSL). **Aynı dosyayı iki kez yeniden yazmak istemeyiz.** Bu iki işin sırası bir karar noktası:
- Tasarım kilitlenmeden TSL'e çevirirsek → efekti iki kez yazarız.
- Önce 4 eğriyi GLSL'de bitirip sonra TSL'e çevirirsek → tek çeviri, ama çeviri hedefi daha karmaşık olur.

Teknik tercihim ikincisi: **önce tasarımı kilitle, sonra bir kere çevir.** Ama bu `game-designer`'ın takvimine bağlı bir bağımlılık, benim kararım değil.

---

## 3. Gerçek tarayıcı kapsamı (2026 ortası)

| Platform | WebGPU | Not |
|---|---|---|
| Chrome / Edge (masaüstü) | ✅ | v113'ten (Nisan 2023) beri varsayılan açık |
| Chrome (Android) | ✅ | v121'den beri, **Android 12+** şartıyla |
| Safari (macOS / iOS / iPadOS) | ✅ | **Safari 26** (2025 ortası) ile varsayılan açık — macOS Tahoe 26, iOS 26 |
| Firefox (Windows) | ✅ | v141'den beri |
| Firefox (macOS) | ✅ | v145'ten beri, **yalnız Apple Silicon** |
| Firefox (Android) | ❌ | 2026 sonu hedefleniyor |
| Linux (Chrome) | 🟡 | kademeli açılıyor (v144 beta: Intel Gen12+) |
| Eski iOS / eski Android | ❌ | WebGL2 fallback'e düşer |

caniuse'a göre küresel WebGPU kapsamı **~%82**.

**Doğru okuma iki katmanlı:**
- **Oyunun çalışması:** `WebGPURenderer` + fallback ile kapsam bugünkü WebGL2 kapsamına **eşit kalır**. Kimseyi kaybetmeyiz. İddia bu noktada tamamen doğru.
- **Poseidon okyanusunun görünmesi:** yalnız o **~%82**. Kalan ~%18 (eski iPhone'lar, Firefox Android, Linux'un bir kısmı, eski Android) **suyu göremez** — onlara mevcut `sea.ts` gösterilmek zorunda. Yani **iki su sistemini kalıcı olarak bakmak** demek, tek kişilik bir projede.

---

## 4. Üç yol

### Yol A — Tam migration, tek seferde
`three@0.185` + `WebGPURenderer`, `hazePass` + gökyüzü TSL'e, `RenderPipeline` post-process, ardından Poseidon.

- **Kapsam:** 3–5 oturum (renderer 1, hazePass TSL + görsel eşleme 1–2, Poseidon entegrasyonu + tune 1–2)
- **Risk:** yüksek. Ortada oyunun kalbi olan efekt **yeniden yazılmış ama doğrulanmamış** halde durur. `hazePass` tasarımı henüz kilitli değil (§2.5) → iki kez yazma riski. Süreç boyunca "her dilimden sonra oynanabilir build" kuralı kırılır.
- **Geri dönüş:** git branch'i ile kolay, ama yarım bırakılırsa hiçbir kazanç kalmaz.

### Yol B — Kademeli: önce sürüm, sonra spike, sonra su
1. `three` 0.185'e çık, **WebGL'de kal** (§2.3: tip kontrolü temiz, yarım oturum + göz denetimi). Kazanç: bugün alınabilir, Poseidon dahil her şeyin sürüm önkoşulu kapanır, geri dönüşü kolay.
2. **Zaman-kutulu spike (1 oturum, ayrı branch, main'e merge yok):** `WebGPURenderer` + gökyüzü ve `hazePass`'in TSL karşılığı. Tek sorusu var: *unutuş efekti aynı hissi veriyor mu, FPS ne?* Sahip'in kendi makinesinde bakılır.
3. **Kapı:** spike geçerse devam, geçmezse branch silinir — kaybedilen 1 oturum.
4. Poseidon **izole modül** olarak: `sea.ts` fallback su olarak yerinde kalır, `?ocean=poseidon` gibi bir anahtarla denenir, `RENDER`/`PALETTE` sabitleriyle sanat yönüne uydurulur.

- **Kapsam:** 1. adım yarım oturum, spike 1 oturum, geri kalanı ancak kapı geçerse
- **Risk:** düşük. Her adımın kendi geri dönüşü var; oyun hiçbir noktada oynanamaz hale gelmiyor.
- **Maliyet:** iki su sistemi kalıcı bakım yükü (§3).

### Yol C — WebGL'de kal, WebGPU'yu Faz 7 sonrasına ertele
Sürümü yükselt, oyunu bitir, WebGPU'yu "prototip oynanır hale geldikten sonra" görsel bir yükseltme paketi olarak ele al.

- **Kapsam:** yarım oturum (sadece sürüm)
- **Risk:** en düşük. **Bedeli:** Poseidon/Water Pro sınıfı su bu prototipte yok; su bugünkü `sea.ts` seviyesinde kalır.

---

## 5. Ayrı ve acil konu: EZ-Tree / Gaia / Dryad "hızlı kazanç" mı?

Görev bu üçünü "migration'dan bağımsız hemen alınabilecek kazanç" olarak öneriyordu. **Kaynaklarını okudum — üçü tek bir kategori değil, tam tersine birbirinden çok farklı üç risk profili.**

### 5.1 Doğrulanmış gerçekler

| | Poseidon | Gaia | Dryad | EZ-Tree |
|---|---|---|---|---|
| ⭐ | 163 | 22 | 19 | **1.558** |
| `three` sürümü | `0.184.0` sabit | **`0.160.0`** | **`0.160.0`** | peer `>=0.167` |
| Paket mi? | hayır (`private: true`) | hayır | hayır | **evet, npm** |
| Lisans | MIT (repo'da) | LICENSE var | LICENSE var | **MIT (tanınmış)** |
| Son commit | 2026-08-14 | 2026-08-14 | 2026-08-14 | 2026-07-16 |
| Kaynak boyutu | ~40 kB JS | ~300 kB JS | **~700 kB JS** | — |
| Shader yaklaşımı | TSL + `compute()` | **`onBeforeCompile` ×9** | **`onBeforeCompile` ×8 + `ShaderMaterial`** | (mesh üretir) |

### 5.2 Gaia ve Dryad: göründüğünden pahalı, ve WebGPU'yu kilitler

- **Sürüm uyumu mükemmel:** ikisi de `three@0.160.0` pinliyor — **bizimle tam olarak aynı revizyon.** Vite 5 kullanıyorlar, biz de. Bu taraf gerçekten sürtünmesiz.
- **Ama üç ciddi sorun var:**
  1. **`onBeforeCompile`.** Gaia'nın `bladeMesh.js`'inde 9, Dryad'ın `barkMaterial.js`'inde 8 kullanım. §1.2(b) gereği bu **`WebGPURenderer`'da hiç çalışmaz.** Yani bu iki kütüphaneyi bugün alırsak, **WebGPU migration'ının maliyetini kendi elimizle büyütmüş oluruz** — sonradan çim ve ağaç shader'larını da TSL'e çevirmek zorunda kalırız. Sahip WebGPU'yu ciddiye almaya karar verdiği için bu **doğrudan bir çelişki**, açıkça yazıyorum.
  2. **Paket değil, demo uygulaması.** İkisi de `private: true`, editör/genome UI'ıyla iç içe. "Kaynak kopyalama" pratikte 100–350 kB **tipsiz JS**'i repo'ya almak demek — bizim `strict: true` TS kurulumumuza `allowJs` veya elle `.d.ts` yazmak gerekir, ve upstream düzeltmeleri elle takip edilir. Tek kişilik bakım için ağır.
  3. **Sanat yönü çakışması.** Bunlar fotogerçekçiye yakın, kendi palet/rüzgâr sistemine sahip sistemler. `art-bible.md`'nin dilini karşılıyor mu — bu benim değil `art-director`'ın kararı, ama entegrasyondan **önce** sorulmalı.

**Teknik görüşüm: Gaia ve Dryad bugün alınmamalı.** "Hızlı kazanç" gibi görünüyorlar, değiller.

### 5.3 EZ-Tree: alınabilir, ama npm paketi olarak değil

Paketi indirip içine baktım:

- `three` **doğru şekilde dışarıda bırakılmış** (`from "three"`), çift three riski yok. ✅
- **Ama:** `ez-tree.es.js` **4.0 MB ham / 3.0 MB gzip.** Sebebi: 20 adet kabuk/yaprak dokusu (`birch_normal_1k.jpg`, `oak_color_1k.png` …) **base64 data-URI olarak dosyanın içine gömülmüş.** Bugünkü tüm bundle'ımız 150 kB gzip. Bu paketi import etmek bundle'ı **~20 katına** çıkarır. Faz 7.1 bütçesi açısından bu tek başına diskalifiye edici.

**Bunun yerine önerdiğim yol — ve bence bu dokümandaki en iyi haber:**
`eztree.dev` üzerinde ağacı **editörde tasarla, GLB olarak dışa aktar**, `public/assets/models/` altına koy, oyunda `GLTFLoader` ile yükle. Böylece:
- Runtime bağımlılığı **sıfır**, bundle etkisi sadece gerçekten kullandığımız ağacın GLB'si (yüz kB'ler mertebesi, üstelik Draco/meshopt ile sıkıştırılabilir)
- Varlık **`asset-registry.md` + `public/assets/assets.csv` disiplinine girer** — `pipeline.md` §7 zaten bunu şart koşuyor
- **Ve en önemlisi: bir GLB renderer-agnostiktir.** WebGL'de de WebGPU'da da aynı şekilde yüklenir. Migration kararı ne olursa olsun bu iş boşa gitmez.

Genel ilke, tek cümlede: **varlık olarak alınan sanat migration'dan sağ çıkar, shader-kütüphanesi olarak alınan sanat çıkmaz.**

### 5.4 Three.js Water Pro

Fiyat/lisans belirsiz + TSL/WebGPU-only → Poseidon'la aynı teknik kısıtlar, üstüne bir de ticari belirsizlik. Poseidon zaten MIT ve okunabilir kaynak. **Değerlendirmeye almayı önermiyorum**, en azından WebGPU kapısı (§4 Yol B adım 3) geçilene kadar.

---

## 6. Önerim

**Yol B + EZ-Tree'nin GLB yolu.** Somut sırayla:

1. **Şimdi, migration'dan bağımsız:** `three` `0.160.1` → `0.185.1`, `@types/three` `0.185.4`. WebGL'de kal. Tip kontrolü temiz olduğu ölçüldü; kalan iş bir göz denetimi (gölge/tonemap/bloom nüansı). *Yarım oturum, geri dönüşü tek commit.*
2. **Şimdi, ayrı ve düşük riskli:** EZ-Tree'yi **editör + GLB export** olarak kullan (npm paketi **değil**). Önce `art-director` `art-bible.md` uyumuna baksın. *`art-director` + `gameplay-programmer` işi, bu dokümanın konusu değil.*
3. **Gaia ve Dryad'ı şimdilik alma.** WebGPU kararı netleşene kadar bekletilmeli — `onBeforeCompile` bağımlılıkları WebGPU kapısını daraltıyor.
4. **Zaman-kutulu WebGPU spike'ı (1 oturum, ayrı branch):** `WebGPURenderer` + gökyüzü ve `hazePass`'in TSL karşılığı. **Tek soru:** unutuş efekti aynı hissi veriyor mu, FPS ne? Sahip kendi makinesinde bakar, kapı orada açılır ya da kapanır.
5. **Poseidon ancak 4. adım geçerse**, izole modül + `sea.ts` fallback olarak yerinde kalarak.

**Ama `hazePass` tasarımı (roadmap 3.x, dört eğri) hâlâ açıkken 4. adıma girmeyi önermiyorum** — aynı shader'ı iki kez yazarız. Sıralama: önce tasarım kilidi, sonra tek bir TSL çevirisi.

**Bu senin kararın.** Ben "geçilemez" demiyorum — teknik olarak bu kod tabanı, WebGPU'ya geçmesi beklenenden **kolay** bir kod tabanı (`onBeforeCompile` sıfır, tek `ShaderMaterial`, sürüm sıçraması bedava). Söylediğim şey **sıra** ile ilgili: oyun Faz 1'de tıkalıyken ve unutuş efektinin tasarımı kapanmamışken renderer'ı değiştirmek, henüz bitmemiş bir şeyi taşımak olur.

---

## 7. Sahip'e sorulacak kritik soru

> **Poseidon'un okyanusu, Lotophagoi'nin görsel kimliği için "olmazsa olmaz" mı, yoksa "olsa çok iyi olur" mu?**

Çünkü cevabı doğrudan yolu belirliyor:
- **"Olmazsa olmaz"** ise → Yol B'nin tamamı, ~%18 kullanıcıda okyanusun görünmeyeceğini ve iki su sisteminin kalıcı bakımını **baştan kabul ederek**.
- **"Olsa iyi olur"** ise → sadece adım 1 + 2 (sürüm yükseltme + EZ-Tree GLB), WebGPU Faz 7 sonrasına.

İkincil ama gerekli: **demoyu hangi makinede/tarayıcıda göstereceksin?** Sunum Safari 26'lı bir Mac ya da güncel Chrome ise WebGPU zaten oradadır ve fallback tartışması pratikte akademik kalır — bu, kararı hatırı sayılır ölçüde kolaylaştırır.

---

## 8. Kaynaklar

- [Three.js manual — WebGPURenderer](https://threejs.org/manual/en/webgpurenderer.html) (otomatik fallback, `forceWebGL`, `ShaderMaterial`/`onBeforeCompile` desteklenmiyor)
- [three.js docs — WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)
- [three.js docs — PostProcessing](https://threejs.org/docs/pages/PostProcessing.html) (r183'te `RenderPipeline` adına geçiş)
- [Release r167 — `three/webgpu` + `three/tsl` giriş noktaları](https://github.com/mrdoob/three.js/releases/tag/r167)
- [Release r180](https://github.com/mrdoob/three.js/releases/tag/r180) · [Releases](https://github.com/mrdoob/three.js/releases)
- [Issue #30024 — fallback backend raporlaması](https://github.com/mrdoob/three.js/issues/30024)
- [Issue #31055 — WebGPURenderer performansı WebGL'den yavaş](https://github.com/mrdoob/three.js/issues/31055) · [Issue #30560 — UBO sistemi ve çok sayıda render item](https://github.com/mrdoob/three.js/issues/30560)
- [Issue #26719 — WebGPURenderer'da custom shader desteği](https://github.com/mrdoob/three.js/issues/26719)
- [Three.js Shading Language (TSL) wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
- [WebGPU + Three.js Migration Guide (2026)](https://www.utsubo.com/blog/webgpu-threejs-migration-guide) (compute'un fallback'te çalışmaması)
- [web.dev — WebGPU is now supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers) · [WebGPU Browser Support in 2026](https://webo360solutions.com/blog/webgpu-browser-support/)
- [owenyuwono/poseidon](https://github.com/owenyuwono/poseidon) · [owenyuwono/gaia](https://github.com/owenyuwono/gaia) · [owenyuwono/dryad](https://github.com/owenyuwono/dryad) · [dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree) · [@dgreenheck/ez-tree npm](https://www.npmjs.com/package/@dgreenheck/ez-tree)

**Yerinde ölçülen veriler** (npm registry + paket içeriği + `tsc` çalıştırması, 2026-08-14): `three@0.185.1` exports/build boyutları, `@dgreenheck/ez-tree@1.1.0` içeriği ve gzip boyutu, Gaia/Dryad/Poseidon `package.json` + kaynak grep'leri, mevcut repo'nun r185 altındaki tip kontrolü.
