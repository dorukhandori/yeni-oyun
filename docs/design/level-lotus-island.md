# Seviye — Lotus Adası

> **Durum:** taslak — sahip onayı bekliyor
> **Tarih:** 2026-08-14
> **Sayılar:** `docs/design/tuning.md` §2, §3.0, §7
> **Bağlı doküman:** `gdd-lotus-collection.md` · `gdd-memory-system.md` · `scenario.md` · `multi-island-concept.md`
> **Çoklu-ada notu (14 Ağu 2026, sahip onayı, `multi-island-concept.md` M7 + K27–K29):** bu ada artık tek harita değil, **3 duraklı bir koşunun 1. durağı/çapası** — Kiklop Mağarası (2.) ve Sirenler Geçidi (3.) izliyor, hub yok, tek kesintisiz koşu. Bu adanın kendi hedefi (`LOTUS_TARGET`) 12'den **5**'e indi (kesin sayı henüz netleşmedi — bkz. `tuning.md` §3.0); toplam koşu hedefi (`RUN_TARGET_TOTAL = 12`) diğer iki durakla paylaşılıyor. **Bu doküman aşağıda yeniden tasarlanmadı** — kroki, bölge dağılımı (28 çiçek, 12/10/6), denge hesabı hâlâ eski 12-hedefli tasarımı yansıtıyor. Yeni hedefe göre yeniden dengeleme `island-designer` agent'ının ve Faz 2.6'nın işi.

Tek harita değil — 3 duraklı bir koşunun ilk durağı. Yükleme ekranı, geçit, kilitli kapı yoktur; bir sonraki durağa (Kiklop Mağarası) geçiş kesintisizdir.

---

## 1. Ölçüler

| Değer | Sabit | Ne demek |
|---|---|---|
| Ada yarıçapı | `ISLAND_RADIUS` = 70 m | Çap 140 m, oynanabilir alan ~15.400 m² |
| Boydan boya geçiş | ~31 s | `PLAYER_SPEED` 4,5 m/s ile. **`STAGE_RIPE` (30 s) ile kasten eşit.** |
| Gemi konumu | `SHIP_POSITION_X` = 0.0, `SHIP_POSITION_Z` = -60.0 | Güney kıyı, merkeze 60 m |
| En yüksek nokta | 18 m | Kuzeydoğu tepesi; manzara noktası `HILL_VIEW_HEIGHT` = 14 m |
| Sınır | Derin su | Duvar yok — derin lacivert su oyuncuyu yavaşça geri iter |

Koordinat sistemi: **+X doğu, +Z kuzey**, orijin adanın merkezi. Deniz seviyesi y = 0.

---

## 2. Kroki

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

---

## 3. Bölgeler

### 3.1 Kıyı ve gemiler — **güven**
**Konum:** güney, z = −70 … −50 · **Çiçek: 0**

On iki gemi kumun içine gömülü, yan yana, pruvaları denize dönük. Ortadaki Doryseus'un gemisidir; iskelesi indirilmiş ve teslim noktası orasıdır (`DELIVER_RANGE` 4 m). Her teslimde bir ambar dolar ve o geminin direğine küçük bir bez bağlanır — **oyuncu ilerlemesini HUD'suz, gemilere bakarak sayabilir.** Unutuş eşik 2'de sayaç muğlaklaşınca kalan tek kesin bilgi budur.

`SHORE_WET_BAND` (3 m) ıslak kum şeridi tüm ada çevresini sarar ve `MEM_SEA_RECOVER` burada çalışır. Yani **kıyının her noktası** iyileştirir, sadece gemi değil. Oyuncu bunu adanın batı veya doğu kıyısına düştüğünde keşfeder ve o an sütun P4'ü öğrenir.

**Burada asla:** çiçek, Lotophagos, tehdit, sürpriz. Kıyı kutsaldır.

### 3.2 Nilüfer sazlığı — **kolay ve pahalı**
**Konum:** güneybatı-merkez, ~(−25, −20) · **Çiçek: `ZONE_REED_COUNT` = 12** · **Gemiye:** ~35 m (8 s)

En yakın, en yoğun tarla. Sığ bataklık suyu (tatlı — iyileştirmez), boyu diz hizasında sazlar, aralarında yükselen lotuslar. Çiçekler üç kümede: 5 + 4 + 3, kümeler arası 15–20 m.

**Tasarım işlevi:** öğretici tarla. Oyuncu ilk turunu burada yapar ve şunu öğrenir: *12 çiçek yan yana olunca `SCENT_RADIUS`'tan hiç çıkamıyorsun.* Kolaylığın bedeli süreklidir. Sazlıkta beklemek adanın en pahalı beklemesidir (`0,25 + 0,35 + taşıma`).

**Λ1 Lotophagos** kümelerin ortasında durur. Oyuncu buradan geçmeden diğer kümeye ulaşamaz — karşılaşma garanti, kabul zorunlu değil.

### 3.3 İç göl — **zengin, uzak, yalancı**
**Konum:** merkez-kuzey, ~(5, 25) · **Çiçek: `ZONE_LAKE_COUNT` = 10** · **Gemiye:** ~85 m (19 s)

Adanın ortasındaki tatlı su gölü. Çiçekler kıyı çizgisi boyunca ve sığ suda yüzen yapraklar üzerinde. En zengin bölge ve **en uzak** bölge.

**Tasarım işlevi:** açgözlülük bölgesi. Dolu çantayla buradan dönmek 19 saniye sürer ve o 19 saniye `MEM_PER_CARRIED` × 4 ile geçer. Oyuncu göle üçüncü turda gelir, çünkü ilk iki turda sazlık yeter.

**Yalan:** göl su gibi görünür, turkuazdır, oyuncu içine girer — ve unutuş **azalmaz** (`MEM_LAKE_RECOVER` = 0). Adanın tek tuzağı budur ve bir kez işler. Uyarı verilmez; ders bedavadır çünkü sadece birkaç saniye kaybettirir.

**Λ2 Lotophagos** gölün güney kıyısında, suya bakarak durur.

### 3.4 Tepeler — **bilgi**
**Konum:** kuzeydoğu, ~(35, 40) · **Çiçek: `ZONE_HILL_COUNT` = 6** · **Gemiye:** ~110 m (24 s) · **Yükseklik:** 18 m

Kavruk otlu, taşlık yamaçlar. Çiçek seyrek (aralarında 15–25 m) ve tırmanmak zaman yer. Saf verim hesabıyla **buraya gelmemek doğrudur.**

**Ama:** `HILL_VIEW_HEIGHT` (14 m) üstünde tüm ada görünür ve **olgun çiçekler beyaz-pembe olduğu için tepeden ayırt edilir.** Tepenin ödülü çiçek değil, sonraki iki turun rotasıdır. Ayrıca Beat 3 burada tetiklenir.

Tepede koku baskısı düşüktür (çiçekler seyrek, `SCENT_RADIUS` sık sık boş kalır) — yani tepe **yarı-güvenli** bir düşünme alanıdır. Kıyı kadar değil, sazlık kadar da değil.

**Λ3 Lotophagos** tepeye çıkan patikanın başında durur; tırmanmadan önce son ikram.

### 3.5 Kuzey kayalığı — **boşluk**
**Konum:** kuzey kıyı · **Çiçek: 0**

Kayalık, sarp, geçilebilir ama işe yaramaz. Var olma sebebi: adanın her yeri dolu olmamalı. Oyuncu buraya bir kez gider, hiçbir şey bulamaz ve **bir daha gitmez** — bu, haritayı öğrenmenin bir parçasıdır. Ayrıca kıyı olduğu için ıslak şerit burada da iyileştirir; kaybolmuş bir oyuncu için kuzeye koşmak da geçerli bir kurtuluştur.

---

## 4. Yerleşim mantığı

**El yerleşimi, rastgele değil** (sütun P3). Tüm 28 konum sabittir ve `LOTUS_PHASE_SEED` ile faz kaymaları da sabittir → **her oyun aynı, öğrenilebilir.**

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

---

## Açık sorular

1. **Tepe gerçekten değer mi?** 6 çiçek + manzara, 24 saniyelik yürüyüşe karşılık. Playtest'te kimse tepeye çıkmıyorsa ya çiçek sayısı 8'e çıkmalı ya tepe gemiye yaklaştırılmalı.
2. **Direğe bez bağlama ilerleme göstergesi yeterince okunur mu?** 12 direk uzaktan ayırt edilebilir mi, yoksa oyuncu hiç fark etmez mi? Fark etmezse unutuş eşik 2'de oyuncu tamamen kör kalır.
3. **Kuzey kayalığı boş kalmalı mı?** "Bir kez git, bir daha gitme" kasıtlı; ama bazı oyuncular bunu eksiklik olarak okur. Oraya tek bir çiçek koymak fikri bozar mı?
4. **Faz eşleştirmesi (kural 4) oyuncunun keşfedebileceği bir şey mi, yoksa fazla ince mi?** Keşfedilmezse tasarımın en güzel katmanı ölü kalır. Tepeden bakınca görünür olması yeterli mi?
5. **Ada 140 m çap doğru mu?** Küçültmek turu hızlandırır ve unutuş baskısını düşürür; büyütmek tersini yapar. `DAY_LENGTH` ile birlikte ayarlanmalı — ikisi aynı anda değiştirilmemeli.
