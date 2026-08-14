# AI Pipeline ile Geliştirilen Oyunlar — Araştırma Raporu

**Tarih:** 14 Ağustos 2026
**Konu:** @zeuuss_01'in "solo game studio" makalesindeki yöntem ve aynı yöntemle yapılmış oyunlar
**Amaç:** Glowsprig (Vite + TypeScript + Canvas) projesi için uygulanabilir ders çıkarmak

> **Doğruluk notu:** Bu raporda geçen her link 14 Ağustos 2026'da HTTP kontrolünden geçirildi.
> Emin olunmayan her bilgi açıkça **[doğrulanmadı]** olarak işaretlendi. Ayrıntılı kısıtlar
> raporun sonundaki "Doğrulama sınırları" bölümünde.

---

## 1. Makalenin yöntemi (tam metin okundu)

**Makale:** "How to Run a Game Studio Solo with Claude Code + Higgsfield MCP"
**Yazar:** ZEUS⚡️ (@zeuuss_01), profilde "CereBree" etiketi var
**Tarih:** 5 Ağustos 2026
**Link:** [^1]

> **Önemli:** Makalenin bağlı olduğu tanıtım postu X'te **"Paid partnership"** (ücretli iş birliği)
> olarak işaretli. Yani bu bir bağımsız değerlendirme değil, Higgsfield sponsorluğunda yazılmış bir
> playbook. Sayılara ve iddialara buna göre bakmak gerek.

### 1.1 Üç katmanlı yığın

Makale her işin aynı üç katmandan geçtiğini söylüyor. İnsan sadece **başa** ve **sona** dokunuyor;
ağır orta kısmı modeller yapıyor.

| Katman | Araç | Ne üretiyor |
|---|---|---|
| 1. Tasarım motoru | **Opus 5 / Fable 5** | Pitch, shot list, trailer beat sheet, art direction, sistem tasarımı |
| 2. Build motoru | **Claude Code** | Gerçek oyun kodu: mekanikler, kontroller, UI/HUD, state, deploy |
| 3. Medya motoru | **Higgsfield MCP** | Trailer, key art, karakter turnaround, sinematik plan, sosyal cutdown |

Higgsfield MCP tek bir connector URL'i ile bağlanıyor (`https://mcp.higgsfield.ai/mcp`), OAuth ile
giriş, API key yönetimi yok. Bu tek bağlantı **30+ modeli** açıyor — makalede sayılanlar arasında
Sora 2, Veo 3.1, Kling 3.0, Seedance var. Ham üretimin ötesinde: referans klibi hazır prompt'a
çevirme, uzun trailer'ı shorts'a kesme, bir karakteri planlar arası tutarlı tutma (character
training), hook müziği besteleme.

### 1.2 Teslim hattı (delivery pipeline)

1. **Intake — insan, ~20 dk.** Fikri sıkı bir spec'e çevir: vizyon, beat'ler, art direction.
   Makalenin cümlesi: "Judgment work, and judgment is where the value lives."
2. **Design — Opus 5 / Fable 5.** Spec'ten beat sheet, shot list, art direction üretir.
3. **Media + build — paralel.** Higgsfield MCP trailer ve key art'ı üretirken Claude Code oynanabilir
   build'i yazıyor.
4. **QA + handoff — insan, ~25 dk.** Spec'e karşı review, final kesim, teslim.

Makalenin özeti: "The two stages that need a human — intake and QA — are the fast ones. The slow,
labor-heavy middle is the one you removed yourself from. You went from producer to orchestrator."

### 1.3 Oynanabilir prototip için 6 adımlı build döngüsü

1. **Feed the spec.** Design doc'u (core loop, kontroller, win/lose, tam ekran listesi) tek prompt
   olarak Claude Code'a ver.
2. **Scaffold first.** Feature yazmadan önce proje yapısını ve game loop'u üretir. Sen okuyorsun,
   üretmiyorsun.
3. **Build system by system.** Her parçayı ayrı prompt'la: movement, combat, HUD, scoring, menus.
4. **Wire the feel.** Input timing, animasyon state'leri, juice, responsive layout — tek geçişte,
   sonra bozuk olanlara prompt'la düzeltme.
5. **Review against the spec, not your taste.** Eksik state veya bozuk kontrol = geri prompt, elle
   patch değil.
6. **Deploy.** Build'i pushla, linki paylaş.

### 1.4 Bizim için en kritik detay: makalenin kendi kod örneği bizim stack'imiz

Makale örnek olarak bir "magic-carpet flyer" veriyor ve Claude Code'un ürettiği çekirdeği anlatıyor:

- **HTML5 canvas** üzerinde çalışan **fixed-timestep game loop**
  ("a fixed timestep so the game feels identical on a 60Hz laptop and a 144Hz monitor")
- Collision ve scoring kendi küçük, okunabilir fonksiyonları olarak
- **AABB overlap test**
- Juice `shake(8)` çağrısıyla — "make the hits feel heavier" prompt'undan doğmuş

Yani **Glowsprig'in mevcut mimarisi (Vite + TS + Canvas, `STEP = 1000/60`, AABB, shake/squash-stretch)
tam olarak bu makalenin tarif ettiği çıktı.** Doğru yoldayız; eksik olan kısım medya/asset katmanı.

Makalenin kendi cümlesi bu bölümü özetliyor:
"That's the whole loop in miniature: you direct feel, the model writes systems."

### 1.5 Makalenin kendi dürüst sınırı

Makale kapsamı kendi eliyle daraltıyor — bu bizim için en değerli kısım:

> "One person plus these tools does not ship a 100-hour open-world AAA."

Ne **çıkıyor**:
- Game trailer'ları ve **gameplay-concept videoları** (announce trailer, "what if this shipped today"
  rebuild'leri, sosyal için dikey cutdown'lar)
- Key art, karakter art, concept art, marketing setleri
- **Küçük oynanabilir oyunlar** — web ve prototip ölçeğinde, deploy edilip paylaşılabilir

Yani işletilen model bir **"concept-to-trailer-to-prototype shop"**. Vizyonu, görselleri ve pazarlamayı
satıyorsun; üstüne küçük oynanabilir build'ler koyuyorsun.

### 1.6 Birim ekonomi (makalede "illustrative" olarak veriliyor)

| Kalem | Aylık |
|---|---|
| Design/reasoning (Opus 5) | ~$100–200 |
| Build engine (Claude Code, yoğun) | ~$200 |
| Higgsfield subscription | ~$40 |
| Hosting, domain, asset storage | ~$100 |
| Diğer SaaS (editing, scheduling, comms) | ~$150 |
| **Toplam** | **~$600–700** |

İş modeli tarafında makalenin tek kuralı: "the work has to be deliverable by a system, not by
heroics." Ürünleştirilmiş bir launch package (hero trailer + key art seti + sosyal cutdown) sat, sonra
aylık retainer'a geçir. "Whatever you need" satmayı yasaklıyor.

---

## 2. Referans klip hakkında kritik bulgu

**Klip:** [^2] — 13 Ağustos 2026, ~3.6K görüntüleme, "Paid partnership".

Yazarın kendi metni:

> "OPUS 5 + HIGGSFIELD ONE-SHOTTED A 2000s 3D PLATFORMER WITH 2026 GRAPHICS.
> Lantern-carrying fox, rotting boardwalk over a jade swamp, a cave behind a waterfall.
> **nobody modeled a thing. every frame was generated.** this is where gamedev is heading."

**Bu klip oynanabilir bir oyun değil.** "Her kare üretildi" ifadesi, gerçek zamanlı bir motorun
render'ı değil, video üretim modelinin çıktısı olduğunu söylüyor. Makalenin kendi kategori listesinde
bu "gameplay-concept video" kutusuna giriyor — oynanabilir build kutusuna değil.

**Sahip için pratik sonucu:** O klipteki görsel bar (volumetrik ışık, gerçek zamanlı emissive kristal
bounce, film grain) tarayıcıda 2D canvas ile gerçek zamanlı yakalanamaz — ama **o klip birebir
Glowsprig'in key art'ı / duyuru trailer'ı olarak kullanılabilir.** İkisi ayrı işler: biri pazarlama
varlığı, biri oyun. Karıştırmak projeyi batıran klasik hata.

---

## 3. Bu yöntemle yapılmış oyunlar

### 3.1 Genel tablo

| # | Oyun | Geliştirici | Araçlar | Benzerlik | Olgunluk |
|---|---|---|---|---|---|
| 1 | **Toad Jumper** | @van_gogh_onion [d] | Higgsfield Games (Fable 5 + MCP), browser | **Yüksek** | Yayınlanmış, oynanabilir |
| 2 | **To the Abyss, We Dive!** | gpeixoto88 | Claude + Godot + Nano Banana + AI video→frame | **Yüksek** | Yayınlanmış, oynanabilir (jam) |
| 3 | **Penguin the Planet** | Higgsfield kullanıcısı | Higgsfield Games, browser | **Yüksek** | Yayınlanmış, oynanabilir |
| 4 | **Pixel Runners** | Higgsfield kullanıcısı | Higgsfield Games, browser | Orta-Yüksek | Yayınlanmış, oynanabilir |
| 5 | **Bawk to the Future** | coeurnix | three.js + custom code, Tripo, video gen, GPT→Blender | Orta-Yüksek | Yayınlanmış, oynanabilir + açık kaynak |
| 6 | **dreamseam** | daguaroadtrip | Claude Code (tüm kod), AI müzik + kod-synth SFX | Orta (yöntem) | Yayınlanmış, oynanabilir (jam) |
| 7 | **Funkatron** | TC Poole | Meshy image-to-3D, web 3D / VR | Orta | Canlı, sürekli genişleyen evren |
| 8 | **Blockfield** | @prefab_diamond | Higgsfield Games, browser, multiplayer | Düşük | Yayınlanmış, platformun en çok oynananı |
| 9 | **Pet Rock** | Sudgy | Claude Code + Suno + ElevenLabs + ChatGPT | Düşük-Orta | Yayınlanmış (24 saatlik jam) |
| 10 | **BULLET BALLET** | Higgsfield kullanıcısı | Higgsfield Games, 8 oyunculu online | Düşük | Yayınlanmış, oynanabilir |
| 11 | **The Massage Mysteries** | Higgsfield kullanıcısı | Higgsfield Games, browser | Düşük | Yayınlanmış, 4 sonlu |
| 12 | **Wildlands: Last Village** | @monetwater1026 / drcelsonolberto [d] | Higgsfield Games + itch.io | Düşük | Yayınlanmış, oynanabilir |

`[d]` = atıf doğrulanmadı, detay aşağıda.

### 3.2 Higgsfield Games marketplace — ölçek verisi

Marketplace'te arama indeksinden yakalanan oyun/oynanma sayıları (farklı zamanlarda çekildiği için
sayılar birbirini tutmuyor; alt sınır olarak okunmalı):

| Oyun | Geliştirici | Oynanma | Remix |
|---|---|---|---|
| Blockfield | @prefab_diamond | 146K → 165K | 121+ |
| Fighter World 7 | @van_gogh_onion | 65.9K | — |
| Hustle Hall | @van_gogh_onion | 28K → 28.4K | — |
| Toad Jumper | @van_gogh_onion [d] | 1.7K → 27.3K | 60 |
| BULLET BALLET | — | 11.3K | 63 |
| Project Titan Strike | @creatingsnow_micro | 4,280 | — |
| Friday the 31st — The Game | @van_gogh_onion | 2,919 | — |
| Pixel Runners | — | 2,256 | 24 |
| World Cup Football Championship | — | 2,071 | 88 |
| PROJECT ASCEND | @vizznary | 1,852 | — |
| BREACH: PETME | @onlyomen | 1,541 | — |
| The Massage Mysteries | — | 1,037 | 14 |
| Vyūha: The Kinetic Arena | @mooremuffin1359 | 811 → 815 | — |
| UFlasha Card Battle | @alusayt | 732 | — |
| Crimson Belt: Dojo Duel | @jeff_geoff_myke | 631 | — |
| Back and Forth | — | 602 | 17 |
| Animal Kart - Multiplayer | @zendevsam | 589 | — |
| Ant Army | @cmvjohnson | 576 | — |
| Brisalia | @singinggrape1399 | 447 → 457 | — |
| Pretty Brown Run | @dannyblvck | 428 | — |
| Dash: Write with Me | @sunfaceai | 279 | — |
| Delphy & Adely: Demon Castle | @jinly2k15 | 259 → 267 | — |
| Wildlands: Last Village | @monetwater1026 | 266 | — |
| Last Card — Omen Edition | @onlyomen | 227 → 238 | — |
| Penguin the Planet | — | 145 | 8 |
| Takeshi & Delphy: Demon Castle | @fibonaccinarwhal1310 | 140 → 198 | — |
| Unfair Ludo | @sparklingtadpole_myth | 113 | — |
| Sneaky Paws — 시치미냥 | @streaminghedgehog1323 | 11 | — |

**Dağılımın anlamı:** Uzun bir kuyruk var. Bir tane 165K'lık dev (Blockfield), bir avuç 10K+, geri
kalanların çoğu 100–2000 arası. Yani "AI ile oyun yaptım" tek başına dağıtım getirmiyor —
Blockfield'ı ayıran şey multiplayer + remix'lenebilirlik.

Ayrıca dikkat: **@van_gogh_onion** listede dört ayrı oyunla görünüyor (Toad Jumper, Fighter World 7,
Hustle Hall, Friday the 31st) ve toplamı 120K+ oynanma. Bu, makalenin tarif ettiği "tek kişilik
stüdyo"nun gerçekten çalıştığı en somut örnek: aynı hat üzerinden seri üretim.

---

## 4. Örnek örnek inceleme

### 4.1 Toad Jumper — @van_gogh_onion [d] — **Benzerlik: Yüksek**

**Link:** [^3]
**Araçlar:** Higgsfield Games (Claude Fable 5 + Higgsfield MCP), tarayıcı, motor yok
**Durum:** Yayınlanmış ve oynanabilir. 60 remix.

Kendi açıklaması: "Hop your toad home across busy roads and rivers in this cheerful arcade hopper!
Dodge cars and trucks, ride logs and turtles, **grab fireflies for combo points**, and grab a bubble
shield. Cross **5 themed worlds** — Swamp, Snowy, Chinatown, Miami, and L.A. — to fill every lily pad.
Plays great on desktop (in a cozy arcade cabinet) and mobile with **touch, keyboard and gamepad
support**."

Bulduğum en yakın eşleşme. Sebep: yaratık karakteri + zıplama temelli hareket + toplanabilir ışık
parçacıkları (fireflies ≈ bizim spirit-mote'lar) + tematik bölüm yapısı (5 dünya ≈ bizim 3 kısa
bölüm) + tarayıcı dağıtımı. Bir de arcade kabin çerçevesi gibi ucuz ama etkili bir sunum hilesi
kullanıyor.

**Glowsprig dersi:** Toplanabilir ışık parçacığını yalnızca ekonomi kaynağı değil, **combo/zincir
mekaniği** olarak kur — spirit-mote'ları üst üste toplamak çarpan versin. Ayrıca ilk günden
touch + klavye + gamepad girişini birlikte planla; bu oyunların hepsi çoklu giriş destekliyor.

### 4.2 To the Abyss, We Dive! — gpeixoto88 — **Benzerlik: Yüksek (asset hattı)**

**Link:** [^4]
**Araçlar:** Godot + Claude (pair programmer) + Nano Banana (görsel) + Grok (cover) + özel
`pixelize.gd` hattı + AI video → frame extraction
**Durum:** Yayınlanmış, oynanabilir. Ultimate AI-Powered Game Jam #2 girişi, 72 saat.

Bu, raporda **asset üretimi açısından en öğretici** örnek. Devlog'undan doğrulanan rakamlar: 129
commit, 25 etiketli oynanabilir build, 11 pipeline aracı, **4 yaratık "still → AI video → çıkarılmış
frame cycle" yöntemiyle animasyonlanmış**, 3840×6400 px'lik dünya, oyun içinde tam AI disclosure.

Asset hattı birebir şu: AI görsel → magenta key → trim → downscale → palette quantize (tek headless
komut) → **her sprite elle temizlenmiş** (Volt hariç hepsi). Kadro (dalgıç, Harpo, Volt, pirana,
denizanası, köpekbalığı, coin, inci) prompt'tan oyuna 2.5 saatte girmiş.

Bir de disiplini var: "bir yabancı, jam'in her anında oyunu indirip oynayabilmeli" kuralı hiç
bozulmamış. Build gece boyunca hiç kırılmamış.

**Glowsprig dersi:** Bizim yaratık animasyonu problemimizin en ucuz çözümü tam bu — tek bir
karakter görselini AI video modeline ver, çıkan klibin frame'lerini çıkar, spritesheet'e çevir, elle
temizle. Ayrıca "her an oynanabilir build" kuralını benimse; bizim `npm run dev` + slice disiplinine
birebir oturuyor.

### 4.3 Penguin the Planet — **Benzerlik: Yüksek (farming/creature döngüsü)**

**Link:** [^5]
**Araçlar:** Higgsfield Games, tarayıcı
**Durum:** Yayınlanmış, oynanabilir. 145 oyuncu, 8 remix.

Kendi açıklaması: küçük yuvarlak bir buz gezegeninde penguen kolonisi. Bir pengueni seçip kaydırarak
yönlendiriyorsun; **penguenler kendi başına hareket etmiyor.** Yetişkinleri bir araya getirince
eşleşip yumurta bırakıyorlar — koloniyi **%80+ tok** tutarsan ikiz geliyor. Penguenleri denize
balığa yolluyorsun, yemek göstergesini izliyorsun, denizdeki fok ve buzdaki kutup ayısından
kaçınıyorsun, hedef koloniyi 100'e çıkarmak. Touch, mouse, klavye ve gamepad destekli.

Farming yönü açısından en yakın örnek: **kaynak göstergesi → üreme → büyüme hedefi** döngüsü, üstüne
iki tehdit. Tamamı tek ekranda, tarayıcıda.

**Glowsprig dersi:** Farming döngüsünü tek net sayısal hedefe bağla (koloni 100 gibi) ve bir
"tokluk/bakım göstergesi" ile besleme baskısı yarat. "Yaratıklar kendi başına hareket etmez" kararı
da güzel bir sadelik hamlesi — AI davranışı yazmak zorunda kalmadan yönetim hissi veriyor.

### 4.4 Pixel Runners — **Benzerlik: Orta-Yüksek**

**Link:** [^6]
**Araçlar:** Higgsfield Games, tarayıcı
**Durum:** Yayınlanmış, oynanabilir. 2,256 oyuncu, 24 remix.

Açıklaması: "A **cozy** pixel-art endless runner — dash through **blooming meadows**, grab coins, and
chase your best distance."

Ton olarak bize yakın (cozy + çiçeklenen çayır + bloom estetiği), mekanik olarak daha basit. 2,256
oyuncuya tek bir endless-runner döngüsüyle ulaşmış olması dikkate değer.

**Glowsprig dersi:** Cozy ton + tek temiz döngü, karmaşık mekanikten daha iyi dağıtım getiriyor.
İlk dilimi zenginleştirmek yerine cilalamak daha çok işe yarıyor.

### 4.5 Bawk to the Future — coeurnix — **Benzerlik: Orta-Yüksek (teknik yaklaşım)**

**Linkler:** [^7] (oyun), [^8] (kaynak kod)
**Araçlar:** **three.js + özel kod (oyun motoru YOK)**, Tripo (3D model), video gen, GPT 5.5 → Blender
Python (harita üretimi), özel viseme lip-sync sistemi
**Durum:** Yayınlanmış, oynanabilir, MIT lisanslı açık kaynak. Token Game Jam 1 girişi.

Geliştiricinin kendi notları bizim için altın değerinde, çünkü **dürüst**:

- "it doesn't use a proper game engine, just three.js and custom code. In these days of AI, this is
  fairly easy to do, but **optimization required a fair bit of experimentation**." Sonuç: MediaTek
  Dimensity 6300 üzerinde animasyonlu 3D insanlar ve lip-sync ile akıcı çalışıyor.
- Harita için GPT 5.5'e bir kat planı görseli verip doğrudan Blender Python yazdırmış. "Surprised and
  impressed" ama temizlik gerekmiş.
- **En açık özeleştiri:** "the most significant weakness of the game is the generated 3D models, for
  which I used Tripo... there are so many nuanced yet vital aspects to 3D design and modeling, that we
  are still quite a bit from professional-quality model design." Ve devamı: diffusion yaklaşımı
  yerine **GPT → Blender tarzı yapıcı/araç-tabanlı hattın "doğru" yol** olduğunu düşünüyor.

**Glowsprig dersi:** Motorsuz web yaklaşımımız (Vite + Canvas) bu bağlamda istisna değil, norm — ama
bedeli optimizasyonu kendin yapmak. Ve 3D üretim modellerine hero asset olarak güvenme; üretilmiş
görseli 2D'ye bakıp (baked sprite / arka plan katmanı) kullanmak bugün daha güvenli bir bahis.

### 4.6 dreamseam — daguaroadtrip — **Benzerlik: Orta (metodoloji)**

**Link:** [^9]
**Araçlar:** Claude Code (tüm kod için pair programmer), AI görsel (logo + cover), AI müzik (elle
işlenmiş), **kodda sentezlenen SFX — hiç audio dosyası yok**
**Durum:** Yayınlanmış, oynanabilir. Ultimate AI-Powered Game Jam #2.

Bu örneğin değeri oyunda değil, **yönetim disiplininde**. Kendi beyanından:

- Oyunun üstüne kurulu tek tasarım kuralı **test suite'te bir assertion olarak** duruyor.
  ("That single rule is now an assertion in the test suite, because it is the one thing the whole
  design rests on.")
- Kalibrasyonun neredeyse tamamı insan izleyerek yapılmış: bir oyuncu 1. katmanı geçemedi → rehberli
  ilk dream ve seans başına bir merhamet hakkı geldi. Kimse Climb'i geçemiyordu → auto-UNISON merge'ü
  duvardan 300 m önce harcıyordu, artık 150 m'de harcanıyor.
- Ve reddedilenler açıkça yazılmış: Buddy için throw/launch mekaniği (iki kez), melek kanatlı füzyon
  formu, trailer klipleri crash'le bitmesin diye pilotu ölümsüz yapma önerisi. Son madde şu cümleyle
  kesilmiş: "it's no use making it survive the crash, it has to be a well-flown scene."
- Beyanı net: "Not AI: every design decision, playtest verdict, difficulty call and art-direction
  call was the human director's."

**Glowsprig dersi:** Projenin dayandığı tek çekirdek kuralı bir teste yaz (bizde: spirit-mote
ekonomisi veya vine-hook menzili gibi). Ve AI önerilerini reddetme kaydını tut — makalenin
"review against the spec, not your taste" maddesinin pratikteki hali bu.

### 4.7 Funkatron — TC Poole — **Benzerlik: Orta**

**Link:** [^10]
**Araçlar:** Meshy (image-to-3D), 3D web deneyimleri + VR dünyaları
**Durum:** Canlı, 2021'den beri sürekli genişleyen bir evren (oyunlar, VR, çizgi roman, dünya içi
yayınlar). Ekip yok, bütçe yok.

Hattı dört adım: fikir → AI görsel araçla concept image → Meshy ile image-to-3D → modeli doğrudan
sahneye **final asset olarak** koy.

Kritik detay: bu modeller "gerçek bir modelleyici gelene kadar bekleyen blockout" değil. Meshy
çıktıları çalışan, profesyonel görünen 3D web deneyimlerinde final asset olarak yayında.

**Glowsprig dersi:** Tek kişilik bir asset hattının uzun vadede sürdürülebilir olduğunun kanıtı —
ama işleyen kısım "prompt → 3D" değil, **"concept image → 3D"**. Yani görsel yönü önce 2D'de
sabitlemek, sonra üretmek. Bizim `docs/art/` yaklaşımımızı doğruluyor.

### 4.8 Blockfield — @prefab_diamond — **Benzerlik: Düşük (ama dağıtım dersi yüksek)**

**Araçlar:** Higgsfield Games / Claude Fable 5 + Higgsfield MCP, tarayıcı, online multiplayer
**Durum:** Platformun en çok oynanan oyunu. 146K–165K oynanma, 121+ remix.

Higgsfield'ın kendi blog yazısına göre [^11]: üç oyun bir gecede yayınlanmış, reklam yok, post yok,
kimseye söylenmemiş — sabaha karşı Blockfield tek başına ~4,000 oynanmaya, **tek arenada 22 eşzamanlı
oyuncuya** ve 121 remix'e ulaşmış. Üç oyunun toplam maliyeti **$68 kredi** (başarısız üretimler dahil).

Blog yazısının kendi teşhisi, bizim işimize yarayan kısım: Claude'un tek başına yazdığı oyunlar
çalışıyor ama "capsule characters, gray boxes, one flat texture" — "brilliant logic wrapped in
programmer art." İki duvar var: oyunun **iyi görünmesi** ve arkadaşların **katılabilmesi**.

**Glowsprig dersi:** Bu platformdaki dağıtım farkını yaratan şey grafik değil, **remix'lenebilirlik +
multiplayer**. Bizim tek kişilik cozy farming oyunu için bunun karşılığı: paylaşılabilir tohum/çiftlik
kodu (seed sharing) gibi düşük maliyetli bir sosyal kanca.

### 4.9 Diğer doğrulanmış örnekler (kısa)

- **BULLET BALLET** [^12] — "Max Payne x Matrix multiplayer bullet-time lobby shootout", 8 oyuncuya
  kadar online. 11.3K oyuncu, 63 remix. Higgsfield Games. Benzerlik düşük ama tek prompt'la
  bullet-time + yıkılabilir mermer sütun üretilebildiğini gösteriyor.
- **The Massage Mysteries** [^13] — 3078 yılında android spa'da geçen first-person "spa-noir" gizem;
  stealth, gizli kanıt, **4 farklı son**, klavye+mouse+touch+gamepad. 1,037 oyuncu, 14 remix. Bu
  hattın anlatı oyunu da çıkarabildiğinin kanıtı.
- **Back and Forth** [^14] — neon synthwave paddle-survival; SOLO + gerçek zamanlı ONLINE VERSUS,
  davet linkiyle eşleşme, 11 sayıya ilk ulaşan kazanır. Masaüstü/mobil/gamepad. 602 oyuncu, 17 remix.
- **World Cup Football Championship** [^15] — 16 milli takımla top-down arcade futbol, grup +
  eleme turları, pixel art. 2,071 oyuncu, 88 remix.
- **Fighter World 7** [^16] — @van_gogh_onion, 65.9K oynanma. Aynı geliştiricinin en çok oynananı.
- **Pet Rock** — Sudgy [^17] — "All Tools Allowed — A Critics Arcade AI Game Jam" girişi. 24 saatte
  yapılmış. Araçlar: Claude Code, Suno (2 müzik), ElevenLabs (SFX + diyalog), ChatGPT (texture,
  görsel referans), Audacity. İlginç taktik: **iki laptopta paralel Claude Code** — biri core oyun,
  diğeri art asset'ler ve splash page. Diyalog yazılmış + üretilmiş karışımı.
- **Wildlands: Last Village** [^18] — tarayıcıda çalışan ücretsiz wave-defense action RPG, 15 dalga,
  5 boss, 3 oynanabilir kahraman, kalıcı ilerleme (level 30'a kadar), Rescue Code ile cihazlar arası
  taşıma. Higgsfield marketplace'te @monetwater1026 adına, itch.io'da drcelsonolberto adına aynı
  tanıma sahip bir sayfa var — **aynı oyunun iki platformda yayınlanmış olması muhtemel ama
  doğrulanmadı.** Eğer öyleyse marketplace → itch.io çapraz yayın yolunun somut örneği.

### 4.10 Ekosistem: AI game jam'leri

Bu hattın toplandığı yer jam'ler. Doğrulanmış olanlar:

- **Ultimate AI-Powered Game Jam #2** [^19] — michyo tarafından, 7–10 Ağustos 2026, 72 saat, **33
  submission** (31'i tarayıcıda oynanabilir). Nakit ödül yok. Değerlendirme kriterleri bizim için
  öğretici: (1) Overall Enjoyment, (2) Theme Fidelity & Creativity, (3) **AI Direction &
  Adaptability** — "AI'ın çıktısını ne kadar iyi kontrol ettin", (4) **Production Velocity** — "AI'ın
  hızını 72 saatte ne kadar ölçek ve tamlığa çevirdin". Tema 1 "DIVE" önceden, Tema 2 gizli.
- **All Tools Allowed — A Critics Arcade AI Game Jam** [^17] — AI kullanımının açıkça beyan edildiği
  bir jam.
- **Token Game Jam 1** [^20] — Bawk to the Future'ın çıktığı jam.
- Karşı taraf: **GMTK Game Jam** üretken AI ile asset üretimini açıkça yasaklıyor **[doğrulanmadı]**.

Her iki jam'de de submission formunda "AI Tools Used" ve "Areas Where AI Was Used" alanları zorunlu.
Yani bu sahnede norm, AI kullanımını gizlemek değil, **belgelemek**.

---

## 5. Bizim referansa en çok benzeyen 3 örnek

### 1) Toad Jumper — şekil olarak en yakın
Yaratık karakteri + zıplama hareketi + toplanabilir ışık parçacıkları (fireflies) + tematik bölüm
yapısı + tarayıcı dağıtımı + çoklu giriş. Glowsprig'in iskeleti bu, sadece teması farklı. 60 remix
ile bu şeklin gerçekten oyuncu tuttuğunu da kanıtlamış.

### 2) To the Abyss, We Dive! — asset hattı olarak en yakın
Bizim çözülmemiş tek büyük problemimiz "üretilmiş bir yaratık nasıl canvas'ta canlanır" ve bu proje
tam bunu çözmüş: **still → AI video → frame cycle çıkarımı → elle temizlik → spritesheet**. Dört
yaratığı böyle animasyonlamış. Üstüne "her an oynanabilir build" disiplini ve oyun içi AI disclosure.

### 3) Penguin the Planet — farming döngüsü olarak en yakın
Tokluk göstergesi → üreme → koloni büyütme hedefi + iki tehdit. Glowsprig'in farming yönü için hazır
bir iskelet. Ve "yaratıklar kendi başına hareket etmez" kararıyla AI davranış kodu yazmadan yönetim
hissi veriyor — bizim gibi tek kişilik bir hat için doğru tip sadeleştirme.

---

## 6. Glowsprig için somut çıkarımlar

### Çıkarım 1 — Klip bir trailer, oyun bir başka iş. İkisini ayır.
Referans klip gerçek zamanlı render değil, video üretimi. O bar'ı canvas'ta kovalamak projeyi batırır.
**Yapılacak:** O görsel dili **key art + duyuru trailer** olarak kullan (makalenin medya katmanı),
oyunu ise 2D canvas'ta kendi ulaşılabilir barında tut. Makalenin kendi kategori ayrımı da bu.

### Çıkarım 2 — Yaratık animasyonu için: still → AI video → frame extraction
Glowsprig'in tohum/creature animasyonu problemi için en ucuz ve kanıtlanmış yol bu (To the Abyss'te
4 yaratık böyle yapılmış). Tek karakter görselinden video üret, frame'leri çıkar, palette quantize
et, elle temizle, spritesheet'e koy. **Yapılacak:** Bu adımları tek komutluk bir script'e çevir —
o projede `pixelize.gd` idi, bizde bir Node script'i olabilir.

### Çıkarım 3 — Asset manifest'i shipping artifact yap
Higgsfield'ın kendi resmi game-generation skill'i [^21] üretilen her asset'i `design/assets.csv`
içinde tutuyor ve **bu dosyayı oyunla birlikte gönderiyor**. Asset referansları da relative path.
**Yapılacak:** Bizde de her üretilmiş asset için ID / prompt / boyut / kaynak model tutan bir manifest
olsun. Yeniden üretilebilirlik yoksa AI asset hattı ikinci iterasyonda çöküyor.

### Çıkarım 4 — Çekirdek tasarım kuralını teste yaz
dreamseam'in yaptığı gibi: oyunun dayandığı tek kural bir test assertion'ı olsun. Bizde bu
spirit-mote ekonomisi dengesi veya vine-hook menzili olabilir. Bu, makalenin
**"review against the spec, not your taste"** maddesini uygulanabilir hale getiriyor — aksi halde her
AI iterasyonu sessizce tasarımı kaydırır.

### Çıkarım 5 — İlk günden çoklu giriş + tek net hedef
Bizim türümüzdeki başarılı marketplace oyunlarının hepsi (Toad Jumper, Penguin the Planet,
Back and Forth, The Massage Mysteries) **klavye + touch + gamepad** destekliyor ve tek net sayısal
hedefi var. **Yapılacak:** Farming döngüsünü tek ölçülebilir hedefe bağla (ör. "bahçeyi X bloom'a
çıkar") ve touch'ı sonradan eklenecek iş olarak bırakma.

### Çıkarım 6 — Dağıtımı grafikle değil, sosyal kancayla çöz
Blockfield'ı 165K'ya taşıyan şey görsel kalite değil; multiplayer + remix. Uzun kuyruktaki
yüzlerce oyun aynı görsel hatta sahip ama 100–2000 oynanmada kalmış. **Yapılacak:** Tek kişilik cozy
bir oyun için düşük maliyetli karşılık: **paylaşılabilir çiftlik/tohum kodu** (Wildlands'ın
"Rescue Code"u gibi) — kopyalanabilir bir string, sunucu maliyeti sıfır.

---

## 7. Doğrulama sınırları

Dürüst olmak için raporun zayıf noktaları:

1. **Makale ve klip tam metin okundu ve doğrulandı** — tarayıcı üzerinden, tam accessibility
   snapshot alındı. Bu bölümde tahmin yok.
2. **Higgsfield marketplace sayfaları giriş istiyor.** Hem `WebFetch` hem tarayıcı ile denendi (2
   deneme), her ikisinde de sadece SPA iskeleti döndü, oyun içeriği yüklenmedi. Oyun adları,
   açıklamaları, geliştirici handle'ları ve oynanma sayıları **arama motoru indeks kayıtlarından**
   alındı. Bunlar gerçek sayfa içeriğidir, ama farklı zamanlarda çekilmiştir.
3. **Marketplace deep link'leri HTTP ile doğrulanamıyor.** Test ettim: kasten bozulmuş bir UUID de
   HTTP 200 dönüyor, çünkü SPA her yolu kabul ediyor. Yani bu raporda verilen marketplace UUID'leri
   arama indeksinden birebir kopyalandı ama **sayfa içeriği görsel olarak teyit edilemedi.**
4. **Oynanma sayıları kayıyor.** Blockfield 146K ve 165K olarak iki farklı indeks kaydında görünüyor;
   Toad Jumper 1,734 ve 27.3K olarak. Farklı tarihlerde çekilmiş. Tablodaki sayılar **alt sınır**.
5. **Toad Jumper'ın @van_gogh_onion'a ait olduğu tek bir indeks kaydından geliyor** — oyunun kendi
   sayfa kaydında geliştirici adı görünmüyordu. `[doğrulanmadı]`.
6. **Wildlands: Last Village'ın iki platformda aynı oyun olduğu doğrulanmadı** — açıklamaları
   örtüşüyor ama handle'lar farklı (@monetwater1026 / drcelsonolberto).
7. **itch.io ve GitHub linkleri gerçekten doğrulandı.** itch.io var olmayan sayfalar için 404
   döndüğünü test ettim, bu yüzden bu linklerdeki 200 gerçek bir kanıt. Tek istisna: To the Abyss
   devlog linki tekrarlanan isteklerden sonra 429 (rate limit) döndü — 404 değil, yani sayfa var;
   ayrıca içeriği arama indeksinden tam metin olarak okundu. Oyunun ana sayfası 200 doğrulandı.
8. **Makale ücretli iş birliği.** Maliyet ve performans iddiaları (özellikle "$68'a üç oyun",
   "bir gecede 4,000 oyuncu") satıcı kaynaklı, bağımsız doğrulanmadı.
9. Türkçe kaynak aranmasına rağmen bu konuda doğrulanabilir Türkçe içerik bulunamadı.
10. **GMTK Game Jam'in AI asset yasağı** ikincil bir sentezden geldi, birincil kaynaktan
    doğrulanmadı.

---

## Kaynaklar

[^1]: ZEUS⚡️ (@zeuuss_01), "How to Run a Game Studio Solo with Claude Code + Higgsfield MCP", 5 Ağustos 2026 — https://x.com/zeuuss_01/article/2085112087605342552
[^2]: ZEUS⚡️ (@zeuuss_01), 3D platformer klibi, 13 Ağustos 2026 — https://x.com/zeuuss_01/status/2087931756305342939
[^3]: Toad Jumper — https://higgsfield.ai/supercomputer/marketplace/games/590a93b6-b8c8-4afb-89b3-6008ad7896d3
[^4]: "To the Abyss, We Dive!" — gpeixoto88 — https://gpeixoto88.itch.io/to-the-abyss-we-dive — devlog: https://gpeixoto88.itch.io/to-the-abyss-we-dive/devlog/1623777/72-hours-to-the-abyss-the-full-timeline
[^5]: Penguin the Planet — https://higgsfield.ai/supercomputer/marketplace/games/03ea2e61-58b5-44be-8739-b9fe49881b40
[^6]: Pixel Runners — https://higgsfield.ai/supercomputer/marketplace/games/53a16aac-d622-4377-9f80-701ac9d05556
[^7]: Bawk to the Future — coeurnix — https://coeurnix.itch.io/bawk-to-the-future
[^8]: Bawk to the Future kaynak kodu (MIT) — https://github.com/coeurnix/Bawk-to-the-Future
[^9]: dreamseam — daguaroadtrip — https://itch.io/jam/ultimate-ai-powered-game-jam-2/rate/4881535
[^10]: "Inside Funkatron: How a Solo Dev Uses Meshy's AI 3D Model Generator to Build a Universe" — https://www.meshy.ai/blog/building-funkatron-with-ai-3d-models
[^11]: Higgsfield, "Build Multiplayer Games With AI", 19 Haziran 2026 — https://higgsfield.ai/blog/Higgsfield-Games
[^12]: BULLET BALLET — https://higgsfield.ai/supercomputer/marketplace/games/e5483030-a190-497f-8c77-33210b3222f7
[^13]: The Massage Mysteries — https://higgsfield.ai/supercomputer/marketplace/games/401a9a46-67a3-4df3-a963-cafa8863fc80
[^14]: Back and Forth — https://higgsfield.ai/supercomputer/marketplace/games/2ec3d1bc-54a0-4b68-80e8-591b315a0c2b
[^15]: World Cup Football Championship — https://higgsfield.ai/supercomputer/marketplace/games/55d4326a-6711-46ac-b42d-5b6e014677a7
[^16]: Fighter World 7 — https://higgsfield.ai/supercomputer/marketplace/games/cfe6c05a-dc51-476d-b23b-1966999085cb
[^17]: Pet Rock — Sudgy — https://itch.io/jam/all-tools-allowed/rate/4883595
[^18]: Wildlands: Last Village — https://drcelsonolberto.itch.io/wildlands-last-village
[^19]: Ultimate AI-Powered Game Jam #2 — https://itch.io/jam/ultimate-ai-powered-game-jam-2 · organizatör sayfası: https://michyo.net/uaipgj/
[^20]: Token Game Jam 1 — https://itch.io/jam/token-jam-1
[^21]: Higgsfield resmi `higgsfield-game-generation` skill'i — https://github.com/aiskillstore/marketplace/blob/75d670d730c9d78ef107dcf1a1f6d74810ccf99f/skills/higgsfield-ai/higgsfield-game-generation/SKILL.md
[^22]: Higgsfield, "Higgsfield AI Games" ürün yazısı — https://higgsfield.ai/blog/higgsfield-ai-games
[^23]: Higgsfield Games tanıtım sayfası — https://higgsfield.ai/games-intro
