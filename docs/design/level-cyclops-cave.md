# Seviye — Kiklop Mağarası

> **Durum:** taslak — sahip onayı bekliyor
> **Tarih:** 2026-08-14
> **Yazan:** `island-designer` brief'i (durak 2/3, `docs/design/multi-island-concept.md` §6 M3)
> **Sayılar:** bu dosyadaki tüm `CYCLOPS_*` ve `DETECT_*` değerleri **öneridir** — hiçbiri `tuning.md`'de değil. Format `tuning.md`'nin sözleşmelerini (§0) taklit eder ki `game-designer` doğrudan kopyalayıp karar verebilsin; bu doküman kendi başına bir tuning kaynağı **değildir**.
> **Bağlı doküman:** `level-lotus-island.md` (format örneği ve kod deseni) · `gdd-lotus-collection.md` · `gdd-memory-system.md` · `multi-island-concept.md` §6 M3–M5 (kilitli kararlar) · `scenario.md` (Lotus'un anlatı çerçevesi — bu adanın kendi `scenario.md` bölümü henüz yazılmadı, bu doküman ona girdi verir, onun yerine geçmez)

Tek durak, tek mağara. Hub yok — bu, koşunun 2. adımı; oyuncu Lotus Adası'ndan gemiye binip kesintisiz buraya geçer, unutuş `MEM_ISLAND_RELIEF_PCT` (🔬 0.4, `game-designer` malı) ile kısmen taşınmış gelir.

---

## 0. Mitolojik çapa ve yerel twist — geometriden önce onay

### 0.1 Kaynak **[H]** — *Odysseia* IX.105–566, Polyphemos bölümü

Kısa özet, sahneler sırayla:

- **IX.105–192** — Filo Kikloplar ülkesine yakın, ıssız bir "keçi adası"na demirler (hiç gemi uğramaz, av bol). Doryseus filonun **on birini** orada bırakır, **kendi gemisiyle** ve on iki adamıyla anakaraya, dumanı gördükleri mağaraya gider — yanında Maron'un verdiği güçlü şarap vardır.
- **IX.193–250** — Mağara boş bulunur (Polyphemos sürüsüyle dışarıdadır): sepetlerde peynirler, yaşına göre ayrılmış kuzu/oğlak ağılları, süt/lor dolu kovalar. **Tayfa peyniri kapıp gemiye kaçmayı önerir; Doryseus reddeder** — konuğu görmek, hediye almak ister. Bu, hikâyenin trajik hatasıdır.
- **IX.250–414** — Polyphemos döner, mağarayı devasa bir kayayla kapatır, adamları keşfeder, art arda **altı adamı** (ikişer ikişer, üç oturumda) yer. Doryseus zeytin ağacından sivri bir kazık hazırlar, ateşte sertleştirir; Polyphemos'u şarapla sarhoş eder, adını **"Kimse" (Outis)** olarak söyler.
- **IX.415–479** — Sarhoş uykusundayken kazığı tek gözüne saplayıp kör ederler. Çığlığa gelen diğer Kikloplara "Kimse beni öldürüyor" der — kimse yardıma gelmez.
- **IX.480–566** — Sabah, kör Polyphemos sürüyü otlatmaya çıkarırken hayvanların sadece sırtlarını yoklar; Doryseus adamlarını koçların **karnına bağlayarak**, kendisi en iri koçun postuna tutunarak kaçırır. Gemiye varıp açıldıktan sonra Doryseus alay ederek **gerçek adını** haykırır — bu, Polyphemos'un babası Poseidon'a beddua etmesini ve destanın geri kalanındaki düşmanlığını doğurur.

**Bu bölümün gerçek dehşeti canavarlık değil, hatadır:** doğru tavsiye (al ve kaç) reddedilir, konukseverlik beklentisi altı adamın hayatına mal olur. Savaş yok, sadece yanlış karar ve onun bedeli.

### 0.2 Oyun için icatlar **[O]**

| İcat | Ne | Neden / Homeros'la ilişki |
|---|---|---|
| **Oyuncu tayfanın önerdiğini yapıyor** | Kanonda Doryseus peyniri alıp kaçma önerisini reddeder; bu oyunda oyuncu tam olarak reddedilen o kararı **oynanabilir** kılıyor — al, kaç, Polyphemos dönmeden git. | Metinle çelişmez (bu seçenek metinde zaten önerilmiş ve mümkün gösterilmiştir), sadece "ya dinleseydi" sorusuna oyunu adıyor. Lotus Adası'nın da Doryseus'u tek başına kıyıya çıkaran icadıyla aynı ruhta bir sapma. |
| **Algılanma riski = "yakalanma" ihtimalinin oynanabilir hâli** | Homeros'ta yakalanma ölümle sonuçlanır (adam yenir); oyunda **can barı yoktur** (P1–P4 kilitli), bu yüzden yakalanma soft-loss'a (taşınanın kaybı + unutuş sıçraması) çevrilir. | Kanon dehşeti yumuşatılmadan *hissettirilir* — ölüm gösterilmez, bedeli gösterilir. `game-concept.md` P2'nin ("unutma görülür, anlatılmaz") bu adadaki karşılığı: "algılanma hissedilir, ölüm anlatılmaz." |
| **Tek gemi, on bir gemi geride** | Homeros'ta zaten böyle — filo keçi adasında kalır, sadece Doryseus'un gemisi geçer. | **[H] doğrudan** — icat değil, doğrulama. Lotus Adası'ndaki "on iki direk" motifinin burada tekrarlanmaması bu yüzden doğal: mağaraya sadece bir gemi geldi. |
| **Devin kendisi tehlike kaynağı, ikram eden yok** | Lotophagoi'nin aksine Polyphemos hiçbir şey **vermez**; oyuncu ona hiç E basmaz. | Homeros'ta zaten düşman — icat gerektirmiyor, sadece Lotus'un "ikram eden figür" desenini tersine çeviriyor (bkz. §0.3). |

**Sahip'e soru — bu doküman bunu varsayım olarak ilerletiyor, ama açıkça onaylanmalı:** oyuncunun "tayfanın önerdiğini yapması" yorumu kabul edilebilir mi, yoksa farklı bir çerçeve mi tercih edilir (ör. oyuncu üç kayıp tayfayı — Lotus Adası'ndaki Lotophagoi'nin ima ettiği kayıplar değil, yeni bir grup — kurtarmaya mı çalışıyor)? Bu, aşağıdaki tüm tasarımın anlatı gerekçesini değiştirmez ama `scenario.md`-eşdeğeri metnin tonunu belirler.

### 0.3 Lotophagos-eşdeğeri bir figür var mı — **hayır**

Kilit soruya net cevap: **Kiklop Mağarası'nda ikram eden bir NPC yok.** Polyphemos'un kendisi tek figürdür ve saf tehlike kaynağıdır — oyuncu ona hiçbir zaman etkileşim tuşuyla yaklaşmaz, ondan bir şey almaz, ona bir şey vermez. Bu, Lotus Adası'nın "veren figür" desenini bilerek tersine çeviriyor: orada üçüncü bir figür sana yaklaşıp elini uzatıyordu (`LOTOPHAGOS_*`), burada tek figür seni **fark etmemesi gereken** biri. İki adanın simetrik zıtlığı — biri açık el, biri kapalı yumruk — anlatı düzeyinde de okunabilir bir kontrast.

**Sonuç:** bu adada `LOTOPHAGOS_*` ailesinin bir karşılığı **yoktur**, kurulmasına gerek yoktur. Detay için bkz. §4.

---

## 1. Ölçüler (öneri — `game-designer` onayı gerekli)

| İsim | Öneri | Birim | Gerekçe |
|---|---|---|---|
| `CYCLOPS_CAVE_DEPTH` | 65.0 | m | Mağara ağzından iç köşeye. Lotus'un `ISLAND_RADIUS` (70 m) civarında ama biraz daha kısa — bu ada tek-seferlik bir sızma turu olacak, çok-turlu bir hasat alanı değil (bkz. §7). |
| `CYCLOPS_COVE_DEPTH` | 15.0 | m | Mağara ağzından gemiye (dışarıda, koyda). Lotus'taki `SHIP_POSITION_Z` mesafesine kıyasla çok kısa — gemi mağaranın **hemen dışında**, tek giriş/çıkış noktasına bitişik (bkz. §9). |
| Toplam yürüyüş genişliği | ~10–14 | m | Koridor + oda genişlikleri; Lotus'un açık adasından farklı olarak dar bir geçit hissi — görüş açısı kısıtlı, bu da algılanmayı (§4) ve şaşırtmayı mümkün kılar. |
| `PLAYER_SPEED` | `4.5` (değişmez) | m/s | `tuning.md`'den aynen alınır — bu ada oyuncu hızını değiştirmiyor. |
| `CARRY_CAPACITY` | `4` (değişmez) | adet | Kilitli karar (görev metni) — tüm adalarda aynı. **Not:** bu adanın alt-hedefi de 4 olduğu için (`CYCLOPS_ITEM_TARGET`, bkz. §5) kusursuz bir tur **tek seferde** tamamlanabilir — Lotus'un en az 3 tur gerektirmesinden yapısal olarak farklı bir tempo (bkz. §7). |

---

## 2. Kroki

Ada gibi dairesel değil, mağara gibi **derinlik ekseninde doğrusal**: `D` = mağara ağzından içeri metre. `D < 0` dışarısı (koy), `D = 0` eşik, `D` arttıkça mağaranın içi.

```
                          D I Ş A R I  (koy, açık gökyüzü)
   ══════════════════════════════════════════════════════
                       turkuaz sığ su (iyileştirir — P4)
   ──────────────────────────────────────────────────────
        ⛵  GEMİ  (D ≈ -15)                    kayalık burun
        tek gemi, on biri geride kaldı [H]
   ──────────────────────────────────────────────────────
                          ▼ patika, D = -8
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ┏━━━━━━━━━━━━━━━━┓
                    ┃  MAĞARA AĞZI   ┃  ← koca kaya, dekor
                    ┃   (D 0–8)      ┃     (bu turda kapı değil)
                    ┗━━━━━━━━━━━━━━━━┛      gün ışığı sızar
                          │
                    ┌─────┴─────┐  D = 8–22
                    │  D E P O  │  peynir sepetleri × 2
                    │ (antişambr)│  düşük risk, öğretici
                    └─────┬─────┘
                          │
              ┌───────────┴────────────┐  D = 22–42
              │   A Ğ I L L A R  /     │  peynir/tulum × 3
              │      O C A K           │  orta-yüksek risk
              │  ▓▓ kuzu ağılı ▓▓      │  Polyphemos'un
              │      🔥 ocak           │  ana devriye/sağım yeri
              │    ↘ gölge cebi ↙      │  ← "dur, gölgede kal" dersi
              └───────────┬────────────┘
                          │
                    ┌─────┴─────┐  D = 42–65
                    │ İ Ç  N Ö K│  peynir/tulum × 2 (eski, değerli)
                    │  UYUMA    │  en yüksek risk — Polyphemos'un
                    │  KÖŞESİ   │  DÖNÜŞ noktası (§4)
                    └───────────┘

   Tek giriş/çıkış: her dönüş D=0 boğazından geçer (bkz. §9).
```

---

## 3. Bölgeler

### 3.1 Koy / Gemi — **güven** (D = −20 … −8)
**Öğe: 0.** Lotus'taki gemi/kıyı deseninin doğrudan devamı: `SHORE_WET_BAND`, `MEM_SEA_RECOVER`, `SHIP_AURA` eşdeğerleri burada da çalışmalı — P4 ("kıyı huzurdur") kilitli bir sütun, bu ada onu bozmuyor, sadece küçük ölçekte tekrarlıyor. Tek gemi burada demirli; teslim noktası ve koşunun bir sonraki durağa (Sirenler) geçiş tetiği aynı yerdedir.

**Fark:** Lotus'ta on iki direk vardı; burada **tek gemi**, çünkü filo geride kaldı [H]. İlerleme göstergesi (bkz. `level-lotus-island.md`'nin direk-bezi fikri) burada muhtemelen geminin güvertesine yığılan azık çuvalları olabilir — küçük ölçekli bir görsel sayaç.

### 3.2 Mağara ağzı — **eşik, öğretici** (D = 0–8)
**Öğe: 0.** Gün ışığı içeri sızar, en aydınlık iç mekân. Burada oyuncu ilk kez "aydınlıkta hareket = risk" dersini **düşük bedelle** alır (bkz. §4 — bu bölgede algılanma oranı en düşük çünkü Polyphemos'un buraya asıl dönüş rotası biraz daha derindeki depo/ağıllardan geçer). Koca kaya burada **dekor**dur — kapı olarak işlemez, kapanmaz (bkz. §9, kapsam dışı not).

### 3.3 Depo (antişambr) — **kolay, öğretici hasat** (D = 8–22)
**Öğe: `CYCLOPS_ITEM_ANTECHAMBER_COUNT` = 2** (öneri). Sepetlerdeki peynirler [H] burada, ilk göze çarpan şey. Işık hâlâ dışarıdan sızıyor (orta yoğunlukta "aydınlık bölge"), ama Polyphemos'un rutin geçiş rotası tam buradan geçtiği için **tamamen risksiz değil** — sadece en öngörülebilir.

**Tasarım işlevi:** Lotus'un sazlığı gibi "ilk turun öğretici tarlası." Oyuncu burada `DETECT` mekaniğini (§4) düşük riskle, geri dönüşü kolay bir mesafede öğrenir.

### 3.4 Ağıllar / Ocak — **ana gövde, orta-yüksek risk** (D = 22–42)
**Öğe: `CYCLOPS_ITEM_PENS_COUNT` = 3** (öneri). Yaşına göre ayrılmış kuzu/oğlak ağılları, süt/lor kovaları [H] — mağaranın en geniş, en dolu odası. Ocak ateşi burada sabit bir ışık kaynağı (`DETECT` açısından en yoğun "aydınlık bölge"). Polyphemos'un asıl sağım/oturma yeri de burada — devriye döngüsünün **PRESENT** evresinde en tehlikeli oda budur.

**Gölge cebi:** odanın bir kenarında, ocağın ışığından kaçan dar bir kaya çıkıntısı — oyuncunun "dur, bekle, geç" dersini **olumlu** bir araç olarak öğrendiği yer (Lotus'un iç gölü gibi bir tuzak değil, gerçek bir sığınak). Bu, §4'teki 2×2 kuralın "gölge + durgun = en güvenli" hücresini somutlaştırır.

### 3.5 İç nöy / Uyuma köşesi — **açgözlülük bölgesi, en riskli** (D = 42–65)
**Öğe: `CYCLOPS_ITEM_INNER_COUNT` = 2** (öneri). En eski, en değerli azık burada — ama burası aynı zamanda Polyphemos'un **PRESENT** evresinde döndüğü kişisel köşe. Lotus'un iç gölüyle aynı işlevi görür (en zengin + en uzak + en riskli), farkla: gölün riski mesafe+taşıma yorgunluğuyken buradaki risk zamanlama+konumdur (Polyphemos tam olarak buraya döner).

**Kritik tasarım sonucu (bkz. §6, §7):** depo (2) + ağıllar (3) toplamı zaten hedefi (4) karşılıyor — iç nöye **hiç girmeden** bitirmek mümkün. İç nöy bir zorunluluk değil, bir "daha hızlı bitirmek/daha fazla tampon istiyorsan" seçeneği — tıpkı Lotus'ta tepenin çiçek değil bilgi vermesi gibi, burada da "gitmemek doğru bir karar" olabilir.

---

## 4. Algılanma (tespit) sistemi — somut kural

> **⚠️ Bu bölüm yeni bir paylaşılan sistem önerisidir — `game-designer` onayı olmadan `tuning.md`'ye eklenmemeli, `gameplay-programmer`'a devredilmemeli.** Görev tanımının kendisi bunu örnek olarak veriyor ("bir tespit metre'si — bu bir `game-designer` kararı"). Aşağıdaki sayılar öneri aralıklarıdır, nihai değil.

### 4.1 Girdi — hiçbir yeni tuş yok

Twist, **mevcut kontrol şemasıyla** (WASD + fare + E + Esc, zıplama/koşma/eğilme yok — kilitli karar) çalışacak şekilde tasarlandı: "durgun kalmak" = WASD'a basmamak, "hareket" = basmak. Yeni bir "gizlen" tuşu **gerekmiyor** — bu, `tuning.md`'nin zıplama kararındaki disiplinle (yeni sabit yok, kontrol sadeliği korunur) aynı çizgide.

### 4.2 Kural — 2×2 matris

İki bağımsız eksen: **ışık** (aydınlık bölge içinde mi) × **hareket** (oyuncu şu an WASD ile hareket ediyor mu). Dört hücre:

| | **Gölgede** | **Aydınlıkta** |
|---|---|---|
| **Durgun** | En güvenli — `DETECT_RATE` ≈ 0 | Düşük-orta — görünürsün ama sessiz |
| **Hareket halinde** | Düşük-orta — sessiz ama gölge dışına taşabilirsin | **En riskli** — hem görünür hem duyulur |

Bu, görev metnindeki "ışıkta/gürültülü hareket → risk yükselir, gölgede/durgun → güvenli" cümlesinin doğrudan karşılığı ve **öğrenilebilir** (P3 — rastgele değil, iki gözlemlenebilir durumun çarpımı).

### 4.3 Polyphemos'un döngüsü — deterministik, Lotus'un faz mantığıyla aynı ruhta

P3 ("ada okunabilir... sürpriz mekanik yoktur, sürpriz zamanlama vardır") bu adada da geçerli — Polyphemos'un konumu **rastgele değil**, `LOTUS_CYCLE`'a benzer sabit bir döngüdür:

| Evre | Öneri süre | Ne olur | Risk |
|---|---|---|---|
| **DIŞARIDA** | ~50–65 s | Sürüyü otlatıyor, mağarada değil. | Aydınlık bölgeler hâlâ bir miktar risk taşır (temkin dersi hiç sıfırlanmaz) ama çok düşük. |
| **DÖNÜŞ (telegraf)** | ~6–8 s | Uzaktan ayak sesi/gürleme, ağıllar odasındaki ışık titrer. Tepki payı — `MEM_GRACE` felsefesiyle aynı: ani, adaletsiz ceza yok. | Artan ama henüz tepe değil. |
| **İÇERİDE (PRESENT)** | ~25–35 s | Ağıllar + iç nöy odalarında yüksek risk; sağım/oturma. Depo ve mağara ağzı bölgeleri bu evrede bile nispeten güvenli kalır (o odalara girmiyor). | Ağıllar/iç nöy'de tepe risk. |

`CYCLOPS_CYCLE` (öneri, `[TÜRETİLMİŞ]`) ≈ 85–110 s — Lotus'un 120 s'lik döngüsünden kısa, çünkü bu adanın oturum payı da kısa (~5–8 dk).

**Görünürlük kararı (2026-08-14, sahip — §12 eski madde 4 kapandı):** "çoğunlukla duyulan, kısaca görülen" yönü **korunuyor**, ama "kısaca görülen" tek, somut bir ana bağlanıyor: Polyphemos'un modeli PRESENT evresi boyunca **hiçbir zaman sürekli render edilmiyor/görünür durmuyor** — yalnızca §4.4'teki **CAUGHT (yakalanma) anında**, çok kısa bir pencerede beliriyor. Bu, "duyulan" tarafını (adım sesi, gürleme, nefes — mevcut ses katmanı, §8/§10) sürekli kılıp "görülen" tarafını tek, yüksek-etkili bir olaya sıkıştırıyor; hem P3'ün "sürpriz mekanik yok, sürpriz zamanlama var" ilkesini bozmuyor (görünme anı rastgele değil, CAUGHT olayına bağlı) hem de §10'daki düşük-mühendislik hedefini korur (tam bir devriye/görünürlük durum makinesi yerine tek bir olay-tetikli reveal state'i yeterli).

### 4.4 Yakalanma cezası — "sert ceza" (kilitli, görev metninden)

- **`CAUGHT_ITEM_LOSS`** (öneri): çantadaki **tüm** taşınan öğeler kaybedilir (0'a döner) — havuzdan geri gelmez, oyuncu kalan stoktan tazelemek zorunda. Lotus'un "solmuşa dokunma" cezasının (`MEM_WITHERED_PENALTY`, tek seferlik, hafif) büyütülmüş hâli.
- **`CAUGHT_MEM_SPIKE`** (öneri): tek seferlik +25…+35 puan — bir eşiği tek başına atlatabilecek büyüklükte (`MEM_THRESHOLD_HAZE`/`DRIFT` aralığına kıyasla). Kasıtlı: yakalanmak "büyük bir olay" hissettirmeli.
- **`CAUGHT_RESPAWN`** (öneri): oyuncu mağara ağzına (D≈4) ışınlanır — tamamen dışarı (gemiye) değil. Gerekçe: cezayı hissettirir ama turu sıfırlamaz; alternatif (tam dışarı/gemiye ışınlama, mevcut `UNUTULMA` diliyle daha tutarlı) `game-designer` tercih edebilir — **iki seçenek de not edildi, kesin karar onların.**
- **Ölüm/game-over yok:** yakalanma kendi başına koşuyu bitirmez; sadece mevcut unutuş kaynağına büyük bir darbe ekler. Eğer bu darbe `MEM_MAX`'ı aşarsa, **mevcut** `MEM_GRACE`/kayıp-finali akışı devreye girer (M4'e göre artık koşu-bazlı) — yeni bir "ikinci can barı" icat edilmiyor, tek kaynağa besleniyor. Bu, P1 sütununu ("tek mekanik, iki yön") ada-aşırı ölçekte korumanın yolu.

#### 4.4.1 CAUGHT anının korku/şok efekti (2026-08-14, sahip — §12 eski madde 4 kapandı)

Karar: "kısaca görülecek ve bariz korku efektine sahip olacak." Bu, tek bir olayda (CAUGHT tetiklendiği an) senkron dört bileşen olarak somutlaşıyor — hepsi **öneri, `game-designer`/`art-director` onayı gerekli**, hiçbiri şu an `tuning.md`'de değil:

| Bileşen | Öneri | `art-bible.md` §4 sınırıyla ilişki |
|---|---|---|
| **Kamera sarsıntısı** (`CYCLOPS_JUMPSCARE_SHAKE_MS`, öneri ~200–350 ms) | Tek, sönümlenen bir darbe (loop değil) — mevcut kamera rig'ine eklenebilecek küçük genlikli bir ofset. | İhlal yok: parlaklık/renk değişimi değil, salt kamera hareketi; fotosensitivite kuralı ışık/renk geçişlerini kapsıyor. |
| **Ani ses** (tek-shot, `audio.ts`'teki mevcut oscillator/noise deseniyle) | Kükreme/gürleme — aniden başlayan, kısa (~0.3–0.5 s) tek bir ses; PRESENT evresinin sürekli "uzak nefes/adım" katmanından (§4.3, §11) ton olarak ayrışan, net bir sıçrama noktası. | Görsel değil, işitsel — fotosensitivite kısıtına hiç girmiyor. |
| **Ekran kenarı vurgusu** (`CYCLOPS_JUMPSCARE_PULSE`, öneri) | **Tek** yükselip-sönen kehribar/turuncu tonlu bir kenar vurgusu (§4.5 madde 3'te zaten önerilen algılanma renk dilinin yeniden kullanımı) — yükseliş hızlı (~150–250 ms) olabilir çünkü bu bir "geçiş" değil ani bir tepki, ama sönüş **`art-bible.md` §4'ün ≥1,5 s geçiş kuralına uyacak şekilde en az 1,5 s'de** yumuşakça geri çekiliyor. Tek seferlik — döngü/tekrar yok, yani stroboskopik değil. **Kırmızı değil** (hasar flaşı diliyle karışmasın diye), **ekranı tamamen karartmıyor** (yalnızca kenar/vinyet vurgusu, `art-bible.md`'nin "ekranı karartmak yasak" kuralına uyar). | Doğrudan üç kısıtı da hedefler: kırmızı yok, karartma yok, ≥1,5 s geçiş (sönüş fazında), tekrar/stroboskop yok. |
| **Kısa görsel beliriş** (`CYCLOPS_JUMPSCARE_DURATION`, öneri ~0.4–0.8 s) | Polyphemos'un modeli bu pencerede gerçekten render edilir/görünür olur — sabit birkaç "beliriş" konumundan biri (§10'daki basit reveal-state, tam patrol AI değil), sonra kesilir/geometriye geri çekilir (ekran kararmaz, o an sahne zaten mağara ağzına ışınlanma/`CAUGHT_RESPAWN` geçişine akar). | Kararma değil, geometrik/mesafe tabanlı gizlenme — kurala uygun. |

**Sıklık kısıtı:** bu dörtlü yalnızca CAUGHT olayında tetiklenir (§4.3'teki görünürlük kararına bağlı) — DETECT yükselirken veya PRESENT evresine her girişte tetiklenmez. Bu hem tekrarın stroboskopik/rahatsız edici hale gelmesini engeller hem de olayı "büyük, nadir" tutar (`CAUGHT_MEM_SPIKE`'ın "büyük olay" niyetiyle aynı çizgide).

### 4.5 Açıkça yeni ihtiyaçlar (flag — `game-designer` kararı)

1. **Yeni sabit ailesi:** `DETECT_MAX`, `DETECT_RATE_LIT_MOVING`, `DETECT_RATE_LIT_STILL`, `DETECT_RATE_SHADOW_MOVING`, `DETECT_DECAY`, `CYCLOPS_CYCLE` + alt-evre süreleri, `CAUGHT_ITEM_LOSS`, `CAUGHT_MEM_SPIKE`, `CAUGHT_RESPAWN`, `CYCLOPS_JUMPSCARE_SHAKE_MS`, `CYCLOPS_JUMPSCARE_PULSE` (+ fade süresi), `CYCLOPS_JUMPSCARE_DURATION` (§4.4.1), `CYCLOPS_ROCK_SHADOW_CUE` (§9) — hiçbiri `tuning.md`'de yok, hepsi bu doküman kadar öneri.
2. **Yeni davranış:** bugün "topla" fiili hiçbir zaman envanteri **istemsizce** azaltmıyor (sadece teslim azaltıyor). Yakalanma bunu ilk kez kırıyor — küçük ama gerçek bir sözleşme değişikliği, sessizce geçilmemeli.
3. **Sunum katmanı:** `FX_VIGNETTE` ailesi unutuşa bağlı; algılanma göstergesi için (P2 diliyle — "algılanma da görülür, anlatılmaz") muhtemelen ayrı, kehribar/turuncu tonlu bir katman gerekir. Bu `art-director` + `ui-programmer` + `game-designer` üçlüsünün kararı.

---

## 5. Toplanabilir öğe — azık (peynir tekeri / şarap tulumu)

**Öneri: tek görsel-mekanik tip, "azık" olarak adlandırılıyor** — sepetteki peynir tekerleri [H] birincil, birkaçı şarap tulumu [H] (görsel çeşni, mekanik olarak aynı). Lotus'un tek çiçek tipiyle aynı sadelik ilkesi.

**Neden bu, sürü/post değil:** Görev metni "koyun" alternatifini de öneriyor (kaçış-hazırlığı eşyası olarak); değerlendirildi ama **elenmedi değil, ertelendi** — post/koç fikri kaçış sahnesine (Polyphemos'u kör edip koç karnına bağlanma) daha güçlü bağlanıyor ama (a) canlı hayvan AI'sı ya da en azından "hazırlanmış post" soyutlaması gerektiriyor, (b) kaçış sahnesinin kendisi muhtemelen bu seviyenin oynanış döngüsü değil, geçiş anındaki bir **anlatı beat'i** olacak (Lotus'un AYRILIŞ'ı gibi — mekanik olarak canlandırılmıyor, düz yazıyla anlatılıyor). Peynir/tulum, Homeros'ta zaten sahnenin ilk göze çarpan nesnesi, statik-toplanabilir bir prop olarak inşası ucuz (lotus.ts'teki `Plant` deseniyle bire bir aynı API — bkz. §10) ve iki soru arasında karışıklık yaratmıyor. **Post fikri kaçış beat'inin sanat/anlatı tasarımında yeniden gündeme gelebilir — bu doküman onu kapatmıyor, sadece bu seviyenin toplanabilir öğesi olarak seçmiyor.**

**Yenilenmez — kilit fark:** Lotus'taki çiçekler döngüseldir (`LOTUS_CYCLE`, sürekli yeniden olgunlaşır); buradaki azık **sonludur** — alınan bir öğe geri gelmez. Bu bilinçli bir ton farkı: Lotus "ritim/döngü," Kiklop "tek seferlik soygun." Mağara bir bahçe değil, bitmeyen bir stok değil.

**Toplam öneri:** `CYCLOPS_ITEM_TOTAL` = 7 (2 depo + 3 ağıllar + 2 iç nöy) — hedefin (`CYCLOPS_ITEM_TARGET` = 4, kilitli) 1,75 katı. Lotus'un tampon oranından (28/12 ≈ 2,3×) daha dar — çünkü öğe yenilenmiyor, tampon fazlaysa "her şeyi topla" davranışı ödüllenir ve sızma gerilimi kaybolur. **Aralık önerisi: 6–8**, kesin sayı playtest'e (kaç yakalanma sonrası oyuncu hâlâ 4'e ulaşabiliyor) bırakılmalı.

---

## 6. Yerleşim mantığı

1. **Minimum aralık.** Lotus'un `LOTUS_MIN_SPACING` (3.0 m) aynen uygulanabilir — iki öğe asla aynı anda hedeflenemez.
2. **Kümeler değil, oda-başı dağıtık sayılar.** Lotus'ta kümeleme "hangi üçü birlikte olgunlaşıyor" sorusuna hizmet ediyordu; burada öğeler statik olduğu için kümeleme gerekmiyor — bunun yerine **oda başına sabit sayı** (2/3/2) risk-ödül eğrisini taşıyor.
3. **Mesafe–risk aynı yönde artıyor (Lotus'tan fark).** Lotus'ta mesafe arttıkça çiçek yoğunluğu artıyordu ama koku baskısı **azalıyordu** (dengeleyici). Burada mesafe arttıkça hem öğe değeri/yoğunluğu hem de algılanma riski **aynı yönde** artıyor — dengeleyici bir ters-eğim yok. Bu kasıtlı: mağara Lotus'un "her bölge kendi açısından haklı" felsefesini değil, "derine gitmek gerçekten daha tehlikeli" felsefesini yansıtıyor — soygun temasına daha uygun.
4. **Güvenli minimal rota matematiksel olarak var olmalı.** Depo (2) + ağıllar (3) = 5 ≥ hedef (4) — oyuncu iç nöye hiç girmeden bitirebilir. Bu, Lotus'un "hız stratejisi kasıtlı olarak geçerli" ilkesiyle aynı: en güvenli rota **var olmalı**, sadece en hızlı olmamalı.
5. **Tek boğaz kuralı.** Tüm odalar tek bir D=0 koridorundan geçer (bkz. §9) — Lotus'un çok yönlü kıyı erişiminin aksine, her dönüş aynı riskli noktadan geçmek zorunda. Yerleşim bunu telafi etmiyor, kasıtlı olarak kullanıyor.

---

## 7. Oyuncu rotası

### Yapısal fark (önemli): hedef = kapasite

`CYCLOPS_ITEM_TARGET` (4) = `CARRY_CAPACITY` (4) — Lotus'un "hedef kapasiteyi 3'e böler" mantığının aksine, burada **kusursuz bir tek tur teorik olarak yeterli.** Bu, adanın "çok-turlu hasat alanı" değil **"tek seferlik sızma"** olarak hissettirilmesi gerektiğinin yapısal kanıtı — myth'in kendisiyle de örtüşüyor (Kiklop bölümü "yarın tekrar gel" demiyor, tek uzun bir sınav).

### Beklenen ilk oyun (öğrenme)
Gemi → mağara ağzı (ders: aydınlık+hareket riskli) → depo, 2 öğe → ağıllar, tereddütlü ilerleme, 1 yakalanma (öğe kaybı + unutuş sıçraması + §4.4.1'deki korku efekti: kamera sarsıntısı, ani ses, kehribar kenar vurgusu, Polyphemos'un kısa belirişi) → gölge cebinde bekle, DETECT düşsün → 2 öğe daha topla (toplam 4 ama biri kayıptan telafi) → gemi → teslim. **~6–7 dk**, en az bir yakalanma normal kabul edilmeli.

### Beklenen ustalık oyunu
Gemi → depo 2 (DIŞARIDA evresinde, risk yok) → ağıllar, PRESENT telegrafını duyunca gölge cebinde donar, evre geçince 2 öğe alır → gemi, tek turda 4/4 teslim. **~3–4 dk**, iç nöye hiç girmez, tek yakalanma bile yaşamaz. **Doğrudan sonucu (§4.3'teki görünürlük kararıyla):** Polyphemos'un kendisi hiç *görünmez* — çünkü görsel beliriş yalnızca CAUGHT anına bağlı (§4.4.1). Ustalık oyununun ödülü sadece hız/verim değil, canavarı hiç görmeden bitirmiş olmak; "çoğunlukla duyulan, kısaca görülen" adanın kendisi, oyuncunun becerisine göre "hiç görülmeyen"e kadar sıkışabiliyor.

### Alternatif: derin risk (kasıtlı olarak geçerli ama gerekli değil)
İç nöye giren oyuncu daha değerli/ekstra öğe bulur (fazladan tampon — bir yakalanmayı karşılayabilir) ama Polyphemos'un PRESENT dönüş noktasına en yakın odaya girmiş olur. Lotus'un Lotophagos-takası gibi: **meşru ama gereksiz bir risk**, tasarım onu cezalandırmaz, sadece ödüllendirmez.

---

## 8. İlk 30 saniye (geçiş beat'i — Lotus'tan devam)

| Süre | Ne olur | Ne öğretir |
|---|---|---|
| 0–5 s | Kamera Lotus'un gemisinden ayrılışın devamında, kayalık bir burna yaklaşan tek gemiye geçer (kesintisiz — yükleme ekranı yok, M2 kilitli karar). Duman/karaltı uzakta görünür. | Yeni bir yere geldiğini, tek başına olduğunu (filo geride). |
| 5–9 s | Kısa metin (1–2 satır, kesin metin `scenario.md`-eşdeğeri bir dokümanın işi — burada sadece işlev tarif ediliyor): mağaranın bulunuşu, azık ihtiyacı. | Neden buradasın. |
| 9–14 s | Oyuncu kumda/koyda kontrolü alır, mağara ağzına yürür — dışarıda hâlâ güvenlidir (deniz/gemi yakın), bu bilinçli bir "son nefes" alanı. | Hareket, kamera — Lotus'tan zaten biliniyor, tekrar öğretilmiyor. |
| 14–20 s | Mağara ağzından içeri girer; ışık değişir (gün ışığından mağara aydınlığına), depo görünür, ilk iki azık göz hizasında parlar. | Hedef nerede, ne toplanacak. |
| 20–26 s | İlk öğeye yaklaşır, `E — topla` görünür (aynı tuş, aynı `HARVEST_HOLD` dili — yeni öğrenme yükü yok). | Toplama fiili değişmedi. |
| 26–30 s | Toplarken (ya da hemen sonra) uzaktan ilk kez gürleme/ayak sesi duyulur — DÖNÜŞ telegrafı henüz tetiklenmemiş olabilir ama ses katmanı "burada birisi var" hissini erken veriyor. | Tehlike var, henüz görünmüyor — P2'nin bu adadaki ilk uygulaması. |

**30. saniyede oyuncu:** toplama fiilinin aynı kaldığını, ama ortamın aydınlık/karanlık, hareket/durgunluk ekseninde farklı bir kural taşıdığını *hissetmiş* olmalı — hiçbir eğitim metniyle değil.

---

## 9. Giriş / çıkış noktaları

**Giriş = çıkış = teslim noktası, tek nokta.** Lotus'un açık kıyısından farklı olarak mağara **tek bir boğazdan** (D=0, mağara ağzı) erişilir — her gidiş-dönüş bu noktadan geçer. Gemi bu boğazın hemen dışında (D≈−15), yani en kısa güvenli hat her zaman aynı.

**Kapsam dışı not (bilerek):** Homeros'taki koca kaya kapı [H] burada **oynanışsal bir engel değil, dekor**dur — kapanıp oyuncuyu hapsetmiyor. Gerekçe: (a) bu, kaçış-sahnesinin (kör etme, koç altına bağlanma) kendisiyle örtüşüyor ve o sahne muhtemelen bu seviyenin toplama döngüsü değil, geçiş anındaki bir anlatı beat'i olacak; (b) kapıyı gerçek bir engel yapmak ("kilitli kapı" — `level-lotus-island.md`'nin açılış cümlesindeki "kilitli kapı yoktur" ilkesine aykırı düşebilir) yeni bir durum-makinesi gerektirir. **Bu, ileride sahip/`game-designer` isterse yeniden açılabilecek bir kapsam kararı — şu an kapsam dışı bırakılıyor, kapatılmış bir karar değil.**

**Kaçış ipucu (2026-08-14, sahip — §12 eski madde 6 kapandı):** koca kaya mekanik bir engel olmasa da tamamen sessiz kalmıyor. **PRESENT evresinde** (§4.3), boğazdan (D=0) her geçişte, oyuncunun **arkasından** düşen kısa bir gölge (kayanın dışarıdan bir an için gökyüzünü kapattığı izlenimi, zemine düşen büyüyüp-küçülen bir gölge lekesi) ve buna eşlik eden alçak, gergin bir **taş gıcırtısı/sürtünme sesi** (tek-shot, `audio.ts`'teki mevcut desenle) eklenir. Bu **sadece bir haberci** — kayanın gerçekten hareket ettiğini ima etmez, kapanmıyor, oyuncuyu durdurmuyor, hiçbir mekanik engel üretmiyor; kaçış temasının ("bu yer bir gün kapanacak") sahneye sızmasını sağlayan, tamamen görsel/işitsel bir katman. **Sıklık:** yalnızca PRESENT evresinde ve yalnızca boğaz geçişlerinde (§4.3'teki DÖNÜŞ telegrafından ayrı, ona ek bir "gerginlik" katmanı) — DIŞARIDA evresinde hiç görünmez, böylece ipucu kendi başına bir DETECT sinyaline karışmaz. **`CYCLOPS_ROCK_SHADOW_CUE`** (öneri isim) — `tuning.md`'ye eklenecek yeni bir sayısal davranış değil, salt sunum katmanı; `game-designer` onayı yalnızca sıklık/süre ayrıntıları için gerekir, sistemik bir karar değildir.

---

## 10. Kod yeniden-kullanım notları

### Doğrudan yeniden kullanılabilir
- **`src/systems/input.ts`** — değişiklik yok. Yeni tuş gerekmiyor (§4.1).
- **`src/systems/audio.ts`** mimarisi (oscillator/noise tabanlı, tuş-bazlı unlock) — aynı desen, yeni one-shot'lar (gürleme, koyun melemesi, damlama) eklenir.
- **`src/systems/burst.ts`** — toplama parçacığı ve yeni "yakalandın" flaşı için aynı havuz kullanılabilir.
- **`src/world/lotus.ts`**'teki `Plant`/`findRipe`/`pick`/`positionOf` API şekli — azık öğeleri için **birebir uygulanabilir desen** (statik, sahne-başı sabit konum, "en yakın uygun olanı bul, topla, kaldır"). Döngü/evre mantığı (`advance`, `STAGE_ORDER`) gerekmez çünkü öğeler yenilenmiyor (§5) — bu, dosyanın basitleştirilmiş bir kopyası/varyantı olur. `gameplay-programmer` isterse ortak bir `collectible.ts` soyutlaması çıkarabilir — bu bir öneridir, zorunluluk değil.
- **`src/world/lotophagos.ts`**'teki prosedürel-primitiften-insan-figürü inşa deseni — Polyphemos'un (büyük ölçekli) ve koyun/keçi dekor modellerinin (küçük ölçekli, statik) inşasında yeniden kullanılabilir.
- **`src/world/sprite.ts`** (`glowSprite`, `loadAlbedoTexture`) — azık dokuları ve ışık-kaynağı parıltıları için aynen kullanılabilir.
- **`src/render/` post-process** (haze/vignette, unutuş-tetikli) — unutuş sıçraması (§4.4) zaten bu boru hattından geçer, değişiklik gerekmez.

### Deseni uyarlanabilir, dosyası yeni yazılmalı
- **`src/world/terrain.ts`**'teki `heightAt`/`lagoonDist` tarzı mesafe-alanı yaklaşımı — mağara için bir "koridor sınırı" fonksiyonuna (açık ada kubbesi yerine dar geçit) dönüşmeli. Aynı matematiksel dil (smoothstep, deterministik gürültü), farklı geometri.
- **`SCENT_RADIUS`** deseni (statik nesne etrafında sabit yarıçap, unutuşa `bool` bayrak besleyen) — ışık-bölgesi tanımı için doğrudan örnek alınabilir: her meşale/ocak/mağara-ağzı için sabit bir "aydınlık yarıçapı," `MEM_SCENT`'in `koku` bayrağıyla aynı şekilde bir `aydınlık` bayrağı üretir.

### Tamamen yeni
- **Algılanma metre'si + Polyphemos evre zamanlayıcısı** (§4) — `LOTUS_PHASE_SEED` tarzı deterministik ama yeni bir durum makinesi; en büyük mühendislik kalemi bu.
- **Polyphemos'un "PRESENT" evresindeki basit varlık/görünürlük mantığı** — tam bir devriye/pathfinding AI'sı **önerilmiyor** (kapsam tasarrufu): "çoğunlukla duyulan, kısaca görülen" bir temsil (sabit üç-dört konum arasında evre-bazlı görünürlük, hareket eden bir AI değil) Lotus'un `lotophagos.ts`'teki statik-idle figür karmaşıklığıyla aynı seviyede kalır. Bu bir öneri — `technical-director`/`gameplay-programmer` kapsamı büyütmek isterse onların kararı.
- **İstemsiz envanter kaybı** (§4.4, madde 2) — bugün hiçbir sistemde yok, yeni bir olay tipi (`onCaught`) gerekir.

---

## 11. Asset ihtiyaç listesi (düz dil — palet/stil kararı `art-director`'ın işi)

- Mağara iç geometrisi: dar koridor + üç oda (depo, ağıllar/ocak, iç nöy), kaya dokusu, farklı bir zemin/duvar dili (Lotus'un kum/kaya/sazlık paletinden görsel olarak ayrışmalı).
- Azık propu: peynir tekeri + şarap tulumu (2 varyant, tek toplanabilir tip) — lotus'un sahne-taşı sprite'larına benzer ölçekte.
- Ağıl/kuzu-keçi dekoru: statik, düşük detay, animasyon gerekmiyor (yalnızca dekor, etkileşilmez).
- Ocak ateşi: ışık kaynağı + hafif parçacık/kor efekti (mevcut `Bursts`/`glowSprite` sistemleriyle uyumlu).
- Koca kaya (mağara ağzı): tek statik prop, dekor; ek olarak PRESENT evresinde boğazdan geçişte tetiklenen bir gölge-düşürme/parçacık ipucu (§9 "Kaçış ipucu") — ayrı bir modele gerek yok, mevcut prop üzerinde ışık/gölge katmanı.
- Polyphemos figürü: büyük ölçekli, basitleştirilmiş silüet/model — "çoğunlukla duyulan, CAUGHT anında kısaca görülen" tasarım kararına uygun düşük-poligon, muhtemelen `lotophagos.ts`'teki primitif-inşa yaklaşımının büyütülmüş hâli. Ayrıca CAUGHT anındaki kısa (~0,4–0,8 s) beliriş için birkaç sabit "reveal" pozu/konumu (§4.4.1) — tam bir animasyon iskeleti gerekmez.
- Tek gemi (Doryseus'unki) — mevcut `ship.ts`'in on iki gemi motifinden **sıyrılmış**, tek-gemi versiyonu; muhtemelen doğrudan yeniden kullanılabilir bir alt-küme.
- Ses: gürleme/ayak sesi (uzaktan), damlama/mağara tınısı, koyun melemesi, uzak nefes/horlama (PRESENT evresinin "sessiz" ama hissedilir katmanı), CAUGHT anına özel ani kükreme/şok sesi (§4.4.1), boğaz geçişindeki taş gıcırtısı ipucu sesi (§9).
- Yeni sunum katmanı (§4.5 madde 3): algılanma göstergesinin görsel dili — kehribar/turuncu ton önerisi, kesin karar `art-director` + `game-designer`. Aynı ton dili CAUGHT anının kenar-vurgusu efektinde de yeniden kullanılıyor (§4.4.1) — iki ayrı renk dili icat edilmiyor.

---

## 12. Açık sorular

1. **§0.2'deki anlatı çerçevesi onaylanıyor mu?** Oyuncunun "tayfanın reddedilen önerisini" yapması mı, yoksa farklı bir gerekçe (ör. kayıp tayfayı arama) mi tercih edilir? Bu, geometriyi değiştirmez ama geçiş metninin tonunu belirler.
2. **Yakalanma sonrası ışınlanma noktası:** mağara ağzı (§4.4, önerilen — daha yumuşak) mı, tamamen gemiye/dışarıya (mevcut `UNUTULMA` diliyle daha tutarlı ama daha sert) mı? `game-designer` kararı.
3. **`CYCLOPS_ITEM_TOTAL` = 6, 7 yoksa 8 mi?** Playtest'e kalmış — oyuncu bir-iki yakalanma sonrası hâlâ 4'e ulaşabiliyor mu, ölçülmeli (Lotus'un `tuning.md` §11 ölçüm listesine benzer bir madde önerilir).
4. ~~**Polyphemos "çoğunlukla duyulan, kısaca görülen" mü, yoksa görünür/devriye gezen bir figür mü olmalı?**~~ **Kapandı (2026-08-14, sahip).** Karar: "çoğunlukla duyulan, kısaca görülen" yönü korunuyor; "kısaca görülen" **CAUGHT anına** bağlanıyor ve **bariz bir korku/şok efektiyle** somutlaşıyor — kamera sarsıntısı, ani ses, tek seferlik (stroboskopik olmayan) kehribar/turuncu kenar vurgusu (`art-bible.md` §4'ün karartma/kırmızı-flaş/≥1,5 s geçiş kısıtlarını ihlal etmeden), Polyphemos'un çok kısa (~0,4–0,8 s) görsel belirişi. Bkz. §4.3 (görünürlük kararı) ve §4.4.1 (efekt bileşenleri).
5. **İç nöye hiç girmeyen "güvenli minimal rota" (§6 madde 4) playtest'te gerçekten keşfediliyor mu, yoksa oyuncular otomatik olarak en derine mi gidiyor?** Lotus'un tepe sorusuna (`level-lotus-island.md` açık soru 1) çok benzer bir risk — eğer kimse fark etmiyorsa dağılım yeniden düşünülmeli.
6. ~~**Koca kayanın dekor kalması (§9) yeterince tatmin edici mi, yoksa kaçış temasının bir parçası olarak en azından görsel bir "kapanma" ipucu mı eklenmeli?**~~ **Kapandı (2026-08-14, sahip).** Karar: ipucu eklensin. Koca kaya hâlâ mekanik bir engel değil (bu kısım kapsam dışı kalmaya devam ediyor, §9'daki not değişmedi), ama PRESENT evresinde boğaz geçişlerinde arkadan düşen kısa bir gölge + taş gıcırtısı sesi eklendi — kaçış temasının habercisi, tamamen sunum katmanı. Bkz. §9 "Kaçış ipucu."
