# GDD — Sirenler Geçidi (3. ve son durak)

> **Durum:** sahip onaylı yön (25 Eyl 2026), sayılar 🔬 türetilmiş.
> **Karar kaydı:** AskUserQuestion, 25 Eyl 2026 — "Sirenler Geçidi hangi oynanışla yapılsın?" sorusunda sahip **"Gemi geçişi"**ni seçti. Seçenek metni: "Gemiyi dar kayalık geçitten dümenle geçir; şarkıya yaklaştıkça dümen sapar. Tayfaya balmumu tıkaç dağıt, kendini direğe bağlat." Gerekçe: *gerekçe verilmedi.* Reddedilenler: "Yaya ada", "Kısa final sahnesi". Aynı turda: kredi = "Önce 0 kredi" (tüm görseller mevcut asset/prosedürel), multiplayer = "Ayrı yeni proje" (bu durak tek oyunculu).
> Kaynak: Odysseia XII.39–54 (Kirke'nin öğüdü), XII.165–200 (balmumu, direk, geçiş).
> Yapı: K40 — bağımsız durak; Kiklop bitince açılır. Hedef sayısı **3** (`multi-island-concept.md` M5: "Sirenler 3" korunuyor) = kulağı tıkanan kürekçi.

---

## 1. Akış

| # | Aşama | Oyuncu | Biter |
|---|---|---|---|
| 1 | `prep` — güverte | Gemi demirde. Güvertede yürü. Bal peteğinden **balmumunu al**, güneşte **yoğur** (`E` basılı, `SIRENS_KNEAD_SECONDS`). Yoğrulmuş mumla **3 kürekçinin** yanında `E` → kulakları tıkandı. | 3/3 tıkandı |
| 2 | `bind` | Direğin dibinde `E` → "Beni direğe bağlayın." Kamera geminin arkasına geçer. | bağlandın |
| 3 | `passage` | Gemi kendi ilerler (`SIRENS_SAIL_SPEED`). **A/D ile dümen**. Sirenlerin adasına yaklaştıkça şarkı dümeni adaya doğru çeker (`SIRENS_SONG_PULL × yakınlık`) — kulakları açık tek kişi sensin. Geçidin iki yanı kayalık; kayaya çarpmak gövde yarası. | Geçidin sonu (`SIRENS_STRAIT_LENGTH`) |
| 4 | `clear` | Şarkı söner, tayfa seni çözer. Ayrılış → **oyun sonu kartı** (Ithaka). | — |

## 2. Kurallar

- **Şarkı çekişi dümenden zayıf ama yakın:** en yakın noktada `SIRENS_SONG_PULL` (5.5 m/s) < `SIRENS_STEER_SPEED` (7.0 m/s) — direnmek mümkün, bırakmak ölümcül. Çekiş yakınlıkla doğrusal.
- **Gövde yarası tavanı:** `SIRENS_HULL_CAP = 3` — Kiklop'un `CYCLOPS_CRUSH_CAP`'inin aynısı: 3. çarpma batış = kayıp, deneme baştan (hazırlık dahil). Sayı gösterilmez; her çarpmada sarsıntı ve kırmızı kenar ağırlaşır (Kiklop `crushShock` yeniden kullanılır).
- **Çarpma sonrası:** gemi kayadan dışarı itilir, `SIRENS_HIT_GRACE` boyunca yeni yara yok.
- **Hazırlık kayıpsız:** prep/bind'da tehlike yok — acele ettirmeyen bir nefes.
- Esc duraklatma, `?to=hub` dönüşü, bitiş kartları Kiklop ile aynı dil.

## 3. Sayılar (🔬)

| Sabit | Değer | Gerekçe |
|---|---|---|
| `SIRENS_KNEAD_SECONDS` | 2.0 s | Kazığı kızdırmanın (2.5) biraz altı |
| `SIRENS_INTERACT_RADIUS` | 1.4 m | Güverte dar |
| `SIRENS_SAIL_SPEED` | 9 m/s | Geçit ~70 s |
| `SIRENS_STRAIT_LENGTH` | 620 m | |
| `SIRENS_STEER_SPEED` | 7.0 m/s | |
| `SIRENS_SONG_PULL` | 5.5 m/s | bkz. §2 |
| `SIRENS_SONG_RADIUS` | 190 m | Şarkı geçidin ortasında ~40 s duyulur |
| `SIRENS_HULL_RADIUS` | 3.2 m | Geminin yarı genişliği + pay |
| `SIRENS_HULL_CAP` | 3 | Kiklop ile aynı dil |
| `SIRENS_HIT_GRACE` | 1.5 s | |
| `SIRENS_CHANNEL_HALF_WIDTH` | 26 m | Geçit genişliği ~52 m, kayalar içine taşar |

## 4. Kabul kriterleri

1. Mum yoğrulmadan hiçbir kürekçi tıkanamaz; aynı kürekçi iki kez sayılmaz.
2. 3/3 olmadan direğe bağlanılamaz; bağlanınca geçiş başlar.
3. Dümen bırakılırsa şarkı alanında gemi adaya doğru kayar; sonuna kadar dümen tutulursa çekiş yenilir.
4. Kayaya çarpma bir yara; `SIRENS_HIT_GRACE` içinde ikinci yara yok; 3. yara kayıptır ve her şeyi sıfırlar.
5. Geçidin sonuna varınca `sirensCleared` kalıcı yazılır, oyun sonu kartı açılır, "Haritaya dön" hub'a götürür.
