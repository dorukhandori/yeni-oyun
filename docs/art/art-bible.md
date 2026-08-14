# Art Bible — Lotus Adası

> **Oyun:** Homeros, *Odysseia* Kitap IX — **Lotus Yiyenler (Lotophagoi) Adası**. Olgun lotusları topla, kıyıdaki gemiye teslim et (hedef 12), unutuş dolmadan dön.
> **Durum:** **onaylandı — Intake kapısı geçildi (2026-08-14).** Üretim başlayabilir.
> **Motor:** Vite + TypeScript + Three.js 3D.
> **Tasarım otoritesi:** oynanış, karakter, HUD ve sistem davranışı `docs/design/` altındaki dokümanlara aittir (`game-concept.md`, `gdd-lotus-collection.md`, `gdd-memory-system.md`, `tuning.md`) — **çelişkide onlar kazanır.** Bu dosya yalnızca görsel dili sabitler. Sayılar `tuning.md`'den alıntıdır.
> **Pipeline:** `docs/art/pipeline.md` · **Kayıt defteri:** `docs/art/asset-registry.md`
> **Kaynak sistem:** <https://x.com/zeuuss_01/article/2085112087605342552> ("Paid partnership" — Higgsfield sponsorlu playbook).

**Etiketler:** **[K]** makalede var · **[A]** araştırmada doğrulanmış pratik · **[P]** proje kararı · **[?]** onay bekliyor.

**Yol notu [P]:** CCGS `art-bible` skill'i bu dosyayı `design/art/art-bible.md` yolunda şart koşar. Biz `docs/art/` altında topladık; o skill çalıştırılırsa bu dosyaya yönlendirilecek, ikinci kopya açılmayacak.

**Tasarım dokümanı notu:** `docs/design/` altındaki concept ve iki GDD **okundu ve bu dosyaya işlendi** (2026-08-14). `level-lotus-island.md` ve `scenario.md` henüz yok; geldiğinde §6 ortam bölümü eşitlenecek.

---

## 1. Görsel kimlik cümlesi

**Cennet gibi görünen bir tuzak: ada bunaltıcı derecede güzel, ve güzelliği ilerledikçe hafızayı silen süt beyazı bir pusa dönüşür.**

Destekleyen üç ilke:

1. **Işık davet eder, pus yutar.** Bir şey belirsizse: onu **çekici** yap. Tehdit karanlıkla değil, **fazla** güzellikle anlatılır. Oyunun düşmanı yoktur; düşman ışığın kendisidir.
2. **Stylized, asla fotogerçekçi. [K]** Makale prompt seviyesinde şart koşar: *"soft-shaded, rounded, colorful, **NOT photoreal**"*. Yumuşak gölge, yuvarlak form, düşük doku gürültüsü.
3. **Gemi tek soğuk çapadır.** Adadaki her şey sıcak ve doygun; gemi ağarmış, soluk, serin. Oyuncu "eve dönüş"ü renk sıcaklığıyla bulur — mini haritayla değil.

---

## 2. Renk paleti

**[P]** Hex değerleri bu projenin kararıdır; makale hex vermez. Referans: Ege kıyısı, günbatımına yakın **altın saat**.

### Deniz ve su

| Rol | Hex | Nerede |
|---|---|---|
| Sığ turkuaz | `#3fc8c0` | kıyıya yakın su, ayak bileği derinliği |
| Sığ parlak | `#6fe0d4` | dalga tepesi, güneş vuran sığlık |
| Lazuli orta | `#1f6fa8` | gemi çevresi, orta derinlik |
| Lazuli derin | `#14507f` | ufka doğru deniz |
| Köpük | `#fbf7ef` | dalga hattı, kıyı çizgisi |
| Caustic ışık | `#a8f0e4` | sığ su dibindeki ışık ağı |

### Kara

| Rol | Hex | Nerede |
|---|---|---|
| Altın kum | `#e8c98a` | kuru plaj |
| Islak kum | `#b8945f` | dalganın yaladığı şerit |
| Çakıl | `#9a8f7e` | kıyı taşları, patika |
| Tebeşir beyazı kaya | `#e6e2d4` | ada kayalığı — parlak, hiçbir yeri koyu değil |
| Kaya gölgesi | `#b9b6ab` | kaya çatlağı, oyuk |
| Zeytin yeşili | `#6b7f4a` | zeytin yaprağı, ada bitkisi |
| Kavruk yeşil | `#93964f` | güneşte kurumuş ot, ada zemini |
| Servi koyu | `#3d5240` | servi silueti, gölgeli ağaç |
| İç göl suyu | `#5d8f86` | tatlı su — durgun, köpüksüz, **iyileştirmez** |
| Nilüfer yaprağı | `#4f8f52` | su üstü yaprak |
| Yaprak gölgesi | `#2f6b3f` | yaprak altı, sazlık dibi |

### Lotus

| Rol | Hex | Nerede |
|---|---|---|
| Tomurcuk soluk | `#cfd8b8` | 1. aşama: soluk yeşil-krem, doygunluğu düşük |
| Taç yaprağı beyaz | `#fdf3f0` | dış yapraklar |
| Pembe | `#f6a8bc` | yaprak ucu; 2. aşamada ilk görünen iç renk |
| **Olgun pembe** | `#f78fae` | **3. aşama — adanın en doygun, en açık rengi** |
| İç ışık | `#fff4e2` | olgun çiçeğin içten hafif ışıyor gibi görünen çekirdeği |
| Solmuş kahve | `#8e6f4e` | 4. aşama: doygunluk gitti, kahverengiye düştü |

### Gemi

| Rol | Hex | Nerede |
|---|---|---|
| Ağarmış ahşap | `#c8b49a` | güverte, küpeşte |
| Ahşap gölge | `#8a7358` | tahta arası, gövde altı |
| Yelken bezi | `#efe6d2` | yelken, çadır bezi |
| Halat | `#c9a877` | halat, ağ |

### Uzak ve gökyüzü

| Rol | Hex | Nerede |
|---|---|---|
| Sisli tepe (yakın) | `#8fa5b8` | ilk sıra tepe |
| Sisli tepe (uzak) | `#6d8598` | ufuk tepesi |
| Gökyüzü zenit | `#7fb8dd` | tepe, açık mavi |
| Ufuk — altın | `#f5d29a` | günün başı (t ≈ 0) |
| Ufuk — kehribar | `#eeae6a` | günün ortası |
| Ufuk — gül | `#e08a86` | güneş batmak üzere (t → `DAY_LENGTH`) |
| Güneş halesi | `#ffcf80` | güneşin çevresi, bloom kaynağı |
| Fog | `#dfe8ee` | açık mavi-beyaz mesafe kaybı |

**Günün ilerleyişi [P]:** ufuk rengi **altın → kehribar → gül** sırasıyla düşer ve güneşin yüksekliği HUD'a bakmadan okunan asıl saat göstergesidir (`docs/design/game-concept.md` §9.1). Zenit mavisi sabit kalır — **ışık asla azalmaz.**

### Işık ve unutma

| Rol | Hex | Nerede |
|---|---|---|
| Sıcak yön ışığı | `#ffcf94` | güneşten gelen ana ışık |
| Serin gölge | `#5f7fa8` | gölgeler — **siyah değil, mavi** |
| Unutma pusu | `#f6f2ea` | süt beyazı haze (§4) |

### Anlamsal kullanım **[P]**

- **Olgun pembe (`#f78fae`)** = toplanabilir. Adanın **en doygun ve en açık** rengi bu olmalı; başka hiçbir yüzey bu doygunluğa çıkmaz. Olgunluk **ikonla değil, renk ve silüetle** okunur (`docs/design/game-concept.md` §9.4).
- **Turkuaz** = güvenli sığlık, yürünebilir su — ve tuz olduğu için **iyileştirir**.
- **Lazuli** = derin su, geçilmez. Görünmez duvar yerine renk (`game-concept.md` §9.2).
- **Ağarmış ahşap + serin ton** = gemi, teslim, eve dönüş, hafıza.
- **Süt beyazı** = unutma. Palette başka hiçbir yerde saf beyaz yoktur ki bu renk tekil kalsın.
- **Renk körlüğü [P]:** olgunluk yalnız renge bırakılmaz. Silüet zorunlu ayrımı taşır: tomurcuk dar ve dik, yarı açık kupa, **olgun en geniş ve düz**, solmuş çökmüş ve aşağı sarkmış (`docs/design/gdd-lotus-collection.md` §3.2). Unutuş sistemi ise rengi hiç kullanmaz (`gdd-memory-system.md` §9).

---

## 3. Işık ve atmosfer

- **Gökyüzü ışığı (hemisferik):** yüksek ve güçlü. Ada açık havada; gölgeler dolgun, kapanmaz.
- **Yön ışığı:** güneş, ufka yakın, sıcak `#ffcf94`. Uzun yumuşak gölgeler; gölge yönü sahnede tutarlı.
- **Su yansıması:** sudan yukarı vuran turkuaz dolgu — karakterin ve geminin alt yüzeylerini serinletir. Sahnenin üçüncü ışığı budur ve atlanmaz.
- **Kontrast:** sıcak ışık / **serin gölge**. Gölge asla nötr gri veya siyah değildir.
- **Fog [P]:** açık mavi-beyaz (`#dfe8ee`), mesafeyle artan. Uzak tepeleri yumuşatır, adayı sonsuz gösterir.
- **Post-process [P]:** yumuşak bloom (gökyüzü ve köpük eşiğinin üstünde), sıcak grade, hafif vignette. **Film grain yok** — fotogerçekçiliğe kayar.
- **Juice [K]:** *"subtle squash-and-stretch and micro-shake on landings"* — toplama ve teslim anında mikro geri bildirim.

---

## 4. Unutuş estetiği

**Oyunun kalbi bu bölüm.** Sistem tanımı `docs/design/gdd-memory-system.md` §9'a aittir ve **o kazanır**; buradaki iş o sistemin görsel karşılığını hex ve his düzeyinde sabitlemek.

**Tek cümlelik kural:** *Işık asla azalmaz, bilgi azalır.* Unutmak burada karanlık değil, **fazla ışıktır**.

Katman sırası (post-process, `gdd-memory-system.md` §9'daki sıra):

| # | Katman | Ne yapar | Sınır |
|---|---|---|---|
| 1 | **Doygunluk azaltma** | Dünyanın rengi çekilir, **ışığı çekilmez** — ada aydınlık kalır | maks %60 kayıp, eşik 50'den itibaren |
| 2 | **Süt beyazı vinyet** | Kenarlardan içeri sızan sıcak beyaz `#f6f2ea` — **siyah değil** | maks %85 opaklık, eşik 25'ten itibaren |
| 3 | **Sis mesafesi kısalma** | Uzak sis **oyuncuya doğru sürünür**; önce ufku, sonra gemi silüetini yutar | eşik 75'te gemi siste kaybolur |
| 4 | **Bulanıklık** | En son ve en hafif etki | **maks 3 px** — oyuncu önünü hep görebilmeli |

**Kurallar:**

- **Kararan ekran yasak.** Ekranı karartmak korku oyunu dili konuşur; bu oyun onu konuşmaz. Belirsizlikte sahneyi karartma, **arayüzü sil**.
- **Gemi son direnen şeydir.** Sis her şeyi yutarken gemi en uzun süre serin ve okunur kalır. Eşik 75'te o da kaybolur — ve o an oyuncunun elinde yalnızca **dalga sesi** kalır (`gdd-memory-system.md` §3.2).
- **İlk giden şey bilgidir, görüntü değil.** Sıra: konfor (ses) → navigasyon (pusula) → durum (HUD) → kontrol (yürüyüş sapması). Ters çevrilirse sistem "sarhoş simülatörü" gibi okunur ve tema ölür.
- **Ceza can kaybı değil, okuyamamadır.** Unutuş oyuncunun **yapabildiğini** kısıtlamaz, **bildiğini** kısıtlar. Toplama hızını, hasarı, yavaşlamayı görsel olarak da ima etmeyiz.
- **Renk kullanılmaz.** Unutuş rengi hiç kullanmaz — vinyet, doygunluk, sis, ses. Renk körü oyuncu için bilgi kaybı yoktur. Kırmızı flaş, hasar çerçevesi, ikon yasak.
- **Fotosensitivite:** hiçbir eşikte yanıp sönme, stroboskopik etki, ani parlaklık sıçraması yok. Tüm geçişler ≥ 1,5 s.
- **Çalışma zamanında uygulanır.** Vinyet, doygunluk, sis ve bulanıklık **texture'a boyanmaz**. Asset'ler her zaman "unutuş = 0" halinde üretilir (`pipeline.md` §8).
- **Geri dönüş hızlı ve okunur.** Denize girince veya teslim edince etki belirgin biçimde geri çekilir; oyuncu "aklım başıma geldi"yi görsel olarak almalı. Kalıcı bozulma yok.

### 4.1 Bayılma katmanı — ek (14 Ağu 2026, sahip kararı, playtest geri bildirimi)

Sahip'in playtest sonrası geri bildirimi ("bayılmaya doğru, uykuya doğru çekiyormuş gibi") üzerine mevcut dört katmana **iki ince, isteğe bağlı katman** eklendi. Karar dokümanı: `docs/design/hallucination-reframe-concept.md`. Tasarım otoritesi `gdd-memory-system.md` §9.1'de karara bağlandı — bu bölüm onun görsel/hex düzeyindeki karşılığı.

1. **Çift görüntü (ghosting)** — ekranın **kenarlarında** (merkez netliği korunur), yüksek unutuşta hafif gecikmeli bir ikinci görüntü katmanı (`FX_GHOST_OFFSET`, `tuning.md` §5.4). "Gözlerini açık tutamama" hissi — **bulanıklığın (`FX_BLUR`) bir kardeşi**, ondan daha küçük genlikte kalır, onunla yarışmaz.
2. **Nefes ritmi** — süt beyazı vinyetin opaklığı sabit değil, çok yavaş (`FX_BREATH_PERIOD` = 5 s) ve çok küçük genlikte (`FX_BREATH_AMPLITUDE`, ~%4-5) bir "nefes alma" ile dalgalanır.

**Bu iki katman şu kilitli kuralların hiçbirini ihlal etmiyor:** kararan ekran yasağı (ikisi de netlik/vinyet ailesinde, karartma değil), fotosensitivite (periyotlar saniyelerle ölçülüyor, ani sıçrama yok — ≥1,5 s kuralına zaten uyan mevcut katmanların üstüne biniyor), renk kısıtı (yeni bir hex ailesi getirmiyor — ghosting mevcut görüntünün kendi kopyası, nefes ritmi mevcut `#f6f2ea` vinyetinin opaklık salınımı). **Işık asla azalmaz** ilkesi de korunuyor — ikisi de netlik/doku katmanı, ışık şiddeti katmanı değil.

**Sanrı figürleri (yeni, yalnızca Lotus Adası):** unutuş yüksek bir eşiği geçtiğinde (`HALLUCINATION_THRESHOLD`, `tuning.md` §13), az sayıda (3) yarı-saydam, silüet-bazlı figür sahneye giriyor. Tasarım otoritesi `docs/design/gdd-lotus-hallucination.md`'de. Görsel dil için:

- **Palet:** unutma pusuyla (`#f6f2ea`) **aynı aile** — yeni bir renk ailesi getirilmiyor, §2/§9'daki "palet dışı renk yasak" kuralına uyuluyor.
- **Form:** dolu bir 3D mesh değil, dumanlı/yarı-saydam bir "izlenim" — §5'in "stylized, asla fotogerçekçi" ilkesiyle uyumlu; parçacık sistemi veya billboard sprite ile üretilebilecek kadar hafif (aynı anda en fazla 3 tane).
- **Kesinlikle kullanılmayacak:** Kiklop'un kehribar/turuncu kenar parıltısı (`gdd-detection-cyclops.md` §3.3) — bu, o sistemin kendi işareti; iki durak farklı olsa da görsel diller kasıtlı olarak ayrışık tutuluyor, oyuncu ilerde iki sistemi karıştırmasın.
- **Kesinlikle kullanılmayacak:** kırmızı/turuncu "tehlike" rengi, keskin kontur, düşman silüeti dili (§9 yasaklarıyla aynı gerekçe — bu figürler görsel olarak da "düşman" değil "unutuşun bir belirtisi" okunmalı).
- **Kimliği belirsiz kalmalı** — Homeros'ta yok, oyun için icat; doğrudan doğrulanmayan bir ima (Lotophagoi'nin "oyuncunun kayıp adamları mı" sorusunun kapalı kalması gibi).

---

## 5. Şekil dili

- **Lotus:** yuvarlak, katmanlı, yukarı açılan. Aşama ilerledikçe **silüet açılır ve genişler**, 4. aşamada aşağı düşer. Sayı okumadan olgunluk anlaşılır.
- **Nilüfer yaprağı:** geniş, düz, neredeyse daire — suyun üstünde yatay ada. Yürünebilirliği şekliyle söyler.
- **Sazlık:** ince, dikey, kalabalık. Görüşü keser, geçiş hissi verir.
- **Kum ve kıyı:** yumuşak, dalgalı, uzun yatay hatlar. Sakinlik buradan gelir.
- **Gemi:** uzun, düz, insan yapımı; adanın organik formları arasında **tek doğrusal kütle** — bu yüzden uzaktan bulunur.
- **Tepe/servi:** üçgen ve dikey silüetler, fog içinde katman katman.
- **Kayalık:** tebeşir beyazı, parlak, keskin kırıklı. Adanın hiçbir yeri koyu değil — tehdit ışığın fazlalığıdır.
- **Karakter (Doryseus):** basit stylized figür; küçük baş, okunur omuz hattı, kalçada bez çanta. Zırh yok, silah yok — kıyıya çıkmış bir kaptan, savaşta değil. Silüet 128 px'te tanınmalı.
- **Lotophagos figürü:** hareketsiz, dikey, uzatılmış tek kol. Düşman silüeti değil — **ikram** silüeti.
- **Hero vs. destek [P]:** gözü **olgun lotus** ve **gemi** çeker. Kum, kaya ve su doku detayıyla dikkat çekmez.

---

## 6. Ortam ve seviye sanatı

- **Mekân:** açık kıyı — sığ turkuaz su, altın kum şeridi, lotus tarlaları, arkada zeytin/servi ve sisli tepeler. Gökyüzü geniş ve görünür.
- **Katmanlar [P]:** ön plan (kum/su detayı) → oynanış düzlemi (lotus tarlası, gemi) → orta (sazlık, ağaçlar) → uzak (tepe backdrop + fog + gökyüzü). Detay bütçesi oynanış düzlemine harcanır.
- **Lotus tarlası:** sığ suda kümeler; nilüfer yaprakları basamak, sazlık sınır. Kümeler eşit dağıtılmaz — okunur adacıklar halinde.
- **Gemi:** kıyıda sabit, sahnenin çapası. Her açıdan bir parçası görünmeli **[P]** — oyuncu kaybolmasın. **Kapandı:** tek teslim gemisi + kıyıda 12 gemilik filo silüeti (`asset-registry.md` ASSET-021 notu, `FLEET.count = 12`).
- **Prop yoğunluğu:** lotus tarlasında yüksek, açık kumda düşük. Boş kum "nefes" alanıdır, doldurulmaz.
- **İç göl [P]:** merkez-kuzeyde tatlı su. Denizden **görsel olarak ayrışmalı** — köpük yok, caustic zayıf, durgun yeşilimsi (`#5d8f86`). Oyuncu "burası deniz değil"i bakarak sezebilmeli, çünkü göl iyileştirmiyor (`gdd-memory-system.md` §3.3) ve bu kural ona söylenmiyor.
- **Deniz her karede görünür [P]:** kamera hangi açıda olursa olsun turkuazın bir parçası kadraja girmeli (`game-concept.md` §11). Kaybolmak bilinçli bir hata olmalı.
- **[?]** Ada büyüklüğü, tarla yerleşimi ve bölge dağılımı `docs/design/level-lotus-island.md`'den gelecek — o doküman henüz yazılmadı. Bitki sayısı `LOTUS_TOTAL` (MVP notunda 28), hedef `LOTUS_TARGET` = 12.

---

## 7. UI / HUD görsel dili

**[K]** Makalenin HUD tarifi köşe köşe yerleşim öngörür. **Öğe listesi ve davranış `docs/design/gdd-memory-system.md` §10'a aittir** ve o kazanır:

| Öğe | Sabit | Not |
|---|---|---|
| **Çanta** | `HUD_CARRY` | 4 yuva; taşınan çiçek (`CARRY_CAPACITY`) |
| **Teslim sayacı** | `HUD_DELIVERED` | 12 hedefe doğru sayar |
| **Güneş yayı** | — | Günün ilerleyişi; asıl saat gökyüzündeki güneşin kendisidir |
| **Pusula oku** | — | Gemi yönü. **Eşik 25'te titrer, eşik 50'de gider** |
| Unutuş göstergesi | **YOK** | Bar/sayı/yüzde yok — **ölçek ekranın kendisidir** (§4) |
| Minimap | **YOK** | Yön bilgisi gemi + dalga sesiyle verilir |
| Can barı / düşman işareti | **YOK** | Oyunda düşman ve hasar yoktur |

**Stil [P]:** ince altın çizgi + ağarmış ahşap doku; hafif hacimli, yumuşak dış gölge. Antik referans **stilize**, gerçek arkeolojik doku değil. HUD dünya paletinden biraz daha doygun olabilir — okunabilirlik önce gelir.

**Unutuş ile ilişkisi:** HUD'ın işi **sırayla kaybolmaktır** — pusula (50), sonra tümü (75). Geçişler `HUD_FADE_TIME` süresinde solarak; ani kesme "bug" gibi okunur. Bu yüzden **her öğe ayrı asset dosyası** olmalı. Eşik 50'de teslim sayacı rakam yerine muğlak ifade gösterir ("birkaç", "yarısına yakın") — tipografi bunu taşıyabilecek genişlikte olmalı.

**[K] Ekranda yazı:** HUD dışında ekran yazısı yok.

---

## 8. Asset standartları

Teknik ayrıntı ve isimlendirme `pipeline.md` §6'da. Görsel taraf:

- **[P]** Doku ışığı taşımaz — gölge/highlight albedo'ya boyanmaz, ışık motordan gelir.
- **[P]** Unutma efekti asset'e gömülmez (§4).
- **[P]** Tileable kum/su dokusunda yön bildiren büyük detay olmaz.
- **[P]** Palet dışı renk yasak: §2'de olmayan bir hex ailesi getiren asset ya bible'ı güncelletir ya reddedilir.
- **[K]** Oyun içi görselin varsayılan yolu **koddur** (*"without a single hand-modeled asset"*). Higgsfield still'ini texture olarak kullanmak proje uzantısıdır **[?]**.
- **[A]** Hareketli karakter/yaratık: still → video → frame → quantize → elle temizlik → spritesheet (`pipeline.md` §5).

---

## 9. Yasaklar

**[K] Kaynaktan:**

- Fotogerçekçilik (*"NOT photoreal"*) — gerçek kum/deri/su fotoğraf dokusu, film grain, gerçekçi cilt.
- Logo, marka izi, gerçek oyun adı.
- HUD dışında ekran yazısı.

**[P] Proje yasakları:**

- **Karanlık mağara paleti** — mor kristal, fener, bataklık: iptal edildi, geri gelmez.
- **Generic AI look** — merkezi simetri, anlamsız parıltı serpme, her yerde eşit detay, "epic fantasy concept art" default kompozisyonu.
- **Siyah gölge / nötr gri** — gölge serin mavi (`#5f7fa8`).
- **Doygun neon** — palet doğal ve sıcak; neon Ege'yi öldürür.
- **Tehdidi karanlıkla anlatmak** — bu oyunda tehdit ışıktır (§1). **Ekranı karartmak yasak.**
- **Ekranda kırmızı hasar flaşı, hasar çerçevesi, can barı** — oyunda hasar ve düşman yok (§4).
- **Unutuş için bar / sayı / yüzde / ikon** — ölçek ekranın kendisidir (§4, `gdd-memory-system.md` §10).
- **Olgunluğu ikonla veya işaretleyiciyle göstermek** — renk ve silüetle okunur (§2).
- **Yanıp sönme / stroboskopik geçiş** — fotosensitivite (§4).
- **Gerçek arkeolojik/müze dokusu** — stilize antik, belgesel değil.
- **Mevcut Odysseia uyarlamalarına görsel atıf** — konu kamu malı, tasarım orijinal.

---

## 10. Referans yönü

| Kaynak | Ne alınır | Ne alınmaz |
|---|---|---|
| Ege kıyısı altın saat fotoğrafları | ışık açısı, su renk geçişi, gölge sıcaklığı | fotogerçekçi doku |
| Antik Yunan gemi formu | uzun düz gövde, yelken oranı, halat detayı | müze doğruluğu, gerçek ahşap dokusu |
| Makalenin prompt iskeleti **[K]** | 8 bloklu prompt yapısı, `NOT photoreal`, IP satırı | Glowsprig'in aydınlık koru paleti |
| Araştırma raporu **[A]** | still→video→spritesheet animasyon hattı, manifest disiplini | referans klibin gerçek zamanlı olmayan görsel barı |

---

## Onay — Intake kapısı (`pipeline.md` §1.1) — ✅ kapandı 2026-08-14

- [x] Palet (§2) onayı — özellikle **olgun pembe `#f78fae`** adanın en doygun rengi olacak
- [x] Tebeşir beyazı kayalık + kavruk yeşil eklemesi (§2) — concept §9.3'ten geldi
- [x] Unutuş estetiğinin dört katmanı ve sırası (§4)
- [x] Ufuk renginin altın → kehribar → gül ilerleyişi (§2)
- [x] İç gölün denizden görsel olarak ayrışması (§6)
- [x] Üretilen stiller (Gemini/Higgsfield fark etmez) oyun içi texture olarak da kullanılacak (`pipeline.md` §2) — kod-only değil, `scene-texture` sınıfı P1 kalemleri devrede
- [x] Oyunun çalışma adı **Lotophagoi** — zaten `AGENTS.md`, `README.md`, `CLAUDE.md` genelinde tutarlı kullanımda
