# Seviye — Kiklop Mağarası

> **Durum:** taslak — sahip onayı bekliyor (kapı/körleşme mekaniği ve kroki eklendi, 24 Ağu 2026)
> **İlk yazım:** 2026-08-14, `island-designer` brief'i (durak 2/3, `docs/design/multi-island-concept.md` §6 M3)
> **Bu tur:** 2026-08-24, `@cove` (Island Designer) — sahip'in kapattığı D1/D2/D3 kararları + yeni "kapı = körleşme" çekirdek mekaniği implementasyona-hazır spec'e çevrildi. `docs/production/cyclops-cave-production-plan.md` §1.4/§1.5'in ölçülü krokisi bu dosyaya taşındı/uzlaştırıldı.
> **✅ Sayılar artık kilitli (24 Ağu 2026):** bu dosyanın geometri/yerleşim sabitleri `@cove` tarafından kesinleştirildi; sistem sabitleri (`DETECT_*`, `CYCLOPS_PHASE_*`, `CYCLOPS_CYCLE` = **96.0 s**, körleşme sabitleri) `@helix` tarafından karara bağlandı ve **`tuning.md` §12/§12.1'e yazıldı** — orası tek doğruluk kaynağıdır, çelişki çıkarsa `tuning.md` kazanır. Körleşme mekaniğinin otoritesi: **`gdd-cyclops-blinding.md`**. Hangi sabitin nerede yaşadığı: `tuning.md` §12.2.
>
> ~~**Sayılar:** bu dosyadaki tüm `CYCLOPS_*` ve `DETECT_*` değerleri **öneridir** — hiçbiri `tuning.md`'de değil.~~ *(14 Ağu, artık geçersiz.)* `DETECT_*`, `CYCLOPS_PHASE_*`, `CYCLOPS_CYCLE`, çarpanlar (`CYCLOPS_PRESENT_MULTIPLIER` vb.) **`@helix`'in (game-designer) malı** — bu dosya onlara girdi verir, karar vermez. Geometri/yerleşim sabitleri (`CYCLOPS_CAVE_DEPTH`, oda sınırları, saklaş noktaları, ocak konumu, azık koordinatları, ışık eğrisi) **`@cove`'un (island-designer) malı** — bu dosyada nihai öneri olarak veriliyor.
> **Bağlı doküman:** `level-lotus-island.md` (format örneği) · `gdd-lotus-collection.md` · `gdd-detection-cyclops.md` (algılanma sistemi — DETECT_*, evre saati; bu dosyayla aynı zaman çizgisinde okunmalı) · `docs/production/cyclops-cave-production-plan.md` §1.4/§1.5 (kroki + hub akışı, bu dosyanın kaynağı) · `multi-island-concept.md` §6 M3 (kilitli kararlar — **M7 "tek koşu" artık geçersiz, bkz. aşağı**) · `scenario.md` (Lotus'un anlatı çerçevesi — bu adanın kendi `scenario.md`-eşdeğeri metni henüz yazılmadı)

~~Tek durak, tek mağara. Hub yok — bu, koşunun 2. adımı; oyuncu Lotus Adası'ndan gemiye binip kesintisiz buraya geçer, unutuş `MEM_ISLAND_RELIEF_PCT` (🔬 0.4, `game-designer` malı) ile kısmen taşınmış gelir.~~
**Artık geçersiz (24 Ağu 2026, sahip'in yapısal kararı) — bkz. §8.** Her durak hub'dan bağımsız seçilen, kendi başına biten bir oturum; duraklar arası hiçbir durum (unutuş dahil) taşınmıyor. Giriş hub kartından. Ayrıca **bu adada hiç unutuş/bellek sistemi yok** (§0.4/D3) — `MEM_ISLAND_RELIEF_PCT` bu durak için zaten anlamsız, tartışma kapandı.

---

## 0. Mitolojik çapa ve yerel twist — geometriden önce onay

### 0.1 Kaynak **[H]** — *Odysseia* IX.105–566, Polyphemos bölümü

Kısa özet, sahneler sırayla:

- **IX.105–192** — Filo Kikloplar ülkesine yakın, ıssız bir "keçi adası"na demirler (hiç gemi uğramaz, av bol). Doryseus filonun **on birini** orada bırakır, **kendi gemisiyle** ve on iki adamıyla anakaraya, dumanı gördükleri mağaraya gider — yanında Maron'un verdiği güçlü şarap vardır.
- **IX.193–250** — Mağara boş bulunur (Polyphemos sürüsüyle dışarıdadır): sepetlerde peynirler, yaşına göre ayrılmış kuzu/oğlak ağılları, süt/lor dolu kovalar. **Tayfa peyniri kapıp gemiye kaçmayı önerir; Doryseus reddeder** — konuğu görmek, hediye almak ister. Bu, hikâyenin trajik hatasıdır.
- **IX.250–414** — Polyphemos döner, **mağarayı devasa bir kayayla kapatır** [H, doğrudan — bkz. §9], adamları keşfeder, art arda **altı adamı** (ikişer ikişer, üç oturumda) yer. Doryseus zeytin ağacından sivri bir kazık hazırlar, ateşte sertleştirir; Polyphemos'u şarapla sarhoş eder, adını **"Kimse" (Outis)** olarak söyler.
- **IX.415–479** — Sarhoş uykusundayken kazığı tek gözüne saplayıp kör ederler. Çığlığa gelen diğer Kikloplara "Kimse beni öldürüyor" der — kimse yardıma gelmez.
- **IX.480–566** — Sabah, kör Polyphemos sürüyü otlatmaya çıkarırken hayvanların sadece sırtlarını yoklar; Doryseus adamlarını koçların **karnına bağlayarak**, kendisi en iri koçun postuna tutunarak kaçırır. Gemiye varıp açıldıktan sonra Doryseus alay ederek **gerçek adını** haykırır — bu, Polyphemos'un babası Poseidon'a beddua etmesini ve destanın geri kalanındaki düşmanlığını doğurur.

**Bu bölümün gerçek dehşeti canavarlık değil, hatadır:** doğru tavsiye (al ve kaç) reddedilir, konukseverlik beklentisi altı adamın hayatına mal olur. Savaş yok, sadece yanlış karar ve onun bedeli.

### 0.2 Oyun için icatlar **[O]** — çerçeve F3, kilitlendi (24 Ağu 2026, sahip)

| İcat | Ne | Neden / Homeros'la ilişki |
|---|---|---|
| **Toplanabilir = azık (peynir tekeri / şarap tulumu)** [H, sepetteki peynirler IX.219] | Gemide bekleyen tayfa aç; erzaksız geçit aşılamaz. Statik prop, `src/world/lotus.ts`'in `Plant` API deseni birebir kopyalanır. | Homeros'ta zaten sahnenin ilk göze çarpan nesnesi; escort/tayfa-kurtarma AI'sı yok (bu projede en pahalı tek mühendislik kalemi olurdu) — kapsam dışı bırakıldı. |
| **Hub kart metni aynen kalır** — *"Körleşmeden, tayfanla birlikte çık."* | Kart metni değişmiyor. "Körleşme" artık **unutuş sisine değil, mağaranın gerçek karanlığına** (kapı kapanınca) işaret ediyor — bkz. §0.4. | **Türetilmiş (@cove, 24 Ağu 2026) — sahip vetosuna açık.** Sahip kart metnini değiştirmeyin dedi ve yeni kapı mekaniğini tarif etti; ikisinin birbirini nasıl mekanik olarak doğruladığı (kelimenin gerçek karanlıkla örtüşmesi) benim çıkarımım, sahip bunu birebir söylemedi. |
| **Tek gemi, on bir gemi geride** | Homeros'ta zaten böyle. | **[H] doğrudan** — icat değil, doğrulama. |
| **Devin kendisi tehlike kaynağı, ikram eden yok** | Lotophagoi'nin aksine Polyphemos hiçbir şey vermez; oyuncu ona hiç E basmaz. | Homeros'ta zaten düşman — icat gerektirmiyor. |

Bu tabloyla **§12 eski açık soru 1 kapandı** — bkz. §12.

### 0.3 Lotophagos-eşdeğeri bir figür var mı — **hayır**

Değişmedi: Polyphemos'un kendisi tek figürdür ve saf tehlike kaynağıdır — oyuncu ona hiçbir zaman etkileşim tuşuyla yaklaşmaz. `LOTOPHAGOS_*` ailesinin bir karşılığı bu adada yoktur.

### 0.4 YENİ ÇEKİRDEK MEKANİK — Kapı = "körleşme" (24 Ağu 2026, sahip, D3'ün yerine geçen sistem)

~~Bu adada da `MEM_SEA_RECOVER`/`SHIP_AURA` eşdeğerleri, `MEM_*`, `FX_VIGNETTE`, haze/vinyet, `DRIFT_*` çalışıyor~~ **Artık geçersiz (24 Ağu 2026, D3).** Sahip'in birebir kararı: **bu adada unutuş/bellek sistemi yok.** Yukarıdaki ailenin hiçbiri Kiklop Mağarası'nda çalışmıyor — ne okunuyor ne yazılıyor. Adanın tek risk kaynağı **algılanma (`DETECT_*`, `gdd-detection-cyclops.md`)** + aşağıdaki **kapı durumu**dur; ikisi aynı zaman çizgisinde, birlikte çalışır.

**Kapı durumu, mevcut OUT/RETURN/PRESENT evrelerinin (bkz. §4.3) fiziksel/görsel karşılığıdır — yeni bir evre eklemiyor, mevcut evrelere bir katman bindiriyor:**

1. **Kapı açık = OUT + RETURN evreleri.** Güneş içeri dolar, mağara görünür. Işık girişten uzaklaştıkça zayıflar — derin odalar (İç nöy, D≈48–65) kapı açıkken bile loş kalır (bkz. §4.6'nın formülü). Mevcut oda-bazlı ışık kurgusu (`CYCLOPS_LIGHT_RADIUS`, ocak/meşaleler) büyük ölçüde korunuyor; kapı bunun üstüne binen **küresel** bir katman.
2. **Kapı kapanması = PRESENT evresinin başlangıcı.** Dev, RETURN telegrafı boyunca dışarıdan yaklaşır, mağaraya girer, kayayı arkasından çeker/kapatır — bu an PRESENT'in başlangıcıdır. Rastgele bir derinliğe kadar dolaşır (§4.7) ve orada uyur/oturur. Işık geneli düşer; yalnız yerel kısık kaynaklar (meşale/köz) dar yarıçapla kalır.
3. **Toplama yalnız kapı açıkken (OUT/RETURN) mümkün.** PRESENT saf saklan/hayatta-kal evresi — `E` ile toplama devre dışı. Net gündüz/gece ritmi.
4. **Her odada 1 belirlenmiş saklaş noktası var** (§3, §4.8) — devin rotası öngörülemez olduğu için hiçbir oda garanti güvenli değil, bu yüzden her oda kendi noktasını taşımak zorunda.
5. **Saklaş noktasında bile küçük risk var:** oyuncu hareketsiz kalmalı; DETECT sistemi (§4.1) zaten "durgun + gölge" hücresini en güvenli ama sıfır-risk-değil tutuyor — bu, saklaş noktasının pasif bir kilit değil, aktif bir disiplin gerektirdiği anlamına geliyor.
6. **"Ezilme" = "yakalanma" ile birebir aynı olay.** Karanlıkta devin varlığına/hareketine denk gelip fiziksel çarpılma, DETECT'in `100`'e ulaşmasıyla aynı `onCaught` olayını tetikler. D2'nin cezası geçerli (§4.4), bellek sıçraması **yok** (D3 yüzünden tamamen kaldırıldı).
7. **Eski oda-bazlı `CYCLOPS_PRESENT_MULTIPLIER` (×3.0) hâlâ geçerli**, kapı durumuyla aynı zaman çizgisinde çalışıyor — iki katmanlı risk: fiziksel çarpma (yeni, konum-bazlı, §4.7) + oranlı görülme (eski, DETECT-bazlı, §4.1).

> 🔴 **GÜNCELLENDİ (25 Ağu 2026, sahip) — aşağıdaki "kayıp yok" sonucu artık DOĞRU DEĞİL.** `CYCLOPS_CRUSH_CAP` = **3**: bir denemedeki 3. yakalanma/ezilme durağı **başarısız** bitirir — hub'a dönülür ve **o denemedeki tüm ilerleme (teslim edilen azık dahil) sıfırlanır.** Kalıcı ceza yok, sınırsız tekrar denenebilir. Yani bu adada bir *ölüm* yok ama bir **deneme kaybı** var. Aşağıdaki paragraf arşivdir; bağlayıcı sözleşme: `gdd-cyclops-blinding.md` bitiş/kayıp sözleşmesi + `tuning.md` §12.

~~**Sonuç — bu adada game-over/kayıp-finali yok.**~~ Eskiden `CAUGHT_MEM_SPIKE` unutuşu `MEM_MAX`'a taşırsa koşu-bazlı kayıp akışı devreye giriyordu (`gdd-detection-cyclops.md` §3.4 madde 6). D3 ile bu bağ tamamen kesildi: bu adada hiçbir olay bir "kaybetme" durumuna yol açmıyor, yalnızca zaman/verim kaybettiriyor. **Türetilmiş (@cove, 24 Ağu 2026) — sahip vetosuna açık, `@helix` teyidi gerekir:** bu, DETECT sisteminin kendi orijinal tasarım gerekçesini (§1, `gdd-detection-cyclops.md` — "algılanma kendi başına bir kayıp/ölüm koşulu değildir, tek besleme noktası unutuştur") kökten değiştiriyor; artık besleyecek bir unutuş yok, yani DETECT'in *tüm* cezası §4.4'teki yerel sonuçlara (item scatter + ışınlanma + korku FX) indirgeniyor. Bu iyi haber (kilitlenme riski azalır, bkz. §5.3) ama `gdd-detection-cyclops.md`'nin kendisi bu konuda güncellenmeli — bu benim kararım değil, `@helix`'e flag ediyorum.

---

## 1. Ölçüler — implementasyona hazır (`docs/production/cyclops-cave-production-plan.md` §1.4 ile uzlaştırıldı)

### 1.1 Eksen sözleşmesi (bağlayıcı, bu dosyanın tüm koordinatları buna göre)

- Mağara **+Z** yönünde derinleşir. `D = z − z_eşik` (z_eşik = mağara ağzının fiziksel eşiği, D=0).
- **Genişlik = X** (merkez hattı `x=0`, sağ/pozitif = harita üstten bakışta "doğu", sol/negatif = "batı" — bu dosyada yön adları bu sözleşmeyle kullanılıyor, tutarlı olması için).
- **Yükseklik = Y** (tavan).
- `D < 0` dışarısı (koy/patika), `D = 0` eşik/kapı, `D` arttıkça mağaranın içi.

### 1.2 Ölçülü tablo (§2'nin ASCII krokisiyle birebir eşleşir — eski çelişki kapandı)

| Bölge | D aralığı (m) | Genişlik X (m) | Tavan Y (m) | Öğe sayısı | Işık (kapı açık, temel) | Not |
|---|---|---|---|---|---|---|
| Koy / gemi | −20 … −8 | serbest, açık | gökyüzü | 0 | gün ışığı | Teslim + çıkış |
| Patika | −8 … 0 | 6 | açık | 0 | gün ışığı | Kısa, "son nefes" alanı |
| **Mağara ağzı** (kapı burada) | 0 … 8 | 10 | 6 → 4 | 0 | en aydınlık iç mekân | `CAUGHT_RESPAWN` = D≈4. Koca kaya (kapı) tam D=0'da, §9 |
| **Depo** (antişambr) | 8 … 22 | 12 | 4 | **2** | orta, ağız ışığının kuyruğu | Öğretici, düşük risk |
| **Boğaz A** | 22 … 26 | **4** | 3 | 0 | gölge | Dar geçit — saklaş noktası **yok** (§3.6) |
| **Ağıllar / Ocak** | 26 … 44 | **14** (en geniş) | 7 | **3** | ocak = en yoğun aydınlık | Ocak merkezden kaydırıldı, §3.4 |
| **Boğaz B** | 44 … 48 | **4** | 3 | 0 | gölge | Dar geçit — saklaş noktası **yok** (§3.6) |
| **İç nöy / Uyuma köşesi** | 48 … 65 | 9 | 5 | **2** | zayıf, tek meşale, kapı açıkken bile loş | En değerli azık, Devin'in olası uyuma bölgesi |

`CYCLOPS_CAVE_DEPTH` = 65.0 m (değişmedi). Toplam öğe = 7 (2+3+2), §5.

**Terminoloji notu (karışıklığı önlemek için):** "**kapı**" tekildir, yalnız D=0'daki koca kayadır (§9) — tüm mağaranın tek giriş/çıkışı. "**Boğaz A**" ve "**Boğaz B**" iki ayrı, dar (4 m) **iç** koridordur, kapı değildir, kendi başlarına kapanmazlar — yalnızca odalar arası zorunlu dar geçitlerdir (§3.6).

### 1.3 Değişmeyenler

| İsim | Değer | Not |
|---|---|---|
| `PLAYER_SPEED` | `4.5` m/s | `tuning.md`'den, değişmez |
| `CARRY_CAPACITY` | `4` | Kilitli karar, tüm adalarda aynı |
| `CYCLOPS_ITEM_TARGET` | `4` | = `CARRY_CAPACITY`, §7 |

---

## 2. Kroki (§1.2 tablosuyla birebir eşleşir)

```
                          D I Ş A R I  (koy, açık gökyüzü)
   ══════════════════════════════════════════════════════
   ──────────────────────────────────────────────────────
        ⛵  GEMİ  (D ≈ -15)                    kayalık burun
        tek gemi, on biri geride kaldı [H]
   ──────────────────────────────────────────────────────
                          ▼ patika, D = -8..0, X=6
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ┏━━━━━━━━━━━━━━━━┓
                    ┃  🪨 K A P I    ┃  D=0 — koca kaya, GERÇEK kapı [H]
                    ┃  MAĞARA AĞZI   ┃  PRESENT'te kapanır (§0.4/§9),
                    ┃   D 0–8, X=10  ┃  terminal değil — sonraki OUT'ta açılır
                    ┗━━━━━━━━━━━━━━━━┛  saklaş: (x=+4, D=6) niş, §3.2
                          │
                    ┌─────┴─────┐  D = 8–22, X=12
                    │  D E P O  │  azık × 2 — D-01(-4,12) D-02(4,20)
                    │ (antişambr)│  saklaş: (x=+5, D=19), §3.3
                    └─────┬─────┘
                          │
                  ┌───────┴───────┐  BOĞAZ A, D=22–26, X=4
                  │ (saklaş YOK)  │  Devin'in rotası x≈0'dan geçer, §3.6
                  └───────┬───────┘
                          │
              ┌───────────┴────────────┐  D = 26–44, X=14
              │   A Ğ I L L A R  /     │  azık × 3 — A-01(-3,29) A-02(3,35) A-03(-2,41)
              │      O C A K           │  ocak: (x=-4, D=35), §3.4
              │  ▓▓ kuzu ağılı ▓▓      │  saklaş: (x=+5.5, D=35) doğu duvarı gölge cebi
              │      🔥 ocak(-4,35)    │
              └───────────┬────────────┘
                          │
                  ┌───────┴───────┐  BOĞAZ B, D=44–48, X=4
                  │ (saklaş YOK)  │
                  └───────┬───────┘
                          │
                    ┌─────┴─────┐  D = 48–65, X=9
                    │ İ Ç  N Ö K│  azık × 2 — I-01(-3,53) I-02(2,63, en değerli)
                    │  UYUMA    │  Devin'in olası uyuma noktası: (x=0, D=60)
                    │  KÖŞESİ   │  saklaş: (x=+4, D=51) — girişe yakın, uykudan uzak
                    └───────────┘

   Tek giriş/çıkış/kapı: D=0 (mağara ağzı). Boğaz A/B kapı değil, dar geçit (§1.2 not).
```

---

## 3. Bölgeler — saklaş noktalarıyla birlikte

Her saklaş noktası: (x, D) merkezi + **yarıçap 1.2–1.5 m** (oyuncunun "içinde sayıldığı" alan) + fiziksel açıklama + gerekçe. Tümü **[TÜRETİLMİŞ] (@cove, 24 Ağu 2026) — sahip vetosuna açık**, `@helix` sadece playtest verisiyle DETECT davranışını buna göre kalibre eder.

### 3.1 Koy / Gemi — **güven** (D = −20 … −8)

**Öğe: 0.**
~~`MEM_SEA_RECOVER`, `SHIP_AURA` eşdeğerleri burada da çalışmalı~~ **Artık geçersiz (24 Ağu 2026, D3) — bkz. §0.4.** Bu adada unutuş sistemi yok, dolayısıyla "kıyı unutuşu iyileştirir" davranışının bir karşılığı da yok. Kalan gerçek: gemi burada demirli, teslim noktası ve Sirenler'e geçiş tetiği burada. Deniz/kıyı görsel dili (P4'ün estetik tarafı — sakinlik hissi) sanat kararı olarak korunabilir, ama mekanik bir "iyileştirme" değeri **taşımıyor**.

### 3.2 Mağara ağzı — **eşik, öğretici, kapı burada** (D = 0–8, X=10)

**Öğe: 0.** Kapı **açıkken** en aydınlık iç mekân (§4.6). Kapı **kapalıyken** bile taban bir okunabilirlik kalır (art-bible §4, "ekranı karartmak yasak").

**Saklaş noktası:** `(x = +4, D = 6)`, yarıçap **1.2 m**. Fiziksel: giriş duvarının doğu tarafında, dekoratif bir kaya çıkıntısının arkasındaki niş — koca kayanın (kapı, D≈0) kendisinden ayrı bir yapı, ondan ~6 m içeride. **Neden burada:** Devin'in rotası merkez hattından (x=0) geçiyor (§4.7) çünkü kapıdan tam ortadan girmek zorunda; niş merkezden 4 m yana kaydığı için onun giriş anındaki geçiş hattının doğrudan üstünde değil.

### 3.3 Depo (antişambr) — **kolay, öğretici hasat** (D = 8–22, X=12)

**Öğe: 2** — D-01 `(x=-4, D=12)`, D-02 `(x=4, D=20)`, §5.1.

**Saklaş noktası:** `(x = +5, D = 19)`, yarıçap **1.5 m**. Fiziksel: sepetlerin arkasındaki köşe, odanın doğu duvarına yakın. **Neden burada:** Devin'in bu odadaki olası durma noktası `(x=0, D=15)` (§4.7) — saklaş noktası ona ~6.4 m mesafede, hem lateral hem derinlik farkıyla; ışık kaynağı yok (bu odada ocak/meşale yok, yalnız ağız ışığının kuyruğu), o yüzden mesafe tek koruma değişkeni.

### 3.4 Ağıllar / Ocak — **ana gövde, orta-yüksek risk** (D = 26–44, X=14)

**Öğe: 3** — A-01 `(x=-3, D=29)`, A-02 `(x=3, D=35)`, A-03 `(x=-2, D=41)`, §5.1.

**Ocağın konumu — düzeltme (üretim planının bulduğu hata, §1.4'e girdi):** Ocak, oda merkezinden **4 m batıya kaydırıldı**: `(x = -4, D = 35)`. Gerekçe: oda 14 m geniş (x: −7…+7), ocak merkezdeyse (`CYCLOPS_LIGHT_RADIUS` 6 m ile) iki yanda yalnız ~1 m gölge kalıyordu — gölge cebi kullanılamazdı. 4 m kaydırınca doğu duvarında (x≈+2…+7) gerçek bir ~5 m'lik karanlık şerit oluşuyor (`7 − (−4) = 11 m > CYCLOPS_LIGHT_RADIUS`, ışık `x ≈ +2`'de biter). Batı duvarı (`x≈-7`) ocağa çok yakın kalır (3 m), orası hep aydınlık — kasıtlı, tek gölge cebi olsun diye simetri bozuluyor.

**Saklaş noktası:** `(x = +5.5, D = 35)`, yarıçap **1.5 m**. Fiziksel: doğu duvarındaki 5 m'lik karanlık şeridin içinde, düşük bir kaya çıkıntısının altı/duvar cebi. **Neden burada:** ocağın ışığından ~9.5 m uzakta (yukarıdaki hesap), Devin'in bu odadaki olası oturma/sağım noktasından (ocağın kendisi, `x=-4, D=35`) de aynı mesafede — hem ışıktan hem devriye hattından kaçıyor.

### 3.5 İç nöy / Uyuma köşesi — **açgözlülük bölgesi, en riskli** (D = 48–65, X=9)

**Öğe: 2** — I-01 `(x=-3, D=53)`, I-02 `(x=2, D=63)`, §5.1. I-02 kasıtlı olarak Devin'in olası uyuma noktasına yakın (risk primi, §6 madde "derin risk").

**Saklaş noktası:** `(x = +4, D = 51)`, yarıçap **1.5 m**. Fiziksel: boğaz B'den çıkışın hemen ötesinde, odanın girişine yakın bir niş — Devin'in kişisel köşesinin (uyuma noktası `x=0, D=60`, §4.7) tam tersi ucunda. **Neden burada:** hem ışıktan (§4.6'ya göre bu oda kapı açıkken bile loş, kapı kapalıyken yalnız meşalenin dar yarıçapı kalır — saklaş noktası meşaleden de uzak tutulmalı, meşale konumu §11'e bırakılıyor ama girişe yakın olması bu riski otomatik azaltıyor), hem de Devin'in uyuma noktasından **~9.8 m** uzakta (`√(4² + 9²)`) — odanın en riskli köşesi (arka, D≈60-65) değil, en az riskli köşesi (giriş, D≈51).

### 3.6 Boğaz A / Boğaz B — **saklaş noktası yok, bilinçli karar**

**Karar: boğazlarda saklaş noktası yok.** Gerekçe: (a) her ikisi de 4 m genişliğinde — Devin'in geometrik olarak sığması için rotası neredeyse zorunlu olarak merkez hatta (`x≈0`) kenetlenir (§4.7), yani boğazın **her noktası** onun geçiş hattına yakındır; gerçek bir saklanma köşesi yaratacak kadar yan alan yok. (b) Bu, level-spec'in orijinal tasarım niyetiyle (§6 madde 5, "tek boğaz kuralı") uyumlu: dar geçitler kasıtlı olarak "commit ol ve geç" alanları, güvenli sığınak değil.

**"Boğazda kapı kapanırsa oyuncu ne yapar" — cevap:** Kapı yalnız D=0'da kapanır (§9); Boğaz A/B kendi başına kapanmaz. Ama PRESENT evresi boğazdayken başlarsa (oyuncu RETURN telegrafını görmezden geldiyse), oyuncunun elinde iki seçenek var: geldiği odaya geri dön ya da önündeki odaya devam et — hangisi yakınsa. Boğaz uzunluğu yalnız 4 m; `PLAYER_SPEED` 4.5 m/s ile geçiş **~0.9 s** sürer — RETURN telegrafının süresi (`CYCLOPS_PHASE_RETURN`, öneri 6–8 s, `@helix` malı) buna kıyasla bolca zaman tanıyor; normal tepki süresiyle oyuncu telegraf başladığında boğazdaysa bile bir sonraki saklaş noktasına ulaşabilmeli. **Eğer oyuncu telegrafı gerçekten kaçırıp tam boğaz ortasındayken PRESENT başlarsa:** bu, tasarımın kabul ettiği tek "çıplak" an — Devin'in rotası oradan geçtiği için ezilme (fiziksel yakalanma) riski DETECT değerinden bağımsız olarak yüksektir; bu **kasıtlı**, boğazın "yakalanma riski alanı" kimliğinin doğrudan sonucu.

---

## 4. Algılanma (tespit) sistemi

> ⚠️ Bu bölümün sayısal çekirdeği (`DETECT_*`) `gdd-detection-cyclops.md`'de onaylı — burada tekrar edilmiyor, yalnızca geometriyle kesiştiği yerler (§4.6–4.8) yeni.

### 4.1–4.5

Değişmedi — bkz. `gdd-detection-cyclops.md` (2×2 matris, evre saati, `DETECT_MAX`, formüller, sınır durumları). **Tek düzeltme:** o dokümanın §3.4 madde 3 ve §6'sındaki `CAUGHT_MEM_SPIKE`/unutuş bağlantısı ~~geçerli~~ **artık geçersiz (24 Ağu 2026, D3)** — bkz. §0.4 ve aşağıdaki §4.4'ün yeni hâli. Bu, `gdd-detection-cyclops.md`'nin kendisinin güncellenmesini gerektirir — `@helix`'e flag edildi, bu dosya onu değiştirmiyor.

### 4.4 Yakalanma cezası — güncellendi (24 Ağu 2026, sahip D2 + D3)

~~`CAUGHT_ITEM_LOSS`: çantadaki tüm öğeler kaybedilir, havuzdan geri gelmez.~~
~~`CAUGHT_MEM_SPIKE`: tek seferlik +25…+35 puan.~~
**Artık geçersiz (24 Ağu 2026, sahip D2/D3) — yerine:**

1. **Azık düşer, yok olmaz (D2).** Yakalanınca/ezilince çantadaki tüm azık, yakalanma noktasının **~1–2 m** çevresine zemine dökülür — tekrar toplanabilir durumda kalır, havuzdan silinmez. Uygulama: aynı statik `Plant`-benzeri nesne yeni bir konuma taşınır (`visible = true`, konum = yakalanma noktası + rastgele 1–2 m ofset).
2. **`CAUGHT_MEM_SPIKE` tamamen kaldırıldı (D3).** Bu adada unutuş sistemi çalışmadığı için beslenecek bir unutuş kaynağı yok.
3. **`CAUGHT_RESPAWN`** = mağara ağzı, `D≈4` — değişmedi (14 Ağu, `@helix` kararı, hâlâ geçerli).
4. **Ölüm/game-over yok — hiçbir zaman.** Eskiden bu, unutuşa bağlıydı ("eğer darbe `MEM_MAX`'ı aşarsa..."); artık bağlanacak bir unutuş yok, yani bu adada **hiçbir olay** koşuyu bitiremiyor. Tek bedel: kaybedilen zaman (mağara ağzına yürüyüş) + korku FX (§4.4.1, değişmedi) + azığı yeniden toplama zahmeti.

**Kilitlenme (unwinnable) durumu kalıyor mu — hesap, §5.3'e taşındı.**

#### 4.4.1 CAUGHT anının korku/şok efekti

Değişmedi — bkz. orijinal doküman (kamera sarsıntısı, ani ses, kehribar kenar vurgusu, Polyphemos'un kısa belirişi). Bu efekt unutuşa bağlı değildi zaten (P2'nin "algılanma hissedilir, anlatılmaz" tarafı, ayrı kanal) — D3'ten etkilenmiyor.

### 4.6 Kapı durumu — ışık haritası **(YENİ, @cove, 24 Ağu 2026)**

İki katman toplanıyor: **(a)** oda-bazlı yerel ışık (ocak/meşale, mevcut kurgu, değişmedi) ve **(b)** kapı durumuna bağlı **küresel** güneş/ağız katmanı (yeni). İkisi normalize (0–1) ve `clamp01` ile toplanıyor.

**Küresel katman formülü (kapı açıkken):**

```
doorGlobal(D) = clamp01(1 − D / CYCLOPS_DOOR_LIGHT_REACH)
```

`CYCLOPS_DOOR_LIGHT_REACH` (öneri, `[TÜRETİLMİŞ]`) = **45.0 m** — gerekçe: bu değer İç nöy'ün (D=48–65) kapı açıkken bile loş kalması gerekliliğini (sahip'in birebir kararı) doğrudan sağlıyor — `doorGlobal(45) = 0`, yani D≥45'te küresel katkı tam sıfıra iniyor, İç nöy'ün tamamı bu formülden **hiç pay almıyor**, yalnız kendi meşalesinin yerel ışığıyla var oluyor. Ağıllar odasının girişinde (D=26) `doorGlobal ≈ 0.42`, ortasında (D=35) `≈ 0.22` — ocağın kendi katkısıyla toplanınca oda hâlâ "orta-yüksek aydınlık" kimliğini koruyor.

Kapı **kapalıyken** `doorGlobal = 0` her yerde — yalnız yerel kaynaklar kalır, ama onlar da daralıyor (aşağı).

**Yerel kaynaklar — kapı durumuna göre iki hâl:**

| Kaynak | Kapı AÇIK yarıçap/yoğunluk | Kapı KAPALI yarıçap/yoğunluk | Not |
|---|---|---|---|
| Ocak (ağıllar) | `CYCLOPS_LIGHT_RADIUS` = 6.0 m (mevcut, @helix malı, değişmedi) | öneri `[TÜRETİLMİŞ]` **3.0 m** — köz hâline düşer | Devin geldiğinde ateşin küçülmesi/bakımsız kalması olarak sunum kararı, `@iris` onayı gerekir |
| Meşale (iç nöy) | öneri **3.0 m** (sabit) | aynı, **3.0 m** | Zaten dar/sabit — kapıdan etkilenmiyor, "yalnız yerel kısık kaynaklar dar yarıçapla kalır" ifadesinin zaten karşıladığı taraf |

**Bölge-bazlı toplam görünürlük tablosu (0–1 normalize, `art-bible.md` §4'ün "ekranı karartmak yasak" kuralına uyar — hiçbir hücre 0 değil):**

| Bölge | Kapı AÇIK | Kapı KAPALI | Gerekçe |
|---|---|---|---|
| Mağara ağzı (D≈4 temsilci) | **0.95** | **0.35** | En yakın dış dünyaya; kapalıyken bile kaya kenarından/çatlaklardan sızan ışık — en yüksek "kapalı" değeri, kasıtlı (respawn noktası burada, tamamen karanlığa düşmemeli) |
| Depo (D≈15 temsilci) | **0.67** (`doorGlobal(15)=0.67`, yerel kaynak yok) | **0.15** | Yerel ışık kaynağı yok — kapı kapanınca yalnız zemin katkısı |
| Ağıllar/Ocak (oda ortalaması) | **0.55** (ocak + `doorGlobal(35)≈0.22` toplamı, ocak yarıçapı dışındaki alan ortalamasıyla) | **0.30** (köz + `doorGlobal=0`) | Ocak her iki durumda da baskın kaynak |
| İç nöy (oda ortalaması) | **0.20** (yalnız meşale — `doorGlobal(56)=0`) | **0.12** | Sahip'in "kapı açıkken bile loş" kararının doğrudan sayısal karşılığı |

Bu tablo **`[TÜRETİLMİŞ] (@cove, 24 Ağu 2026)`** — sayıların kendisi öneri, ama **formül mantığı ve bölge sıralaması** (İç nöy her zaman en loş, mağara ağzı her zaman en aydınlık) sahip'in kararından doğrudan türüyor. `@iris` (görsel doygunluk) ve `@helix` (DETECT'in "lit" eşiğiyle bu sayıların nasıl kesiştiği) onayı gerekir.

⚠️ **Açık nokta, `@helix`'e:** DETECT'in `lit` bayrağı (§4.1, `gdd-detection-cyclops.md`) bugün ikili (aydınlık/gölge). Bu tablo sürekli bir 0–1 değer üretiyor — ikisinin nasıl eşleneceği (ör. `lit = visibility > 0.4` gibi bir eşik mi) bir `@helix` kararı, bu dosya önermiyor.

### 4.7 Devin'in gezinme rotası — geometrik taraf **(YENİ, @cove, 24 Ağu 2026)**

Olasılık dağılımı (hangi derinliğe ne sıklıkla gittiği) **`@helix`'in işi** — burada yalnızca **hangi noktalar** olduğu ve geometrik gerekçe var.

**Rota hattı: merkez (`x = 0`), D=0'dan başlayarak.** Gerekçe: Boğaz A ve Boğaz B yalnızca 4 m genişliğinde (§1.2) — devasa bir figürün buradan geçebilmesi için rotası pratik olarak merkeze kenetlenmek zorunda. Bu kısıtı odalara da taşımak (rotanın odalarda da `x≈0` civarında kalması) tutarlı ve saklaş noktalarının **hepsinin** yandan (`x`'te merkezden uzak) konumlanmasının gerekçesidir — bkz. §3.

**Olası durma/uyuma noktaları (3 aday derinlik — "hangi odaya kadar gideceği öngörülemez" kararının somutu):**

| Aday | Koordinat | Neden burada |
|---|---|---|
| Depo | `(x=0, D=15)` | Odanın orta derinliği, merkez hat üstünde |
| Ağıllar/Ocak | `(x=-4, D=35)` — **ocağın kendi konumu** | Homeros'ta da onun asıl sağım/oturma yeri [H, IX.219 civarı] — merkez hattan sapması kasıtlı, kendi ateşine gitmesi doğal |
| İç nöy | `(x=0, D=60)` | Odanın arka/derin kısmı, kişisel köşesi — merkez hat üstünde, girişten (D=48) uzak |

Her saklaş noktasının bu adaylara mesafesi §3'te tek tek verildi (özet: depo 6.4 m, ağıllar 9.5 m, iç nöy 9.8 m) — hepsi **≥6 m**, yani saklaş noktaları hiçbir adayın hemen yanında değil. Mağara ağzı için bir "durma noktası" tanımlanmadı (dev buraya girip hemen içeri ilerliyor, burada durmuyor varsayıldı) — bu bir `[TÜRETİLMİŞ]` varsayım, `@helix` isterse mağara ağzını da dördüncü bir aday yapabilir.

### 4.8 Erişim süreleri tablosu **(YENİ, girdi → `@helix`)**

`PLAYER_SPEED` = 4.5 m/s, düz çizgi mesafesi (koridor doğrusal olduğu için gerçek yürüyüş mesafesine çok yakın bir yaklaşıklık).

| Bölge | Mağara ağzından (D=0,x=0) saklaş noktasına | En uzak azıktan saklaş noktasına |
|---|---|---|
| Mağara ağzı | 7.2 m → **1.6 s** | öğe yok, N/A |
| Depo | 19.6 m → **4.4 s** | D-01 (-4,12): 11.4 m → **2.5 s** |
| Ağıllar/Ocak | 35.4 m → **7.9 s** | A-01 (-3,29): 10.4 m → **2.3 s** |
| İç nöy | 51.2 m → **11.4 s** | I-02 (2,63): 12.2 m → **2.7 s** |

**Okuma notu `@helix`'e:** sağdaki sütun (oda-içi en uzak azıktan saklaş noktasına, 2.3–2.7 s) — RETURN telegrafının süresini (`CYCLOPS_PHASE_RETURN`, öneri 6–8 s) kalibre ederken kullanılacak asıl sayı: bir oyuncu bir odanın en uzak köşesindeyken telegraf başlarsa, saklaş noktasına ulaşması **~2.5–3 s** sürüyor — telegraf süresi bunun altına düşmemeli. Soldaki sütun (mağara ağzından itibaren) daha çok döngü/tempo kalibrasyonu için (`docs/production/cyclops-cave-production-plan.md` §1.4'ün "her üç odanın tek bir DIŞARIDA penceresine sığması" hesabına referans veri).

---

## 5. Toplanabilir öğe — azık (peynir tekeri / şarap tulumu)

**Kilitlendi (24 Ağu 2026, sahip, D1/F3).** Tip: peynir tekeri (öncelikli) / şarap tulumu (çeşni, mekanik olarak aynı) — statik prop, `lotus.ts`'in `Plant` API'si. Escort/tayfa-kurtarma AI'sı yok. Hub kart metni aynen kalır (§0.2).

### 5.1 Yerleşim — 7 azığın koordinatları

`LOTUS_MIN_SPACING` (3.0 m) **uygulanıyor — karar verildi.** Her odadaki en yakın çift bile bu eşiğin çok üstünde (en düşük ölçülen ~7.3 m, ağıllar A-02/A-03 arası), yani kısıtlayıcı değil ama sözleşme tutarlılığı için tutuluyor.

| ID | Konum (x, D) | Tip | Oda | Neden orada |
|---|---|---|---|---|
| D-01 | (−4, 12) | Peynir tekeri | Depo | Girişe yakın, ilk göze çarpan, öğretici — düşük risk |
| D-02 | (4, 20) | Şarap tulumu | Depo | Boğaz A'ya yakın, odanın arka köşesi, hafif artan risk |
| A-01 | (−3, 29) | Peynir tekeri | Ağıllar | Kuzu ağılı köşesi, Boğaz A çıkışına yakın |
| A-02 | (3, 35) | Şarap tulumu | Ağıllar | Ocağın karşı (doğu) tarafında, ocağın ışık sınırına yakın — kısa bir "aydınlıkta dal" riski |
| A-03 | (−2, 41) | Peynir tekeri | Ağıllar | Boğaz B girişine yakın, sağım kovaları arasında |
| I-01 | (−3, 53) | Peynir tekeri (eski) | İç nöy | Boğaz B'den hemen sonra, odanın ilk göze çarpan azığı |
| I-02 | (2, 63) | Şarap tulumu (en eski/değerli) | İç nöy | En derin köşe — Devin'in olası uyuma noktasına (`0,60`) yalnız ~3.6 m — kasıtlı risk primi, §6 madde "derin risk" |

### 5.2 Düşme konumu — kural

Yakalanınca azık, yakalanma noktasının ~1–2 m çevresine **zemine snap edilerek** düşer (§4.4 madde 1). **Kural (bağlayıcı):** düşme konumu, o odanın/geçişin X sınırları içinde ve geçerli zemin üstünde olacak şekilde clamp edilir — duvar içine ya da D=0 sınırının dışına (mağaraya dışarı) asla düşmez. Boğaz A/B'de (X=4, dar) düşerse konum otomatik olarak boğazın merkez hattına (`x≈0 ± 1`) yakın sıkıştırılır — orası zaten oyuncunun geçtiği tek hat, erişim sorunu yaratmaz.

### 5.3 Kilitlenme (unwinnable) kontrolü — D2 sonrası

**Eski durum (14 Ağu tasarımı, `CAUGHT_ITEM_LOSS` = kalıcı kayıp):** 4 azık toplanıp gemiye dönerken boğazda yakalanma → çanta 0'a döner, 4 öğe **kalıcı** kaybolur → sahnede kalan 3 < hedef 4 → **matematiksel olarak bitirilemez.**

**Yeni durum (D2, azık düşer/yok olmaz):** aynı senaryoda, 4 öğe yakalanma noktasının 1–2 m çevresine düşer ve **toplanabilir kalır**. Oyuncu geri dönüp onları tekrar toplayabilir. Toplam havuz (7) hiç azalmıyor, yalnızca oyuncunun çantası boşalıyor ve zaman kaybediyor. **Sonuç: yapısal olarak bitirilemez bir durum artık yok** — kaç kez yakalanırsa yakalansın, 7 azığın tamamı sahnede erişilebilir kalmaya devam ediyor, hedef (4) her zaman ulaşılabilir. D3 (unutuş yok) bunu daha da güçlendiriyor: eskiden yüksek unutuşla girip art arda yakalanmak unutuşu `MEM_MAX`'a taşıyıp koşuyu bitirebilirdi (§0.4) — o risk de artık yok.

**Kalan tek gerçek maliyet: zaman.** Art arda yakalanma, oturumu uzatır (mağara ağzına yürüyüş + azığı yeniden toplama), ama **hiçbir zaman** durağı bitirilemez hale getirmez. Bu, §4.4'ün "ölüm/game-over yok" ifadesiyle tutarlı bir güvence — `@helix`'in playtest'te doğrulaması gereken, ama tasarım düzeyinde kapanmış bir soru.

---

## 6. Yerleşim mantığı

1. **Minimum aralık** — `LOTUS_MIN_SPACING` (3.0 m) uygulanıyor, §5.1.
2. **Kümeler değil, oda-başı sabit sayı** (2/3/2) — değişmedi.
3. **Mesafe–risk aynı yönde artıyor** — değişmedi.
4. **Güvenli minimal rota var:** depo (2) + ağıllar (3) = 5 ≥ hedef (4) — iç nöye hiç girmeden bitirilebilir. §5.3'ün kilitlenme-yok garantisiyle birlikte bu artık *çift* güvence: hem doğru rota seçilirse hiç yakalanmadan biter, hem de yakalanılsa bile hiçbir zaman kilitlenmez.
5. **Tek kapı kuralı (güncellendi):** tüm odalar tek bir D=0 kapısından geçer (§9) — ama artık bu yalnız bir "yerleşim" kuralı değil, **gerçek bir kapanan kapı**. Boğaz A/B (§3.6) ayrı, kapı olmayan dar geçitler.

---

## 7. Oyuncu rotası

### Yapısal fark (önemli, değişmedi): hedef = kapasite

`CYCLOPS_ITEM_TARGET` (4) = `CARRY_CAPACITY` (4) — kusursuz bir tek tur teorik olarak yeterli.

### Beklenen ilk oyun (öğrenme) — güncellendi (D2/D3, memory referansları kaldırıldı)

Gemi → mağara ağzı (ders: aydınlık+hareket riskli) → depo, 2 öğe → ağıllar, tereddütlü ilerleme, 1 yakalanma (**azık zemine döküldü, kaybolmadı** + korku efekti — ~~unutuş sıçraması~~ **yok**, D3) → gölge cebinde bekle, DETECT düşsün → dökülen azığı + eksik olanları topla → gemi → teslim. **~6–7 dk**, en az bir yakalanma normal kabul edilmeli, **hiçbir yakalanma turu bitiremez.**

### Beklenen ustalık oyunu

Değişmedi: Gemi → depo 2 (kapı açıkken, risk yok) → ağıllar, PRESENT telegrafını duyunca gölge cebinde donar, evre geçince 2 öğe alır → gemi, tek turda 4/4 teslim. **~3–4 dk.**

### Alternatif: derin risk

Değişmedi — İç nöy'e giren oyuncu fazladan tampon kazanır ama Devin'in uyuma noktasına (`0,60`) en yakın azığı (I-02, ~3.6 m) alma riskini göze alır.

---

## 8. Giriş / çıkış — hub'lı akış (eski §8'in yerini alıyor)

~~0–5 s: Kamera Lotus'un gemisinden ayrılışın devamında, kayalık bir burna yaklaşan tek gemiye geçer (kesintisiz — yükleme ekranı yok).~~ **Artık geçersiz (24 Ağu 2026, sahip'in yapısal kararı).** M7'nin "3 duraklı tek koşu"su kapandı — her durak hub'dan bağımsız seçilen, kendi başına biten bir oturum, duraklar arası hiçbir durum taşınmıyor. Giriş **hub kartından.** Somut akış `docs/production/cyclops-cave-production-plan.md` §1.5'in tarif ettiği gibi (bu dosya onu devralıyor, tekrar üretmiyor):

```
Hub → [Kiklop kartı, "Kilidi açıldı"] → Açılış overlay → play → ...
   ├─ 4 teslim + gemide E  → Ayrılış → Hub, Sirenler kilidi açılır
   └─ turu bitirmeden Hub'a dönüş → durum taşınmaz (§0.4, unutuş da dahil hiçbir şey)
```

| Süre | Ne olur | Ne öğretir |
|---|---|---|
| — | Açılış overlay: 1–2 satır + challenge beyanı | Neden buradasın, ne başaracaksın |
| 0–6 s | Kontrol koyda, gemi arkanda, mağara ağzı (kapı) önünde | Yer, yön |
| 6–14 s | Kapıdan içeri; ışık düşer (§4.6), ses değişir | Eşik geçildi |
| 14–22 s | Depoda ilk azık göz hizasında; `E — al` | Fiil değişmedi |
| 22–30 s | Uzaktan ilk kez gürleme/ayak sesi | Burada birisi var |

---

## 9. Giriş / çıkış noktaları — kapı, gerçek mekanik (24 Ağu 2026, sahip, D9)

~~Homeros'taki koca kaya kapı burada oynanışsal bir engel değil, dekordur — kapanıp oyuncuyu hapsetmiyor.~~ **Yeniden açıldı ve farklı kapandı (24 Ağu 2026, sahip, D9).** Homeros'ta Polyphemos mağarayı gerçekten devasa bir kayayla kapatıyor **[H, IX.240 civarı]** — eski karar ("dekor") bunu **[O]**'ya kaydırıyordu, yani kanona sadakatsizdi. Yeni karar bunu düzeltiyor:

- **Kapı gerçekten kapanıyor.** PRESENT evresinin başlangıcı = kapının kapanma anı (§0.4 madde 2). Kapalıyken oyuncu mağarada mahsur — toplama devre dışı (§0.4 madde 3), tek yapılabilecek saklanmak (§3).
- **Ama terminal bir kilit değil.** Kapalı durum **süreli**: PRESENT evresi bitip OUT'a dönünce (§4.3'ün evre saati, `CYCLOPS_PHASE_PRESENT` ≈ 30 s) kapı **tekrar açılıyor**, oyuncu serbest kalıyor. `level-lotus-island.md`'nin "kilitli kapı yoktur" ilkesiyle çelişmiyor — bu bir *anahtarsız* kilit, süresi kendiliğinden doluyor, oyuncunun bir bulmaca çözmesi gerekmiyor.
- **Eski "kaçış ipucu" (gölge/gıcırtı, boğaz geçişlerinde) artık gereksiz olarak süperseded.** Eski tasarımda bu, "kapı bir gün gerçekten kapanacak" hissi veren saf sunum katmanıydı (kapı hâlâ dekor olduğu için). Artık kapı gerçekten kapandığı için bu ipucu, RETURN telegrafının (§4.3, ses/ışık titremesi) kendisiyle çakışıyor — **ayrı bir sistem olarak korunmasına gerek yok**, aynı işlevi zaten telegraf görüyor. Kapının kendi açılma/kapanma animasyonu + sesi (taş sürtünmesi, gürleme) `@iris`/`@echo`'nun asset listesine yeni bir kalem olarak giriyor (§11).

---

## 10. Kod yeniden-kullanım notları

Değişmedi, tek ek: **kapı durumu** (`§0.4`, `§4.6`) yeni bir davranış, `src/world/lotus.ts`'in evre mantığından (`advance`, `STAGE_ORDER`) esinlenebilir ama kendi başına yeni bir state (`doorOpen: boolean`, evre saatine bağlı) — `detect.ts`'in (üretim planı §5.4) parçası olarak düşünülebilir, ayrı bir dosya gerekmez.

---

## 11. Asset ihtiyaç listesi (düz dil)

Değişmedi + iki ek kalem:

- **Kapının açılma/kapanma animasyonu + sesi** — koca kaya artık statik dekor değil, PRESENT'e girişte/çıkışta bir hareket (kayma/dönme) ve eşlik eden taş sürtünmesi sesi gerekiyor. Önceki "dekor" varsayımıyla üretilecek statik prop artık yetmez — en azından basit bir açı/pozisyon animasyonu (`@byte` kapsamı, asset tarafında `@iris` yalnızca modeli/dokuları sağlar).
- **Kapı kapalıyken mağara-genel ışık düşüşü** (§4.6) — `hazePass.ts`'e ikinci bir küresel karartma/loşluk kanalı ya da sahne ambient'inin evre-bağlı dallanması; algılanma göstergesinin kehribar kanalından **ayrı** tutulmalı (biri sürekli sahne durumu, diğeri oyuncuya özel risk göstergesi).

---

## 12. Açık sorular — güncellendi (24 Ağu 2026)

1. ~~**§0.2'deki anlatı çerçevesi onaylanıyor mu?**~~ **Kapandı (24 Ağu 2026, sahip).** Karar: F3 — azık toplanabilir, tayfa gerekçesiyle, hub kart metni aynen kalıyor. Bkz. §0.2.
2. ~~**Yakalanma sonrası ışınlanma noktası**~~ **Kapandı (14 Ağu 2026, `@helix`).** Mağara ağzı, D≈4. Bkz. §4.4.
3. ~~**`CYCLOPS_ITEM_TOTAL` 6/7/8 mi?**~~ **Kısmen kapandı.** D2 sonrası (§5.3) kilitlenme riski ortadan kalktığı için 7 sayısının "dar tampon" gerekçesi hâlâ geçerli — playtest'e 🔬 bırakılıyor ama artık *güvenlik* değil yalnızca *tempo* sorusu.
4. ~~**Polyphemos "çoğunlukla duyulan, kısaca görülen" mü?**~~ **🔴 YENİDEN KAPANDI, TERSİNE (D10, 25 Ağu 2026, sahip).** 14 Ağu'nun kararı (*"PRESENT boyunca hiç render edilmez, yalnız CAUGHT anında ~0,4–0,8 s belirir"*) **tamamen geçersizdir.** Yeni kural: **Polyphemos PRESENT boyunca sürekli sahnededir ve ışığın izin verdiği ölçüde doğrudan/net görülür** — silüet/gizem dili değil, somut bir tehdit. Ayrı bir gizleme shader'ı yok; ne kadar gördüğün bulunduğu yerin aydınlığına bağlı. `CYCLOPS_JUMPSCARE_DURATION` ("kısa beliriş") **düştü**; CAUGHT'ın diğer üç şok bileşeni (kamera sarsıntısı, kükreme, kenar vurgusu) korunuyor. Gerekçe: körleşme mekaniği devi mağarada fiilen yürütüp ona **fiziksel çarpılmayı** (`CYCLOPS_CRUSH_RADIUS`) yakalanma tetikleyicisi yaptığı için, "çarpabildiğin ama göremediğin" bir dev adaletsizdi. **Bu, §4.3 ve §4.4.1'in "kısa beliriş" kısımlarını geçersiz kılar.** Otorite: `gdd-cyclops-blinding.md` §7.1.
5. **İç nöye hiç girmeyen "güvenli minimal rota" playtest'te gerçekten keşfediliyor mu?** **Hâlâ açık — playtest'e bağlı**, kapatılamaz.
6. ~~**Koca kayanın dekor kalması yeterli mi?**~~ **Yeniden açıldı ve farklı kapandı (24 Ağu 2026, sahip, D9).** Kapı artık gerçek bir mekanik — kapanıyor, süreli, terminal değil. Bkz. §9.
7. ~~**Yakalanma envanteri yok mu ediyor, düşürüyor mu?**~~ **Kapandı (24 Ağu 2026, sahip, D2).** Düşürüyor, yok etmiyor. Bkz. §4.4, §5.2, §5.3.
8. ~~**Hub'dan girişte açılış beat'i ne?**~~ **Kapandı (24 Ağu 2026, üretim planı §1.5 + bu dosya §8).** M7'nin tek-koşu varsayımı geçersiz; giriş hub kartından.
9. ~~**[24 Ağu 2026] `gdd-detection-cyclops.md`'nin unutuş-bağlantılı bölümleri D3 yüzünden güncellenmeli mi?**~~ **Kapandı (24 Ağu 2026, `@helix`).** Evet, güncellendi: o dokümanın §1/§2/§3.4/§3.5/§6/§7/§8'indeki unutuş bağları koptu, `CAUGHT_MEM_SPIKE` kaldırıldı, yerine D2/C2'nin "yere dökülür, yok olmaz" kuralı geçti (`tuning.md` §12 `CAUGHT_ITEM_DROP` + `CAUGHT_DROP_RADIUS`).
10. ~~**[24 Ağu 2026] DETECT'in ikili `lit` bayrağı, §4.6'nın sürekli (0–1) görünürlük değeriyle nasıl eşleşecek?**~~ **Kapandı (24 Ağu 2026, `@helix`).** **Eşik yaklaşımı seçildi:** `lit = inLocalSource || doorGlobal(D) >= CYCLOPS_DOOR_LIT_THRESHOLD`, eşik **0.5** (`tuning.md` §12.1). §4.6'nın bölge sınırlarıyla temiz örtüşüyor: ağız/depo kapı açıkken günışığıyla `lit`; ağıllardan (D=26, `doorGlobal≈0.42`) sonra `lit` tamamen yerel kaynaklara devrediyor. **Not:** §4.6'nın tonal/görsel taban değerleri (art-bible'ın "hiç karartma" tabanı) bu `lit` bayrağından **ayrı** bir kavram — biri oyun mantığı, biri saf görsel. Ayrıntı: `gdd-detection-cyclops.md` §4.3.
11. ~~**[24 Ağu 2026] `CYCLOPS_LIGHT_RADIUS_PRESENT` × `CYCLOPS_PRESENT_MULTIPLIER` çift-ceza riski var mı?**~~ **Kapandı (24 Ağu 2026, `@helix`).** **Çift ceza yok — tam tersi.** Ocak kapalıyken 6.0 → **3.0 m**'ye küçülünce daha çok alan matrisin **gölge** satırına düşüyor, yani ×3.0 çarpanı **daha az hücrede** ısırıyor; küçülme net olarak oyuncunun **lehine** çalışıyor. Değer `tuning.md` §12'de kilitli. Ayrıntı: `gdd-detection-cyclops.md` §4.4.
12. ~~**[24 Ağu 2026 — `@nile` doğrulama turunda yakalandı] §4.3'ün "Polyphemos PRESENT boyunca hiçbir zaman görünür durmuyor" kararı yeni mekanikle ÇELİŞİYOR.**~~ **✅ KAPANDI (D10, 25 Ağu 2026, sahip)** — çelişki, eski kararın kaldırılmasıyla çözüldü: dev artık PRESENT boyunca **sürekli görünür**. Bkz. madde 4 ve `gdd-cyclops-blinding.md` §7.1. *(Aşağısı tespitin orijinal metni — arşiv.)* 14 Ağu'da sahip onayıyla kapanan karar şuydu: dev yalnızca CAUGHT anında ~0,6 s beliriyor, PRESENT boyunca **hiç render edilmiyor** — gerekçesi "tam bir devriye/görünürlük durum makinesi yerine tek bir olay-tetikli reveal state yeterli" (düşük mühendislik). **Ama §0.4/§4.7'nin yeni mekaniği devi PRESENT boyunca mağarada fiilen yürütüyor, bir noktaya kadar gidip orada uyutuyor, ve §0.4 madde 6 ona *fiziksel olarak çarpılmayı* (ezilme) bir yakalanma tetikleyicisi yapıyor.** Fiziksel çarpma, devin en azından **konum + çarpışma hacmi** olarak PRESENT boyunca var olmasını zorunlu kılıyor; *render edilip edilmemesi* ayrı bir sorudur ama "hiç yok" artık mümkün değil. Bu, `art-director`'ın asset kapsamını (D4/P-C: tam mesh + rig + `idle/walk/sleep/settle`) ve korku temasının sunumunu doğrudan belirliyor. **Sahibe açık soru olarak `docs/production/cyclops-cave-production-plan.md` §7.2'ye D10 olarak taşındı** — `@iris` seçenekleri (hiç net gösterme / doğrudan görünür tehdit / ara yol) asset ve kredi sonuçlarıyla sunacak. Bu dosyanın §4.3'ü, sahip D10'a cevap verene kadar **askıda** sayılmalı.
