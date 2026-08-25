# GDD — Algılanma (Tespit) Sistemi — Kiklop Mağarası

> **Durum:** onaylandı (kavramsal) — sayılar 🔬 playtest'e ertelendi. **Bu turda (24 Ağu 2026, `@helix`) D3 ile uzlaştırıldı** — bkz. üst uyarı kutusu hemen aşağıda.
> **Tarih:** 2026-08-14 · **Uzlaştırma:** 2026-08-24
> **🔴 D3 uzlaştırma notu (24 Ağu 2026, sahip + `@helix`):** sahip'in D3 kararı ("bu adada unutuş/bellek sistemi YOK") ve yeni "körleşme" çekirdek mekaniği (kapı = OUT/RETURN/PRESENT'in fiziksel karşılığı), bu dokümanın **kurulduğu** temel varsayımı geçersiz kılıyor: aşağıdaki §1'in "algılanma tek bir unutuş kaynağına besleniyor, ikinci can barı değil" iddiası ve ona bağlı her yer (§2 tablosunun yarısı, §3.4 madde 2–3/6, §3.5, §5'in son iki maddesi, §6 bağımlılık tablosunun unutuş satırı, §7'nin `CAUGHT_MEM_SPIKE` düğmesi, §8'in ilgili kabul kriterleri) **artık geçersiz.** Hiçbiri silinmedi — her biri yerinde `~~üstü çizili~~` + **"artık geçersiz (D3, 24 Ağu 2026, sahip) — bkz. `gdd-cyclops-blinding.md`"** notuyla işaretlendi ve yerine geçen kural yazıldı. **`DETECT` matrisinin kendisi (rate'ler, evre çarpanları) değişmedi** — yalnızca *neye beslendiği* değişti: artık hiçbir yere (bkz. `gdd-cyclops-blinding.md` §1). Yeni otorite döngü süreleri (`CYCLOPS_CYCLE`/`PHASE_*`) ve kapı/ezilme katmanı için: **`gdd-cyclops-blinding.md`.**
> **Kaynak:** `island-designer`'ın `docs/design/level-cyclops-cave.md` §4/§10/§12'de önerdiği sistem; bu doküman onu `game-designer` tarafında karara bağlıyor. `level-cyclops-cave.md` **kilitli** — bu doküman onu değiştirmez, ona sayısal/mekanik karar verir.
> **Kapsam:** bu, **yalnızca Kiklop Mağarası'na (2. durak) özgü, yerel bir sistem.** ~~`gdd-memory-system.md`'nin yerini almaz, ona beslenir — bkz. §3.3.~~ **Artık geçersiz (D3) — bu adada `gdd-memory-system.md` hiç okunmuyor/yazılmıyor, beslenecek bir unutuş sistemi yok.** Diğer duraklar (Lotus Adası, Sirenler Geçidi) bu dosyayı hiç okumaz.
> **Bağlı doküman:** `level-cyclops-cave.md` (yerleşim, mitolojik çapa, açık sorular) · **`gdd-cyclops-blinding.md` (YENİ, 24 Ağu 2026 — kapı/körleşme/ezilme, aynı zaman çizgisinde çalışan üst katman, döngü süreleri artık orada)** · ~~`gdd-memory-system.md` (kardeş/üst sistem — tek unutuş kaynağı)~~ **artık geçersiz (D3)** · `gdd-lotus-collection.md` (toplama sözleşmesinin referans noktası — bkz. §1) · `multi-island-concept.md` §6/M3 (P1 sütununun koşu-aşırı korunma ilkesi) · `tuning.md` §12 (sabitler)

---

## 1. Genel bakış

Algılanma, Kiklop Mağarası'nın **yerel twist'i** — Lotus Adası'nın "toplamak = tek fiil, iki yön" ilkesini (P1) bozmadan, ona ikinci bir vana ekliyor. Oyuncu mağarada azık toplarken **ışık** (aydınlık bölgede mi) ve **hareket** (WASD basılı mı) eksenlerinde bir "algılanma" değeri biriktirir; bu değer dolarsa ya da oyuncu deve fiziksel olarak çok yaklaşırsa (`gdd-cyclops-blinding.md` §5, ezilme) Polyphemos oyuncuyu **yakalar**. ~~Yakalanma iki şey yapar: taşınan tüm azığı sıfırlar (istemsiz envanter kaybı — bu projede bir ilk, bkz. §1.1) ve **tek unutuş kaynağına** büyük bir tek seferlik darbe ekler.~~ **Artık geçersiz (D3/D2, 24 Ağu 2026, sahip) — bkz. `gdd-cyclops-blinding.md` §4.4/§5.** Yakalanma/ezilme artık tek bir şey yapar: taşınan azığı yakalanma noktasının 1–2 m çevresine **döker** (yok etmez, `CAUGHT_ITEM_DROP`/`CAUGHT_DROP_RADIUS`, `tuning.md` §12) ve oyuncuyu mağara ağzına ışınlar. **Unutuşa hiçbir yazma yok** — bu adada unutuş sistemi çalışmıyor (D3).

~~**Kritik tasarım kararı — neden ayrı bir "can barı" değil:** algılanma kendi başına bir kayıp/ölüm koşulu **değildir.** Yakalanmanın tek sonucu, oyunun zaten var olan tek tehdit kaynağına (unutuş) beslenmesidir. Eğer bu darbe unutuşu `MEM_MAX`'a taşırsa, **mevcut** `MEM_GRACE`/koşu-bazlı-kayıp akışı devreye girer — yeni bir ikinci ölüm yolu icat edilmiyor. Bu, `game-concept.md` P1'in ("tek mekanik, iki yön") koşu-aşırı ölçekte korunmasının yoludur ve `multi-island-concept.md` §6/M3'te önceden çizilen ilkenin (her durak ortak omurgaya kendi twist'ini ekler, yerini almaz) birebir uygulamasıdır.~~

**Artık geçersiz (D3, 24 Ağu 2026, sahip) — bkz. `gdd-cyclops-blinding.md` §1.** Beslenecek bir unutuş kaynağı kalmadığı için yukarıdaki gerekçenin kendisi anlamını yitirdi. **Yerine geçen kural:** algılanma (ve ezilme) hâlâ ayrı bir "can barı" değil — ama artık bunun nedeni "tek bir dış sisteme besleniyor" değil, **hiçbir yere beslenmiyor olması.** Her iki tetikleyici de (DETECT dolması, fiziksel ezilme) aynı `onCaught()`'a akar; `onCaught()`'un tek sonucu zaman kaybı + envanterin geçici dökülmesidir (`gdd-cyclops-blinding.md` §4.0/§4.4) — hiçbir global/kalıcı değere yazmaz, hiçbir sayaç "dolup" durağı bitirmez. P1 ("tek mekanik, iki yön") artık *unutuşa bağlanarak* değil, *hiçbir kalıcı cezası olmayarak* korunuyor — daha temiz bir sonuç, ayrıntı `gdd-cyclops-blinding.md` §1.

### 1.1 Sözleşme değişikliği — açıkça kayıtta

Bugüne kadar hiçbir sistem, oyuncunun **istemi dışında** çantasındaki bir öğeyi azaltmıyordu (`gdd-lotus-collection.md`'de toplama yalnızca teslimle azalır, unutuş hiçbir zaman toplamaya/envantere müdahale etmez — ~~`gdd-memory-system.md` §3.3: "Unutuş... toplamayı asla engellemez"~~ **bu adada artık konu dışı, D3**). Bu sistem bunu **yalnızca Kiklop Mağarası'nda** kırıyor: yakalanma/ezilme, taşınan tüm azığı ~~anında sıfırlıyor~~ **artık geçersiz (D2) — anında yere döküyor, tekrar toplanabilir kalıyor, havuzdan silinmiyor** (bkz. `gdd-cyclops-blinding.md` §4.0, `tuning.md` §12 `CAUGHT_ITEM_DROP`). Bu, `gdd-lotus-collection.md`'nin Lotus Adası için tanımladığı sözleşmeyi **değiştirmiyor** (o doküman hâlâ doğru — Lotus Adası'nda hâlâ hiçbir şey envanteri istemsizce azaltmıyor); yeni sözleşme yalnızca bu dosyanın kapsadığı durakta geçerli, ve D2 sonrası artık "azaltma" bile değil, "geçici olarak taşıma" (item hiçbir zaman gerçekten kaybolmuyor). Değerlendirme sonucu: **onaylandı** (bkz. §2) — istisna hâlâ açıkça işaretli, sessizce genelleşmiyor.

---

## 2. Değerlendirme — mevcut mekaniklerle çelişiyor mu?

| Kontrol | Sonuç |
|---|---|
| ~~Unutuş sisteminin şeklini bozuyor mu?~~ | **Artık geçersiz (D3) — konu dışı.** Bu adada unutuş sistemi hiç çalışmıyor, bozulacak bir şey yok. |
| Koşu-bazlı kayıp finaliyle çelişiyor mu? | **Hayır — daha da güçlü bir "hayır".** K40 zaten koşu-bazlı kayıp finalini tamamen kaldırdı (duraklar bağımsız); bu durağın kendi bitiş sözleşmesi `gdd-cyclops-blinding.md` §6'da türetildi: **hiçbir kayıp koşulu yok** (Seçenek A). |
| İkinci bir "can barı" / gizli ekranda gösterge yaratıyor mu? (P1, P2 sütunları) | **Hayır, D3 sonrası daha da net bir "hayır":** algılanma oyuncuya sayı olarak gösterilmiyor (§4.3, değişmedi) ve artık **hiçbir kalıcı değere de beslenmiyor** — eskiden en azından unutuş üzerinden dolaylı bir "can barı" tadı vardı, şimdi o bağ da yok. `gdd-cyclops-blinding.md` §1'in P1 kontrolü. |
| `HARVEST_HOLD`/toplama mekaniğiyle çakışıyor mu? | **Hayır, ama yeni bir kısıt eklendi (körleşme):** toplama fiili (E, 1.2 s) hiç değişmedi — ama artık yalnızca kapı **açıkken** (OUT/RETURN) çalışıyor, PRESENT'te tamamen devre dışı (`gdd-cyclops-blinding.md` §0 madde 3). Bu, algılanma sisteminin değil, körleşme katmanının kısıtı. |
| Yeni bir kontrol tuşu gerektiriyor mu? (zıplama/koşma yok kararı) | **Hayır.** "Durgun kalmak" = WASD'a basmamak; mevcut kontrol şemasıyla çalışıyor. |
| İstemsiz envanter kaybı bir sözleşme ihlali mi? | ~~**Evet, ama bilerek ve yerel.**~~ **Güncellendi (D2) — artık kayıp bile değil.** Yakalanma/ezilme artık azığı yok etmiyor, yakalanma noktasına **döküyor** (`CAUGHT_ITEM_DROP`, `tuning.md` §12) — tekrar toplanabilir kalıyor. Sözleşme ihlali daha da hafifledi: istemsiz bir **taşıma**, istemsiz bir **kayıp** değil. |

**Sonuç: sistem onaylandı, D3/D2/körleşme ile uzlaştırıldı (24 Ağu 2026).** `level-cyclops-cave.md`'ye geri bildirim/düzeltme gerekmiyor — dosyaya dokunulmadı (kilitli, `@cove` zaten güncelledi). Aşağıda level-spec'in `game-designer` kararına bıraktığı açık noktalar (respawn konumu, kesin sayılar) karara bağlandı; döngü süreleri ve kapı katmanı artık `gdd-cyclops-blinding.md`'de.

---

## 3. Ayrıntılı tasarım

### 3.1 Çekirdek kurallar

1. **Algılanma** (`DETECT`), `0.0`–`DETECT_MAX` arasına kenetlenmiş, ~~unutuştan **tamamen ayrı**~~ **artık kıyaslanacak bir unutuş değeri bile yok (D3) — `DETECT` bu adanın tek risk sayacı** bir float değerdir. Yalnızca Kiklop Mağarası'nda vardır, mevcut olduğu sürece geçerlidir; oyuncu Lotus Adası'na ya da Sirenler Geçidi'ne geçtiğinde bu değer anlamsızlaşır (yeni durakta sıfırdan/tanımsız başlar, taşınmaz — zaten K40 hiçbir durum taşımıyor, bkz. `multi-island-concept.md` §10).
2. Her karede net değişim, oyuncunun bulunduğu **ışık** durumu (aydınlık/gölge) ve **hareket** durumu (WASD basılı/basılı değil) ikilisine göre 2×2 matristen okunan bir orandır (§4.1) — **artık kapı durumuna (`doorGlobal`) ve devin yakınlığına da bağlı**, bkz. `gdd-cyclops-blinding.md` §4.0'ın bileşik formülü.
3. `DETECT` **hiçbir zaman** ekranda sayı, bar ya da yüzde olarak gösterilmez (P2). Sunumu §3.3'te.
4. ~~Polyphemos'un konumu deterministik bir döngüdür (`CYCLOPS_CYCLE`, §3.2) — rastgele devriye değildir (P3, `LOTUS_PHASE_SEED` ile aynı ilke).~~ **Kısmen güncellendi (24 Ağu 2026, `@helix`) — bkz. `gdd-cyclops-blinding.md` §2/§3.1.** Evre saati (`CYCLOPS_CYCLE` ve alt evre süreleri) hâlâ deterministik/sabit — bu doğru kaldı. Ama devin PRESENT'teki **hedef derinliği** artık gerçekten rastgele (sahip'in birebir talebi, "her döngüde farklı, öngörülemez") — sabit kural (dağılım yüzdeleri), rastgele sonuç (her giriş bağımsız çekiliş). Ayrıntı ve P3 uzlaştırması `gdd-cyclops-blinding.md` §3.1'de.
5. `DETECT ≥ DETECT_MAX` **ya da** oyuncu-dev mesafesi `CYCLOPS_CRUSH_RADIUS`'un altına düştüğünde **yakalanma/ezilme** tetiklenir (`gdd-cyclops-blinding.md` §4.0/§5): tek seferlik olay, ardından `DETECT` `0`'a döner. ~~(§3.4)~~ **§3.4 aşağıda güncellendi.**
6. Algılanma **toplamayı hiçbir zaman engellemez** (kapı açıkken) — ~~unutuşun toplamaya asla müdahale etmemesiyle aynı ilke (`gdd-memory-system.md` §3.1 madde 10)~~ **artık bu ilkenin kaynağı `gdd-lotus-collection.md`'nin genel toplama sözleşmesi, unutuş referansı değil (D3).** Yüksek `DETECT` ile de `HARVEST_HOLD` normal şekilde tamamlanır; tek fark, o sırada bulunduğun ışık/hareket durumu `DETECT`'i yükseltmeye devam eder. **Kapı kapalıyken (PRESENT) ise toplama zaten tamamen devre dışı** — bu, `DETECT`'ten bağımsız, körleşme katmanının kısıtı (`gdd-cyclops-blinding.md` §0 madde 3).

### 3.2 Polyphemos'un döngüsü — ~~güncel değil, bkz. `gdd-cyclops-blinding.md`~~

> **🔴 Bu alt bölümün sayıları artık geçersiz — otorite `gdd-cyclops-blinding.md` §2'ye taşındı (24 Ağu 2026).** Aşağıdaki tablo yalnızca tarihsel referans için üstü çizili bırakıldı; motor tarafı **`tuning.md` §12`'deki güncel değerleri okumalı.**

~~| Evre | Süre (öneri, 🔬) | `DETECT` üstündeki etkisi |~~
~~|---|---|---|~~
~~| **DIŞARIDA** | `CYCLOPS_PHASE_OUT` = 58 s | Tüm oranlar temel (§4.1) değerlerinde. |~~
~~| **DÖNÜŞ (telegraf)** | `CYCLOPS_PHASE_RETURN` = 7 s | `CYCLOPS_RETURN_MULTIPLIER` = `1.5×`. |~~
~~| **İÇERİDE (PRESENT)** | `CYCLOPS_PHASE_PRESENT` = 30 s | Ağıllar/iç nöy'de `CYCLOPS_PRESENT_MULTIPLIER` = `3.0×`. |~~

**Güncel (24 Ağu 2026):** `CYCLOPS_PHASE_OUT` = **58.0 s** (değişmedi) · `CYCLOPS_PHASE_RETURN` = **8.0 s** (7→8, `gdd-cyclops-blinding.md` §2.3'ün tepki-payı gerekçesi) · `CYCLOPS_PHASE_PRESENT` = **30.0 s** (değişmedi, yeniden gerekçelendirildi — devin en derin gezinmesini karşılayan minimum, §2.4) · `CYCLOPS_CYCLE` = **96.0 s** `[TÜRETİLMİŞ]`. `CYCLOPS_RETURN_MULTIPLIER` (1.5×) ve `CYCLOPS_PRESENT_MULTIPLIER` (3.0×, yalnız ağıllar/iç nöy) **değişmedi** — sahip'in "eski oda-bazlı çarpan hâlâ geçerli" kararı (§0.4 madde 7, `level-cyclops-cave.md`). **Yeni:** kapı kapalıyken (PRESENT) depo/mağara ağzı istisnası artık farklı okunmalı — eskiden "Polyphemos o odalara girmiyor" deniyordu, şimdi devin PRESENT'te **herhangi bir** odaya gidebileceği rastgele bir sistem var (`gdd-cyclops-blinding.md` §3); depo/mağara ağzının çarpansız kalması artık "dev oraya hiç gitmiyor" değil, **"oda-bazlı `CYCLOPS_PRESENT_MULTIPLIER` yalnızca ağıllar/iç nöy'de tanımlı, diğer ikisinde asla uygulanmıyor"** kuralına dayanıyor — devin o odalarda fiziksel olarak durması ayrı bir risk katmanı (ezilme, proximity) olarak zaten var, DETECT çarpanı olarak yok.

### 3.3 Sunum (P2 disiplini)

`DETECT` sayı/bar olarak gösterilmez. Önerilen sunum katmanı (ayrıntı `art-director`/`ui-programmer`'ın işi, burada yalnızca işlev tarifi):

- **Kehribar/turuncu bir kenar parıltısı** — unutuşun süt beyazı vinyetinden görsel olarak ayrışan, ayrı bir renk kanalı (level-spec §4.5 madde 3'ün önerisiyle aynı).
- **Ses:** oyuncunun kendi ayak sesi + nefesi `DETECT` yükseldikçe hafifçe belirginleşir (level-spec §11'deki "uzak nefes/horlama" katmanının tersi — burada oyuncunun *kendi* sesi ihanet ediyor).
- **Eşik yok, sürekli eğri:** `DETECT` sunumu **sürekli** bir eğridir — `etki = clamp01(DETECT / DETECT_MAX)`. Ayrık davranan tek şey yakalanma anının kendisidir (§3.4). ~~(unutuşun 4 ayrık eşiğinin aksine)~~ **karşılaştırma konusu artık yok (D3), ama sonuç aynı: DETECT'in sunumu hep sürekli olmuştu.**

### 3.4 Yakalanma/Ezilme — 🔴 tamamen güncellendi (24 Ağu 2026, sahip D2/D3 + körleşme)

> Aşağıdaki 6 madde artık geçersiz, üstü çizili bırakıldı; otorite `gdd-cyclops-blinding.md` §4.0/§4.4/§5'e taşındı. Motor tarafı o dokümanın `onCaught()` sözde-koduna göre uygulamalı.

~~1. `DETECT ≥ DETECT_MAX` olduğu anda tetiklenir.~~
~~2. **`CAUGHT_ITEM_LOSS`** = `true` — çantadaki tüm taşınan azık **anında sıfırlanır.** Kayıp öğeler havuza geri dönmez.~~
~~3. **`CAUGHT_MEM_SPIKE`** = `30.0` puan — **tek unutuş kaynağına** tek seferlik eklenir.~~
~~4. **`CAUGHT_RESPAWN_POINT`** = mağara ağzı (`D ≈ 4`).~~
~~5. **`DETECT` yakalanma sonrası `0`'a döner**.~~
~~6. **Ölüm/game-over yok**, unutuş `MEM_MAX`'a ulaşırsa `MEM_GRACE` devreye girer.~~

**Yerine geçen (D2/D3/körleşme, `gdd-cyclops-blinding.md` §4.0/§5):**

1. **İki tetikleyici** — `DETECT ≥ DETECT_MAX` **ya da** oyuncu-dev mesafesi `CYCLOPS_CRUSH_RADIUS`'un (2.0 m) altına düşerse — **aynı** `onCaught()`'u tetikler.
2. **`CAUGHT_ITEM_DROP`** = `true` (yeniden adlandırıldı, eski `CAUGHT_ITEM_LOSS`) — çantadaki tüm taşınan azık, yakalanma noktasının `CAUGHT_DROP_RADIUS`'u (2.0 m) çevresine **dökülür**, tekrar toplanabilir kalır, havuzdan **silinmez** (D2). Kalıcı kayıp yok.
3. **`CAUGHT_MEM_SPIKE` tamamen kaldırıldı (D3).** Hiçbir bellek/global değere yazılmıyor — beslenecek bir unutuş kaynağı yok.
4. **`CAUGHT_RESPAWN_POINT`** = **mağara ağzı** (`D ≈ 4`) — **değişmedi**, 14 Ağustos'un kararı hâlâ geçerli, gerekçe D3 sonrası da hâlâ tutarlı (turu sıfırlamayan, hissedilir bir ceza).
5. **`DETECT` yakalanma sonrası `0`'a döner** — değişmedi.
6. **Ölüm yok — ama deneme kaybı VAR (güncellendi 25 Ağu 2026, sahip).** ~~"Ölüm/game-over yok, hiçbir koşulda."~~ Tek bir yakalanma hâlâ hiçbir fazı değiştirmiyor (D2/C2: azık dökülür, mağara ağzına ışınlanma, ilerleme korunur). **Ama `CYCLOPS_CRUSH_CAP` = 3:** bir denemedeki **3. yakalanma/ezilme** durağı **başarısız** bitirir — oyuncu hub'a döner ve **o denemedeki tüm ilerleme (teslim edilen azık dahil) sıfırlanır.** Bu bir *ölüm* değil, bir *deneme kaybı*: kalıcı hiçbir ceza yok, hub kilidi açık kalır, durak **sınırsız kez** yeniden denenebilir. Sözleşmenin tamamı: `gdd-cyclops-blinding.md` bitiş/kayıp sözleşmesi; sabit: `tuning.md` §12.

### 3.5 Diğer sistemlerle etkileşim — 🔴 güncellendi

> Eski tablonun unutuş satırı geçersiz (D3); "Ada geçişi" satırı K40 yüzünden de konu dışı (duraklar arası hiçbir şey taşınmıyor zaten).

| Sistem | Yön | Ne akar |
|---|---|---|
| ~~**Unutuş** (`gdd-memory-system.md`)~~ | — | **Artık geçersiz (D3) — bu satır tamamen kalktı, `DETECT` hiçbir yere beslenmiyor.** |
| **Kiklop toplama** (`level-cyclops-cave.md` §5) | Algılanma/körleşme → Toplama | `CAUGHT_ITEM_DROP` — çanta dökülür (yok olmaz). Ayrıca körleşme katmanı: PRESENT'te toplama tamamen kapalı, `DETECT`'ten bağımsız (`gdd-cyclops-blinding.md` §0 madde 3). |
| **Körleşme/kapı** (`gdd-cyclops-blinding.md`) | çift yönlü | `lit` hesaplaması artık `doorGlobal` + yerel kaynakları birleştiriyor (§4.0'ın bileşik formülü); PRESENT'in oda çarpanı `DETECT`'e biniyor; `DETECT`'in kendisi kapı durumunu etkilemiyor (tek yönlü: kapı → DETECT). |
| ~~**Ada geçişi**~~ | — | **Konu dışı (K40) — duraklar arası hiçbir şey taşınmıyor, bu satıra gerek kalmadı.** |
| **HUD** | Algılanma → HUD | Kehribar kenar parıltısı (§3.3); sayı/bar yok. |

---

## 4. Formüller

### 4.1 Taban oranlar (2×2 matris, `CYCLOPS_PHASE_OUT` içinde, hiçbir çarpan yokken)

| | **Gölgede** | **Aydınlıkta** |
|---|---|---|
| **Durgun** | `DETECT_RATE_SHADOW_STILL` = `0.0` puan/s | `DETECT_RATE_LIT_STILL` = `4.0` puan/s |
| **Hareket halinde** | `DETECT_RATE_SHADOW_MOVING` = `3.0` puan/s | `DETECT_RATE_LIT_MOVING` = `12.0` puan/s |

~~Evre çarpanı uygulanmış net oran: `d(DETECT)/dt = taban_oran(ışık, hareket) × evre_çarpanı(§3.2) − DETECT_DECAY (yalnızca hiçbir oda-bazlı risk yokken, örn. depo/mağara ağzı, PRESENT evresinde bile)`~~

**🔴 `DETECT_DECAY` belirsizliği kapatıldı (24 Ağu 2026, `@helix`).** Yukarıdaki eski ifade iki farklı okumaya açıktı: "oda bazında güvenli" mi (o zaman ağıllar/iç nöy PRESENT'te asla decay almaz, §3.3'ün "gölge cebinde bekle, DETECT düşsün" beklentisiyle çelişir — o beklenti tam olarak ağıllar odasının gölge cebinde geçiyor) yoksa "hücre bazında güvenli" mi (gölge+durgun olduğun her an, oda fark etmeksizin)? **Karar: hücre bazında.** Üretim planının önerisini (§2.2) resmî formül olarak benimsiyorum:

```
decay = (base == 0) ? DETECT_DECAY : 0     // base = taban_oran(ışık, hareket) — yalnızca gölge+durgunken (SHADOW_STILL) sıfır
detect = clamp(detect + (base × roomMult × proximityMult − decay) × dt, 0, DETECT_MAX)
```

Bu, `gdd-cyclops-blinding.md` §4.0'ın bileşik formülüyle **birebir aynı** — orası artık bu formülün tek otoritesi, döngü çarpanı + kapı + proximity katmanlarıyla birlikte. Sonuç: matrisin en güvenli hücresi (gölge+durgun) her zaman gerçekten güvenli — oda ya da evre fark etmeksizin, `@cove`'un saklaş noktalarının hepsi zaten bu hücreye düşecek şekilde yerleştirildiği için (`gdd-cyclops-blinding.md` §4.2) bu okuma level-spec'in "gölge cebinde bekle" dersini doğru besliyor.

`DETECT_DECAY` = `8.0` puan/s — **değer değişmedi**, yalnızca hangi koşulda uygulandığı netleşti.

**Örnek:** PRESENT evresinde, ağıllar odasında, aydınlıkta hareket halinde: `12.0 × 3.0 = 36.0` puan/s → `DETECT_MAX` (100) sıfırdan **~2.8 saniyede** dolar. Bu kasıtlı: level-spec'in "en riskli" olarak işaretlediği hücre gerçekten anlık cezalandırıcı olmalı.

### 4.2 `DETECT_MAX`

`DETECT_MAX` = `100.0` puan — 0–100 puan/birimsiz ölçek, `tuning.md` §0 sözleşmesiyle tutarlı.

### 4.3 `lit` bayrağı ↔ kapının sürekli görünürlük değeri — 🔴 kapatıldı (24 Ağu 2026, `@helix`, `level-cyclops-cave.md` §4.6'nın flag'ine yanıt)

`level-cyclops-cave.md` §4.6, kapı durumuna bağlı **sürekli** (0–1) bir görünürlük tablosu üretti ve `DETECT`'in **ikili** `lit` bayrağıyla nasıl eşleşeceğini `@helix`'e bıraktı. **Karar: `lit` ikili kalıyor (bu dokümanın 2×2 matrisi değişmiyor), ama artık pozisyonel/sürekli bir hesaptan türetiliyor** — oda ortalaması değil, oyuncunun **o anki konumu**:

```
doorGlobal(D) = doorOpen ? clamp01(1 − D / CYCLOPS_DOOR_LIGHT_REACH) : 0     // §4.6'nın formülü, aynen
inLocalSource = oyuncu herhangi bir yerel kaynağın (ocak/meşale) yarıçapı içinde mi (ikili, mevcut kurgu)
lit = inLocalSource || doorGlobal(D) >= CYCLOPS_DOOR_LIT_THRESHOLD
```

`CYCLOPS_DOOR_LIT_THRESHOLD` = **0.5** `[TÜRETİLMİŞ]` — `@cove`'un bölge sınırlarıyla temiz örtüşüyor: mağara ağzı (D≈4, `doorGlobal≈0.91`) ve depo (D=12–20, `doorGlobal≈0.56–0.73`) kapı açıkken her zaman `lit=true` (günışığı baskın); ağıllar girişinden (D=26, `doorGlobal≈0.42`) itibaren tek başına günışığı yetersiz kalıyor, `lit` durumu oradan sonra tamamen yerel kaynaklara (ocak/meşale) devrediyor — tam da `@cove`'un "derin odalar kapı açıkken bile loş" tespitinin sayısal karşılığı. Kapı kapalıyken `doorGlobal=0` her yerde (§4.6), yani PRESENT'te `lit` yalnızca ocak (küçülmüş, 3.0 m) ya da meşale (3.0 m) yarıçapında kalıyor — geri kalan her yer otomatik olarak matrisin gölge satırına düşüyor. **Not:** §4.6'nın "kapı kapalıyken mağara ağzı 0.35" gibi görsel/tonal değerleri (art-bible'ın "ekranı hiç karartma" tabanı) bu `lit` bayrağından **ayrı** bir kavram — biri oyun mantığı, biri saf görsel taban, birbirine karıştırılmamalı.

### 4.4 `CYCLOPS_LIGHT_RADIUS_PRESENT` (ocak küçülmesi) × `CYCLOPS_PRESENT_MULTIPLIER` çift-ceza riski — 🔴 kapatıldı (24 Ağu 2026, `@helix`, `level-cyclops-cave.md` §12 madde 11'e yanıt)

**Karar: çift ceza riski yok, öneri (3.0 m) aynen kabul edildi.** Gerekçe — iki etki **farklı eksenlerde** çalışıyor, çarpışmıyor: ocağın yarıçapının küçülmesi (6.0 → 3.0 m) yalnızca **oyuncunun hangi hücrede olduğunu** belirliyor (daha küçük yarıçap = daha büyük gölge alanı = oyuncunun "aydınlık" değil "gölge" satırına düşme ihtimali **artıyor**, yani bu bir *rahatlama*, bir ceza değil); `CYCLOPS_PRESENT_MULTIPLIER` (×3.0) ise **hangi hücrede olursan ol, o hücrenin oranını** çarpıyor. Yani radius küçülmesi "hangi kutuya düştüğünü", çarpan "o kutunun ne kadar pahalı olduğunu" belirliyor — aynı ekseni iki kez cezalandırmıyorlar, tam tersine radius küçülmesi çarpanın sertliğini kısmen **dengeliyor** (ocağın hemen yanında durmadıkça artık PRESENT'te otomatik "aydınlık" sayılmıyorsun). **Sonuç:** `CYCLOPS_LIGHT_RADIUS_PRESENT = 3.0 m` [TÜRETİLMİŞ] onaylandı, `tuning.md` §12'ye eklendi.

---

## 5. Sınır durumlar — 🔴 güncellendi

- ~~**Çanta boşken yakalanma:** `CAUGHT_ITEM_LOSS` hiçbir şey yapmaz (kaybedilecek öğe yok), `CAUGHT_MEM_SPIKE` yine de **tam** uygulanır.~~ **Güncellendi:** çanta boşken yakalanma/ezilme — `CAUGHT_ITEM_DROP` hiçbir şey yapmaz (dökülecek öğe yok), ama olayın kendisi (ışınlanma + `DETECT=0` + korku FX) yine de tam işler. Envanterin durumundan bağımsız.
- **Toplama sırasında (`HARVEST_HOLD` ortasında) yakalanma:** toplama iptal olmaz, tamamlanır — ama tamamlanan öğe de dahil, çantadaki her şey yakalanma noktasına **dökülür** (~~sıfırlanır~~, D2). Son anda tamamlanan bir hasat da dökülmeden payını alır, ama en azından yeniden toplanabilir.
- **`DETECT`, evre geçişinin tam ortasında yükseliyorsa:** çarpan anlık olarak değişir (kademeli değil) — histerezis **yok**, çünkü `DETECT` ayrık eşiklerle değil sürekli bir oranla çalışıyor; ani çarpan değişimi "telegraf" (DÖNÜŞ evresi, artık **8 s**) ile zaten yumuşatılmış.
- ~~**Oyuncu yakalanma anında `MEM_GRACE` içindeyse...**~~ **Artık geçersiz (D3) — bu adada `MEM_GRACE` diye bir kavram yok, madde tamamen kalktı.**
- **Oyun duraklatılırsa (Esc):** `DETECT`, Polyphemos'un evre saati **ve** devin gezinme ilerlemesi (`gdd-cyclops-blinding.md`) hep birlikte donar — tek bir pause guard'ının altında.
- **🆕 Oyuncu PRESENT'te bir odanın hiçbir saklaş noktasına ulaşamadıysa (RETURN'ü kaçırdı):** `DETECT` ve ezilme normal işlemeye devam eder — özel bir "af" ya da otomatik kurtarma yok. Bu durumun bedeli §4.4'ün (`gdd-cyclops-blinding.md`) `onCaught()` akışı — hâlâ terminal değil, yalnızca zaman/envanter kaybı.

---

## 6. Bağımlılıklar — 🔴 güncellendi

| Bağımlılık | Yön | Sertlik | Arayüz |
|---|---|---|---|
| ~~Unutuş sistemi~~ | — | — | **Artık geçersiz (D3) — satır tamamen kalktı.** |
| **Körleşme/kapı** (`gdd-cyclops-blinding.md`) | çift yönlü | **Sert** | Kapı durumu `lit`i besler (§4.3); PRESENT'in oda çarpanı ve proximity çarpanı `DETECT`'e biner; PRESENT toplamayı `DETECT`'ten bağımsız kapatır |
| Kiklop toplama (`level-cyclops-cave.md` §5) | çift yönlü | **Yumuşak** | Toplama olayları `DETECT`'i etkilemez; `onCaught` çantayı döker (yok etmez) |
| Seviye / mağara (`level-cyclops-cave.md` §2-3) | tek yönlü | **Sert** | Işık bölgesi tanımı (oda-bazlı + `CYCLOPS_LIGHT_RADIUS`/`_PRESENT`), devin rota hattı ve rastgele hedefi |
| HUD | tek yönlü | **Yumuşak** | Kehribar kenar parıltısı |
| Oyun durumu | — | — | **Artık geçersiz (D3) — dolaylı bağ (unutuş üzerinden) yok oldu; `DETECT` hiçbir fazı hiçbir zaman değiştirmiyor, doğrudan da dolaylı da.** |

---

## 7. Ayar düğmeleri — 🔴 güncellendi

| Düğme | Çok yüksekse | Çok düşükse |
|---|---|---|
| `DETECT_RATE_LIT_MOVING` | Öğrenme eğrisi çok dik, oyuncu ilk temasta anında yakalanır, "adaletsiz" hissi | Aydınlıkta koşturmanın hiçbir bedeli kalmaz, matrisin en riskli hücresi anlamını yitirir |
| `DETECT_DECAY` | Gölge cebinde bekleme stratejisi bedava hale gelir, gerilim düşer | Toparlanma hiç hissedilmez, oyuncu "bozuk" sanır |
| ~~`CAUGHT_MEM_SPIKE`~~ | — | **Artık geçersiz (D3) — sabit kaldırıldı, düğme konusuz.** |
| `CAUGHT_DROP_RADIUS` (yeni) | Yakalanma noktasından çok uzağa saçılırsa, dar boğazlarda erişilemez bir konuma düşme riski | Aynı noktaya yığılırsa "dökülme" hissi zayıflar, sanki hiç dökülmemiş gibi anlaşılır |
| `CYCLOPS_CRUSH_RADIUS` (yeni, `gdd-cyclops-blinding.md`) | Geniş odalarda bile kaçınılması imkânsız hale gelir, boğaz dışı alanlar da "kesin ölüm" olur | Boğazda bile ezilme nadirleşir, §3.6'nın "kasıtlı çıplak an" tasarımı işe yaramaz |

---

## 8. Kabul kriterleri — 🔴 güncellendi (D2/D3)

> Aşağıdaki liste eskisinin yerine geçiyor. `CAUGHT_MEM_SPIKE`/unutuş içeren maddeler kaldırıldı; yeni davranışlar `gdd-cyclops-blinding.md` §8'de (15 madde, ezilme/kapı/gezinme dahil) ayrıntılı — burada yalnızca **algılanma matrisinin kendi** kriterleri tekrarlanıyor, çakışma olmasın diye kapı/ezilme kriterleri oraya bırakıldı.

- **GIVEN** oyuncu gölgede ve durgun, **WHEN** 10 saniye geçer, **THEN** `DETECT` değişmez (`DETECT_RATE_SHADOW_STILL = 0`).
- **GIVEN** oyuncu PRESENT evresinde ağıllar odasında aydınlıkta hareket ediyor (kapı kapalıyken de "aydınlık" sayılıyorsa, örn. ocağın 3.0 m'lik `CYCLOPS_LIGHT_RADIUS_PRESENT`'i içinde), **WHEN** ~2.8 saniye geçer, **THEN** `DETECT`, `DETECT_MAX`'a ulaşır ve `onCaught()` tetiklenir.
- **GIVEN** oyuncu yakalanıyor/eziliyor ve çantasında 3 öğe var, **WHEN** olay işlenir, **THEN** çantadaki 3 öğe yakalanma noktasının `CAUGHT_DROP_RADIUS`'u (2.0 m) içine dökülür (yok olmaz, toplanabilir kalır), oyuncu mağara ağzına (`D≈4`) ışınlanır, `DETECT` `0`'a döner — **hiçbir bellek/global değere yazılmaz.**
- **GIVEN** oyuncu yakalanıyor ve çantası boş, **WHEN** olay işlenir, **THEN** dökülecek öğe yoktur ama ışınlanma/`DETECT` sıfırlama/korku FX yine de işler.
- **GIVEN** `DETECT` herhangi bir değerde ve kapı açık, **WHEN** oyuncu olgun bir azıkta E'yi `HARVEST_HOLD` boyunca basılı tutar, **THEN** toplama normal süresinde tamamlanır (algılanma toplamayı etkilemez).
- **GIVEN** kapı kapalı (PRESENT), **WHEN** oyuncu herhangi bir `DETECT` değerinde E'ye basar, **THEN** hiçbir şey olmaz — bu artık `DETECT`'in değil, körleşme katmanının kısıtı (`gdd-cyclops-blinding.md` §0 madde 3).
- **GIVEN** Polyphemos DÖNÜŞ evresine geçiyor, **WHEN** evre değişir, **THEN** tüm `DETECT` oranlarına `CYCLOPS_RETURN_MULTIPLIER` (1.5×) anında uygulanır.
- **GIVEN** oyun Esc ile duraklatıldı, **WHEN** 30 saniye beklenir, **THEN** `DETECT`, Polyphemos'un evre saati ve devin gezinme ilerlemesi değişmemiştir.
- ~~**GIVEN** unutuş zaten `MEM_MAX`'a yakın...**~~ **Artık geçersiz (D3) — madde tamamen kaldırıldı, konusu kalmadı.**

---

## Açık sorular (level-spec'ten devralınan)

Level-spec'in (`level-cyclops-cave.md` §12) `game-designer`'a bıraktığı sorulardan bu dokümanla ve `gdd-cyclops-blinding.md` ile **karara bağlananlar**: madde 2 (respawn konumu → mağara ağzı, değişmedi), **madde 9/10/11 (24 Ağu 2026, `@helix`)** — sırasıyla bu dokümanın D3 uzlaştırması (madde 9), §4.3'ün `lit`/`doorGlobal` eşlemesi (madde 10), §4.4'ün `CYCLOPS_LIGHT_RADIUS_PRESENT`×`CYCLOPS_PRESENT_MULTIPLIER` çift-ceza sorusu (madde 11).

**Artık konu dışı (üst turlarda kapandı, bu dokümanın kapsamı değil):**
1. ~~§0.2'deki anlatı çerçevesi~~ — **Kapandı (D1, 24 Ağu 2026, sahip).** F3 seçildi: azık toplanabilir, tayfa gerekçesiyle, kart metni aynen kalıyor. `level-cyclops-cave.md` §0.2.
4. ~~Koca kayanın dekor kalması yeterli mi~~ — **Yeniden açılıp farklı kapandı (D9, 24 Ağu 2026, sahip).** Kapı artık dekor değil, gerçek bir mekanik — kapanıyor (PRESENT'in başlangıcı), süreli, terminal değil. `level-cyclops-cave.md` §9, bu doküman ve `gdd-cyclops-blinding.md` §6.

**Kavramsal olarak açık madde KALMADI (25 Ağu 2026).** Geriye yalnız playtest'e bağlı, masa başında kapatılamayacak ölçümler kaldı:

2. **`CYCLOPS_ITEM_TOTAL`** — `7` olarak sabitlendi (`tuning.md` §12), **playtest'e ertelenmiş** (🔬). D2/C2'nin unwinnable-fix'i sayesinde artık *güvenlik* değil yalnızca *tempo* sorusu (`level-cyclops-cave.md` §5.3).
3. ~~**Polyphemos "çoğunlukla duyulan, kısaca görülen" mü, görünür bir figür mü**~~ — **✅ KAPANDI (D10, 25 Ağu 2026, sahip): görünür bir figür.** Dev PRESENT boyunca **sürekli sahnede** ve ışığın izin verdiği ölçüde **doğrudan/net görülüyor**; silüet/gizem dili değil. Bu dokümanın "kısaca görülen" varsayımına dayanan her ifadesi geçersizdir. Otorite: `gdd-cyclops-blinding.md` §7.1. Asset sonucu: D4/P-C'nin (tam mesh + doku + rig) yatırım gerekçesi **güçlendi** — model dakikalarca ekranda okunacak.
4. **Ek kapanış (D11, 25 Ağu 2026, sahip):** `art-bible.md`'nin karartma/karanlık-tehdit yasakları **Kiklop Mağarası için resmen açıldı** — bu adada tam karartma serbest ve istenen. Fotosensitivite kısıtları (stroboskop yok, ≥1,5 s geçiş), kırmızı-flaş ve can-barı yasakları **aynen geçerli**. Bkz. `art-bible.md` §9'un Kiklop istisna kutusu.
5. **Kayıp koşulu (25 Ağu 2026, sahip):** `CYCLOPS_CRUSH_CAP` = **3** — bir denemede 3. yakalanma/ezilmede durak başarısız, hub'a dönülür, **o denemedeki tüm ilerleme (teslim dahil) sıfırlanır**, sınırsız tekrar denenebilir. `gdd-cyclops-blinding.md` bitiş/kayıp sözleşmesi.
