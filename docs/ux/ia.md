# Bilgi mimarisi — Lotophagoi

> **🔴 K40 (24 Ağu 2026, sahip):** duraklar **bağımsız** — duraklar-üstü bir "koşu" yok, aralarında hiçbir durum taşınmıyor. Bu dosyada geçersiz olanlar: **"Koşu sonu" düğümü** ve ona bağlı **U6 (Yeniden başla)** / **M4 (Ana menü)** girişleri — her durak kendi Ayrılış'ıyla biter ve hub'a döner, duraklar-üstü bir kapanış ekranı **yok**. **"durak-bazlı mı koşu-bazlı mı" açık kararı da konusuz kaldı** (kayıp her zaman yalnız o durağı bitirir). **Hub kilit mekanizması kapandı:** `screens.md` §3.3'ün A/B/C sorusu yerine **kalıcı kilit** — Lotus bir kez bitince Kiklop kalıcı açılır (`localStorage`). Gerekçe: `docs/design/multi-island-concept.md` §10.
> **Durum:** tasarlandı — sahip onayı bekleyen 3 nokta sonda; ~~**Hub kilit mekanizması** (bkz. `ux/screens.md` §3.3, ayrı bir açık karar)~~ **→ K40 ile kapandı**
> **Tarih:** 2026-08-14 (ilk taslak) · güncelleme 2026-08-14 (Hub eklendi — sahip kararı, çoklu-ada seçimi artık gerçek bir ada-seçim ekranından geçiyor, bkz. `CLAUDE.md` ve `docs/design/multi-island-concept.md`)
> **Karar:** önceki prototip menüsüzdü; sahip 14 Ağu 2026'da sade menü istedi. Ayarlar ormanı, kayıt yuvası, mağaza, keybind remap, dil seçici **yok**. Hub eklendi ama "tek seviye" ilkesi büyük ölçüde korunuyor — Hub, alt menü değil, Başlık ile Ada arasına giren **tek yeni düğüm.**

Oyun adı: **Lotophagoi**. Anlatı metinleri `docs/design/scenario.md` §7'de (yalnızca Lotus Adası için yazılı — Kiklop/Sirenler'in kendi setleri `island-designer`'ın işi, henüz yok). Menü kromu bu dosyada; anlatı bütçesine girmez.

---

## Ekran ağacı

```
Başlık (Title)
├── Oyna ──────────────────────────► Hub (Ada seçimi)
├── Nasıl oynanır ──► (Geri) ──► Başlık
└── Hakkında ──► (Geri) ──► Başlık

Hub
├── durak seç (Lotus / Kiklop / Sirenler, kilit durumuna göre) ──► Açılış (o durağın A1–A3'ü) ──► Durak HUD
└── Ana menü ──► Başlık (koşu ilerlemesi sıfırlanır)

Durak HUD (Lotus Adası, Kiklop Mağarası, Sirenler Geçidi — aynı şablon, 3 kez örneklenir)
├── Esc ──► Pause
│            ├── Devam ──► Durak HUD
│            ├── Durağı yeniden başlat ──► Durak HUD (baştan, açılış atlanır, koşunun geri kalanı etkilenmez)
│            ├── Hub'a dön ──► Hub (durak yarım kalır, tekrar seçilebilir)
│            └── Ana menü ──► Başlık (tüm koşu sıfırlanır)
├── alt-hedef tamam + dümen E ──► Durak sonu: Ayrılış
│                                    ├── son durak değilse → Hub'a dön ──► Hub
│                                    └── son (3.) durak ise → Koşu sonu
└── Unutuş dolu / güneş battı ──► Durak sonu: Unutulma
                                     └── durak-bazlı mı koşu-bazlı mı: 🔲 açık, bkz. `ux/screens.md` §10

Koşu sonu (yalnızca 3. durak Ayrılış'la bittiğinde, veya §10'un koşu-bazlı-kayıp okuması geçerliyse kayıpta da)
├── Yeniden başla ──► Hub (baştan, tüm kilitler §3.3 kararına göre sıfırlanır)
└── Ana menü ──► Başlık
```

Hub dahil olmak üzere hâlâ **tek seviye** — Hub'ın kendi alt menüsü yok, sadece 3 durak kartı + Ana menü.

---

## Ana menü öğeleri

| # | Etiket | Ne yapar |
|---|---|---|
| M1 | **Oyna** | Hub'a (Ada seçimi) götürür — **yeni oturum**, koşu ilerlemesi baştan başlar. Doğrudan oyuna girmez; hangi durağın oynanacağı Hub'da seçilir. |
| M2 | **Nasıl oynanır** | Tek sayfa, dört satır kontrol. Atlanabilir. |
| M3 | **Hakkında** | İki-üç cümle Homeros notu. Lotophagoi'nin kimliği **söylenmez**. |

Varsayılan odak: **Oyna**.

---

## Hub öğeleri — **YENİ**

| # | Etiket | Ne yapar |
|---|---|---|
| H1–H3 | **Lotus Adası / Kiklop Mağarası / Sirenler Geçidi** (durak kartları) | Kilit durumuna göre (Kilitli/Hazır/Tamamlandı) seçilebilir; seçilirse o durağın Açılış'ına girilir. Kilit mekanizmasının kendisi (A/B/C) açık karar — bkz. `ux/screens.md` §3.3. |
| H4 | **Ana menü** | Başlığa döner, koşu ilerlemesi sıfırlanır (kayıt yok — mevcut kural). |

Varsayılan odak: ilk seçilebilir (`Kilitli` olmayan) durak kartı.

---

## Pause öğeleri

| # | Etiket | Ne yapar |
|---|---|---|
| P1 | **Devam** | Esc ile aynı; dünyayı çözer. |
| P2 | **Durağı yeniden başlat** *(eski adı "Ada'ya dön")* | Yalnızca **şu anki durağı** sıfırlar, açılışı atlar; koşunun geri kalan ilerlemesine (diğer durakların Hub'daki durumu) dokunmaz. |
| P3 | **Hub'a dön** *(yeni)* | Şu anki durağı yarım bırakır (Hub'da `Hazır` kalır, kaybedilmiş sayılmaz), Hub'a döner. |
| P4 | **Ana menü** | Başlığa döner. Kayıt yok — **tüm koşunun** ilerlemesi gider (P2/P3'ten farkı: artık tek durağı değil, Hub'daki tüm ilerlemeyi siliyor — bkz. `ux/screens.md` §6 açık soru S5, onay adımı gerekip gerekmediği sahip kararı). |

Pause'ta ses/fare ayarı **yok** (MVP). Gerekirse playtest sonrası tek satırlık ses kısma eklenir.

---

## Durak sonu / Koşu sonu öğeleri

| # | Etiket | Nerede | Ne yapar |
|---|---|---|---|
| — | **Hub'a dön** | Durak sonu — Ayrılış (son durak değilse); Durak sonu — Unutulma (eğer §10'un "durak-bazlı kayıp" okuması seçilirse) | Hub'a döner, o durak `Tamamlandı`/`Hazır` işaretlenir. |
| U6 | **Yeniden başla** | Koşu sonu (3. durak bitince); Durak sonu — Unutulma (eğer "koşu-bazlı kayıp" okuması seçilirse) | Kaynak: `scenario.md` §7 (Lotus'a özel; koşu-geneli kapanış metni henüz yok). Tüm koşuyu Hub'dan baştan başlatır. |
| M4 | **Ana menü** | Koşu sonu; Durak sonu — Unutulma (koşu-bazlı okuma) | krom, Başlığa döner |

Skor, süre, yıldız **yok** (`game-concept.md` açık soru 3 — varsayılan: gösterme). Durak sonu — Unutulma'nın hangi buton setini kullanacağı (`Hub'a dön` mü, `Yeniden başla`/`Ana menü` çifti mi) **açık karar** — bkz. `ux/screens.md` §10.

---

## Yasak ekranlar

Ayarlar derinliği · keybind · dil · save slot · **oyun-içi minimap** · envanter ızgarası · kredi · mağaza · zorluk seçici.

**Not:** Hub (Ada seçimi) bu listedeki "harita"nın kapsamına girmiyor — HUD'daki yasak olan şey oyun sırasında gösterilen bir *minimap*'tir (navigasyon yardımcısı, unutuş disiplinini bozar); Hub bir **menü ekranı** (oyun dışı, oynanış sırasında hiç görünmez), üç durağı seçmek için var, navigasyon aracı değil. İkisi karıştırılmamalı.
