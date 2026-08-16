# Asset prompt playbook — Lotophagoi

> **Bu dosya ne değildir:** `docs/art/pipeline.md`'nin tekrarı değil. Pipeline zaten söylüyor: üç katmanlı sistem (§1), Higgsfield'ın ne üretip ne üretmediği (§2), erişim durumu (§3), sekiz bloklu prompt anatomisi (§4), animasyon hattı (§5), klasör/isimlendirme (§6), manifest (§7), kabul kapısı (§8). Bu dosya onları **varsayar** ve iki somut boşluğu kapatır: (A) uçtan uca **operasyonel** akış — sahip'in "profesyonel asset üretme pipeline'i" isteği — ve (B) **kopyala-yapıştır kullanılabilir örnek promptlar**, özellikle "aynı karakterin/objenin varyasyonlarını tutarlı üretme" tekniği.
> **Tasarım otoritesi:** yok — bu bir görsel/pipeline dosyası, `docs/design/` hiçbir yerde ezilmiyor (CLAUDE.md "Design authority").
> **Bağlayıcı çerçeve:** `docs/art/pipeline.md`, `docs/art/art-bible.md`, `docs/art/prompts/_anatomy.md`. Çelişki varsa onlar kazanır, bu dosya güncellenir.
> **Higgsfield MCP durumu:** hâlâ bağlı değil. Bu dosyadaki her adım ve her prompt **MCP'siz** çalışır — sahip'in web arayüzüne yapıştırması ya da `scripts/gen-assets.mjs` / `scripts/gen-gemini-image.mjs` ile çalıştırması yeterli. MCP bağlandığında değişen tek şey açılış cümlesi (`Using Higgsfield…` yerine `Using Gemini…`) ve model seçiminin ajana bırakılması — prompt gövdesi aynı kalır.
> **Etiketler:** `docs/art/pipeline.md` ile aynı sözleşme — **[K]** kaynak makalede var · **[A]** araştırmada doğrulanmış saha pratiği · **[P]** proje kararı · **[?]** onay bekliyor.

---

## Part A — Uçtan uca üretim akışı (solo geliştirici, gerçekçi)

### A0. Beş adım, tek cümlede

**Konsept kilidi (tek "çapa" görsel) → prompt yazımı (sabit bloklar + değişken blok) → üretim (script/web) → seçim + §8 kapısı → entegrasyon + manifest.**

Aşağıdaki alt bölümler her adımı somutlaştırıyor; A3'teki teknik, görev talimatının işaret ettiği asıl boşluğu kapatıyor.

---

### A1. Konsept kilidi — **tek çapa görsel, N ayrı çağrı değil**

**Bu, sahip'in istediği "aynı karakterin/objenin farklı varyasyonlarını tutarlı üretme" sorusunun cevabı.**

Bu projede zaten üç kez kanıtlanmış bir teknik var — ama hiçbir yerde adı konmamış bir kural olarak yazılı değildi. Kanıt (`docs/art/asset-registry.md`):

| Örnek | Teknik | Sonuç |
|---|---|---|
| **ASSET-001** (Doryseus turnaround) | 4 açı (ön/¾/profil/arka) **tek karede**, tek prompt çağrısı | 4 görünüm aynı üretimden geldiği için oran/kıyafet/sakal otomatik tutarlı — ayrı ayrı 4 çağrı yapılsaydı her seferinde farklı bir adam çıkma riski vardı |
| **ASSET-002** (lotus 4 aşama) | 4 büyüme evresi **tek karede**, sıralı (bud→half→ripe→wilt) | Aynı çiçek formu, aynı kamera açısı, aynı ölçek referansı — oyunun "çekirdek okuma problemi"nin (olgunluk silüetle ayırt edilsin) çözümü bu tutarlılığa dayanıyor |
| **ASSET-037** (Hub 3 ada) | 3 ada **tek sayfa**, "aynı çizim elinden çıkmış hissi" açıkça prompt'ta istendi | Kabul kriteri zaten bunu adlandırıyor: *"üç ada aynı çizim elinden çıkmış hissi — aynı çizgi kalınlığı, aynı ışık yönü, aynı doygunluk"* |

**Neden bu, seed'den daha güvenilir bir teknik (bu projede):** `scripts/gen-assets.mjs` ve `scripts/gen-gemini-image.mjs`'i okudum — ikisi de Gemini `generateContent` çağrısında **seed parametresi göndermiyor** (`generationConfig` yalnızca `responseModalities` ve `imageConfig.aspectRatio` taşıyor). `assets.csv`'deki her satırda `seed=none` yazması bir eksiklik değil, **doğru bir dürüstlük** — olmayan bir mekanizmayı var gibi göstermemek. Yani bugün elimizdeki gerçek tutarlılık aracı seed reuse değil, **tek-çağrıda-çoklu-varyant** kompozisyonu. Detay B10'da.

**Operasyonel adım:**
1. Konu (karakter/obje/lotus/ada seti) için TEK bir prompt yaz — tüm varyantları aynı karede, aynı kamera/ışık talimatıyla iste (`_anatomy.md`'nin `character-turnaround.md` ve `concept-sheet.md` şablonları bu deseni izliyor).
2. 4 varyant üret (`docs/art/prompts/character-turnaround.md`'daki kural: "4 üretim, sahip seçer").
3. Sahip **tek bir sayfayı** kilitler (ASSET-001 = varyant 04, ASSET-002 = varyant 02 — emsal).
4. O sayfa artık **çapa** — `art-source/ref/`'e gider, sonraki hiçbir prompt onu yeniden üretmeye çalışmaz; ondan **kırpılır** (bkz. A5).

**Bunun işe yaramadığı yer:** hareketli varyantlar (yürüme/koşu/toplama — video). Orada çapa still'den **image-to-video** ile devam edilir (A3).

---

### A2. Prompt yazımı — sabit blok + değişken blok ayrımı

`_anatomy.md` zaten sekiz bloğu ve dört sabit metni (STYLE, CHARACTER, SETTING, LOOK+IP) tanımlıyor. Operasyonel kural, hangi kısmın **harfiyen aynı kalacağını**, hangisinin **kontrollü değişeceğini** netleştirmek:

| Blok | Varyantlar arasında | Nasıl uygulanır |
|---|---|---|
| STYLE (1) | **Byte-identical** — kelimesi kelimesine kopyala-yapıştır | `_anatomy.md`'den doğrudan al, parafraz etme |
| CHARACTER/OBJECT tanımı (4) | **Byte-identical**, yalnızca poz/görünüm son cümlesi değişir | Örn. Doryseus'un kıyafet/sakal/çanta cümlesi hep aynı; "front view, walking" vs "back view, walking" gibi tek son cümle değişir |
| LOOK + IP (8) | **Byte-identical** | Palet ve IP satırı hiçbir zaman elle yeniden yazılmaz |
| Çekim/Setting/Motion (2,6,7) | **Değişken** — asıl varyasyon burada yaşar | Kamera açısı, aşama tarifi, yön |

Pratik sonuç: bir "anchor.txt" mantığı kur — CHARACTER/STYLE/LOOK bloklarını tek bir yerde (zaten `_anatomy.md`) tut, her yeni prompt dosyasını o bloklardan **kopyalayarak** başlat. Elle yeniden yazmak (aynı fikri farklı kelimelerle ifade etmek) görünüşte küçük bir fark yaratır ama modelin çıktısında fark edilir tutarsızlığa dönüşür — bu, ASSET-016/032'nin ilk denemesinin reddedilme nedenlerinden biriyle aynı aile (davetsiz motif sızması, `asset-registry.md` ilgili satırlar).

---

### A3. Üretim — bugünkü (Gemini) ve gelecekteki (Higgsfield MCP) yol

**Bugün, still için:**
```bash
node scripts/gen-assets.mjs image --prompt-file art-source/work/prompt-asset-0NN-name.txt --aspect 1:1 -o art-source/raw/kategori_ad_01_kanal_çözünürlük.png
```
veya `scripts/gen-gemini-image.mjs` (bir markdown şablonundan `## Prompt — Gemini` bölümünü otomatik çıkarır — `character-turnaround.md`/`concept-sheet.md` gibi dosyalar için).

**Script zaten manifest satırını taslaklıyor** — bu, A/§7 entegrasyonunun somut kanıtı: `gen-assets.mjs` her başarılı üretimden sonra konsola şunu basıyor:
```
assets.csv row to add (docs/art/pipeline.md §7) once this passes the §8 acceptance gate:
<id>,<final path under public/assets/>,<category>,<class>,<prompt_file>,<model>,none,<aspect>,<resolution>,<date>,generated,
```
Yani **model adı, tarih ve seed=none satırı elle hatırlanmaz, script'ten kopyalanır** — tek elle doldurulan alan `asset_id`, kategori/sınıf ve §8'den geçtikten sonraki `notes`. Bu, "manifest nasıl entegre olur" sorusunun operasyonel cevabı: üretim komutunun çıktısı zaten yarı-dolu bir CSV satırı.

**Bugün, hareketli varyant için (still → video):**
```bash
node scripts/gen-assets.mjs video --prompt-file art-source/work/prompt-asset-0NN-walk-dir.txt --image art-source/ref/char_doryseus_turnaround_01_ref_2048.png --aspect 16:9 --seconds 8 -o art-source/raw/char_doryseus_walk_dir_clip.mp4
```
`--image` parametresi Veo'ya **başlangıç karesi** olarak çapa still'i verir — bu, video varyantları arasındaki tutarlılığın gerçek mekanizması (ASSET-024/045/046/050/051 hepsi aynı ASSET-001 çapasından türedi, `asset-registry.md` P1 — Karakter tablosu). `--last-frame` döngü kapanışı için var (§5'in "döngünün başı-sonu birleşmeli" kuralını destekler).

**Higgsfield MCP bağlandığında (pipeline.md §3):** aynı prompt gövdesi kullanılır, yalnızca açılış `Using Higgsfield, generate this as a <video/image>…` olur ve model seçimi ajana bırakılır (`Pick the best model for…`). Makalenin vaat ettiği ek yetenek — **"character training" / karakterin planlar arası tutarlı tutulması** — bu projenin bugün elle yaptığı işi (tek-sayfa + image-to-video çapa) otomatikleştirecek, ama henüz doğrulanmadı; bağlanınca test edilmeli.

---

### A4. Seçim / kalite kontrolü

`pipeline.md` §8'in tam listesini tekrar etmiyorum — o liste bağlayıcı ve zaten var. Buraya eklenen tek pratik adım: **çapaya karşı fark kontrolü**. Bir varyant kabul edilmeden önce:

1. Çapa (turnaround/concept sheet) yan yana açılır.
2. Silüet karşılaştırılır (renk kapatılıp bakılır — art-bible §2 "renk körlüğü" maddesiyle aynı disiplin).
3. Palet karşılaştırılır — göz kararı yerine art-bible §2 hex listesine bakarak (B0 tablosu bu karşılaştırmayı hızlandırmak için var).

Bu adım, ASSET-016/032'nin neden reddedildiğini (davetsiz motif, yanlış ton) daha erken yakalardı — retrospektif olarak asset-registry'deki "ilk deneme reddedildi" notlarının hepsi bu kontrolün eksikliğine işaret ediyor.

---

### A5. Entegrasyon — sayfadan tek dosyaya

Çoklu-varyant sayfa deseni (A1) bir maliyet doğurur: sayfanın kendisi genelde **oyuna giren dosya değildir** (opak/alpha'sız arka plan). Kurulu yol:

1. Sayfa `art-source/ref/`'e gider (asla `public/assets/`'e doğrudan girmez).
2. Kırpma + alpha-key: `scripts/sheet-from-still.mjs` (still → 4 yönlü sprite, kenar flood-fill) ya da elle kırpma + renk-mesafe alpha-key (ASSET-004..007, ASSET-009, ASSET-013, ASSET-020 hepsi bu ikinci yoldan geçti — raw dosyalarda "alpha" adı olsa da gerçek alpha kanalı çoğu zaman yoktu, bu normal ve beklenen bir adım).
3. PNG → WebP (§6 boyut bütçesi) — ASSET-022'nin 952 KB → 12 KB'a inmesi gibi.
4. İsimlendirme §6'ya göre (`kategori_ad_varyant_kanal_çözünürlük.ext`).

### A6. Manifest kaydı — sayfa → çoklu satır kuralı (biçimsel netleştirme)

`pipeline.md` §7 zorunlu kolonları tanımlıyor ama bir sayfadan kaç satır çıkacağını söylemiyor. Mevcut pratik (assets.csv'de zaten uygulanmış, burada **adlandırılıyor**):

- **Bir sayfadan kırpılan her dosya kendi `asset_id`'sini alır**, ama `prompt_file`, `model`, `seed` **aynı sayfa satırında birebir tekrar eder** (örnek: ASSET-004..007 dördü de `prompt_file=art-source/work/prompt-asset-002-lotus-stages.txt`).
- `notes` alanına **hangi sayfadan, hangi kırpma/alpha-key adımıyla** geldiği yazılır (örnek: *"ASSET-002 sheet'inden kirpildi + alpha-key (...)"*). Bu, resmi bir "parent_sheet" kolonu icat etmeden aynı işi görüyor.
- **[P][?] öneri, sahip onayı gerekir:** bu konvansiyonu `pipeline.md` §7'ye tek satırlık bir not olarak eklemek (yeni zorunlu kolon değil, yalnızca mevcut pratiğin dokümante edilmesi) — bunu ben tek başıma pipeline.md'ye yazmıyorum çünkü o bağlayıcı bir doküman; sahip onaylarsa `technical-director` ya da ben bir sonraki turda ekleriz.

---

## Part B — Prompt kararlılığı: kopyala-yapıştır örnekler

### B0. Hex → prompt dili çeviri tablosu

Art-bible §2'deki hex'ler prompt'a **isim + hex birlikte** yazılır — model hex'i okumaz ama isim+hex ikilisi hem insan hem model için çapa olur (art-bible ile prompt arasında tek doğruluk kaynağı kalır).

| Art-bible rolü | Hex | Prompt dilinde karşılığı |
|---|---|---|
| Sığ turkuaz | `#3fc8c0` | `turquoise shallow water (#3fc8c0)` |
| Sığ parlak | `#6fe0d4` | `bright sunlit turquoise (#6fe0d4)` |
| Lazuli derin | `#14507f` | `deep lapis blue toward the horizon (#14507f)` |
| Köpük | `#fbf7ef` | `warm off-white foam line (#fbf7ef)` |
| Altın kum | `#e8c98a` | `warm golden sand (#e8c98a)` |
| Tebeşir beyazı kaya | `#e6e2d4` | `bright chalk-white rock (#e6e2d4), never a dark surface` |
| Olgun pembe (lotus 3) | `#f78fae` | `the most saturated bright coral-pink of the whole scene (#f78fae), faintly lit from within` |
| Solmuş kahve (lotus 4) | `#8e6f4e` | `desaturated dull brown (#8e6f4e), all pink gone` |
| Ağarmış ahşap (gemi) | `#c8b49a` | `sun-bleached pale wood (#c8b49a), cooler than everything around it` |
| Serin gölge | `#5f7fa8` | `cool blue shadow (#5f7fa8) — never black, never neutral grey` |
| Unutma pusu | `#f6f2ea` | `milk-white haze (#f6f2ea) — never black, never a dark vignette` |

**Kural:** bir hex art-bible §2'de yoksa prompt'a girmez (art-bible §8 "palet dışı renk yasak"). Yeni bir ton gerekiyorsa önce art-bible güncellenir, sonra prompt yazılır — sıra ters çevrilmez.

---

### B1. Sabit stil tanımlayıcı + tam negatif disiplin (tek başına kullanılabilir şablon)

Bu blok her prompt'un **ilk ve son** cümlesidir — "aynı sanatçının elinden çıkmış" hissi büyük ölçüde bunun harfiyen tekrarından gelir.

```text
Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal, NOT photographic, NOT a real-world texture photo).

[... değişken gövde ...]

Look: sun-drenched Aegean island at golden hour, cool blue shadows (#5f7fa8) — never black, never neutral grey. Soft bloom, warm color grade, low surface noise. NOT photoreal, no film grain, no realistic skin, no realistic sand/water photo texture.

Strictly avoid: logos, brand marks, real game titles, any on-screen text or numbers beyond the game HUD, symmetrical centered "epic fantasy concept art" composition, generic scattered sparkle/glow VFX, purple or neon color accents, dark cave palette, red or orange "danger" framing, health bars, damage flashes, screen darkening/vignette-to-black, flickering or strobing transitions. Original characters and world only — no resemblance to any existing game, film, or franchise.
```

Bu son paragraf, `art-bible.md` §9'daki tüm proje yasaklarının (jenerik AI look, karanlık mağara paleti, siyah gölge, doygun neon, ekran karartma, can barı, yanıp sönme) **tek bir negatif blokta** toplanmış hâli — `_anatomy.md`'nin "negatif cümle içinde geçer" kuralına uyuyor (ayrı blok değil ama tek bir tekrarlanabilir paragraf).

---

### B2–B5. Aynı asset'in 4 varyasyonu — lotus büyüme evreleri (tek tek yeniden üretim senaryosu)

**Ne zaman kullanılır:** ASSET-002 sayfası zaten kabul edildi (sahip varyant 02); ama örneğin yalnızca **3. aşama (olgun)** yeniden üretilmesi gerekirse — tüm sayfayı yeniden üretmek riskli (diğer 3 aşama da değişir). Bu dört prompt, aynı asset'in tek tek varyantlarını **ortak bir çapa metniyle** üretmenin şablonu; ANCHOR bölümü dört promptta **harfiyen aynı**, VARIANT bölümü tek cümle değişiyor.

**ANCHOR (dört promptta birebir aynı, kopyala-yapıştır):**
```text
Using Gemini, generate this as an image — 1:1, high quality, single game asset on a plain neutral warm-grey background, flat even studio lighting, no scene, no cast shadow, no ground. A single lotus blossom sitting on one broad green lily pad (#4f8f52) in a small patch of turquoise water (#3fc8c0), seen from the exact same three-quarter angle and the exact same scale as the reference sheet char_odysseus... [bkz. not] the accepted lotus stage sheet (lotus_stages_01_ref_2048.png) — same petal count, same lily pad shape, same camera angle.
```
> **Not:** pratikte bu ANCHOR cümlesinin sonuna, elde varsa çapa görselinin dosya adı yazılır ve (script `--image` destekliyorsa) o dosya girdi olarak eklenir; bugünkü `gen-assets.mjs` still-üretiminde image-girdisi henüz yok (yalnızca video path'inde var, A3) — bu yüzden metinsel referans ("same as the reference sheet") + palet/hex tekrarı, gerçek image-to-image'in yokluğunda en güçlü elde bulunan çapa.

**B2 — VARIANT (aşama 1, tomurcuk):**
```text
BUD stage: tightly closed, a narrow upright spear, pale green-cream (#cfd8b8), fully desaturated — nothing pink visible.

No HUD, no text, no numbers, no labels, no watermark.

Look: stylized-cartoon game asset, soft-shaded rounded forms, clean flat colors. Cool blue shadows (#5f7fa8), never black. NOT photoreal. Original plant design only — no logos, no brand marks, no text.
```

**B3 — VARIANT (aşama 2, yarı açık):**
```text
HALF-OPEN stage: petals part and the pink interior (#f6a8bc) becomes visible for the first time, silhouette widening into a cup shape.

No HUD, no text, no numbers, no labels, no watermark.

Look: stylized-cartoon game asset, soft-shaded rounded forms, clean flat colors. Cool blue shadows (#5f7fa8), never black. NOT photoreal. Original plant design only — no logos, no brand marks, no text.
```

**B4 — VARIANT (aşama 3, olgun — adanın en doygun rengi):**
```text
RIPE stage: fully open, the widest silhouette of the set, petals fanned flat and wide in the most saturated bright coral-pink of the whole island (#f78fae), with a warm inner glow (#fff4e2) at the center as if faintly lit from within. This is the "pick me" stage — it says so with COLOR and SILHOUETTE alone, no icon, no marker, no sparkle overlay.

No HUD, no text, no numbers, no labels, no watermark.

Look: stylized-cartoon game asset, soft-shaded rounded forms, clean flat colors. Cool blue shadows (#5f7fa8), never black. NOT photoreal. Original plant design only — no logos, no brand marks, no text.
```

**B5 — VARIANT (aşama 4, solmuş):**
```text
WITHERED stage: petals sag and droop down past the lily pad, silhouette collapsed downward, saturation gone, color fallen to a dull desaturated brown (#8e6f4e) — no pink remains.

No HUD, no text, no numbers, no labels, no watermark.

Look: stylized-cartoon game asset, soft-shaded rounded forms, clean flat colors. Cool blue shadows (#5f7fa8), never black. NOT photoreal. Original plant design only — no logos, no brand marks, no text.
```

**Neden bu iş görür:** dört promptun ANCHOR'ı kelimesi kelimesine aynı (kamera açısı, arka plan, yaprak/su tarifi, kapanış Look+IP paragrafı) — değişen tek şey VARIANT'ın renk/silüet cümlesi. Model her çağrıda "aynı sahneye farklı bir çiçek durumu" görüyor gibi davranıyor; tutarlılık seed'den değil **metin tekrarından** geliyor. Riziko: tek-sayfa yöntemi (A1) kadar güçlü değil çünkü dört ayrı çağrı — kamera/ölçek küçük sapabilir; bu yüzden **varsayılan yöntem hâlâ tek-sayfa** (ASSET-002 zaten böyle üretildi), bu dörtlü yalnızca "sayfanın tek bir karesini tek başına yeniden üretme" ihtiyacı doğduğunda kullanılır.

---

### B6–B9. Aynı asset'in 4 varyasyonu — Doryseus yürüme yönleri (video/spritesheet)

Bunlar **still değil, video** üretimi (`pipeline.md` §5 hattı) — ama aynı "ortak anchor + değişken son cümle" mantığı. Gerçek kullanılan dosyalar zaten bu şablonu izliyor (`asset-registry.md` ASSET-024/045/046/050/051); burada şablon metni olarak yeniden yazıyorum.

**ANCHOR (dört yön promptunda birebir aynı):**
```text
Using Gemini (Veo), generate this as a video — 16:9, 8 seconds, high quality, looping walk-cycle reference clip. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

The SAME character from the attached reference image, animated as a calm, deliberate walk cycle in place (no forward travel, character stays centered in frame): Doryseus — a lean weathered Bronze Age captain, sun-worn off-white linen tunic (#c8b49a) with a faded ochre band, leather belt and sandals, short dark beard, a plain cloth satchel at his hip. Sober, upright posture — NOT drunk, NOT stumbling, pelvis level.

Flat even lighting matching the reference sheet, plain neutral background, no scene, no HUD, no text, no watermark.
```
> Bu ANCHOR'ın "attached reference image" cümlesi gerçek — `gen-assets.mjs video` çağrısına `--image art-source/ref/char_odysseus_turnaround_01_ref_2048.png` verilir (A3), yani burada metinsel referans **image-to-video** ile birleşiyor; still varyantlarından (B2-B5) daha güçlü bir çapa mekanizması.

**B6 — VARIANT (ön):**
```text
Camera: locked-off front view, character facing the camera throughout the loop.

Look: stylized-cartoon game character animation, soft-shaded rounded forms, clean silhouette against a plain background. Cool blue shadows (#5f7fa8), never black. Original character only — no logos, no brand marks, no text.
```

**B7 — VARIANT (arka):**
```text
Camera: locked-off back view, character facing away from the camera throughout the loop, weight shifting evenly between both feet.

Look: stylized-cartoon game character animation, soft-shaded rounded forms, clean silhouette against a plain background. Cool blue shadows (#5f7fa8), never black. Original character only — no logos, no brand marks, no text.
```

**B8 — VARIANT (sağ profil):**
```text
Camera: locked-off right-side profile view, character walking in place facing screen-right.

Look: stylized-cartoon game character animation, soft-shaded rounded forms, clean silhouette against a plain background. Cool blue shadows (#5f7fa8), never black. Original character only — no logos, no brand marks, no text.
```

**B9 — VARIANT (sol profil — not: pratikte üretilmez):**
```text
[Bu yön gerçekte ayrıca üretilmiyor — asset-registry.md notu: "sol yön aynı sheet + flip". Sağ profil klibi (B8) üretilip Three.js/kırpma script'inde yatay flip uygulanıyor. Simetrik bir insan silüeti için 4. video çağrısını atlayıp üretim maliyetini yarıya indiren bilinçli bir karar — burada B9'u "üretilmeyen ama üretim maliyetini düşüren teknik" olarak kaydediyorum, sahte bir prompt uydurmuyorum.]
```

---

### B10. Seed / referans görsel tutarlılığı — dürüst durum özeti

Görev talimatı "Higgsfield/Gemini'nin buna izin verdiği mekanizma" diye sordu; kod okuması sonrası net cevap:

| Mekanizma | Bu projede bugün var mı? | Kanıt |
|---|---|---|
| **Seed reuse (still)** | **Hayır** — `gen-assets.mjs`/`gen-gemini-image.mjs` `generationConfig`'e seed göndermiyor | Script kaynağı okundu; `assets.csv`'de tüm satırlar `seed=none` — bu bilinçli dürüstlük, gizlenen bir eksik değil |
| **Tek-sayfa çoklu-varyant (still)** | **Evet, kanıtlanmış** | ASSET-001, ASSET-002, ASSET-037 (A1) |
| **Metinsel anchor tekrarı (still)** | **Evet** | B2-B5 |
| **Image-to-image (still girişi)** | **Hayır, henüz script'e bağlanmamış** — Gemini'nin multimodal `generateContent`'i teknik olarak girdi görseli kabul edebilir ama `gen-assets.mjs`'in still yolu bunu göndermiyor | Kod okundu — yalnızca `contents:[{parts:[{text:prompt}]}]`, `inlineData` yok |
| **Image-to-video (başlangıç karesi)** | **Evet, kanıtlanmış** | `gen-assets.mjs video --image <path>` — B6-B8'in gerçek çapası |
| **Higgsfield "character training"** | Vaat edilmiş **[K]** ama MCP bağlı değil, doğrulanmamış | `pipeline.md` §3 |

**[P][?] öneri:** `gen-assets.mjs`'in still yoluna bir `--ref-image` bayrağı eklemek (Gemini'nin girdi görseli kabul eden multimodal uç noktasına `inlineData` göndererek) still tutarlılığını image-to-video seviyesine çıkarabilir. Bu bir **script değişikliği** — art-director'ın yazacağı iş değil (CLAUDE.md "shader/rendering code yazma" kısıtına yakın bir alan, script katmanı ama yine de kod); `gameplay-programmer` ya da `technical-director`'a önerilmeli, sahip onayı ile.

---

### B11. Vaka analizi — ASSET-052 (Hub storybook arkaplanı), neden işe yaradı

`asset-registry.md`'den gerçek kayıt: **kabul edildi**, tek denemede (revizyon geçmişi yok — çoğu diğer texture 1-2 kez reddedilirken bu ilk seferde geçti). Gerçek kullanılan prompt (`art-source/work/prompt-hub-concept-b-storybook.txt`):

```text
Stylized-cartoon next-gen game graphics: bright, glossy, soft-shaded, rounded, colorful. NOT photoreal.

A single, complete storybook atlas page — one full painted illustration filling the entire frame, no empty space. A soft, painterly hand-illustrated bird's-eye view of a warm Aegean archipelago: golden hills, tiny painted olive and cypress trees, a turquoise sea with gentle painted waves, small clusters of Greek-style architecture, all rendered like a page from a beautifully illustrated children's storybook atlas. The whole illustration is bordered by an organic frame painted directly into the piece — intertwining olive branches and laurel leaves picked out in gold leaf, soft and botanical rather than geometric, with warm cream parchment texture visible only at the very edge.

Palette strictly: warm gold (#e8c98a), amber (#c99a3c), warm cream (#c8b49a, #fdf3f0), turquoise sea (#3fc8c0, #6fe0d4), soft olive green (#6b7f4a, #93964f). No purple, no blue-violet, no cold neon tones.

Soft painterly illustration style, gentle and inviting, golden-hour light. No characters, no people, no ships, no text, no numbers, no labels, no logos, no brand marks, no real game titles.
```

**Neden işe yaradı (üç somut sebep, geriye dönük kod/registry kanıtıyla):**

1. **Hex'ler isimle birlikte, kategori kategori gruplanmış** ("Palette strictly: …") — B0'daki tabloyla birebir aynı disiplin, bu prompt'u yazan tur onu zaten uyguluyordu.
2. **"No empty space" + "filling the entire frame"** — Hub arkaplanının CSS'te `cover` ile tam kadraj kullanılacağı önceden biliniyordu (`src/ui/hud.css` `.hub-map`), yani prompt üretim hedefini entegrasyon hedefine önceden bağladı. Kompozisyon belirsizliği (`_anatomy.md`'nin bahsetmediği ama bu projenin öğrendiği bir ek disiplin) burada kapandı.
3. **Negatif liste görev-spesifik daraltıldı** ("no characters, no people, no ships") — B1'in genel negatif bloğundan farklı olarak, bu görsel özellikle **karaktersiz bir harita zemini** olacağı için jenerik "no logos/no text" listesine üç ekstra madde eklendi. Genel şablonu kopyalayıp aynen kullanmak yerine, **göreve özel** ek yasak eklemek gerektiğinde eklenmiş — kararlılık disiplinini bozmadan.

**Tek dikkat notu (registry'den):** üretilen arkaplan üstüne binen HUD metinleri (ada adı, rozet) düşük kontrasta düştü, ayrı bir CSS düzeltmesi gerekti (`ux/screens.md` §3.5 kontrast kuralı). Bu, prompt'un hatası değil — prompt görevini (zemin illüstrasyonu) doğru yaptı; UI kontrast kontrolü ayrı bir kabul kriteri olarak (B12 önerisi gibi) **üretim öncesi** planlanmalıydı. Gelecekteki "üstüne metin binecek" arkaplan promptları için öneri: prompt'un Look bloğuna `"leave visually calmer, lower-detail margins near the edges where UI text will sit"` gibi bir cümle eklemek — bu, bu playbook'un önerdiği yeni bir küçük disiplin, sahip onayı gerekmez (mevcut yasak listesini genişletmiyor, yalnızca kompozisyon ipucu ekliyor).

---

## Özet — bu dosyanın kapattığı iki boşluk

1. **"Nasıl tutarlı üretirsin" sorusu:** varsayılan yöntem **tek-çağrıda-çoklu-varyant sayfa** (A1); still-tekli-varyant gerektiğinde **metinsel anchor tekrarı** (B2-B5); video/animasyon varyantlarında **image-to-video başlangıç karesi** (A3, B6-B8). Seed reuse **bu projede bugün mevcut değil** — bu dürüstçe B10'da kayıtlı.
2. **assets.csv entegrasyonu:** `gen-assets.mjs` her üretimden sonra yarı-dolu bir CSV satırı konsola basıyor (A3); bir sayfadan çoklu dosya çıkınca `prompt_file/model/seed` tekrar eder, `notes` kaynağı anlatır (A6) — bu zaten uygulanan ama adı konmamış bir konvansiyon, burada yazılı hâle geldi.
