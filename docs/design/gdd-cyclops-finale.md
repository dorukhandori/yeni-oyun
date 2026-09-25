# GDD — Kiklop Mağarası finali (Homeros finali)

> **Durum:** sahip onaylı yön (25 Eyl 2026), sayılar 🔬 (playtest'e kadar türetilmiş).
> **Karar kaydı:** AskUserQuestion, 25 Eyl 2026 — sahip "Kiklop Mağarası nasıl bitsin?" sorusunda **"Homeros finali"** seçeneğini seçti. Gerekçe: *gerekçe verilmedi.* Seçenek metni: "4 azıktan sonra: devi şarapla uyut → kazığı ocakta ısıt → gözünü oy → kör dev el yordamıyla arar, telgraflı vuruşlarından kaç → koyunların altına tutunup kapıdan çık." Reddedilenler: "Tam aRPG boss" ve "Final yok".
> Bu doküman 28 Ağu'daki "körleştirme = boss dövüşü" (ACTIVE_WORK, boss pivotu) yönünün somut hâlidir; `gdd-cyclops-blinding.md`'nin gizlenme çerçevesi **korunur** — finalin ilk yarısı yine gizlenme.
> Kaynak: Odysseia IX.345–470 (şarap, "Kimse", kazık, koyunların altında kaçış, kaya fırlatma).

---

## 1. Akış — yedi aşama

| # | Aşama | Oyuncunun işi | Biter |
|---|---|---|---|
| 1 | `gather` | Mevcut durak: 4 azığı gemiye taşı (değişmedi). | `delivered ≥ CYCLOPS_ITEM_TARGET` |
| 2 | `wine` | Gemide beliren **Maron'un şarap tulumunu** al, mağaraya götür, **uyanık** deve (`FINALE_WINE_OFFER_RADIUS` içinde) `E` ile sun. | Dev içer → sarhoş, yatağına yürüyüp **derin uykuya** düşer. Kapı kapalı kalır — artık içeride kilitlisin (Homeros: taş kapı). |
| 3 | `stake` | Ağıllardaki **zeytin kazığını** al. | Kazık elde |
| 4 | `harden` | Kazıkla ocağın başında `E`'yi **basılı tut** (`FINALE_HARDEN_SECONDS`). | Kazığın ucu kor gibi |
| 5 | `blind` | Kızgın kazığı **bayılmış** devin başına götür, `E` (sendeleyerek yatağına giden dev kör edilemez). Kazık `FINALE_STAKE_COOL_SECONDS` içinde soğur → ocağa dön. | Dev kör — kükreme, sarsıntı |
| 6 | `escape` | Kör dev mağara ağzına oturur, elleriyle yoklar. Koyun sürüsü dışarı akar. Bir koyunun yanında `E` → altına tutun; koyunla birlikte geç. Tutunmadan devin yakınına (`FINALE_GUARD_HEAR_RADIUS`) girersen dev sesi duyar, **telgraflı vuruş** (mevcut rage yuvarlağı) oraya iner. `E` tekrar → bırak. | Oyuncu kapıdan çıktı (`z < FINALE_ESCAPE_Z`) |
| 7 | `sail` | Kıyıya koş. Kör dev sese kaya fırlatır — patikada **telgraflı kaya yuvarlakları**. Gemide `E`. | Ayrılış kartı |

## 2. Kurallar

- **Ezilme sözleşmesi aynen geçerli** (`CYCLOPS_CRUSH_CAP = 3`, bitiş sözleşmesi `gdd-cyclops-blinding.md`). Finaldeki vuruşlar ve kayalar da `onCaught()`'a akar; 3. isabet denemeyi bitirir. Kalan hak yine sayıyla gösterilmez.
- **Sarhoş uyku (2–5) güvenli pencere:** dev bayılmışken algılanma ve ezilme **kapalı**. Gerilim buradan zamana kayar: kazık soğur.
- **`wine` aşamasında dev dışarıdaysa** (OUT) içeri dönmesini beklersin — döngü değişmedi.
- **Tutunma (6):** koyunun altındayken kendi hareketin yok, koyunun hızıyla (`FINALE_SHEEP_SPEED`) ilerlersin; algılanmazsın. Bu Homeros'taki tek "güvenli" geçiş.
- **Taşıma:** şarap/kazık azık taşıma kapasitesinden bağımsız, aynı anda en fazla biri.
- **Kaybın sonucu** değişmedi: deneme tamamen sıfırlanır (azık dahil), final de baştan.

## 3. Sayılar (🔬 türetilmiş)

| Sabit | Değer | Gerekçe |
|---|---|---|
| `FINALE_WINE_OFFER_RADIUS` | 4.0 m | `CYCLOPS_CRUSH_RADIUS` (2.0) dışında kalıp sunabilmek için 2 m pay |
| `FINALE_HARDEN_SECONDS` | 2.5 s | `HARVEST_HOLD` ailesinde, bilinçli ama kısa |
| `FINALE_STAKE_COOL_SECONDS` | 45 s | Ocak (x=-4, z=35) → yatak (0, 60) ~26 m ≈ 6,5 s yürüyüş; 45 s geri dönüşe bile yeter, yine de acele hissi |
| `FINALE_INTERACT_RADIUS` | 1.6 m | Azık alma (1.2) biraz genişletilmiş — kazık/koyun/ocak |
| `FINALE_BLIND_RADIUS` | 3.5 m | Yatan devin başına ulaşma |
| `FINALE_GUARD_HEAR_RADIUS` | 7.0 m | Mağara ağzı ~12 m geniş: kenardan geçmek yetmez, koyun şart |
| `FINALE_GUARD_ATTACK_INTERVAL` | 1.6 s | Rage'in 2.3 s'sinden sık — kör ama öfkeli |
| `FINALE_SHEEP_SPEED` | 1.6 m/s | Oyuncu yürüyüşünün (4.0) ~%40'ı — yavaş ve gergin |
| `FINALE_ESCAPE_Z` | -4 m | Kapı eşiği D=0'ın dışı |
| `FINALE_BOULDER_INTERVAL` / telgraf / yarıçap | 3.0 s / 1.4 s / 2.2 m | Koşarken kaçılabilir, dururken değil |

## 4. Kabul kriterleri

1. 4/4 teslimden önce şarap görünmez; sonra gemide belirir.
2. Şarap yalnız uyanık ve `FINALE_WINE_OFFER_RADIUS` içindeki deve verilebilir; uyuyan/dışarıdaki deve `E` hiçbir şey yapmaz.
3. Şarabı içen dev yatağına gider ve bir daha dolaşmaz; bu sürede algılanma artmaz, ezilme olmaz.
4. Kazık, ocakta `FINALE_HARDEN_SECONDS` basılı tutulmadan kör etmez; soğuyan kazık yeniden ısıtılabilir.
5. Kör etme devin konumunu mağara ağzına taşır (yürüyerek) ve sürüyü başlatır.
6. Koyuna tutunan oyuncu devin dibinden geçse bile vuruş hedefi olmaz; tutunmayan oyuncu `FINALE_GUARD_HEAR_RADIUS` içinde hedef olur.
7. Kapıdan çıkınca kayalar başlar; gemide `E` → Ayrılış kartı, `cyclopsCleared` kalıcı yazılır.
8. 3. isabet finalin hangi aşamasında olursa olsun kayıptır ve her şeyi sıfırlar.
