# Ana tasarım hatları — Lotophagoi

> **Durum:** tasarlandı
> **Tarih:** 2026-08-14
> **Görsel niyet:** serin **sabah** Ege ışığı (sahip kararı, 14 Ağu 2026). `docs/art/art-bible.md` hâlâ altın saat yazıyor olabilir — **bu dosya ve sahip kararı kazanır** ta ki bible güncellenene kadar.
> **Olgun lotus:** `#f78fae` — adanın ve arayüzün **tek** sıcak, doygun vuruşu.

---

## 1. Tek cümle

Arayüz ağarmış bez ve serin sabah ışığıdır; tek pembe, koparılacak çiçektir. Tehdit karanlık değil, **fazla güzellik ve kaybolan bilgidir.**

---

## 2. Tipografi

| Rol | Aile | Kullanım |
|---|---|---|
| Başlık | **Cormorant Garamond** (serif, 600) | Lotophagoi, finaller |
| Gövde / menü | **Source Sans 3** (400/600) | Oyna, prompt, beat |
| HUD rakam | Source Sans 3 tabular lining | `0/4`, `0/12` |

Neden: serif mitolojik isim taşır, sans HUD'da titremez. Tek Google Fonts çifti, ikiden fazla aile yok.

Yasak: Inter / Roboto / "cinematic trailer" font yığını, tümü-caps paragraf, harf aralığı şovu.

---

## 3. Izgara ve HUD

- Referans 1920×1080, 24 px kenar, 8 px ritim.
- Üst şerit 64 px (çanta · güneş · teslim). Alt şerit 48 px (prompt · pusula).
- Menü öğeleri dikey, ortalı, 56 px aralıklı. Varsayılan odak dolgulu; diğerleri ghost.
- Overlay: `rgba(232, 236, 240, 0.12)` — süt, siyah dim değil. Final unutulma beyaza yükselir; ayrılış siyaha değil, gece denizine (çok koyu lacivert `#14507f`).

---

## 4. Renk (UI)

Serin sabah krom:

| Rol | Hex | Nerede |
|---|---|---|
| Gökyüzü soluk | `#d7e4ea` | menü zemin pusu |
| Camgöbeği | `#8ec9d4` | odak halkası, güneş yayı |
| Gümüş çizgi | `#9aa7b0` | HUD çerçeve |
| Bez / ahşap açık | `#e6e2d4` | panel |
| Metin | `#2c3338` | menü (dünya üstünde ise `#fbf7ef`) |
| **Olgun pembe** | `#f78fae` | yalnız çanta-dolu ve teslim vuruşu |
| Solmuş | `#8e6f4e` | reddedilen / solmuş flaş |

Altın çerçeve, kırmızı kalp, tweet klibindeki madalyon **yok**.

Unutuş: HUD rengi değişmez, **opaklığı** düşer. Dünya doygunluğu ve süt vinyet GDD'deki katmanlar.

---

## 5. Etkileşim dili

- Prompt: **fiil önce.** `E — topla` / `E — teslim et` / `E — al` / `E — ayrıl`. `scenario.md` U1–U4.
- Hover/odak: 2 px camgöbeği halka, 120 ms. Pulse yok.
- Onay: tek tık / Enter. Pause'tan ana menüde ikinci onay yok (kayıt yok).
- Hata: çanta dolu → titreme + `Elin dolu`. Sessiz başarısızlık yok.
- Cursor: menüde ok; oyunda gizli (kamera fareye bağlı). Pause'ta ok geri gelir.

---

## 6. Kamera / UI

- Oyun: 3D dünya, DOM HUD, tıklanmaz.
- Pause: zaman durur, fare serbest, menü tıklanır.
- Başlık: dünya dekoratif döner, input menüye gider.
- Unutuş HUD'u siler; menü (pause/final) **silinmez** — oyuncu her zaman çıkabilmeli.

---

## 7. Ses niyeti (UI)

Oyun sesi henüz **kodda yok**. Tasarım niyeti (`game-concept.md` §10):

1. Dalga = yön. Menüde de çok kısık kıyı.
2. Lir başlıkta bir kez, oyunda uzak.
3. Unutuşta boğuk uğultu; dalga muaf.
4. UI tıklaması: kuru, kısa, tahta — fanfar yok.

Otomatik çalan loop **yasak** ta ki sahip "sesi aç" deyene kadar. (Sahip arka plan sesi duydu; kaynak oyunda bulunamadı — bkz. teslim notu.)

---

## 8. Yasaklar

- Kalp barı, XP, craft ikonu, minimap
- Altın çerçeveli madalyon / tweet UI kopyası
- Unutuş yüzdesi, bar, sayı
- Tutorial popup yağmuru, parmak işareti
- Generic AI look: simetri, her yer parıltı, epic trailer kompozisyonu
- Fotogerçekçi UI cam / blur-over-blur
- "Press Start to Play" İngilizce kromu — menü Türkçe
- Lotophagoi'nin kimliğini yazıya dökmek
