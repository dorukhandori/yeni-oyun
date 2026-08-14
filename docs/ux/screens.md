# Ekran envanteri — Lotophagoi

> **Durum:** tasarlandı
> **Tarih:** 2026-08-14
> **Metin kuralı:** anlatı satırları yalnızca `docs/design/scenario.md` §7. Menü kromu burada. Lotophagoi kimliği **ima** — hiçbir ekran söylemez (`scenario.md` §6 kilitli).

DOM overlay + 3D dünya. Menüler dünyanın üstünde; oyun HUD'u `docs/ux/hud.md`.

---

## 1. Başlık (Title)

**Amaç:** isim, tek eylem, atmosfer. Oynanış yok.

**Öğeler:**
- Hareketli kıyı (serin sabah, oynanmaz kamera)
- Başlık: **Lotophagoi**
- Alt satır (küçük): *Odysseia IX*
- **Oyna** (varsayılan)
- **Nasıl oynanır**
- **Hakkında**

**Giriş:** boot, pause→ana menü, final→ana menü.
**Çıkış:** Oyna → yükleme; Nasıl oynanır → how.
**Erişilebilirlik:** kontrast ≥ 4.5:1; odak halkası görünür; Enter = Oyna.

---

## 2. Nasıl oynanır

**Amaç:** dört satır, bir bakışta. Tutorial popup yağmuru yok.

**Öğeler (sırayla):**
- WASD — yürü
- Fare — bak
- E (basılı) — olgun lotus topla
- E (kısa) — gemiye bırak / dümenle ayrıl

Alt: **Geri**

Olgunluk ikonla anlatılmaz. Bir cümle yeter: *Sadece pembe ve açık olanı kopar.*

**Giriş/çıkış:** yalnızca başlıktan.

---

## 2b. Hakkında

**Amaç:** iki cümle, kapı gibi. Kimlik ima edilmez.

> Lotus Yiyenler'in ülkesi Homeros'un *Odysseia*'sında geçer — dokuzuncu kitap. *İlyada*'da değil.

> On iki gemi, on iki çiçek. Tatmadan kopar.

Alt: **Geri**

---

## 3. Açılış overlay

Dünya görünür, kontrol yok. Üç satır, fade, 3 sn:

> Dokuz gün rüzgâr. Onuncu sabah kum.
> Üç adam gönderdim. Üçü de burada. Üçü de gülümsüyor.
> Yenmemiş çiçek hatırlatır. On iki gemi, on iki çiçek. Güneş batana kadar.

Sonra silinir. `scenario.md` A1–A3.

---

## 4. Oyun HUD

Ayrı spec: `docs/ux/hud.md`. Özet: çanta sol üst, güneş üst orta, teslim sağ üst, pusula alt orta, prompt alt orta (pusulanın üstü). Unutuş barı **yok**.

---

## 5. Pause

**Amaç:** nefes. Dünya donuk, hafif süt pusu (unutuş efekti değil, UI freeze).

**Öğeler:** Devam · Ada'ya dön · Ana menü
**Giriş:** Esc. **Çıkış:** Devam veya Esc. Ana menü onay istemez (kayıt yok, kayıp küçük).
**Erişilebilirlik:** odak Devam'da.

---

## 6. Toplama istemi (world)

Olgun lotus `HARVEST_RANGE` içindeyken, çiçeğin üstünde veya alt orta:

`E — topla` (U1)

Çanta doluysa: `Elin dolu` (U5), çanta bir kez titrer. Eşik 3'te (75+) **hiçbir ipucu yok**.

Solmuşa bakınca istem **yok** — yanlış eylem sessizce cezalandırılmaz; dokununca kahverengi flaş + U yok, GDD'deki ses/flaş.

---

## 7. Teslim / ikram / dümen istemi

| Bağlam | Metin | Kaynak |
|---|---|---|
| Gemi `DELIVER_RANGE` | `E — teslim et` | U2 |
| Lotophagos | `E — al` | U3 |
| Dümen, 12/12 | `E — ayrıl` | U4 |

Hepsi alt orta. Aynı anda en fazla **bir** prompt. Öncelik: dümen > teslim > al > topla.

---

## 8. Ayrılış finali

Kamera kıç, ada uzaklaşır. Üç satır (W1–W3). Siyah. **Yeniden başla** (U6) · **Ana menü**. Skor/süre yok.

---

## 9. Unutulma finali

Ekran süt beyazına yükselir (kararmaz). Üç satır (L1–L3). Beyaz. Aynı iki düğme.

---

## Beat satırları (oyun kesilmez)

Alt orta, prompt'un üstünde, 4 sn, `scenario.md` B1–B3. Pause'ta gizlenir. Eşik 3'te beat **yazılmaz** (HUD yok kuralı) — tetik bekler, eşik düşünce gösterilir.

---

## Wireframe — başlık

```
┌─────────────────────────────────────────┐
│                                         │
│              LOTOPHAGOI                 │
│              odysseia ix                │
│                                         │
│              [ Oyna ]                   │
│           Nasıl oynanır                 │
│                                         │
└─────────────────────────────────────────┘
```

## Wireframe — pause

```
┌─────────────────────────────────────────┐
│           (donuk ada)                   │
│              Devam                      │
│           Ada'ya dön                    │
│            Ana menü                     │
└─────────────────────────────────────────┘
```
