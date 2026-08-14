# Karar dokümanı — "Unutuş" hissiyatının yeniden çerçevelenmesi: bayılma/sanrı + kovalayan figürler

> **Durum:** taslak — sahip kararı bekliyor, **onaylanmadı, uygulanmadı**
> **Tarih:** 2026-08-14
> **Tetikleyen:** sahip'in playtest sonrası geri bildirimi (arkadaşlarına oynattıktan sonra): *"unutmak gibi de değil. bayılmaya doğru uykuya doğru çekiyormuş gibi :D ... sanrılar arttıkça lotusları gemiye teslim zorlaşsın ama değişik yaratıklar kovalasın sanrılardan kaçıp lotusları teslim edelim falan."*
> **Bu dosya ne değildir:** onaylanmış bir tasarım değişikliği değildir. `gdd-memory-system.md`, `game-concept.md`, `art-bible.md`, `tuning.md`, `src/constants.ts` **değiştirilmedi.** Bu doküman sahip'in üzerinde soru-cevapla karar vereceği bir sonraki tur için bir öneri setidir.
> **Bağlı dokümanlar:** `gdd-memory-system.md` (değişecek/değişmeyecek sistemin kendisi), `art-bible.md` §4 (kilitli görsel dil), `game-concept.md` (P1–P4 sütunları, "düşman yok" ilkesi), `gdd-detection-cyclops.md` (yakın akraba sistem, tekrar icat etmemek için referans), `multi-island-concept.md` (hangi durağa uygulanacağı sorusu için).

---

## 0. Önce netleştirilmesi gereken şey: bu bir *yeniden çerçeveleme* mi, yeni bir *mekanik* mi?

Sahip'in cümlesinde iki farklı büyüklükte istek iç içe geçmiş:

1. **His/anlatı değişikliği:** "unutmak" hissi yerine "bayılma/uykuya sürüklenme/sanrı" hissi. Bu, mevcut `memory` (0–1) değişkeninin **yorumunu** değiştirir — sayı, eşikler, oranlar aynı kalabilir; ekrana ve kulağa ne söylediğimiz değişir.
2. **Yeni mekanik istek:** "sanrılar arttıkça teslim zorlaşsın" + "değişik yaratıklar kovalasın." Bu, mevcut sistemin **davranışına** yeni bir eleman ekler — salt kozmetik değil, oyuncunun karşılaştığı somut bir engel/tehdit.

Bu iki isteği ayırmak önemli çünkü maliyetleri çok farklı: (1) neredeyse bedava (render/ses/metin işi, `constants.ts`'te tek bir sayı bile değişmeyebilir), (2) yeni bir alt-sistem, yeni asset'ler, yeni playtest yüzeyi ister — tam olarak Kiklop'un `DETECT` sisteminin maliyetine benzer.

**Bu doküman ikisini de ele alıyor ama ayrı bölümlerde**, çünkü sahip'in ikisini birden mi yoksa sadece birini mi istediği henüz netleşmedi (bkz. §7 sorular).

---

## 1. Yeniden çerçeveleme — "unutuş" mu kalsın, "bayılma/sanrı" mı olsun?

### Seçenek A — Sadece yorum değişir, mekanik (`memory` 0–1) aynen kalır (öneri)

Sistemin sayısal iskeleti (`MEM_PASSIVE`, eşikler, `MEM_GRACE`, geri kazanma yolları) **hiç değişmez**. Değişen şey yalnızca:

- **İsimlendirme/anlatı dili:** "unutuş" yerine ya da onunla birlikte "sersemlik", "sürüklenme", "uyku bastırması" gibi bir ikinci kelime katmanı. Mekanik hâlâ `memory`; ama art-bible'daki "uykuya dalıyor, bilinç yitiriyormuş gibi" hissi görsel/işitsel sunumla verilir.
- **Görsel sunumun tonu:** mevcut süt beyazı vinyet + doygunluk kaybı + bulanıklık zaten "aşırı ışık, netliğini kaybetme" diline yakın — bunu "bayılma" hissine çekmek için eklenecek şey **çift görüntü (double vision) benzeri hafif kayma/ghosting** ve ekranın kenarlarının değil **ortasının da** yumuşak biçimde parlaklaşması (tünel görüşün *tersi* — karartma değil, aşırı aydınlanma ile "gözünü açık tutamıyor" hissi). Bu, art-bible'ın "ışık asla azalmaz" kuralına **tam uyumlu** — bayılma hissini karartmadan, fazla ışıkla verebiliriz (§4'te detay).
- **İşitsel sunum:** mevcut lowpass filtre + uğultu zaten "kulakların su altına inmesi" tarif ediliyor (`gdd-memory-system.md` §9) — bu zaten bayılmaya çok yakın bir dil. Eklenecek: **kalp atışı benzeri düşük frekanslı nabız** (eşik 3'ten itibaren, çok hafif, rahatsız etmeyen) ve konuşma/lir'in yavaşlayıp derinleşmesi (pitch düşürme) — "kulakların tıkanması" değil "zamanın yavaşlaması" hissi.

**Maliyet:** düşük. `docs/design/gdd-memory-system.md` §9 (görsel/işitsel gereksinimler) ve `art-bible.md` §4'e birkaç cümle eklenir; `constants.ts`'te yeni sabit gerekmez ya da en fazla 1-2 kozmetik sabit (ghosting genliği gibi) eklenir. **Sistemin şekli korunur** — CLAUDE.md'nin sana verdiği görevin tam kalbi budur.

### Seçenek B — Kelime ve çerçeve tamamen değişir: "unutuş" kalkar, "bayılma/bilinç kaybı" ana anlatı olur

`memory` değişkeninin adı ve tüm doküman dili "unutuş"tan "sersemlik/bilinç kaybı"na döner. Eşik isimleri değişir (Açık → Sis → Kayış → Unutuş → Kalış yerine belki Açık → Baygın → Rüya → Sanrı → Bayılma gibi). Nostos (eve dönüş özlemi) teması zayıflar, yerini "ayakta kalma/bilinç" teması alır.

**Sorun:** bu, oyunun mitolojik çapasını (Homeros IX.82-104 — lotus yemek dönüş *arzusunu* yok eder, bilinç kaybı değil) zayıflatır. `game-concept.md` §4.1'in alıntıladığı kaynak metin açıkça "haber getirmeyi istemez olur, dönüş arzusunu yitirir" diyor — bu **unutma/istek kaybı**, tıbbi bir "bayılma" değil. Kelimeyi tamamen değiştirmek kaynak sadakatini (P3/tema disiplini, `scenario.md`'nin tüm kanon etiketleme sistemi) gereksiz yere riske atar.

**Maliyet:** orta-yüksek — çok sayıda dokümanda (`gdd-memory-system.md`, `tuning.md`, `art-bible.md`, muhtemelen `scenario.md`) "unutuş" kelimesinin geçtiği her yer gözden geçirilmeli; kod tarafında değişen bir şey yok (mekanik aynı) ama tasarım dokümantasyonu sürüklenme riski taşır.

### Seçenek C — İkisi birlikte: "unutuş" ana tema/isim olarak kalır, ama sahip'in tarif ettiği *his* (bayılma/sanrı) onun **nasıl hissettirdiği** olarak açıkça yazılır — yorum genişler, isim değişmez

Ortası: sistemin adı, kavramsal çapası "unutuş" (nostos kaybı) kalır — çünkü bu tema/kaynak disiplinini korur — ama **"unutuş nasıl hissettiriyor"** sorusunun cevabı genişler: şimdiye kadar "tatlı bir dalgınlık" (gdd-memory-system.md §2) idi, şimdi buna "bilinç direncini kaybetme, uykuya sürüklenme" katmanı ekleniyor. Sahip'in söylediği "unutma için de uygun ama efektin verdiği hissiyat..." cümlesi zaten bunu işaret ediyor — kelimeyi değil hissi değiştirmek istiyor.

### Öneri: **Seçenek A/C karışımı.** İsim ve tema (unutuş, nostos kaybı) korunur; oyuncu fantezisi paragrafı (`gdd-memory-system.md` §2) genişletilir ("tatlı bir dalgınlık" + "bilincin gevşemesi, uykuya çekilme"); görsel/işitsel sunuma bayılma-yönlü katmanlar eklenir (§1 Seçenek A, ayrıntı §4). Bu en ucuz yol ve mevcut sistemin şeklini bozmaz — CLAUDE.md'nin "protect its shape" talimatına en sadık seçenek.

---

## 2. Sanrı yaratıkları — ne, kaç tane, nasıl davranıyor

### 2.0 Önce ilke: bunlar düşman mı, bilgi-bozucu figürler mi?

`game-concept.md` §7 açıkça yasaklıyor: *"Düşman, savaş, can barı YOK — Homeros'ta Lotophagoi düşman değildir; ayrıca P1'i bozar."* `art-bible.md` §9 aynı şeyi tekrarlıyor: *"Ekranda kırmızı hasar flaşı, hasar çerçevesi, can barı — oyunda hasar ve düşman yok."*

Bu, "kovalayan yaratıklar" fikrini **doğrudan reddetmiyor** ama onu belirli bir kalıba zorluyor: **yaratıklar gerçek düşman/hasar kaynağı olamaz; unutuş sisteminin diliyle tutarlı bir "bilgi/yön bozucu" olmalı.** Tıpkı Kiklop'un `DETECT` sisteminde olduğu gibi — Polyphemos yakalarsa can gitmiyor, envanter + unutuş sıçraması oluyor (`gdd-detection-cyclops.md` §3.4). Aynı ilke burada da uygulanmalı: **temas = hasar değil, temas = sanrının kendisinin geçici olarak yoğunlaşması** (ekstra unutuş artışı, yön kaybı, ya da taşınan lotus'un düşürülmesi — ama can barı asla yok).

### 2.1 Ne — üç somut seçenek

**Seçenek 1 — Sanrılar birer "algı hayaleti", fiziksel varlığı yok, sadece görüş alanını/rotayı bozuyor**

Yaratıklar gerçekten var olan 3D nesneler değil; yüksek unutuş eşiğinde (`MEM_THRESHOLD_LOST` = 75 ve üstü, ya da yeni bir eşik) periferik görüşte beliren, oyuncu doğrudan baktığında kaybolan silüetler (göz ucuyla görülen bir şey — dönüp bakınca yok). Temas mekaniği yok; sadece **atmosferik baskı**. "Kovalıyor" hissi kamera/ses ile verilir (arkadan gelen bir ayak sesi, uzaklaşan bir gölge).

- **Artı:** en düşük risk — hiçbir yeni çarpışma sistemi, hiçbir yeni asset zorunluluğu (parçacık/sprite ile bile yapılabilir), "düşman yok" ilkesini hiç zorlamaz çünkü teknik olarak dokunulabilir bir şey yok.
- **Eksi:** sahip'in "kovalasın... kaçarken teslim edelim" tarif ettiği **aktif kaçış** hissini tam karşılamıyor — bu daha çok bir atmosfer katmanı, bir engel değil.

**Seçenek 2 — Sanrılar fiziksel olarak yol kesiyor, temas = ekstra unutuş sıçraması + kısa süreli yön/kontrol bulanıklığı (öneri)**

2-4 basit, yarı-saydam, silüet-bazlı figür (Kiklop'un `DETECT_MAX`'ı gibi deterministik bir döngüyle, `LOTUS_PHASE_SEED` ilkesiyle tutarlı — rastgele spawn değil, öngörülebilir rota/zamanlama) yüksek unutuş eşiklerinde (§3.2 eşiği) sahneye girer, oyuncunun gemiye giden yolunun yakınında dolaşır/süzülür. Oyuncu bunlara **çarparsa** (basit yarıçap çarpışması, Kiklop'un `CAUGHT_*` mantığıyla aynı aile):

- `HALLUC_MEM_SPIKE` — tek seferlik unutuş artışı (Kiklop'un `CAUGHT_MEM_SPIKE` = 30 ile aynı ailede, muhtemelen daha küçük çünkü bu daha sık karşılaşılan bir olay olacak — öneri 8-15 puan aralığı, playtest'e ertelenir).
- **Kısa süreli, şiddetlenmiş yürüyüş sapması** — mevcut `DRIFT_MAX_ANGLE`/`DRIFT_PERIOD` mekaniğinin (eşik 3'te zaten var olan) birkaç saniyelik bir "spike" versiyonu. Yeni bir sistem icat etmiyoruz, var olanı ödünç alıyoruz.
- **Taşınan lotus düşmez** (bkz. §2.3 — bunu neden önermediğimi orada açıklıyorum).

Yaratıklar **can almaz, oyuncuyu durdurmaz, hareketi engellemez** (mevcut P1 "unutuş yapabildiğini kısıtlamaz, bildiğini kısıtlar" ilkesinin birebir uzantısı) — sadece çarpışma anında bilgiyi (yön) ve durumu (unutuş seviyesini) kötüleştirir.

- **Artı:** sahip'in "kovalıyor, kaçıyoruz" hissini somut biçimde karşılıyor; Kiklop'un `DETECT`/`CAUGHT` diliyle bire bir tutarlı, ikinci kez icat edilmiyor; can barı/hasar hâlâ yok.
- **Eksi:** yeni bir çarpışma/spawn sistemi gerektiriyor — Lotus Adası'na yeni bir teknik yüzey ekliyor (mevcut kod tabanında şu an hiç yok).

**Seçenek 3 — Sanrılar gemiye giden yolu fiziksel olarak "bulanıklaştırıyor" ama temas mekaniği yok — çevresel engel, çarpışma değil**

Yaratıklar oyuncunun etrafında dönen, teslim rotasının bir kısmını görsel olarak kapatan (sis/haze'in canlı, hareketli bir versiyonu gibi) figürler. Oyuncu onların "içinden" geçebilir ama içindeyken ekran daha da bulanıklaşır/parlaklaşır (mevcut `FX_BLUR`/`FX_VIGNETTE` eğrisinin geçici, lokal bir spike'ı). Temas cezası yok, sadece geçici görsel/işitsel bulanıklık.

- **Artı:** en düşük mekanik risk (çarpışma sistemi gerekmez, salt görsel), yine de "kovalayan yaratık" hissi kamera/anim ile verilebilir.
- **Eksi:** Seçenek 2'ye göre daha zayıf bir "risk/ödül" hissi — oyuncu için gerçek bir sonucu yok, sadece dekor.

### Öneri: **Seçenek 2.** Sahip'in "kaçıyoruz, teslim etmeye çalışıyoruz" tarifi gerçek bir sonuç (temas = bedel) ister; Seçenek 1/3 bunu atlıyor. Seçenek 2, Kiklop'un `DETECT`/`CAUGHT` diline sadık kaldığı için ikinci bir mekanik icat etmiyor, mevcut kelime dağarcığını genişletiyor.

### 2.2 Kaç tane, nasıl beliriyor/kayboluyor

- **Sayı:** 2-3 öneri (Lotophagoi figürleri gibi az sayıda, seyrek — `LOTOPHAGOS_COUNT` = 3 ile aynı ölçek felsefesi: "az ama anlamlı", CLAUDE.md'nin "merge static geometry, don't spawn hundreds" ilkesiyle de uyumlu).
- **Ne zaman beliriyor:** yalnızca yüksek unutuş eşiklerinde (öneri: `MEM_THRESHOLD_DRIFT` = 50 ve üstü, ya da yeni, daha yüksek bir eşik — playtest'e ertelenir). Düşük unutuşta hiç yoklar — bu, "unutuş yükseldikçe teslim zorlaşıyor" isteğinin **doğrudan karşılığı**: düşük unutuşta ada güvenli/güzel (art-bible'ın "cennet gibi görünen tuzak" ilkesi), yüksek unutuşta aynı ada artık dolaylı biçimde tehlikeli.
- **Nasıl kayboluyor:** eşik altına inince (deniz/gemi ile unutuş düşünce) sanrılar da söner — mevcut "geri dönüş hızlı ve okunur" kuralının (`art-bible.md` §4) birebir uzantısı. Kalıcı bir "kovalamaca" değil, unutuşun kendisi gibi **geri kazanılabilir** bir durum.
- **Deterministik mi rastgele mi:** deterministik döngü/rota öneriliyor (P3 "ada okunabilir" sütunü + Kiklop'un `CYCLOPS_CYCLE` emsali) — ama **tam olarak nerede/ne zaman** oyuncu unutuşu yükselttiğine bağlı olduğu için, pratikte "rastgele hissettiren ama kural tabanlı" bir deneyim olur (tıpkı lotus olgunlaşmasının deterministik ama oyuncu için öngörülemez hissetmesi gibi).

### 2.3 Temas ne kaybettiriyor — üç somut seçenek

| Seçenek | Ne kaybediliyor | Gerekçe |
|---|---|---|
| **(a) Sadece unutuş sıçraması** (Kiklop'un `CAUGHT_MEM_SPIKE`'ının küçük kardeşi) | Envanter dokunulmaz | En sade, mevcut "unutuş toplamayı asla etkilemez" (§3.1 madde 10) ilkesini bozmuyor bile — sadece tek bir kaynaktan besleniyor |
| **(b) Unutuş sıçraması + geçici yön bulanıklığı** (öneri) | Envanter dokunulmaz, birkaç saniyelik ekstra sapma | Somut bir "kaçış" hissi katıyor (yürüyüş kontrolü geçici olarak zorlaşıyor) ama P1'in "unutuş yapabildiğini kısıtlamaz" ilkesini bozmuyor — sadece **var olan** sapma mekaniğinin şiddeti/süresi geçici artıyor |
| **(c) Taşınan lotus'tan birini düşürüyor** (Kiklop'un `CAUGHT_ITEM_LOSS`'unun izi) | Çantadan 1 çiçek, sahneye geri düşer (toplanabilir tekrar) | **Önerilmiyor** — bu, Lotus Adası'nın `gdd-lotus-collection.md`'de sabitlenmiş sözleşmesini ("toplama yalnızca teslimle azalır, unutuş hiçbir zaman envantere müdahale etmez") kırar; `gdd-detection-cyclops.md` §1.1 bu istisnayı **sadece Kiklop Mağarası'na özgü** olarak zaten kaydetti ve "sessizce genelleşmemeli" diye açıkça uyardı. Lotus Adası'nda aynı istisnayı tekrarlamak, o disiplin çizgisini zayıflatır. |

**Öneri: (b).** (a) yeterince "kovalıyor" hissi vermiyor (oyuncu temas ettiğini fark etmeyebilir), (c) mevcut bir sözleşmeyi kırıyor ve zaten Kiklop'a özgü olarak işaretli. (b), mevcut `DRIFT_MAX_ANGLE`/`DRIFT_PERIOD` kodunu yeniden kullanıyor — CLAUDE.md'nin "small focused modules, keep the build playable" ilkesine en uygun, en az yeni yüzey açan seçenek.

---

## 3. "Teslim zorlaşsın" — somut olarak ne demek

Sahip'in cümlesi: *"sanrılar arttıkça lotusları gemiye teslim zorlaşsın."* Üç somut yorum var, birbirini dışlamıyor, katmanlanabilir:

1. **Gemi görünmez oluyor (zaten var):** eşik 3'te (`MEM_THRESHOLD_LOST` = 75) gemi silueti sis içinde zaten kayboluyor (`gdd-memory-system.md` §3.2, art-bible §4). Bu, "teslim zorlaşıyor"un **bilgi katmanı** — ekstra bir şey eklemeye gerek yok, zaten mevcut.
2. **Yol uzuyor/dolaşıklaşıyor (yeni, önerilmiyor):** oyuncunun fiziksel hareketini kısıtlamak (görünmez duvar, yavaşlatma) — bu doğrudan §3.1 madde 10'u ("unutuş hız düşürmez, hareketi kısıtlamaz") ihlal eder. **Reddedilmeli**, mevcut ilkeyle doğrudan çelişiyor.
3. **Sanrı yaratıkları teslim yolunu kesiyor (yeni, öneri):** §2'deki yaratıklar özellikle gemiye giden rotanın üstünde/yakınında beliriyor (rastgele her yerde değil) — böylece "zorlaşma" **coğrafi bir tıkanma değil, bir risk/dikkat testi** oluyor: oyuncu ya onların arasından geçip temas riskini göze alıyor ya da rotasını uzatıp dolaşıyor (kendi kararı, hız cezası yok — sadece coğrafi/zaman maliyeti, tıpkı `DAY_LENGTH` kıskacının zaten yaptığı gibi).

**Öneri: 1 (mevcut) + 3 (yeni).** 2 kesinlikle hayır — mevcut, kilitli bir ilkeyi ihlal ediyor ve CLAUDE.md'nin "protect memory system's shape" görevine aykırı.

---

## 4. Görsel dil — fotosensitivite/art-bible kısıtlarına uyan bir bayılma/sanrı ifadesi

Art-bible §4/§9'un sabit kuralları: **kararan ekran yasak**, kırmızı flaş/hasar çerçevesi yasak, **tüm geçişler ≥ 1.5 s**, yanıp sönme/stroboskopik etki yasak, unutuş rengi kullanmaz (renk körü oyuncu bilgi kaybetmemeli).

Bu kısıtlar içinde "bayılma/sanrı" hissi için önerilen katmanlar (hepsi **mevcut post-process yığınına ek**, yeni bir yığın değil):

| Katman | Ne yapar | Neden fotosensitivite güvenli |
|---|---|---|
| **Çift görüntü / hafif ghosting** | Yüksek eşikte (öneri: eşik 3+), ekranın kenarlarında (merkezde değil — netlik korunur, art-bible'ın "oyuncu önünü hep görebilmeli" kuralına uyar) hafif bir ikinci, gecikmeli görüntü katmanı beliriyor — "gözlerini açık tutmakta zorlanma" hissi. | Sabit, yanıp sönmeyen bir efekt; ≥1.5s'lik yumuşak fade-in ile devreye girer, strobe değil. |
| **Nefes ritmi ile senkron hafif nabız (vinyet opaklığında yavaş, sinüsoidal dalgalanma)** | Ekranın kenar vinyeti sabit değil, çok yavaş (4-6 s periyot, mevcut `DRIFT_PERIOD` = 4 s ile aynı aile) nefes alır gibi genişleyip daralıyor. | Genlik çok küçük tutulursa (mevcut `FX_VIGNETTE` tavanının ±%5'i gibi) strobe değil, "nefes" hissi verir — bu zaten fotosensitivite kurallarının izin verdiği yavaş salınım. |
| **Sanrı figürlerinin kendisi yarı-saydam, konturlu, süt beyazı/sis paletinde (`#f6f2ea` ailesi)** | Yeni bir renk ailesi getirmez — art-bible §9'daki "palet dışı renk yasak" kuralına uyar; sanrılar unutuşun **aynı** görsel dilinden (süt beyazı) türer, ayrı bir "düşman rengi" (kırmızı, mor) icat edilmez. | Renk körü oyuncu için de okunur — form/silüet ile ayrışır (art-bible'ın "renk körlüğü" ilkesiyle tutarlı, §2). |
| **Ses: kalp atışı/nabız düşük frekans, ≥eşik 3'te, çok hafif** | "Bilinç yitirme" hissini sese taşır. | Ani sıçrama yok, kademeli — mevcut uğultu/lowpass sisteminin bir uzantısı. |

**Kesinlikle önerilmeyenler:** ekranın kararması, kırmızı/turuncu "tehlike" flaşı (Kiklop'un kehribar kenar parıltısıyla bile karıştırılmamalı — bu, o sistemin işareti, Lotus Adası'nda tekrar kullanılırsa iki sistem görsel olarak çakışır), stroboskopik "bayılma anı" efekti (film dilinde sık kullanılan ani karartma+flaş kombinasyonu — burada yasak).

---

## 5. Hangi durak(lar)a uygulanacak

### Seçenek 1 — Yalnızca Lotus Adası (öneri)

Sanrı yaratıkları yalnızca 1. durakta (Lotus Adası) var. Kiklop kendi `DETECT`/`CAUGHT` sistemini korur, Sirenler kendi `DRIFT` tabanlı cazibe sistemini alır (`multi-island-concept.md` M3'te zaten önerilmiş — "cazibe/sürüklenme", mevcut `DRIFT_MAX_ANGLE` kodunun yeniden kullanımı). Her durak kendi yerel twist'ini korur, hiçbiri diğerinin diline bulaşmaz.

- **Artı:** `multi-island-concept.md` M3'ün ilkesiyle (*"her yeni durak ortak omurgaya kendi yerel twist'ini ekler, unutuşun yerini almaz"*) birebir uyumlu. Kiklop'un `DETECT`/`CAUGHT` sistemiyle **hiç çakışmıyor** — ayrı durak, ayrı sistem, tek besleme noktası (unutuş) üzerinden dolaylı olarak akraba.
- **Eksi:** yok — bu zaten en düşük riskli, en izole seçenek.

### Seçenek 2 — Tüm koşuya yayılır (Lotus + Kiklop + Sirenler)

Sanrı yaratıkları üç durakta da, her durağın kendi eşiğinde belirir.

- **Sorun — Kiklop ile çakışma:** Kiklop zaten kendi "kovalayan tehdit" figürüne (Polyphemos, `DETECT`/`CAUGHT`) sahip. İkinci bir "kovalayan yaratık" katmanı eklemek aynı duyguyu iki kez icat etmek olur — oyuncu Kiklop'ta hem Polyphemos'un algılama sistemini hem sanrı yaratıklarını aynı anda yönetmek zorunda kalır, bu P1'in "tek mekanik" zarafetini durak içinde bile bulanıklaştırır. `gdd-detection-cyclops.md` §2 tam olarak bunu test ediyor ("ikinci bir can barı/gizli gösterge yaratıyor mu?") — cevap hayır çünkü tek besleme noktası var; üçüncü bir kovalayan sistem eklenirse bu cevap yeniden sorgulanmalı.
- **Sirenler ile ilişki:** daha az çelişkili çünkü Sirenler'in kendi sistemi henüz yazılmadı (`level-*.md` yok) — ama M3'ün önerisi zaten "cazibe/sürüklenme" (mevcut drift kodu), sanrı yaratıkları oraya da eklenirse üçüncü bir görsel dil (Lotus'un beyaz sanrıları + Sirenler'in kendi cazibe estetiği) art bütçesini büyütür.

### Öneri: **Seçenek 1 — yalnızca Lotus Adası.** Kiklop zaten kendi kovalayan-tehdit dilini kurmuş durumda (`DETECT`/`CAUGHT`, kehribar kenar parıltısı); aynı duyguyu ikinci bir durakta tekrarlamak hem tasarım hem art kapsamını gereksiz büyütür. Lotus Adası'nın "sanrı yaratıkları" onun **kendi** yerel twist'i olur — tıpkı Kiklop'un `DETECT`'i, Sirenler'in `DRIFT`'i gibi, üçü de aynı unutuş omurgasına farklı bir yerel doku ekler.

---

## 6. `docs/design/tuning.md` ve `src/constants.ts`'e inecek olası sabitler (yalnızca Seçenek 2 — kovalayan yaratıklar — onaylanırsa)

Bu bölüm **henüz karar değil**, sahip Seçenek 2'yi (fiziksel kovalayan yaratıklar) onaylarsa `gameplay-programmer`e verilecek taslak liste. Tümü 🔬 playtest'e ertelenmiş öneri değerlerdir.

| Sabit (öneri adı) | Öneri değer | Nereye | Ne yapar |
|---|---|---|---|
| `HALLUC_THRESHOLD` | `MEM_THRESHOLD_DRIFT` (50) ile aynı ya da yeni bir eşik, öneri 60 | `tuning.md` §5.3 (eşikler) + `constants.ts` | Sanrı figürlerinin sahneye girmeye başladığı unutuş seviyesi |
| `HALLUC_COUNT` | `2-3` | `tuning.md` yeni §5.4 + `constants.ts` | Aynı anda sahnede olabilecek maksimum sanrı figürü |
| `HALLUC_MEM_SPIKE` | `8-15` puan (öneri, playtest'e ertelenir) | aynı yer | Temas anında tek seferlik unutuş artışı — `MEM_ON_HARVEST` (4) ile `MEM_WITHERED_PENALTY` (12) arasında bir yerde, "hasat kadar değil ama solmuşa dokunmaktan hafif ağır" |
| `HALLUC_DRIFT_SPIKE_DURATION` | `3-5` s | aynı yer | Temas sonrası mevcut `DRIFT_MAX_ANGLE`/`DRIFT_PERIOD` mekaniğinin geçici olarak şiddetlenmiş kaldığı süre |
| `HALLUC_CONTACT_RADIUS` | öneri `1.5-2.0` m | aynı yer | Çarpışma yarıçapı — oyuncu karakter yarıçapına (`PLAYER.radius` = 0.45) yakın ölçekte |
| `HALLUC_CYCLE` | deterministik döngü süresi, Kiklop'un `CYCLOPS_CYCLE` (95 s) emsaliyle benzer büyüklükte önerilir | aynı yer | Figürlerin belirme/kaybolma zamanlaması — rastgele değil |

**Not — sistemin şeklini bozmayan kısım:** bu sabitlerin hiçbiri mevcut `MEM_*` sabitlerinin değerini değiştirmiyor; hepsi **yeni, ek** sabitler. `gdd-memory-system.md`'nin çekirdek formülü (§4.1) hiç dokunulmuyor — yalnızca `HALLUC_MEM_SPIKE`, mevcut "tek seferlik artışlar" listesine (`MEM_ON_HARVEST`, `MEM_WITHERED_PENALTY`, `MEM_LOTOPHAGOS_TRADE`) bir dördüncü üye olarak ekleniyor. Bu, Kiklop'un `CAUGHT_MEM_SPIKE`'ının izlediği aynı deseni (§3.1 madde 4'ün genişletilmiş hâli) tekrarlıyor — "tek besleme noktası, tek kaynak" ilkesi korunuyor.

---

## 7. Sahip'e sorulacak kritik sorular (bir sonraki tur)

1. **Kapsam:** sahip yalnızca **his/anlatı değişikliği** mi istiyor (§1, ucuz, sistem şekli hiç değişmiyor), yoksa gerçekten **yeni bir "kovalayan yaratık" mekaniği** mi (§2, orta maliyetli, yeni bir teknik yüzey açıyor)? İkisi birlikte de olabilir ama önce hangisinin "olmazsa olmaz", hangisinin "olursa iyi olur" olduğu netleşmeli.
2. **Yaratıklar can/hasar kaynağı hissi vermeli mi, vermemeli mi?** Bu doküman "vermemeli, unutuş diline bağlı bir bilgi/yön bozucu olmalı" yönünde öneriyor (§2.0) çünkü `game-concept.md`/`art-bible.md`'nin kilitli "düşman yok" ilkesiyle çelişmiyor. Sahip bu sınırı kabul ediyor mu, yoksa "hayır, gerçekten ürkütücü/tehlikeli hissetsinler" gibi ilkeyi zorlayan bir niyeti mi var? (İkincisiyse, o zaman `game-concept.md` §7'nin "düşman yok" karşı-sütununun yeniden açılması gerekir — bu, bu dokümanın kapsamının çok ötesinde bir karar.)
3. **Kapsam durak sayısı:** yalnızca Lotus Adası mı (öneri, §5), yoksa tüm koşuya mı yayılsın? Eğer tüm koşu isteniyorsa, Kiklop'un zaten var olan `DETECT`/`CAUGHT` sistemiyle nasıl bir arada duracağı ayrıca çözülmeli (aynı duyguyu iki kez mi anlatıyoruz?).

**Ek, daha küçük ama faydalı sorular:**

4. Sanrı yaratıklarının **görünümü** ne olsun — soyut/silüet mi (öneri, art-bible'ın "stylized asla fotogerçekçi" ilkesine en kolay uyan), yoksa Homeros'ta olmayan yeni bir mitolojik figür mü icat edilsin (ör. "unutulmuş tayfa"nın hayaletimsi izdüşümleri gibi, mevcut anlatıya bağlanan bir şey)?
5. Temas cezası (§2.3) bu dokümanın önerdiği "(b) unutuş sıçraması + geçici yön bulanıklığı" mı, yoksa sahip başka bir bedel mi düşünüyor?

---

## Özet — bu dokümanın önerdiği paket (sahip onayı gerekiyor, hiçbiri uygulanmadı)

1. **Yeniden çerçeveleme:** Seçenek A/C — isim ("unutuş") ve tema (nostos kaybı) kalır, oyuncu fantezisi paragrafı ve görsel/işitsel sunum "bayılma/bilinç gevşemesi" hissini içerecek şekilde genişler. Mekanik (`memory` 0–1, eşikler, oranlar) **değişmez.**
2. **Sanrı yaratıkları:** Seçenek 2 — 2-3 figür, deterministik döngü, temas = unutuş sıçraması + geçici (mevcut) yürüyüş sapması şiddetlenmesi. Can/envanter kaybı yok. Kiklop'un `DETECT`/`CAUGHT` diliyle aynı aile, ikinci kez icat edilmiyor.
3. **Teslim zorlaşması:** mevcut sis/gemi-kaybolma efekti (zaten var) + sanrı figürlerinin teslim rotası yakınında belirmesi (yeni, coğrafi risk — hız cezası değil).
4. **Görsel dil:** ghosting/çift görüntü + yavaş nefes-vinyeti + süt beyazı paletinde yarı-saydam figürler. Kararan ekran, kırmızı flaş, strobe **yok.**
5. **Kapsam:** yalnızca Lotus Adası (1. durak). Kiklop/Sirenler kendi yerel sistemlerini korur.

Bu paket **CLAUDE.md'nin design-authority disiplinine göre sahip onayı olmadan `gdd-memory-system.md`/`tuning.md`/`constants.ts`'e yazılmayacak.** Onaylanırsa bir sonraki adım: (a) `gdd-memory-system.md` §2/§9'a bayılma-yönlü genişletme cümleleri eklemek, (b) onaylanırsa yeni bir §11 ("Sanrı figürleri — Lotus Adası") `gdd-memory-system.md`'ye ya da ayrı bir `gdd-hallucinations-lotus.md`'ye eklemek (Kiklop'un kendi ayrı dosyası olduğu gibi), (c) §6'daki sabitleri `tuning.md`'ye ve karşılığını `src/constants.ts`'e uygulamak üzere `gameplay-programmer`e devretmek.
