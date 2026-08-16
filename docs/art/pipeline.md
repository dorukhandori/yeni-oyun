# Asset & medya pipeline — Lotus Adası

> **Oyun:** Homeros, *Odysseia* Kitap IX — **Lotus Yiyenler (Lotophagoi) Adası**. Oyuncu (Doryseus — orijinal tasarım, Homeros'un Odysseus'u değil; isim değişikliği sahip kararı 2026-08-14) adada olgunlaşmış lotusları toplar, kıyıdaki gemisine teslim eder; hedef 12. Lotus yurdu unutturur; **unutuş mekaniği oyunun kalbidir.**
> **Motor:** Vite + TypeScript + **Three.js 3D**.
> **Tasarım otoritesi:** `docs/design/` (`game-concept.md`, `gdd-lotus-collection.md`, `gdd-memory-system.md`, `tuning.md`). Oynanış, karakter, HUD ve sayılar oradan gelir — **çelişkide onlar kazanır**, `docs/art/` yalnızca görsel dili sabitler. Bu hat o dokümanlara yazmaz.
> **Kaynak sistem:** ZEUS⚡️ (@zeuuss_01), *"How to Run a Game Studio Solo with Claude Code + Higgsfield MCP"*, 5 Ağustos 2026 — <https://x.com/zeuuss_01/article/2085112087605342552> (tam metin okundu ve doğrulandı).
> **Dürüstlük notu:** Makalenin tanıtım postu X'te **"Paid partnership"** işaretli — Higgsfield sponsorluğunda yazılmış bir playbook, bağımsız değerlendirme değil. Yöntemi alıyoruz; maliyet ve performans iddialarını satıcı kaynaklı sayıyoruz. Ayrıntı: `docs/research/ai-pipeline-games.md`.

## Etiket sözleşmesi

Etiketsiz madde bırakmak yasak.

| Etiket | Anlamı |
|---|---|
| **[K]** | Kaynak makalede açıkça var. Yanında bölüm adı verilir. |
| **[A]** | Araştırma raporunda doğrulanmış saha pratiği (`docs/research/ai-pipeline-games.md`). |
| **[P]** | Proje kararı — kaynakta yok. Sahip onayı ile değişir. |
| **[?]** | Doğrulanmamış / sahip onayı bekliyor. |

---

## 1. Sistemin şekli

**[K]** *"The stack"* — üç katman. İnsan yalnızca **başa** ve **sona** dokunur; ağır orta kısmı modeller taşır.

| # | Katman | Araç | Ne üretir |
|---|---|---|---|
| 1 | **Tasarım motoru** | **Opus 5 / Fable 5** | pitch, beat sheet, shot list, art direction, sistem tasarımı |
| 2 | **Build motoru** | **Claude Code** | mekanik, kontrol, UI/HUD, state, deploy |
| 3 | **Medya motoru** | **Higgsfield MCP** | trailer, key art, karakter turnaround, sinematik plan, sosyal cutdown |

**[K]** Hattın kendi sınırı: bu hat AAA çıkarmaz — *"One person plus these tools does not ship a 100-hour open-world AAA."* Çıkardığı şey bir **"concept-to-trailer-to-prototype shop"**: vizyon + görsel + pazarlama, üstüne küçük oynanır web build'leri. Lotophagoi bu kutuya girer: **kısa, oynanır, tarayıcıda bir dilim** — Odysseia'nın tamamı değil.

### 1.1 İki insan kapısı **[K]**

Makalenin en bağlayıcı kısmı bu. Sahip'in dokunduğu tek iki yer:

**KAPI 1 — Intake (~20 dk, sahip).**
Fikri sıkı bir spec'e çevirmek: vizyon, beat'ler, art direction. Makale: *"Judgment work, and judgment is where the value lives."*
Bu projede bu kapıdan geçmesi gerekenler:
- Art direction onayı → `docs/art/art-bible.md` §2 paleti ve §4 unutuş estetiği
- `docs/design/` dokümanlarının onayı (hepsi "sahip onayı bekliyor" durumunda)
- Görsel çelişkilerin kapatılması → `art-bible.md` sondaki onay listesi
Bu kapı kapanmadan asset üretimi başlamaz.

**KAPI 2 — QA + handoff (~25 dk, sahip).**
**[K]** *"Review against the spec, not your taste."* Eksik state veya bozuk kontrol = geri prompt, elle patch değil.
Bu projede bu kapıdan geçmesi gerekenler:
- Asset'ler §8 kabul kapısından geçti mi
- `public/assets/assets.csv` manifest satırı dolduruldu mu (§7)
- Oyun spec'i karşılıyor mu — göz kararı değil, GDD'lerin kabul kriterleri madde madde

Arada kalan her şey (design, media, build) modellerin işidir. **[K]** *"You went from producer to orchestrator."*

### 1.2 Teslim hattı **[K]**

1. **Intake** — sahip, ~20 dk
2. **Design** — Opus 5 / Fable 5
3. **Media + Build — paralel**: Higgsfield MCP trailer/key art üretirken Claude Code build'i yazar
4. **QA + handoff** — sahip, ~25 dk

---

## 2. Higgsfield ne üretir, ne üretmez

**[K]** *"3. Higgsfield MCP - the media engine"* — işi **medya**: video ve durağan görsel. *"Every game needs to be seen: a trailer, gameplay-style footage, character key art, cinematic moments, marketing stills."*

**[K] 3D mesh üretmez.** Oynanır build'e dair makalenin cümlesi: *"From 'idea' to 'a link people can play' **without a single hand-modeled asset**"* — oyun içi görselin varsayılan üretim yolu **koddur**.

**Çıktının bu projedeki meşru kullanımları:**

| Kullanım | Etiket | Nereye |
|---|---|---|
| Trailer / key art / social cutdown / sinematik | **[K]** | `art-source/media/` — oyuna girmez, pazarlama teslimi |
| Stil referansı, concept art, karakter turnaround | **[K]** | `art-source/ref/` — kodun nişan aldığı hedef |
| Tileable texture / billboard / skybox / UI sprite | **[P][?]** | `public/assets/` — **sahip onayı gerekir** |
| Animasyon kaynağı (still → video → frame) | **[A]** | `art-source/frames/` → `public/assets/spritesheets/` (§5) |

**[A]** Araştırmanın uyarısı: üretilmiş 3D modele hero asset olarak güvenilmiyor (*Bawk to the Future* geliştiricisinin özeleştirisi). Çalışan yol **"concept image → 3D"**, yani görsel yönü önce 2D'de sabitlemek. Bizde de sıra: art bible → turnaround → geri kalanı.

### 2.1 Yakın plan hacim — billboard değil **[P]** (2026-08-16)

Sahip ASSET-053/054 zeytin+servi çapraz billboard'larını ön planda **kâğıt** okudu ve reddetti. İki bağlayıcı neden:

1. **`art-bible.md` §8:** doku ışık taşımaz. Gemini still'in yarısı sarı-yeşil / yarısı koyu yeşil — o ayrım albedo'ya gömülü ışık. Kart döndükçe dünya ışığıyla çelişir.
2. **`skybox-backdrop.md`:** alpha billboard orta-uzak katman içindir, ön plan için değil. Ada yürüme mesafesinde; her koruluk ön plan.

**Kural:** yürünebilir ağaç = kod mesh (hacim + `MeshStandardMaterial`, `flatShading` kapalı, gölge motordan). Billboard yalnız ince bitki (saz, ot tutamı, lotus) ve gerçekten uzak silüet. ASSET-053/054 `public/assets/`'te stil referansı / ileride image-to-3D kaynağı olarak durur, sahneye dönmez.

### 2.2 Image-to-3D — Tripo **[P]** (2026-08-16, K39)

Gemini / Higgsfield / Veo **mesh vermez.** Hacimli GLB ayrı hattır: **§5.1**. Bu bölüm yalnızca sınırı kaydeder.

- Kurulu: `scripts/gen-mesh.mjs`, `src/world/gltf.ts`, `public/assets/models/`.
- Anahtar: `TRIPO_API_KEY` in `.env.local` (OpenAPI v3, `platform.tripo3d.ai`). Studio kredisi bu cüzdanı doldurmaz.
- İlk GLB **G1** (`visual-change-gate.md`) — koruluk değil, tek prop. Ajan G1'siz `gen:mesh` çalıştırmaz.
- Tripo albedo varsayılanı **kapalı** (`texture: false`, `pbr: false`): gömülü ışık kâğıt billboard'u tekrarlar (`art-bible.md` §8). `pbr: true` dokuyu zorla açar.

---

## 3. Erişim — Higgsfield MCP bağlantısı

**Durum: Higgsfield BAĞLI DEĞİL.** Erişim gelene kadar üretim çağrısı yapılmaz, görsel indirilmez.

**[P] Paralel yol — Gemini API doğrudan bağlantısı (2026-08-14 kuruldu).** Higgsfield'ın görsel modellerinden biri (**Nano Banana Pro**) zaten Google Gemini'nin native görsel üretimi; sahibin `game-project` deposunda çalışan bir Gemini API key'i mevcut. `scripts/gen-assets.mjs` bu key'i kullanarak (öncelik sırası: yerel `.env.local` → `../game-project/.env.local` fallback) doğrudan görsel üretir; video (Veo) tarafı henüz doğrulanmamış, ilk gerçek çalıştırmada düzeltme gerekebilir. Bu yol Higgsfield'ın 43 modelli çeşitliliğini, karakter tutarlılığı (Soul 2.0) hattını ve tek-URL MCP kolaylığını vermez — yalnızca stills (ve deneysel olarak video) için bir kısayol. **Key hiçbir zaman sohbete yapıştırılmaz veya bir agent'a elle verilmez** — script kendi ortamından okur, çalıştırma sahibe aittir.

**[K]** Bağlantı bir kez kurulur: ajan ayarlarında **custom connector** + tek URL, **OAuth** ile giriş, **API key yönetimi yok**.

```yaml
mcp_servers:
  higgsfield:
    url: "https://mcp.higgsfield.ai/mcp"
```

**[K]** Tek bağlantı **30+ model** açar — makalede sayılanlar: **Sora 2, Veo 3.1, Kling 3.0**, Seedance 2.0, GPT Image 2, Nano Banana Pro, Soul 2.0. **Model seçimi ajana bırakılır** (*"the agent picks the right one per shot"*); prompt'ta model adı sabitlenmez, `Pick the best model for …` denir.

**[K]** Ham üretimin ötesindeki yetenekler: referans klibi hazır prompt'a çevirme, uzun trailer'ı shorts'a kesme, **karakteri planlar arası tutarlı tutma (character training)**, hook müziği.

**[K]** Abonelik ~$40/ay (makalede "illustrative"; satıcı sponsorlu — bkz. dürüstlük notu).

**Erişim geldiğinde akış [K]:** sahip Cursor içinde brief'i düz dille yazar → ajan üretimi tetikler, modeli seçer, bitmiş klibi/görseli sohbete getirir. Arada web arayüzüne çıkmak makalenin akışında yok.

**Elle köprü [P]:** MCP gelmezse sahip web arayüzünden üretir → `art-source/raw/` → `art-source/work/` → onaylıysa `public/assets/`.

**[P][?]** `scripts/gen-assets.ts` yalnızca ileride toplu üretim gerekirse ayrılmış yerdir; MCP kaynaktaki yoldur, script ondan sapmadır.

---

## 4. Prompt anatomisi

**[K]** Makale prompt'u tarif etmekle kalmaz, çalışan bir tanesini birebir verir. Şablonlarımız o iskeleti izler:

1. **Açılış direktifi** — `Using Higgsfield, generate this as a <video/image> — <en-boy>, <süre>, high quality. Pick the best model for …` + stil hedefi + negatif aynı cümlede (`NOT photoreal`)
2. **Çekim / kamera**
3. **Renk ve bakış**
4. **Karakter** — `(fully original …)` ibaresiyle
5. **HUD** — yalnız gameplay çekimlerinde, köşe köşe
6. **Setting** — mekân envanteri
7. **Motion / beat** — zaman kodlu (`0–3s — …`), sonda kamera davranışı
8. **Look + IP** — estetik özeti + orijinallik güvencesi

**[K] Negatif prompt ayrı alan değildir** — cümle içinde geçer (`NOT photoreal`, `no logos`). Ayrı blok icat edilmez.

**[P]** Tek eklememiz: şablon sonunda **kabul kriteri** — QA kapısı (§1.1) neye bakacağını bilsin.

Şablonlar: `docs/art/prompts/` — ortak iskelet `_anatomy.md`.

**Telif notu [P]:** *Odysseia* kamu malıdır, konu serbesttir. Ama prompt'larda hiçbir mevcut oyun/film adaptasyonuna atıf yapılmaz; karakterler orijinaldir. **[K]** IP satırı zorunlu: *no logos, no brand marks, no real game titles*.

---

## 5. Animasyon üretimi — still → video → spritesheet

**[A] Bu bölüm araştırmada doğrulanmış saha pratiğidir** (*To the Abyss, We Dive!* — 4 yaratık bu yöntemle animasyonlanmış, `docs/research/ai-pipeline-games.md` §4.2). Makalede yoktur; makale yalnızca medya üretimini anlatır.

Higgsfield mesh vermediği için hareketli yaratık/karakter şöyle çıkarılır:

| # | Adım | Nerede | Not |
|---|---|---|---|
| 1 | **Still** — onaylı turnaround/karakter görseli | `art-source/ref/` | Tek doğruluk kaynağı; her animasyon buna bağlanır |
| 2 | **AI video** — still'den kısa döngü klibi | `art-source/raw/` | Prompt: `prompts/character-animation-clip.md` |
| 3 | **Frame extraction** — klipten kare dizisi | `art-source/frames/` | Döngünün başı-sonu birleşmeli |
| 4 | **Palette quantize** — palete sabitle, gürültüyü düşür | `art-source/work/` | Art bible §2 paleti |
| 5 | **Elle temizlik** | `art-source/work/` | **[A]** Zorunlu adım — o projede Volt hariç her sprite elle temizlenmiş |
| 6 | **Spritesheet** | `public/assets/spritesheets/` | İsim kuralı §6 |

**[A]** Bu altı adım tek komuta indirilmelidir — referans projede `pixelize.gd` idi, bizde bir Node script'i olur. Yeri `scripts/` **[P]**:
- `scripts/sheet-from-still.mjs` — onaylı turnaround → 4 yönlü idle sprite (ASSET-041..044). Kenar flood-fill; global chroma-key yok.
- `scripts/sheet-from-video.mjs` — clip → kare → taslak sheet. **Adım 5 (elle temizlik) sahip kapısıdır**; `--ship` olmadan `public/assets/`'e yazmaz. Veo klipleri (`ASSET-024/025/026`) bu repoda yok.

**Three.js tarafı [P]:** spritesheet `Sprite` + `SpriteMaterial` ile ya da `PlaneGeometry` üzerinde UV kaydırmayla oynatılır; kare oranı sabit tutulur, `magFilter = NearestFilter` (quantize edilmiş görüntü bulanıklaşmasın).

**Bu oyunda yöntemi hak eden kalemler:** Doryseus yürüme/toplama/teslim döngüsü, lotusun açma anı (yarı açık → olgun geçişi, `gdd-lotus-collection.md` §3.2 "kısa bir açılma animasyonu"), dalga köpüğü döngüsü. Statik olan hiçbir şey bu hattan geçmez — pahalıdır.

---

## 5.1 Image-to-3D — Tripo **[P][A]**

**[A]** Funkatron hattı (`docs/research/ai-pipeline-games.md` §4.7): fikir → concept image → image-to-3D → sahne. Çalışan kısım **"prompt → 3D" değil, "concept image → 3D"**. **[A]** *Bawk to the Future* (Tripo): AI mesh'i hero olarak kullanma — ilk deneme tek prop.

Higgsfield bu adımı **yapmaz** (§2). Gemini still üretir; Tripo OpenAPI v3 mesh üretir. Meshy yedek değil — tek satıcı.

### Durum

**API script'i + anahtar `.env.local`'de.** `npm run gen:mesh -- --balance` cüzdanı doğrular (üretim yok). Anahtar sohbete yapıştırılmaz. İki yol:

| Yol | Kim | Ne zaman |
|---|---|---|
| **A — sahip tık** | tripo3d.ai Studio, GLB indir → `art-source/raw/` | API cüzdanı boşken / tek seferlik deneme |
| **B — script** | `scripts/gen-mesh.mjs` (`POST /v3/files` → `POST /v3/generation/image-to-model` → poll 2 sn → `output.model_url`, URL ~5 dk ölür) | `TRIPO_API_KEY` var, G1 açık |

Studio kredisi ile OpenAPI kredisi **ayrı cüzdan**. Script yalnız `platform.tripo3d.ai` bakiyesini harcar. Ajan **sen demeden** `gen:mesh` ile mesh üretmez (`--balance` serbest).

### Adımlar

| # | Adım | Nerede |
|---|---|---|
| 1 | **Kaynak still** — 3/4, tek nesne, bej stüdyo (`docs/art/prompts/meshy-source-still.md`) | Gemini → `art-source/raw/` → alpha-key `art-source/work/` |
| 2 | **Tripo** — varsayılan: `model=v3.1-20260211`, `texture: false`, `pbr: false`, `smart_low_poly: true`, `auto_size: true`, `face_limit` 4000 | `art-source/raw/*.glb` |
| 3 | **§8** — silüet, poly, palet, gömülü ışık yok, ölçek (1 birim ≈ 1 m) | sahip |
| 4 | **Ship** — `public/assets/models/` + `assets.csv` (`class=scene-mesh`, `model=v3.1-20260211`, `seed=none`) | `kategori_ad_01_mesh_<poly>.glb` |
| 5 | **Kod** — `loadGltf()` (`src/world/gltf.ts`) + `tintGltf(PALETTE.*)` | InstancedMesh ancak bütçe geçerse |

Düz karşıdan billboard still (ASSET-053/054) image-to-3D'de **yassı kart** riski taşır. Yeni kaynak 3/4 olmalı. Eski still stil ref olarak durur. `--p1` = `P1-20260311` (sıkı low-poly, smart_low_poly yok).

### Neden dokusuz?

Tripo varsayılanı `texture: true` — albedo'ya gömülü ışık. Sahip bunu zeytin billboard'da kâğıt okudu. `--texture` yalnız bilinçli istisna. `pbr` asla varsayılan açık değil.

### İlk aday (G1, koruluk değil)

1. Tek tebeşir kaya
2. Tek zeytin
3. Tek servi
4. Koruluk = kod mesh kalır ta ki bir GLB instancing + 400 KB tavanı geçene kadar

```bash
npm run gen:mesh -- --image art-source/work/rock_chalk_boulder_01_alpha_keyed.png \
  -o art-source/raw/rock_chalk_boulder_01_mesh.glb --polycount 2000
```

---

## 6. Klasör şeması ve isimlendirme

**[P] Bu bölümün tamamı proje kararıdır** — makalede klasör şeması ve isim kuralı yoktur.

```
yeni-oyun/
  art-source/              # git'e GİRMEZ (.gitignore) — ham ve ara dosyalar
    raw/                   # Higgsfield'dan gelen dokunulmamış çıktı
    frames/                # video'dan çıkarılmış kareler (§5)
    work/                  # kırpma / quantize / atlas / sıkıştırma
    ref/                   # onaylı stil referansları, turnaround
    media/                 # bitmiş medya teslimleri: trailer, key art, cutdown
  public/assets/           # git'e GİRER — oyuna giren optimize dosyalar
    assets.csv             # ★ shipping manifest (§7)
    textures/
    sprites/
    spritesheets/
    ui/
    skybox/
    models/                # §5.1 Tripo GLB — §8 geçmeden boş
  docs/art/
    pipeline.md            # bu dosya
    art-bible.md           # görsel dil
    asset-registry.md      # ne gerekiyor, hangi durumda
    prompts/               # Higgsfield prompt şablonları
  scripts/                 # §5: sheet-from-still.mjs + sheet-from-video.mjs
```

**İsimlendirme [P]:** `kategori_ad_varyant_kanal_çözünürlük.uzantı` — küçük harf, ayraç `_`, varyant iki hane.

| Parça | Değerler |
|---|---|
| kategori | `lotus`, `flora`, `water`, `sand`, `rock`, `ship`, `hill`, `sky`, `ui`, `char`, `fx` |
| ad | kısa İngilizce isim |
| varyant | `01`, `02`, … (lotus aşamalarında aşama numarası) |
| kanal | `albedo`, `normal`, `rough`, `emissive`, `alpha`, `caustic`, `sheet`, `ref`, `mesh` |
| çözünürlük | `256`, `512`, `1024`, `2048` — **`mesh` kanalında bu sayı `target_polycount`** (2000, 4000…) |

Örnekler:

```
lotus_bloom_03_albedo_512.png          # olgun lotus (3. aşama)
lotus_bud_01_albedo_256.png            # tomurcuk
flora_lilypad_01_albedo_512.png        # nilüfer yaprağı
flora_reed_01_alpha_512.png            # sazlık billboard
water_shallow_01_normal_512.png        # sığ su dalga normal'i
water_foam_01_alpha_512.png            # köpük hattı
water_caustic_01_caustic_512.png       # sığ su caustic
sand_gold_01_albedo_1024.png           # altın kum
sand_wet_01_albedo_1024.png            # ıslak kum
ship_plank_01_albedo_1024.png          # ağarmış gemi tahtası
ship_sail_01_albedo_1024.png           # yelken bezi
rock_chalk_01_albedo_1024.png          # tebeşir beyazı kayalık
hill_backdrop_01_albedo_2048.png       # uzak sisli tepeler
sky_goldenhour_01_albedo_2048.png      # altın saat gökyüzü
ui_satchel_01_albedo_256.png           # çanta ikonu (HUD_CARRY, 4 yuva)
ui_compass_01_albedo_128.png           # pusula oku — eşik 50'de solar
char_doryseus_walk_01_sheet_1024.png   # Doryseus yürüme spritesheet'i (isim kuralı 2026-08-14'ten sonra üretilen dosyalar için)
char_odysseus_turnaround_01_ref_2048.png  # sadece referans — oyuna girmez. NOT: ASSET-001 zaten "odysseus" adıyla üretildi ve kabul edildi (isim değişikliğinden önce); dosya yeniden üretilmedi, sadece etiket metni güncellendi (asset-registry.md ASSET-001 notu)
```

`_ref_` kanallı dosya **oyuna girmez**, yalnızca stil hedefidir.

**Teknik bütçe [P][?]** — web hedefi, ölçüm sonrası düzeltilecek:

- Çözünürlük basamakları: 256 / 512 / 1024 / 2048. Ara değer icat edilmez.
- Dosya tavanı: texture ≤ 300 KB · UI ikonu ≤ 30 KB · backdrop/sky ≤ 600 KB · spritesheet ≤ 500 KB · **GLB (`models/`) ≤ 400 KB**.
- Format: üretim PNG → oyuna giren WebP (gerekirse KTX2).
- Toplam ilk indirme hedefi ≤ 8 MB.

**Three.js entegrasyonu [P]** — kod `src/` altında ve 3D agent'ın işi; buradaki kural beklentisi:

- `TextureLoader` ile yükle. Renk taşıyan her texture: `colorSpace = THREE.SRGBColorSpace`. Veri map'lerine (normal / rough / caustic) **dokunma**.
- Tileable kum ve su: `wrapS = wrapT = THREE.RepeatWrapping` + `repeat.set(x, y)`; tile ölçeği metre başına sabit.
- Su: renk motorda, `normal` map yalnız dalga taşır. Caustic ayrı katman, additive.
- Köpük hattı ve sazlık: alpha'lı `PlaneGeometry`, `transparent = true`, `alphaTest` ile dither kenarı kes.
- **Yakın ağaç: kod mesh** ta ki bir Tripo GLB §8'i geçene kadar (`pipeline.md` §5.1). Billboard / `Sprite` yalnız ince bitki ve uzak silüet.
- GLB: `src/world/gltf.ts` `loadGltf` + `tintGltf`. Tripo albedo varsayılanı kullanılmaz.
- Lotus ve uzak bitki: `Sprite` (billboard) — yakın plandaki lotus geometriyle, uzaktaki sprite ile.
- Spritesheet: `NearestFilter`, sabit kare oranı (§5).
- Gökyüzü: altın saat açık gökyüzü olduğu için gerçek skybox anlamlı — `sky_goldenhour` küre/kutu içine; uzak tepeler ayrı backdrop katmanı, `scene.fog` ile birlikte.
- **Unutuş efekti [P]:** shader/post katmanı — doygunluk düşüşü + süt beyazı **vinyet** + sis mesafesi kısalma + en son ≤3 px bulanıklık. Texture'a boyanmaz, çalışma zamanında uygulanır (`art-bible.md` §4, `docs/design/gdd-memory-system.md` §9). Ekran **karartılmaz**.
- **İç göl [P]:** aynı su shader'ı ama köpük ve caustic katmanı olmadan, daha durgun ve yeşilimsi — oyuncu bakarak "burası deniz değil" diyebilmeli.

---

## 7. Asset manifest — shipping artifact

**[A] Bağlayıcı.** Higgsfield'ın kendi resmi game-generation skill'i üretilen her asset'i `design/assets.csv` içinde tutuyor ve **bu dosyayı oyunla birlikte gönderiyor** (`docs/research/ai-pipeline-games.md` §6, Çıkarım 3). Bizde karşılığı: **`public/assets/assets.csv`** — build ile birlikte yayına çıkar.

**Gerekçe [A]:** yeniden üretilebilirlik olmadan AI asset hattı ikinci iterasyonda çöker. "Bu dosya nasıl üretilmişti" sorusunun cevabı dosyada durmalı.

Zorunlu kolonlar:

```csv
asset_id,file,category,class,prompt_file,model,seed,aspect,resolution,date,status,notes
```

- `prompt_file` — `docs/art/prompts/` altındaki şablon
- `model` — üretimi yapan model (ajan seçtiği için **sonradan** yazılır; boş bırakılamaz)
- `seed` — varsa; yoksa `none` yazılır, tahmin edilmez
- `status` — `generated` / `accepted` / `integrated`

**[P]** Manifest satırı olmayan dosya `public/assets/` altında bulunamaz. QA kapısı (§1.1) bunu kontrol eder.

**[A] AI beyanı:** bu sahnede norm AI kullanımını gizlemek değil, **belgelemek** (jam'lerin "AI Tools Used" zorunlu alanları; *To the Abyss* oyun içi disclosure). Manifest bu beyanın altyapısıdır; yayına çıkarken oyun içinde de kısa bir künye verilir **[?]**.

---

## 8. Kabul kapısı (QA checklist)

**[K]** Kapının sebebi: *"Review against the spec, not your taste."* Maddeler **[P]**.

Hiçbir çıktı bunların hepsini geçmeden `public/assets/` altına girmez:

- [ ] `art-bible.md` §2 paletine ve §3 ışık felsefesine uyuyor (göz kararı değil, hex kontrolü)
- [ ] `asset-registry.md` içinde satırı var, durumu güncellendi
- [ ] **`public/assets/assets.csv` satırı dolduruldu — prompt + model + seed** (§7)
- [ ] İsimlendirme kuralına uyuyor (§6)
- [ ] Tileable olması gerekiyorsa dikiş yok (2×2 döşeyip bak)
- [ ] Boyut ve çözünürlük bütçede (§6)
- [ ] Spritesheet ise döngü başı-sonu birleşiyor, elle temizlikten geçti (§5) **[A]**
- [ ] **GLB ise** dokusuz (veya albedo ışık taşımıyor), poly bütçede (`models/` ≤ 400 KB), 1 birim ≈ 1 m, `tintGltf` ile palet (§5.1)
- [ ] **[K]** IP temiz: logo yok, marka izi yok, gerçek oyun adı yok, HUD dışında ekran yazısı yok
- [ ] **[K]** Fotogerçekçi değil (*"NOT photoreal"*)
- [ ] **[P]** Unutuş efekti texture'a gömülmemiş (çalışma zamanında uygulanır)
- [ ] **[P]** `docs/design/` ile çelişmiyor: HUD'da unutuş barı yok, can barı yok, olgunluk ikonla gösterilmiyor
- [ ] **[P]** `npm run test:assets` koşuldu ve sonucu kayda geçti — manifest (§7) / isimlendirme (§6) / indirme bütçesi (§6) kontrolü. Ayrıntı: `docs/production/asset-testing-platform.md`. **Bu, yukarıdaki listenin yalnızca ölçülebilir yarısıdır**; "NOT photoreal", "IP temiz", "döngü başı-sonu birleşiyor", "unutuş texture'a gömülmemiş" maddeleri makine kararı değildir ve insan/sahip kapısı olarak burada kalır.

---

## 9. Makaleden sapmalarımız (bilinçli, kayda geçmiş)

| Konu | Makale | Bizde | Gerekçe |
|---|---|---|---|
| Oyun | Glowsprig — aydınlık koru platformer | **Lotus Adası** — Odysseia IX, lotus toplama + unutuş | sahip kararı, 2026-08-14 |
| Render | HTML5 Canvas 2D | **Three.js 3D** | sahip kararı |
| Higgsfield rolü | medya motoru | medya motoru **+ [P]** oyun içi doku adayı **+ [A]** animasyon kaynağı | sahne ihtiyacı; **[?]** onay bekliyor |
| Animasyon | yok | **[A]** still → video → frame → quantize → spritesheet | araştırmadan gelen saha pratiği |
| Manifest | yok (skill'de var) | **[A]** `public/assets/assets.csv` shipping artifact | yeniden üretilebilirlik |
| Doküman | *"Do NOT write extra markdown"* (kurulum brief'i) | `docs/art/` altında 4 doküman | sahip açıkça istedi |
| Art bible yolu | — | `docs/art/art-bible.md` | CCGS `art-bible` skill'i `design/art/` şart koşar; skill çalıştırılırsa buraya yönlendirilir |

---

## 10. Sıradaki adım

1. **KAPI 1 — Intake:** art bible §2 paletini ve §4 unutuş estetiğini onayla; sondaki onay listesindeki **[?]** maddeleri kapat. `docs/design/` dokümanları da onay bekliyor.
2. Higgsfield MCP'yi bağla (§3).
3. `asset-registry.md` **P0** satırlarını üret: Doryseus turnaround → lotus 4 aşama sayfası → ada key art.
4. Her çıktıyı §8 kapısından geçir, `assets.csv` satırını yaz, registry durumunu güncelle.
