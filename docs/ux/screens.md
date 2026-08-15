# Ekran envanteri — Lotophagoi

> **Durum:** tasarlandı — **Hub eklendi (2026-08-14)**, kilit/ilerleme mekanizması **kapandı: sahip Seçenek C (Hibrit) onayladı** (bkz. §3.3). Durak kaybı da kapandı: sahip onayı ile **sadece o durak biter**, oyuncu hub'a döner (bkz. `docs/design/gdd-memory-system.md` §3.1 madde 9, K27).
> **Tarih:** 2026-08-14 (ilk taslak) · güncelleme 2026-08-14 (çoklu-ada Hub akışı)
> **Tetikleyen:** sahip 14 Ağu 2026'da iki karar verdi — (1) key art artık oyun içi ekranlarda da kullanılıyor, (2) çok-ada yapısı gerçek bir **hub** (Başlık → Hub/ada seçimi) ile kuruluyor — bu, `docs/design/multi-island-concept.md`'nin M7 kararındaki "hub yok, tek kesintisiz koşu" seçimini **tersine çeviriyor.** `CLAUDE.md`'nin kimlik paragrafı bu tersine çevirmeyi zaten yansıtıyor; `docs/design/game-concept.md` ve `multi-island-concept.md` henüz **senkron değil** (hâlâ "hub yok" yazıyor) — bu, `game-designer`'ın paralel yürüttüğü ayrı bir iş (unutuşun duraklar arası nasıl taşınacağı, `RUN_TARGET_TOTAL`'ın hub ile nasıl çalışacağı). Bu doküman o mekanik ayrıntılardan **bağımsız**, yalnızca hangi ekranın hangi ekrana açıldığını ve hangi bilgiyi gösterdiğini kurar; sayılar/formüller netleşince ince ayar yapılır, iskelet bugünden kurulabilir.
> **Metin kuralı:** anlatı satırları yalnızca `docs/design/scenario.md` §7 (yalnızca Lotus Adası için yazılı; Kiklop/Sirenler'in kendi satır setleri `island-designer`'ın işi, henüz yok). Menü kromu burada. Lotophagoi kimliği **ima** — hiçbir ekran söylemez (`scenario.md` §6 kilitli). Karakter adı **Doryseus** (Odysseus değil), tayfa "unutulmuş tayfa" — bu dosyadaki yeni metinlerde bu isimlendirme kullanılıyor.

DOM overlay + 3D dünya. Menüler dünyanın üstünde; oyun HUD'u `docs/ux/hud.md`.

---

## Ekran akışı — üst seviye özet

```
Başlık (Welcome + giriş menüsü, tek ekran)
  └─ Oyna ──► Hub (Ada seçimi)
                 └─ durak seç ──► Açılış (o durağın A1–A3'ü) ──► Ada/Mağara/Geçit HUD
                                                                    ├─ durak biter (başarı) ──► Durak sonu: Ayrılış ──► Hub'a dön
                                                                    ├─ durak biter (kayıp) ────► Durak sonu: Unutulma ──► Hub'a dön veya Koşu sonu (🔲 belirsiz, bkz. §10)
                                                                    └─ 3. (son) durak başarıyla biterse ──► Koşu sonu (Yeniden başla / Ana menü)
```

Toplam **11 ekran** (Başlık, Nasıl oynanır, Hakkında, Hub, Açılış×N durak, Oyun HUD, Pause, Toplama istemi, Teslim/ikram/dümen istemi, Durak sonu — Ayrılış, Durak sonu — Unutulma, Koşu sonu), Açılış/Oyun HUD/Durak sonu her durak için tekrar örneklenir ama aynı şablonu kullanır — yeni bir ekran *türü* değil.

---

## 1. Başlık (Title / Welcome)

**Amaç:** isim, tek eylem, atmosfer. Oynanış yok. **Welcome ekranı ile giriş menüsü aynı ekran** — ayırmadım, gerekçe aşağıda.

**Öğeler:**
- Arkaplan: **key art** (`art-source/media/key_art_shore_01_media_1344.png`, Lotus kıyısı), hareketsiz veya çok hafif parallax — sahip kararıyla artık oyun içi ekranlarda kullanılabiliyor (bkz. üstbilgi). Metin okunurluğu için arkaplan üstünde bir scrim/gradient gerekir — **bu bir kontrast/erişilebilirlik gereksinimi, kompozisyonun kendisi `art-director`'ın kararı.**
- Başlık: **Lotophagoi**
- Alt satır (küçük): ~~*Odysseia IX*~~ → **güncellenmeli.** Koşu artık 3 kitaptan besleniyor (IX Lotus + Kiklop, XII Sirenler) — "Odysseia IX" artık yanlış. Öneri: sadece *Odysseia* (kitap numarası düş) veya *bir Odysseia yolculuğu*. Kesin metin `game-designer`/scenario sahibinin kararı, burada sadece "IX" ibaresinin artık yanlış olduğunu işaretliyorum — 🔲.
- **Oyna** (varsayılan odak) — artık doğrudan oyuna değil, **Hub'a** açılıyor.
- **Nasıl oynanır**
- **Hakkında**

**Neden Welcome + giriş menüsü ayrılmadı:** `ia.md`'nin kuruluş ilkesi "tek seviye, alt menü yok, ayarlar ormanı yok." İkinci bir "giriş menüsü" ekranı eklemek üç yeni geçiş (fade/tık) ve bir ekstra "geri" düğmesi demek, kazanılan hiçbir şey yok — Başlık zaten üç eylemden fazlasını taşımıyor. Hub eklenmesi zaten akışa bir ekran ekliyor; gereksiz ikinci bir ekran eklemek yerine mevcut tek-ekran modelini koruyorum. **Alternatif** (ayrı bir "Giriş" ekranı, key art'ı tam ekran bir "splash" olarak ayrı tutmak) mümkün ama önerilmiyor — sahip isterse ayrı bir tur ister.

**Giriş:** boot, Pause→Ana menü, Koşu sonu→Ana menü.
**Çıkış:** Oyna → Hub; Nasıl oynanır → how; Hakkında → about.
**Erişilebilirlik:** kontrast ≥ 4.5:1 (scrim ile); odak halkası görünür; Enter = Oyna; Tab sırası Oyna → Nasıl oynanır → Hakkında.

---

## 2. Nasıl oynanır

**Amaç:** dört satır, bir bakışta. Tutorial popup yağmuru yok.

**Öğeler (sırayla):**
- WASD — yürü
- Fare — bak
- E (basılı) — olgun lotus topla
- E (kısa) — gemiye bırak / dümenle ayrıl

Alt: **Geri**

Olgunluk ikonla anlatılmaz. Bir cümle yeter: *Sadece pembe ve açık olanı kopar.*

**Yeni satır (öneri, koşu 3 duraklı olduğu için):** *Her durağın kendi tehlikesi var. Kontroller aynı kalır.* — Kiklop'un algılanma sistemi ve Sirenler'in sapması bu ekranda ayrıntılandırılmaz (spoiler + tutorial yağmuru riski), sadece varlığı ima edilir. 🔲 kesin metin game-designer onayına açık.

**Giriş/çıkış:** yalnızca Başlık'tan.

---

## 2b. Hakkında

**Amaç:** iki-üç cümle, kapı gibi. Kimlik ima edilmez.

> Lotus Yiyenler'in ülkesi Homeros'un *Odysseia*'sında geçer — dokuzuncu kitap. *İlyada*'da değil.

> On iki gemi, on iki çiçek. Tatmadan kopar.

**Yeni satır (öneri, 🔲 game-designer/scenario onayına açık, ben burada yazmıyorum — sadece yer ayırıyorum):** üçüncü bir cümle, koşunun 3 duraklı olduğunu (Kiklop + Sirenler'in de Odysseia'dan geldiğini) ima eden ama kimlik ima kuralını bozmayan bir satır gerekebilir. Bu anlatı metni `scenario.md`'nin kapsamına giriyor, ben sadece boşluğu işaretliyorum.

Alt: **Geri**

---

## 3. Hub (Ada seçimi) — **YENİ**

**Amaç:** koşunun gerçek merkezi. Oyuncu 3 duraktan hangisini oynayacağını seçiyor. "Menü" değil, "harita/güverte" hissi — ama bu bir görsel karar, `art-director`'a devrediyorum.

### 3.1 Öğeler

- Başlık/üst bilgi: küçük bir çerçeve metni (öneri, 🔲 kesinleşmemiş): *Rota* veya *Duraklar* — "Doryseus'un rotası" gibi karakteri adlandıran bir varyant da mümkün, isim kuralına uygun.
- **3 durak kartı**, yan yana veya bir güzergah/harita üstünde konumlanmış:

  | Durak | Sırası | Görsel ipucu (yer tutucu, art-director kararı) |
  |---|---|---|
  | Lotus Adası | 1 | çapa/kıyı silüeti |
  | Kiklop Mağarası | 2 | mağara ağzı silüeti |
  | Sirenler Geçidi | 3 | kayalık/dalga silüeti |

- Her kart üstünde **durum rozeti** — metin + ikon birlikte (renk körlüğü kuralı, HUD'la aynı disiplin):

  | Durum | İkon (yer tutucu) | Metin |
  |---|---|---|
  | Kilitli | kilit simgesi | `Kilitli` |
  | Açık, henüz oynanmadı | boş halka | `Hazır` |
  | Tamamlandı | onay işareti | `Tamamlandı` |

- Alt/köşe: **Ana menü** dönüşü (Başlık'a).
- 🔲 opsiyonel: koşu ilerleme özeti (`1/3 durak tamamlandı`) — sayı gösterimi HUD'ın "unutuş barı yok" ilkesini çiğnemiyor (bu bir ilerleme sayacı, unutuş ölçeği değil), ama eklenip eklenmeyeceği sahip kararı.

### 3.2 Durak seçilince ne olur

Açık (`Hazır` veya `Tamamlandı`) bir durağa gidildiğinde → o durağın **Açılış** overlay'i (§4) → o durağın HUD'u (§5). `Kilitli` bir karta odaklanılabilir (klavye ile gezilebilir, erişilebilirlik gereği) ama seçilemez — Enter'a basılırsa görsel bir "hayır" tepkisi (titreme + kısa metin, ör. `Önce Lotus Adası'nı bitir` gibi net bir gerekçe, sessiz reddetme yok — bkz. HUD prompt disiplini "yanlış eylem sessizce cezalandırılmaz").

### 3.3 Kilit/ilerleme mekanizması — **açık karar, sahip onayı gerekiyor**

Sahip'in talebi "oyuncu 3 duraktan hangisini oynayacağını seçebiliyor" — bu gerçek bir seçim istendiğini gösteriyor, ama proje canon disiplinine ve öğretim sırasına (Lotus = çapa/öğretici durak, Kiklop yeni bir algılanma sistemi ekliyor, Sirenler mevcut sapma kodunu yeniden kullanıyor — bkz. `multi-island-concept.md` §6/M3) çok önem veriyor. Üç seçenek:

| | A — Baştan hepsi açık | B — Sıralı kilit | C — Hibrit (önerilen) |
|---|---|---|---|
| **Ne demek** | 3 durak da ilk andan itibaren seçilebilir, sıra oyuncuda | Lotus açık başlar; Kiklop, Lotus bitirilince açılır; Sirenler, Kiklop bitirilince | İlk koşuda B gibi sıralı; **koşu bir kez tamamlanınca** (3'ü de bitmiş) o oturum boyunca Hub'daki tüm duraklar serbestçe tekrar oynanabilir hale gelir |
| **Sahip'in "seçebiliyor" isteğiyle uyum** | En yüksek — gerçek özgürlük | Düşük — ilk oyunda seçim yanılsaması, tek gerçek karar "oyna" | İlk koşuda B kadar kısıtlı ama replay'de A kadar özgür — "seçebiliyor" ifadesi tekrar oynamalarda tam karşılanıyor |
| **Canon/öğretim sırası** | Risk — bir oyuncu hiç Lotus'u (temel döngüyü) öğrenmeden Sirenler'e (mevcut sapma mekaniğinin üstüne kurulan bir twist) girebilir; Odysseia'nın kronolojik sırası (IX→IX→XII) bozulabilir | Korunur | İlk oyunda korunur; sonraki oynamalarda oyuncu zaten öğrendiği için sıra önemini yitiriyor |
| **Unutuş taşıma formülüyle ilişki** (`game-designer`'ın paralel işi) | Taşıma formülü "önceki durağın bitiş unutuşu → sonraki durağın başlangıcı" tanımlı bir *sıraya* dayanıyor (`multi-island-concept.md` §6/M4) — sıra tanımsızsa formül de tanımsızlaşır, `game-designer` bunu ayrıca çözmeli | Formülle doğrudan uyumlu, ek iş yok | İlk koşuda formülle uyumlu; replay modunda tek-durak oynanışının unutuşu nasıl başlayacağı (0'dan mı, taşınmadan mı) ayrı bir küçük soru — muhtemelen replay'de her durak kendi `MEM_START`'ından başlar (taşıma yok, çünkü "run" tamamlanmış sayılıyor) |
| **Kalıcılık ihtiyacı** | Yok | Yok | Oturum-içi bellek yeterli (mevcut "kayıt yok" kuralına uygun — `ia.md`); sayfa yenilenince sıfırlanır, bu **kabul edilebilir** çünkü zaten hiçbir ilerleme kaydedilmiyor |

**Önerim: C (Hibrit).** Gerekçe: sahip'in "seçebiliyor" isteğini görmezden gelmiyor (A'nın özgürlüğünü replay'de veriyor) ama ilk oynanışta projenin en çok koruduğu iki şeyi (canon sırası + öğretim eğrisi + unutuş taşıma formülünün tanımlılığı) riske atmıyor. B de savunulabilir bir seçenek (en düşük risk, en basit uygulama) — eğer sahip "replay modu" fikrini gereksiz karmaşıklık bulursa B'ye düşmek tek satırlık bir kapsam küçültmesi olur. A önerilmiyor — hem canon hem de mekanik (unutuş taşıma) açısından en yüksek riski taşıyor ve bu proje ikisine de büyük önem veriyor.

**Bu tabloda karar verilmedi — sahip'in seçimi bekleniyor.** Seçim yapılınca bu bölüm güncellenip "kapanan karar" olarak işaretlenecek.

### 3.4 Giriş/çıkış

**Giriş:** Başlık'tan "Oyna"; her durağın "Durak sonu" ekranından "Hub'a dön" (bkz. §9–§10).
**Çıkış:** durak seç → Açılış; "Ana menü" → Başlık (koşu ilerlemesi sıfırlanır, mevcut "kayıt yok" kuralı — `ia.md`).

### 3.5 Erişilebilirlik

- Tab/ok tuşlarıyla kenar görev + 3 kart arası gezinme, Enter/Space ile seçim, görünür odak halkası.
- Kilitli/Açık/Tamamlandı durumu **ikon + metin** ile, yalnızca renkle değil (Hub'un tek görsel-durum yeri olduğu için bu proje genelindeki "renk körlüğü kuralı"nın en kritik uygulama noktası).
- Dokunmatik: MVP'de dokunmatik genel olarak kapsam dışı (`hud.md` "Platform Notes"); yine de kart hedef boyutu ≥ 44 px tutulmalı, ileride touch açılırsa ekstra iş çıkmasın.
- Metin kontrastı ≥ 4.5:1 (Hub arkaplanı ne olursa olsun — art-director kararı, kontrast gereksinimi benim).

### 3.6 Kenar görev (K35, 15 Ağu 2026)

Lotus Adası’nın **uydusu**, dördüncü durak değil. Haritada ada düğümünün sol-üstüne kesik çizgiyle bağlı **küçük daire + iç nokta**. Metin: `Beş yeter` (`scenario.md` A3).

| | Ada kartı | Kenar görev |
|---|---|---|
| Ne | Durak (antoloji) | Aynı adanın adlandırılmış senaryosu |
| Tıklanınca | Asıl Lotus koşusu (12, batış kayıp) | K35 kenar görev (5, gün döner) |
| Kiklop kilidi | 5 teslim + dümen | Aynı — ayrı sayaç yok |

Kiklop/Sirenler’e kenar görev yok. Tab sırası: kenar görev → Lotus → (kilitliler) → Ana menü.

### Wireframe — Hub

```
┌─────────────────────────────────────────┐
│                  ROTA                    │
│                                          │
│  (•) Beş yeter                           │
│     ↘                                    │
│   [ Lotus Adası ]  [ Kiklop ]  [Sirenler]│
│      Hazır          Kilitli    Kilitli   │
│                                          │
│                                Ana menü  │
└─────────────────────────────────────────┘
```

---

## 4. Açılış overlay (per durak)

Dünya görünür, kontrol yok. Üç satır, fade, 3 sn — **her durağın kendi A1–A3'ü var.**

**Lotus Adası** (mevcut, `scenario.md` A1–A3):

> Dokuz gün rüzgâr. Onuncu sabah kum.
> Üç adam gönderdim. Üçü de burada. Üçü de gülümsüyor.
> Yenmemiş çiçek hatırlatır. Bu kıyıda beş yeter.

**Kiklop Mağarası, Sirenler Geçidi:** kendi satırları henüz yazılmadı — `island-designer`'ın işi (`level-cyclops-cave.md`/gelecek `level-sirens-strait.md` ile birlikte, `scenario.md` §7 formatında). Bu doküman şablonun **her durakta tekrarlandığını**, içeriğin kilitli olmadığını belirtiyor.

Sonra silinir, kontrol geçer.

**İlk oynanışta atlanmaz** (mevcut kural korunuyor — bkz. `user-flow.md`). **Bir durağı Hub'dan tekrar seçmek** (örn. bitirdikten sonra tekrar oynamak, §3.3 seçenek C) — 🔲 açılışı tekrar göstersin mi, atlasın mı: öneri, ilk kez o oturumda görülmüşse bir daha atla (Pause'un "Durağı yeniden başlat"ı zaten bunu yapıyor, bkz. §6), tutarlılık için Hub üstünden tekrar seçimde de aynı kural.

---

## 5. Oyun HUD (per durak)

Ayrı spec: `docs/ux/hud.md`. Özet: çanta sol üst, güneş üst orta, teslim sağ üst, pusula alt orta, prompt alt orta (pusulanın üstü). Unutuş barı **yok**.

**Çok-durak notu:** HUD tasarımı değişmiyor — pusula her durakta o durağın kendi "eve dönüş" hedefine (gemi, mağara çıkışı, dümen — durağa göre) işaret eder; teslim sayacı `n/durağın alt-hedefi` gösterir (`n/12` değil, alt-hedef sayısı `tuning.md` §3.0'ın işi, henüz kesinleşmedi — bu doküman sayıyı sabit yazmıyor).

---

## 6. Pause

**Amaç:** nefes. Dünya donuk, hafif süt pusu (unutuş efekti değil, UI freeze).

**Öğeler:**
- **Devam**
- **Durağı yeniden başlat** *(eski adı "Ada'ya dön" — yeniden adlandırıldı, kapsamı netleştirmek için: yalnızca **şu anki durağı** baştan başlatır, açılışı atlar, koşunun geri kalan ilerlemesine (diğer duraklar Tamamlandı/Hazır durumu) dokunmaz.)*
- **Hub'a dön** *(yeni — mevcut durağı bırakıp Hub'a döner; durak yarım kalır, `Hazır` durumunda kalır — henüz yenilmemiş/kaybedilmemiş sayılır, tekrar seçilebilir)*
- **Ana menü** *(kapsamı büyüdü: artık yalnızca bu durağı değil, **tüm koşuyu** sıfırlar — Hub'daki tüm ilerleme gider, Başlığa döner. Kayıt yok, bu davranış zaten `ia.md`'nin kuralıydı, şimdi bedeli daha büyük çünkü kaybedilecek daha çok ilerleme var.)*

**Giriş:** Esc. **Çıkış:** Devam veya Esc. Ana menü onay istemez (mevcut kural) — 🔲 **ama artık daha çok ilerleme siliniyor (3 durağa kadar), bir onay adımı (\"Emin misin?\") eklenmeli mi** bu görev kapsamında karar verilmiyor, sahip'e soruyorum: mevcut "onay istemez" ilkesi minimal-UI felsefesinden geliyordu (kayıp küçüktü), ama artık kayıp büyüyebilir (20-30 dk'lık bir koşu). Öneri: yine de onay eklenmesin — proje boyunca "confirm dialog yok" ilkesi tutarlı kalsın, ama bu netleşmemiş, işaretliyorum.
**Erişilebilirlik:** odak Devam'da, dört öğe arası Tab/ok ile gezinme.

---

## 7. Toplama istemi (world)

Olgun lotus `HARVEST_RANGE` içindeyken, çiçeğin üstünde veya alt orta:

`E — topla` (U1)

Çanta doluysa: `Elin dolu` (U5), çanta bir kez titrer. Eşik 3'te (75+) **hiçbir ipucu yok**.

Solmuşa bakınca istem **yok** — yanlış eylem sessizce cezalandırılmaz; dokununca kahverengi flaş + U yok, GDD'deki ses/flaş.

*(Kiklop/Sirenler'in kendi toplama nesneleri varsa — bkz. `multi-island-concept.md` §6/M5 "Kiklop'ta koyun/eşya, Sirenler'de farklı bir toplanabilir" — bu tablo aynı desenle genişler; nesne adı değişir, "E — topla" fiili değişmez, P1 sütununun korunması gereği.)*

---

## 8. Teslim / ikram / dümen istemi

| Bağlam | Metin | Kaynak |
|---|---|---|
| Gemi/durağın teslim noktası `DELIVER_RANGE` | `E — teslim et` | U2 |
| Lotophagos (veya durağa özgü eşdeğeri) | `E — al` | U3 |
| Dümen/durak çıkışı, **alt-hedef tamamlandığında** | `E — ayrıl` | U4 |

Hepsi alt orta. Aynı anda en fazla **bir** prompt. Öncelik: dümen > teslim > al > topla.

**Değişiklik:** U4'ün koşulu artık sabit `12/12` değil, **o durağın kendi alt-hedefi** — sayı `tuning.md` §3.0'dan gelecek (Lotus örnek önerisi 5, kesinleşmedi). Metin `E — ayrıl` sabit kalıyor, tetik koşulu genelleşti.

---

## 9. Durak sonu — Ayrılış (durak başarıyla bitti)

Kamera kıç, durak uzaklaşır. Üç satır (Lotus için W1–W3, diğer duraklar için `island-designer`'ın kendi satırları). Siyah/kapanış rengi (durağa göre `art-director`).

**Buton(lar):**
- **Son durak değilse:** tek buton, **Hub'a dön**. (Eski "Yeniden başla" burada anlamsız — koşu bitmedi, yeniden başlamak bütün koşuyu sıfırlamak demek olurdu, istenmeyen bir sonuç.)
- **Son (3.) durak ise:** bu ekran gösterilmez, doğrudan **Koşu sonu** ekranına geçilir (§11) — tekrar "Hub'a dön" göstermenin anlamı yok, koşu zaten bitti.

Skor/süre yok (mevcut kural korunuyor).

---

## 10. Durak sonu — Unutulma (durak kaybedildi)

Ekran süt beyazına yükselir (kararmaz). Üç satır (Lotus için L1–L3, diğer duraklar için kendi satırları). Beyaz/kapanış rengi.

### 🔲 En büyük açık soru — bu görevin en riskli noktası

Eski (hub'sız) tasarımda K27 kararı netti: *"bir durakta unutuş dolarsa tüm koşu biter, ada bazlı checkpoint yok"* (`gdd-memory-system.md` §3.1 madde 9). **Hub'ın geri gelmesiyle bu karar sorgulanır hale geldi** — artık geri dönülecek bir Hub var, bu da doğal olarak "sadece bu durağı kaybettin, tekrar dene" okumasını çok daha mantıklı kılıyor. Ama bu, `game-designer`'ın paralel çözdüğü mekanik bir soru; ben burada **iki olası davranışı da** tasarlıyorum, hangisinin geçerli olacağına `game-designer`/sahip karar verecek:

| | Durak-bazlı kayıp (Hub önerisiyle uyumlu) | Koşu-bazlı kayıp (K27'nin aynen korunması) |
|---|---|---|
| **Buton** | **Hub'a dön** (durak `Hazır`/tekrar denenebilir kalır, diğer duraklar etkilenmez) | **Yeniden başla** + **Ana menü** (koşu tamamen biter, Hub'daki tüm ilerleme sıfırlanır) |
| **His** | Arcade-yakın, cezası küçük, hub'ın "gerçek seçim" ruhuna uygun | Roguelite-yakın, cezası büyük, K27'nin "ne kadar ileri gidersen o kadar unutursun" temasını korur |
| **Unutuş taşıma formülüyle tutarlılık** | Taşıma formülünün (bir sonraki durağa kısmi unutuşla başlama) anlamı zayıflar — durak kaybedilirse zaten en baştan deneniyor | Formülle tam tutarlı — kaybın ağırlığı formülün var oluş sebebiyle örtüşüyor |

**Bu doküman bir taraf seçmiyor.** İki UI kalıbı da yukarıda tarif edildi, hangisi uygulanacaksa (ya da `game-designer` üçüncü bir hibrit önerirse — ör. "N. kayıptan sonra koşu biter") `ui-programmer` bu tablodan doğrudan uygulayabilir. **`producer`/`game-designer`'a not: bu karar netleşmeden Faz 4'ün Durak sonu — Unutulma ekranı tam kodlanamaz; diğer tüm ekranlar (Başlık, Hub, Açılış, HUD, Pause, Ayrılış, Koşu sonu) bu belirsizlikten bağımsız, şimdiden uygulanabilir.**

---

## 11. Koşu sonu (Run complete) — **YENİ**

3. (son) durak başarıyla bitirildiğinde gösterilir — koşunun kendisinin kapanışı, tek bir durağın değil.

**Öğeler:** kapanış metni (🔲 henüz yazılmadı — `scenario.md`'nin Lotus'a özel W1–W3'ü tek başına yetmez, koşunun tamamını kapatan ayrı bir kapanış gerekebilir; bu, anlatı metni olduğu için scenario sahibinin işi). Skor/süre yok (mevcut kural).

**Buton(lar):** **Yeniden başla** (koşuyu baştan başlatır — Hub'daki tüm kilitler §3.3'teki karara göre sıfırlanır) · **Ana menü**.

*(Eğer §10'daki "koşu-bazlı kayıp" seçilirse, bu ekranın kayıp eşdeğeri zaten var — bugünkü "Unutulma" ekranı o rolü üstlenir, ayrı bir "Koşu bazlı kayıp" ekranına gerek yok, §10'daki tablo bunu zaten karşılıyor.)*

---

## Beat satırları (oyun kesilmez)

Alt orta, prompt'un üstünde, 4 sn, `scenario.md` B1–B3 (yalnızca Lotus için yazılı). Pause'ta gizlenir. Eşik 3'te beat **yazılmaz** (HUD yok kuralı) — tetik bekler, eşik düşünce gösterilir.

Kiklop/Sirenler'in kendi beat setleri henüz yok — aynı desen (durak başına 3, tetikli, HUD-yok kuralına tabi) tekrarlanacak.

---

## Wireframe — Başlık

```
┌─────────────────────────────────────────┐
│         (key art — kıyı, scrim)          │
│              LOTOPHAGOI                  │
│               odysseia                   │
│                                          │
│              [ Oyna ]                    │
│           Nasıl oynanır                  │
│              Hakkında                    │
└─────────────────────────────────────────┘
```

## Wireframe — Pause

```
┌─────────────────────────────────────────┐
│           (donuk durak)                  │
│              Devam                       │
│        Durağı yeniden başlat             │
│             Hub'a dön                    │
│             Ana menü                     │
└─────────────────────────────────────────┘
```

---

## Açık sorular — bu dosyaya özgü

| # | Soru | Kim karar verir |
|---|---|---|
| S1 | Başlık alt satırı ("Odysseia IX" artık yanlış) — ne yazsın | game-designer / scenario sahibi |
| S2 | Hub kilit/ilerleme mekanizması — A/B/C (§3.3) | sahip |
| S3 | Durak kaybı — durak-bazlı mı koşu-bazlı mı (§10) | game-designer + sahip |
| S4 | Hub'da koşu ilerleme özeti (`1/3 durak`) gösterilsin mi | sahip |
| S5 | Ana menü'nün artık büyüyen kaybı (3 durağa kadar ilerleme) için onay adımı gerekiyor mu (§6) | sahip |
| S6 | Kiklop/Sirenler'in Açılış (A1–A3) ve Durak sonu (W/L) satırları | island-designer |
| S7 | Koşu sonu ekranının kapanış metni | scenario sahibi |
