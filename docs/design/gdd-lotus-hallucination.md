# GDD — Sanrı Figürleri (Hallucination) — Lotus Adası

> **Durum:** onaylandı (kavramsal) — sahip kararı 14 Ağu 2026, sayılar 🔬 playtest'e ertelendi
> **Tarih:** 2026-08-14
> **Kaynak:** playtest sonrası sahip geri bildirimi ("bayılmaya doğru, sanrılar arttıkça teslim zorlaşsın, yaratıklar kovalasın") → `docs/design/hallucination-reframe-concept.md`'de 3 seçenek sunuldu → sahip'in üç cevabı (**ikisi de** [his + mekanik], **ilkeyi koru** [can kaybı yok], **sadece Lotus Adası**) bu dosyada karara bağlandı.
> **Kapsam:** bu, **yalnızca Lotus Adası'na (1. durak) özgü, yerel bir sistem.** `gdd-memory-system.md`'nin yerini almaz, ona besler ve ondan okur (bkz. §3.4) — Kiklop Mağarası'nın `DETECT`/`CAUGHT` sistemiyle (`gdd-detection-cyclops.md`) **aynı ailede ama tamamen ayrı**; Kiklop ve Sirenler bu dosyayı hiç okumaz.
> **Bağlı doküman:** `gdd-memory-system.md` (üst sistem — tek unutuş kaynağı, §3.4 ve §9.1), `gdd-detection-cyclops.md` (emsal desen — bu dosya onun "tek besleme noktası, can kaybı yok" ilkesini birebir tekrarlıyor), `art-bible.md` §4 (görsel dil, kararan ekran yasağı), `hallucination-reframe-concept.md` (bu kararın öncül tartışma dokümanı — artık uygulanmış, bu dosya onun yerini alıyor), `tuning.md` §13 (sabitler)

---

## 1. Genel bakış

Unutuş yüksek bir eşiği geçtiğinde (`HALLUCINATION_THRESHOLD`), Lotus Adası'nda az sayıda (`HALLUCINATION_CREATURE_COUNT`) yarı-saydam, silüet-bazlı **sanrı figürü** sahneye girmeye başlar. Bunlar deterministik bir düzenle (`HALLUCINATION_SEED`) belirir, oyuncunun gemiye giden rotasının yakınında ağırlıklı olarak dolaşır, bir süre sonra (`HALLUCINATION_LINGER`) kendiliğinden söner. Oyuncu bir figüre **temas ederse**: (a) tek seferlik bir unutuş sıçraması (`HALLUCINATION_CONTACT_MEM_SPIKE`) yaşanır, (b) mevcut yürüyüş sapması mekaniği (`DRIFT_MAX_ANGLE`/`DRIFT_PERIOD`, `gdd-memory-system.md` §4.3) birkaç saniyeliğine (`HALLUCINATION_DRIFT_SPIKE_DURATION`) şiddetlenir (`HALLUCINATION_DRIFT_MULTIPLIER`) — **unutuş eşik 3'ün altında olsa bile.** Temas eden figür söner; envanter ve hız **hiç dokunulmaz.**

**Kritik tasarım kararı — neden ayrı bir "düşman" değil:** sanrı figürleri kendi başlarına bir kayıp/hasar koşulu **değildir.** Temasın tek sonucu, oyunun zaten var olan tek tehdit kaynağına (unutuş) beslenmesi ve mevcut bir sunum mekaniğinin (yürüyüş sapması) geçici olarak yoğunlaşmasıdır. `game-concept.md` §7'nin ("düşman, savaş, can barı YOK") ve `art-bible.md` §9'un ("hasar ve düşman yok") kilitli ilkeleri **korunuyor** — figürler görsel olarak bir tehdit gibi *hissettirir* ama mekanik olarak bir bilgi/kontrol bozucudur, tıpkı unutuşun kendisi gibi. Bu, Kiklop'un `DETECT`/`CAUGHT` sisteminin (`gdd-detection-cyclops.md` §1) izlediği aynı desendir — burada da **tekrarlanıyor, yeniden icat edilmiyor.**

### 1.1 Neden Lotus Adası'na özgü, tüm koşuya değil

`multi-island-concept.md` §6/M3'ün ilkesi: *"her yeni durak ortak omurgaya kendi yerel twist'ini ekler, unutuşun yerini almaz."* Kiklop Mağarası zaten kendi kovalayan-tehdit dilini kurmuş durumda (`DETECT`/`CAUGHT`, kehribar kenar parıltısı). Sanrı figürlerini Kiklop'a da eklemek aynı duyguyu (kovalanma, kaçış) iki farklı sistemle iki kez anlatmak olurdu — oyuncu aynı durakta hem `DETECT` hem sanrı figürlerini yönetmek zorunda kalır, bu P1'in ("tek mekanik, iki yön") durak-içi zarafetini bulanıklaştırır. Sahip bu soruyu açıkça **"sadece Lotus Adası"** diye kapattı (14 Ağu 2026). Sirenler Geçidi de bu dosyayı okumaz — kendi yerel twist'i (cazibe/sürüklenme, mevcut `DRIFT_*` kodunun doğrudan yeniden kullanımı, `multi-island-concept.md` M3 tablosu) ayrı kalır.

---

## 2. Değerlendirme — mevcut mekaniklerle çelişiyor mu?

| Kontrol | Sonuç |
|---|---|
| Unutuş sisteminin şeklini bozuyor mu? | **Hayır.** Tek besleme noktası var (`HALLUCINATION_CONTACT_MEM_SPIKE` → unutuşa tek seferlik ekleme); unutuşun kendi eşikleri, histerezisi, `MEM_GRACE`'i hiç değişmiyor. |
| P1 ("tek mekanik, iki yön") ve "düşman yok" ilkesini bozuyor mu? | **Hayır, dikkatle sınırlandı:** figürler can almaz, envanter almaz, hareketi asla tamamen durdurmaz. Tek etkileri unutuşa beslenmek ve **var olan** bir sunum mekaniğini (drift) geçici olarak yoğunlaştırmak. |
| Kiklop'un `DETECT`/`CAUGHT`'ıyla çakışıyor mu? | **Hayır.** Tamamen ayrı duraklar (§1.1). Aynı **aile** (tek besleme noktası, can kaybı yok) ama aynı **sistem** değil — kod da paylaşılmaz, yalnızca deseni tekrarlar. |
| `HARVEST_HOLD`/toplama mekaniğiyle çakışıyor mu? | **Hayır.** Toplama fiili (E, 1.2 s basılı tutma) hiç değişmiyor. Sanrı figürüne temas toplamayı kesmez — unutuşun toplamayı asla engellememesi ilkesiyle (`gdd-memory-system.md` §3.1 madde 10) aynı ruh. |
| Yeni bir kontrol tuşu gerektiriyor mu? | **Hayır.** Oyuncunun tek "eylemi" figürden uzak durmak/rota seçmek — mevcut WASD ile. |
| İstemsiz envanter kaybı var mı? | **Hayır, kasıtlı olarak yok** — Kiklop'un `CAUGHT_ITEM_LOSS`'u yalnızca Kiklop Mağarası'na özgü kalmalı (`gdd-detection-cyclops.md` §1.1'in kendi uyarısı: "bu istisnanın var olduğu her yerde açıkça işaretlenmeli, sessizce genelleşmemeli"). Bu dosya o istisnayı **tekrarlamıyor** — Lotus Adası'nın `gdd-lotus-collection.md`'de sabitlenmiş sözleşmesi ("toplama yalnızca teslimle azalır") **bozulmuyor.** |
| Ekranı karartıyor mu / fotosensitivite ihlali var mı? | **Hayır.** Figürlerin kendisi süt beyazı/sis paletinde, yarı-saydam; belirme/kaybolma `HALLUCINATION_FADE_TIME` (1.5 s) ile — art-bible §4/§9'daki tüm kısıtlara uyuyor. Ayrıntı §5. |

**Sonuç: sistem onaylandı** (14 Ağu 2026, sahip kararı). Aşağıda ayrıntılı tasarım.

---

## 3. Ayrıntılı tasarım

### 3.1 Çekirdek kurallar

1. **Sanrı figürleri**, `memory ≥ HALLUCINATION_THRESHOLD` olduğu sürece aktif olabilir. Değer bu eşiğin altına düşerse (histerezis `MEM_THRESHOLD_HYSTERESIS` ile aynı ilke, ayrı bir sabit gerekmez — mevcut hysteresis sabiti yeniden kullanılır) aktif figürler `HALLUCINATION_FADE_TIME` içinde solarak kaybolur ve yeni figür belirmez.
2. Aynı anda sahnede en fazla `HALLUCINATION_CREATURE_COUNT` figür bulunur.
3. Figürlerin belirme konumu/zamanlaması **deterministiktir** (`HALLUCINATION_SEED`, `LOTUS_PHASE_SEED`'in izlediği aynı ilke — P3, "ada okunabilir", rastgele değil). Konum seçimi `HALLUCINATION_ROUTE_BIAS_RADIUS` ile oyuncunun o anki konumu ile gemi arasındaki hatta ağırlıklandırılır (§3.3).
4. Bir figürün yaşam döngüsü: **belir** (`HALLUCINATION_FADE_TIME` içinde fade-in) → **kal** (`HALLUCINATION_LINGER`) → **söner** (`HALLUCINATION_FADE_TIME` içinde fade-out) → `HALLUCINATION_RESPAWN_GAP` sonra başka bir konumda yeni bir figür belirebilir (eşik hâlâ aşılıyorsa).
5. **Temas** (`HALLUCINATION_CONTACT_RADIUS` içine girme): (a) `HALLUCINATION_CONTACT_MEM_SPIKE` tek seferlik unutuşa eklenir, (b) `DRIFT_MAX_ANGLE` `HALLUCINATION_DRIFT_MULTIPLIER` ile çarpılır ve bu çarpan `HALLUCINATION_DRIFT_SPIKE_DURATION` boyunca etkilidir — **unutuş normalde eşik 3'ün (75) altındaysa bile**, drift mekaniği bu süre boyunca geçici olarak aktive olur. (c) Temas eden figür `HALLUCINATION_VANISH_ON_CONTACT` = `true` olduğu için hemen söner (yeniden RESPAWN_GAP sonrası başka bir yerde belirebilir). (d) `HALLUCINATION_CONTACT_COOLDOWN` boyunca yeni bir temas tetiklenmez (kare-bazlı çoklu tetiklenmeyi önler).
6. Sanrı figürleri **toplamayı, hızı, teslimi asla doğrudan engellemez** — unutuşun kendisiyle aynı disiplin (`gdd-memory-system.md` §3.1 madde 10). Etkileri her zaman **dolaylı**: unutuş sıçraması (bilgi kaybı) ve geçici yön belirsizliği (kontrol zorlaşması, durdurma değil).
7. Envanter (taşınan lotus sayısı) temas ile **asla değişmez.** Bu, Kiklop'un `CAUGHT_ITEM_LOSS`'unun kasıtlı olarak *tekrarlanmadığı* nokta — bkz. §2.

### 3.2 Görünüş — tasarım yönü

- **Silüet-bazlı, yarı-saydam, süt beyazı/sis paletinde** (`#f6f2ea` ailesi, `art-bible.md` §2'deki "unutma pusu" rengiyle aynı aile). Yeni bir renk ailesi **getirilmiyor** — art-bible §9'un "palet dışı renk yasak" kuralına uyulur; ayrıca sanrı figürleri Kiklop'un kehribar/turuncu kenar parıltısıyla (o sistemin kendi işareti) **karıştırılmamalı**, iki sistem farklı duraklarda olsa da görsel diller çakışmasın diye ayrı tutulur.
- Kontur/form, dolu bir 3D mesh değil — dumanlı, yarı-saydam bir "izlenim" (art-bible §5'in "stylized, asla fotogerçekçi" ilkesiyle uyumlu, ayrıca teknik olarak da ucuz: parçacık sistemi veya basit billboard sprite ile üretilebilir, CLAUDE.md'nin "merge static geometry, don't spawn hundreds" performans disipliniyle çelişmez çünkü aynı anda en fazla 3 tane var).
- **Kim/ne olduğu belirsiz kalmalı** — Homeros'ta yok, oyun için icat (`game-concept.md` §4.3'teki "[O]" etiketli icatlarla aynı disiplin). Önerilen okuma: "unutulmuş tayfa"nın (mevcut kolektif isimlendirme, `game-concept.md` Kapanan kararlar) kendi izdüşümleri/hayaletimsi hatıraları — doğrudan doğrulanmaz, ima kalır (Lotophagoi'nin "oyuncunun kayıp adamları mı" sorusunun kapalı kaldığı gibi, `game-concept.md` Kapanan kararlar). Kesin görsel kimlik `art-director`'ın işi, bu doküman yalnızca yön veriyor.

### 3.3 Rota önyargısı — "teslim zorlaşıyor" burada somutlaşıyor

`HALLUCINATION_ROUTE_BIAS_RADIUS` içinde, figürlerin spawn ağırlığı oyuncunun **o anki konumu ile gemi arasındaki hat**a doğru kayar (rastgele her yerde değil). Bu, sahip'in "teslim zorlaşsın" isteğinin somut karşılığı: unutuş yükseldikçe gemiye giden yol **coğrafi olarak tıkanmıyor** (P1 madde 10 ihlali olurdu) ama üzerinde risk barındırıyor — oyuncu ya aralarından geçip temas riskini göze alır ya da rotasını uzatıp dolaşır (kendi kararı, hız cezası yok, yalnızca zaman maliyeti — `DAY_LENGTH` kıskacının zaten yaptığı gibi). Bu, mevcut "gemi sis içinde kayboluyor" efektiyle (`gdd-memory-system.md` §3.2, eşik 3) **birlikte** çalışır: biri bilgi katmanını alır (göremiyorsun), diğeri yol katmanını zorlaştırır (üzerinde risk var).

### 3.4 Diğer sistemlerle etkileşim

| Sistem | Yön | Ne akar |
|---|---|---|
| **Unutuş** (`gdd-memory-system.md`) | **çift yönlü** (bu sistemde bilinçli bir istisna) | Unutuş → Sanrı: `memory ≥ HALLUCINATION_THRESHOLD` iken figürler aktifleşir (sistem unutuşu okuyor — Kiklop'un `DETECT`'inin unutuşu hiç okumamasından **farklı**, çünkü sanrılar unutuşun görünür bir belirtisi, ayrı bir tehlike kaynağı değil). Sanrı → Unutuş: `HALLUCINATION_CONTACT_MEM_SPIKE` (tek seferlik ekleme). |
| **Yürüyüş sapması** (`gdd-memory-system.md` §4.3) | tek yönlü (bu → sapma) | Temas anında `DRIFT_MAX_ANGLE`'a geçici çarpan (`HALLUCINATION_DRIFT_MULTIPLIER`, `HALLUCINATION_DRIFT_SPIKE_DURATION`) — **mevcut kodu yeniden kullanır, yeni bir sapma sistemi icat etmez.** |
| **Lotus toplama** (`gdd-lotus-collection.md`) | yok | Sanrı figürleri toplama fiiline hiç dokunmaz — §3.1 madde 6. |
| **Kiklop algılanma** (`gdd-detection-cyclops.md`) | yok, ayrı durak | Farklı duraklar, kod paylaşılmaz — §1.1/§2. |
| **HUD** | tek yönlü | Sanrı figürlerinin kendisi zaten dünya-uzayında görünür bir öğe; ayrı bir HUD göstergesi **yok** (P2 disiplini, unutuşun kendisiyle aynı — sayı/bar yok). |

---

## 4. Formüller

### 4.1 Aktivasyon

`aktif = memory ≥ HALLUCINATION_THRESHOLD` (histerezis: `MEM_THRESHOLD_HYSTERESIS` kadar aşağıda kapanır — mevcut sabit yeniden kullanılır, yeni bir histerezis sabiti tanımlanmaz).

### 4.2 Temas etkisi

`memory += HALLUCINATION_CONTACT_MEM_SPIKE` (tek seferlik, `MEM_ON_HARVEST`/`MEM_WITHERED_PENALTY` ile aynı "tek seferlik artışlar" ailesine katılır — `gdd-memory-system.md` §3.1 madde 4'ün genişletilmiş listesi).

`driftAngle_efektif(t) = DRIFT_MAX_ANGLE × HALLUCINATION_DRIFT_MULTIPLIER × sin(2π t / DRIFT_PERIOD)` — yalnızca temastan sonraki `HALLUCINATION_DRIFT_SPIKE_DURATION` saniye boyunca, unutuş eşiği ne olursa olsun. Süre dolunca normal davranışa döner: unutuş ≥75 ise normal (çarpansız) drift devam eder, altındaysa drift tamamen kapanır.

---

## 5. Sınır durumlar

- **Unutuş `HALLUCINATION_THRESHOLD`'un altındayken bir figüre "denk gelinirse":** olamaz — figürler zaten yalnızca eşik aşıldığında var oluyor, spawn edilmemiş bir şeyle temas mümkün değil.
- **Oyuncu `MEM_GRACE` içindeyken bir figüre temas ederse:** `HALLUCINATION_CONTACT_MEM_SPIKE` normal uygulanır; bu unutuşu zaten `MEM_MAX`'ta tutuyorsa (kenetli) geri sayımı etkilemez — Kiklop'un aynı sınır durumuyla (`gdd-detection-cyclops.md` §5) aynı mantık: unutuş tarafı her zaman kazanır, ikinci bir kayıp yolu icat edilmez.
- **Oyuncu deniz/gemi yakınındayken (unutuş düşüyorken) bir figüre temas ederse:** yine tam uygulanır — temas anlık bir olay, oyuncunun o anki konumundan bağımsız. Ama pratikte figürler zaten yalnızca yüksek unutuşta var olduğu için bu, oyuncu kıyıya dönerken (unutuş hâlâ eşiğin üstündeyken) mümkün, gerçekleşmesi olağan bir durum.
- **Temas sırasında `HARVEST_HOLD` devam ediyorsa:** toplama iptal olmaz, tamamlanır — §3.1 madde 6 ile aynı ruh, Kiklop'un `DETECT`/toplama sınır durumuyla (`gdd-detection-cyclops.md` §5) aynı desen.
- **İki figüre art arda hızlıca temas edilirse:** `HALLUCINATION_CONTACT_COOLDOWN` yalnızca *aynı* temas olayının kare-bazlı tekrarını önler; farklı figürlere ayrı zamanlarda temas etmek her seferinde tam etkiyi uygular — bu kasıtlı, sık sık figürlerin arasından geçmeye çalışan bir oyuncu gerçek bir bedel ödemeli.
- **Oyun duraklatılırsa (Esc):** figürlerin yaşam döngüsü (fade-in/linger/fade-out) ve spawn zamanlayıcısı ilerlemez — unutuş/gün saatiyle aynı duraklatma disiplini (`gdd-memory-system.md` §5).

---

## 6. Bağımlılıklar

| Bağımlılık | Yön | Sertlik | Arayüz |
|---|---|---|---|
| Unutuş sistemi | çift yönlü | **Sert** | Okur: `memory` değeri (aktivasyon eşiği). Yazar: `onHallucinationContact` → `HALLUCINATION_CONTACT_MEM_SPIKE` |
| Yürüyüş sapması | tek yönlü (bu → sapma) | **Sert** | `onHallucinationContact` → geçici `DRIFT_MAX_ANGLE` çarpanı, süreli |
| Lotus toplama | yok | — | Hiç dokunmaz |
| Seviye / ada (Lotus Adası) | tek yönlü | **Yumuşak** | Oyuncu/gemi konumu (rota önyargısı için, §3.3) |
| HUD | yok | — | Ayrı bir gösterge yok |

---

## 7. Ayar düğmeleri

| Düğme | Çok yüksekse | Çok düşükse |
|---|---|---|
| `HALLUCINATION_THRESHOLD` | Oyuncu figürleri hiç görmeden oyunu bitirebilir, sistem hiç oynanmaz | Düşük unutuşta bile figürler beliriyor, "cennet gibi görünen ada" ilkesi (art-bible §1) erken bozulur |
| `HALLUCINATION_CONTACT_MEM_SPIKE` | Bir temas neredeyse `MEM_GRACE`'i tetikleyecek kadar ağır olur, figürlerden kaçınmak zorunlu hale gelir (P1 "yapabildiğini kısıtlamaz" ilkesine yaklaşır, dikkatli tutulmalı) | Temasın gerçek bir bedeli kalmaz, "kovalanıyorum" hissi kaybolur |
| `HALLUCINATION_CREATURE_COUNT` | Ekran kalabalıklaşır, "az ama anlamlı" ilkesi (Lotophagoi ile aynı ölçek) bozulur | Figürler nadiren görülür, sistem fark edilmez |
| `HALLUCINATION_DRIFT_MULTIPLIER` | Temas sonrası birkaç saniye yürüyüş neredeyse kontrolsüz hisseder — "yapabildiğini kısıtlamaz" ilkesine yaklaşır | Drift şiddetlenmesi hissedilmez, temasın kontrol üzerindeki etkisi kaybolur |

---

## 8. Kabul kriterleri

- **GIVEN** unutuş `HALLUCINATION_THRESHOLD`'un altında, **WHEN** oyuncu Lotus Adası'nda dolaşır, **THEN** hiçbir sanrı figürü sahnede değildir.
- **GIVEN** unutuş `HALLUCINATION_THRESHOLD`'u geçti, **WHEN** `HALLUCINATION_FADE_TIME` süresi geçer, **THEN** en fazla `HALLUCINATION_CREATURE_COUNT` figür sahnede, deterministik konumlarda beliriyor.
- **GIVEN** bir sanrı figürü aktif ve `HALLUCINATION_LINGER` süresi doldu, **WHEN** oyuncu temas etmedi, **THEN** figür kendiliğinden söner ve `HALLUCINATION_RESPAWN_GAP` sonra (eşik hâlâ aşılıyorsa) başka bir konumda yeni bir figür belirebilir.
- **GIVEN** oyuncu bir sanrı figürüne `HALLUCINATION_CONTACT_RADIUS` içine giriyor, **WHEN** temas işlenir, **THEN** unutuş `HALLUCINATION_CONTACT_MEM_SPIKE` kadar artar, figür söner, envanter (taşınan lotus sayısı) **değişmez**, oyuncunun hızı/hareket kabiliyeti **kısıtlanmaz.**
- **GIVEN** unutuş `HALLUCINATION_THRESHOLD`'un üstünde ama `MEM_THRESHOLD_LOST` (75) altında (normalde drift aktif değil), **WHEN** oyuncu bir sanrı figürüne temas eder, **THEN** `DRIFT_MAX_ANGLE` `HALLUCINATION_DRIFT_MULTIPLIER` ile çarpılıp `HALLUCINATION_DRIFT_SPIKE_DURATION` boyunca geçici olarak aktive olur, süre dolunca normale döner.
- **GIVEN** oyuncu bir figüre az önce temas etti, **WHEN** `HALLUCINATION_CONTACT_COOLDOWN` süresi geçmedi, **THEN** aynı temas olayı ikinci kez tetiklenmez.
- **GIVEN** oyun Esc ile duraklatıldı, **WHEN** 30 saniye beklenir, **THEN** sanrı figürlerinin yaşam döngüsü ve spawn zamanlayıcısı ilerlememiştir.
- **GIVEN** unutuş herhangi bir değerde, **WHEN** oyuncu olgun bir çiçekte E'yi `HARVEST_HOLD` boyunca basılı tutar, **THEN** toplama normal süresinde tamamlanır (sanrı figürlerinin varlığı toplamayı etkilemez).

---

## Açık sorular

1. **Figürlerin kesin görsel kimliği** ("unutulmuş tayfanın izdüşümü" mü, tamamen soyut bir form mu) — `art-director`'ın işi, bu doküman yalnızca yön veriyor (§3.2).
2. **Ses tasarımı** — figürlerin kendine özgü bir sesi olmalı mı (uzak bir fısıltı, ayak sesi) yoksa yalnızca mevcut uğultu/nefes katmanına mı (`gdd-memory-system.md` §9.1) güveniliyor? Playtest'e ertelenebilir.
3. **`HALLUCINATION_THRESHOLD`'un kesin değeri** (öneri 60.0, `MEM_THRESHOLD_DRIFT`=50 ile `MEM_THRESHOLD_LOST`=75 arası) — playtest'te ölçülecek, bkz. `tuning.md` §13.
