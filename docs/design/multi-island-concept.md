# Karar dokümanı — Çoklu "gerçek ada" / challenger yapısı

> **Durum:** M7 kapandı (Seçenek 3, 2026-08-14) ve dört bağımlı onay da kapandı — **koşu-bazlı kayıp**, **~20–30 dk oturum**, **3 durak** (Lotus + Kiklop + Sirenler, Kirke şimdilik kapsam dışı), **`island-designer` agent'ı oluşturuldu.** Bu kararlar artık **gerçek dokümanlara yazıldı**: `gdd-memory-system.md` (§3.1 madde 1/9, §3.5, §4.4), `tuning.md` (§3.0, §5, §10, §11.4), `game-concept.md` (§2, §7, Kapanan kararlar), `level-lotus-island.md` (üstbilgi), `docs/production/roadmap.md` (K2/K3 + yeni K27–K29, Faz 2.6b/c/d). **Hâlâ eksik:** `CLAUDE.md` ve `.cursor/rules/project.mdc`'nin kimlik paragrafı — bilerek dokunulmadı, bkz. dosya sonundaki not. Kiklop ve Sirenler'in kendi `level-*.md` dosyaları henüz yazılmadı (`island-designer`'ın işi).
> **⚠️ Kısmi tersine çevirme (2026-08-14, aynı gün):** sahip M7'nin **"hub yok"** alt-maddesini tersine çevirdi — **gerçek hub var, oyuncu durak seçebiliyor.** M7'nin diğer üç bileşeni (elle tasarlanmış 3 durak — M1/M3, `island-designer` agent'ı — M6) **yeniden açılmadı, geçerli.** Bu reversalin unutuş-taşıma (M4), koşu hedefi (M5) ve oturum süresi (M2/K28) üzerindeki sonuçları **§9**'da uygulama kararı olarak çözüldü (seçenek sunulmadı — hub kararı zaten verildiği için bu aşağı akan bir tutarlılık işiydi). **Tek gerçekten yeniden açılan soru:** koşu-bazlı kayıp (K27) — §9.5'te flag'lendi, kapanmadı, sahip onayı bekliyor.
> **Tarih:** 2026-08-14 (ilk taslak) · güncelleme 2026-08-14 (M7 + M1–M6 çözümü) · güncelleme 2026-08-14 (K27–K29 kapandı, gerçek dokümanlara yazıldı) · güncelleme 2026-08-14 (hub'a dönüş, §9)
> **Bu dosya ne değildir:** onaylanmış bir tasarım değişikliği değildir. `game-concept.md`, `level-lotus-island.md`, `CLAUDE.md` ve diğer `docs/design/` dosyaları **değiştirilmedi** — bu doküman onları değiştirmeye aday gösterir, kendisi değiştirmez.
> **Tetikleyen:** `docs/production/roadmap.md` §4.1 K2'ye ("Ada ölçeği hangisi?") sahip'in verdiği cevap: *"gerçek adalar challenger (arpg'de dungeonlar gibi) olsun, tasarımcısı ayrı bir agent olsun."*
> **Kapsam dışı not:** bu oturumda paralel olarak `gameplay-programmer` bir **world-profile** ayrımı kuruyor — "test adası" (küçük, hızlı, debug bar'lı, yumuşak respawn) vs "gerçek ada" (`tuning.md` ölçeği, barsız, sert kayıp), şu an **tek gerçek ada** varsayımıyla. Bu doküman ona dokunmuyor; buradaki karar "gerçek ada" profilinin **N kere** örneklenmesi anlamına gelecek. Profil sisteminin kendisi ayrı bir konu.

---

## Neden bu doküman gerekli

K2, aslında iki bağımsız soruyu tek cümlede birleştirdi:

1. **Dar soru (roadmap'in sorduğu):** mevcut tek adanın ölçeği `tuning.md` mi, `constants.ts` mı?
2. **Geniş soru (sahip'in cevabı):** oyun tek-ada mı, **çok-ada** mı?

İkincisi birinciyi kapsıyor ama ondan çok daha büyük. Şu an projenin kimlik dokümanları (`CLAUDE.md`, `game-concept.md` §2 "Kapsam: Küçük. Tek ada, tek döngü...", §7 P3 tasarım testi "çoklu bölüm / ikinci ada YOK") **tek ada**yı kapsamın kendisi olarak tanımlıyor. Bu çelişki masaya konmadan Faz 1 (ölçek kararı) verilirse, verilen karar bir hafta içinde geçersiz olur. Bu doküman o çelişkiyi netleştirip sahip'e net bir seçim sunuyor; kendisi seçim yapmıyor.

---

## 1. "Çoklu gerçek ada + challenger" ne demek — somut eksenler

Üç bağımsız eksen var; sahip'in "challenger (arpg'de dungeonlar gibi)" ifadesi bunların hepsine aynı anda dokunuyor ama her biri ayrı bir maliyet/risk taşıyor.

### 1.1 Üretim biçimi: prosedürel mi, elle tasarlanmış küçük bir set mi

| | Prosedürel | Elle tasarlanmış küçük set |
|---|---|---|
| Ne demek | Ada düzeni (bitki yerleşimi, tuzaklar, coğrafya) bir kural setinden anlık üretilir | 3–6 ada, her biri `level-lotus-island.md` gibi tek tek elle krokilenmiş |
| Mevcut P3 sütunuyla ilişki | **Çelişir.** P3 = "Rastgelelik mi el yerleşimi mi: el yerleşimi" — deterministik, öğrenilebilir rota oyunun tasarım testlerinden biri | **Uyumlu.** Aynı ilkeyi ada başına tekrarlar |
| Maliyet eğrisi | Yüksek ilk kurulum (kural sistemi + üretici + doğrulayıcı), sonra ada başına ~sıfır maliyet | Düşük ilk kurulum, ama **her ada `level-lotus-island.md` kadar iş** — doğrusal büyür |
| Solo/scope riski | Bir kişilik ekip için prosedürel içerik üretici kurmak kendi başına bir alt-proje | Bilinen, tahmin edilebilir; roadmap zaten bu maliyeti Lotus Adası için bir kez ödedi |

### 1.2 Oturum yapısı: roguelite run mı, hub-and-spoke mı

| | Roguelite run (tek oturumda art arda adalar) | Hub-and-spoke (ada seç, oyna, dön) |
|---|---|---|
| Akış | Ada 1 biter → doğrudan ada 2'ye geçilir, tek kesintisiz oturum | Bir merkez ekrandan/gemi güvertesinden ada seçilir, o ada bağımsız oynanır, biter, hub'a dönülür |
| Unutuş sistemiyle ilişki | Unutuş adalar arası **taşınabilir** — bu, oyunun mevcut en güçlü fikrini (ilerlemek = iyileşmek, §5.3 `tuning.md`) yeni bir katmana taşır: *ne kadar ileri gidersen o kadar unutursun.* Tematik olarak güçlü, ama tasarımı ayrı bir geçiş/karşılaştırma sistemi ister | Her ada kendi başına kapalı bir döngüdür (bugünkü gibi); menü/skor ekranı roguelite'tan çok bir "seviye seçim" oyunu hissi verir |
| Oturum uzunluğu | Toplam süre N × (ada başı süre); ~5–10 dk hedefi tek adayı tanımlıyordu, N ada ile bu ya çarpılır ya ada başı süre kısaltılır | Her tek-ada oturumu bugünkü 5–10 dk'da kalabilir, toplam oyun süresi "kaç ada oynadın"a bağlı olur — oturum tanımı gevşer |
| Riski en çok taşıyan sistem | **Unutuş** — "adalar arası taşınır mı" sorusu §4'te ayrı başlık |

### 1.3 Oturum uzunluğu etkisi (özet)

Şu anki `DAY_LENGTH` = 420 s tek bir ada içindir ve `tuning.md` §11.1'de zaten playtest'e ertelenmiştir. Çok-ada kararı bu playtest sorusunu değiştirmiyor, **büyütüyor**: artık "bir ada kaç saniye" değil, "bir *koşu* kaç dakika, kaç ada içeriyor" sorusu var. Bu, `game-concept.md` §2'deki "Hedef oturum 5–10 dakika" cümlesinin ya adaya (mikro) ya koşuya (makro) bağlanması gerektiği anlamına geliyor — ikisi aynı anda "5–10 dk" olamaz.

---

## 2. Odysseia IX kimliğiyle ilişki

Mevcut kimlik cümlesi (`CLAUDE.md` §"What this is"): *"An Odyssey IX adaptation: Odysseus's fleet lands on the Island of the Lotus Eaters."* — **tekil, tek bölüm.** Çok-ada kararı bu cümleyi otomatik olarak yanlış kılar; soru hangi yöne yanlış kılacağı.

### Seçenek A — Lotus Adası çapa, geri kalanı Odysseia duraklarından besleniyor

Diğer adalar Kirke (Circe), Kiklop (Polyphemos), Aiolos'un rüzgâr tulumu, Sirenler, Laistrygonlar, Skylla-Kharybdis, Kalypso, Phaiaklar gibi **gerçek Odysseia bölümlerinden** türetilir. Her biri kendi "tek mekanik, iki yön" fikrini bulur (Lotus'ta unutuş neyse, Sirenler'de belki "dinleme" karşılığı bir şey, Kiklop'ta belki "gizlenme/görülme" karşılığı). Oyun bir **Odysseia antolojisi** olur.

- **CLAUDE.md/game-concept.md üzerindeki etki:** "An Odyssey IX adaptation" → "An Odyssey adaptation" olarak genişler ama kanon disiplini korunur; `scenario.md` §1'deki gibi her ada kendi `[H]`/`[O]` etiketli kaynak özetini alır.
- **Risk:** her yeni bölüm kendi çekirdek mekaniğini icat etmek zorunda kalabilir — Lotus Adası'nın "topla = tek fiil, iki yön" zarafeti (P1) her ada için yeniden bulunmalı, yoksa adalar birbirinin reskin'i gibi hissettirir ve mitolojik çeşitlilik sahte olur.
- **Kimlik etkisi:** **güçlenir** — proje hâlâ net biçimde "bu Homeros'un Odysseia'sıdır" diyebilir, sadece IX'dan öteye genişler.

### Seçenek B — jenerik "challenger biome"lara dönüşüyor

Adalar buz mağarası, volkanik yarık, harabe gibi jenerik ARPG-dungeon temalarına döner; Odysseia referansı ya tamamen kalkar ya da yüzeysel bir isim/flavor-text'e indirgenir.

- **CLAUDE.md/game-concept.md üzerindeki etki:** kimlik paragrafının **tamamen yeniden yazılması** gerekir — proje artık "Odyssey IX adaptation" değil, "roguelite collectathon dungeon crawler" gibi bir şeydir. Bu, `game-concept.md` §2'deki tüm sütunları (P1–P4), `scenario.md`'nin kanon disiplinini, hatta oyunun adını (Lotophagoi, doğrudan Homeros'tan) sorgulatır.
- **Risk:** en düşük tasarım riski (temalandırma serbest, mitolojik doğruluk kaygısı yok) ama en yüksek **kimlik riski** — bu artık farklı bir oyun projesidir, "Lotophagoi" adı ve `docs/design/scenario.md`'nin tamamı anlamsızlaşır.
- **Kimlik etkisi:** **zayıflar/kaybolur.**

**Not:** bu ikisi arasında bir orta yol yok gibi görünüyor ama var — bir ada gerçekten Odysseia'dan (ör. Kiklop) gelip görsel/mekanik olarak jenerik bir "mağara challenger"a çok benzeyebilir. Fark niyet ve disiplindir: Seçenek A'da tema **önce** gelir, mekanik ona hizmet eder (Lotus Adası'nın yapıldığı gibi); Seçenek B'de mekanik **önce** gelir, tema sonradan giydirilir. İkisi görsel olarak benzer üretilebilir ama tasarım süreçleri ve kimlik iddiaları taban tabana zıt.

---

## 3. "Ayrı tasarımcı agent" pratikte ne demek

Sahip'in cümlesi iki farklı okumaya açık; ikisi de mevcut `.claude/agents/` mimarisiyle test edildi.

### Okuma 1 — tek `island-designer` rolü, ada başına farklı brief ile çağrılıyor

Yeni bir `.claude/agents/island-designer.md` eklenir. Bugünkü `game-designer`in çekirdek döngü sahipliğine benzer ama kapsamı **ada başına level-spec üretmek**tir: layout, tuzak/twist, o adaya özgü mekanik varyasyon (varsa), asset ihtiyaç listesi — `level-lotus-island.md` formatında bir çıktı, her ada için bir dosya (`level-circe-island.md`, `level-cyclops-island.md`, ...). `game-designer` çekirdek sistemleri (unutuş, gün saati, hedef sayısı gibi *tüm adalarda paylaşılan* kuralları) sahiplenmeye devam eder; `island-designer` bu paylaşılan kuralların üstüne her ada için **içerik** yazar — tıpkı bir ARPG'de "sistem tasarımcısı" ile "seviye tasarımcısı"nın ayrılması gibi.

- **Producer'ın routing tablosuna eklenmesi:** tek satır — `"Yeni ada level-spec / challenger tasarımı"` → `island-designer`. `game-designer` satırı ("Mechanics, tuning, balance, systems") değişmez; iki rol net ayrılır: biri *sistem*, biri *içerik*.
- **Maliyet:** düşük — bir agent dosyası, mevcut mimariye (tek kişilik prompt+checklist dosyaları) tam uyumlu.

### Okuma 2 — ada başına gerçekten farklı isimli agent'lar (`circe-designer`, `cyclops-designer`, ...)

Her adaya kendi adında bir agent. Bu, gerçek bir stüdyoda "her dungeon'ın kendi tasarımcısı var" hissini simüle eder ama bu proje **solo** ve `.claude/agents/`'daki her dosya bir sistem promptudur, gerçek bir kişi değil.

- **Neden önerilmiyor (ama seçenek olarak kayıtta):** N ada = N agent dosyası, hepsi neredeyse aynı checklist'i (kanon disiplini, tuning tutarlılığı, P1–P4 sütunları) tekrar eder. `game-designer.md`'nin var oluş sebebi tam olarak bunu önlemek — "tek doğruluk kaynağı" ilkesi (`tuning.md` ↔ `constants.ts`) N tane paralel tasarımcı ile korunması daha zor bir hedef olur; her yeni agent kendi `tuning.md` bölümünü kendi mantığıyla yazma riski taşır ve sürüklenme (drift) N kat artar.
- **Tek meşru gerekçesi:** eğer adalar gerçekten birbirinden **kökten farklı mekanikler** taşıyacaksa (ör. Sirenler adası "topla" fiilini değil "dinle/sustur" fiilini kullanıyorsa), o zaman o ada gerçekten ayrı bir mini-GDD'ye ve belki ayrı bir mekanik tasarımcı bakışına ihtiyaç duyar — ama bu bile `game-designer`in kapsamına eklenmiş bir görev olarak çözülebilir, ayrı bir agent dosyası şart değildir.

**Bu bölümün özeti:** iki okuma da uygulanabilir ama maliyet/fayda dengesi net biçimde Okuma 1'i (`island-designer`, tek rol N brief) destekliyor. Karar yine de sahip'e ait — "ayrı bir agent olsun" ifadesi hem "yeni bir rol açılsın" hem "her ada kendi adıyla bir rol olsun" olarak okunabildiği için burada açıkça sorulması gerekiyor.

---

## 4. Mevcut roadmap'e maliyet/etki

Roadmap (`docs/production/roadmap.md`) şu an **tek ada** varsayımıyla yazıldı. Çok-ada kararı aşağıdaki maddeleri doğrudan etkiliyor:

| Roadmap maddesi | Tek-ada varsayımı | Çok-ada etkisi |
|---|---|---|
| **Faz 2.6** — 28 çiçeğin elle yerleşimi | Bir kez yapılır, `islandLayout.ts` | Elle tasarlanmış küçük set seçilirse (bkz. §1.1), **her ada için tekrarlanır.** N=4 ada → ~4× bu işin maliyeti (ilk adanın kalıbı deneyim sağlar ama her ada yine de kendi krokisini, kendi bölge dengesini, kendi Lotophagoi-eşdeğeri NPC yerleşimini ister). Prosedürel seçilirse bu madde tamamen değişir: tek seferlik "üretici + kural seti" işine dönüşür, roadmap'te yeni bir faz gerektirir. |
| **Faz 5** — art asset yeniden kullanımı | Tek ada, tek biome (Ege kıyısı); doku tekrar sıklığı düşük risk | Sahip'in "challenger" vurgusu genelde **görsel çeşitlilik** ister (her dungeon kendi biome'u) — bu, K5'in zaten işaret ettiği "27 planned kalem tek ada için bile fazla" uyarısını **katlar.** Her yeni ada muhtemelen kendi palet/doku/silüet setini ister (Kiklop mağarası ≠ Sirenler kayalığı ≠ Lotus kumsalı), yani Faz 5'in "reuse bütçesi" varsayımı N ada ile geçersizleşir; art kapsamı ada sayısıyla birlikte planlanmalı. |
| **Unutuş sisteminin ada başına sıfırlanması** | Tanımsız — çünkü tek ada var | Kendisi başlı başına bir tasarım kararı, bkz. aşağıdaki alt başlık. |
| **`LOTUS_TARGET` = 12 ada başına mı toplamda mı** | Tanımsız — aynı sebep | Kendisi başlı başına bir tasarım kararı, bkz. aşağıdaki alt başlık. |

### 4.1 Unutuş ada başına mı sıfırlanıyor, koşu boyunca mı taşınıyor?

Bu, oyunun **çekirdek duygusal sistemini** doğrudan etkilediği için `game-designer`in koruma görevi kapsamında en kritik alt-karar.

- **Ada başına sıfırlanır:** her ada bugünkü Lotus Adası gibi kapalı bir döngüdür — girersin, unutuş 0'dan başlar, o adayı bitirir ya da kaybedersin, sonraki ada yine 0'dan başlar. Tasarım açısından **en az riskli**: mevcut `gdd-memory-system.md`'nin tamamı değişmeden her adaya kopyalanır. Ama roguelite/challenger hissini zayıflatır — adalar arası hiçbir bedel taşınmaz, "run" kavramı sadece bir menü sırasından ibaret kalır.
- **Koşu boyunca taşınır:** unutuş bir adadan diğerine devam eder (belki adalar arası kısmi bir iyileşme payı olur, gemiye/hub'a dönüşte). Bu, sahip'in "roguelite" imasıyla en çok örtüşen okuma ve tematik olarak güçlü (*"ne kadar ileri gidersen dönüşü o kadar unutursun"* — nostos temasının doğal uzantısı). Ama `gdd-memory-system.md`'nin **yeniden yazılmasını** gerektirir: eşikler, `MEM_GRACE`, kayıp finali hepsi "tek ada" varsayımıyla kalibre edilmiş; N ada üstünde nasıl davranacakları (özellikle "kayıp" bir adada mı olur, koşunun sonunda mı) ayrı bir tasarım turu ister.

### 4.2 `LOTUS_TARGET` = 12 ada başına mı, toplamda mı?

- **Ada başına 12:** her adanın kendi "12 gemi" ya da eşdeğer bir hedefi olur. Sorun: "12 gemi" doğrudan İlyada'nın Gemiler Kataloğu'na bağlı, **tek seferlik** bir mitolojik referans (`scenario.md` §1 "sahip'in iki destanı birlikte anması"). Bunu her adada birebir tekrarlamak (her adada da 12 hedef, 12 gemi) referansı zayıflatır — sahiden özel olan şey rutine döner.
- **Koşu toplamında 12 (ya da adalar arası paylaştırılmış farklı hedefler):** "12 gemi" tekliğini korur ama artık `LOTUS_TARGET`'ın hangi adada ne kadarının toplanacağı yeni bir dengeleme sorusu açar (ör. Lotus Adası'nda 5, Kiklop'ta 4, Sirenler'de 3 gibi) — bu da her adanın kendi "hedef sayısı" tasarımını gerektirir, `tuning.md` §3'ün genişlemesi demektir.

Her iki alt-karar da (unutuş taşınması + hedef dağılımı) birbirinden bağımsız değil: unutuş taşınıyorsa hedefin de koşu-toplamı olması daha tutarlı; unutuş sıfırlanıyorsa hedefin ada-başına olması daha tutarlı. Yani pratikte **iki ayrı soru değil, tek bir yapısal seçimin iki yüzü.**

---

## 5. Somut yapısal seçenekler

### Seçenek 1 — Çapa + Hub-and-spoke Odysseia antolojisi

Lotus Adası olduğu gibi kalır (ilk/öğretici ada). Diğer 2–4 durak (Kiklop, Aiolos, Sirenler gibi) elle tasarlanır, her biri **kendi içinde kapalı bir döngü** (unutuş ada başına sıfırlanır, hedef ada başına tanımlanır). Bir hub ekranından (gemi güvertesi/harita) ada seçilir.

- **Kapsam:** yüksek — her ada, Lotus Adası'nın bugün aldığı emeğin (GDD + level-spec + art paketi) büyük kısmını tekrar ister. N=3 ekstra ada ≈ mevcut projenin 3 katı tasarım+art işi.
- **Risk:** düşük tasarım riski (mevcut sistemler değişmeden kopyalanır), yüksek **kapsam/zaman** riski.
- **Kimlik etkisi:** en güçlü — Odysseia antolojisi olarak netleşir, "Lotophagoi" adı ilk bölüm için anlamlı kalır (belki oyun adı bir üst-başlığa evrilir, "Lotophagoi" ilk adanın adı olur).

### Seçenek 2 — Roguelite run, hafif/prosedürel challenger biome'lar

Oturum N kısa (2–3 dk) adadan oluşan tek bir "run"a dönüşür; adalar paylaşılan bir şablon havuzundan (resif, mağara, uçurum gibi jenerik kit'ler) hafifçe prosedürel biçimde kurulur. Unutuş koşu boyunca taşınır — run'ın kendi gerilim eğrisi budur. Odysseia bağı ince bir flavor katmanına iner ya da tamamen kalkar.

- **Kapsam:** başlangıçta yüksek (prosedürel sistem + şablon kit'leri kurmak, kendi başına bir teknik proje), sonrasında ada eklemek ucuz.
- **Risk:** en yüksek — hem `gdd-memory-system.md`'nin çekirdek varsayımlarının (tek ada, sabit eşikler, tek kayıp finali) yeniden tasarlanmasını gerektirir, hem de solo bir projede prosedürel içerik üretici kurmanın kendi mühendislik riski var.
- **Kimlik etkisi:** en zayıf — proje "Odyssey IX adaptation"dan "roguelite koleksiyon oyunu"na kayar; `CLAUDE.md`, `scenario.md`, oyun adının tamamının yeniden değerlendirilmesi gerekir.

### Seçenek 3 — Küçük elle-tasarlanmış antoloji, hub'sız, tek kesintisiz koşu, unutuş taşınıyor

3–4 Odysseia durağı (Lotus dahil) elle tasarlanır ama hub'a dönülmez — oyuncu tek oturumda art arda geçer (Lotus → Kiklop'tan kaçış → Aiolos'un tulumu cazibesi → ...), unutuş **koşu boyunca taşınır** (adalar arası kısmi iyileşme payı olabilir — ör. gemiye dönüşte bir miktar geri kazanım, tam sıfırlama değil). Tek büyük hedef, adalar arası paylaştırılır. Oturum süresi 5–10 dk'dan ~20–30 dk'ya büyür.

- **Kapsam:** orta — N sınırlı tutulduğu için (3–4, N=10 değil) Seçenek 1'den daha ucuz ama yine de doğrusal büyüyen bir maliyet.
- **Risk:** orta — `gdd-memory-system.md`'nin adalar-arası taşınma mekaniği için genişletilmesi gerekir (yeni ama sınırlı bir tasarım işi: "adalar arası ne kadarı taşınır, ne kadarı affedilir"), ancak sistemin **şekli** (yükselen baskı, gerçek bir bedel, geri dönüş yolu) korunur — sadece tek-ada ölçeğinden çok-ada ölçeğine büyür.
- **Kimlik etkisi:** güçlenir, hatta **tematik olarak Seçenek 1'den daha güçlü olabilir** — "ne kadar ileri gidersen dönüşü o kadar unutursun" cümlesi tam olarak Odysseus'un dokuz yıllık nostos'unun kendisi. Ama oturum tanımını (`game-concept.md` §2 "5–10 dakika") kökten değiştirir; bu ayrı bir sahip onayı gerektirir.

### Öneri

**Seçenek 3'e eğilimliyim** — kimlik açısından en tutarlı (unutmanın kendisi bir yolculuk boyunca büyüyor, bu Homeros'un anlattığı şeyin ta kendisi), kapsamı N'i küçük tutarak (3–4 durak, N=10'a açık uçlu bir "dungeon havuzu" değil) yönetilebilir kılıyor ve mevcut unutuş sisteminin **şeklini bozmuyor, büyütüyor.** Seçenek 1 daha güvenli ama "challenger" hissini zayıf verir (her ada birbirinden kopuk, bugünkünün 3 kopyası gibi hissedebilir). Seçenek 2 sahip'in "arpg'de dungeonlar gibi" benzetmesine en çok benzeyen ama en pahalı ve kimlik açısından en riskli seçenek.

**Bu benim önerim — karar sahip'e ait.** Üç seçenek de uygulanabilir; hangisi seçilirse Faz 1 (roadmap K2, ölçek kararı) o seçeneğe göre yeniden çerçevelenmeli, çünkü "tek gerçek ada" ölçek kararı artık "gerçek ada profili N kere nasıl örneklenecek" kararına dönüşüyor.

> ### 🔒 Kapanan karar — M7
>
> **Karar: Seçenek 3 — sahip, 2026-08-14.** Küçük elle-tasarlanmış antoloji (3–4 Odysseia durağı, Lotus dahil), **hub yok**, tek kesintisiz koşu, **unutuş adalar arası taşınıyor.**
>
> Seçenek 1 (çapa + hub-and-spoke) ve Seçenek 2 (roguelite/prosedürel) **seçilmedi.** Kayıtta kalıyorlar (yukarıdaki tablo silinmedi) çünkü gerekçeleri ileride başka bir kapsam kararında referans olabilir, ama **bu proje için artık geçerli değiller.**
>
> M1–M6, bu kararın **doğal sonucu** olarak §6'da tek tek çözüldü — artık açık soru değiller.
>
> **⚠️ Kısmen tersine çevrildi (2026-08-14, aynı gün) — bkz. §9.** Sahip yalnızca "hub yok" alt-maddesini reddetti: **gerçek bir hub var, oyuncu durağı seçebiliyor.** M1 (elle tasarlanmış set), M3 (3 durak, Odysseia antolojisi), M6 (`island-designer` agent'ı) **değişmedi.** M2 ("tek kesintisiz koşu") ve M4 ("unutuş taşınıyor") satır olarak burada hâlâ duruyor ama artık **hub bağlamında yeniden okunmalı** — §9 bunu seçenek sunmadan çözüyor.

---

## 6. M1–M6 çözümü (Seçenek 3'ün sonucu olarak)

M7 kapandığına göre aşağıdaki altı soru artık seçenek sunmuyor; Seçenek 3'ün ne anlama geldiğini somutlaştırıyor. Bunların hiçbiri henüz `gdd-memory-system.md` / `tuning.md` / `game-concept.md` / `level-lotus-island.md` içine **yazılmadı** — burada varılan sonuçlar bir sonraki uygulama turunun girdisidir.

### M1 — Üretim biçimi: kapandı

**Elle tasarlanmış küçük set.** Seçenek 3'ün tanımının kendisi bunu zaten seçiyor — 3–4 durak, hepsi `level-lotus-island.md` formatında elle krokilenecek. Prosedürel üretim gündemden düştü; §1.1'deki karşılaştırma artık sadece kayıt amaçlı.

### M2 — Oturum yapısı: kapandı, ama bağımlı bir onay daha gerekiyor

**Hub yok, tek kesintisiz koşu.** Oyuncu Lotus Adası'nı bitirir bitirmez (gemiye biner, "AYRILIŞ" yerine bir sonraki durağa geçiş) ikinci durağa geçer; ana menüye/harita ekranına dönülmez.

**Bağımlı onay — ayrıca sorulmalı:** `game-concept.md` §2'deki *"Hedef oturum 5–10 dakika"* cümlesi artık **tek adayı** değil **koşunun tamamını** mı tanımlıyor? 3–4 durak, her biri bugünkü Lotus Adası ölçeğinde olursa toplam süre kabaca **20–30 dakikaya** çıkar (durak başına ~5–8 dk, geçiş anları dahil). Bu, `game-concept.md`'nin "Kapsam: Küçük... tek gün" ve "Tekrar oynanış" bölümlerini de etkiler. **Bu doküman bu değişikliği önermiyor, sadece M7'nin sessiz bir sonucu olduğunu işaretliyor** — sahip'in `game-concept.md` §2'yi ayrıca onaylaması/güncellemesi gerekiyor; bu görev kapsamında o dosyaya dokunulmadı.

### M3 — Kimlik: Odysseia antolojisi, önerilen 3–4 durak

**Seçenek A kapandı** (§2) — proje bir Odysseia antolojisi olarak genişliyor, jenerik challenger biome fikri (Seçenek B) elenmiş sayılır.

**Tasarım ilkesi:** P1 sütunu ("tek mekanik, iki yön") *tüm koşu* boyunca korunmalı — tek kaynak (**unutuş**), tek omurga fiil (**topla → taşı → teslim et**). Her yeni durak bu ortak omurgaya kendi **yerel twist**'ini ekler; unutuşun yerini almaz, ona yeni bir kaynak/vana ekler ya da yanına yeni bir yerel tehlike koyar. Bu, hem P1'i korur hem de adaları birbirinden ayırt edilir kılar.

Önerilen sıralama (Lotus + 3, dördüncüsü opsiyonel):

| # | Durak | Kaynak (Homeros) | Yerel twist (tek cümle) | Kod yeniden-kullanım riski |
|---|---|---|---|---|
| 1 | **Lotus Adası** (mevcut, çapa/öğretici) | Odysseia IX.82–104 | Topla → unutuş yükselir (koku, taşıma); deniz/gemi düşürür. | — (zaten var) |
| 2 | **Kiklop Mağarası** | Odysseia IX.105–566 (Polyphemos) | **Algılanma riski:** ışıkta/gürültülü hareket etmek yakalanma ihtimalini yükseltir (yakalanırsa sert ceza — taşınanın kaybı + unutuş sıçraması); gölgede durgun kalmak güvenlidir ama zaman (=unutuş) yer. "Acele et vs. yavaşla" kıskacının yeni bir yüzü. | Orta — yeni bir "algı" tespiti sistemi gerekir |
| 3 | **Sirenler Geçidi** | Odysseia XII.165–200 | **Cazibe/sürüklenme:** şarkıya yaklaştıkça yürüyüş/dümen sapması artar (mevcut `DRIFT_MAX_ANGLE`/`DRIFT_PERIOD` mekaniğinin doğrudan yeniden kullanımı); uzaklaşmak ya da daha önce toplanmış bir "kulak tıkacı" eşyası bunu söndürür. | **En düşük** — kod zaten var (eşik 3 sapması), sadece tetikleyici değişiyor |
| 4 *(opsiyonel)* | **Kirke Adası** | Odysseia X.135–574 | **Dönüşüm riski:** tayfa domuza dönüşüyor; oyuncu "moly" otu toplayıp arkadaşına götürerek kurtarıyor — "topla → teslim et" döngüsünün neredeyse birebir reskin'i (hedef gemi değil, dönüşmüş tayfa). | **En düşük tasarım riski, en düşük çeşitlilik hissi** — bu yüzden 3. zorunlu değil, 4. opsiyonel durak |

**Not:** Sirenler en ucuz (mevcut sapma kodunu doğrudan yeniden kullanır), Kirke tasarım açısından en ucuz ama en az "yeni" hissettiren, Kiklop en özgün ama yeni bir tespit sistemi ister. Üç zorunlu durak seçilecekse (Lotus + Kiklop + Sirenler) kapsam kontrollü kalır; Kirke eklenmek istenirse dördüncü durak olarak düşük risk/düşük getiri bir "dolgu" rolü oynar — **hangi 3 ya da 4'ün seçileceği hâlâ sahip'in kararı**, bu sadece bir öneri sırası.

### M4 — Unutuş taşınması: koşu boyunca taşınıyor, kısmi iyileşme payıyla

**Somut öneri:**

- Yeni sabit: **`MEM_ISLAND_RELIEF_PCT`** (0–1 arası float, 🔬 playtest'e ertelenmiş öneri değer: `0.4`). `tuning.md` §5.2'ye (azalışlar) komşu bir bölüm olarak eklenmeli — tek seferlik, ada geçişinde uygulanan bir azalış.
- **Formül:** bir durağı başarıyla bitirip (AYRILIŞ) bir sonrakine geçerken:
  `unutuş_yeni_ada_başlangıcı = unutuş_önceki_ada_bitişi × (1 − MEM_ISLAND_RELIEF_PCT)`
- **Örnek (`MEM_ISLAND_RELIEF_PCT = 0.4`):** Lotus Adası'nı unutuş 20 ile bitiren oyuncu Kiklop'a 12 ile başlar (temiz bitiş = gerçek avantaj). Lotus'u unutuş 90 ile (kıl payı) bitiren oyuncu Kiklop'a 54 ile başlar — zaten baskı altında, ikinci durak çok daha az tolerans veriyor.
- **Neden tam sıfırlama değil, tam taşıma da değil:** tam sıfırlama (`= 1.0`) adalar-arası bedeli tamamen siler, koşu kavramı sadece bir menü sırası olur (Seçenek 1'in hissi). Tam taşıma (`= 0.0`) sonraki adaları orantısız cezalandırır, temiz bitiren oyuncuyla kıl payı bitiren oyuncu arasında hiçbir fark kalmaz. `0.4` ortası — kesin değer diğer playtest'e ertelenen değerler gibi (`MEM_SEA_RECOVER`, `HUD_VAGUE_COUNTER`) ölçülmeli, bu yüzden 🔬 işaretli önerdim.
- **`MEM_START` semantiği değişir:** `MEM_START = 0` artık yalnızca **ilk durak** (Lotus Adası) için geçerli. Sonraki durakların başlangıç değeri yukarıdaki formülden türetilir — `gdd-memory-system.md` §3.1 madde 1'in bir istisnası olarak dokümante edilmeli.
- **Örtük ama önemli sonuç — açıkça flag'liyorum:** Seçenek 3 "hub yok, tek kesintisiz koşu" olduğu için **kayıp finali artık ada bazlı değil, koşu bazlı.** Bir durakta unutuş `MEM_MAX`'a ulaşıp `MEM_GRACE` dolarsa, tüm koşu biter — sadece o durak değil. Bu, mevcut `gdd-memory-system.md`'nin tek-ada varsayımından sessiz ama doğrudan bir sapma; görev metninde ayrıca sorulmadı ama Seçenek 3'ün kaçınılmaz sonucu olduğu için gizlenmemeli — sahip bunu bilerek onaylamalı.

### M5 — `LOTUS_TARGET` dağılımı: koşu-toplamında 12, adalar arası paylaştırılmış

**Somut öneri:**

- `LOTUS_TARGET` (tek-ada kavramı) yerini iki katmanlı bir hedefe bırakır: **`RUN_TARGET_TOTAL = 12`** (koşu boyunca sabit — "12 gemi" anlatısı hâlâ tek ve bütün kalıyor) + her durağın kendi alt-hedefi.
- **Örnek dağılım (3 duraklı koşu — Lotus + Kiklop + Sirenler):**

  | Durak | Alt-hedef | Gerekçe |
  |---|---|---|
  | Lotus Adası | 5 | En uzun/öğretici durak; mekanik ağırlığıyla da "çapa" rolünü sürdürür |
  | Kiklop Mağarası | 4 | Orta uzunluk, yeni mekanik öğrenme süresi payı |
  | Sirenler Geçidi | 3 | En kısa/en yoğun durak — geçiş odaklı, toplama ikincil |
  | **Toplam** | **12** | `RUN_TARGET_TOTAL` ile eşleşir |

  4. durak (Kirke) eklenirse örnek bölüşüm `4+3+3+2` ya da `3+3+3+3` olabilir — kesin sayı, tıpkı `LOTUS_TOTAL`/`STAGE_RIPE` gibi, ada uzunlukları netleşince playtest'e ertelenmeli.
- **`tuning.md` §3'e eklenecek olan:** her durak için kendi `_TARGET` (alt-hedef) ve `_TOTAL` (o duraktaki toplanabilir öğe sayısı, lotus olması şart değil — Kiklop'ta koyun/eşya, Sirenler'de farklı bir toplanabilir olabilir) sabitleri. `CARRY_CAPACITY` (4) muhtemelen **tüm adalarda aynı kalmalı** — P1 sütununun tutarlılığı ve oyuncunun öğrendiği "4'lük ritmin" korunması için; farklı kapasiteler her durağı yeniden öğrenilmesi gereken bir sistem yapar.

### M6 — Agent mimarisi: `island-designer` (Okuma 1) uygulandı

**Kapandı — Okuma 1 seçildi** (§3): tek `island-designer` rolü, ada başına farklı brief ile çağrılıyor; ada başına ayrı adlandırılmış agent (Okuma 2) açılmadı.

- **Yeni dosya:** `.claude/agents/island-designer.md` oluşturuldu — kapsamı: bir durağın level-spec'ini (`level-<ada-adı>.md`, `level-lotus-island.md` formatında) üretmek; paylaşılan sistemlere (unutuş, gün saati, `RUN_TARGET_TOTAL`) dokunmaz, onları `game-designer`e bırakır.
- **`producer.md` routing tablosuna eklenen satır:** "Yeni ada level-spec'i (Odysseia durağı — layout, twist, asset ihtiyacı)" → `island-designer`.
- `game-designer`'ın kendi dosyası (`.claude/agents/game-designer.md`) **değiştirilmedi** — kapsamı hâlâ paylaşılan sistemler (unutuş, gün saati, koşu-toplamı hedef); yeni rolle çakışmıyor, tamamlıyor.

---

## 7. Kapanış — dört bağımlı onay (K27–K29) ve gerçek dokümanlara yazılması

Sahip, M7'nin ardından bu dokümanın örtük sonuçlarını da açıkça onayladı (14 Ağu 2026):

1. **Koşu-bazlı kayıp onaylandı** — bir durakta unutuş dolarsa tüm koşu biter, ada bazlı checkpoint yok (M4'ün örtük sonucu).
2. **Oturum süresi ~20–30 dk'ya genişledi** (M2'nin bağımlı onayı).
3. **3 durak ile başlanıyor**: Lotus Adası + Kiklop Mağarası + Sirenler Geçidi. **Kirke Adası şimdilik kapsam dışı** (M3'ün 4. opsiyonel durağı, ileride eklenebilir).
4. Bu kararlar **gerçek tasarım dokümanlarına yazıldı** — artık bir karar dokümanı önerisi değil, çalışan tasarımın bir parçası:

| Dosya | Ne eklendi |
|---|---|
| `gdd-memory-system.md` | §3.1 madde 1 (`MEM_START` istisnası) ve madde 9 (koşu-bazlı kayıp), yeni §3.5 (adalar arası taşıma formülü), §4.4 güncellemesi, playtest tablosuna `MEM_ISLAND_RELIEF_PCT` |
| `tuning.md` | Yeni §3.0 (`RUN_TARGET_TOTAL`, durak alt-hedefleri), §5'e `MEM_ISLAND_RELIEF_PCT` (🔬 0.4) ve `MEM_START` notu, §10 kapanan kararlar, yeni §11.4 |
| `game-concept.md` | §2 (Tür/Hedef oturum/Kapsam satırları güncellendi), §7 (P3 karşı-sütunundaki "ikinci ada YOK" satırı geçersiz kılındı), Kapanan kararlar tablosuna yeni satır |
| `level-lotus-island.md` | Üstbilgiye çoklu-ada notu (1. durak, hedef 12→5) |
| `docs/production/roadmap.md` | K2/K3'e ek notlar, yeni K27/K28/K29 (kapandı), Faz 2.6'ya 2.6b/2.6c/2.6d satırları + genişleyen oturum tahmini |
| `.claude/agents/island-designer.md` | Yeni dosya (M6 sonucu) |
| `.claude/agents/producer.md` | Routing tablosuna yeni satır |

**Bilerek dokunulmayan iki dosya:** `CLAUDE.md` ve `.cursor/rules/project.mdc`. Gerekçe ve önerilen minimal değişiklik için bkz. bir sonraki bölüm.

---

## 8. Kapanış notu — `CLAUDE.md` ve `.cursor/rules/project.mdc` bilerek güncellenmedi

**Bu iki dosya proje kimliği/konfigürasyonunun özel korumalı dosyaları** — bir ajan mesajı (bu görevi ileten koordinatör dahil) bunları değiştirmeye yetki veremez; değişiklik ya izin sistemi üzerinden ya da sahip'in kendisinin doğrudan onayıyla gelmeli. Görev talimatı bu iki dosyanın da güncellenmesini istedi ve gerekçesi (proje kimliğinin artık 3 duraklı bir antoloji olduğu) burada doğru — ama bu görev kapsamında **bilerek atlandı.**

**Sahip isterse önerilen minimal değişiklik** (uygulaması sahip'in kendi onayıyla, ayrı bir adımda; **§9'daki hub reversal'ı yansıtacak şekilde güncellendi**):

- `CLAUDE.md` "What this is" paragrafının sonuna 1–2 cümle: *"Lotus Adası artık tek başına bir oyun değil — 3 duraklı bir Odysseia antolojisinin ilk/çapa durağı (Kiklop Mağarası, Sirenler Geçidi izliyor); duraklar bir hub'dan (gemi güvertesi/harita) serbest sırayla seçilir. Bkz. `docs/design/multi-island-concept.md`."*
- `.cursor/rules/project.mdc`'ye CLAUDE.md'nin kendi notu gereği ("keep the two in sync") aynı cümle senkron olarak eklenmeli.
- Bunun ötesinde (Source layout, Gameplay code standards, Design authority bölümleri vb.) **değişmesi gerekmiyor** — bu iki dosya sistem mimarisini tarif ediyor, o hâlâ aynı.

---

## 9. Hub'a dönüş — 2026-08-14

Sahip'in kararı: *"Gerçek hub — oyuncu durak seçebiliyor."* M7'nin kapalı olan **hub yok** alt-maddesi bununla geçersiz kılındı. M7'nin geri kalanı (elle tasarlanmış 3 durak — M1, Odysseia antolojisi kimliği — M3, `island-designer` agent mimarisi — M6) **yeniden açılmadı**; sahip yalnızca hub sorusunu cevapladı. Bu bölüm, hub'ın M2 ("tek kesintisiz koşu") ve M4 ("unutuş taşınıyor")'e ne yaptığını **seçenek sunmadan** çözüyor — artık bir strateji kararı değil, kapanmış bir stratejinin **uygulama detayı.**

### 9.1 Hub'ın somut tanımı

**Hub = gemi güvertesi/harita ekranı, hafif bir seçim arayüzü — dördüncü bir oynanabilir alan değil.** Oyuncu buradan üç duraktan birini seçer (Lotus Adası, Kiklop Mağarası, Sirenler Geçidi), o durağa girer, durağı bağımsız bir oturum olarak oynar (kendi `DAY_LENGTH`'i, kendi yerel tehlikesi), biter (başarı ya da başarısızlık), hub'a döner. **Sıra serbest** — üç kapıdan hangisi önce açılır sahip'in/oyuncunun tercihidir, koddaki hiçbir kural sırayı dayatmaz.

**Hub'da zaman donar.** Seçim ekranındayken ne gün saati ilerler, ne lotus olgunlaşır, ne unutuş değişir — tıpkı Esc duraklatmasında olduğu gibi (`gdd-memory-system.md` §5 "Duraklat gerçek duraklatmadır"). Bu, hem tasarım tutarlılığı hem §9.4'teki oturum-süresi bütçesini korumak için kasıtlı bir kısıtlama.

**Not — bu bölümdeki "sıra serbest" ifadesi, `ux-designer`'ın `docs/ux/screens.md` §3.3'te sorduğu "hub'daki 3 durağın kilidi A (baştan hepsi açık) mı, B (sıralı kilit) mi, C (hibrit) mi açılır" sorusunu kapatmıyor** — o hâlâ sahip'in kararı (bkz. `ux/screens.md` S2). §9.2/§9.3'teki mekanik sonuçlar (unutuş taşıma formülü, `RUN_TARGET_TOTAL`'ın sabit alt-hedefleri) üç seçenekten hangisi seçilirse seçilsin **aynı çalışır** — burada "serbest" sözü sadece "duraklar arasında zorunlu bir tek doğrusal sıra yoktur" anlamındadır, A/B/C'nin hangisi olacağına dair bir tercih değildir.

### 9.2 Unutuş + hub — M4'ün güncellenmesi (kapandı)

**Sonuç: unutuş hub'da sıfırlanmaz, koşu boyunca taşınmaya devam eder. `MEM_ISLAND_RELIEF_PCT` aynı formülle, tetik noktası "adalar arası doğrudan geçiş" yerine "hub'a dönüş" olarak yeniden okunur.**

**Neden tam sıfırlama değil (hub varken bile):** hub bir menü olsa da, unutuş tam sıfırlanırsa hub bir **kaçış valfine** dönüşür — oyuncu bir durakta ürkünce hub'a dönüp bedelsiz sıfırlanır, tekrar dener. Bu, hub eklenmeden önce var olmayan yeni bir açık; unutuşun P2 sütunundaki "gerçek bir bedel" ilkesini hub'sız haldeki halinden bile daha fazla zayıflatır. Reddedildi.

**Neden tam taşıma da değil:** orijinal M4'ün gerekçesi (kıl payı biten oyuncuyu orantısız cezalandırmamak) hub ile de geçerli — belki daha fazla, çünkü hub artık oyuncuya "önce hangi durağa gideyim" kararını da veriyor; art arda iki zor durağa peş peşe dolu unutuşla girmek bu kararı anlamsızlaştırır.

**Uygulama — tek kural, iki dal:**

- **Bir durak başarıyla bitirilip** (o durağın kendi "AYRILIŞ"ı — Lotus'ta dümende E, Kiklop/Sirenler'de eşdeğeri) **hub'a dönüldüğünde:** `MEM_ISLAND_RELIEF_PCT` (öneri 🔬 `0.4`, değişmedi) uygulanır — aynı formül: `unutuş_hub_dönüşü = unutuş_durak_bitişi × (1 − MEM_ISLAND_RELIEF_PCT)`. Gerekçe daha da güçlendi: hub'ın kendisi artık gemi güvertesidir — `MEM_SHIP_AURA`'nın zaten kurduğu "gemi = ev = rahatlama" dilini birebir taşıyor, icat edilmiş yeni bir kural değil.
- **Bir durak bitirilemeden** (gün batımı sub-hedefi karşılamadan doldu **veya** `MEM_GRACE` tükendi) **hub'a dönüldüğünde:** **hiçbir bağışlama uygulanmaz.** Oyuncu hangi unutuş değeriyle o anda oradaysa (muhtemelen `MEM_MAX`'a yakın) o değerle hub'a taşınır. Bu, tek bir formülle (aynı taşıma kuralı, sadece "başarılı mı" bayrağı) hem başarıyı ödüllendirir hem başarısızlığı cezalandırır — yeni bir "can/deneme" sistemi icat etmeye gerek kalmaz (P1'in "tek kaynak" ilkesiyle uyumlu).

**Sonuç olarak korunan şey:** "ne kadar ileri gidersen dönüşü o kadar unutursun" hissi hâlâ ayakta — artık *durak sırası* değil, *kaç kez temiz bitirdiğin vs. kaç kez zorlandığın* bunu taşıyor. Bu, serbest sıralı bir hub ile aslında daha doğru bir okuma: doğrusal "ilerleme" yerine "birikmiş yorgunluk".

### 9.3 `RUN_TARGET_TOTAL` + hub — M5'in güncellenmesi (kapandı)

**Sonuç: `RUN_TARGET_TOTAL = 12` ve durak başına sabit alt-hedef modeli (Lotus 5 / Kiklop 4 / Sirenler 3, öneri) aynen geçerli. Hub bunu "istediğin sırada oyna, 12'ye ne zaman ulaşırsan ulaş" gibi gevşek bir ortak havuza çevirmiyor.**

**Gerekçe:** her durağın toplanabilir öğesi diegetik olarak o durağa kilitli — Lotus'ta lotus, Kiklop'ta koyun/eşya (`CYCLOPS_ISLAND_TARGET`), Sirenler'de kendi toplanabilir eşyası. Oyuncu fiziksel olarak bir durakta fazla toplayıp diğerini atlayamaz; "esnek havuz" fikri zaten kurgu düzeyinde mümkün değil. Hub sadece **sırayı** serbest bırakıyor, **hangi duraklar zorunlu**yu değil — kazanmak (koşunun AYRILIŞ'ı) hâlâ üç durağın **hepsinin** kendi alt-hedefini tamamlamasını gerektirir, hangi sırayla olursa olsun.

**Hub'ın kattığı yeni bir şey:** üç durağın alt-hedefleri artık ayrı ayrı takip edilebilir ve hub ekranında **toplu ilerleme** gösterilebilir (ör. "Lotus 5/5 ⚓ · Kiklop 2/4 · Sirenler 0/3") — bu, `RUN_TARGET_TOTAL`'ın okunabilirliğini hub'sız haline göre **güçlendiriyor**, zayıflatmıyor. Tamamlanmış bir durağın hub'da tekrar seçilebilir olması gerekmez (fazladan ödül yok) — seçim ekranında pasif/işaretli gösterilebilir; bu bir UX detayı, `ux-designer`'ın işi.

### 9.4 Oturum süresi (K28) + hub — güncellendi, sayı değişmedi

**Sonuç: ~20–30 dakikalık toplam oturum hedefi hâlâ geçerli. Hub'da gezinme süresi bu bütçeye dahil değil çünkü §9.1'in kısıtlaması gereği ihmal edilebilir düzeyde tutulmalı.**

Hub bir seviye-seçim ekranı gibi tasarlanırsa (birkaç saniyelik gezinme, oynanan bir alan değil) toplam süre hâlâ ~3 durak × ~5–10 dk = ~20–30 dk civarında kalır. Hub'ı **büyük, keşfedilebilir bir dördüncü alan** olarak tasarlamak (yürünen bir güverte, aranacak bir harita odası) bu bütçeyi sessizce şişirir — bu, kapsamı hâlâ küçük tutma ilkesiyle (M1, "3–4 durak, N=10 değil") çelişir. **Tasarım kısıtı, açıkça flag'liyorum:** hub'ın kendisi ayrı bir level-spec/asset paketi istememeli; bir DOM/2D overlay ya da minimal statik bir 3D sahne (ör. güvertede durup önündeki üç işaretten birini seçmek) yeterli. Bu, `ux-designer`/`gameplay-programmer` için bir kapsam sınırı notu, kesin uygulama onların işi.

### 9.5 Yeniden açılan ama kapanmayan soru — koşu-bazlı kayıp (K27)

**Bu bölüm bir karar değil, bir flag.** Görev kapsamı yalnızca §9.2–9.4'ü (unutuş taşıma, `RUN_TARGET_TOTAL`, oturum süresi) sormuştu; K27 açıkça sorulmadı. Ama K27'nin kendi gerekçesi `gdd-memory-system.md` §3.1 madde 9'da şöyle yazıyor: *"Bu, hub'sız/tek-kesintisiz-koşu kararının doğrudan sonucudur."* Hub artık var olduğuna göre bu gerekçe **artık geçerli değil** — sessizce bırakılırsa `gdd-memory-system.md` kendi içinde çelişkili bir doküman olur (CLAUDE.md'nin yasakladığı türden bir sürüklenme). Bunu görmezden gelmiyorum ama kapatmıyorum da; sahip'in ayrıca onayı gerekiyor.

**Gerilim:** K27 şu an "bir durakta unutuş dolarsa **tüm koşu** biter" diyor — hub'sız, tek şanslı bir yapı için mantıklıydı. Hub varken bu tutarsız görünüyor: oyuncuya durak sırasını seçme özgürlüğü veren bir yapı, neden tek bir kötü durağı **tüm koşuyu bitiren** bir olay yapsın? Bir ARPG'de bir dungeon'ı kaybetmek genelde oyunu bitirmez, seni hub'a geri atar.

**Önerim (kapatılmadı, sahip onayı gerekiyor):** bir durakta kayıp (gün batımı sub-hedef karşılanmadan dolar **veya** `MEM_GRACE` tükenir) **artık tüm koşuyu bitirmiyor** — oyuncu hub'a döner (§9.2'nin "başarısız dönüş" dalı: bağışlama yok, yüksek unutuşla taşınır) ve istediği durağı (aynısını ya da başka birini) tekrar deneyebilir. Bu, hub'ın var oluş sebebiyle (deneme/tekrar özgürlüğü) tutarlı ve yeni bir "can/deneme sayacı" icat etmeden, sadece mevcut unutuş-taşıma kuralının (§9.2) doğal bir sonucu olarak çalışır.

**Bunun açtığı takip sorusu (henüz cevapsız, burada sadece kayıtta):** eğer hiçbir tek durak kaybı koşuyu bitirmiyorsa, koşuyu **hiçbir zaman** bitiren bir başarısızlık hali kalmıyor demektir — tekrar tekrar denenebilir, sadece her seferinde unutuş biraz daha yüksek başlar (§9.2 formülünün doğal yorgunluk birikimi). Bu ya kabul edilebilir bir "yumuşak zorluk eğrisi" (yeni sistem gerektirmez, ama `scenario.md` §5.3'ün "iki uç, temiz" ilkesini ve UNUTULMA finalinin ne zaman tetikleneceğini yeniden düşünmeyi gerektirir) ya da sınırlı deneme hakkı gibi yeni, küçük bir sistem ister (kapsam artışı, şu an önerilmiyor). **Bu ikinci soru da kapanmadı — sadece görünür kılındı.**

**Dokunulmayan yer:** `gdd-memory-system.md` §3.1 madde 9 ve §4.4'teki mevcut "koşu bazlı kayıp" metni **silinmedi**, sadece bu bölüme işaret eden bir flag eklendi (bkz. o dosyadaki güncellemeler) — çünkü bu görev K27'yi kapatmaya yetkili değildi, sadece görünür kılmaya.

### 9.6 Değişen dosyalar (bu tur)

| Dosya | Ne değişti |
|---|---|
| `multi-island-concept.md` | Bu §9 + üstbilgi/M7 kutusuna hub-reversal notu + §8'deki önerilen CLAUDE.md cümlesinin güncellenmesi |
| `gdd-memory-system.md` | §3.1 madde 1/9, §3.5, §4.4 — hub bağlamına taşındı, madde 9'a K27 flag'i eklendi |
| `tuning.md` | §3.0, §5 başlığı, §5.2 `MEM_ISLAND_RELIEF_PCT` açıklaması, §10 kapanan kararlar, §11.4 |
| `game-concept.md` | §2 (Tür/Kapsam satırları), Kapanan kararlar tablosundaki "hub'sız" iddiası düzeltildi |
| `docs/production/roadmap.md` | K2/K27–K29 satırlarına ek not, §1.1/§1.4a'daki "hub'sız" iddiaları düzeltildi |
