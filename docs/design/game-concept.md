# Oyun Konsepti — Lotus Adası

> **Durum:** taslak — Lotus `real` koşusu K35 ile `gdd-lotus-island-run.md`’ye bağlı
> **Tarih:** 2026-08-15 (K35 damgası) · gövde 2026-08-14
> **Motor:** Vite + TypeScript + Three.js (tarayıcı, 3D)
> **Kardeş dokümanlar:** `gdd-lotus-collection.md` · `gdd-memory-system.md` · `scenario.md` · `level-lotus-island.md` · `tuning.md` · `multi-island-concept.md` (çoklu-ada karar dokümanı — M7 kapandı, 14 Ağu 2026)
> **Çoklu-ada notu (14 Ağu 2026, sahip onayı):** bu doküman hâlâ büyük ölçüde **tek adalık** bir konsept metni. Proje artık 3 duraklı bir koşu (Lotus Adası → Kiklop Mağarası → Sirenler Geçidi, bkz. `multi-island-concept.md` M7). §2 ve §7 aşağıda bu yönde güncellendi; dokümanın geri kalanı (§4–§6, §8–§13) hâlâ yalnızca Lotus Adası'nı (artık 1. durak/çapa) tarif ediyor — Kiklop/Sirenler'in kendi konsept ayrıntıları `island-designer`'ın işi.
> **⚠️ Hub'a dönüş notu (14 Ağu 2026, aynı gün):** sahip "hub yok" kararını tersine çevirdi — **gerçek bir hub var, oyuncu durağı serbest sırayla seçiyor** (bkz. `multi-island-concept.md` §9). §2 aşağıda buna göre güncellendi. Oturum süresi (~20–30 dk) **değişmedi.**
> **Tek sayı kaynağı:** `tuning.md` — **Lotus `real` istisnası:** koşu sayıları `gdd-lotus-island-run.md` §7 kazanır.

**Etiketler:** **[H]** Homeros'ta var (kaynak) · **[O]** oyun için icat · **[?]** sahip kararı bekliyor.

**Yol notu [O]:** CCGS `brainstorm` skill'i bu dosyayı `design/gdd/game-concept.md` yolunda şart koşar. Bu projede tasarım dokümanları `docs/design/` altında toplanıyor (art `docs/art/`, araştırma `docs/research/` ile aynı hizada). O skill çalıştırılırsa bu dosyaya yönlendirilmeli, ikinci kopya açılmamalı.

---

## 1. Tek cümlelik pitch

**Doryseus Lotus Adası'nda beş olgun çiçeği gemisine bırakmadan sonraki denize çıkamaz — ada güzelliğiyle tutar, unutuş evi kaydırır, her çiçek dönüş yolunu inceler.**

> **K35 (15 Ağu 2026):** Lotus koşusunun otoritesi `gdd-lotus-island-run.md`. Eski “güneş batmadan 12” bu adada geçersiz. Koşu toplamı hâlâ 12 (5+4+3).

---

## 2. Çekirdek kimlik

| Alan | Değer |
|---|---|
| Çalışma adı | **Lotophagoi** (sahip kararı, 14 Ağu 2026). Eski taslak adı "Lotus Adası" bu dosyada geçebilir; ürün adı Lotophagoi. |
| Tür | 3D toplama / rota kurma oyunu, **3 duraklı bir koşu, hub'dan serbest sırayla seçilir** (collectathon değil — el yerleşimli duraklar, tek koşu) |
| Bakış | Üçüncü şahıs, omuz üstü serbest yörünge kamera |
| Platform | Tarayıcı (masaüstü, klavye + fare) |
| Hedef oturum | **~20–30 dakika, koşunun tamamı için** (14 Ağu 2026, `multi-island-concept.md` M7 sonucu — eski "5–10 dakika" tek adaydı, artık 3 durağın toplamı). Her durak kabaca eski tek-ada ölçeğinde (~5–10 dk); hub bir seçim ekranıdır, gezinme süresi ihmal edilebilir düzeyde tutulmalı — sayı hub eklenmesinden sonra da değişmedi (bkz. `multi-island-concept.md` §9.4). |
| Tekrar oynanış | Lotus: **keşif** — çiçek yerleri her koşu rastgele (`gdd-lotus-island-run.md`). Peyzaj sabit. Kiklop/Sirenler kendi kuralını tutar. |
| Çekirdek fiil | **Toplamak** (ve toplamamaya karar vermek) |
| Kapsam | **3 duraklı, elle tasarlanmış küçük bir Odysseia antolojisi**, **hub'lı**: Lotus → Kiklop → Sirenler. Sıfır envanter / craft / diyalog ağacı. **Lotus kaybı (K35):** durak bitmez, forget event. Kiklop/Sirenler K27 (durak biter, hub). |

---

## 3. Duygu hedefi

Birincil MDA estetiği: **Submission (akış) + Narrative gerilimi.**

Oyuncunun hissetmesi gereken sıra:

1. **Sakinlik** — sıcak Ege ışığı, dalga sesi, kolayca toplanan ilk çiçek. Ada güzel.
2. **Fark ediş** — HUD titremeye başlar, uzak sesler boğuklaşır. Ada güzel *olduğu için* tehlikeli.
3. **Hesap** — "şu tomurcuk 8 saniyede açar, beklersem 4'ü tamamlarım ama ölçek dolar. Üçle mi döneyim?"
4. **Kalma veya bırakma** — unutuş evi kaydırır, öldürmez. Beşi gemideyse ayrılsın; yoksa ada tutar.

Hedef son duygu **kaçış rahatlaması** değil, **bırakılmış güzellik**: kazanınca bile oyuncu adada bir şey bıraktığını hissetmeli.

---

## 4. Mitolojik temel

### 4.1 Kaynak (Homeros) **[H]**

*Odysseia*, **Kitap IX, 82–104.** Troya dönüşü Odysseus'un filosu Malea burnunu dönerken fırtınaya yakalanır, dokuz gün sürüklenir ve **Lotus Yiyenler'in (Lotophagoi)** ülkesine varır. Odysseus üç adam gönderir; Lotophagoi onlara düşmanlık etmez — tersine, ikram ederler. Bal tatlısı lotus meyvesini tadan adam:

- haber getirmeyi ister **istemez** olur,
- **dönüş arzusunu (nostos) yitirir**,
- orada kalıp lotus yiyerek unutmak ister.

Odysseus onları **ağlarken zorla** gemilere sürükler, kürek sıralarının altına bağlar ve kalan tayfaya derhal denize açılmayı emreder. Bölüm bu kadar kısadır: **savaş yok, canavar yok, tek tehdit hatırlamayı bırakmaktır.** Oyunun kalbi budur.

### 4.2 İlyada notu **[H]**

Lotus Adası *Odysseia*'da geçer, *İlyada*'da değil. Yine de iki destan burada bir yerde kesişiyor: Odysseus'un **on iki gemisi**, *İlyada*'nın Gemiler Kataloğu'nda (II. Kitap) sayılır. Sahip'in ikisini birlikte anması bu oyunda karşılığını buluyor — **hedef sayımız on iki, çünkü gemi sayısı on iki.**

### 4.3 Oyun için icat **[O]**

Homeros'ta bulunmayan, tamamen bizim eklediğimiz üç şey:

| İcat | Ne | Neden gerekli |
|---|---|---|
| **Yenmemiş çiçek hatırlatır** | Koparılmış ama ağza değmemiş **olgun** lotus, gemi ambarındaki tuzlu suya konduğunda o geminin tayfasına yurdunu geri verir. Yenen lotus unutturur; yenmeyen hatırlatır. | Toplamak için Homerik olmayan ama Homeros'la çelişmeyen bir gerekçe yaratır. Doryseus lotus toplar çünkü lotus *ilaçtır*, ödül değil. |
| **Koku baskısı** | Açmış çiçeğin kokusu yemeden de etki eder, sadece daha yavaş. Taşıdığın çiçek seni sürekli kokutur. | "Topla" fiilini doğrudan riske bağlar. Tek mekanikle risk/ödül pompası. |
| **Deniz tuzu hatırlatıcıdır** | Ayak bileğine kadar denize girmek zihni açar. | Oyuncuya kıyıyı, dolayısıyla gemiyi, dolayısıyla *dönüşü* mekanik olarak hatırlatır. Tema ve sistem aynı şey olur. |

Ayrıca **[O]**: oyuncu **Doryseus** — Homeros'un Odysseus'u değil, oyun için orijinal bir karakter (14 Ağu 2026, sahip kararı; eski varsayım "oyuncu Odysseus'tur" yerine geçti — bkz. Kapanan kararlar). Kıyıya çıkan Homeros'ta üç kişidir (ikisi tayfa, biri haberci) — bu, metinle çelişmez; sadece kıyıya çıkanın kimliği ve adı oyunun kendi icadı. Diğer denizciler/NPC'ler kolektif olarak **"unutulmuş tayfa"** (forgotten sailors) olarak anılıyor.

---

## 5. Oynanış döngüsü

### 5.1 30 saniyelik döngü (an be an)

```
        ┌──────────────────────────────────────────────┐
        │                                              │
        ▼                                              │
   [ GÖZLE ]  olgun çiçek beyaz-pembe parlar,          │
      │       solmuş kahverengiye düşer                │
      ▼                                                │
   [ ROTA KUR ] hangi üçü/dördü aynı turda toplanır?   │
      │                                                │
      ▼                                                │
   [ YÜRÜ ]  ── koku bölgesindeyken UNUTUŞ ↑ ──────────┤
      │                                                │
      ▼                                                │
   [ TOPLA ]  E basılı 1,2 s → çanta +1, UNUTUŞ +4     │
      │       (solmuşa dokunursan UNUTUŞ +12)          │
      ▼                                                │
   çanta dolu mu (4/4)?  ── hayır ──────────────────────┘
      │ evet
      ▼
   [ DÖN ]  taşınan her çiçek UNUTUŞ'u ayrıca hızlandırır
      │
      ▼
   [ TESLİM ]  gemide E → her çiçek −10 UNUTUŞ, sayaç +1
      │
      ▼
   5/5 mi?  ── hayır ──> tekrar adaya (unutursan çanta 0, gemi kıyı değiştirir)
      │ evet
      ▼
   [ DÜMENDE E ]  →  AYRILIŞ (Kiklop açılır)
```

### 5.2 Oturum döngüsü (tam oyun)

Kapasite 4, hedef 5 → **en az iki teslim yürüyüşü.** Unutuş üçüncü bir “tur” dayatabilir (çanta gider, gemi kayar). Beat’ler: `scenario.md`.

### 5.3 İki kıskaç (Lotus, K35)

| Kıskaç | Ne der | Nasıl kaçarsın | Bedeli |
|---|---|---|---|
| **Ada** (güzellik, keşif, rastgele 5) | “Kal, bak.” | Dolaş, hatıra topla | Unutuş artar; ev kayabilir |
| **Unutuş** | “Yolu unuttun.” | Deniz / gemi; sık teslim | Çanta sıfır, gemi başka kıyı; teslimler durur |

Güneş kıskaç değildir (batış atmosfer). Sonraki ada **yalnız 5 teslim** ile açılır.

---

## 6. Kazanma / kayıp koşulları

**AYRILIŞ** — `LOTUS_TARGET` (5) kahraman gemide, dümen E. Kiklop açılır.

**UNUTUŞ** — durak bitmez. Çanta 0, gemi kıyı değiştirir, `delivered` kalır. Cinematic yok (`scenario.md` F1–F3).

**Güneş kaybı yok.** Hub abandon sonraki adayı açmaz.

Ayrıntı: `gdd-lotus-island-run.md` §3. Kiklop/Sirenler kendi kayıplarını tutar (K27).

---

## 7. Tasarım sütunları

| # | Sütun | Tanım | Tasarım testi |
|---|---|---|---|
| **P1** | **Tek mekanik, iki yön** | Toplamak hem tek ilerleme yolu hem tek tehlike kaynağıdır. | X ve Y arasında kalınca: **toplama fiiline bağlı olanı seç.** Toplamaya bağlanamayan sistem oyuna girmez. |
| **P2** | **Unutma görülür, anlatılmaz** | Kayıp durumu metinle değil, arayüzün ve dünyanın *çekilmesiyle* anlatılır. | Bir bilgi hem yazıyla hem görsel bozulmayla verilebiliyorsa: **görsel bozulmayı seç, yazıyı sil.** |
| **P3** | **Ada okunabilir** | Peyzaj (tepe, kıyı, göl, filo) okunur. Lotus’ta çiçek **yeri** izinli sürprizdir (K35); evre süreleri sabittir. | Çiçek kümesi ve sabit tohum bu adada yok. Kiklop/Sirenler el yerleşimini tutabilir. |
| **P4** | **Kıyı huzurdur** | Deniz her zaman güvenlidir, her zaman iyileştirir, her zaman görünür. | Kıyıya tehdit eklemek isteyen her fikir reddedilir. Oyuncunun tek çapası odur. |

### Karşı sütunlar (bu oyun **değildir**)

- **Craft / envanter ağacı YOK** — P1'i bozar; toplamak tek fiil kalmalı.
- **Düşman, savaş, can barı YOK** — Homeros'ta Lotophagoi düşman değildir; ayrıca P1'i bozar.
- **Diyalog ağacı YOK** — Lotophagoi ile etkileşim tek tuşluk bir takastır, konuşma değil.
- ~~**Çoklu bölüm / ikinci ada YOK**~~ — **14 Ağu 2026'da geçersiz** (3 durak). Lotus çiçekleri K35’te rastgele; peyzaj elle. Kiklop/Sirenler el yerleşimini tutabilir.
- **Gün kaybı YOK** — gün döner (K35); batış atmosfer. Mevsim/hava hâlâ yok.

---

## 8. Kontroller

| Girdi | Eylem |
|---|---|
| **W A S D** | Hareket — **kamera göreli** (W = kameranın baktığı yön) |
| **Fare** | Kamerayı yörüngede döndür |
| **Fare tekeri** | Kamera mesafesi (dar aralık) |
| **E (basılı 1,2 s)** | Olgun lotus topla |
| **E (kısa)** | Gemide teslim et · Lotophagos'un ikramını kabul et · dümende ayrıl |
| **Esc** | Duraklat |

Kasıtlı olarak **yok**: zıplama, koşma, saldırı, envanter ekranı.

> **Karar — sade menü (sahip, 14 Ağu 2026).** Önceki prototip menüsüz, hemen oynanırdı. Artık başlık var: **Oyna** / **Nasıl oynanır**. Pause: Devam / Ada'ya dön / Ana menü. Ayarlar ormanı, kayıt, mağaza yok. Ekranlar: `docs/ux/`.

> **Karar — zıplama yok (sahip onayı, 14 Ağu 2026, kapalı).** Ada düz, zıplamanın hiçbir oynanış işlevi yok ve kontrol listesini sadeleştirmek istiyoruz. Motor tarafında zıplama kodu varsa **kaldırılacak**, `JUMP_*` türünde sabit tanımlanmayacak. Bu karar yeniden açılmayacak.

---

## 9. Görsel niyet (5 madde)

> Ayrıntılı art bible ayrı bir ajanın işi — bu bölüm yalnızca niyet çapasıdır.

1. **Öğleden sonra Ege ışığı, uzun gölgeler.** Işık sıcak ve yandan gelir; gün ilerledikçe altın→kehribar→gül rengine düşer. Güneşin yüksekliği HUD'a bakmadan okunan asıl saat göstergesidir.
2. **Su iki katmanlı turkuaz-lazuli.** Sığ kıyı parlak turkuaz, derin su lacivert-lazuli. Bu geçiş oyuncuya "buradan öteye gitme" der — görünmez duvar yerine renk.
3. **Altın kum, tebeşir beyazı kayalık, kavruk yeşil.** Ada kuru ve parlak; hiçbir yer koyu değil. Karanlık yok, tehdit ışığın *fazlalığıdır*.
4. **Lotus tek doygun beyaz-pembe.** Adadaki en açık ve en pembe şey olgun çiçektir; solmuş olan doygunluğunu kaybedip kahverengiye düşer. Olgunluk **renkle ve silüetle** okunur, ikonla değil.
5. **Uzak tepeler mavimsi sisin içinde.** Derinlik atmosferik perspektifle verilir; unutuş arttıkça bu sis **oyuncuya doğru sürünür** — süt beyazına döner ve önce ufku, sonra gemiyi yutar.
6. **Unutuşun görsel dili: doygunluk kaybı + süt beyazı vinyet + arayüzün çekilmesi.** Bulanıklık en son gelir; ilk giden şey bilgidir, görüntü değil.

---

## 10. Ses niyeti (4 madde)

1. **Dalga sesi mesafe göstergesidir.** Kıyıdan uzaklaştıkça alçalır. Pusula silindiğinde oyuncunun elinde kalan tek yön bilgisi budur — dalgayı duy, denizi bul.
2. **Uzak lir**, tek enstrüman, tempo yok. Adanın kendi sesi; sazlıkta belirginleşir, tepede kaybolur.
3. **Unutuş anında boğuk uğultu** — kulakların su altına inmesi gibi: yüksek frekanslar kesilir, kendi ayak sesin gecikir, lir ters çalar.
4. **Teslim sesi tek ve net:** ambardaki tuzlu suya düşen çiçeğin sesi + kısa bir nefes alma. Ödülün tamamı bu sestir; fanfar yok.

---

## 11. Görsel kimlik çapası

**Tek satır kural:** *Bu ada hiçbir zaman korkutucu görünmemeli — tehlike güzelliğin kendisidir.*

Destekleyen iki ilke:

- **Işık asla azalmaz, bilgi azalır.** Belirsizlikte: sahneyi karartma, arayüzü sil.
- **Deniz her karede bir yerde olsun.** Kamera hangi açıda olursa olsun, oyuncu turkuazın bir parçasını görebilmeli — kaybolmak *bilinçli* bir hata olmalı.

---

## 12. MVP tanımı

Çekirdek döngünün eğlenceli olduğunu kanıtlayan en küçük yapı:

- Ada + kahraman gemi + **5** lotus
- Olgunluk döngüsü ve renk değişimi
- Topla / taşı / teslim et (hedef 5, dümen)
- Unutuş: forget event (çanta 0, gemi kayar) — kayıp cinematic yok
- Gün döner; batış atmosfer

Bu listede **olmayan** her şey (Lotophagoi, tepe manzarası, ses, anlatı metinleri) MVP sonrası.

---

## 13. Riskler

| Risk | Neden | Azaltma |
|---|---|---|
| Unutuş cezası "sinir bozucu" olarak okunabilir | Oyuncudan bilgi almak kolayca haksızlık hissi yaratır | Bilgi hep **kademeli** gider ve **her zaman** geri kazanılabilir; ani ölüm yok, `MEM_GRACE` var |
| 420 s hem çok uzun hem çok kısa gelebilir | Artık kayıp değil (K35); gece çarpanı hissi | Playtest: `MEM_NIGHT_MUL` yeter mi |
| Rastgele çiçek ikinci oynayışta “adayı öğrendim” hissini bozar | Ezber rota yok | Kasıtlı — P3 peyzaj; çiçek sürpriz |
| "Neden lotus topluyorum" sorusu ilk 30 saniyede cevaplanmazsa fikir dağılır | Motivasyon icat (§4.3) | Açılış metni bunu **iki cümlede** verir (bkz. `scenario.md` §3) |

---

## Kapanan kararlar

Bu kararlar sahip tarafından verildi ve **kapalıdır** — yeniden açılmayacak.

| Karar | Sonuç | Tarih |
|---|---|---|
| Zıplama kalsın mı | **Hayır, kaldırıldı.** Kontroller: WASD + fare + E + Esc. Bkz. §8. | 14 Ağu 2026 |
| Lotophagoi'nin oyuncunun kayıp adamları olduğu söylensin mi | **Hayır — ima kalacak.** Ne oyun içinde ne finalde doğrulanır. Bkz. `scenario.md` §6. | 14 Ağu 2026 |
| Oyun adı | **Lotophagoi** | 14 Ağu 2026 |
| Menü | **Sade başlık var** (Oyna / Nasıl oynanır). Bkz. `docs/ux/`. | 14 Ağu 2026 |
| Tek ada mı, çoklu ada mı | **Çoklu — 3 duraklı bir koşu.** Lotus Adası (1. durak/çapa) + Kiklop Mağarası (2.) + Sirenler Geçidi (3.). Unutuş koşu boyunca taşınıyor. Ayrıntı: `multi-island-concept.md` M7 ve M1–M6. | 14 Ağu 2026 |
| Hub var mı | **Var.** Lotus unutuşu durak bitirmez (K35). Kiklop/Sirenler K27. | 14 Ağu 2026; Lotus kaybı 15 Ağu |
| Oyuncu Odysseus mu, isimsiz tayfa mı | **Doryseus** — Homeros'un Odysseus'u değil, oyun için orijinal bir karakter (tasarım niyeti Odysseia IX.82–104'ten mekanik/tema olarak ilham alıyor, karakteri birebir taşımıyor). Diğer denizciler/NPC'ler kolektif olarak **"unutulmuş tayfa"** olarak anılıyor. Destan adı ("Odysseia") değişmedi — yalnızca oynanan karakterin kişisel adı. | 14 Ağu 2026 |

Ayrıca üç sayısal değer (`DAY_LENGTH`, `MEM_SEA_RECOVER`, eşik 2'deki muğlak sayaç) **playtest'e ertelendi** — oynanır sürüm elde olmadan tartışılmayacak. Ölçüm kriterleri: `tuning.md` §11.

---

## Açık sorular

1. ~~**Oyuncu Odysseus mu, isimsiz bir tayfa mı?**~~ **Kapandı (14 Ağu 2026, sahip kararı) — bkz. Kapanan kararlar.** Oyuncu **Doryseus** — Homeros'un Odysseus'u değil, oyun için orijinal bir karakter. Diğer denizciler/NPC'ler kolektif olarak "unutulmuş tayfa" olarak anılıyor.
2. ~~**Hedef 12 sabit mi?**~~ **Kapandı (K35):** koşu toplamı 12; Lotus durağı **5**, sabit. Zorluk seçeneği yok.
3. **Oyun sonunda skor/süre gösterilsin mi?** Skor tekrar oynanışı destekler ama şiirsel finali bozar. Şu an **gösterilmiyor** varsayıldı.
4. **Türkçe tek dil mi?** Tüm oyun içi metinler Türkçe yazıldı. İngilizce sürüm istenirse metinler `scenario.md` §7'de tek yerde toplu.
