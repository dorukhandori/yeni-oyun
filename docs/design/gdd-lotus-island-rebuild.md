# GDD — Lotus Adası: çekirdek mekanik sıfırdan tur (Med-Cezir — kilitli yön)

> **Durum:** **KİLİTLİ YÖN — sahip 22 Ağu 2026'da seçti** ("K2 benim için okdir"). Bu artık dört seçenekten biri değil, **karar**. Hiçbir maddesi kodlanmamıştır, hiçbir asset üretilmemiştir — bu hâlâ ön üretim (senaryo + challenge + asset listesi + geliştirme planı), implementasyon değil.
> **Tarih:** 2026-08-22 (üç turda yazıldı — ilk tur 4 seçenek sundu, ikinci tur sahip kararından sonra Med-Cezir'i nihai pakete indirgedi + challenge iletişimini ekledi, bu tur **gemiyi bulma açılış perdesini** ekliyor.)
> **Yazan:** `game-designer` rolü · `@helix`
> **Sahip'in ikinci isteği (aynı gün, K-2'nin hemen ardından):** *"ama kullanıcıya bunun iletişimi net yapılmalı ve gerçek bir challenge olarak oyuna başlanmalı diye düşünüyorum."* Bu, oturumun en baştaki isteğinin ("Ne kadar çabuk adadan ayrılırsan o kadar iyi!" mandat kartı fikri) Med-Cezir'in push-your-luck gerilimine özel olarak uygulanmış hâli — ayrıntı §5.
> **Sahip'in üçüncü isteği (aynı gün, üstüne):** *"aynı zamanda gemi en başta kullanıcı oyuna başladığında görünür olmasın. gemiyi bulmak da bir challenge olsun ve yerdeki taşlar ile doğru algoritmayla etkileşime geçilirse sahili gösteren bir pusula belirsin."* Bu, §5'in içine **birleştirildi** (yeni §5.1) — gerekçe orada. Mevcut kod tabanında bu isteğe neredeyse birebir uyan bir sistem zaten var: `src/world/hillPuzzle.ts` (sıralı taş etkileşimi, "doğru algoritma" = `PUZZLE.cairnSolveOrder`, yanlış dokunma cezasız, rüzgâr ipucu doğru sırayı pasif olarak öğretir). Yeni kod yazmak yerine **bu deseni yeniden kullanmak** öneriliyor — ayrıntı §5.1.
> **İlişki — `gdd-lotus-island-scenario.md`:** arka plan/referans, bağlayıcı değil. Ucuz/doğru parçaları (D0 hariç, FIRST_LOTUS, Hatırla, ayrılış kartı, mandat kartı iskeleti) burada **emildi** (§7). Ateş/barınak/günlük-challenge geriye itildi (§7, §10).
> **Otorite:** bu doküman, onaylanınca Lotus Adası'nın **çekirdek döngüsü** için `gdd-lotus-island-run.md` §3'ün üstüne geçer. Sayıların çoğu (§8'de işaretlenenler hariç) değişmiyor — değişen, döngünün *okunuş sırası, yerleşim yanlılığı ve iletişimi.* `gdd-lotus-collection.md`, `gdd-memory-system.md`, `gdd-lotus-hallucination.md` formülleri **değişmiyor.**
> **Kapsam dışı (sabit kalır):** ada geometrisi, Doryseus modeli/rig'i, lotus asset'leri, gemi, palet (`art-bible.md`), tema. Yeni 3D asset **gerekmiyor** — bkz. §9.

**Etiketler:** **[H]** Homeros · **[O]** oyun icadı · **[R]** araştırma bulgusu (kaynak) · **[?]** sahip kararı gerekiyor · **[K]** kapandı.

> **Doğrulama notu (22 Ağu 2026, `@byte` · Gameplay Programmer):** bu doküman sahibin isteğiyle uçtan uca kod tabanına karşı doğrulandı (implementasyon yapılmadı, `src/` dokunulmadı, commit atılmadı). Doğrulamanın tam bulgu listesi ve implementasyona hazır, düzeltilmiş geliştirme planı **§10a**'dadır. §1–§9'daki metnin geri kalanı büyük ölçüde doğru bulundu (satır numaraları, fonksiyon davranışları, sabit değerleri); yalnızca birkaç yerde `[@byte doğrulama]` etiketli küçük düzeltme notu eklendi. **§10'un orijinal tablosu artık ikincil kaynak** — bir programcı doğrudan **§10a**'yı takip etsin; orijinal §10 yalnızca tasarım gerekçesi/tarihçe için tutuluyor.

---

## 1. Teşhis — okunabilirlik yeterli mi (özet, değişmedi)

`gdd-lotus-island-scenario.md`'nin okunabilirlik teşhisi doğru ama yarım. Üç yapısal zayıflık (mekanik, HUD sorunu değil):

1. **Karar yoğunluğu düşük.** `CARRY_CAPACITY` 4, `LOTUS_TARGET` 5 → koşu başına ~1 gerçek "devam mı, dönsem mi" kararı. Push-your-luck'ın referans oyunu *Incan Gold*'da bu karar her turda tekrar sorulur [R].
2. **Bahis göründüğünden ucuz, hiç söylenmiyor.** Unutuş olayının gerçek bedeli (yalnız `carried` gider, `delivered` korunur) sunumun yarattığı "felaket" hissiyle uyuşmuyor — oyuncu ya aşırı temkinli oluyor ya da "bug mı?" diye düşünüyor.
3. **Ustalık fantezisi K35'te terk edildi.** `timeJitter = 0` + tam rastgele konum, `gdd-lotus-collection.md`'nin "adayı okuyabiliyorum" hedefini iptal etti; hiçbir koşu bir sonrakine bilgi taşımıyor.

Tam gerekçe ve araştırma tablosu için önceki tur korunmuştur — özet burada, ayrıntı §2.

---

## 2. Araştırma temeli (özet — kaynaklar)

| Bulgu | Kaynak | Uygulanışı |
|---|---|---|
| Push-your-luck: her turda açık bir "bankala/riske devam et" kararı | [BoardGameGeek](https://boardgamegeek.com/blog/5824/blogpost/119628/pushing-your-luck-the-most-important-mechanism-in), [Islay the Dragon](https://islaythedragon.com/guides/a-guide-to-pressing-your-luck/) | Med-Cezir'in çekirdek iskeleti (§4) |
| Extraction genre: gir-topla-çık, tekrarlanan "greed vs. survival" | [Eneba](https://www.eneba.com/hub/games/best-extraction-shooters/), [ResetEra](https://www.resetera.com/threads/let%E2%80%99s-talk-about-the-extraction-genre.1301340/) | "Gelgit" (tide/raid) yapısı |
| *Dredge*: mesafe = risk, derinde daha iyi av, açıkça okunur | [The Pause Menu](https://pausemenu.substack.com/p/sail-anywhere-but-be-home-by-dark), [Frostilyte](https://frostilyte.ca/2023/05/20/dredge-review-toothless-tension/) | Yerleşim yanlılığı + mesafe göstergesi |
| *Outer Wilds*: taşınan tek şey bilgi | [Game Developer](https://www.gamedeveloper.com/design/live-die-repeat-how-i-outer-wilds-i-piques-curiosity-in-an-ambivalent-solar-system) | v2 adayı (§6.3), tohum/bilgi tartışması |
| Compulsion loop / değişken ödül: dopamin beklenti anında | [Game Developer](https://www.gamedeveloper.com/design/compulsion-loop-is-withdrawal-driven), [Game Developer](https://www.gamedeveloper.com/design/compulsion-loops-dopamine-in-games-and-gamification) | Karar sıklığı hedefi + **§5'in gerekçesi**: ödül/risk sinyali görünür olmalı ki döngü alışkanlık üretsin |
| Stardew Valley: gerçek gerilim, cezalandırıcı olmayan ton | [Kokutech](https://www.kokutech.com/blog/gamedev/design-patterns/world-building/stardew-valley) | Kalıcı kayıp yok ilkesi |
| *Before I Forget*: unutma gerçekten mekanikleşmiş | ilgili kaynaklar | P2'yi koruma kararı |

---

## 3. Sabit kalanlar

- Doryseus modeli, ada geometrisi, gemi, lotus asset'leri, palet — **hepsi aynı.**
- Çekirdek fiil: topla (E basılı tut), taşı, teslim et (E) — **hiç değişmiyor.**
- Unutuş = tek tehdit; can barı yok, düşman yok, envanter/craft ekranı yok.
- Lotophagoi ikram, sanrı figürleri, tepe/höyük/kadın — kalıyor, yalnız çerçeveleri değişiyor.
- **Kalıcı kayıp yok.**

---

## 4. Seçilen yön: Med-Cezir (Tide Runs)

**Tek cümle:** Doryseus gemiden kısa çıkışlar ("gelgit"ler) yapar; ne kadar içeri giderse o kadar çok olgun çiçek bulur ama o kadar hızlı yolunu unutur — elindekini gemiye bankalayıp güvene al, ya da bir çiçek daha için riske devam et.

Fiiller **birebir aynı** kalıyor (E-basılı-topla, taşı, gemide teslim E, deniz/gemi iyileştirir, unutuş olayı sayıları). Değişen: **döngünün çerçevesi, yerleşim yanlılığı ve iletişimi (§5).**

### 4.1 Döngü

**0. Uyanış (yalnızca koşu başında, bir kez).** Oyuncu kontrolü aldığında gemi **görünür değildir** ve rehber ok/gelgit kadranı henüz aktif değildir. Yakındaki taş grubunu doğru sırada etkileşince (§5.1) rehber ok + gelgit kadranı **birlikte** açılır ve döngü aşağıdaki 1'den başlar. Bu adım koşu başına **bir kez** çözülür; aynı koşunun sonraki gelgitlerinde tekrarlanmaz (§5.1'de gerekçe).

1. **Çık (Push).** Gemi güvenli üs. Oyuncu içeri yürüdükçe **yeni, ayrı bir gösterge** (§5.3 — mevcut rehber okun *yeniden yorumu değil*, ondan bağımsız bir gelgit kadranı) derinliği/riski gösterir.
2. **Bul.** Olgun çiçek yerleşimi hafifçe **dışa yanlı**: gemiye yakın bölgede yoğunluk düşük, uzakta yüksek (*Dredge* deseni, §2). Mevcut reddetmeli örnekleme (`gdd-lotus-island-run.md` §3.3) aynen kalır, yalnız ağırlıklandırma eklenir.
3. **Topla.** Değişmiyor.
4. **Karar.** Elinde 1–4 çiçek varken her yeni olgun çiçek belirişinde aynı soru tekrar sorulur: bir tane daha mı, dönsem mi.
5. **Bankala (teslim).** Gemide E → `delivered += carried`, `carried = 0`. Kısa bir ton + "+2 teslim edildi, 3 kaldı" özet anı.
6. **Unut (risk gerçekleşirse).** Sayılar **birebir aynı** (`gdd-lotus-island-run.md` §3.5): `carried = 0`, gemi 40 m kayar, `delivered` korunur, `memory` 0.40'a düşer. Fark: oyuncu bu kuralı artık **önceden bilir** (§5) — aynı olay "haksızlık" değil "kötü bir gelgit" olarak okunur.

### 4.2 Örnek — ilk 90 saniye (güncellendi, açılış perdesi dahil)

```
0:00  Perde 0 kartı (§5.2) — challenge açıkça beyan ediliyor: "5 lotus, bankala,
      dümene geç." Gemi henüz görünmüyor, oyuncu bunu bilerek başlıyor.
0:08  Kontrol serbest. Oyuncu kıyıda/iç kesimde, gemi görüş açısında değil.
      3 taş yakında (§5.1) — mevcut cairn-hint mesafesiyle fark edilir.
0:12  Rüzgâr ipucu doğru sırayı pasif olarak gösteriyor (mevcut mekanik).
0:25  Üçüncü taş doğru sırada dokunuldu → "done". Rehber ok + gelgit kadranı
      aynı anda beliriyor. Kısa bir beat: "Sahili buldum."
0:30  FIRST_LOTUS — spawn'a yakın, olgun bir çiçek zaten parlıyor (artık görünür
      hâle gelen rehber okun yakınında da olabilir).
0:40  İlk çiçek toplanıyor. carried=1. Gelgit kadranı ilk kez "güvenli"den çıkıyor.
1:00  İkinci olgun çiçek, biraz daha uzakta — birinci gerçek karar. Oyuncu devam
      ediyor.
1:15  Kadran "temkin" bandına geçiyor — bu geçişte bir kerelik, kısa bir ipucu
      belirir (§5.3).
1:20  carried=3. Oyuncu döner, gemiye yürür.
1:35  Teslim: "+3 teslim edildi, 2 kaldı." delivered=3, carried=0, kadran
      sıfırlanır.
1:40  İkinci gelgit başlıyor — açılış perdesi bir daha tekrarlanmaz, oyuncu
      artık gemiyi ve kuralı biliyor.
```

Açılış perdesi (0:08–0:25) bütçesi ~15–25 sn — `FIRST_LOTUS`'un "ilk 60 saniyede garantili bir başarı" hedefiyle aynı bütçe ailesinde, onu geciktirmiyor, önüne kısa bir beat ekliyor.

---

## 5. Challenge iletişimi ve açılış — sahibin yeni gereksinimleri

> **Neden bu bölüm var:** push-your-luck bir mekaniktir; "bankala mı, devam mı" ancak oyuncu **girerken bahsi bildiğinde** gerçek bir karar olur. Bahis anlaşılmadan yaşanan aynı olay yalnız "şanssızlık" gibi hissettirir — tam olarak bu efor zincirinin çözmeye çalıştığı "oyun gibi hissettirmiyor" şikâyetinin kendisi. Bu yüzden iletişim, Med-Cezir'in **isteğe bağlı bir cilası değil, mekaniğin çalışması için önkoşulu.**
>
> Sahibin üçüncü isteği ("gemi başta görünmesin, gemiyi bulmak da bir challenge olsun") bu bölüme **ayrı bir mekanik olarak değil, aynı bölümün içine** eklendi (§5.1). Gerekçe: gemiyi bulma perdesi, mandat kartının söylediği kuralı ("bankaya yatırmadığın risktedir") **kelimeyle değil eylemle** anlatan en güçlü açılış anı — oyuncu daha ilk saniyede "güvenli üssümü bilmiyorum, bulmam gerekiyor" hissini yaşıyor, ki bu tam olarak Med-Cezir'in her gelgitte tekrar ettiği duygunun büyütülmüş hâli. İki ayrı sistem kurup art arda dizmek yerine, tek bir açılış perdesi olarak birleştirmek hem daha ucuz hem daha tutarlı.

### 5.1 Açılış perdesi — gemiyi bulmak

**Kod tabanında hazır bir emsal var, neredeyse birebir.** `src/world/hillPuzzle.ts` üç taşı (`BEAUTY.cairnSpots`) sıralı bir "doğru algoritma" ile açan bir ritüel: `interact(index)` → sıradaki doğru taş `PUZZLE.cairnSolveOrder[step]` değilse `"wrong"` döner ve **hiçbir ceza uygulanmaz** (adım sıfırlanmaz, sadece ilerlemez), doğruysa `"progress"`/`"done"`; ayrıca `hillWindHintIndex()` periyodik olarak doğru sıradaki taşı **pasif biçimde parlatarak** sırayı öğretiyor (deneme-yanılmaya mecbur bırakmıyor). `src/world/steppingStones.ts` da benzer bir aile (sıralı temas), ama fiziksel bir yol boyunca ilerleme mantığında — "doğru algoritma" tanımına `hillPuzzle`'ın `interact`/sıra-kontrolü daha yakın. **Öneri: yeni bir etkileşim sistemi yazılmıyor; `hillPuzzle.ts`'in deseni yeni bir site ile ikinci kez örnekleniyor** (aşağıda "sahil taşları").

**Ne yapılıyor, ne yapılmıyor:**

- `buildHillPuzzle()`'ın iç mantığı, site listesini/sırasını/menzil sabitlerini parametre alan genel bir `buildStoneRitual(spots, order, range, hintRange)` fonksiyonuna çıkarılabilir (öneri, `@byte`'a bırakılan bir refactor kararı) — mevcut kuzey höyük ritüeli (BEAUTY B2) **aynen kalır, dokunulmaz**; yeni bir ikinci örnek ("sahil taşları") ayrı bir site'de kurulur. **Tek instance'ı yeniden amaçlandırmak** (höyüğü "gemiyi bul"a çevirmek) **önerilmiyor** — mevcut isteğe bağlı B2 içeriğini yok eder, sahip bunu istemedi.
  - **[@byte doğrulama, 22 Ağu]:** `KEEP_CAIRN` diye bir sabit **yok** — kod tabanında hiç geçmiyor. Gerçek ödül mekanizması `ship.addKeepsake("cairn" | "wreath")` (`src/world/ship.ts`), doğrudan bir string literal ile çağrılıyor; adlandırılmış bir sabit değil. Programcı bu ismi aramasın.
  - **[@byte doğrulama, 22 Ağu — önemli, dokümanda eksikti]:** kuzey höyük ritüeli **K35'te ("Beş yeter") "dokunulmaz" değil, zaten canlı ve K35'e özgü bir davranışı var.** `game.ts`'teki `lotusGates()` (satır ~252-255) `WORLD.k35` iken `{ stonesOpen: true, hillOpen: true }` döner — bu **yalnızca lotus kilitlerini** devre dışı bırakır. `hill.findCairn`/`hill.interact` çağrıları (satır ~948, ~1055) run-kind'den bağımsız **her karede çalışır**; K35'te taşlara yaklaşınca HUD zaten "`<b>E</b> rüzgâr taşı — rüzgârın sırasını izle`" istemini gösteriyor (satır ~1004-1009) ve ritüel bitince (satır ~1055-1067) `WORLD.k35` dalı `ship.addKeepsake("cairn")` + `hud.say("Taş güvertede duracak.")` çalıştırıyor — yani K35'te bu ritüel **zaten gemi güvertesine kozmetik bir hatıra bırakan, isteğe bağlı bir yan aktivite.** Sonuç: yeni "sahil taşları" ritüeli, boş bir sahneye değil, **aynı anda canlı olan, aynı `hud.setPrompt()` tek-satır önceliğini paylaşan bir ikinci `cairn`-tipi nesneye** eklenecek. A0'ın implementasyonu, `nearShip → cairn → (yeni) sahil taşı → offer → gatedKind → ripe → hintler → look` önceliğine yeni bir dal eklemeyi ve iki site'in konumlarının çakışmadığını (her ikisi de `PUZZLE.cairnRange`/`cairnHintRange` mertebesinde bir yarıçap kullanıyor) doğrulamayı içermeli — bu, doğrulama sırasında ortaya çıkan, orijinal dokümanda hiç geçmeyen bir kapsam maddesi.
- Yeni site: **3 taş, spawn'a yakın** (mevcut `cairnHintRange` 7 m mertebesinde bir yürüme mesafesinde) — oyuncu "kayboldum" hissetmeden, ama "gemi nerede" sorusunu sorarak taşları bulur.
- **"Doğru algoritma" = sabit sıra (v1), mevcut `cairnSolveOrder` deseninin birebir aynısı** — yeni bir `PUZZLE.shoreStoneOrder` sabiti, örn. `[0, 2, 1]` gibi (kesin sıra `@byte`/playtest kararı). **Rüzgâr ipucu aynen taşınır** — sıra deneme-yanılmayla değil gözlemle öğrenilir, mevcut disiplinle uyumlu ("no cruelty, always a way to learn").
- **Neden sabit sıra, koşu-bazlı (seeded) değil:** basit, test edilebilir, mevcut kodun birebir kopyası kadar ucuz. **Seed'e bağlı (her koşuda değişen) sıra bir Faz-2 fikri olarak işaretli** (§12 K-8) — hem "ilk çözümden sonra ezberlenip anlamını yitirir mi" sorusuna hem de ileride günlük paylaşılan-tohum challenge'ına (§7, §10) doğal bir uzantı olarak.

**Ne zaman çözülüyor — koşu başına bir kez, gelgit başına değil:**

Açılış perdesi **yalnızca koşunun ilk saniyelerinde**, bir kez çözülür. Çözüldükten sonra rehber ok + gelgit kadranı o koşunun **tüm** kalan gelgitleri boyunca aktif kalır — her gelgitte yeniden çözülmez. Gerekçe: Med-Cezir'in tüm tasarımı 3–6 dakikalık, tekrar tekrar oynanan kısa koşulara dayanıyor (§4); her gelgitte aynı bulmacayı tekrarlatmak tam olarak `gdd-lotus-island-scenario.md`'nin kendi uyardığı hatayı (§2.2a: "zorunlu oyalanma tuzağın amacını öldürür") üretir ve "bir gelgit daha" isteğini boğar. **Yeni bir koşu** (`fullRestart()` — hub'dan yeniden başlatma, leaderboard'a yeni bir deneme) açılış perdesini **yeniden tetikler.** Bu, istenmeyen bir sürtünme değil, kasıtlı bir sonuç: speedrun'da açılış perdesi koşunun **zamanlı bir parçası** olur — sırayı ezbere bilen bir oyuncu bunu hızlı geçer, bu da K35'in kaybettiği "adayı okuyabiliyorum" ustalık fantezisinin (§1) küçük, ucuz bir geri kazanımı.

**Perde 0 ile ilişki (§5.2'ye bakmadan önce sırası önemli):** mandat kartı **önce** gösterilir (kural sözle söylenir), kontrol serbest kalınca oyuncu **gemiyi görmeden** başlar (kural eylemle yaşanır). İki perde art arda, aynı anlamı iki farklı kanaldan veriyor — bu kasıtlı bir tekrar, gereksiz değil (compulsion-loop araştırması, §2: sinyal net ve tekrar eden olmalı).

**Gemi neden zaten görünmüyor — bir gizleme hilesi değil, bir konum kararı:** bugünkü `PLAYER.spawn` gemiye (`SHIP.pos`) neredeyse bitişik (`real` profilde `{x:3.2, z:-146}` vs `{x:0, z:-154}` — **[@byte doğrulama] ölçülen mesafe ≈ 8,6 m** (dx 3.2, dz 8.0), dokümanın "~10 m" tahmini biraz iyimser ama büyüklük mertebesi doğru). Bu, yeni isteğin çalışması için **yetersiz** — spawn'ın adanın iç kesimine ya da geminin göremeyeceği bir noktaya taşınması gerekiyor. Öneri: yeni bir `PLAYER.spawn` 🔬 (kesin koordinat playtest'te, mevcut tepe/burun/bitki örtüsü doğal siperini kullanarak seçilmeli — ekranda gerçekten görünmediği in-game doğrulanmalı, kâğıt üstü mesafe hesabı yetmez, bu projenin kendi disiplini). **Yeni bir "gizle/göster" render sistemi gerekmiyor** — mevcut arazi/bitki örtüsü siperi zaten yeterli olmalı; gemi oradadır, sadece görüş hattı yoktur.
- **[@byte doğrulama, 22 Ağu — düzeltme]:** "mevcut sis... zaten yeterli olmalı" ifadesi sisin katkısını abartıyor. `real` profilin `FogExp2` yoğunluğu `0.0044` (`WORLD.fogDensity`); bu yoğunlukta 8-15 m mesafede sis katsayısı `exp(-(yoğunluk·mesafe)²)` formülüyle **≈0,998** — yani pratikte sıfır etki. Sis bu yoğunlukta ancak ~150-300 m mertebesinde belirginleşiyor. **Gizleme neredeyse tamamen arazi/bitki örtüsü geometrisine bağlı olacak, sis'e değil.** `terrain.ts`'teki yükseklik alanı (`heightAt`) düşük frekanslı, yumuşak bir sinüs-gürültüsü + tek bir `LANDMARK.hill` tepe noktasından oluşuyor — yeni bir spawn noktasıyla gemi arasında hazırda bloke edici bir sırt/tepe olduğu **garanti değil**. Bu, dokümanın kendi K-7 kararını ("açık, in-game doğrulama gerekiyor") doğruluyor ve güçlendiriyor — ama K-7'yi "sadece koordinatı taşı, sis+arazi muhtemelen halleder" değil, "muhtemelen `LANDMARK.hill`'in ya da yoğun bir bitki kümesinin arkasında bir nokta seçip donmuş-kare (`freeze()` + kamera) ile fiilen doğrulamak gerekecek" olarak okumalı.

**Başarısızlık durumu yok.** `hillPuzzle.interact()`'in bugünkü davranışı (yanlış taşa dokunmak ilerlemeyi sıfırlamaz, sadece ilerletmez) aynen taşınıyor — bu projenin "kalıcı kayıp yok" ilkesiyle zaten uyumlu, yeni bir tasarım kararı gerektirmiyor.

**Pusulanın unutuşla ilişkisi (sahibin 4. sorusu):** çözüldükten sonra beliren "pusula" **yeni bir asset/sistem değil — bugün zaten var olan rehber ok.** Bu yüzden unutuşla etkileşimi de **zaten tanımlı**: `gdd-memory-system.md` §3.2 eşik 2'de ("Kayış") pusula oku zaten kayboluyor, eşik altına inince geri geliyor. Açılış perdesi bu davranışı **değiştirmiyor**, yalnızca oku ilk kez *etkinleştiriyor*. Yani: taşları çözmeden önce ok yok (bilgi hiç kazanılmamış); çözdükten sonra ok var ama unutuş yükselince yine kaybolabilir (bilgi kazanılmış ama unutulabilir) — tema ile birebir tutarlı, ek kural yazmaya gerek yok.

**Gelgit kadranıyla sıralama:** gelgit kadranı (§5.3) da açılış perdesi çözülene kadar **pasif/görünmez** kalıyor — kadran geminin nereye göre "derin/sığ" olduğunu ölçüyor, bir referans noktası bilinmeden göstermek anlamsız ve kafa karıştırıcı olurdu. Sıra: **taşlar çözülür → rehber ok + gelgit kadranı birlikte açılır → Med-Cezir döngüsü (§4.1 madde 1) başlar.**

### 5.2 Beyan anı — üç temas noktası, gerçek metin

`gdd-lotus-island-scenario.md`'nin üç-yer modeli (hub tooltip → nick modalı → Perde 0 kartı) korunuyor; **içerik Med-Cezir'e özel olarak yeniden yazıldı** — artık "acele et" demiyor, **kuralın kendisini** söylüyor.

| Yer | Metin | Neden |
|---|---|---|
| **Hub, koşu düğümü tooltip'i** | *"Derine git, çiçek bul. Bankaya yatırmadığın, unutuşun riskindedir."* | Oyuncu tıklamadan önce oyunun **türünü** anlar — bu bir keşif oyunu değil, bir bahis oyunu. |
| **Nick modalı altı** | *"Med-Cezir: elindeki her çiçek riskte, gemiye ulaştırdığın asla gitmez. Süren tutuluyor."* | Zaten süre/leaderboard bağlamı; kural + rekabet aynı cümlede. |
| **Perde 0 kartı** (kontrolden hemen önce, `MANDATE_HOLD_S` = 2.5 s, atlanabilir — sabit korunuyor) | *("BANKAYA YATIRMADIĞIN HER ŞEY RİSKTE."/"GEMİYE ULAŞTIRDIĞIN ASLA GİTMEZ." iki büyük satır, altında küçük:) "5 lotus · gemiye teslim et · dümene geç"* | Kontrolü almadan hemen önceki son söz — bahsi net, tek okumada anlaşılır iki cümleye indiriyor. |

**[@byte doğrulama, 22 Ağu — önemli, dokümanda eksikti]:** üç temas noktasının ilk ikisi (hub tooltip `.hub-island-desc` `index.html`'de "Beş yeter" kartı altında zaten var; nick modalı `src/ui/menu.ts`'te zaten var, K35'in mevcut giriş akışının parçası) **gerçekten sadece metin düzenlemesi** — doğrulandı. **Ama Perde 0 mandat kartı kodda hiç yok.** `Hud.showCard(kind, ...)` bugün yalnızca `"won" | "lost" | "dusk" | "gameover"` kabul ediyor (`src/ui/hud.ts`); `MANDATE_HOLD_S` de kod tabanında hiçbir yerde tanımlı değil (yalnızca tasarım dokümanlarında geçiyor — bunu doküman kendisi de §8 tablosunda "önerilmiş, kodda yok" diyerek doğru söylüyor). §7 tablosundaki "İskelet aynı kalıyor" ifadesi bu yüzden yanıltıcı okunabilir: **kod iskeleti değil, yalnızca tasarım fikri** korunuyor — A3'ün kart kısmı bir metin düzenlemesi değil, **sıfırdan yeni bir modal/faz-öncesi kapı** (yeni `showCard` kind'i ya da ayrı bir bileşen, `MANDATE_HOLD_S` zamanlayıcısı, atlama girişi, `fullRestart()`'tan önce nereye oturacağının kararı) — A3'ün sizing/risk notuna bu ayrım eklenmeli (bkz. §10a).

**Neden bu üçü yeterli, dördüncüsü (sürekli HUD uyarısı) gerekmiyor:** `gdd-lotus-island-scenario.md` §4.1'in kendi gerekçesi hâlâ geçerli — kalıcı bir "dikkatli ol" satırı hem `ux/hud.md`'nin "HUD durum bildirir, tehdit bildirmez" ilkesini kırar hem de birkaç dakika sonra görünmez hâle gelir (banner blindness). Bahis bir kere net anlatılmalı, sonra **kadranın kendisi** (§5.3) her an hatırlatmalı — metin değil, gösterge.

**Perde 0 kartına küçük bir ek satır (§5.1'in çapraz referansı):** kartın alt kısmına, mevcut iki cümlenin altına, çok küçük punto: *"Önce sahili bulman gerekecek."* — oyuncu kontrolü aldığında gemiyi görememesini bir hata sanmasın diye tek satırlık bir ön uyarı.

### 5.3 Koşu içinde okunabilirlik — gelgit kadranı

**Önceki taslaktan kasıtlı bir sapma:** ilk tur mevcut rehber oku "ısıtarak" derinlik göstergesine çevirmeyi önermişti. Sahibin yeni gereksinimi ("net iletişim, gerçek challenge") bunu yetersiz kılıyor — bir oyuncu, mevcut bir okun rengini/nabzını *yeni bir bilgi kanalı* olarak fark etmesini bekleyemeyiz; en olası okuma "ok biraz farklı görünüyor" olur, "bu benim risk göstergem" değil. **Karar değişti: gelgit kadranı, rehber oktan ayrı, kendi başına bir HUD öğesi.**

| Özellik | Karar |
|---|---|
| **Nerede** | Ekranın bir köşesinde, mevcut çanta/teslim sayaçlarıyla aynı aile (DOM/CSS, `.hud` bileşenleri) — rehber okun *yanında*, üstünde değil. |
| **Ne değil** | Unutuşun kendi ölçeği **değil.** `gdd-memory-system.md` §10'un "unutuşun barı yok" ilkesi bozulmuyor — kadran, oyuncunun gemiye **mesafesini** gösteriyor, ki bu nesnel bir konum bilgisi (pusula gibi), unutuşun kendi 0-1 değeri değil. Bu ayrım önemli ve dokümante edilmeli: **mesafe = gösterilebilir, unutuş = asla sayı/bar olarak gösterilmez.** |
| **Görsel dil** | Üç bant, `art-bible.md`'nin **mevcut** gün-saati paletini ödünç alıyor (yeni renk icat edilmiyor, `art-bible.md` §2 "günün ilerleyişi" sırasıyla aynı): **güvenli** (gemi aurası içi, kadran boş/görünmez) → **temkin** (`#f5d29a` altın) → **riskli** (`#e08a86` gül, yavaşça nabız atan — `art-bible.md`'nin fotosensitivite kuralına uyarak **≥ 1.5 s** periyotla, asla stroboskopik değil). **Kırmızı yok** — art-bible §9'un "kırmızı hasar flaşı yasak" kuralına bilerek uyuluyor. |
| **İlk maruziyet — bağlamsal, tek seferlik ipucu** | Oyuncu kadranı ilk kez "temkin" bandına geçtiğinde (yaklaşık §4.2'nin 1:15'i), kadranın yanında **tek seferlik**, kısa bir metin belirir: *"Ada derinleşiyor — geri dönüş uzuyor."* 2-3 saniye kalır, söner, bir daha hiç görünmez. Mevcut kontrol-ipucu/hint sisteminin (`hud.ts` `startHintTimer` ailesi) aynısı — yeni bir sistem değil. **[@byte doğrulama, 22 Ağu — düzeltme]:** yanlış hedef. `startHintTimer()` "aile" değil — `#hint` adlı **tek** bir DOM elemanını, yalnızca koşu başında bir kez, sabit `12000` ms sonra söndüren, parametresiz, tek amaçlı bir metottur (dokunmatik kontrol şemasını gösterir). Doğru yeniden-kullanım hedefi **`hud.say(msg)`** — zaten açılış diyalog satırları ve dusk uyarısı için kullanılan, gerçekten genel, tek-satırlık toast mekanizması. Küçük bir pürüz: `say()`'in de süresi `toastTimer = 130` (60 Hz'de ~2,17 s) hard-code — parametreli değil. §8'in önerdiği `TIDE_FIRST_CAUTION_HINT_S` (2,5 s) ve `TIDE_SUMMARY_HOLD_S` (2,0 s) gibi farklı sürelere gerçekten ihtiyaç varsa, `say()`'e opsiyonel bir süre parametresi eklemek gerekir — "aynısını kullan" birebir kopyala-yapıştır değil, küçük bir imza değişikliği. |
| **Perde 0'daki çapraz referans** | Mandat kartının altına, küçük punto: *"Sağdaki/soldaki gösterge sana ne kadar derinde olduğunu söyler."* — oyuncu kadranı ilk gördüğünde (taşları çözdükten sonra, §5.1) zaten "bu neydi" sorusunu sormamış olur. |
| **Açılış perdesiyle sıralama** | Kadran, taşlar çözülmeden **hiç render edilmez/pasif** — §5.1'in son maddesi. |

### 5.4 İş bölümü — bu benim (game-design) alanım, neresi `@tide`'ın

Bu bölümdeki metin (§5.2) ve kadranın **işlevsel** sözleşmesi (§5.3 tablosu — ne zaman hangi bant, ne zaman ipucu) + açılış perdesinin site/sıra/zamanlama sözleşmesi (§5.1) benim işim ve burada tamamlandı; bir programcıya doğrudan verilebilir.

**Ama** kadranın tam yerleşimi (mevcut HUD'daki diğer öğelerle çakışmaması, mobil dokunmatik düzende yer bulması, gerçek görsel hiyerarşi — göz hangi sırayla nereye gidiyor), Perde 0 → oyun akışının geçiş hissi (kart ne kadar "ağır" durmalı, atlama jesti neye benziyor) **ve** açılış perdesinin kamera/spawn hissi (oyuncu "kayboldum, kötü bir şekilde" mi hissediyor yoksa "meraklı, iyi bir şekilde" mi — bu ince çizgi tamamen yerleşim/kamera işi) **`ux-designer` (`@tide`) alanı.** Önceki turda da nick-kapısı akışı için aynı sınırı çizmiştim (`gdd-lotus-island-scenario.md` §12.5) — bu **onun devamı**, ayrı bir borç değil. **Bu, işi bloklamıyor:** §5.1–§5.3'teki tablolar yeterince somut, bir programcı ilk sürümü kurabilir; `@tide`'ın turu ilk playtest'ten önce ya da sonra, ayrı bir dilim olarak gelebilir (§10, dilim B2).

---

## 6. Değerlendirilip seçilmeyen alternatifler (kayıt için)

Bunlar artık **açık seçenekler değil** — sahip Med-Cezir'i seçti (K-2, kapandı). Kayıt amaçlı özetleniyor; ayrıntılı gerekçe bu dosyanın önceki sürümündeydi, hâlâ git geçmişinde.

### 6.1 Seçenek 0 — yalnız okunabilirlik
D0–D4 (`gdd-lotus-island-scenario.md`). Yeni karar noktası eklemiyor. **Seçilmedi** — karar yoksunluğunu çözmüyor.

### 6.2 Seçenek 2 — "Gün Batmadan" (Sundowner), çıplak zaman-saldırısı
HUD'u sürekli tam görünür yapan bir zaman-saldırısı çerçevesi. **Seçilmedi** — `gdd-memory-system.md` P2'nin unutuş-şiirselliğini zayıflatıyordu. Tek hayatta kalan parçası (`delivered`/saat asla tam solmaz) Med-Cezir'e zaten emildi (§8).

### 6.3 Seçenek 3 — "Doryseus Uyanıyor" (Waking Doryseus), Groundhog-Day bilgi döngüsü
En güçlü tematik uyum, en pahalı/riskli inşa. **Şimdi seçilmedi, ama kapanmadı** — Med-Cezir ölçüldükten sonra hâlâ geçerli bir v2 yönü olarak işaretli kalıyor (K-3, açık — §12).

---

## 7. Önceki "Günün Adası" turundan ne kaldı

| Önceki öge | Sonuç |
|---|---|
| D0–D4 okunabilirlik düzeltmeleri | **Emildi, D0 hariç.** Muğlak teslim sayacı **düşüyor** — `delivered` hiç muğlaklaşmıyor (§5, §12 K-1 — **[K] kapandı, sahip onayladı: seçenek A**). |
| FIRST_LOTUS garantili ilk hasat | **Aynen alınıyor.** |
| Hatırla (Q) fiili | **Aynen alınıyor**, ikincil gezinim aracı — gelgit kadranı birincil. |
| Perde 0 mandat kartı | **İskelet aynı** (`MANDATE_HOLD_S` = 2.5 s, atlanabilir), **metin Med-Cezir'e özel yeniden yazıldı, artı açılış-perdesi ön uyarısı eklendi** (§5.1–§5.2). |
| — *(yeni, bu turda eklendi)* | **Gemiyi bulma açılış perdesi + sahil taşları** — sahibin üçüncü isteği, `hillPuzzle.ts` deseninin yeniden kullanımı (§5.1). Önceki turda yoktu. |
| Ayrılış hesap kartı | **Aynen alınıyor, zenginleşti** — artık gelgit bazlı ("kaç gelgit, en iyisi kaç çiçek, kaç gelgit boş döndü"). |
| Ateş / barınak / sandık | **v1 dışı.** Fikrin özü (ileri karakol → gelgit yarıçapını küçültme) Med-Cezir ölçüldükten sonra değerlendirilecek bir stretch (§10, §12 K-4). |
| Zorunlu nick + tek koşu (K-A) | Değişmedi, sahip zaten karar vermişti. |
| Günlük paylaşılan tohum + leaderboard | **Sırası ertelendi**, fikir kalıyor — Med-Cezir ölçüldükten sonra Faz C (§10, §12 K-5). |
| Klasik 12'li koşunun kaldırılması (K-A) | Etkilenmiyor. |

---

## 8. `src/constants.ts` etkisi

| Sabit | Bugün | Öneri | Not |
|---|---|---|---|
| `MEM_*`, `CARRY_CAPACITY`, `LOTUS_TARGET`/`LOTUS_TOTAL` (5), `HARVEST_HOLD`, evre süreleri, `MEM_FORGET_FLOOR`, `SHIP_RELOCATE_MIN_M` | mevcut | **Değişmiyor.** | Med-Cezir motoru bozmuyor. |
| *(yeni)* `LOTUS.depthBias` | yok | 🔬 `0.4` (0.2–0.7) | Olgun çiçek yeniden-doğuşunda gemiye uzaklığı ağırlıklandıran katsayı. |
| *(yeni)* `TIDE_GAUGE_SAFE_RADIUS_M` | yok | mevcut `SHIP.range`/aura ile aynı (~6.5–8 m) | Kadran boş/görünmez kalan bant. |
| *(yeni)* `TIDE_GAUGE_CAUTION_RADIUS_M` | yok | 🔬 `40` (25–60) | Temkin bandının başladığı mesafe. |
| *(yeni)* `TIDE_GAUGE_MAX_M` | yok | 🔬 `ISLAND.radius * 0.75` (≈120 m `real`) | Riskli bandın doyduğu mesafe. |
| *(yeni)* `TIDE_GAUGE_PULSE_PERIOD_S` | yok | 🔬 `2.0` (1.5–3) | Riskli banttaki yavaş nabız — fotosensitivite kuralına (≥1.5 s) bilerek uyuyor. |
| *(yeni)* `TIDE_FIRST_CAUTION_HINT_S` | yok | 🔬 `2.5` (2–4) | §5.3'ün tek seferlik "ada derinleşiyor" ipucunun ekranda kalma süresi. |
| *(yeni)* `TIDE_SUMMARY_HOLD_S` | yok | 🔬 `2.0` (1.5–3) | "+N teslim edildi" toast'ının kalma süresi. |
| `MANDATE_HOLD_S` (`gdd-lotus-island-scenario.md`'den) | önerilmiş, kodda yok | **Aynen alınıyor**, `2.5` s. | Yalnızca kart metni değişti (§5.2), zamanlama değil. |
| `MEMORY.vagueThreshold` | önerilmemiş, kodda yok | **Eklenmiyor.** | K-1 **[K] kapandı** — §12. |
| `FIRST_LOTUS_RADIUS` (22), `FIRST_LOTUS_CONE_DEG` (60), `RECALL_*` | önerilmiş, kodda yok | **Aynen alınıyor.** | — |
| `RUN_CLOCK.minOpacity` (mevcut 0.55) | mevcut | **Aynı davranış `delivered` sayacına da uygulanır.** | K-1 **[K] kapandı** ile birlikte gidiyor. **[@byte doğrulama, 22 Ağu — düzeltme]:** "aynı davranış" birebir kopyalanamaz. `#delivered`, `index.html`'de `#carried`/`#target` ile birlikte tek bir `#quest` panelinin içinde ve `Hud.update()` opaklık/blur'u **tek seferde `#quest` konteynerine** yazıyor (`this.quest.style.opacity`/`filter`, alt elemanlara ayrı ayrı değil). `#runClock`'un kendi bağımsız üst-seviye DOM elemanı var, `#delivered`'ın yok. K-1'in istediği (yalnız `delivered` hiç solmasın, `carried`/`target` eskisi gibi solmaya devam etsin) doğrudan uygulanamaz — ya `#delivered`'ı `#quest`'ten çıkarıp kendi opaklığı olan ayrı bir elemana taşımak (DOM/CSS küçük bir yeniden yapı) ya da alt elemana ters-çarpan bir opaklık telafisi eklemek gerekir. A4'ün sizing notuna eklenmeli (§10a). |
| *(yeni)* `PUZZLE.shoreStoneSpots` | yok | 3 site, spawn'a yakın (kesin koordinat 🔬, in-game doğrulanmalı) | Yeni açılış ritüelinin taş konumları — `BEAUTY.cairnSpots`'un kardeşi, mevcut kuzey höyüğe dokunmuyor. |
| *(yeni)* `PUZZLE.shoreStoneOrder` | yok | 🔬 sabit sıra (örnek değer olarak yazılan `[0, 2, 1]`, mevcut `cairnSolveOrder` ile **aynı dizi değil** — kafa karışıklığını önlemek için farklı somut bir sıra seçilmeli, örn. `[1, 0, 2]`) | v1'de sabit; koşu-bazlı (seeded) sıra Faz-2 fikri (§12 K-8). **[@byte doğrulama]:** dokümanın örnek değeri, kuzey höyüğün gerçek `PUZZLE.cairnSolveOrder = [0, 2, 1]` sabitiyle birebir aynı literal — muhtemelen kasıtsız, ama iki ayrı ritüelin sırası aynı dizi yazılırsa (özellikle ikisi de aynı koşuda K35'te canlıyken, bkz. §5.1 doğrulama notu) playtest'te "ikisi de aynı sırayla mı çözülüyor" karışıklığı yaratabilir. |
| *(yeni)* `PUZZLE.shoreStoneRange` / `shoreStoneHintRange` | yok | mevcut `cairnRange` (2.35)/`cairnHintRange` (7.0) ile aynı değerler önerilir | Aynı his, ayrı sabit isimleri. |
| *(değişen)* `PLAYER.spawn` | `{x:3.2, z:-146}` (`real`) — gemiye (`SHIP.pos` `{0,-154}`) neredeyse bitişik | 🔬 yeni konum, gemiye görüş hattı olmayan bir nokta (mevcut arazi/bitki örtüsü siperiyle) | §5.1'in "gemi neden zaten görünmüyor" maddesi — **bu bir render/gizleme sistemi değil, bir spawn-yeri kararı.** Kesin koordinat in-game doğrulanmalı. |
| *(yeni state alanı, `types.ts`)* `shoreFound: boolean` | yok | K35/edge koşusunda `false` başlar, taş ritüeli `"done"` dönünce `true`; **klasik koşuda `true` başlar** (aşağıya bakın) | Rehber ok + gelgit kadranı bu bayrağa da bağlanır (`st.phase === "play" && st.memory < MEMORY.blindThreshold && !nearShip && st.shoreFound`, mevcut `game.ts:1110` koşuluna bir madde ekleniyor). `fullRestart(kind)`'ta `kind === "edge" ? false : true`'a döner. **[@byte doğrulama, 22 Ağu — dokümanda eksikti]:** bugünkü rehber-ok koşulu `WORLD.k35`'e hiç bakmıyor, klasik 12-lotus koşusunda da aynen çalışıyor. Koşulsuz `&& st.shoreFound` eklenirse ve `shoreFound` yalnızca K35'e özgü bir ritüelle `true` olabiliyorsa, **klasik koşuda rehber ok kalıcı olarak kaybolur** — bu satırdaki "klasik koşuda `true` başlar" düzeltmesi bunu önlüyor (bkz. §10a A0, kabul kriteri 4). |

Formüllerde değişiklik yok (`gdd-memory-system.md` §4, `gdd-lotus-collection.md` §4 birebir geçerli).

---

## 9. Asset listesi

**Yeni 3D asset yok.** Sahibin "assetler aynı kalacak" şartı Med-Cezir'de tam karşılanıyor — bu bir HUD/sunum ve yerleşim-ağırlığı işi, geometri işi değil.

| # | Öge | Tip | Kaynak |
|---|---|---|---|
| A1 | Gelgit kadranı (§5.3) | DOM/CSS, `.hud` ailesinin yeni bir üyesi | Mevcut çanta/teslim sayacı bileşenlerinin kardeşi; yeni mesh/doku yok. |
| A2 | Perde 0 mandat kartı | DOM/CSS | Mevcut `.card`/`parchment-panel` görsel dili yeniden kullanılabilir ama **[@byte doğrulama]** `Hud.showCard()` bugün yalnızca `won/lost/dusk/gameover` kind'lerini biliyor, `MANDATE_HOLD_S` kodda yok — bu satır metin değil, yeni bir kart-kind'i/faz-öncesi state işi (bkz. §5.2 doğrulama notu, §10a A3). |
| A3 | Tek seferlik "ada derinleşiyor" ipucu | DOM/CSS | **[@byte doğrulama]** `startHintTimer` değil `hud.say(msg)` — bkz. §5.3 doğrulama notu, §10a A2. |
| A4 | Gelgit özeti toast ("+N teslim edildi") | DOM/CSS | Mevcut toast dili; ses "kısa nefes" ailesinde kalır (`gdd-lotus-collection.md` §9 fanfar yasağı korunuyor). |
| A5 | Ayrılış hesap kartı (gelgit bazlı) | DOM/CSS | `gdd-lotus-island-scenario.md` N5'in aynısı, veri kaynağı zenginleşti. |
| A6 *(isteğe bağlı, düşük öncelik)* | Gemi çevresinde "güvenli liman" zemin ipucu | Prosedürel shader/decal | Yeni model değil; mevcut gemi/deniz shader ailesinin bir uzantısı. **Ölçümden sonra**, gerekirse. |
| A7 *(yeni, bu turda eklendi)* | **Sahil taşları** (§5.1) | **Sıfır yeni 3D asset** — `hillPuzzle.ts`'in taş/kaya mesh'lerinin (`IcosahedronGeometry` yığını, mevcut `PALETTE.marble`/`petalRipeTint`/`lotusHeart` materyalleri) **aynısı**, yeni bir site'de ikinci kez örnekleniyor | Kod: `buildHillPuzzle()`'ın deseninin parametreleştirilmiş ikinci instance'ı (öneri, refactor kararı `@byte`'a bırakılıyor). Görsel olarak mevcut kuzey höyük taşlarıyla **aynı aile** — oyuncu daha önce görmediği bir form/malzeme görmüyor. |
| A8 *(yeni, bu turda eklendi)* | Rehber ok / "pusula" | **Sıfır yeni asset** | Mevcut `guideArrow` mesh/materyali (`game.ts:123`) — açılış perdesi yalnızca onu ilk kez *etkinleştiriyor*, yeni bir pusula objesi yaratmıyor (§5.1). |

FIRST_LOTUS parıltısı gibi öğeler zaten `gdd-lotus-island-scenario.md`'nin A10'unda vardı ve değişmeden geçerli.

---

## 10. Geliştirme planı — Med-Cezir'e özel sıralama

| # | Dilim | Kim | Bağımlılık | Ne içerir |
|---|---|---|---|---|
| **A0** | Açılış perdesi — sahil taşları + spawn taşınması | `@byte` | yok | §5.1: `buildHillPuzzle()`'ı genelleştir, ikinci site'de örnekle; `PLAYER.spawn` taşı, `shoreFound` bayrağı, rehber ok koşulu güncellenir. **Diğer her şeyin önkoşulu** — gelgit kadranı ve rehber ok bu bayrağa bağlı (§5.1 son madde). |
| **A1** | Yerleşim yanlılığı | `@byte` | yok (A0'dan bağımsız çalışabilir, paralel) | `LOTUS.depthBias`, mevcut reddetmeli örneklemeye ekleniyor. |
| **A2** | Gelgit kadranı — işlevsel v1 | `@byte` + `@glyph` | A0, A1 | §5.3 tablosu: üç bant, tek seferlik ipucu, mevcut hint sistemini kullanır; `shoreFound` olmadan render edilmez. |
| **A3** | Challenge beyanı — üç temas noktası + açılış ön uyarısı | `@glyph` | yok | §5.2 metinleri; hub tooltip, nick modalı, Perde 0 kartı ("önce sahili bulman gerekecek" satırı dahil). |
| **A4** | Gelgit özeti toast + `delivered`/saat asla solmaz | `@glyph` | A2 | §8, K-1 **[K] kapandı** — sahip onayladı, uygulanabilir. |
| **A5** | Ayrılış hesap kartı, gelgit bazlı | `@glyph` | A4 | §9 A5. |
| **B1** | `@tide` akış/yerleşim turu — kadran + Perde 0 geçişi + açılış perdesinin kamera/spawn hissi | `@tide` | A0, A2, A3 | §5.4'te flag edildi; işi bloklamıyor, paralel ya da sonra gelebilir. |
| — | **Ölçüm durağı** | — | A0–A5 | Aynı geri bildirimi veren oyunculara tekrar oynatılır: "ne yapman gerekiyordu" + "riski anladın mı" + "gemiyi bulmak eğlenceli miydi, sinir bozucu muydu" soruları. |
| **C1** | Ateş → "ileri üs, gelgit yarıçapını küçültür" (stretch) | `@byte` | ölçüm | Yalnızca ölçüm Med-Cezir'in tek başına yeterli olmadığını gösterirse. |
| **C2** | Sahil taşları sırası koşu-bazlı (seeded) yapılsın mı | `@byte` | ölçüm | §12 K-8 — yalnızca sabit sıra "bir kere çözülüp anlamını yitiriyor" ölçülürse. |
| **D1** | Günlük paylaşılan tohum + leaderboard entegrasyonu | `@axiom` + `@byte` | ölçüm | `gdd-lotus-island-scenario.md` §12.4–12.6 sayıları aynen kullanılabilir; C2 kabul edilirse taş sırası da günlük tohuma bağlanabilir. |
| **D2** | Seçenek 3 ("Doryseus Uyanıyor") — yeniden değerlendirme | `game-designer` | ölçüm | Yalnızca Med-Cezir "tekrar oynanmaya değer" eşiğini geçemezse. |

**Kritik yol:** A0 → A2 → A3 → A4 → A5 → ölçüm (A1 paralel gidebilir). Geri kalan her şey ölçümün sonucuna göre.

**[@byte doğrulama, 22 Ağu]:** yukarıdaki tablonun bağımlılık sütunu ile "Kritik yol" cümlesi birbirini tam tutmuyor — tablo A3'ün bağımlılığını "yok" yazıyor ama kritik yol cümlesi A3'ü A2'nin ardına koyuyor; A4 de aynı şekilde A2'ye "bağımlı" gösteriliyor ama A4'ün asıl işi (`delivered` sayacının hiç muğlaklaşmaması, K-1) A2 (gelgit kadranı) hiç var olmasa da yapılabilir — kod tarafında ortak bir state paylaşmıyorlar. Bu ufak bir tutarsızlık, engelleyici değil; gerçek zorunlu bağımlılık yalnızca **A0 → A2** (`shoreFound` state'i) ve **A2 → B1** (UX turu bitmiş bir kadran ister). Düzeltilmiş, dosyalar/fonksiyonlar ve kabul kriterleriyle somutlaştırılmış plan **§10a**'da.

---

## 10a. Doğrulandı — implementasyona hazır plan (`@byte`, 22 Ağu 2026)

> Bu bölüm §10'un yerini alır (programcı için tek doğru kaynak budur); §10 tasarım gerekçesi/tarihçe olarak kalıyor. Aşağıdaki her dilim: dokunduğu gerçek dosya/fonksiyon, somut kabul kriteri, dürüst risk notu.

### A0 — Açılış perdesi: sahil taşları + spawn taşınması

**Kim:** `@byte` · **Bağımlılık:** yok (kodlama açısından) · **Boyut:** orta-büyük (dokümanın ima ettiğinden daha büyük, aşağıya bakın), en az bir in-game doğrulama turu gerektirir.

**Dokunulan dosyalar/fonksiyonlar:**
- `src/world/hillPuzzle.ts` — `buildHillPuzzle()`'ı `buildStoneRitual(opts)` genel fabrikasına çıkar; mevcut `buildHillPuzzle()` bunu bugünkü `BEAUTY.cairnSpots`/`PUZZLE.cairnSolveOrder`/`cairnRange`/`cairnHintRange` ile çağıran ince bir sarmalayıcıya dönüşür (kuzey höyük çağrı noktası davranışsal olarak birebir aynı kalır).
- `src/constants.ts` — yeni `PUZZLE.shoreStoneSpots/Order/Range/HintRange` (bkz. §8, farklı bir sıra literalı seçilmeli, `cairnSolveOrder` ile aynı olmasın); `PLAYER.spawn` (yalnız `real` profil).
- `src/game.ts` — yeni `const shore = buildStoneRitual(...)`, sahne grubuna eklenir (satır ~107-119 civarı), `fullRestart()`'ta `shore.reset()` (satır ~370 civarındaki `stones.reset()`/`hill.reset()`'in yanına). **Etkileşim/prompt zincirine** (satır ~942-1067) yeni bir dal: bugünkü zincir zaten `nearShip → cairn → offer → gatedKind → ripe → stones.hintNear/hill.hintNear → look` sırasıyla tek bir `hud.setPrompt()` yuvasını paylaşıyor; yeni sahil-taşı nesnesi bu zincire ayrı bir dal olarak girmeli, önceliği kararlaştırılmalı.
- `src/types.ts` — `GameState`'e `shoreFound: boolean` eklenir.
- `src/game.ts` guide arrow koşulu (satır 1109-1110, doğrulandı): `st.phase === "play" && st.memory < MEMORY.blindThreshold && !nearShip` → sona `&& st.shoreFound` eklenir.

**Kabul kriterleri:**
1. Yeni koşu başlar başlamaz (kontrol serbest kalır kalmaz) gemi ekranda görünmüyor — **iddia edilen mesafe hesabıyla değil**, `__LOTOPHAGOI_TEST_HOOKS__.freeze()` + donmuş kare ekran görüntüsüyle doğrulanmış olmalı (bkz. §5.1 doğrulama notu — mevcut sis 8-15 m'de etkisiz, gizleme tamamen arazi/bitki geometrisine bağlı).
2. `shoreFound` başlangıçta `false`; sahil taşı ritüeli `"done"` dönünce `true`; her `fullRestart()`'ta `false`'a döner.
3. Rehber ok, `shoreFound === false` iken hiç görünmez (bugünkü koşulda memory/nearShip zaten sağlansa bile).
4. **[@byte doğrulama — dokümanda hiç geçmeyen bir regresyon riski]:** bugünkü rehber-ok koşulu (`game.ts:1109-1110`) `WORLD.k35`'e hiç bakmıyor — **hem klasik 12-lotus koşusunda hem K35'te** aynı şekilde çalışıyor. `&& st.shoreFound` koşulsuz eklenirse ve sahil-taşı ritüeli yalnızca K35'e özgü kurulursa, **klasik koşuda rehber ok bir daha hiç görünmez** (`shoreFound` sonsuza dek `false` kalır) — dokümanın hiçbir yerinde ele alınmamış gerçek bir regresyon. Düzeltme: `fullRestart(kind)` içinde `st.shoreFound = kind !== "edge"` (klasik koşuda baştan `true`, yalnızca K35/edge'de `false` başlar) ya da rehber-ok koşuluna `(!WORLD.k35 || st.shoreFound)` eklemek. Kabul kriteri: "klasik 12-lotus koşusunda rehber ok davranışı bu değişiklikten önce ve sonra birebir aynı."
5. Kuzey höyük ritüelinin K35'teki mevcut davranışı (HUD istemi, `ship.addKeepsake("cairn")` ödülü, "Taş güvertede duracak." mesajı) **değişmeden** çalışmaya devam eder — iki ritüel aynı koşuda aynı anda canlı olduğunda prompt önceliği net ve çelişkisiz.
6. `npx tsc --noEmit` temiz; ilgili `npm run test:assets` şotları (`hub`, `play-mem*`) diff'lenir — bkz. aşağıdaki "Asset-QA riski" notu.

**Risk notu:** dokümanın orijinal tablosu bunu basit bir refactor + koordinat taşıma olarak boyutlandırıyordu. Doğrulama iki gerçek ek maliyet buldu: (a) yeni ritüelin, K35'te zaten canlı olan kuzey höyük ritüeliyle aynı HUD-prompt önceliğini paylaşması gerekiyor (kodda hazır boş bir yuva yok); (b) gemiyi gizlemek kâğıt üstü bir koordinat kararı değil, gerçek bir görüş-hattı doğrulaması — sis bu mesafelerde işe yaramıyor, arazinin doğal siperine güvenmek gerekiyor ve bu garanti değil.

### A1 — Yerleşim yanlılığı

**Kim:** `@byte` · **Bağımlılık:** yok, A0'dan bağımsız · **Boyut:** küçük.

`LOTUS.depthBias` yeni sabiti, `src/world/lotus.ts`'teki mevcut reddetmeli örneklemeye (K35 5-lotus spawn, `gdd-lotus-island-run.md` §3.3) gemiye uzaklığa göre ağırlıklandırma ekler. **[@byte doğrulama]:** bu turda `lotus.ts`'in tam örnekleme fonksiyonunun imzası satır satır incelenmedi (kapsam dışı bırakıldı, düşük risk kabul edildi) — implementasyon öncesi kısa bir okuma yeterli, ayrı bir doğrulama turu gerekmiyor.

**Kabul kriteri:** aynı seed ile art arda birkaç koşuda, gemiye yakın hücrelerde olgun çiçek yoğunluğunun gözle görülür şekilde düşük olduğu doğrulanır (ekran görüntüsü ya da konsol loglu pozisyon dökümü).

### A2 — Gelgit kadranı (tide gauge), işlevsel v1

**Kim:** `@byte` + `@glyph` · **Bağımlılık:** A0 (`shoreFound`) · **Boyut:** orta.

**Dokunulan dosyalar:** yeni `.hud` ailesi elemanı (`index.html` + `hud.css`), `src/ui/hud.ts`'e yeni bir `update()` dalı, üç bant renk/nabız mantığı (`art-bible.md` §2 hex'leri, ≥1.5 s periyot — bkz. §8 sabitleri).

**[@byte doğrulama — düzeltme]:** §5.3'ün "tek seferlik ipucu" satırı `startHintTimer`'ı değil **`hud.say(msg)`**'i hedeflemeli (bkz. §5.3'teki doğrulama notu) — `say()`'in sabit ~2,17 s süresi, önerilen `TIDE_FIRST_CAUTION_HINT_S`/`TIDE_SUMMARY_HOLD_S` sabitleriyle tam örtüşmüyor; `say()`'e opsiyonel süre parametresi eklemek gerekebilir (küçük ek iş, ticket'a dahil edilmeli).

**Kabul kriterleri (§5.3 tablosuna ek):**
1. Kadran `shoreFound === false` iken hiç render edilmez/DOM'da pasif.
2. **Kadran ve ona bağlı tüm mantık `!WORLD.k35` iken de görünmez/etkisiz kalır** — bu doküman yalnızca K35 ("Beş yeter") döngüsünü hedefliyor (`gdd-lotus-island-run.md`'nin üstüne geçiyor, klasik 12-lotus koşusuna dokunmuyor); bu şart orijinal dokümanda örtük ama açıkça yazılmamıştı, burada açık kabul kriteri yapılıyor.
3. Nabız periyodu ölçülüp ≥1.5 s olduğu doğrulanır (art-bible §4 fotosensitivite kuralı).

### A3 — Challenge beyanı: üç temas noktası + açılış ön uyarısı

**Kim:** `@glyph` · **Bağımlılık:** yok · **Boyut:** hub tooltip + nick modalı **küçük** (mevcut elemanların metin düzenlemesi, doğrulandı); Perde 0 kartı **orta** (yeni kod, aşağıya bakın).

**[@byte doğrulama — önemli düzeltme]:** dokümanın "İskelet aynı kalıyor" ifadesi kod değil tasarım devamlılığı anlamına geliyor. `Hud.showCard(kind, ...)` bugün yalnızca `"won"|"lost"|"dusk"|"gameover"` kabul ediyor; `MANDATE_HOLD_S` kodda hiç yok. Perde 0 kartı için gereken: yeni bir `showCard` kind'i (ya da ayrı bir modal bileşeni), `MANDATE_HOLD_S` zamanlayıcısı, atlama girişi (tuş/dokunuş), ve bunun `fullRestart()`/kontrolün serbest kalması akışına nerede oturacağının kararı (kontrolden hemen önce mi, `fullRestart()` içinde bir bekleme adımı mı). Bu, "metni değiştir" değil, **küçük ama gerçek bir yeni state/akış parçası.**

**Kabul kriterleri:**
1. Hub tooltip + nick modalı metinleri değişti, mevcut DOM elemanları yeniden kullanıldı (yeni bileşen yok).
2. Perde 0 kartı: yeni metin + "önce sahili bulman gerekecek" satırı + "gösterge sana ne kadar derinde olduğunu söyler" satırı görünüyor, `MANDATE_HOLD_S` (2.5 s) sonra ya da input ile atlanabiliyor, yalnızca K35 girişinde tetikleniyor.

### A4 — Gelgit özeti toast + `delivered`/saat asla solmaz

**Kim:** `@glyph` · **Bağımlılık:** kod olarak yok (A2 olmadan da yapılabilir; K-1 kapandı, `deliver()`'a bağlı) · **Boyut:** küçük-orta.

**[@byte doğrulama — iki ayrı düzeltme]:**
1. **Mevcut hata tam olarak dokümanın dediği gibi, ama sebebi netleştirilmeli:** `hud.ts`'teki muğlak metin (`st.delivered <= 0 ? "—" : ...`) bugün **`WORLD.k35` koşuluna bağlı, `memory` eşiğine değil** — yani K35'te `memory` ne olursa olsun her zaman muğlak gösteriliyor. K-1'in istediği "hiç muğlaklaşmasın" düzeltmesi, bu `if (WORLD.k35) {...} else {...}` dalını kaldırıp her zaman `String(st.delivered)` yazmak kadar basit.
2. **`RUN_CLOCK.minOpacity` davranışını `delivered`'a "aynen" uygulamak DOM yapısı yüzünden mümkün değil** (bkz. §8'deki doğrulama notu) — `#delivered`, `#carried`/`#target` ile birlikte tek bir `#quest` konteynerinin içinde ve opaklık/blur konteyner seviyesinde tek seferde uygulanıyor. Ya `#delivered`'ı ayrı bir elemana taşımak (küçük DOM/CSS değişikliği) ya da ters-çarpan bir opaklık telafisi gerekiyor. Ticket bu detayı içermeli, "K-1 ile birlikte gider" demek yetmiyor.

**Kabul kriterleri:** `delivered` her `memory` değerinde okunaklı kalır (RUN_CLOCK ile aynı taban opaklık); `carried`/`target` eskisi gibi solmaya devam eder (yalnızca `delivered` istisna); "+N teslim edildi, M kaldı" toast'ı her bankalamada görünür.

### A5 — Ayrılış hesap kartı, gelgit bazlı

**Kim:** `@glyph` · **Bağımlılık:** A4 (aynı veri kaynağını genişletiyor) · **Boyut:** küçük-orta. Doğrulama sırasında ek bir sorun bulunmadı — `gdd-lotus-island-scenario.md` N5'in veri kaynağını `runSteps`/`delivered`/tur sayacına genişletmek, yeni bir sistem değil.

### B1 — `@tide` akış/yerleşim turu

**Kim:** `@tide` · **Bağımlılık:** A0, A2, A3 (bitmiş bir kadran/kart olmadan yerleşim/kamera hissi değerlendirilemez) — doğrulandı, bu gerçek bir bağımlılık.

### Asset-QA taban çizgisi (baseline) riski — düzeltilmiş değerlendirme

**[@byte doğrulama — görev tanımındaki varsayım yanlış, düzeltiliyor]:** ekran görüntüsü regresyon testi (`scripts/asset-qa/checks/regression.mjs` + `lib/browser.mjs`) "run kind"e göre anahtarlanmıyor — göründüğü izlenim buydu, ama kod farklı:

- `SHOTS` listesindeki her şot (`title`, `hub`, `play-mem00/50/75/95`) **her zaman `profile: "test"`** ile açılıyor, hiçbiri `profile: "real"` kullanmıyor.
- `openScene()`'in `setPhase(phase, { seed })` çağrısı **`kind` hiç geçmiyor**; `game.ts`'teki test hook'u `fullRestart(opts?.kind ?? "classic", ...)` yapıyor — yani **her taban kare `kind: "classic"` ile, `WORLD.k35 === false` iken** çekiliyor.
- Sonuç: bu doküman kapsamındaki her şey (A0'ın `PLAYER.spawn` değişikliği yalnızca `real` profilde, A2'nin gelgit kadranı yalnızca K35'te aktif, A3'ün Perde 0 kartı yalnızca K35 girişinde tetikleniyor, A4'ün `delivered` düzeltmesi `WORLD.k35` dalına bağlı) **hiçbir mevcut baseline'ın çektiği kombinasyona hiç girmiyor** — `profile=test` + `kind=classic` hiçbir zaman K35/`real` yolunu göstermiyor. Bu, riskin sıfır olduğu anlamına gelmiyor, **düşük** olduğu anlamına geliyor.
- **Gerçek kalan risk:** yeni DOM elemanları (`index.html`'e eklenen kadran/mandat kartı, `.quest` konteynerinin olası yeniden yapılanması) `test`+`classic` koşusunda **görünmese bile** sayfa akışını (flow) etkileyip komşu elemanları birkaç piksel kaydırabilir — tam olarak K35 leaderboard turunda `hub` baseline'ının "Sıralama" düğmesiyle %6,382 sapmasına (satır satır: düğme sırası 43→44 px, harita 1 px kaydı) yol açan sınıftan bir regresyon (bkz. `docs/production/ACTIVE_WORK.md`, LOT-58 notu). **Öneri:** A2/A3/A4'ün her biri bittiğinde `npm run test:assets` çalıştırılmalı; yeni elemanlar `!WORLD.k35` veya `!shoreFound` iken `display:none` (yalnız `opacity:0`/`visibility:hidden` değil — ikisi akışta yer kaplamaya devam eder) ile tam DOM-akış-dışı bırakılmalı.

---

## 11. Paca kartları (sahip kendisi açacak)

Sprint: **Lotus Island — Med-Cezir (Tide Runs) core loop**
Epic: `Lotus Island │ Core loop │ Ship the Med-Cezir push-your-luck loop with an explicit challenge declaration`

| # | Başlık (`Ortam │ State │ Title`) |
|---|---|
| 1 | `Lotus Island │ Opening │ Generalize the cairn-ritual pattern and site a second instance (shore stones); reconcile HUD-prompt priority with the already-live K35 north-cairn keepsake ritual` |
| 2 | `Lotus Island │ Opening │ Move player spawn out of sight of the ship (real profile); gate the guide arrow on shoreFound (edge run only — classic run keeps today's always-on guide arrow)` |
| 3 | `Lotus Island │ Spawn │ Bias ripe-lotus respawn weight toward distance from the ship` |
| 4 | `Lotus Island │ HUD │ New tide gauge — three risk bands, distinct from the guide arrow, gated on shoreFound AND edge-run-only (WORLD.k35)` |
| 5 | `Lotus Island │ HUD │ One-time contextual hint on first crossing into the caution band (reuse hud.say(), not startHintTimer)` |
| 6 | `Lotus Island │ Intro │ Challenge declaration copy for hub tooltip + nick modal (text-only edits); build the net-new Perde 0 mandate card (no existing showCard kind covers it)` |
| 7 | `Lotus Island │ Delivery │ Per-tide summary toast ("+N delivered, M left")` |
| 8 | `Lotus Island │ HUD │ Delivered counter always shows an exact number (remove the WORLD.k35-only vague-text branch) and keeps RUN_CLOCK-style legibility at every memory threshold (requires pulling #delivered out of the shared #quest fade container)` |
| 9 | `Lotus Island │ Spawn │ Guaranteed first lotus with a wordless hint (FIRST_LOTUS, carried over)` |
| 10 | `Lotus Island │ Navigation │ Recall verb (Q) as a secondary tool (carried over)` |
| 11 | `Lotus Island │ Departure │ Run summary card with per-tide breakdown` |
| 12 | `Lotus Island │ Flow │ UX pass on tide gauge placement, mandate-card transition, and opening-beat camera/spawn feel` |
| — | `Lotus Island │ Playtest │ Measure whether Med-Cezir reads as a real challenge, understood before it's lost, and whether finding the ship is fun vs. tedious` |
| 13 | `Lotus Island │ Stretch │ Prototype fire as a forward base that shrinks tide radius (post-measurement only)` |
| 14 | `Lotus Island │ Stretch │ Seed the shore-stone order per run, tie into the daily challenge (post-measurement only)` |
| 15 | `Lotus Island │ Stretch │ Daily seeded challenge + leaderboard integration (post-measurement only)` |

---

## 12. Kararlar

### Kapanan

| Karar | Sonuç | Tarih |
|---|---|---|
| Hangi seçenek kurulsun (eski K-2) | **Med-Cezir (Tide Runs).** | 22 Ağu 2026, sahip |
| Challenge iletişimi zorunlu mu | **Evet — §5 bu yüzden var.** Beyan (§5.2) + koşu-içi legibility (§5.3) ikisi de gerekli, biri diğerinin yerine geçmez. | 22 Ağu 2026, sahip |
| Gemi başta görünür olmasın, taş bulmacasıyla bulunsun | **Evet.** Açılış perdesi §5.1'de tanımlandı; `hillPuzzle.ts` deseni yeniden kullanılıyor, koşu başına bir kez çözülüyor. | 22 Ağu 2026, sahip |
| **K-1** — Teslim sayacı hiç mi muğlaklaşmasın, yoksa eşiğe mi bağlansın? | **Seçenek A: hiç muğlaklaşmasın.** `delivered` her zaman kesin sayı gösterir, unutuş eşiğinden bağımsız (§4, §8, §10 A4). | 22 Ağu 2026, sahip |

### Açık

| # | Karar | Durum |
|---|---|---|
| **K-3** | Seçenek 3 ("Doryseus Uyanıyor") v2 adayı olarak mı kalsın? | Bilgi amaçlı — engelleyici değil. Med-Cezir'in ölçümü olumsuz çıkarsa gündeme gelir (§10 D2). |
| **K-4** | Ateş/barınak stretch olarak (§10 C1) değerlendirilsin mi? | Açık, ölçümden sonra karar. |
| **K-5** | Günlük paylaşılan tohum challenge, Med-Cezir'den sonra mı kurulsun? | Açık ama sahip önceki turda bu sıralamaya (önce ölç, sonra challenge backend) itiraz etmedi — **varsayılan olarak evet**, kesin karar değil. |
| **K-6** | `@tide`'ın akış turu ne zaman? | Bloklamıyor (§5.4, §10 B1) — sahip isterse ölçümden önce de sonra da yapılabilir. |
| **K-7** | Sahil taşlarının kesin konumu ve `PLAYER.spawn`'ın yeni koordinatı | **Açık, in-game doğrulama gerekiyor** (§5.1, §8) — kâğıt üstünde önerilemez, playtest/`__LOTOPHAGOI_TEST_HOOKS__` ile görüş hattı fiilen test edilmeli. `@byte` işi, sahip onayı gerekmez ama sonucu bu dosyaya not düşülmeli. |
| **K-8** | Sahil taşı sırası koşu-bazlı (seeded) olsun mu, sabit mi kalsın? | **v1 için sabit** öneriliyor (§5.1 gerekçe); seeded versiyon Faz-2/stretch olarak işaretli (§10 C2). Sahip isterse şimdi de kapanabilir — bloklamıyor. |
| **K-9** *(yeni, `@byte` doğrulama turunda bulundu)* | Sahil taşı ritüeli ile K35'te zaten canlı olan kuzey höyük (cairn) ritüeli aynı `hud.setPrompt()` yuvasını/`nearShip → cairn → ... ` öncelik zincirini paylaşacak (§5.1, §10a A0) — iki ritüel aynı koşuda birlikte yaşarken oyuncu kafası karışmasın diye önceliğin/konumların nasıl ayrışacağı netleşmeli. | Açık — `@byte` implementasyon sırasında karar verebilir (K-7 gibi bloklayıcı değil), ama sonucu bu dosyaya not düşülmeli. |
| **K-10** *(sahip playtest, 23 Ağu 2026)* | Ada kadranı (A2) doğrulandı, ama sahip kadranı **"gemiden uzaklaştıkça olgun lotus / ikram NPC'leri çoğalır"** diye okudu. Kadran bunu **yapmıyor** ve yapmamalı: yalnız gemi mesafesi (risk termometresi). Lotus'un içerde yoğunlaşması **A1** (`LOTUS.depthBias`) — henüz kodlanmadı, sırada A3'ten sonra. **NPC ikramcılarının mesafe ile çoğalması v1'de yok**; sahip bunu bekledi, unutulmasın. | Açık. A1 lotus yanlılığını kurunca ayrıca bak: ikram NPC spawn'ı da dışa kayar mı, yoksa kadran+lotus yeter mi. Ölçüm durağından önce sahip teyidi. |
