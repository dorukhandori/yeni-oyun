# Oyun Konsepti — Lotus Adası

> **Durum:** taslak — sahip onayı bekliyor
> **Tarih:** 2026-08-14
> **Motor:** Vite + TypeScript + Three.js (tarayıcı, 3D)
> **Kardeş dokümanlar:** `gdd-lotus-collection.md` · `gdd-memory-system.md` · `scenario.md` · `level-lotus-island.md` · `tuning.md`
> **Tek sayı kaynağı:** bütün sayısal değerler `docs/design/tuning.md` dosyasındadır. Buradaki sayılar oradan alıntıdır; çelişki olursa `tuning.md` kazanır.

**Etiketler:** **[H]** Homeros'ta var (kaynak) · **[O]** oyun için icat · **[?]** sahip kararı bekliyor.

**Yol notu [O]:** CCGS `brainstorm` skill'i bu dosyayı `design/gdd/game-concept.md` yolunda şart koşar. Bu projede tasarım dokümanları `docs/design/` altında toplanıyor (art `docs/art/`, araştırma `docs/research/` ile aynı hizada). O skill çalıştırılırsa bu dosyaya yönlendirilmeli, ikinci kopya açılmamalı.

---

## 1. Tek cümlelik pitch

**Odysseus'un on iki gemisi Lotus Adası'na oturmuşken, güneş batmadan her gemiye bir olgun lotus çiçeği taşımalısın — ama topladığın her çiçek senin de eve dönüş yolunu unutturur.**

---

## 2. Çekirdek kimlik

| Alan | Değer |
|---|---|
| Çalışma adı | **Lotophagoi** (sahip kararı, 14 Ağu 2026). Eski taslak adı "Lotus Adası" bu dosyada geçebilir; ürün adı Lotophagoi. |
| Tür | Birinci oturumluk 3D toplama / rota kurma oyunu (collectathon değil — tek harita, tek gün) |
| Bakış | Üçüncü şahıs, omuz üstü serbest yörünge kamera |
| Platform | Tarayıcı (masaüstü, klavye + fare) |
| Hedef oturum | **5–10 dakika.** Bir gün = 420 s (`DAY_LENGTH`). Usta oyuncu ~4,5 dk, ilk oyun tam süreyi doldurur. |
| Tekrar oynanış | Aynı harita, aynı tohum (deterministik olgunlaşma) — tekrar oynayış rota optimizasyonudur, keşif değil |
| Çekirdek fiil | **Toplamak** (ve toplamamaya karar vermek) |
| Kapsam | Küçük. Tek ada, tek döngü, iki final, sıfır envanter ağacı, sıfır craft, sıfır diyalog ağacı |

---

## 3. Duygu hedefi

Birincil MDA estetiği: **Submission (akış) + Narrative gerilimi.**

Oyuncunun hissetmesi gereken sıra:

1. **Sakinlik** — sıcak Ege ışığı, dalga sesi, kolayca toplanan ilk çiçek. Ada güzel.
2. **Fark ediş** — HUD titremeye başlar, uzak sesler boğuklaşır. Ada güzel *olduğu için* tehlikeli.
3. **Hesap** — "şu tomurcuk 8 saniyede açar, beklersem 4'ü tamamlarım ama ölçek dolar. Üçle mi döneyim?"
4. **Panik ya da huzur** — son teslimde ya güneş batmadan yetişirsin ya da pusula okun silinmişken denizin hangi yönde olduğunu bilemezsin.

Hedef son duygu **kaçış rahatlaması** değil, **kıl payı hatırlama**: kazanınca bile oyuncu adada bir şey bıraktığını hissetmeli.

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
| **Yenmemiş çiçek hatırlatır** | Koparılmış ama ağza değmemiş **olgun** lotus, gemi ambarındaki tuzlu suya konduğunda o geminin tayfasına yurdunu geri verir. Yenen lotus unutturur; yenmeyen hatırlatır. | Toplamak için Homerik olmayan ama Homeros'la çelişmeyen bir gerekçe yaratır. Odysseus lotus toplar çünkü lotus *ilaçtır*, ödül değil. |
| **Koku baskısı** | Açmış çiçeğin kokusu yemeden de etki eder, sadece daha yavaş. Taşıdığın çiçek seni sürekli kokutur. | "Topla" fiilini doğrudan riske bağlar. Tek mekanikle risk/ödül pompası. |
| **Deniz tuzu hatırlatıcıdır** | Ayak bileğine kadar denize girmek zihni açar. | Oyuncuya kıyıyı, dolayısıyla gemiyi, dolayısıyla *dönüşü* mekanik olarak hatırlatır. Tema ve sistem aynı şey olur. |

Ayrıca **[O]**: oyuncu Odysseus'tur (Homeros'ta bu bölümde kıyıya çıkan da odur — metinle çelişmez, ama metin onun lotus topladığını söylemez).

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
   12/12 mi?  ── hayır ──> tekrar adaya (ya da önce denize gir, kafanı aç)
      │ evet
      ▼
   [ DÜMENDE E ]  →  AYRILIŞ
```

### 5.2 Oturum döngüsü (tam oyun)

Üç teslim turu = üç anlatı beat'i (bkz. `scenario.md`). Kapasite 4, hedef 12 → **matematiksel minimum üç tur.** Oyuncu daha çok, daha küçük tur da yapabilir; bu güvenlidir ama günü yer.

### 5.3 İki kıskaç

Oyunun tamamı iki karşıt baskının arasındadır. Tasarımın tek fikri budur:

| Kıskaç | Ne der | Nasıl kaçarsın | Bedeli |
|---|---|---|---|
| **Güneş** (`DAY_LENGTH` 420 s) | "Acele et." | Dolu çantayla, az sayıda uzun tur yap | Uzun tur = uzun koku maruziyeti = unutuş |
| **Unutuş** (`MEM_MAX` 100) | "Yavaşla, kıyıya in." | Sık, kısa, hafif turlar; denize gir | Her deniz molası ve her fazladan tur günden yer |

İkisi aynı anda çözülemez. Oyunun tüm kararı bu gerilimin içindedir; başka sistem eklemeye gerek yoktur.

---

## 6. Kazanma / kayıp koşulları

**AYRILIŞ (kazanma)** — `LOTUS_TARGET` (12) çiçek gemiye teslim edilmişken oyuncu güverteye çıkar ve dümende **E**'ye basar. Güneş batmadan olmalı.

**UNUTULMA (kayıp)** — iki yoldan biri:

1. `UNUTUŞ` 100'e ulaşır ve `MEM_GRACE` (10 s) içinde oyuncu denize girmez ya da gemiye varmaz.
2. `DAY_LENGTH` dolar (güneş batar) ve teslim edilen çiçek 12'den azdır — tayfa küreğe oturmaz, gemi kalkamaz.

**Başka final yok.** "Yarım dönüş", "gizli final", "iyi/kötü ton" varyantı yok. İki uç, temiz.

---

## 7. Tasarım sütunları

| # | Sütun | Tanım | Tasarım testi |
|---|---|---|---|
| **P1** | **Tek mekanik, iki yön** | Toplamak hem tek ilerleme yolu hem tek tehlike kaynağıdır. | X ve Y arasında kalınca: **toplama fiiline bağlı olanı seç.** Toplamaya bağlanamayan sistem oyuna girmez. |
| **P2** | **Unutma görülür, anlatılmaz** | Kayıp durumu metinle değil, arayüzün ve dünyanın *çekilmesiyle* anlatılır. | Bir bilgi hem yazıyla hem görsel bozulmayla verilebiliyorsa: **görsel bozulmayı seç, yazıyı sil.** |
| **P3** | **Ada okunabilir** | Oyuncu tepeden bakınca ne yapacağını bilir; sürpriz mekanik yoktur, sürpriz *zamanlama* vardır. | Rastgelelik mi el yerleşimi mi: **el yerleşimi.** Olgunlaşma deterministik, rota öğrenilebilir. |
| **P4** | **Kıyı huzurdur** | Deniz her zaman güvenlidir, her zaman iyileştirir, her zaman görünür. | Kıyıya tehdit eklemek isteyen her fikir reddedilir. Oyuncunun tek çapası odur. |

### Karşı sütunlar (bu oyun **değildir**)

- **Craft / envanter ağacı YOK** — P1'i bozar; toplamak tek fiil kalmalı.
- **Düşman, savaş, can barı YOK** — Homeros'ta Lotophagoi düşman değildir; ayrıca P1'i bozar.
- **Diyalog ağacı YOK** — Lotophagoi ile etkileşim tek tuşluk bir takastır, konuşma değil.
- **Çoklu bölüm / ikinci ada YOK** — 5–10 dk hedefini ve P3'ü bozar.
- **Gün/gece döngüsü, hava sistemi, mevsim YOK** — tek gün, tek batış.

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

- Düz bir ada zemini + gemi kutusu + 28 lotus dikilitaşı (silindir de olur)
- Olgunluk döngüsü ve renk değişimi
- Topla / taşı / teslim et
- Unutuş sayacı ve 4 eşiğin **en az ikisi** (pusula silinmesi + süt beyazı vinyet)
- Gün sayacı ve iki final ekranı

Bu listede **olmayan** her şey (Lotophagoi, tepe manzarası, ses, anlatı metinleri) MVP sonrası.

---

## 13. Riskler

| Risk | Neden | Azaltma |
|---|---|---|
| Unutuş cezası "sinir bozucu" olarak okunabilir | Oyuncudan bilgi almak kolayca haksızlık hissi yaratır | Bilgi hep **kademeli** gider ve **her zaman** geri kazanılabilir; ani ölüm yok, `MEM_GRACE` var |
| 420 s hem çok uzun hem çok kısa gelebilir | Tek bir sayı iki farklı beceri seviyesine hizmet ediyor | **Playtest'e ertelendi** — ölçüm ve karar kriteri `tuning.md` §11.1 |
| Deterministik olgunlaşma ikinci oynayışta oyunu kolaylaştırır | Ezber rota | Kabul ediyoruz — tekrar oynanış **optimizasyon** olarak tasarlandı (P3) |
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

Ayrıca üç sayısal değer (`DAY_LENGTH`, `MEM_SEA_RECOVER`, eşik 2'deki muğlak sayaç) **playtest'e ertelendi** — oynanır sürüm elde olmadan tartışılmayacak. Ölçüm kriterleri: `tuning.md` §11.

---

## Açık sorular

1. **Oyuncu Odysseus mu, isimsiz bir tayfa mı?** Odysseus daha güçlü; isimsiz tayfa "sen de unutabilirsin" tehdidini daha inandırıcı kılar. Şu an **Odysseus** varsayıldı.
2. **Hedef 12 sabit mi, zorluk seçeneği olacak mı?** Şu an sabit ve anlatıya bağlı (12 gemi). Zorluk seçeneği eklenirse bu bağ kopar.
3. **Oyun sonunda skor/süre gösterilsin mi?** Skor tekrar oynanışı destekler ama şiirsel finali bozar. Şu an **gösterilmiyor** varsayıldı.
4. **Türkçe tek dil mi?** Tüm oyun içi metinler Türkçe yazıldı. İngilizce sürüm istenirse metinler `scenario.md` §7'de tek yerde toplu.
