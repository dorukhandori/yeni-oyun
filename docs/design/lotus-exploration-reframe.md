# Lotus Adası — keşif / süre-dışı yeniden çerçeve (K35)

> **Durum:** kilitler işlendi. **Otorite:** `gdd-lotus-island-run.md` + `scenario.md`. Bu dosya tarihçe.
> **Tarih:** 2026-08-15

## 1. Fikir (sahip, 15 Ağu 2026)

Lotus Adası herhangi bir **süre kısıtının dışında** olmalı. Amaç oyuncuyu güzellik ve keşif isteğiyle adada tutmak.

**Sahip döngüsü (kilit 6–7):** adada **5 lotus**, her spawn **rastgele**. Solan çiçek aynı yerde değil, **başka yerde** açılır. Unutuş → çanta 0, teslim sayacı aynı, durak devam; **gemi yeni bir kıyıya oturur**, ambarındaki lotus sayısı değişmez. Oyuncu unuttuğu yerde kalır — ev de kaymıştır. Güzellikler (kilit 3–4) arada bulunur.

Karakter yürüme spritesheet / Veo hattı bu işin parçası değil — backlog (`roadmap.md` §5).

## 2. Kilitlenenler

| # | Karar | Seçim |
|---|---|---|
| 1 | Gün batımı | Güneş **batsın**. `dusk` / süre-dolumu **kayıp değil**. Işık, renk, dalga — atmosfer. |
| 2 | Kalan gerilim | **Unutuş** (Homeros tuzak) + **çiçek solması** (yerel pencere). Ada-saati yok. |
| 3 | Gizlenmiş güzellikler | Tür karışımı: **mini oyun**, **mini bulmaca**, **figür (güzel bir kadın)**, **manzara**, benzeri. |
| 4 | Ayrı ödül | **Güverte hatırası** — gemide görünür, güç yok, ikinci hedef/sayaç yok. Envanter yasağı duruyor. |
| 5 | Ada çıkış kapısı | Sonraki ada ancak **5 lotus gemiye** bırakılınca. Hatıra / batış kilidi açmaz. |
| 6 | Arama döngüsü | **`LOTUS_TOTAL = 5`**, her doğuş rastgele (koşu başı + solunca). Solan **başka yerde** açılır. Unutuş → `carried = 0`, `delivered` kalır, durak devam. |
| 7 | Gemi kayması | Unutuş + çanta sıfırından **sonra** teslim gemisi **yeni kıyı konumuna** geçer. Ambardaki lotus sayısı **aynı**. Oyuncu yerinde kalır. Hatıralar güvertedeyse gemiyle gider. |

Bu, keşif özgürlüğünün bedelidir: dolaşmak serbest, **ilerlemek** teslime bağlı. Unutmak seni hub’a atmaz; çantayı boşaltır. Kiklop/Sirenler K27’yi kendi duraklarında tutabilir.

Solma, “şu çiçek beklemeyecek” dokusudur; adayı dolaşmayı cezalandıran bir gün kronometresi değildir.

### 3a. Güzellik türleri (kilit 3 — liste, henüz yerleşim değil)

Hepsi **keşif ödülü**. Dilim 1 yerleşimi kilitli: `gdd-lotus-island-run.md` §3.12 (B1 tepe, B2 mevcut höyük, B3 `(−18, −64)`). Mini oyun backlog.

| Tür | Ne | Ada içinde bugün |
|---|---|---|
| Manzara | Bakınca yeten durak — tepe weenie, koy, kuzey kayalık | Var; “çiçek değil, bakış” zaten `level-lotus-island.md` tepesi |
| Mini bulmaca | Kısa, tek fikir (rüzgâr höyüğü, nilüfer taşları gibi) | Kodda var ama **lotus kapısı**; K35’te kapı değil, güzellik olmalı |
| Mini oyun | 20–40 sn, tek fiil; ada turunu yemeyen | Yok — yeni, pahalı; dilim başına en fazla bir |
| Figür | Güzel bir kadın — kalma sebebi, ikram/konuşma değil mutlaka | Lotophagoi sessiz; bu ayrı bir karşılaşma olabilir |
| (açık) | Sahip “vs” dedi — aynı aileden başka duraklar eklenebilir | — |

**Figür notu:** Homeros’ta tuzak savaş değil, *kalmak istemektir*. Kadın bir ganimet veya diyalog ağacı değil; adanın “kal” teklifi. Cinsel minigame yok. Sessiz duruş / kısa bakış / bir cümle yeter.

**Ödül (kilit 4):** her güzellik bir **hatıra** bırakabilir (kabuk, çakıl, çelenk, küçük idol — “elmas” görsel olabilir). Gemi güvertesinde durur. Kazanma koşuluna, unutuşa, hıza **dokunmaz**. HUD’da ikinci bar yok.

## 3. Eski metinle çelişki (GDD’de kapatıldı — 15 Ağu)

| Eski kural | Kaynak | Yeni fikir |
|---|---|---|
| “Güneş batmadan 12 lotus” | `game-concept.md` §1 pitch | Batış kayıp değil; teslim süre baskısız |
| Tekrar oynanış = rota, **keşif değil** | `game-concept.md` §2 | Bu durak **keşif** ister |
| “Hedeflenen duygu keşif değil, ustalık” | `gdd-lotus-collection.md` §2 | Keşif birincil; ustalık tekrar oynanışta kalabilir |
| `DAY_LENGTH` dolunca `dusk` → kayıp | `tuning.md` §2, kod `phase` | Batış atmosfer; `MEM_GRACE` hâlâ durak kaybı olabilir |
| `STAGE_RIPE` ≈ ada geçişi (tek zor karar) | `tuning.md` §3.1 | Solma kalır ama “yetiş / yetişme” ada-saatine kilitli değil |
| Sazlık 12'li küme, 28 çiçek, üç cep | `level-lotus-island.md`, `LOTUS.zones` | **5** rastgele spawn |
| Deterministik tohum, sabit çiçek yerleri (P3) | `game-concept.md` §2, `LOTUS_PHASE_SEED` | Çiçek **hep rastgele**; solunca yer değişir |
| Sabit gemi `(0, −140)` | `tuning.md` §2, `SHIP` | Unutuşta gemi kıyı değiştirir; `delivered` taşınır |
| `MEM_GRACE` → durak kaybı, hub | `gdd-memory-system.md` §3.1.9, K27 | Lotus’ta **yerine:** çanta sıfır, teslimler kalır, gemi kayar |
| K34: çekirdek küme mesafeleri sabit, `DAY_LENGTH` değişmez | `tuning.md` §2.1 | Küme varsayımı düşer; gün kaybı düşer |

Homeros + art bible ile **daha uyumlu**: tuzak savaş/kronometre değil, kalmak istemektir. Unutuş o kalışın bedeli.

## 4. Açıklar kapandı

Hepsi `gdd-lotus-island-run.md` [P]: kıyı berth; filo sabit; tarla unutuşta saçılmaz; 3 güzellik; gün döner; ikram = gezen 3 + kadın, `gift=1`, max 4 < 5.

## 5. Teslim

Uygulama sırası: `gdd-lotus-island-run.md` §9. Kod sahip “geliştir” deyince.
