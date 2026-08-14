# Bilgi mimarisi — Lotophagoi

> **Durum:** tasarlandı — sahip onayı bekleyen 3 nokta sonda
> **Tarih:** 2026-08-14
> **Karar:** önceki prototip menüsüzdü; sahip 14 Ağu 2026'da sade menü istedi. Ayarlar ormanı, kayıt yuvası, mağaza, keybind remap, dil seçici **yok**.

Oyun adı: **Lotophagoi**. Anlatı metinleri `docs/design/scenario.md` §7'de (24 satır). Menü kromu bu dosyada; anlatı bütçesine girmez.

---

## Ekran ağacı

```
Başlık (Title)
├── Oyna ──────────────────────────► Açılış (A1–A3) ──► Ada (HUD)
├── Nasıl oynanır ──► (Geri) ──► Başlık
└── Hakkında ──► (Geri) ──► Başlık

Ada
├── Esc ──► Pause
│            ├── Devam ──► Ada
│            ├── Ada'ya dön ──► Ada (baştan, açılış atlanır)
│            └── Ana menü ──► Başlık
├── 12/12 + dümen E ──► Ayrılış finali
└── Unutuş dolu / güneş battı ──► Unutulma finali

Finale (her iki)
├── Yeniden başla (U6) ──► Ada (baştan, açılış atlanır)
└── Ana menü ──► Başlık
```

Tek seviye. Alt menü yok.

---

## Ana menü öğeleri

| # | Etiket | Ne yapar |
|---|---|---|
| M1 | **Oyna** | Yeni oturum. Açılış üç satırı (A1–A3), sonra kontrol. |
| M2 | **Nasıl oynanır** | Tek sayfa, dört satır kontrol. Atlanabilir. |
| M3 | **Hakkında** | İki cümle Homeros notu. Lotophagoi'nin kimliği **söylenmez**. |

Varsayılan odak: **Oyna**.

---

## Pause öğeleri

| # | Etiket | Ne yapar |
|---|---|---|
| P1 | **Devam** | Esc ile aynı; dünyayı çözer. |
| P2 | **Ada'ya dön** | Oturumu sıfırlar, açılışı atlar, kıyıda başlar. |
| P3 | **Ana menü** | Başlığa döner. Kayıt yok — ilerleme gider. |

Pause'ta ses/fare ayarı **yok** (MVP). Gerekirse playtest sonrası tek satırlık ses kısma eklenir.

---

## Final öğeleri

| # | Etiket | Kaynak |
|---|---|---|
| U6 | **Yeniden başla** | `scenario.md` §7 |
| M4 | **Ana menü** | krom |

Skor, süre, yıldız **yok** (`game-concept.md` açık soru 3 — varsayılan: gösterme).

---

## Yasak ekranlar

Ayarlar derinliği · keybind · dil · save slot · harita · envanter ızgarası · kredi · mağaza · zorluk seçici.
