# HUD Design — Lotophagoi

> **Status:** In Design
> **Author:** sahip + ux-designer
> **Last Updated:** 2026-08-14
> **Template:** HUD Design (CCGS)
> **Otorite:** öğe listesi ve eşikler `gdd-memory-system.md` §10 · yerleşim `tuning.md` §8 · `HUD_FADE_TIME` = 1,5 s

---

## HUD Philosophy

HUD durum bildirir, tehdit bildirmez. Unutuşun barı yoktur — ölçek **ekranın kendisidir**. HUD'ın işi sırayla **kaybolmaktır**.

Bilgi alma sırası (GDD): konfor (ses) → navigasyon (pusula) → durum (HUD) → kontrol (yürüyüş sapması). Tersi yasak.

---

## Information Architecture

### Full Information Inventory

| Bilgi | Nerede | Neden HUD'da |
|---|---|---|
| Taşınan lotus / 4 | Çanta | kapasite kararı |
| Teslim / 12 | Teslim sayacı | hedef |
| Gün ilerleyişi | Güneş yayı + gökyüzündeki güneş | acele |
| Gemi yönü | Pusula | nostos |
| Unutuş miktarı | vinyet, doygunluk, sis — **HUD öğesi değil** | P2 |
| Etkileşim | alt orta prompt | fiil |
| Saat (rakam) | **yok** | güneş yeter |
| Mini harita | **yok** | |
| Can | **yok** | hasar yok |

### Categorization

- **Persistent (eşik 0–1):** çanta, teslim, güneş, pusula
- **Conditional:** prompt, beat satırı, toast (dolu / solmuş)
- **Removed by system:** pusula @50, tümü @75

---

## Layout Zones

16:9, kenar boşluğu 24 px. Safe zone: üst/alt 8%, yan 5%.

```
┌──────────────┬───────────┬──────────────┐
│ ÇANTA  0/4   │  GÜNEŞ    │  TESLİM 0/12 │  üst 64px
│              │   yayı    │              │
│              │           │              │
│              │  (dünya)  │              │
│              │           │              │
│              │  prompt   │              │  alt orta
│              │  PUSULA   │              │  alt 48px
└──────────────┴───────────┴──────────────┘
```

| Öğe | Zone | Davranış |
|---|---|---|
| Çanta | sol üst | `n/4`. Dolu kenar rengi `#f78fae`. Reddedilen toplamada titrer. |
| Güneş yayı | üst orta | yay, rakam yok. Gökyüzündeki güneş asıl saat. |
| Teslim | sağ üst | `n/12`. Eşik 2'de muğlak (`HUD_VAGUE_COUNTER` 🔬). |
| Pusula | alt orta | gemi yönü. Eşik 1: ±3° titrer. Eşik 2: kaybolur. |
| Prompt | alt orta, pusulanın 12 px üstü | tek satır, fiil önce |
| Unutuş | ekran çerçevesi vinyet | bar yok |

Eşik tablosu (`gdd-memory-system.md` §10):

| Eşik | Puan | HUD |
|---|---|---|
| Açık | 0–24 | hepsi |
| Sis | 25 | hepsi; pusula titrer |
| Kayış | 50 | pusula yok; teslim muğlak; çanta + güneş kalır |
| Unutuş | 75 | hiçbiri, prompt da yok |
| Kalış | 100 | yok |

Geçişler `HUD_FADE_TIME` (1,5 s) soluma. Ani kesme yok. Histerezis 3 puan.

Muğlak sayaç: `birkaç` / `yarısına yakın` / `neredeyse hepsi` / `hepsi`.

---

## Visual Design

- Tipografi: HUD rakamı tabular lining, tek ağırlık. Menü serif başlık, gövde sans — `design-lines.md`.
- Renk: serin sabah krom (gümüş-gri çizgi, ağarmış bez). **Olgun pembe `#f78fae` yalnızca çanta doluyken ve teslim vuruşunda.** Altın çerçeve, kalp, madalyon **yasak**.
- Unutuşta HUD solar (opaklık → 0), renk değiştirmez.
- Her öğe ayrı DOM düğümü — ayrı ayrı solabilmeli.

Mevcut `index.html` hâlâ unutuş **barı** çiziyor. Bu spec onu **kaldırır**. Uygulama bu dosyaya uyacak.

---

## Update Rules

| Sinyal | Kaynak | HUD |
|---|---|---|
| `carried`, `capacity` | lotus GDD | çanta |
| `delivered`, `target` | lotus GDD | teslim |
| `memory` eşiği | memory GDD | görünürlük bayrakları, vinyet (ekran) |
| `day01` | `DAY_LENGTH` | güneş yayı doluluk |
| `shipDir` | gemi konumu | pusula açısı |
| `promptId` | proximity | U1–U5 |

Güncelleme: her kare değil, değer değişince. Titrer/soluma CSS transition.

---

## States

- **Boot / menü:** HUD gizli
- **Açılış:** HUD gizli, üç satır
- **Play:** eşik tablosu
- **Pause:** HUD donuk görünür (eşik 3 değilse); pause listesi üstte
- **Final:** HUD gizli

---

## Accessibility

- Renk körlüğü: olgunluk silüet + doygunluk; unutuş renk kullanmaz (GDD).
- Fotosensitivite: geçiş ≥ 1,5 s, strobe yok.
- Eşik 3'te prompt yok — kasıtlı; dalga sesi yön verir (ses kodu gelince).
- Minimum tıklanır hedef menülerde 44 px; HUD tıklanmaz.

---

## Platform Notes

Klavye + fare birincil. HUD tıklanmaz. Kaba işaretçide (telefon) sanal çubuk + bakış alanı + Topla açık. Telefon tarayıcısında tam ekran `src/ui/fullscreen.ts`: Title **Oyna** jesti ve sağ-üst köşe düğmesi girer; aynı düğme (veya tarayıcı Esc) çıkar. iPhone Safari native Fullscreen API vermez — düğme yine görünür, aynı jest oyunu görünür alana sığdırır. Title/Hub sağ-üstte ayrıca sesi kapat ikonu (`src/ui/mute.ts`) — oynanışta gizlenir, mute durumu kalır. 16:9 referans; telefon landscape'te sahne `src/ui/scale.ts` ile contain edilir (HUD 1280×720 layout'u ekrana ölçeklenir, 3D canvas aynı dikdörtgeni doldurur). 16:10 masaüstünde üst/alt zone sıkışır, yan boşluk korunur. Safe-area inset (çentik) üst HUD ve köşe düğmesinde uygulanır; contain-fit açıkken sahne zaten inset olduğu için HUD inset'leri sıfırlanır.

---

## Acceptance Criteria

- [ ] Unutuş barı, sayısı, yüzdesi **yok**
- [ ] Dört öğe tam konumda
- [ ] Eşik 50'de yalnız pusula gider (1,5 s)
- [ ] Eşik 75'te HUD + prompt yok
- [ ] Eşik düşünce HUD geri gelir (1,5 s)
- [ ] Çanta 4/4'te E → titreme + "Elin dolu"
- [ ] Aynı anda tek prompt
- [ ] Kalp / minimap / altın madalyon yok
