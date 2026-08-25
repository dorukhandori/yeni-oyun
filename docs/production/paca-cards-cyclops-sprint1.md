# Paca kartları — Kiklop Sprint 1 (yapıştırmaya hazır)

> Bu oturumda Paca'nın task araçları (`list_tasks`/`create_task`/`list_projects`) bağlı değildi — kartlar açılamadı. Aşağıdaki metinler `docs/production/implementation-spec-sprint1.md`'den birebir türetildi, `paca-task-format` kuralına uygun (`Ortam │ State │ Title`, başlık İngilizce, gövde Türkçe, `[@nick · Title]` imzalı). Proje: **Lotophagoi**, id `9e616e59-b637-4194-a68c-028dd3c0ece4`.
>
> Sıra önemli — K1→K13 zincirleme bağımlı (bkz. her kartın "Bağımlılık" satırı). L1/L2 ve ses bileti bağımsız, ayrı zamanlarda açılabilir.

---

## Epic

**Başlık:** `Kiklop │ Backlog │ Cave stop 2 — implementation sprint 1`

**Gövde:**
**[@nile · Producer]** Kiklop Mağarası'nın mekanik iskeletini (kapı döngüsü, saklaş/ezilme, Polyphemos placeholder) ve Lotus'un gerçek kalan iki boşluğunu kapatan sprint.
- Kaynak: `docs/production/implementation-spec-sprint1.md` — tasarım kararı almıyor, sadece dosya/fonksiyon seviyesinde iş kırıyor.
- Alt kartlar: K1-K13 (Kiklop, zincirleme bağımlı), L1-L2 (Lotus, bağımsız), 1 ses bileti (Cursor/@echo).
- Toplam tahmin: Kiklop iskeleti ~10,75 oturum, Lotus kalanı ~1 oturum.
- Kabul: K1-K13 bitince `?stop=cyclops` ile mekanik uçtan uca oynanabilir (Polyphemos placeholder mesh ile); L1-L2 bitince Lotus'un `gdd-lotus-collection.md` §8 + `gdd-memory-system.md` §8 kriterleri tam kapanır.

---

## K1

**Başlık:** `Kiklop │ Todo │ Read ?stop= query param, add ACTIVE_STOP constant`

**Gövde:**
**[@byte · Gameplay Programmer]** `?profile=test` deseninin birebir kopyası — modül yüklenirken bir kere okunan yeni bir sabit.
- Dosya: `src/constants.ts`, mevcut `resolveProfileFromUrl` fonksiyonunun yanına.
- `ACTIVE_STOP: "lotus" | "cyclops"`, varsayılan `"lotus"`.
- Bağımlılık: yok — sprint'in ilk işi.
- Tahmin: 0,5 oturum.

---

## K2

**Başlık:** `Kiklop │ Backlog │ Decide Phase union shape for the cave stop`

**Gövde:**
**[@axiom · Technical Director]** Küçük ama gerçek bir mimari karar — `Phase` union'a Kiklop'a özgü yeni fazlar mı eklenecek (`"cyclopsPlay"` vb.) yoksa mevcut fazlar (`"play"`/`"departing"` vb.) `ACTIVE_STOP` ile birlikte yeniden mi kullanılacak.
- Dosya: `src/types.ts:12` (`Phase` union, şu an 8 değer, "stop" kavramı yok).
- Karar verilince `@byte` uygular.
- Bağımlılık: K1.
- Tahmin: 0,25 oturum (karar) + implementasyon K3'e dahil.

---

## K3

**Başlık:** `Kiklop │ Backlog │ Add src/stops/ seam with a thin Lotus adapter`

**Gövde:**
**[@byte · Gameplay Programmer]** Lotus'un mevcut 11 world-builder çağrısını **silmeden**, ince bir arayüzle sarmalama.
- Yeni: `src/stops/lotusStop.ts` (mevcut builder çağrılarını saran ince adaptör), `src/stops/cyclopsStop.ts` (iskelet, boş).
- `Stop` arayüzü: `{ build(scene, ctx): StopHandle; teardown(): void }` gibi (kesin şekil K2'nin kararına göre).
- **Kritik kısıt:** Lotus dün canlıya girdi, bu adım onu riske atmamalı — `lotusStop.ts` davranış değiştirmez, sadece sarar.
- Bağımlılık: K1, K2.
- Tahmin: 1 oturum.

---

## K4

**Başlık:** `Kiklop │ Backlog │ Branch game.ts boot sequence on ACTIVE_STOP`

**Gövde:**
**[@byte · Gameplay Programmer]** `game.ts`'in boot bloğu artık `ACTIVE_STOP`'a göre dallanıyor.
- Dosya: `src/game.ts` (boot bloğu, `buildLotusField`/`buildSailor`/`buildSea`/`buildShip`/`buildHillPuzzle`/`buildSteppingStones`/`buildThallopes`/`buildLotophagoi`/`buildHallucinations`/`buildShoreMist`/`buildTerrain` çağrılarının olduğu yer).
- Lotus'un 11 builder çağrısı yalnız `ACTIVE_STOP==="lotus"` iken çalışmalı.
- Bağımlılık: K3.
- Tahmin: 1 oturum.

---

## K5

**Başlık:** `Kiklop │ Backlog │ New caveStage.ts — door-state ambient lighting`

**Gövde:**
**[@byte · Gameplay Programmer]** Mağara sahne ışığı, `src/render/stage.ts`'e **dokunmadan** ayrı modül.
- Yeni dosya: `src/render/caveStage.ts`.
- Kapsam: ambient/hemi ışık şiddeti, kapı açık/kapalı geçişi (ASSET-103, ≥1,5 sn geçiş, ekran hiç karartılmıyor — post-process değil, sahne ışığı).
- **Neden ayrı dosya:** Cursor/Grok'un 23 Ağu `stage.ts` dilimiyle çakışmasın diye (`cyclops-cave-production-plan.md`'de zaten kararlaştırıldı).
- Bağımlılık: K4.
- Tahmin: 1 oturum.

---

## K6

**Başlık:** `Kiklop │ Backlog │ Cave shell mesh + room/hide-spot data`

**Gövde:**
**[@iris · Game Art Director]** Mağara kabuğu (ASSET-090), `build_island_kit.py` deseninin Kiklop'a uyarlanmış hali.
- Yeni: `scripts/blender/build_cyclops_cave.py`, çıktı GLB.
- Oda/saklaş noktası verisi `level-cyclops-cave.md` §1.4 krokisinden birebir sayıya çevrilecek.
- Entegrasyon (`@byte`): yeni `src/world/cyclopsCave.ts`.
- Bağımlılık: K5.
- Tahmin: 1,5 oturum.

---

## K7

**Başlık:** `Kiklop │ Backlog │ Door-cycle state machine (OUT/RETURN/PRESENT)`

**Gövde:**
**[@byte · Gameplay Programmer]** `CYCLOPS_CYCLE`/`PHASE_OUT`/`PHASE_RETURN`/`PHASE_PRESENT` — sayılar `tuning.md` §12'de kilitli, burada sadece uygulanıyor.
- Devin gezinme dağılımı (sığ %15 / depo %20 / ocak %40 / iç nöy %25, tohumsuz rastgele — her PRESENT başında bağımsız çekiliş).
- Işık geçişi `caveStage.ts` (K5) üstünden.
- Dosya: `src/game.ts` ya da `src/stops/cyclopsStop.ts` (K2'nin kararına bağlı).
- Bağımlılık: K6.
- Tahmin: 1,5 oturum.

---

## K8

**Başlık:** `Kiklop │ Backlog │ Hiding spots + stillness rule`

**Gövde:**
**[@byte · Gameplay Programmer]** Her odada 1 saklaş noktası; saklaşta bile hareketsiz kalma kuralı.
- **Yeni sabit gerekmiyor** — `DETECT_RATE_SHADOW_STILL=0` zaten anlık/tam koruma sağlıyor (`@helix` doğruladı, `gdd-cyclops-blinding.md`).
- Bağımlılık: K7.
- Tahmin: 1 oturum.

---

## K9

**Başlık:** `Kiklop │ Backlog │ Crush event + CYCLOPS_CRUSH_CAP (experimental)`

**Gövde:**
**[@byte · Gameplay Programmer]** Ezilme = yakalanma olayı (D2/C2: azık düşer, kaybolmaz, mağara ağzına ışınlanma) + 3-hak sayacı.
- ⚠️ **`CYCLOPS_CRUSH_CAP=3` deneysel** (`tuning.md` — "kesin" değil, sahip kendi eleştirisiyle düşürdü). Kod içine gömme, tek satırda değiştirilebilir sabit olarak yaz.
- 3. ezilmede: `delivered→0`, azık yerleşimi başa, `DETECT`/`phaseT` sıfır, hub'a dönüş. 1./2. ezilmede yalnız D2/C2 işler.
- Ekranda gösterilmez (P2) — kalan hak, ağırlaşan korku efektiyle hissettirilir. 2. ezilmeden sonra beat satırı: *"İkinci kez. Bir daha kaldıramazsın."*
- Bağımlılık: K8.
- Tahmin: 1 oturum.

---

## K10

**Başlık:** `Kiklop │ Backlog │ Polyphemos placeholder (mechanics-first, no credits spent)`

**Gövde:**
**[@byte · Gameplay Programmer]** Basit kapsül/kutu mesh — gerçek Tripo mesh (P-C, ~80 kredi) mekanik doğrulanmadan üretilmiyor.
- Dosya: `src/world/cyclopsCave.ts`.
- Amaç: devin rotası/hız/collision davranışını geometri/animasyon olmadan test etmek.
- Playtest sonrası bu kart, gerçek P-C üretimiyle (ayrı bir kart, ASSET-108 konsept turu önce) değişecek.
- Bağımlılık: K7.
- Tahmin: 0,5 oturum.

---

## K11

**Başlık:** `Kiklop │ Backlog │ Food/wine-skin pickup (F3 narrative frame)`

**Gövde:**
**[@byte · Gameplay Programmer]** D1/F3 kararı: toplanabilir peynir/tulum propu, `lotus.ts`'in `Plant` API'sinin kopyası.
- Dosya: `src/world/cyclopsCave.ts`.
- Tayfa mesh **yok** — statik prop yeterli.
- Bağımlılık: K6.
- Tahmin: 1 oturum.

---

## K12

**Başlık:** `Kiklop │ Backlog │ HUD: target counter, hide-spot prompt, crush warning beat`

**Gövde:**
**[@glyph · UI Programmer]** Hedef sayacı, saklaş uyarı prompt'u, "ikinci kez" beat satırı.
- Dosya: `src/ui/hud.ts`.
- Bağımlılık: K9.
- Tahmin: 0,5 oturum.

---

## K13

**Başlık:** `Kiklop │ Backlog │ Real Hub card button (unlock/lock state)`

**Gövde:**
**[@glyph · UI Programmer]** `#cardCyclops` div → button, kilitliyken görsel "hayır" + gerekçe metni (*"Önce Lotus Adası'ndan kurtul"*) — bugün sessiz reddetme var.
- Dosya: `src/ui/menu.ts`, `index.html`.
- Bağımlılık: K1.
- Tahmin: 0,5 oturum.

---

## L1

**Başlık:** `Lotus │ Backlog │ Baseline threshold-3 walk drift (no hallucination needed)`

**Gövde:**
**[@byte · Gameplay Programmer]** Salt yüksek unutuşta (sanrı figürü teması olmadan) da yürüyüş sapması tetiklenmeli — şu an yalnız sanrı-temas sapması çalışıyor.
- Kanıt: `src/game.ts:926` yorum satırı, *"regardless of the (not yet implemented) eşik-3 baseline drift"* diyor.
- `MEMORY.driftMaxAngleDeg`/`driftPeriod` zaten var — mevcut sanrı-tetikli koddan **kopyalama, aynı fonksiyonu paylaştır**.
- Bağımsız, sprint'in başka kartlarına bağlı değil.
- Tahmin: 0,5 oturum.

---

## L2

**Başlık:** `Lotus │ Backlog │ Withered lotus penalty — decision needed first`

**Gövde:**
**[@helix · Game Designer]** Önce karar sorusu: solmuş çiçek cezası (`MEM_WITHERED_PENALTY`) bilerek mi atlandı (K35'in "doğal kayıp zaten cezadır" felsefesiyle tutarlı olarak) yoksa gerçek bir boşluk mu?
- Kanıt: `src/game.ts`'de `stage==="wilt"` durumuna bağlı hiçbir kod yok (grep temiz).
- Karar "gerçek boşluk" çıkarsa `@byte` uygular (dosya: `src/game.ts`/`src/world/lotus.ts`).
- Bağımsız, sprint'in başka kartlarına bağlı değil.
- Tahmin: 0,5 oturum (karar + varsa uygulama).

---

## Ses bileti

**Başlık:** `Audio │ Backlog │ Cyclops Cave blinding-mechanic sound layer`

**Gövde:**
**[@nile · Producer]** `@echo` Cursor-only, Claude Code'dan çağrılamıyor — bu kart sahip Cursor'ı açtığında `@echo`'ya sıfırdan bağlam kurmadan devredilebilsin diye tam kapsamla yazıldı.
- Kaynak: `docs/design/gdd-cyclops-blinding.md`, `docs/art/art-bible.md` D11 kutusu (ton).
- İhtiyaç 1: kapı açık/kapalı geçiş sesi (taş sürtünmesi, ~2 sn) — ekran hiç karartılmadığı için asıl "bir şey değişti" sinyali bu.
- İhtiyaç 2: devin PRESENT boyunca adım/nefes sesi, mesafeye göre şiddet — oyuncunun devin yerini kısmen sesle tahmin etmesi mekaniğin bir parçası.
- İhtiyaç 3: ezilme kükremesi (3 şok bileşeninden biri, diğer ikisi zaten kod tarafında kararlı).
- İhtiyaç 4: saklaş noktası hareketsizlik ihlali için ince bir gerilim sinyali (can barı/UI yok, tamamen sesle taşınmalı).
- Kısıt: Kenney CC0 paketleri zaten `src/systems/audio.ts`'te var, yeni lisans gerekmiyor.
- Kapsam dışı: müzik bestesi, yeni paket satın alma.
