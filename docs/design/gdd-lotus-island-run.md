# GDD — Lotus Adası koşusu (K35)

> **Durum:** kodlandı (15 Ağu 2026) — `real` profil. `?profile=test` eski sandbox.
> **Tarih:** 2026-08-15
> **Otorite:** Lotus Adası’nın **oynanır koşusu** için bu dosya kazanır. Çelişen eski cümleler (`gdd-lotus-collection.md` 28/küme/gün-kaybı, `gdd-memory-system.md` §3.1.9 Lotus kayıp finali, `level-lotus-island.md` üç cep, `tuning.md` `DAY` kaybı, `game-concept.md` “güneş batmadan 12”, `scenario.md` 14 Ağu taslağı) **bu adada geçersizdir.** Kiklop / Sirenler bu dosyayı okumaz.
> **Sayılar:** yeni sabitler §7. Eski `MEMORY.*` oranları (`real` profil) korunur; isimler İngilizce kalır.
> **Anlatı:** `scenario.md` (aynı gün K35’e çekildi). Karar kaydı: `lotus-exploration-reframe.md`.
> **Profil:** yalnızca `real` (varsayılan). `?profile=test` eski 28’li sandbox — bu GDD’nin dışında.

**Etiketler:** **[H]** Homeros · **[O]** oyun icadı · **[P]** uygulama varsayılanı (eski açık soru, boşluk kalmasın diye kilitlendi).

---

## 1. Genel bakış

Lotus Adası, üç duraklı koşunun ilk durağıdır. Adada **tam 5** olgunlaşan lotus vardır; her doğuş **rastgeledir**. Doryseus onları arar, çantaya alır, **kahraman gemiye** teslim eder. **5 teslim** Kiklop Mağarası’nı açar. Güneş batar; batış **kayıp değildir**. Unutuş `MEM_MAX` + `MEM_GRACE` dolunca durak bitmez: çanta sıfırlanır, teslim sayacı kalır, **gemi başka bir kıyıya oturur**, oyuncu yerinde kalır. Solan çiçek aynı yerde açılmaz; ada başka bir noktada yeniden doğar. Ada, güzellik ve keşifle tutar. Gizlenmiş güzellikler (manzara, höyük, kadın) isteğe bağlıdır. Kadın ve üç tayfa **gezer**, aynı ikramı uzatır (1 lotus); kadının ek ödülü güverte çelengidir — ikinci sayaç yoktur.

Tek cümle: **ara, unutursan ev kayar, bıraktığın ilaç gemide kalır; beşini bırakmadan sonraki denize çıkılmaz.**

---

## 2. Oyuncu fantezisi

**MDA:** Discovery (ada) + Submission (kalma isteği). Challenge yok sayılmaz: yerel solma + unutuş, ada-saati değil.

Oyuncu şunu hissetmeli:

1. Ada güzel olduğu için kalınır — Homeros’taki tek tehdit **[H]**.
2. Çiçek ezberlenmez; her doğuş yeni bir aramadır.
3. Unutmak ölmek değil, **yolu kaybetmektir**: elindeki gider, geminin yeri gider, ambardakiler durur.
4. Hatıra güzelliğin kanıtıdır, bilet değildir. Beş lotus olmadan dümen açılmaz.

P3 bu adada yeniden yazılır: **peyzaj okunur** (tepe, kıyı, göl, filo güneyde sabit); **çiçek yeri** izinli tek sürprizdir. Rota ustalık tekrarı yoktur; tekrar oynanış yeni tohumdur.

---

## 3. Ayrıntılı kurallar

Programcı yalnızca bu bölüm + §4–§5 ile uygular.

### 3.1 Durum

Koşu başında (`real`, Title → Hub → Lotus):

| Alan | Başlangıç |
|---|---|
| `delivered` | 0 |
| `carried` | 0 |
| `memory` | 0 |
| `grace` | kapalı |
| `forgetIframes` | 0 |
| `dayTime` | 0, `DAY.length` = 420 s bir gün; gün **döner** (§3.8) |
| `shipPos` | ilk kıyı yuvası (§3.7) |
| `plants[5]` | 5 geçerli hücre, rastgele (§3.3) |
| `keepsakes` | `[]` |
| `cyclopsUnlocked` | false |

`test` profili bu tabloyu okumaz.

**Hub girişi:** haritada Lotus’un uydusu — küçük daire + nokta, `Beş yeter` (`docs/ux/screens.md` §3.6). **Yalnızca bu düğüm K35’i açar.** Lotus ada kartı asıl 12’li koşuyu açar. Dördüncü durak değildir.

### 3.2 İlerleme ve çıkış

1. Olgun lotus `HARVEST_RANGE` + `HARVEST_HOLD` ile toplanır. `carried += 1`, `memory += MEM_ON_HARVEST` (`pickSpike`). Bitki dünyadan çıkar; yerine **yeni rastgele hücrede** tomurcuk doğar (dünya her an 5 bitki).
2. `carried` tavanı `CARRY_CAPACITY` = 4. Doluysa hasat başlamaz (U5).
3. Kahraman gemide `DELIVER_RANGE` + E: `delivered += carried`, `carried = 0`, her çiçek için `MEM_PER_DELIVERED` (mevcut `shipRecover` / teslim vuruşu). Kısmi teslim serbest.
4. `delivered >= LOTUS_TARGET` (5) iken dümende E → `phase = departing` → hub. **Kiklop kartı bu koşuda açılır.** Sirenler kendi kilidini korur (K30 hibrit).
5. Hatıra, batış, höyük, kadın, manzara **dümeyi açmaz**.
6. Menüden “Hub’a dön” (abandon): sonraki ada **açılmaz**. `delivered` bu koşu için kaybolur. Anlatı finali yoktur.

### 3.3 Beş lotus — spawn

`LOTUS_TOTAL = 5`. Evreler mevcut döngü: tomurcuk → yarı açık → olgun → solmuş → (despawn) → yeni yerde tomurcuk. `timeJitter` **kapanır** (0): süreler sabit, yer rastgele — öğrenilen şey ada değil, ritimdir.

**Geçerli hücre:**

- `heightAt >= 0` ve oyuncu `wadeFloor` üstünde durabilir.
- Kahraman geminin `SHIP.range * 2` (aura) dışında.
- Diğer 4 bitkiye `LOTUS_MIN_SPACING` = 18 m.
- Kuzey sivri-kaya bandının (`LANDMARK.northSpikes`) içinde değil.
- B1/B2/B3 etkileşim yarıçapının dışında.
- Gölün *tam ortasında* değil (lagün kıyısı serbest; pad üstü serbest).

- Oyuncuya `PLAYER.radius * 4`’ten yakın değil (ayak altında doğmaz).

Reddetmeli örnekleme, en fazla 80 deneme; olmazsa aralığı %20 gevşet, yine 80. Hâlâ olmazsa ada yarıçapı içinde rastgele kara — asla atlama. `goneTime` `real`’de **0**: hasat/solma anında relocate; dünya bir kare bile 4 bitki kalmaz.

**Tohum:** her koşu `runSeed` yeni (QA için bir kez `console.debug` / HUD-dışı log). Aynı koşu içinde unutuş çiçekleri **yeniden saçmaz**.

Başlangıç evreleri: 5 bitkiye `runSeed` ile 0–3 evre kayması (en az **iki** olgun veya yarı açık olsun — ilk 90 s’de aranacak bir şey var).

### 3.4 Solma → başka yer

Bitki `wilt` süresini bitirince yok olur. Aynı kimlikle **yeni geçerli hücrede** tomurcuk doğar. Eski yer boş kalır. `delivered` / `carried` değişmez.

Hasat sonrası da aynı: koparılan yer boş, yeni tomurcuk başka yerde. Dünya = 5.

### 3.5 Unutuş olayı (Lotus’ta K27 yok)

Tetik, mevcut sayılar: `memory` 1.0’a (`MEM_MAX`) pinlenir, `loseHold` (`MEM_GRACE` karşılığı, kodda 6 s) boyunca deniz veya gemi aura’sına girilmezse **forget event**:

1. `carried = 0` (sailor çanta görseli sıfır).
2. `delivered` **değişmez**.
3. Oyuncu **yerinde kalır**.
4. Kahraman gemi §3.7 ile yeni kıyıya oturur. Hatıralar güvertedeyse gemiyle gider.
5. `memory = MEM_FORGET_FLOOR` (0.40). `grace` kapanır.
6. `forgetIframes = FORGET_IFRAMES` (2.0 s): unutuş **artmaz** (azalma serbest: deniz/gemi).
7. Senaryo **F1–F3** (eski kayıp satırları) 4 sn altyazı, oynanış kesilmez, ekran bitmez.
8. `phase` `play` kalır.

Deniz veya gemi aura’sı grace içindeyse olay **yok**: mevcut gibi grace iptal, unutuş düşmeye devam.

Sanrı figürleri (`gdd-lotus-hallucination.md`) durur; temas kuralı değişmez.

### 3.6 Unutuş oranları

`real` profil `MEMORY.*` aynen. Çanta unutuşu hızlandırır (`perCarriedGain`). Gemi aura’sı ve deniz iyileştirir. İç göl iyileştirmez.

Gece (§3.8): `islandGain *= MEM_NIGHT_MUL` (1.25). Diğer oranlar aynı.

`forgetIframes > 0` iken tüm **kazanç** (ada, çanta, göl, hasat spike hariç — hasat zaten iframes’te nadir) 0. Spike hasat iframes’te de uygulanır (çiçek koparmak hâlâ kokar).

### 3.7 Gemi kayması

**Filo (12):** ilk güney kıyısında **sabit** kalır **[P]**. Unuttuğun, hangi teknenin senin olduğudur.

**Kahraman gemi** (teslim + dümen + spawn komşusu):

İlk berth: mevcut `real` gemi `(0, −140)` civarı, kıyı bandı.

Unutuş olayından sonra yeni berth:

- Ada çevresi kıyı bandı: `radius ∈ [ISLAND.radius - 22, ISLAND.radius - 8]`, açı düzgün rastgele.
- Kara, `heightAt` plaj (0–2.5 m), oyuncu yürüyebilir.
- Önceki berth’e `SHIP_RELOCATE_MIN_M` = 40 m.
- Oyuncuya `SHIP_RELOCATE_PLAYER_MIN_M` = 25 m.
- Kuzey sivri kayaya oturmaz.
- 80 deneme + %20 gevşeme; olmazsa açı += 2π/12 ile 12 aday dene.

`rotY`: kıyıya geniş yan (dışa bakan yelken). Teslim / dümen / aura yeni `shipPos`’u kullanır. Rehber ok hedefi yeni gemidir; `memory >= blindThreshold` ise ok zaten yok — kasıtlı.

Oyuncu spawn’ı yalnızca koşu başında eski kural (gemi yanı). Unutuş ışınlamaz.

### 3.8 Gün döngüsü

`dayTime` 0→`DAY.length` (420). `dayTime >= length` olunca `dayTime -= length` (şafak). `dusk` / `lost` / güneş-kaybı **yok**. Işık, gül uyarı (`warnRemaining` 90), gece paleti atmosfer. Gece: `dayTime`’ın son %20’si + ilk %10’u `MEM_NIGHT_MUL` uygular.

### 3.9 Güzellikler — dilim 1 (tam 3, hepsi isteğe bağlı)

Lotus kapısı **yok**. Höyük / taşlar çiçek kilitlemez (mevcut `PUZZLE` kapıları kapanır).

| ID | Ne | Etkileşim | Ödül |
|---|---|---|---|
| B1 | Tepe manzarası | `HILL_VIEW_HEIGHT`’e ilk çıkış | Beat M3. Hatıra yok (bakış yeter). |
| B2 | Rüzgâr höyüğü | Mevcut sıra, `cairnSolveOrder` | `KEEP_CAIRN` (küçük taş / idol), güverte. Bir kez. |
| B3 | Kadın (gezen ikramcı) | Aynı **İkram** fiili (§3.13) | 1 lotus + `KEEP_WREATH` + M4. Cinsel minigame yok, diyalog ağacı yok. Üç tayfadan **ayrı**. |

Stepping-stones dünyada kalabilir; `stonePickGateIndex` **devre dışı**. Mini oyun dilim 1’de yok (backlog).

Hatıra: `keepsakes` listesi, geminin yerel güvertesinde görünür mesh. Unutuş / teslim / unutuş oranına **dokunmaz**. HUD sayacı yok. Dümen için gerekmez.

Üç tayfa + kadın **gezer** ve aynı İkram fiilini paylaşır (§3.13). Kadın onlardan biri değildir.

### 3.10 HUD ve kontrol

`real`: unutuş barı yok. Çanta ve (varsa) muğlak teslim dili `scenario.md` §7. Kontroller değişmez (WASD, fare, E, Esc). Zıplama yok.

### 3.11 Challenge matrisi (boşluk yok)

Her satırın başarı / başarısızlık / softlock’u vardır. İsteğe bağlı satır atlanırsa ada kilitlenmez.

| Challenge | Oyuncu ne yapar | Başarı | Yerel başarısızlık | Softlock? |
|---|---|---|---|---|
| **Arama** | 5 rastgele bitkiyi 160 m adada gör | Olgunu kopar | Kaçırdı → solar, başka yerde tomurcuk | Yok; dünya hep 5 |
| **Solma** | `ripeTime` 26 s pencerede yetiş | Hasat | Pencere kaçar | Yok; yeni yerde bekle |
| **Çanta** | En fazla 4; 5. için ikinci yürüyüş | Teslim | Doluysa U5 | Yok |
| **Unutuş** | Deniz / gemi / sık teslim | Grace kesilir | Forget: çanta 0, ev kayar | Yok; floor + iframe |
| **Gemi kayması** | Yeni kıyıyı bul (ok, dalga, 12’li filo yerinde) | Teslim / dümen | Kör eşikte ok yok | Yok; kıyı her yerde iyileştirir |
| **Çıkış** | 5 teslim + dümen E | Kiklop açılır | 4 teslim dümen inert | Yok |
| **B1 manzara** | Tepeye çık | M3; pembe silüet okunur | Çıkmaz | İsteğe bağlı |
| **B2 höyük** | Rüzgâr sırası `[0,2,1]` | `KEEP_CAIRN` bir kez | Yanlış taş: adım sıfır | İsteğe bağlı; lotus kapısı yok |
| **B3 kadın** | E (İkram) | 1 lotus + çelenk + M4 | Geçer / çanta dolu | İsteğe bağlı |
| **İkram** | Gezen 3 tayfa veya kadın, E | +1 çanta, `memCost`, teslime sayılır | Reddet / U5 | **Yalnız ikramla çıkılmaz** (max 4 < 5) |

Ada-saati challenge **değildir**. Mini oyun dilim 1’de **yok**.

### 3.12 Güzellik yerleşimi (sabit, dilim 1)

Lotus rastgele; güzellikler **el konumu** — peyzaj okunur kalsın.

| ID | Konum [P] | Tetik | Sonrası |
|---|---|---|---|
| B1 | `LANDMARK.hill` (70, 60), 48 m | İlk kez oyuncu `y >= HILL_VIEW_HEIGHT` (22 — `tuning.md`) | Tekrar tetik yok. Hatıra yok. |
| B2 | Mevcut `hillPuzzle.ts` üç taş (`LAYOUT_SHIFT_Z` ile). Taşlar **taşınmaz.** | Mevcut `cairnSolveOrder`; `isOpen` lotus **açmaz** (`coveGatedRatio` / tepe kapısı `real`’de 0). Çözünce bir kez `KEEP_CAIRN` güverteye. | Yanlış sıra: adım 0. Çözülmüş E = `ignore`. |
| B3 | Ev `WOMAN_POS` = `(−18, −64)` (lagün batı). `OFFER_WANDER_R` içinde gezer. | İkram E, bir kez | Lotus + çelenk. Figür gezer durur. İkinci E: U6, ödül yok. Cinsel jest yok. |

Stepping-stones dekor; `stonePickGateIndex` yok sayılır.

**Görsel dilim 1 [P]:** kadın = Lotophagos ailesi (prosedürel), ayrı kumaş rengi (çelenk-hazır, tayfa tuniki değil). Hatıralar prosedürel mesh, kahraman gemi **lokal** güverte. Higgsfield beklemez.

### 3.13 İkram (gezen figür = kadın mekaniği)

Sahip (15 Ağu): adada **gezen** NPC’ler lotus verebilir; bu fiil **kadınla aynıdır.**

**Kim:** 3 Lotophagos + 1 kadın = 4 ikramcı. Sanrı figürleri **vermez** (`gdd-lotus-hallucination.md` durur).

**Gezinti [P]:** her figürün evi vardır (mevcut 3 `LOTOPHAGOS.spots` + `WOMAN_POS`). `OFFER_WANDER_R` = 22 m içinde yavaş yürür (`PLAYER.speed * 0.35`). Kara, `wadeFloor` üstü; kuzey sivri-kaya ve kahraman gemi aura’sına girmez. Oyuncuyu kovalamaz. Menzilde durur, eli uzar.

**Fiil (hepsi aynı):** `BEAUTY_RANGE` / `LOTOPHAGOS.range` + E, **figür başına bir kez.**

| | 3 tayfa | Kadın |
|---|---|---|
| Çanta | +`gift` olgun lotus | aynı |
| Unutuş | `memCost` | aynı |
| Teslim | sayaca girer | aynı |
| Beat | ilk kabul: M2 | M4 (M2’nin yerine, aynı anda değil) |
| Ek | — | `KEEP_WREATH` |
| Sonra | gezer, el inik | gezer; E = U6 |

**Ekonomi (`real`):** `gift = 1` (eski +2 değil). Max ikram 4. Hedef 5 → **yalnız ikramla ayrılınmaz**; en az bir tarla çiçeği gerekir. Tarla hâlâ tam 5; ikram tarladan düşmez (onlar “kalanların elindeki” çiçek **[O]**).

Çanta dolu: kabul yok, el uzanık kalır (U5). Kısmi yer: 1 alınır, figür harcanır, `memCost` tam. Uzaklaş = red, bedel yok, tekrar uzatır.

Unutuş olayı ikramı **iade etmez** (figür harcanmış kalır).

`test`: eski durağan + `gift: 2`.

### 3.14 Beşten sonra

`delivered` 5’te kilitlenir. Fazla hasat serbest (unutuş riski). Teslim: çanta boşalır, `MEM_PER_DELIVERED` işler, sayaç 5 kalır. Dümen 5’te açılır; otomatik ayrılış yok.

---

## 4. Formüller

Unutuş 0–1 (kod); tasarım metnindeki 0–100 = ×100.

**Kazanç (saniye, iframes kapalı, `real`):**

```
gain = islandGain
     + carried * perCarriedGain
     + (lagünde ise) lagoonGain
     + (gece ise) islandGain * (MEM_NIGHT_MUL - 1)
```

**Kayıp:** gemi aura `shipRecover`; deniz sığlığı `seaRecover`. Göl 0.

**Hasat:** `memory += pickSpike` (anlık).

**Forget tetik:**

```
if memory >= 1: grace -= dt   // loseHold saniye
if inSea or inShipAura: grace = loseHold
if grace <= 0: runForgetEvent()
```

**Örnek A.** `delivered = 2`, `carried = 2`, unutuş olayı → `delivered = 2`, `carried = 0`, gemi ≥40 m ötede, `memory = 0.40`, 2 s iframe, F1–F3.

**Örnek B.** `delivered = 4`, `carried = 1`, unutuş → 4/5 gemide, çanta boş, son çiçeği ve gemiyi yeniden ara.

**Örnek C.** Grace içinde denize gir → olay yok, unutuş düşer, gemi yerinde.

**Teslim turu:** kapasite 4, hedef 5 → en az iki gemi yürüyüşü (4+1 veya 3+2 …).

---

## 5. Kenar durumlar

| Durum | Sonuç |
|---|---|
| Unutuş geminin aura’sındayken | Olay yok (aura grace’i keser). |
| Hasat hold sırasında unutuş | Hold iptal, çiçek yerinde, sonra forget event (çanta zaten +0 veya önceki). |
| `carried = 0` iken unutuş | Çanta zaten boş; gemi yine kayar; teslim aynı. Unutmak hâlâ evi kaybettirir. |
| 5/5 teslim, dümen öncesi unutuş | `delivered` 5 kalır; gemi kayar; dümen **yeni** gemide. Ada kilidi açık kalır. |
| Son olgun solar, `delivered = 4` | Yeni yerde tomurcuk; bekle veya ara. Ada kilitlenmez. |
| Spawn 80+80 başarısız | Gevşek kara hücre; asla 4 bitki ile devam etme. |
| Gemi 80+12 başarısız | Son aday yine de kıyı bandına zorla (en yüksek `height` 0–2.5). |
| Gece + unutuş | Aynı olay; `MEM_NIGHT_MUL` iframe sonrası geçerlidir. |
| Çanta 4, 5. çiçek | Hasat yok, U5. |
| Teslim grace içinde | Aura açık → forget yok; teslim yasal. |
| Oyuncu suda unutuş | Aura yoksa olay olur; gemi kıyıya kayar; oyuncu suda kalır. |
| B2 / ikramcı evleri | Lotus höyük ve 4 ikram evinin `BEAUTY_RANGE`’ine giremez. Gezinti yolu serbest. |
| Ayrılış + hatıra | Hatıra güvertede görünür (W cinematic); hub’a taşınmaz. |
| Ayrılış + üç tayfa | Gemidedirler; nasıl bindikleri **gösterilmez** (`scenario.md` §5.1). |
| Abandon hub | Kiklop kilitli kalır. |
| İkram E (`real`) | +1 lotus (yer varsa), `memCost`; kadınsa +çelenk + M4. |
| Dört ikram da alındı | `delivered` en fazla +4; 5. tarladan. |
| Unutuş ikramdan sonra | Çanta 0; figür yeniden vermez. |
| İki ikramcı menzilde | En yakına E. |
| `delivered == 5` iken hasat | Serbest; sayaç 5. |
| Yeni bitki oyuncunun üstünde | Hücre reddedilir (§3.3). |
| `test` profil | Bu GDD yok sayılır. |
| İki unutuş peş peşe | Iframe + floor 0.40 bunu keser; ikinci olay ancak yeniden 1.0+grace. |
| Rehber ok kör eşiğinde gemi kayması | Ok yok; kıyı + dalga. Kasıtlı. |

---

## 6. Bağımlılıklar

| Sistem | Sözleşme |
|---|---|
| `gdd-memory-system.md` | Oranlar ve eşikler durur. §3.1.9 kayıp finali **Lotus’ta** forget event ile değişir. Kiklop/Sirenler K27’yi tutar. |
| `gdd-lotus-collection.md` | Hasat/teslim/evre fiilleri durur. Sayı, küme, gün-kıskacı bu GDD. |
| `gdd-lotus-hallucination.md` | Değişmez. Sanrı **ikram etmez.** |
| `level-lotus-island.md` | 160 m peyzaj / tepe / koy / kuzey kaya durur. 28’li cep ve faz eşleşmesi düşer. |
| `scenario.md` | Metin kaynağı; 15 Ağu K35. |
| Hub / K30 | 5 teslim + dümen → Kiklop açılır. |
| `src/constants.ts` | §7 tablosu. `LOTUS.zones` `real`’de okunmaz. |
| `sailor.ts` / gemi | `setCarried(0)` olayda; gemi `root.position` runtime. |

**Supersede listesi (Lotus `real`):** pitch “güneş batmadan 12”; P3 “el yerleşimli çiçek”; `DAY` kaybı; 28 çiçek; sabit gemi; K27 Lotus kaybı.

---

## 7. Tuning

| Knob | Varsayılan | Aralık | Tür | Gerekçe |
|---|---|---|---|---|
| `LOTUS_TARGET` | 5 | 3–8 | gate | Koşu payı; sahip kilidi. |
| `LOTUS_TOTAL` | 5 | = target | gate | Arama = hedef. |
| `CARRY_CAPACITY` | 4 | 2–5 | curve | En az iki tur. |
| `LOTUS_MIN_SPACING` | 18 | 10–30 | feel | 160 m adada dağılma. |
| `STAGE_*` | mevcut 14/11/26/16 | tuning §3 | feel | Solma yerel gerilim. |
| `timeJitter` | **0** (`real`) | 0–0.45 | feel | Yer rastgele, süre okunur. |
| `MEM_FORGET_FLOOR` | 0.40 | 0.2–0.6 | curve | Anında ikinci unutuş yok. |
| `FORGET_IFRAMES` | 2.0 | 0.5–4 | feel | Gemi kaymasının okunması. |
| `loseHold` | 6 | 4–12 | gate | Mevcut grace. |
| `SHIP_RELOCATE_MIN_M` | 40 | 20–80 | feel | “Ev kaydı” okunur. |
| `SHIP_RELOCATE_PLAYER_MIN_M` | 25 | 15–50 | feel | Ayak altında doğmasın. |
| `MEM_NIGHT_MUL` | 1.25 | 1.0–1.6 | curve | Gece hafif pahalı, kayıp değil. |
| `BEAUTY_RANGE` | 3.2 | 2–5 | feel | Lotophagos menzili. |
| `DAY.length` | 420 | — | feel | Döngü; kayıp değil. |
| `HILL_VIEW_HEIGHT` | 22 | 12–28 | feel | B1; `tuning.md` manzara noktası. |
| `WOMAN_POS` | (−18, −64) | sabit | gate | B3; üç tayfadan ayrı. |
| `LOTOPHAGOS.gift` | **1** (`real`) / 2 (`test`) | 1–2 | gate | 4 ikramcı × 1 = 4 < 5. |
| `OFFER_WANDER_R` | 22 | 12–40 | feel | Ev etrafı gezinti. |
| `OFFER_WANDER_SPEED` | `PLAYER.speed * 0.35` | — | feel | Kovalamaz. |
| `goneTime` | **0** (`real`) | — | gate | Dünya hep 5. |
| Evre s | 14 / 11 / 26 / 16 | `LOTUS.*Time` | feel | Kod; `tuning.md` 45/25/30/20 `real`’de **yok**. |

Hepsi `constants.ts`. Sahnede sihirli sayı yok.

---

## 8. Kabul

**İşlev**

- [ ] `real` başında tam 5 bitki, küme yok, `zones` kullanılmıyor.
- [ ] Solan / koparılan bitki yeni geçerli hücrede doğuyor; dünya 5 kalıyor.
- [ ] 5 teslim + dümen → Kiklop açılıyor; 4 teslim dümen inert.
- [ ] Unutuş olayı: çanta 0, teslim aynı, oyuncu yerinde, gemi ≥40 m kıyı, memory 0.40, 2 s iframe, faz `play`.
- [ ] Grace’te deniz/gemi: olay yok.
- [ ] Gün 420 s sonra şafak; `dusk`/`gameover` güneşten gelmiyor.
- [ ] Filo güneyde sabit; kahraman gemi kayıyor.
- [ ] B2/B3 lotus kilitlemiyor; hatıra güvertede, sayaç yok.
- [ ] 3 tayfa + kadın gezer; E = +1 lotus (doluysa yok); kadın +çelenk; 4 ikram 5 etmez.
- [ ] Hasat/solma sonrası dünya bir an bile 4 değil.
- [ ] `test` eski sandbox.

**Deneyim (playtest)**

- [ ] Unutuş “öldüm” değil “evi kaybettim” okunuyor.
- [ ] Ada güzellikle tutuyor; 5’i bırakmadan sonraki ada kapalı.
- [ ] Çiçek ezberi yok; tepe/kıyı hâlâ yön veriyor.
- [ ] Kadın rahatsız edici veya diyalog ağacı gibi durmuyor.

---

## 9. Uygulama sırası (oturumlar)

1. `constants.ts`: target 5, count 5 `real`, jitter 0, yeni knob’lar.
2. `dusk` / güneş → `gameover` yolunu `real`’de kes; gün modulo.
3. `lotus.ts`: 5’li reddetmeli spawn; `zones` `real`’de kapalı.
4. Solma/hasat → relocate.
5. Forget event (memory floor, iframe, çanta).
6. Kahraman gemi runtime berth; filo sabit.
7. Dümen kilidi 5; hub Kiklop flag.
8. `PUZZLE` lotus kapılarını kapat; B2 hatıra.
9. İkram: `gift=1` `real`; 3+kadın gezer; aynı E; kadın +çelenk.
10. `scenario.md` HUD (A3, M2/M4, F1–F3, U3/U4).

Her madde tek oturumda oynanır bırakır.

---

## Kapanan boşluklar (eski §4 açıklar)

| Soru | [P] kilit |
|---|---|
| Gemi nereye? | Yalnız kıyı bandı. |
| Filo kayar mı? | Hayır. |
| Unutuşta tarla saçılır mı? | Hayır; yalnız solma/hasat. |
| Unutuş 1.0’da takılı kalır mı? | Floor 0.40 + iframe. |
| Batıştan sonra? | Gece → şafak, kayıp yok. |
| İlk güzellik adedi? | 3 (B1–B3). Mini oyun backlog. |
| Kadın nerede? | Ev `(−18, −64)`, gezer, çelenk + 1 lotus. |
| İkram lotus? | `real` `gift=1`; 3 gezen + kadın; max 4 < 5. |
| 5’ten sonra? | Sayaç kilit; dümen onay. |
| Üç adam nasıl gemide? | Gösterilmez; W1 ima. |
