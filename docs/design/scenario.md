# Senaryo — Lotus Adası

> **Durum:** K35 ile uygulama-hazır (15 Ağu 2026). Eski “güneş batmadan 12” taslağı düştü.
> **Tarih:** 2026-08-15 (K35) · önceki taslak 2026-08-14
> **Kanon:** Homeros, *Odysseia* IX.82–104 · *İlyada* II (Gemiler Kataloğu)
> **Oynanış otoritesi:** `gdd-lotus-island-run.md` — bu dosya yalnızca ağız ve beat. Çelişkide GDD kazanır.
> **İsim:** oyuncu **Doryseus** **[O]**. §1 kanon özeti “Odysseus” der **[H]**. Tayfa: **unutulmuş tayfa**.

**Etiketler:** **[H]** Homeros · **[O]** oyun icadı.

---

## 1. Kanon özeti — ne gerçekten yazıyor

**[H] *Odysseia*, Kitap IX, 82–104.** Troya dönüşü, Malea, dokuz gün sürükleniş, onuncu gün Lotus Yiyenler. Odysseus üç adam gönderir. Lotophagoi zarar vermez: **lotus ikram ederler.** Tadan nostos’u yitirir, kalmak ister. Odysseus onları ağlarken gemilere sürükler, kürek sıralarının altına bağlar — **tatmadan.**

Savaş yok. Canavar yok. Tek tehdit hatırlamayı bırakmaktır.

**[H] İlyada.** On iki gemi, Gemiler Kataloğu. Koşunun toplamı on ikidir. **Bu durak beşidir** — gerisi Kiklop ve Sirenler’de (`tuning.md` §3.0, sahip 15 Ağu).

### Oyun için icat **[O]**

| İcat | Neden |
|---|---|
| Yenmemiş çiçek, ambarda tuzlu suda, hatırlatır. | Toplamak ilaçtır, ödül değil. |
| Koku yemeden de işler. | Arama fiili risktir. |
| Deniz tuzu açar; iç göl yalan söyler. | Kıyı çapa, göl tuzak. |
| On iki gemi kıyıda durur; **kahraman gemi** unutuşta kıyı değiştirir. | Filo sabit: “hangi tekne benimdi?” |
| Doryseus yalnız kıyıda. | Yanında biri yolu hatırlatırdı. |
| Ada **beş** çiçekle yetinir; yerleri rastgele, solunca başka yerde açılır. | Keşif; ezber yok. |
| Unutuş öldürmez: çanta boşalır, ev kayar, ambardakiler kalır. | Nostos kaybı = yol kaybı, ölüm değil. |
| Kadın — adanın “kal” teklifi; gezer, elinde lotus. | Homeros tuzak: güzellik + ikram. Üç tayfadan ayrı. |
| Gezen üç + kadın aynı eli uzatır (1 lotus). | İkram tarlayı delmez; dördü birden 5 etmez. |
| Ayrılışta üçü gemidedir; biniş gösterilmez. | W1 Homeros; ima kilitli kalır. |

---

## 2. Öncül

Dokuz gün rüzgâr. Onuncu sabah kum.

On iki gemi güney kıyıya oturmuş. Doryseus üç adamını içeriye gönderdi; üçü dönmedi. Üçü adada **gezer**, gülümseyerek, avuçlarında çiçek. Düşman değiller. Gitmek istemiyorlar. Bir kadın da gezer — o da uzatır. Kim olduğu söylenmez.

Koku yemeden işler. Kürek boş. Doryseus bir an kendi gemisini şaşırır.

Yenmemiş çiçek hatırlatır. **Bu kıyıda beş yeter** — uyanacak kadar. Gerisi sonraki denizlerin işi. Güneş batar; batış bir ültimatom değildir. Ada güzel kaldıkça gün döner.

---

## 3. Açılış (ilk ~12 saniye)

Kamera pruvadan kuma. Oyuncu sığ suda — iyileşme bandı; bunu bilmez.

Üç satır, art arda, ~3 s, fade. Ses yok.

> Dokuz gün rüzgâr. Onuncu sabah kum.

> Üç adam gönderdim. Üçü de burada. Üçü de gülümsüyor.

> Yenmemiş çiçek hatırlatır. Bu kıyıda beş yeter.

Yazı silinir. Kontrol oyuncuda. Zorunlu metin yok. İkinci koşudan açılış atlanır (Esc / tık) **[P]**.

---

## 4. Beat’ler

Durum tetikli. Her satır altta 4 s, oynanış kesilmez.

### M1 — Kum
**Tetik:** ilk hasat.
> Ağzıma götürmedim. Yine de dilimde bir tat var.

### M2 — İkram
**Tetik:** ilk Lotophagos menzili (üç sessiz tayfadan biri).
> Adım söylemiyor. Sadece uzatıyor. Elini indirmiyor.

### M3 — Tepe (B1)
**Tetik:** ilk `HILL_VIEW_HEIGHT`. (Eski “son 90 s / güneş sayıyor” düştü.)
> On iki direk. Beşi uyanırsa kalkarız.

### M4 — Kadın (B3)
**Tetik:** ilk kez kadına E.
> Kal demiyor. Kalmamı bekliyor.

### F1–F3 — Unutuş (kayıp final değil)
**Tetik:** forget event (`gdd-lotus-island-run.md` §3.5). Kontrol alınmaz, ekran bitmez, gemi o anda kayar.
> Denizin hangi yönde olduğunu bilmiyorum.
> Sorun değil.
> Buradan güzel görünüyor.

Aynı üç satır her unutuşta **bir kez daha** söylenebilir; üçüncüden sonra sus (spam yok) **[P]**.

---

## 5. Finaller

### 5.1 AYRILIŞ (tek ada sonu)

**Koşul:** `delivered >= 5`, kahraman gemide (hangi kıyıda olursa), dümen E.

Kamera kıça. Ada küçülür. Üç satır:

> Ağlayarak kürek çektiler. Bağladım onları sıraların altına.

> Ada arkamızda küçüldü.

> Kimse dönüp bakmadı. Bakmamak için.

Hub. Kiklop açık. Skor yok.

Üç gülümseyen (A2) bu anda **gemidedir**. Nasıl bindikleri oynanmaz, kesilmez, söylenmez — W1 o imadır. Kadın adada kalır.

**[H]** ilk satır Homeros.

### 5.2 UNUTULMA cinematic’i yok

Ada unutuşla **bitmez**. Eski kayıp finali F1–F3 altyazısına indi. Hub’a abandon anlatı değildir.

İki uç durur: **ayrıl** veya **kal (oyna)**. Kalmanın cezası evin kaymasıdır, siyah ekran değil.

---

## 6. Mekân ne söyler

- **Güney filo:** on iki gövde, sabit. Bazı kürekler kumda. Ambarlar — kahraman gemi hariç — dekor.
- **Kahraman gemi:** teslim, dümen, unutuşta başka kıyı. Filo yerinde kalır: “hangisi bendim?”
- **Sazlık / göl / tepe / kuzey kaya:** peyzaj. Çiçek burada kümelenmez; beş rastgele.
- **İç göl:** tatlı su, iyileştirmez.
- **Tepe:** bakış (B1). Bilgi, çiçek değil.
- **Höyük (B2):** isteğe bağlı taş; hatıra. Lotus kapısı değil.
- **Kadın (B3):** ev `(−18, −64)`, gezer. Aynı ikram eli + çelenk. Adlandırılmaz. Ayrılışta adada kalır.
- **Lotophagoi (üç):** gezer, aynı ikram. İma — kilit 14 Ağu, **açılmayacak**.

> ### 🔒 Lotophagoi kimliği
>
> **İma. Sonda da doğrulanmayacak.** Sahip 14 Ağu 2026. Kadın bu üçünün parçası değildir; o da adlandırılmaz.

---

## 7. Tüm oyun içi metinler

Anlatı bütçesi. Menü kromu (`docs/ux/ia.md`) sayılmaz. Satır ekleyen satır siler.

### Açılış
| # | Metin |
|---|---|
| A1 | Dokuz gün rüzgâr. Onuncu sabah kum. |
| A2 | Üç adam gönderdim. Üçü de burada. Üçü de gülümsüyor. |
| A3 | Yenmemiş çiçek hatırlatır. Bu kıyıda beş yeter. |

### Beat
| # | Tetik | Metin |
|---|---|---|
| M1 | İlk hasat | Ağzıma götürmedim. Yine de dilimde bir tat var. |
| M2 | İlk Lotophagos | Adım söylemiyor. Sadece uzatıyor. Elini indirmiyor. |
| M3 | İlk tepe | On iki direk. Beşi uyanırsa kalkarız. |
| M4 | Kadın, E | Kal demiyor. Kalmamı bekliyor. |
| F1 | Forget 1–3 | Denizin hangi yönde olduğunu bilmiyorum. |
| F2 | Forget 1–3 | Sorun değil. |
| F3 | Forget 1–3 | Buradan güzel görünüyor. |

### Ayrılış
| # | Metin |
|---|---|
| W1 | Ağlayarak kürek çektiler. Bağladım onları sıraların altına. |
| W2 | Ada arkamızda küçüldü. |
| W3 | Kimse dönüp bakmadı. Bakmamak için. |

### Arayüz
| # | Bağlam | Metin |
|---|---|---|
| U1 | Olgun çiçek | E — topla |
| U2 | Kahraman gemi | E — teslim et |
| U3 | İkram (tayfa veya kadın, el uzanık) | E — uzatılanı tut |
| U4 | Dümen (5/5) | E — ayrıl |
| U5 | Çanta dolu | Elin dolu |
| U6 | Höyük / kadın | E — bak |
| U7 | Hub abandon | Ada’ya dön (sonraki ada açılmaz) |

### Muğlak teslim (eşik 2, bar yok)
| `delivered` | Metin |
|---|---|
| 1–2 | birkaç |
| 3–4 | yarısından çok |
| 5 | yeter |

**Anlatı satırı:** A1–A3, M1–M4, F1–F3, W1–W3 = 16. UI ayrı.

---

## 8. Anlatı ↔ sistem

| Anlatı | Sistem |
|---|---|
| Beş yeter | `LOTUS_TARGET = 5`; hub kenar görev adı |
| Çiçek yerini şaşırır | rastgele spawn + solma relocate |
| Ev kayar | kahraman gemi berth |
| Ambardakiler kalır | `delivered` forget’te sabit |
| Elindeki gider | `carried = 0` |
| On iki direk | `FLEET` sabit güney |
| Güneş batar, öldürmez | gün modulo, kayıp yok |
| Kal teklifi | B3, hatıra, dümen açmaz |
| İkram, saldırmaz | Gezen 3 + kadın; +1 lotus; 4 < 5 |
| Deniz açar | `seaRecover` |
| Göl yalan | göl 0 |

Kanon dışı etiketsiz icat yok. Homeros’a “beş çiçek” veya “gemi kayması” **atfedilmez** — ikisi **[O]**.

---

## Kapanan kararlar

| Karar | Sonuç | Tarih |
|---|---|---|
| Lotophagoi kimliği | İma, kilitli | 14 Ağu 2026 |
| 12 ve güneş kaybı | Düştü; beş + unutuş setback | 15 Ağu 2026 |
| Unutulma cinematic | Forget altyazısı | 15 Ağu 2026 |
| Açılış atlama | 2. koşudan | 15 Ağu 2026 **[P]** |
| Üç adam / biniş | Gösterilmez; W1 | 15 Ağu 2026 **[P]** |
| İkram lotus | Gezen NPC + kadın, `gift=1`, max 4 | 15 Ağu 2026 |
