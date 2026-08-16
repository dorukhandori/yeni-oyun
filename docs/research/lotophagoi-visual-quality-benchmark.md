# Lotophagoi görsel kalite kıyaslaması — "prototipten gerçek oyuna"

> **Amaç:** araştırma dizisinin (`docs/research/`, `origin/cursor/vibegamedev-reference-archive-afce` dalı) nihai hedefi — Lotophagoi'nin göründüğü hâlin bir prototipten çıkıp gerçek/profesyonel bir oyun izlenimi vermesi. Bu dosya o hedefe **özellikle görsel kalite** ekseninden bir katkıdır. Önceki dosya (`lotophagoi-problems-repo-solutions.md`) süreç/QA/test/manifest tarafını kapsamıştı; bu dosya **lighting/post-processing, malzeme/texture, VFX/juice, kamera, UI cilası, çevre yoğunluğu** eksenine odaklanır.
> **Tarih:** 2026-08-16 · **Yazan:** `art-director` alt-ajanı.
> **Durum:** taslak — sahip onayı bekliyor. Higgsfield MCP hâlâ bağlı değil; bu dosyadaki hiçbir öneri onu gerektirmiyor.

## 0. Bir dürüstlük notu — bu turun sınırı

Bu görevi yürüten oturumun **Bash aracı yoktu** (yalnızca dosya okuma/yazma + web arama). `origin/cursor/vibegamedev-reference-archive-afce` dalındaki önceki araştırma dosyalarını (`vibegamedev-reference-index.md`, `high-star-pipeline-scan.md`, `metatransformer-game-stack-scan.md`, `lotophagoi-problems-repo-solutions.md`, `turkish-game-dev-ecosystem.md`, `docs/production/agent-prompt-archive-integration.md`) `git show` ile **okuyamadım** — commit (`3cd32d6d0d147a40f6d30999072d992c7ddf9ce0`) yerel `.git/objects/`'te loose object olarak duruyor ama zlib-deflate edilmiş, Bash olmadan çözülemiyor. Görev talimatının kendisi o dosyaların format ve üslubunu (S-numaralı sorun envanteri, "Repo çözer mi?" sütunu, öncelik/efor tablosu, dürüst etki tahmini, red listesi) yeterince ayrıntılı tarif ettiği için o iskeleti izledim, ama **S-numaralandırmasıyla çakışmayı önlemek için bu dosyada ayrı bir önek (`V-` = visual) kullandım.** Ana oturum (Bash erişimi olan taraf) bu dosyayı birleştirirken S-listesiyle çapraz kontrol etmeli; içerik çakışması varsa (örn. aynı sorunun iki farklı ID altında durması) birleştirilmeli.

Bunun dışında bu dosyanın tamamı **doğrudan kod/doküman kanıtına** dayanıyor: `src/render/`, `src/world/`, `src/systems/`, `src/ui/hud.css`, `index.html`, `docs/art/art-bible.md`, `docs/art/pipeline.md`, `docs/art/asset-registry.md`, `docs/production/roadmap.md`.

**Bağlayıcı kısıtlar (CLAUDE.md, `docs/art/pipeline.md`) — bu araştırma bunları relitigate etmiyor:**

- Unity/Godot/Unreal yok — Three.js r185 from-scratch.
- Oyun içi görselin varsayılan yolu **kod**; procedural mesh + billboard sprite sanat yönü sahip kararı — tam 3D model/fotogrametri pipeline'ı önermiyorum.
- Merge edilmiş geometri (`BufferGeometryUtils.mergeGeometries`), tamed point-light decay — mevcut disiplin korunuyor, üstüne inşa ediliyor.
- Unutuş efekti (`hazePass.ts`) her zaman ayrı bir runtime katman — bu dosyadaki hiçbir öneri o katmanla karışmıyor (bkz. §8 red listesi).
- Higgsfield MCP bağlı değil — hiçbir öneri onu gerektirmiyor; hepsi ya `three`'nin kendi `examples/jsm/` paketinde zaten duran modüller ya da küçük özel shader/kod.
- Ben shader/render kodu **yazmıyorum** — bulguları `gameplay-programmer`/`technical-director`'a devrediyorum.

---

## 1. Soru: "gerçek oyun gibi görünmek" somut olarak ne demek

Altı eksene ayırdım — her biri ölçülebilir bir kod/asset durumuna bağlanabiliyor:

| Eksen | Soru |
|---|---|
| **Işıklandırma** | Sahne tek yönlü ışık + ambient mi okunuyor, yoksa bir stüdyo/film seti gibi katmanlı mı? |
| **Post-processing** | Bloom dışında bir "look" var mı — renk derecelendirme, derinlik, kenar işleme? |
| **Malzeme/texture** | Yüzeyler her açıdan aynı düz mü okunuyor, yoksa mikro-varyasyon var mı? |
| **VFX/juice** | Aksiyonların (topla/teslim/yürü) her biri bir tepki üretiyor mu, yoksa sessiz mi geçiyor? |
| **Kamera işi** | Kamera durağan bir gözlem noktası mı, yoksa sahneyle birlikte "nefes alıyor" mu (derinlik, kick, FOV)? |
| **UI/HUD cilası** | Arayüz özel tasarlanmış mı okunuyor, yoksa varsayılan tarayıcı/OS fontuyla mı? |
| **Çevre detay yoğunluğu** | Sahne dolu ve yaşayan mı okunuyor, yoksa geniş boş düzlemler mi? |

---

## 2. Somut boşluk analizi (V1–V11) — mevcut koddan kanıt

| ID | Eksen | Şu an ne var (kanıt) | Boşluk | Hedef davranış |
|---|---|---|---|---|
| **V1** | Işıklandırma | `src/render/stage.ts` — `AmbientLight` + `HemisphereLight` + tek `DirectionalLight` (satır 103–126); AO yok, `scene.environment`/IBL yok, gerçek-zamanlı yansıma probu yok | Yüzeyler düz aydınlanıyor; kovuk/oyuk (kayalık çatlağı, sazlık dibi) ışık tıkanması hiç okunmuyor; su hiç gökyüzü yansıması almıyor | Ucuz bir AO katmanı + en azından statik bir gökyüzü yansıma katkısı su üstünde |
| **V2** | Post-processing | `stage.ts` satır 133–146: `EffectComposer` zinciri yalnızca `RenderPass → UnrealBloomPass → OutputPass → HazePass`. Renk derecelendirme `hazePass.ts` satır 97'de tek satır sabit çarpım (`col *= vec3(1.03, 1.005, 0.965)`) — ayarlanabilir değil, unutuş shader'ının içine gömülü | LUT/renk derecelendirme yok, kenar AA'sı yalnız canvas MSAA'ya (`antialias:true`) bağlı, ayrı bir "look" katmanı yok | Ayrı, ayarlanabilir bir renk derecelendirme katmanı (unutuştan bağımsız uniform) |
| **V3** | Kamera | `src/render/cameraRig.ts` — sabit FOV (`CAMERA.fov`, hiç değişmiyor), DOF hiç yok, `BokehPass` içe aktarılmamış. Kick (satır 68–76) zaten var — **bu pozitif** | Ön plandaki lotus ile arka plandaki tepe her zaman eşit keskin — "her şey odakta" prototip hissi verir; sprint/hasat sırasında FOV/lean tepkisi yok | Konservatif DOF (ön plan keskin, uzak arka plan hafif yumuşak) + hafif FOV kick |
| **V4** | Malzeme/texture | `pipeline.md` §8 kuralı: "doku ışığı taşımaz" (albedo-only, doğru bir stilize karar) — ama bunun yan etkisi: `sea.ts` dışında hiçbir yüzeyde normal map yok (`rg -l normalMap` → yalnızca deniz/göl), roughness her yerde `MeshStandardMaterial` varsayılanı, hiçbir malzemede `envMap` yok | Kayalık/kum/ot her açıdan aynı mat düzlük — mikro-highlight varyasyonu yok | Texture'a boyanmadan (kural ihlal edilmeden) shader-taraflı mikro-varyasyon (ör. vertex-renk tabanlı roughness kırılması) |
| **V5** | VFX/juice | `src/systems/burst.ts` — tek bir additive `Points` havuzu (topla/teslim/toz). Bu iyi ve doğru teknik (havuzlanmış, tek draw call) ama **tek VFX sistemi bu** — ayak izinde su dalgası yok, oyuncu geçerken sazlık/ot tepki vermiyor, güneşin kendisinde parıltı/lens flare yok | Adanın "cennet gibi güzel, ışığı davet ediyor" (art-bible §1) iddiası VFX ile desteklenmiyor | 1–2 ucuz ek: ayak izi su halkası, güneş lens flare (bkz. V9) |
| **V6** | Çevre yoğunluğu | Kod tabanında `InstancedMesh` **hiç kullanılmıyor** (`grep -r "InstancedMesh" src/` → 0 sonuç doğrulandı). `terrain.ts`'te sabit küçük döngüler (`for i<34`, `<14`, `<7`…) + `mergeGeometries` (iyi teknik) ama sayılar düşük. `roadmap.md` §1.3 kendisi de itiraf ediyor: "el yerleşimli 28 çiçek yok, kod 3 bölgeye prosedürel saçıyor", "prop yoğunluğu... Faz 2.6" | Art-bible §6 "lotus tarlasında yüksek [prop yoğunluğu]" kuralı henüz sahnede yok; geniş kum/ot alanları boş okunuyor | `InstancedMesh` tabanlı, mevcut `mergeGeometries` deseninin (sazlık kümeleri) genişletilmiş hâli — çakıl, küçük ot tutamı, deniz kabuğu serpmesi |
| **V7** | UI/HUD cilası | `index.html`'de **hiç webfont import/`<link>`/`@font-face` yok** (grep doğrulandı — 0 sonuç). `src/ui/hud.css` satır 21: `font-family: "Optima", "Palatino Linotype", "Georgia", serif` — tamamen OS fallback zinciri. Buna karşın `hud.css`'in geri kalanı (box-shadow, text-shadow, border-radius — satır 50, 141, 147, 157, 205…) zaten özenli | Tipografi "belge" gibi okunuyor, "oyun" gibi değil — CSS'in geri kalanındaki cila tek bir font satırıyla boşa gidiyor | Self-host edilmiş, lisansı temiz (OFL) bir antik-esintili display serif (bkz. §4) |
| **V8** | Su malzemesi | `sea.ts` satır 74, 153: iki `MeshStandardMaterial` — normal map var (ASSET-012/033, entegre) ama vertex displacement/dalga geometrisi **yok** (grep: `sea.ts`'te `vertexShader`/`wave`/`displacement` string'i yok) — düz plane + normal map'in ima ettiği sahte hareket | Su, adanın art-bible §1 iddiasının ("deniz her karede görünür") merkezinde ama geometrik olarak durgun bir düzlem | Ucuz bir Gerstner-tarzı vertex dalga shader'ı (yalnızca sığ su, "NOT photoreal" kuralına uyan, stilize genlik) |
| **V9** | Işık/atmosfer — **en somut tekil bulgu** | Art-bible §2 açıkça bir renk tanımlıyor: *"Güneş halesi `#ffcf80` — güneşin çevresi, **bloom kaynağı**"*. `stage.ts`'i baştan sona okudum: sahnede **görünür bir güneş diski/mesh hiç yok**, yalnızca bir `DirectionalLight`. Bloom pass'in (`UnrealBloomPass`) parlayacağı fiziksel bir nesne yok — yani art-bible'ın kendi onaylı satırı şu an **hiç uygulanmamış** | Adanın "ışık davet eder" (§1) merkezi imgesi eksik | `THREE.Sprite`/küçük mesh + emissive/additive malzeme, güneş konumunda (`sun.position`'ı zaten takip eden); isteğe bağlı `Lensflare` (three'nin kendi `examples/jsm/objects/Lensflare.js`'i) |
| **V10** | Post-process kenar/AA | Tek AA kaynağı `antialias: true` (canvas MSAA); `EffectComposer` zincirinde post-AA (FXAA/SMAA) yok — bloom sonrası kenarlar biraz yumuşak/blok okunabilir, özellikle billboard sprite kenarlarında | Sprite/billboard kenarları (lotus, karakter, ağaç) yüksek kontrastlı arka planda (deniz/gökyüzü) merdiven basamağı gösterebilir | `SMAAPass` (three'nin kendi paketi) `OutputPass`'tan önce/sonra ekle |
| **V11** | Frame bütçesi ölçütü yok | `roadmap.md` Faz 3.5/7.1 "post-process bütçe ölçümü" ve "performans bütçesi doğrulaması" diyor ama **hiçbir yerde somut bir FPS/ms hedefi yazılı değil** | Bu araştırmanın önerdiği her ek post-effect (DOF, AO, LUT, SMAA) bir bütçeye karşı test edilmeli, yoksa "gerçek oyun gibi" hedefi "donan oyun" ile çakışır | Somut sayı (bkz. §5) |

---

## 3. Kıyaslama — küçük ekiplerin Three.js'te "gerçek oyun" izlenimi nasıl kurduğu

| Proje/kaynak | Ne yaptı | Lotophagoi'ye uygulanabilirlik |
|---|---|---|
| **PolyTrack** (kodub, Three.js + Ammo.js, itch.io'da shipped) | Düşük-poligonlu, düz-gölgeli sanat yönüyle **medyum ile savaşmıyor** — tutarlı stilizasyon + temiz HTML/CSS UI + sıkı kamera işiyle "amatör" değil "kasıtlı" okunuyor. | Doğrudan ders: Lotophagoi'nin zaten sahip olduğu "stylized, asla fotogerçekçi" ilkesi (art-bible §1) doğru yönde — eksik olan **tutarlılığı tamamlayan son %10** (V7 font, V9 güneş, V2 grade). |
| **Alfi's Adventures** (solo, vanilla Three.js, VIVERSE'de shipped — three.js forum showcase) | Özel küresel-harmonik (SH) PRT ışıklandırma — pahalı gerçek-zamanlı GI olmadan "pişmiş" (baked) diffuse görünümü taklit ediyor, dinamik nesneler için de çalışıyor. | Tam SH-PRT bu projenin kapsamı için fazla mühendislik; ama "ucuz yaklaşık GI >> düz ambient+hemi" dersi V1'i destekliyor — daha ucuz bir adım (statik AO/bounce texture) aynı yönde. |
| **BOTW-tarzı stilize çim** (James Smyth, smythdesign.com/blog/stylized-grass-webgl) | Alpha-kesilmiş instanced çim yaprağı + basit rüzgar vertex shader'ı — projenin **kendi menü kroması zaten BOTW referansı kullanıyor** (`asset-registry.md` P2 — UI (menü kroması) bölümü). | Aynı referans dilini sahaya da taşımak tutarlı: V6 (InstancedMesh prop yoğunluğu) için doğrudan teknik model. |
| **js13kGames kazananları** (13 KB bütçeli WebGL oyunları) | Texture bütçesi sıfıra yakın olduğu için görsel kalite tamamen **birkaç iyi seçilmiş shader efektine** (fresnel rim, toon ramp, tek güçlü ışık kaynağı) dayanıyor — az sayıda etkiyi mükemmelleştirmek, çok sayıda vasat dokudan daha güçlü okunuyor. | Doğrudan bu dosyanın önceliklendirme mantığını doğruluyor (§6) — az sayıda (V9, V2, V7) ucuz+yüksek-etkili değişiklik, büyük bir texture-authoring turundan önce gelmeli. |
| **`three.js` resmi `examples/jsm/objects/Water.js`** | Gerçek-zamanlı yansımalı su nesnesi, motorun kendi paketinde. | **Doğrudan kullanılmaz** — yansıma-ağırlıklı, "NOT photoreal" kuralını zorlayabilir; V8 için ilham/referans olarak okunmalı, birebir entegre edilmemeli. |

---

## 4. Repo/araç eşleme — "Repo çözer mi?" sütunlu

Kural: sahnede zaten kurulu olan (`three` r185 paketinin kendi `examples/jsm/`'i, mevcut `EffectComposer`/`UnrealBloomPass`/`mergeGeometries` deseni) yeniden icat edilmiyor, üstüne ekleniyor.

| Gap ID | Araç/Repo | Ne çözer | Yeni bağımlılık mı? | Repo çözer mi? | Efor | Etki (sıralı, bkz. §7) |
|---|---|---|---|---|---|---|
| V9 | `three/examples/jsm/objects/Lensflare.js` + basit emissive `Sprite` | Art-bible'ın onaylı "güneş halesi = bloom kaynağı" satırını gerçek bir nesneye bağlar | **Hayır** — `three` paketinin içinde zaten duruyor | **Evet, doğrudan** | Düşük | Yüksek |
| V2 | `three/examples/jsm/postprocessing/LUTPass.js` | Sabit kod satırı yerine ayarlanabilir, sahip'in ileride A/B yapabileceği bir renk derecelendirme katmanı | **Hayır** — `three` içinde | **Evet** — ama LUT dosyasının kendisi (varsa hazır `.cube`) lisans temiz olmalı; el yapımı LUT tercih edilir | Düşük–orta | Yüksek |
| V10 | `three/examples/jsm/postprocessing/SMAAPass.js` | Bloom sonrası kenar/merdiven basamağı temizliği, özellikle billboard sprite kenarları | **Hayır** — `three` içinde | **Evet, doğrudan** | Düşük | Orta |
| V3 | `three/examples/jsm/postprocessing/BokehPass.js` | Ön plan/arka plan derinlik ayrımı — DOF | **Hayır** — `three` içinde | **Evet, ama ayarı hassas** — unutuş bulanıklığıyla (`FX_BLUR`, maks 3px kuralı) **karışmamalı**, ayrı uniform kalmalı (bkz. §8) | Orta | Yüksek |
| V6 | Yok — mevcut `terrain.ts` `mergeGeometries` deseninin `InstancedMesh`'e genişletilmesi | Prop yoğunluğu (çakıl, küçük ot tutamı, deniz kabuğu) | **Hayır** — desen zaten repo'da (sazlık kümeleri) | **Repo değil, iç mühendislik deseni — "araç" değil, örüntü genişletmesi** | Orta | Yüksek |
| V1 | `n8ao` (pmndrs, npm; WebGL `EffectComposer` uyumlu sürümü mevcut, WebGPU/TSL sürümü ayrı) | Ekonomik SSAO, temel kontak-gölge | **Evet** — yeni npm bağımlılığı | **Kısmen** — nötr gri/siyah AO tonu art-bible'ın "gölge asla siyah/nötr gri, serin mavi `#5f7fa8`" kuralını (§2, §9 yasak listesi) ihlal eder; **AO rengi elle tonlanmalı**, kutudan çıktığı gibi kullanılamaz | Orta–yüksek | Orta (riskli — bkz. §8) |
| V8 | Yok — özel Gerstner-tarzı vertex shader (ilham: `three`'nin kendi `Water.js` örneği, birebir alınmaz) | Sığ suda gerçek dalga geometrisi | **Hayır** (özel kod) | **Repo değil, referans** | Yüksek | Yüksek ama pahalı — sona sıralandı |
| V7 | Google Fonts (OFL lisanslı) — öneri: `Spectral`, `Cormorant`, veya `Cinzel` (antik/serif hissi, oyun UI'da yaygın kanıtlanmış) — self-host `.woff2` | Menü/HUD tipografisini "belge" değil "oyun" gibi okutur | **Evet** — ama yalnızca statik font dosyası, kod bağımlılığı değil | **Evet, doğrudan** — lisans temiz, `public/assets/` altına (ya da `public/fonts/`) düşer | Düşük | Yüksek |
| V-QA1 | `pixelmatch` + Playwright (devDependency) | Işıklandırma/post-process PR'larında istenmeyen görsel regresyonu yakalar | **Evet**, dev-only | **Evet** | Düşük–orta | Orta (güvenlik ağı, doğrudan "görünüş" değil) |
| V-QA2 | `color-thief` (npm) | Üretilen/sahne texture'unun baskın renklerinin art-bible §2 hex ailesine uyup uymadığını otomatikleştirir | **Evet**, dev-only | **Evet** — `pipeline.md` §8'in "göz kararı değil, hex kontrolü" maddesine somut bir araç bağlar (şu an o madde araçsız) | Düşük | Orta |
| V-QA3 | `wcag-contrast` (npm, küçük) | HUD/menü metninin arka plana kontrastını otomatik ölçer | **Evet**, dev-only | **Evet** — `docs/ux/screens.md` §3.5'in 4.5:1 kuralını otomatikleştirir; bu proje **bir kere zaten bu yüzden elle patch yaptı** (ASSET-052 Hub arkaplanı sonrası kontrast düzeltmesi, `ACTIVE_WORK.md` son kapanan işler) | Düşük | Yüksek (zaten bir kez ısırdı) |

---

## 5. Ölçülebilir kabul kriterleri önerisi

`docs/art/pipeline.md` §8'in "göz kararı değil, hex kontrolü" maddesi doğru ilkeyi söylüyor ama **hiçbir aracı adlandırmıyor**. Öneri:

| # | Kriter | Nasıl ölçülür | Eşik | Hangi araç (bkz. §4) |
|---|---|---|---|---|
| 1 | **Palet uyumu** | Üretilen/entegre her sahne texture'unun baskın 5 rengi çıkarılır, art-bible §2'deki en yakın hex'e ΔE (CIEDE2000) farkı hesaplanır | ΔE ≤ 12 | `color-thief` (V-QA2) |
| 2 | **HUD/menü kontrastı** | Metin katmanı + altındaki en yoğun görsel bölge örneklenir | ≥ 4.5:1 (WCAG AA — `ux/screens.md` §3.5'teki mevcut kuralla birebir aynı) | `wcag-contrast` (V-QA3) |
| 3 | **Görsel regresyon** | Her ışık/post-process PR'ında 4 unutuş eşiği × 3 gün-saati (öğleden sonra/gün ortası/alacakaranlık) sabit kamera açılarından ekran görüntüsü alınır, önceki baseline'la piksel-piksel karşılaştırılır | fark ≤ %0.1 piksel (istenmeyen), ya da PR'ın kendisi bir görsel değişiklikse baseline güncellenir | `pixelmatch` + Playwright (V-QA1) |
| 4 | **Derinlik ayrımı (DOF kanıtı)** — **yeni, bu dosyaya özgü bir öneri** | Ön plan (lotus/karakter) ve arka plan (tepe backdrop) bölgelerinde Laplacian varyansı (standart bilgisayarlı görü "blur detection" metriği) ölçülür | DOF etkinken arka plan/ön plan varyans oranı belirgin biçimde 1.0'dan uzaklaşmalı (şu an ~1.0 — "her şey eşit keskin" V3'ün kanıtı) | Basit bir Node/Canvas script (yeni yazılmalı, küçük) |
| 5 | **Frame bütçesi** | Orta seviye entegre GPU'da (ör. Intel Iris Xe sınıfı), 1080p, tam post-process zinciriyle (bloom+haze+önerilen DOF/AO/LUT/SMAA) sürdürülebilir FPS | ≥ 55 FPS hedefi — **şu an hiçbir yerde yazılı sayı yok**, bu dosya öneriyor, `technical-director` onaylamalı | `renderer.info` + manuel profil (roadmap Faz 3.5/7.1'in eksik parçası) |
| 6 | **Fotosensitivite/unutuş ayrışması** | Yeni eklenen her post-effect (DOF, AO, LUT, SMAA) `amount`/`forgetting` uniformundan **tamamen bağımsız** bir uniform kullanmalı — kod incelemesiyle doğrulanır | `hazePass.ts`'in `amount` uniformuna yeni hiçbir efekt bağlanmamış olmalı | Kod review checklist maddesi (§8) |

---

## 6. Öncelik planı

Üç ölçüt: **(1) efor/etki oranı, (2) art-bible'da zaten onaylı ama uygulanmamış olma** (V9 gibi — sıfır tasarım riski), **(3) bağımlılık zinciri.**

| Sıra | ID | İş | Efor | Etki | Bağımlılık/risk |
|---|---|---|---|---|---|
| 1 | V9 | Güneş diski + lens flare | Düşük | Yüksek | Yok — art-bible §2'nin zaten onaylı satırını uyguluyor, sıfır yeni onay gerektirir |
| 2 | V7 | Self-host display serif webfont | Düşük | Yüksek | Sahip onayı: font seçimi (3 aday önerilecek, bkz. §10) |
| 3 | V2 | LUTPass renk derecelendirme (sabit satırın yerine) | Düşük–orta | Yüksek | Sahip'e "look" A/B'si sunulmalı |
| 4 | V10 | SMAAPass | Düşük | Orta | Yok |
| 5 | V6 | InstancedMesh prop yoğunluğu genişlemesi | Orta | Yüksek | `roadmap.md` Faz 1/2.6 (ada ölçeği + el yerleşimi kararına bağlı — K5 gibi kapsam kararları netleşmeden büyütülmemeli) |
| 6 | V3 | BokehPass DOF (konservatif ayar) | Orta | Yüksek | `FX_BLUR` ile uniform çakışmaması şart (bkz. §8) |
| 7 | V1 | AO (tonlanmış, nötr gri değil) | Orta–yüksek | Orta | Renk tonlama kararı sahip/art-director onayı ister — yanlış tonlanırsa art-bible §9 yasağını (siyah/nötr gri gölge) ihlal riski |
| 8 | V8 | Sığ su vertex dalga shader'ı | Yüksek | Yüksek ama pahalı | En sona sıralı — su adanın imza yüzeyi (§1 "deniz her karede görünür"), yanlış yapılırsa geri dönüşü pahalı |
| — | V-QA1/2/3 + V4 kriteri | QA tooling + malzeme mikro-varyasyon | Düşük–orta | Orta (paralel) | Yukarıdaki maddelerden herhangi biri şeslendiğinde birlikte kurulabilir — ilk PR'dan sonra bir baseline olur |

---

## 7. Dürüst etki tahmini

**Bu bölümde yüzde vermiyorum çünkü ölçülmedi.** Kaynaktaki playbook'un kendisi "paid partnership" olduğu için maliyet/performans iddialarını satıcı kaynaklı saydığımız aynı dürüstlük ilkesiyle (`pipeline.md` başlığındaki dürüstlük notu), burada da spekülatif kesinlik üretmiyorum. `roadmap.md` Faz 6 zaten böylesi iddiaları ölçüme bağlıyor ("ertelenmiş üç sayının **ölçümle** kapanması") — bu dosya o disiplini bozmuyor.

Söyleyebileceğim, **sıralı ve gerekçeli** olan:

- V9 + V7 + V2 (güneş halesi + font + renk derecelendirme) üçlüsü muhtemelen "ilk bakış izlenimi"nde en büyük tekil farkı yaratır — çünkü üçü de **her karede** görünür (güneş, HUD/menü metni, genel renk) ve üçü de düşük efor. Ama bu bir **sıralama tercihi**, ölçülmüş bir sayı değil.
- V6 (çevre yoğunluğu) muhtemelen "boş/prototip" hissini en çok azaltan tekil değişiklik — çünkü art-bible'ın kendi metni bunu zaten adanın merkezi iddiası olarak tanımlıyor (§1 "cennet gibi güzel"). Ama bu, `roadmap.md`'nin zaten bağımlı kıldığı ada-ölçeği kararlarına (K5, Faz 1/2.6) bağlı — izole yapılırsa yarım kalır.
- V1 (AO) ve V8 (su dalgası) en yüksek "AAA görünüm" potansiyeline sahip ama aynı zamanda en yüksek **yanlış yapma riski** taşıyor (art-bible'ın "asla siyah/nötr gölge" ve "NOT photoreal" kurallarına en yakın duran ikisi bunlar) — bu yüzden listenin sonunda, ilk altı madde sahada denendikten sonra.

**Playtest'e ertelenmesi gereken soru (bu dosya cevaplamıyor):** bu değişikliklerin gerçekten "gerçek oyun gibi" algısını değiştirip değiştirmediği — `roadmap.md` Faz 6'nın ölçüm çerçevesine (§5'teki kriterler dahil, ekran görüntüsü + kontrast + palet ölçümleriyle) bırakılmalı.

---

## 8. Red listesi

| # | Ne | Neden yapılmıyor |
|---|---|---|
| R1 | **Her yüzey için tam PBR üçlüsü** (roughness+normal+AO texture) | `art-bible.md` §8 "doku ışığı taşımaz" kuralını doğrudan çiğner; `pipeline.md` §6 boyut bütçesini (texture ≤300 KB, toplam ≤8 MB) patlatır; bu proje bir texture-authoring stüdyosu değil |
| R2 | **Billboard/prosedürel mesh'lerin tam 3D modele/fotogrametriye çevrilmesi** | CLAUDE.md ve art-bible §5 şekil dili kararı; bu görev açıkça "tam 3D model pipeline'ı önerme" demiş |
| R3 | **WebGPU/raytracing/Poseidon-tarzı GPU okyanus** | `technical-director` zaten değerlendirdi ve erteledi (K32, `webgpu-migration-assessment.md`) — bu dosya o kararı yeniden açmıyor |
| R4 | **Su üstünde tam SSR (screen-space reflection)** | Pahalı + "NOT photoreal" bağlayıcı kuralını zorlama riski; V8'in önerdiği stilize vertex-dalga yaklaşımı yeterli, gerçekçi yansıma gerekmiyor |
| R5 | **Film grain / kromatik aberasyon "sinematik filtre"** | Zaten yasak (`art-bible.md` §3 "Film grain yok") — bu dosya o yasağı teyit ediyor, delmiyor |
| R6 | **Higgsfield/Gemini texture pipeline'ına yeni bir tur** | MCP hâlâ bağlı değil; bu dosyadaki hiçbir madde onu gerektirmiyor — hepsi ya stok `three` paketi ya küçük özel kod |
| R7 | **Unity/Godot/Unreal veya motor değişimi** | Bağlayıcı proje kısıtı |
| R8 | **DOF veya AO'nun unutuş (`hazePass.ts` `amount`) uniformuna bağlanması** | Art-bible §4'ün "unutuş ayrı bir çalışma zamanı katmanı" ilkesini bozar — yeni her post-effect **kendi bağımsız uniformunda** kalmalı, `amount`'la karışmamalı. Bu özellikle V3 (DOF) için kritik: `FX_BLUR` (maks 3px) kuralı, DOF'un kendi bulanıklığıyla toplanırsa aşılabilir |
| R9 | **AO'yu kutudan çıktığı gibi (varsayılan nötr gri/siyah) kullanmak** | Art-bible §2/§9 "gölge asla siyah/nötr gri, serin mavi `#5f7fa8`" kuralını ihlal eder — V1 uygulanırsa AO rengi elle tonlanmalı, bu bir onay maddesi |

---

## 9. Bağlayıcı kurallara uygunluk kontrolü

Bu dosyadaki her öneri için:

- [x] Higgsfield MCP gerektirmiyor (hiçbiri)
- [x] 3D model/fotogrametri pipeline'ı önermiyor — hepsi shader/post-process/instancing, mevcut procedural+billboard yönünü koruyor
- [x] Shader/render kodu burada **yazılmadı**, yalnızca kanıt ve öneri toplandı — uygulama `gameplay-programmer`/`technical-director`'ın işi
- [x] Mekanik/tuning sayısı önerilmedi (`docs/design/` alanına girilmedi)
- [ ] **Açık soru — sahip/`technical-director` kararı gerekiyor:** V7'nin webfont dosyası ve (V2 uygulanırsa) LUT `.cube` dosyası `public/assets/` altına girerse, bunlar AI-üretimi olmadığı için `pipeline.md` §7'nin `assets.csv` (prompt+model+seed) manifestine mi tabi olacak, yoksa o manifest yalnızca AI-üretilmiş medya için mi (yeniden üretilebilirlik amaçlı) — bu netleşmemiş bir sınır durumu, `art-director`+`technical-director` birlikte karar vermeli

---

## 10. Sıradaki adım / kim yapmalı

| İş | Rol | Not |
|---|---|---|
| V9 güneş diski + lens flare | `gameplay-programmer` | Art-bible zaten onaylı, sahip onayı gerekmez — doğrudan uygulanabilir |
| V7 font seçimi | `art-director` → sahip onayı | 3 aday sunulmalı (öneri: `Cormorant`, `Spectral`, `Cinzel` — üçü de OFL, antik/serif hissi, oyun UI'da yaygın kanıtlanmış); son karar sahip'te |
| V2 LUT "look" yönü | `art-director` + `gameplay-programmer` → sahip onayı | Kaç varyant sunulacağı (öneri: 2 — "mevcut sıcak grade'in netleştirilmiş hâli" ve "biraz daha doygun altın saat") |
| V6 InstancedMesh yoğunluk artışı | `gameplay-programmer` + `game-designer` | `roadmap.md` Faz 1/2.6 (ada ölçeği/el yerleşimi) kararına bağlı — izole başlatılmamalı |
| V3 DOF | `gameplay-programmer` | R8 kuralına (unutuş bulanıklığından ayrı uniform) uyulduğunu `technical-director` code review'da doğrulamalı |
| V1 AO | `gameplay-programmer` + `art-director` | Renk tonlama onayı gerekli (R9) |
| §5 QA araçları | `qa-lead` + `technical-director` | Bağımsız, herhangi bir görsel değişiklikle paralel kurulabilir |
| §9 açık soru (font/LUT dosyalarının manifest durumu) | `art-director` + `technical-director` | Karara bağlanmalı, `pipeline.md` §7'ye bir netlik notu eklenmeli |
