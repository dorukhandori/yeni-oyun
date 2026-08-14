# GDD — Algılanma (Tespit) Sistemi — Kiklop Mağarası

> **Durum:** onaylandı (kavramsal) — sayılar 🔬 playtest'e ertelendi
> **Tarih:** 2026-08-14
> **Kaynak:** `island-designer`'ın `docs/design/level-cyclops-cave.md` §4/§10/§12'de önerdiği sistem; bu doküman onu `game-designer` tarafında karara bağlıyor. `level-cyclops-cave.md` **kilitli** — bu doküman onu değiştirmez, ona sayısal/mekanik karar verir.
> **Kapsam:** bu, **yalnızca Kiklop Mağarası'na (2. durak) özgü, yerel bir sistem.** `gdd-memory-system.md`'nin yerini almaz, ona beslenir — bkz. §3.3. Diğer duraklar (Lotus Adası, Sirenler Geçidi) bu dosyayı hiç okumaz.
> **Bağlı doküman:** `level-cyclops-cave.md` (yerleşim, mitolojik çapa, açık sorular) · `gdd-memory-system.md` (kardeş/üst sistem — tek unutuş kaynağı) · `gdd-lotus-collection.md` (toplama sözleşmesinin referans noktası — bkz. §1) · `multi-island-concept.md` §6/M3 (P1 sütununun koşu-aşırı korunma ilkesi) · `tuning.md` §12 (sabitler)

---

## 1. Genel bakış

Algılanma, Kiklop Mağarası'nın **yerel twist'i** — Lotus Adası'nın "toplamak = tek fiil, iki yön" ilkesini (P1) bozmadan, ona ikinci bir vana ekliyor. Oyuncu mağarada azık toplarken **ışık** (aydınlık bölgede mi) ve **hareket** (WASD basılı mı) eksenlerinde bir "algılanma" değeri biriktirir; bu değer dolarsa Polyphemos oyuncuyu **yakalar**. Yakalanma iki şey yapar: taşınan tüm azığı sıfırlar (istemsiz envanter kaybı — bu projede bir ilk, bkz. §1.1) ve **tek unutuş kaynağına** büyük bir tek seferlik darbe ekler.

**Kritik tasarım kararı — neden ayrı bir "can barı" değil:** algılanma kendi başına bir kayıp/ölüm koşulu **değildir.** Yakalanmanın tek sonucu, oyunun zaten var olan tek tehdit kaynağına (unutuş) beslenmesidir. Eğer bu darbe unutuşu `MEM_MAX`'a taşırsa, **mevcut** `MEM_GRACE`/koşu-bazlı-kayıp akışı devreye girer — yeni bir ikinci ölüm yolu icat edilmiyor. Bu, `game-concept.md` P1'in ("tek mekanik, iki yön") koşu-aşırı ölçekte korunmasının yoludur ve `multi-island-concept.md` §6/M3'te önceden çizilen ilkenin (her durak ortak omurgaya kendi twist'ini ekler, yerini almaz) birebir uygulamasıdır.

### 1.1 Sözleşme değişikliği — açıkça kayıtta

Bugüne kadar hiçbir sistem, oyuncunun **istemi dışında** çantasındaki bir öğeyi azaltmıyordu (`gdd-lotus-collection.md`'de toplama yalnızca teslimle azalır, unutuş hiçbir zaman toplamaya/envantere müdahale etmez — `gdd-memory-system.md` §3.3: "Unutuş... toplamayı asla engellemez"). Bu sistem bunu **yalnızca Kiklop Mağarası'nda** kırıyor: yakalanma, taşınan tüm azığı anında sıfırlıyor. Bu, `gdd-lotus-collection.md`'nin Lotus Adası için tanımladığı sözleşmeyi **değiştirmiyor** (o doküman hâlâ doğru — Lotus Adası'nda hâlâ hiçbir şey envanteri istemsizce azaltmıyor); yeni sözleşme yalnızca bu dosyanın kapsadığı durakta geçerli. Değerlendirme sonucu: **onaylandı** (bkz. §2) — ama bu istisnanın var olduğu her yerde açıkça işaretlenmeli, sessizce genelleşmemeli.

---

## 2. Değerlendirme — mevcut mekaniklerle çelişiyor mu?

| Kontrol | Sonuç |
|---|---|
| Unutuş sisteminin şeklini bozuyor mu? (yükselen baskı, gerçek bir bedel, geri dönüş yolu — `game-designer`'ın koruma görevi) | **Hayır.** Tek besleme noktası var (`CAUGHT_MEM_SPIKE` → unutuşa tek seferlik ekleme); unutuşun kendi eşikleri, histerezisi, `MEM_GRACE`'i hiç değişmiyor. |
| Koşu-bazlı kayıp finaliyle (14 Ağu 2026 onayı) çelişiyor mu? | **Hayır.** Yakalanma kendi başına koşuyu bitirmiyor; yalnızca unutuşu yükseltiyor. Unutuş `MEM_MAX`'a ulaşırsa zaten var olan koşu-bazlı akış çalışır — yeni bir dallanma yok. |
| İkinci bir "can barı" / gizli ekranda gösterge yaratıyor mu? (P1, P2 sütunları) | **Hayır, dikkatle tasarlanmış:** algılanma oyuncuya sayı olarak gösterilmiyor (§4.3), unutuşun kendisi gibi **sunumla** hissettiriliyor. P2'nin ("unutma görülür, anlatılmaz") bu adadaki karşılığı: "algılanma hissedilir, anlatılmaz." |
| `HARVEST_HOLD`/toplama mekaniğiyle çakışıyor mu? | **Hayır.** Toplama fiili (E, 1.2 s basılı tutma) hiç değişmiyor — sadece toplama sırasında/sonrasında oyuncunun bulunduğu ışık/hareket durumu algılanmayı etkiliyor. Aynı tuş, aynı `HARVEST_HOLD`, yeni bir girdi yok. |
| Yeni bir kontrol tuşu gerektiriyor mu? (zıplama/koşma yok kararı) | **Hayır.** "Durgun kalmak" = WASD'a basmamak; mevcut kontrol şemasıyla çalışıyor (level-spec §4.1'de zaten doğrulanmış). |
| İstemsiz envanter kaybı bir sözleşme ihlali mi? | **Evet, ama bilerek ve yerel.** Bkz. §1.1 — onaylanıyor çünkü (a) yalnızca bu durakla sınırlı, (b) tema açısından güçlü gerekçesi var (soygun/kaçış, bkz. `level-cyclops-cave.md` §0), (c) tek besleme noktasıyla unutuşa bağlanıyor, ikinci bir kayıp yolu yaratmıyor. |

**Sonuç: sistem onaylandı.** `level-cyclops-cave.md`'ye geri bildirim/düzeltme gerekmiyor — dosyaya dokunulmadı (kilitli). Aşağıda level-spec'in `game-designer` kararına bıraktığı açık noktalar (respawn konumu, kesin sayılar) karara bağlandı.

---

## 3. Ayrıntılı tasarım

### 3.1 Çekirdek kurallar

1. **Algılanma** (`DETECT`), `0.0`–`DETECT_MAX` arasına kenetlenmiş, unutuştan **tamamen ayrı** bir float değerdir. Yalnızca Kiklop Mağarası'nda vardır, mevcut olduğu sürece geçerlidir; oyuncu Lotus Adası'na ya da Sirenler Geçidi'ne geçtiğinde bu değer anlamsızlaşır (yeni durakta sıfırdan/tanımsız başlar, taşınmaz — unutuşun aksine, bkz. `gdd-memory-system.md` §3.5).
2. Her karede net değişim, oyuncunun bulunduğu **ışık** durumu (aydınlık/gölge) ve **hareket** durumu (WASD basılı/basılı değil) ikilisine göre 2×2 matristen okunan bir orandır (§4.1).
3. `DETECT` **hiçbir zaman** ekranda sayı, bar ya da yüzde olarak gösterilmez (mevcut unutuş kuralıyla aynı disiplin — P2). Sunumu §3.3'te.
4. Polyphemos'un konumu deterministik bir döngüdür (`CYCLOPS_CYCLE`, §3.2) — rastgele devriye değildir (P3, `LOTUS_PHASE_SEED` ile aynı ilke).
5. `DETECT ≥ DETECT_MAX` olduğu anda **yakalanma** tetiklenir (§3.4): tek seferlik olay, ardından `DETECT` `0`'a döner.
6. Algılanma **toplamayı hiçbir zaman engellemez** — unutuşun toplamaya asla müdahale etmemesiyle aynı ilke (`gdd-memory-system.md` §3.1 madde 10). Yüksek `DETECT` ile de `HARVEST_HOLD` normal şekilde tamamlanır; tek fark, o sırada bulunduğun ışık/hareket durumu `DETECT`'i yükseltmeye devam eder.

### 3.2 Polyphemos'un döngüsü

| Evre | Süre (öneri, 🔬) | `DETECT` üstündeki etkisi |
|---|---|---|
| **DIŞARIDA** | `CYCLOPS_PHASE_OUT` = 58 s | Tüm oranlar temel (§4.1) değerlerinde — düşük ama sıfır değil (temkin dersi hiç sıfırlanmaz, level-spec §4.3'ün gerekçesiyle aynı). |
| **DÖNÜŞ (telegraf)** | `CYCLOPS_PHASE_RETURN` = 7 s | Tüm oranlara `CYCLOPS_RETURN_MULTIPLIER` = `1.5×` uygulanır — artan ama henüz tepe değil; oyuncuya tepki payı verir (`MEM_GRACE`'in "ani, adaletsiz ceza yok" felsefesiyle aynı). |
| **İÇERİDE (PRESENT)** | `CYCLOPS_PHASE_PRESENT` = 30 s | Ağıllar (3.4) ve iç nöy (3.5) odalarında tüm oranlara `CYCLOPS_PRESENT_MULTIPLIER` = `3.0×` uygulanır. Depo ve mağara ağzı bu evrede de nispeten güvenli kalır (çarpan uygulanmaz) — Polyphemos o odalara girmiyor (level-spec §3.3/§4.3). |

`CYCLOPS_CYCLE` = `[TÜRETİLMİŞ]` = 58 + 7 + 30 = **95 s** (level-spec'in önerdiği 85–110 s aralığının ortası).

### 3.3 Sunum (P2 disiplini)

`DETECT` sayı/bar olarak gösterilmez. Önerilen sunum katmanı (ayrıntı `art-director`/`ui-programmer`'ın işi, burada yalnızca işlev tarifi):

- **Kehribar/turuncu bir kenar parıltısı** — unutuşun süt beyazı vinyetinden görsel olarak ayrışan, ayrı bir renk kanalı (level-spec §4.5 madde 3'ün önerisiyle aynı).
- **Ses:** oyuncunun kendi ayak sesi + nefesi `DETECT` yükseldikçe hafifçe belirginleşir (level-spec §11'deki "uzak nefes/horlama" katmanının tersi — burada oyuncunun *kendi* sesi ihanet ediyor).
- **Eşik yok, sürekli eğri:** unutuşun 4 ayrık eşiğinin (§5.3, `gdd-memory-system.md`) aksine, `DETECT` sunumu **sürekli** bir eğridir — `etki = clamp01(DETECT / DETECT_MAX)`. Ayrık davranan tek şey yakalanma anının kendisidir (§3.4).

### 3.4 Yakalanma

1. `DETECT ≥ DETECT_MAX` olduğu anda tetiklenir.
2. **`CAUGHT_ITEM_LOSS`** = `true` — çantadaki tüm taşınan azık **anında sıfırlanır.** Kayıp öğeler havuza geri dönmez (level-spec §5: azık yenilenmez); oyuncu kalan sahne-içi stoktan tazelemek zorundadır.
3. **`CAUGHT_MEM_SPIKE`** = `30.0` puan (level-spec'in önerdiği 25–35 aralığının ortası) — **tek unutuş kaynağına** tek seferlik eklenir. `tuning.md`'deki diğer tek seferlik unutuş olaylarıyla (`MEM_WITHERED_PENALTY` 12, `MEM_LOTOPHAGOS_TRADE` 20) aynı ailede, en büyüğü — kasıtlı, "yakalanmak büyük bir olay hissettirmeli."
4. **`CAUGHT_RESPAWN_POINT`** = **mağara ağzı** (`D ≈ 4`) — **karar (14 Ağu 2026, `game-designer`):** level-spec'in iki seçeneğinden (§4.4 madde 3, §12 açık soru 2) yumuşak olanı seçildi. **Gerekçe:** gemiye/dışarıya ışınlamak, yakalanmayı görsel/hissi olarak koşu-bazlı kayıp finaliyle (`MEM_MAX` + `MEM_GRACE`) neredeyse ayırt edilemez kılardı — iki sistemin net ayrımını (yerel soft-fail vs. koşu-seviyesi hard-fail, bkz. §1) bulanıklaştırırdı. Mağara ağzına ışınlamak cezayı hissettirir ama turu sıfırlamaz, ayrımı korur.
5. **`DETECT` yakalanma sonrası `0`'a döner** — yeni bir sızma denemesi temiz bir sayfadan başlar (unutuş öyle sıfırlanmıyor — `DETECT` ve unutuş burada kasıtlı olarak farklı davranıyor: biri yerel/sıfırlanabilir, diğeri küresel/kalıcı).
6. **Ölüm/game-over yok.** Yakalanma kendi başına hiçbir fazı değiştirmez. Yalnızca unutuş bu darbeyle `MEM_MAX`'a ulaşırsa, mevcut `MEM_GRACE` akışı (artık koşu-bazlı) devreye girer.

### 3.5 Diğer sistemlerle etkileşim

| Sistem | Yön | Ne akar |
|---|---|---|
| **Unutuş** (`gdd-memory-system.md`) | Algılanma → Unutuş | `CAUGHT_MEM_SPIKE` (tek seferlik ekleme). **Tek yönlü** — unutuşun kendisi `DETECT`'i hiç etkilemez, tıpkı unutuşun toplamayı hiç etkilemediği gibi (§3.1 madde 6). |
| **Kiklop toplama** (bu dokümanın kapsamı dışı, level-spec'in §5'i) | Algılanma → Toplama | `CAUGHT_ITEM_LOSS` — çanta sıfırlanır. Toplama fiilinin kendisi (E, `HARVEST_HOLD`) değişmez. |
| **Ada geçişi** (`gdd-memory-system.md` §3.5) | — | `DETECT` bu formülün dışındadır — yalnızca unutuş taşınır, `DETECT` durak-yereldir ve taşınmaz. |
| **HUD** | Algılanma → HUD | Kehribar kenar parıltısı (§3.3); sayı/bar yok. |

---

## 4. Formüller

### 4.1 Taban oranlar (2×2 matris, `CYCLOPS_PHASE_OUT` içinde, hiçbir çarpan yokken)

| | **Gölgede** | **Aydınlıkta** |
|---|---|---|
| **Durgun** | `DETECT_RATE_SHADOW_STILL` = `0.0` puan/s | `DETECT_RATE_LIT_STILL` = `4.0` puan/s |
| **Hareket halinde** | `DETECT_RATE_SHADOW_MOVING` = `3.0` puan/s | `DETECT_RATE_LIT_MOVING` = `12.0` puan/s |

Evre çarpanı uygulanmış net oran: `d(DETECT)/dt = taban_oran(ışık, hareket) × evre_çarpanı(§3.2) − DETECT_DECAY (yalnızca hiçbir oda-bazlı risk yokken, örn. depo/mağara ağzı, PRESENT evresinde bile)`

`DETECT_DECAY` = `8.0` puan/s — güvenli bölgede/evrede hızlı toparlanma (level-spec'in "gölge cebinde bekle, DETECT düşsün" beklenen davranışını besler).

**Örnek:** PRESENT evresinde, ağıllar odasında, aydınlıkta hareket halinde: `12.0 × 3.0 = 36.0` puan/s → `DETECT_MAX` (100) sıfırdan **~2.8 saniyede** dolar. Bu kasıtlı: level-spec'in "en riskli" olarak işaretlediği hücre gerçekten anlık cezalandırıcı olmalı.

### 4.2 `DETECT_MAX`

`DETECT_MAX` = `100.0` puan — unutuş ölçeğiyle aynı büyüklükte, aynı zihinsel model (`tuning.md` §0 sözleşmesiyle tutarlı, 0–100 puan/birimsiz).

---

## 5. Sınır durumlar

- **Çanta boşken yakalanma:** `CAUGHT_ITEM_LOSS` hiçbir şey yapmaz (kaybedilecek öğe yok), `CAUGHT_MEM_SPIKE` yine de **tam** uygulanır. Yakalanmanın kendisi bir olaydır, envanterin durumundan bağımsız.
- **Toplama sırasında (`HARVEST_HOLD` ortasında) yakalanma:** toplama iptal olmaz, tamamlanır (Lotus Adası'ndaki "unutuş toplamayı asla kesmez" ilkesiyle aynı ruh, §3.1 madde 6) — ama tamamlanan öğe de dahil, çantadaki her şey sıfırlanır. Yani son anda tamamlanan bir hasat da kayıptan payını alır.
- **`DETECT`, evre geçişinin tam ortasında yükseliyorsa:** çarpan anlık olarak değişir (kademeli değil) — `MEM_THRESHOLD_HYSTERESIS`'in aksine burada histerezis **yok**, çünkü `DETECT` ayrık eşiklerle değil sürekli bir oranla çalışıyor; ani çarpan değişimi "telegraf" (DÖNÜŞ evresi, 7 s) ile zaten yumuşatılmış.
- **Oyuncu yakalanma anında `MEM_GRACE` içindeyse (unutuş zaten `MEM_MAX`'a yakın):** `CAUGHT_MEM_SPIKE` normal uygulanır; eğer bu unutuşu `MEM_MAX`'a taşırsa `MEM_GRACE` geri sayımı (zaten çalışıyorsa sıfırlanmaz, çalışmıyorsa başlar) devreye girer — iki sistem burada kesişir ama çatışmaz, unutuş tarafı her zaman kazanır (tek kaynak ilkesi).
- **Oyun duraklatılırsa (Esc):** `DETECT` ilerlemez, Polyphemos'un evre saati ilerlemez — unutuş/gün saatiyle aynı duraklatma disiplini (`gdd-memory-system.md` §5 sınır durumları).

---

## 6. Bağımlılıklar

| Bağımlılık | Yön | Sertlik | Arayüz |
|---|---|---|---|
| Unutuş sistemi | tek yönlü (bu → unutuş) | **Sert** | `onCaught` olayı → `CAUGHT_MEM_SPIKE` |
| Kiklop toplama (level-spec §5) | çift yönlü | **Yumuşak** | Toplama olayları `DETECT`'i etkilemez; `onCaught` çantayı sıfırlar |
| Seviye / mağara (level-spec §2-3) | tek yönlü | **Sert** | Işık bölgesi tanımı (oda-bazlı + `CYCLOPS_LIGHT_RADIUS`), Polyphemos'un oda-bazlı PRESENT konumu |
| HUD | tek yönlü | **Yumuşak** | Kehribar kenar parıltısı |
| Oyun durumu | tek yönlü (dolaylı, unutuş üzerinden) | **Yumuşak** | Doğrudan hiçbir fazı değiştirmez |

---

## 7. Ayar düğmeleri

| Düğme | Çok yüksekse | Çok düşükse |
|---|---|---|
| `DETECT_RATE_LIT_MOVING` | Öğrenme eğrisi çok dik, oyuncu ilk temasta anında yakalanır, "adaletsiz" hissi | Aydınlıkta koşturmanın hiçbir bedeli kalmaz, matrisin en riskli hücresi anlamını yitirir |
| `DETECT_DECAY` | Gölge cebinde bekleme stratejisi bedava hale gelir, gerilim düşer | Toparlanma hiç hissedilmez, oyuncu "bozuk" sanır |
| `CAUGHT_MEM_SPIKE` | Tek yakalanma neredeyse kayıp finaline eşitlenir — mağaraya girmek riski unutuşu yönetmekten daha pahalı hale gelir | Yakalanmanın gerçek bir bedeli kalmaz, "büyük bir olay" hissi kaybolur |

---

## 8. Kabul kriterleri

- **GIVEN** oyuncu gölgede ve durgun, **WHEN** 10 saniye geçer, **THEN** `DETECT` değişmez (`DETECT_RATE_SHADOW_STILL = 0`).
- **GIVEN** oyuncu PRESENT evresinde ağıllar odasında aydınlıkta hareket ediyor, **WHEN** ~2.8 saniye geçer, **THEN** `DETECT`, `DETECT_MAX`'a ulaşır ve yakalanma tetiklenir.
- **GIVEN** oyuncu yakalanıyor ve çantasında 3 öğe var, **WHEN** yakalanma olayı işlenir, **THEN** çanta `0`'a döner, unutuş `CAUGHT_MEM_SPIKE` (30.0) kadar artar, oyuncu mağara ağzına (`D≈4`) ışınlanır ve `DETECT` `0`'a döner.
- **GIVEN** oyuncu yakalanıyor ve çantası boş, **WHEN** yakalanma olayı işlenir, **THEN** `CAUGHT_MEM_SPIKE` yine de tam uygulanır.
- **GIVEN** `DETECT` herhangi bir değerde, **WHEN** oyuncu olgun bir azıkta E'yi `HARVEST_HOLD` boyunca basılı tutar, **THEN** toplama normal süresinde tamamlanır (algılanma toplamayı etkilemez).
- **GIVEN** Polyphemos DÖNÜŞ evresine geçiyor, **WHEN** evre değişir, **THEN** tüm `DETECT` oranlarına `CYCLOPS_RETURN_MULTIPLIER` (1.5×) anında uygulanır.
- **GIVEN** unutuş zaten `MEM_MAX`'a yakın (`MEM_GRACE` sürüyor) ve oyuncu yakalanıyor, **WHEN** `CAUGHT_MEM_SPIKE` uygulanır ve unutuş `MEM_MAX`'ı geçer, **THEN** mevcut koşu-bazlı kayıp akışı (§3.4 madde 6) devreye girer — ikinci bir kayıp yolu tetiklenmez.
- **GIVEN** oyun Esc ile duraklatıldı, **WHEN** 30 saniye beklenir, **THEN** `DETECT` ve Polyphemos'un evre saati değişmemiştir.

---

## Açık sorular (level-spec'ten devralınan, hâlâ açık)

Level-spec'in (`level-cyclops-cave.md` §12) `game-designer`'a bıraktığı sorulardan bu dokümanla **karara bağlananlar**: madde 2 (respawn konumu → mağara ağzı, §3.4 madde 4).

Hâlâ açık, bu dokümanın kapsamı dışında (sahip/`art-director`/`island-designer` kararı):

1. **§0.2'deki anlatı çerçevesi** (level-spec madde 1) — oyuncunun "tayfanın reddedilen önerisini" yapması mı, farklı bir gerekçe mi. Bu doküman mekanik/sayısal karar veriyor, anlatı tonuna karışmıyor.
2. **`CYCLOPS_ITEM_TOTAL`** (level-spec madde 3) — bu dokümanda `7` olarak öneri sabitlendi (`tuning.md` §12), ama level-spec'in kendi önerdiği gibi **playtest'e ertelenmiş** (🔬) kalıyor.
3. **Polyphemos "çoğunlukla duyulan, kısaca görülen" mü, görünür bir figür mü** (level-spec madde 4) — sanat/teknik kapsam kararı, bu dokümanın dışında.
4. **Koca kayanın dekor kalması yeterli mi** (level-spec madde 6) — anlatı/görsel kapsam kararı.
