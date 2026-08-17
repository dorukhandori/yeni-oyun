# Seviye — Lotus Adası

> **Durum:** taslak — sahip onayı bekliyor
> **Tarih:** 2026-08-14
> **Sayılar:** `docs/design/tuning.md` §2, §3.0, §7
> **Bağlı doküman:** `gdd-lotus-collection.md` · `gdd-memory-system.md` · `scenario.md` · `multi-island-concept.md`
> **⚠️ K35 (15 Ağu 2026):** 28’li cep, faz eşleşmesi, “çekirdek küme” **düştü.** 5 rastgele lotus + kahraman gemi kayması: `gdd-lotus-island-run.md`. Bu dosya **peyzajı** tutar (160 m, tepe, koy, kuzey kaya, güney filo). Kroki çiçek sayıları arşiv.
> **Ölçek büyütme önerisi (15 Ağu 2026, playtest geri bildirimi — sahip onayı bekliyor 🔬):** sahip playtest sonrası "ada küçük, profesyonel tasarlanmış bir peyzaj gibi durmuyor — Diablo zindanları gibi" geri bildirimi verdi. **Ton değişmiyor** (`art-bible.md`'ye dokunulmadı), **sadece ölçek/üretim değeri.** Aşağıdaki §1/§2/§3.4/§3.5/§7 bu öneriye göre güncellendi: `ISLAND_RADIUS` 70→**160 m** (öneri), gemi+sazlık+göl kümesi bir blok olarak yeni güney kıyısına kaydı (aralarındaki mesafeler **değişmedi**), tepe çok daha uzağa/yükseğe taşındı, kuzey kayalığı genişleyip bir sivri-kaya landmark'ı kazandı, gemi kıyısına küçük bir koy burnu eklendi. Gerekçe ve denge etkisi: `tuning.md` §2.1. Kesin koordinatlar hâlâ Faz 2.6'nın (`islandLayout.ts`) işi — burada verilenler yön/mesafe/boyut hedefidir.

Tek harita değil — 3 duraklı bir koşunun ilk durağı. Yükleme ekranı, geçit, kilitli kapı yoktur; bir sonraki durağa (Kiklop Mağarası) geçiş kesintisizdir.

---

## 1. Ölçüler

**🔬 Bu tablo 15 Ağu 2026 ölçek büyütme önerisiyle güncellendi — sahip onayı bekliyor. Gerekçe: `tuning.md` §2.1.**

| Değer | Sabit | Ne demek |
|---|---|---|
| Ada yarıçapı | `ISLAND_RADIUS` = **160 m** (öneri, eski `70 m`) | Çap 320 m. Uniform daire — ama gemi+sazlık+göl kümesi yeni güney kıyısına yakın bir blokta kalıyor (aşağıya bkz.), sadece kuzey yarısı büyüyor. |
| Boydan boya geçiş (ada dış hattı) | ~71 s | `PLAYER_SPEED` 4,5 m/s ile, güney kıyıdan kuzey kıyıya. **`STAGE_RIPE`'i (30 s) artık kasıtlı olarak aşıyor** — bu pillar hiç "adanın tamamını uçtan uca koş" değildi, bkz. aşağıdaki not. |
| Çekirdek/yerleşik alan geçişi | ~19 s (gemi↔göl, tek yön) | Gemi + sazlık + göl üçgeni içindeki gerçek oynanış mesafeleri — **değişmedi.** `STAGE_RIPE`'in gerçek karşılığı budur: bir kümenin içindeki çiçekten çiçeğe yetişme süresi, adanın tüm dış hattı değil. |
| Gemi konumu | `SHIP_POSITION_X` = 0.0, `SHIP_POSITION_Z` = **-140.0** (öneri, eski `-60.0`) | Güney kıyı, yeni kıyı çizgisine ~20 m kala (eski oranla aynı). |
| En yüksek nokta (tepe zirvesi) | **48 m** (öneri, eski `18 m`) | Kuzey landmark'ı — adanın her yerinden görünen ana silüet ("weenie"). Manzara noktası `HILL_VIEW_HEIGHT` = **22 m** (öneri, eski `14 m`). |
| Sınır | Derin su | Duvar yok — derin lacivert su oyuncuyu yavaşça geri iter |

**Neden "boydan boya 31 s = STAGE_RIPE" pillar'ı bozulmuyor:** o denklik hiçbir zaman "adanın tamamını uçtan uca koşarak bir çiçeğe yetişirsin" anlamına gelmedi — pratikte hiç kimse tek bir çiçek için ada çapını aşan bir mesafe koşmaz. Gerçek anlamı, bir **kümenin içinde** gördüğün bir çiçeğe her yerden (o küme sınırları içinde) yetişebilmendi. Ada büyürken bu kümeler (sazlık, göl) yerlerinde ve mesafelerinde sabit kaldığı için pillar'ın **gerçek mekanik karşılığı hiç değişmedi** — sadece adanın dış hattının artık bu denklikle bire bir örtüşmediği açıkça not edildi. Tepe kümesi zaten "verimlilik değil manzara" olarak tasarlanmıştı (§3.4); artık bu daha da belirgin.

Koordinat sistemi: **+X doğu, +Z kuzey**, orijin adanın merkezi. Deniz seviyesi y = 0.

---

## 2. Kroki

**🔬 15 Ağu 2026 ölçek önerisiyle güncellendi — sahip onayı bekliyor.** Değişen: `ISLAND_RADIUS` 70→160 m, gemi/sazlık/göl kümesi yeni güney kıyısına kaydı (mesafeler birbirine göre **değişmedi**), tepe çok uzağa/yükseğe taşındı, kuzey kayalığı genişleyip sivri-kaya landmark'ı kazandı, gemi kıyısına küçük bir koy burnu eklendi. Eski kroki (70 m, gemi (0,−60)) kayıt için altta korunuyor.

```
                                    K U Z E Y
   ═════════════════════════════════════════════════════════════════════
                              derin lacivert su
   ─────────────────────────────────────────────────────────────────────
                    ▲▲▲  sivri kayalıklar (55–75 m) ▲▲▲
              ░░░░░░░░░░░ genişleyen kuzey kayalığı ░░░░░░░░░░░
                       (görkemli arka plan silüeti — hiç yürünmez)
                                                          ╱▲╲
                                                        ╱  █  ╲    ← TEPE (landmark)
                                                      ╱ (~70,60) ╲    "weenie" — adanın
                                                    ╱   zirve 48 m ╲   her yerinden görünür
                                                   │   ◆ Λ3          │   6 çiçek, manzara: 22 m
   B                                                ╲   patika      ╱   gemiden ~200 m / ~44 s
   A                                                 ╲____________╱    (isteğe bağlı, uzak)
   T
   I                        (5,−55)
                       ╭──────────────╮
                      ╱   İÇ  GÖL      ╲
                     │   ~~~~~~~~~~~    │
                     │  ~~ 10 çiçek ~~  │             D
                     │   ~~ ◆ Λ2 ~~~~   │             O
                      ╲   tatlı su     ╱              Ğ
                       ╰──────┬───────╯               U
                              │ patika
             ╭────────────────┴──────────╮
            ╱     N İ L Ü F E R           ╲
           │        S A Z L I Ğ I          │
           │     (−25,−100) 12 çiçek       │
           │    ▒▒▒ ◆ Λ1 ▒▒▒▒▒▒▒▒▒          │
            ╲     en yoğun koku            ╱
             ╰──────────┬────────────────╯
                        │
     ▲                 │
   koy burnu    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   (~10 m)      ▓  altın kum · ıslak şerit 3 m       ▓
    ▲▲          ▓   ║ ║ ║ ║ ║ ⛵ ║ ║ ║ ║ ║ ║          ▓   ← 12 GEMİ  (0,−140)
                ▓   on iki direk, orta gemi = senin  ▓      teslim + iyileşme
                ═════════════════════════════════════════
                      turkuaz sığ su  (iyileştirir)
                ─────────────────────────────────────────
                          derin lacivert su
                                     G Ü N E Y

   ◆ = Lotophagos (Λ1 sazlık · Λ2 göl kıyısı · Λ3 tepe eteği)
   ▒ = sazlık zemini   ~ = tatlı su   ░ = kaya   ▓ = kum   ▲ = kayalık landmark
```

<details>
<summary>Eski kroki (70 m yarıçap, gemi (0,−60)) — kayıt için</summary>

```
                              K U Z E Y
   ═══════════════════════════════════════════════════════════════
                          derin lacivert su
   ───────────────────────────────────────────────────────────────
            ░░░░░░░░ kayalık kuzey kıyısı (çiçek yok) ░░░░░░░░
                                                    ╱▲╲
                              (5,25)              ╱  ▲  ╲   ← TEPELER
                        ╭──────────────╮        ╱ (35,40) ╲    6 çiçek
                       ╱   İÇ  GÖL      ╲      ╱   18 m     ╲   manzara: 14 m
                      │   ~~~~~~~~~~~    │    │   ◆ Λ3       │
   B                  │  ~~ 10 çiçek ~~  │    ╲   patika    ╱             D
   A                  │   ~~ ◆ Λ2 ~~~~   │     ╲__________╱              O
   T                   ╲   tatlı su     ╱       kavruk ot                Ğ
   I                    ╰──────┬───────╯                                 U
                               │ patika
              ╭────────────────┴──────────╮
             ╱     N İ L Ü F E R           ╲
            │        S A Z L I Ğ I          │
            │      (−25,−20) 12 çiçek       │
            │    ▒▒▒ ◆ Λ1 ▒▒▒▒▒▒▒▒▒         │
             ╲     en yoğun koku           ╱
              ╰──────────┬────────────────╯
                         │
        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
        ▓  altın kum · ıslak şerit 3 m       ▓
        ▓   ║ ║ ║ ║ ║ ⛵ ║ ║ ║ ║ ║ ║          ▓   ← 12 GEMİ  (0,−60)
        ▓   on iki direk, orta gemi = senin  ▓      teslim + iyileşme
        ═════════════════════════════════════════
              turkuaz sığ su  (iyileştirir)
        ─────────────────────────────────────────
                  derin lacivert su
                             G Ü N E Y

   ◆ = Lotophagos (Λ1 sazlık · Λ2 göl kıyısı · Λ3 tepe eteği)
   ▒ = sazlık zemini   ~ = tatlı su   ░ = kaya   ▓ = kum
```

</details>

---

## 3. Bölgeler

### 3.1 Kıyı ve gemiler — **güven**
**Konum:** güney, z = −70 … −50 · **Çiçek: 0**

On iki gemi kumun içine gömülü, yan yana, pruvaları denize dönük. Ortadaki Doryseus'un gemisidir; iskelesi indirilmiş ve teslim noktası orasıdır (`DELIVER_RANGE` 4 m). Her teslimde bir ambar dolar ve o geminin direğine küçük bir bez bağlanır — **oyuncu ilerlemesini HUD'suz, gemilere bakarak sayabilir.** Unutuş eşik 2'de sayaç muğlaklaşınca kalan tek kesin bilgi budur.

`SHORE_WET_BAND` (3 m) ıslak kum şeridi tüm ada çevresini sarar ve `MEM_SEA_RECOVER` burada çalışır. Yani **kıyının her noktası** iyileştirir, sadece gemi değil. Oyuncu bunu adanın batı veya doğu kıyısına düştüğünde keşfeder ve o an sütun P4'ü öğrenir.

**Burada asla:** çiçek, Lotophagos, tehdit, sürpriz. Kıyı kutsaldır.

**Koy burnu (yeni, 15 Ağu 2026 ölçek önerisi — landmark 3/3):** gemi filosunun bir yanına (öneri: batı, ~25–30 m), küçük bir kayalık burun uzanıyor — yükseklik ~10–12 m, `HILL_LANDMARK_HEIGHT` (48 m) veya kuzey kayalığının yanında mütevazı. İşlevi büyüklük değil **çerçeveleme**: bugün düz/açık bir kum şeridine bakan gemi, artık bir yanında somut bir kaya kütlesiyle "bir yere demirlemiş" hissi veriyor — art-bible §11'in "deniz her karede görünür" kuralını bozmamak için burun **gemiyi arkadan kapatmıyor**, yalnızca bir yanını çerçeveliyor. P4 ("kıyı huzurdur") ile çelişmez — tehdit değil, sadece bir yer imi.

### 3.2 Nilüfer sazlığı — **kolay ve pahalı**
**Konum:** güneybatı-merkez, ~(−25, −100) 🔬 *(15 Ağu 2026 ölçek önerisiyle kaydı — gemiye göre konumu/mesafesi değişmedi, bkz. `tuning.md` §2.1)* · **Çiçek: `ZONE_REED_COUNT` = 12** · **Gemiye:** ~35 m (8 s)

En yakın, en yoğun tarla. Sığ bataklık suyu (tatlı — iyileştirmez), boyu diz hizasında sazlar, aralarında yükselen lotuslar. Çiçekler üç kümede: 5 + 4 + 3, kümeler arası 15–20 m.

**Tasarım işlevi:** öğretici tarla. Oyuncu ilk turunu burada yapar ve şunu öğrenir: *12 çiçek yan yana olunca `SCENT_RADIUS`'tan hiç çıkamıyorsun.* Kolaylığın bedeli süreklidir. Sazlıkta beklemek adanın en pahalı beklemesidir (`0,25 + 0,35 + taşıma`).

**Λ1 Lotophagos** kümelerin ortasında durur. Oyuncu buradan geçmeden diğer kümeye ulaşamaz — karşılaşma garanti, kabul zorunlu değil.

### 3.3 İç göl — **zengin, uzak, yalancı**
**Konum:** merkez-kuzey, ~(5, −55) 🔬 *(15 Ağu 2026 ölçek önerisiyle kaydı — gemiye göre konumu/mesafesi değişmedi, bkz. `tuning.md` §2.1)* · **Çiçek: `ZONE_LAKE_COUNT` = 10** · **Gemiye:** ~85 m (19 s)

Adanın ortasındaki tatlı su gölü. Çiçekler kıyı çizgisi boyunca ve sığ suda yüzen yapraklar üzerinde. En zengin bölge ve **en uzak** bölge.

**Tasarım işlevi:** açgözlülük bölgesi. Dolu çantayla buradan dönmek 19 saniye sürer ve o 19 saniye `MEM_PER_CARRIED` × 4 ile geçer. Oyuncu göle üçüncü turda gelir, çünkü ilk iki turda sazlık yeter.

**Yalan:** göl su gibi görünür, turkuazdır, oyuncu içine girer — ve unutuş **azalmaz** (`MEM_LAKE_RECOVER` = 0). Adanın tek tuzağı budur ve bir kez işler. Uyarı verilmez; ders bedavadır çünkü sadece birkaç saniye kaybettirir.

**Λ2 Lotophagos** gölün güney kıyısında, suya bakarak durur.

### 3.4 Tepeler — **bilgi ve büyüklük hissi** (15 Ağu 2026 ölçek önerisiyle güncellendi 🔬 — landmark 1/3, birincil "weenie")
**Konum:** kuzey, ~(70, 60) *(öneri, eski `(35,40)`)* · **Çiçek: `ZONE_HILL_COUNT` = 6** · **Gemiye:** ~200 m (~44 s) *(öneri, eski `~110 m / 24 s`)* · **Zirve yüksekliği:** `HILL_LANDMARK_HEIGHT` = 48 m *(öneri, eski `18 m`)*

Kavruk otlu, taşlık yamaçlar. Çiçek seyrek (aralarında 15–25 m) ve tırmanmak zaman yer. Saf verim hesabıyla **buraya gelmemek doğrudur** — ve mesafe artık eskisinden çok daha keskin biçimde bunu söylüyor: bir teslim turunun (~36 s, `tuning.md` §9) neredeyse iki katı tek yön yürüyüş. Bu bilinçli bir tasarım tercihi: tepe hâlâ isteğe bağlı ve alt-hedefi (5 çiçek, sazlık+göl'den zaten ulaşılabilir) tehdit etmiyor — ama artık gerçek bir "büyük gezi" oluyor, küçük bir sapma değil.

**Ama:** `HILL_VIEW_HEIGHT` (22 m) üstünde tüm ada görünür ve **olgun çiçekler beyaz-pembe olduğu için tepeden ayırt edilir.** Tepenin ödülü çiçek değil, sonraki iki turun rotasıdır. Ayrıca Beat 3 burada tetiklenir.

**Yeni işlev — adanın "weenie"si:** 48 m'lik zirve artık adanın **her yerinden** görünen tek dominant silüet olmalı — sazlıktan da, göl kıyısından da, hatta gemiden bile ufukta görünen bir referans noktası. Bu görsel/oynanış aracı literatürde "weenie" olarak bilinir: oyuncu haritayı okumadan "işte ada burada bitiyor, işte en yüksek nokta" der. Terazi eteğindeki eski mermer sütun kalıntısı (`terrain.ts`'teki "abandoned shrine" — şu an düz zeminde, ~(−13,−15)) zirveye taşınırsa (öneri, `art-director`/`gameplay-programmer` kararı) silüet daha da güçlenir — kırık bir tapınağın gökyüzüne karşı siluet vermesi, "Lotophagoi'nin terk edilmiş tapınağı" temasını da pekiştirir.

Tepede koku baskısı düşüktür (çiçekler seyrek, `SCENT_RADIUS` sık sık boş kalır) — yani tepe **yarı-güvenli** bir düşünme alanıdır. Kıyı kadar değil, sazlık kadar da değil.

**Λ3 Lotophagos** tepeye çıkan patikanın başında durur; tırmanmadan önce son ikram. Konumu tepenin taşınmasıyla birlikte kayar.

### 3.5 Kuzey kayalığı — **boşluk ve ufuk** (15 Ağu 2026 ölçek önerisiyle genişledi 🔬 — landmark 2/3, negatif alan)
**Konum:** kuzey kıyı, tepenin ötesi (~90–155 m bandı) · **Çiçek: 0**

Kayalık, sarp, geçilebilir ama işe yaramaz. Var olma sebebi: adanın her yeri dolu olmamalı. Oyuncu buraya bir kez gider, hiçbir şey bulamaz ve **bir daha gitmez** — bu, haritayı öğrenmenin bir parçasıdır. Ayrıca kıyı olduğu için ıslak şerit burada da iyileştirir; kaybolmuş bir oyuncu için kuzeye koşmak da geçerli bir kurtuluştur.

**Genişleme (ölçek önerisi):** `ISLAND_RADIUS`'un 160 m'ye çıkmasıyla açılan alanın büyük kısmı **bilerek buraya** gidiyor — araştırmanın "negatif alan" ilkesi tam olarak bu: geniş, boş bir vista oyuncuyu küçük/mütevazı hissettirir, her santimetrekarenin dolu olması gerekmez. Bu bandın kuzey ucuna (adanın en uzak noktası, hiç yürünmeyecek biçimde tasarlanmış) **sivri, tebeşir-beyazı kaya kütleleri** ekleniyor — yükseklik ~55–75 m, art-bible'ın zaten onaylı paleti (`#e6e2d4` tebeşir beyazı, `#b9b6ab` kaya gölgesi) kullanılıyor, **yeni bir renk ailesi yok.** Bu, adanın ikinci landmark'ı: tepenin aksine **asla ziyaret edilmiyor**, sadece gemiden/sazlıktan/gölden bakıldığında ufukta görülüyor — mevcut `buildDistantHills`/`buildHillBackdropRing` sisteminin (bkz. `terrain.ts`) daha dramatik, daha yüksek bir versiyonu. Sis (`gdd-memory-system.md` §9) bu silüeti mesafeyle yumuşatır; unutuş arttıkça sis yaklaşırken bu kayalıklar ilk kaybolan şeylerden biri olur — art-bible'ın "gemi son direnen şeydir" kuralıyla aynı aile.

---

## 4. Yerleşim mantığı

> **K35:** bu §4 çiçek yerleşimi **arşiv.** `real` spawn: `gdd-lotus-island-run.md` §3.3 (5 rastgele). Peyzaj kuralları (tepe, kıyı, negatif alan) durur.

~~**El yerleşimi, rastgele değil** (sütun P3). Tüm 28 konum sabittir…~~ **Düştü.** P3 artık peyzaj okunur; çiçek yeri sürpriz.

Yerleşim beş kurala uyar:

1. **Minimum aralık `LOTUS_MIN_SPACING` (3 m).** İki çiçek asla aynı anda hedeflenemez.
2. **Küme büyüklüğü 3–5.** Tek başına duran çiçek yok; her çiçek bir komşusuyla birlikte "tur değer mi" hesabına girer.
3. **Küme içi faz kayması dağıtılmış.** Bir kümedeki 4 çiçek asla aynı anda olgunlaşmaz — aralarında en az 20 s fark var. Böylece küme **bir tur boyunca** verim verir, tek anda değil.
4. **Küme arası faz kayması eşleştirilmiş.** Sazlığın kuzey kümesi ile gölün güney kümesi **birbirine 25 s** kaymalı: sazlıktan çıkıp göle koşan oyuncu tam vaktinde varır. Bu, öğrenilebilecek **en tatlı rota** ve tepeden bakmanın ödülü.
5. **Mesafe–ödül dengesi.** Gemiye uzaklık arttıkça çiçek yoğunluğu artar (sazlık 12/yakın, göl 10/uzak ama sıkışık, tepe 6/çok uzak ve seyrek), ama **koku baskısı ters yönde** azalır. Hiçbir bölge her açıdan en iyi değil.

---

## 5. Oyuncu rotası

### Beklenen ilk oyun (öğrenme)
Gemi → sazlık → 4 çiçek (biri kaçar, biri solmuşa dokunulur) → gemi → sazlık → 4 → gemi → göl → çanta dolmadan panik → kıyıya koş → gemi → sazlık → 4 → **~6–7 dakika**, kıl payı.

### Beklenen üçüncü oyun (ustalık)
Gemi → sazlık kuzey kümesi 4 → gemi (−40) → göl güney kümesi 4, faz eşleşmesi sayesinde beklemeden → gemi (−40) → sazlık 4 → gemi → dümen → **~4,5 dakika**, unutuş hiç 45'i geçmez.

### Alternatif: hız stratejisi (kasıtlı olarak geçerli)
Λ1 kabul (+2, +20) → sazlık 2 → gemi → Λ2 kabul (+2, +20) → göl 2 → gemi → Λ3 kabul (+2, +20) → tepe 2 → gemi. Toplam +60 unutuş ekstra; oyuncu neredeyse tamamen kör oynar. **Bitirilebilir ama zar zor** — tasarım bunu ödüllendirmez, sadece yasaklamaz.

---

## 6. İlk 30 saniye

| Süre | Ne olur | Ne öğretir |
|---|---|---|
| 0–9 s | Kamera pruvadan kuma iner. Üç satır açılış metni (bkz. `scenario.md` §3). Oyuncu ayak bileğine kadar suda. | Kim olduğunu, ne yapacağını, ne kadar vakti olduğunu. |
| 9–12 s | Kontrol geçer. Oyuncu ilk WASD'sini suyun içinde atar; su sıçrar, ayak sesi ıslaktır. | Hareket ve kamera. |
| 12–16 s | Kumda yürür. Solunda ve sağında **on iki direk**. Ortadaki geminin iskelesi inik ve üstünde `E — teslim et` yazıyor — ama eli boş, bir şey olmuyor. | Teslim noktası nerede. Hedefi elle tutulur kılar. |
| 16–22 s | Kuzeye döner. 35 m ötede sazlık ve **iki tane parlak beyaz-pembe çiçek** doğrudan görüş hattında. Adanın en doygun rengi onlar. | Nereye gideceğini kimse söylemeden söyler. |
| 22–28 s | Sazlığa yürür. Yolda bir **tomurcuk** ve bir **solmuş** çiçek geçer — ikisinde de `E — topla` ipucu **yok**. | Her çiçek toplanmaz. Fark silüette ve renkte. |
| 28–30 s | İlk olgun çiçeğe varır, `E — topla` görünür. E'yi basılı tutar, halka dolar. | Çekirdek fiil. |

**30. saniyede oyuncu:** hareket etmeyi, kamerayı, teslim yerini, olgunluk farkını ve toplama tuşunu öğrenmiştir. **Hiçbir eğitim metni gösterilmemiştir** (üç satırlık açılış hariç).

**31. saniyede** Beat 1 tetiklenir ve oyun asıl konusunu açar: *ağzıma götürmedim, yine de dilimde bir tat var.*

---

## 7. Teknik notlar

- **Zemin:** tek heightmap; sazlık ve göl kenarları yumuşak, tepe eğimi maks. 25° (tırmanma engeli yok, yavaşlama yok).
- **Görünmez duvar yok.** Sınır, derin suya girildiğinde devreye giren yumuşak bir geri itme kuvvetidir; oyuncu yüzemez, ama takılıp kalmaz da.
- **LOD:** çiçekler 60 m'ye kadar tam silüetle çizilmeli — tepeden rota kurmak buna bağlı. Uzakta detay değil **renk ve siluet** korunmalı.
- **Sis:** atmosferik sis unutuşla oyuncuya yaklaşır (bkz. `gdd-memory-system.md` §9). Temel sis mesafesi 120 m, eşik 3'te 45 m'ye iner — o mesafede gemi 60 m'den görünmez olur.
- **Ses yayılımı:** dalga sesi kıyıdan uzaklaştıkça alçalır (0 m'de tam, 70 m'de %25). Unutuş eşik 3'te tek yön ipucu budur; **alçak geçiren filtreden muaftır.**

### 7.1 Ölçek önerisinin uygulama notları (15 Ağu 2026, `game-designer` bulguları — `gameplay-programmer`'a)

Bu ölçek önerisi kodlanırken (Faz 2.6) `src/world/terrain.ts`'te bugün var olan iki boşluk fark edildi — **radius kararından bağımsız olarak** zaten mevcutlar ve muhtemelen sahip'in "küçük/düz" hissinin bir kısmının kaynağı, sadece `ISLAND_RADIUS`'u büyütmek bunları çözmez:

1. **`ISLAND.planeSize` (şu an sabit `96`) `real` profilin bugünkü `ISLAND.radius` (`70`) değerini bile tam kapsamıyor** — `PlaneGeometry(96,96,...)` merkezden ±48 birim uzanıyor, oysa gemi zaten `z=-60`'ta, zeminin dışında kalıyor olabilir. `ISLAND_RADIUS` 160'a çıkarsa bu daha da belirginleşir — `planeSize` (ve muhtemelen `planeSegments`, çözünürlüğü korumak için) `ISLAND.radius`'a **bağlı türetilmiş bir değer** olmalı (ör. `radius * 2.4` gibi bir pay bırakan çarpan), sabit bir sayı değil.
2. **Tepenin 18 m'lik (şimdi 48 m önerilen) yüksekliği kodda hiç üretilmiyor.** `heightAt()` tüm adaya **tek bir global** sinüs gürültüsü (`hills()`, `ISLAND.hillAmp=1.6` + `domeHeight=2.1`, toplam rölyef ~3.7 m) uyguluyor — yerel bir "tepe kütlesi" yok. `HILL_LANDMARK_HEIGHT` (48 m, öneri) gerçekleşecekse **tepe merkezli, radyal düşüşlü ayrı bir yükselti terimi** gerekiyor (ör. `heightAt()`'e eklenen `hillBump(x,z)` — tepe merkezine `smoothstep` ile yakınlaştıkça yükselen, geri kalan adayı etkilemeyen bir terim), global `hillAmp`'ı büyütmek **tüm adayı** tümsekli yapar, tek bir dominant zirve yaratmaz. Bu muhtemelen sahip'in "düz/küçük" hissinin **radius'tan bile önce gelen** asıl nedeni — 70 m'lik mevcut ada zaten yalnızca ~3.7 m rölyefle neredeyse düz.

### 7.2 Kamera/sunum notu (kapsam dışı — flag)

Daha büyük vistalar ve 48 m'lik bir zirve, mevcut kamera ayarlarının (`CAMERA_DISTANCE` 9 m, `CAMERA_ZOOM_MAX` 13 m, `CAMERA_PITCH` -22°) tepe zirvesindeyken yeterince geniş bir manzara gösterip göstermeyeceğini sorgulatıyor. Bu doküman kamera sabitlerine dokunmuyor (kamera `game-designer`'ın sahiplendiği bir alan değil, çekirdek döngü dışı) — sadece `art-director`/`technical-director`'a bir "tepe zirvesinde özel bir kamera davranışı (geçici geniş açı/pull-back) gerekebilir mi?" sorusu olarak flag'leniyor.

---

## 8. Donatım katmanı — patika, golet, kurbağa (LOT-53, 17 Ağu 2026)

> **Durum:** kodlandı, diskte duruyor, **commit edilmedi** — sahip onayı bekliyor.
> **Tetikleyen:** sahip playtest geri bildirimi, "genel olarak düzenleme ve mapping yap, şu anda gözüme boş geliyor."
> **Kapsam sınırı:** bu bir **yeniden tasarım değil.** Oynanabilir alan (gemi / sazlık / göl / tepe), lotus spawn'ı, K35 "Beş yeter" akışı ve `heightAt()`'in landmark terimleri **değişmedi.** Eklenen her şey peyzaj donatımıdır ve hiçbir tuning sayısını (`gdd-memory-system.md` oranları, `LOTUS` zamanlamaları, `PLAYER` hızları) okumaz ya da değiştirmez.
> **Sayılar:** `src/constants.ts` → `PONDS`, `PATHS`, `FROGS` blokları + `FLORA` yoğunluk geçişi.

### 8.1 Neden — teşhis

160 m yarıçaplı `real` ada, 70 m'lik adanın scatter sayılarını taşıyordu (14 servi kümesi, 11 zeytin kümesi, 40 iç kaya — ~80.000 m²'ye). Sahibin "boş" okuması ölçekten değil **yoğunluktan** geliyordu: ada büyütüldü (K34), donatım büyütülmedi. İkinci eksik, adanın hiçbir yerinde **insan izi** olmamasıydı — 12 gemilik bir mürettebatın yıllardır yaşadığı bir adada tek bir aşınmış yol yoktu.

### 8.2 Patikalar — "belli belirsiz"

Sahibin ifadesi bağlayıcı: **çizilmiş bir yol değil**, yarı fark edilen bir *desire line*. Uygulama üç seçenek arasından seçildi (gerekçe `src/world/paths.ts` başlığında):

- Zemin düzlemine per-vertex ağırlık → `real`'de vertex aralığı ~1,96 m, 2,3 m'lik patika benekli bir leke olurdu. **Elendi.**
- Fragment shader'da segment-mesafe döngüsü → ~40 segment × tam ekran, kare başına yüz milyonlarca işlem. **Elendi.**
- Maskeyi bir kez tek kanallı dokuya **bake** et, shader'da tek `texture2D` ile örnekle. **Seçildi** — ölçülen bake maliyeti `real`'de 22 ms, doku texel'lerinin %3,2'si dolu.

Heightmap'e dokunulmadı: aşınmış ot, kazılmış hendek değil.

**Rotalar** sabit dünya koordinatı değil, **anchor** adlarıdır (`PATHS.routes`); `world/paths.ts` bunları profile göre çözer. Bir anchor o profilde yoksa (tepe `test`'te düz, bir golet düşmüşse) atlanır; ikiden az anchor kalan rota tamamen düşer. Ölçülen sonuç: `real` 7/7 rota, `test` 5/7.

| Rota | Anchor zinciri | İşlevi |
|---|---|---|
| `landing` | gemi → spawn → sazlık | İlk 30 saniyenin (§6) rotasını yere yazar |
| `reed-lagoon` | sazlık → göl güney kıyısı | §2 krokisindeki "patika" |
| `lagoon-shrine` | göl kuzey kıyısı → tapınak/kadın | İç kısmı kıyıya bağlar |
| `shrine-hill` | tapınak → hill-foot goleti → tepe eteği | §3.4'ün "tepeye çıkan patika"sı, goletle mola beat'i kazanır |
| `west-water` | göl batı kıyısı → west-meadow goleti | Batı boşluğuna gitmek için sebep |
| `north-run` | hill-foot → north-hollow goleti | §3.5 negatif alan bandını tamamen boş bırakmadan geçer |
| `east-run` | göl doğu kıyısı → east-shelf goleti | Doğu yarısını okunur kılar |

Patikanın kesintili olması bake sırasında bir gürültü çarpanıyla sağlanır (`PATHS.breakUp`), shader'da bedava. Patika kumda ve göl kenarında **söner** (`1.0 - vWeights.x`) — aşınma otta olur, kumda değil. Ağaç ve kaya scatter'ı `PATHS.clearMask` üstünde reddedilir, çim `grassClearMask` üstünde seyrelir; yoksa patika kendi bitki örtüsünün altında kaybolurdu.

### 8.3 Goletler

Dört aday bölge, **ada-normalize polar uzayda** (`PONDS.sites`, `ar`/`rf` = `ISLAND.radius` kesirleri) — böylece 160 m ada ile 26 m sandbox aynı yerleşimi paylaşır. `resolvePonds()` her adayı kendi açısı boyunca dışa doğru iterek göl, demirleme yeri (42 m gövde — bu clearance **mutlak**, adanın değil geminin ölçüsü), lotus bölgeleri, kıyı ve komşu goletlerden temizleyene kadar dener; sığmazsa **zorlamaz, düşürür.**

| Golet | `real` konum / yarıçap | Gerekçe |
|---|---|---|
| `west-meadow` | (−79, 10) · r 12 m | Gemi ile batı kıyısı arasındaki en uzun boş koşu |
| `north-hollow` | (−30, 83) · r 9,9 m | §3.5 negatif alanını bozmadan kırar — "boş ama görkemli" hâlâ geçerli |
| `hill-foot` | (34, 30) · r 8,8 m | Tepe tırmanışında mola beat'i; weenie kabarcığının (r 44) **dışında**, yamaca oturmuyor |
| `east-shelf` | (91, −40) · r 8,3 m | Doğu yarısına gitmek için bir sebep |

`test`'te (yarıçap 26 m, gölün yarıçapı 12 m — kara alanının yarısını yiyor) **bir golet kalır** (`west-meadow`, (−12,7, −2,7) · r 1,9 m), üçü düşer. Bu kasıtlı ve zorlanmadı.

Yerleşim çözücüsü iki kez düzeltildi, ikisi de `test` sayesinde yakalandı:

1. **Clearance'lar yarıçapa bağlandı.** Mutlak metre değerleri (6 m keepout, 8 m plaj payı) 160 m'de doğru, 26 m'de **hiçbir** yasal konum bırakmıyordu → `keepoutFrac` / `beachMarginFrac`.
2. **Açı taraması eklendi.** Çözücü önce yalnızca kendi açısı boyunca dışa doğru itiyordu. Ama hem kıyı (±%10,5) hem göl kenarı (±%23) salınıyor, yani *yasal bir halka olup olmadığı açıya bağlı.* Sabit açıda `test` sıfır golet veriyordu; ±0,11 rad adımlarla tarayınca gölün içeri çekildiği ve kıyının dışarı taştığı boşluk bulunuyor. `real` sonucu değişmedi (4/4 hâlâ kendi yazılı açılarında).

**Deniz örtüşmesi — asıl kısıt (kritik, tekrar eden bir tuzak):** `sea.ts` okyanus tabakasını kıyıdan **içeri doğru** `SEA_TEX.overlapMeters` (10 m) kadar uzatıyor ve `SEA_TEX.floorY` = **+0,05**'te tutuyor. Golet havzası −0,75'e kazıyor. Yani bu banda giren bir golet, **içine okyanus çizilmiş** olarak görünüyor: havuzun dış yarısı `PALETTE.seaFoam` (0xfbf7ef) krem beyazına dönüyor. Sandbox screenshot'ında "havuzun üstünde duran beyaz levha" olarak yakalandı; su diskini kırmızıya boyayan bir teşhis çekimiyle diskin kendisi olmadığı kesinleştirildi. `siteFits()` artık `r + radius > coast - SEA_TEX.overlapMeters` konumlarını reddediyor. **Adaya su gövdesi ekleyecek herkes bunu bilmeli** — `sea.ts`'e dokunmadan çözülür, ama görmezden gelinirse sessizce çirkin bir hata verir.

**Mekanik olarak nötr:** `inLagoon()` yalnızca iç göl için `true` döner. Golet ne yürüme hızını, ne `MEM_LAKE_RECOVER`'ı, ne de başka bir tuned oranı okur. §3.3'ün "göl yalanı" tek kalır ve sulandırılmaz.

Su diski düz bir daire değil: havzanın profili çözülerek **gerçek su hattı** bulunur (`WATERLINE_RATIO` = √((waterY − floor) / (rimRise − floor)) ≈ 0,80). İlk denemede disk çukur yarıçapına göre boyutlandırılmıştı ve kıyıda havada kalıp düz poligon kenarları gösteriyordu (screenshot'ta yakalandı); havza tabanı `LAGOON.floor` ile eşitlenip disk çözülen su hattına oturtularak düzeltildi. Nilüfer yaprağı **boyutu da** golet yarıçapına oranlı (`PONDS.padScale`) — sabit ~1 m'lik yaprak, 1,9 m'lik sandbox havuzunu tamamen örtüyordu.

### 8.4 Kurbağalar

Golet ve göl kenarlarında ambient fauna. **Sanrı figürleriyle (`gdd-lotus-hallucination.md`) hiçbir ilişkisi yok** ve karıştırılmamalı: temas testi yok, hafıza sıçraması yok, yürüme sapması yok, collider yok, etkileşim ipucu yok. Thallope (`asset-registry.md` P3) ile aynı katman: sıfır mekanik etki.

Hareket `t`'nin **saf fonksiyonu** — sıçrama indeksi `floor(t / period)`, hedef o indeksin hash'i. Durum biriktirmediği için frame-rate bağımsız ve sapma yapmaz; kare başına maliyeti kurbağa başına bir matris yazımı (`real` ~37 kurbağa, tek `InstancedMesh`).

**Kurbağa sayısı ve konumu peyzaj kararıdır, çiçek/oynanış kararı değil** — `real` golet başına 7 + göl kenarı 9; `test` 4 + 5.

### 8.5 Yoğunluk geçişi

`FLORA` sayıları `real` için yükseltildi: servi kümesi 14→26, zeytin 11→21, iç kaya 40→88, kıyı kaya 52→76, göl kayası 32→40. Her aile tek bir `InstancedMesh` / kit batch olduğu için bu **draw call değil vertex** maliyeti.

**Çim aralığı bilerek sıkılaştırılmadı** (`grassFieldSpacing` 0,58 m): o alan zaten fill-rate tavanı, sıkıştırmak kareyi tebeşirler (`constants.ts` notu). "Boş" hissinin çaresi daha çok çim değil, daha çok **silüet** (ağaç, kaya, golet, patika).

Goletler ayrıca göl kıyısıyla aynı saz muamelesini görür (`PONDS.reedsPerPond`) — bir goleti "su decal'i" olmaktan çıkarıp yaşayan bir cep yapan şey budur ve bedava gelir: aynı merged geometriye girer, aynı `ISLAND_KIT.reed` batch'ine takas olur.

### 8.6 Açık uçlar

- Golet artık göl kadar derin (`PONDS.floor` = −0,75) ama **yavaşlatmıyor** (göl `PLAYER.waterSpeedMul` uygular, golet uygulamaz). Görsel olarak tutarsız; mekanik tutarlılık istenirse bu `game-designer` kararıdır, donatım katmanı kendi başına tuned bir sayıyı değiştirmedi.
- Patika maskesi `ISLAND.planeSize` karesini kaplar; ada bir gün dikdörtgen olursa bake penceresi de değişmeli.

---

## Açık sorular

1. **Tepe gerçekten değer mi?** 6 çiçek + manzara, artık **~44 saniyelik** (eski 24 s) yürüyüşe karşılık. **15 Ağu 2026 güncellemesi:** ölçek önerisi bu soruyu şiddetlendiriyor değil, netleştiriyor — tepe artık açıkça "verim için değil, manzara için" bir sapma; kimse çıkmasa da alt-hedef (5) tehlikeye girmiyor. Playtest'te hâlâ kimse çıkmıyorsa çözüm artık "çiçek sayısını artır" değil, "manzaranın/silüetin kendisinin çekiciliğini artır" (48 m zirve + tapınak kalıntısı silüeti bunun bir denemesi).
2. **Direğe bez bağlama ilerleme göstergesi yeterince okunur mu?** 12 direk uzaktan ayırt edilebilir mi, yoksa oyuncu hiç fark etmez mi? Fark etmezse unutuş eşik 2'de oyuncu tamamen kör kalır.
3. **Kuzey kayalığı boş kalmalı mı?** "Bir kez git, bir daha gitme" kasıtlı; ama bazı oyuncular bunu eksiklik olarak okur. Oraya tek bir çiçek koymak fikri bozar mı? **15 Ağu 2026 notu:** ölçek önerisiyle bu bölge büyüdü ve artık kendi landmark'ını (sivri kayalıklar) taşıyor — "boş ama görkemli" cevabı daha güçlü bir seçenek olarak öne çıkıyor, "tek çiçek ekle" fikri hâlâ P3/negatif-alan ilkesiyle geriliyor.
4. **Faz eşleştirmesi (kural 4) oyuncunun keşfedebileceği bir şey mi, yoksa fazla ince mi?** Keşfedilmezse tasarımın en güzel katmanı ölü kalır. Tepeden bakınca görünür olması yeterli mi?
5. ~~**Ada 140 m çap doğru mu?**~~ **15 Ağu 2026'da yeniden açıldı, kodlandı, sahip playtest onayı bekliyor 🔬.** Playtest geri bildirimi ("küçük, Diablo zindanı gibi") üzerine `ISLAND_RADIUS` **160 m** (çap 320 m) `real` profile yazıldı; çekirdek turlama mesafeleri (gemi↔sazlık↔göl) `LAYOUT_SHIFT_Z` ile korundu. Tepe 48 m weenie + kuzey kayalığı + koy burnu `heightAt()`'te. Sayı kilitli değil. Ayrıntı: `tuning.md` §2.1, karar kaydı: `docs/production/roadmap.md` K34.
