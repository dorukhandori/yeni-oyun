# Şablon — Social cutdown 9:16 (`media`) **[K]**

> **Sınıf:** `media` — makaledeki *"vertical cutdowns for socials"*.
> **Çıktı:** video 9:16, ~6–10 sn · **Hedef:** `art-source/media/`
> Ortak bloklar: `_anatomy.md`.

## Önce kes, sonra üret **[K]**

Makale toolkit'in *"cut a long trailer into shorts"* yapabildiğini söyler. **Varsayılan yol: ASSET-030 trailer'ını 9:16'ya kesmek.** Sıfırdan dikey üretim ancak kesim işe yaramazsa yapılır — yoksa aynı içeriği iki kez ödemiş olursun.

**[K]** Toolkit paylaşım öncesi *"score a hook"* da yapabiliyor — kesimden sonra hook skorlanır, en iyisi paylaşılır.

## Prompt (yalnız kesim yetmezse)

```text
Using Higgsfield, generate this as a video — 9:16 vertical, ~8 seconds, high quality. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).

Vertical third-person gameplay capture, over-the-shoulder camera close behind the player character, framed tall so the wide golden-hour sky above and the turquoise shallows below are both visible. Strongest visual hook in the first second.

Player character (fully original design, no resemblance to any existing game or film character): Odysseus — a lean weathered Bronze Age captain, a simple stylized figure with a small head and readable shoulder line, sun-worn off-white linen tunic with a faded ochre band, leather belt and sandals, short dark beard, a plain cloth satchel at his hip. No armour, no weapon.

Gameplay HUD (vertical-safe, kept away from the top and bottom edges): top-left a satchel icon with four slots, top-right a delivery tally, a slim sun-arc indicator, and a compass arrow toward the ship — the compass fades out as the shot goes on. No health bar, no minimap.

Setting: ankle-deep turquoise shallows with lotus blossoms on broad green lily pads, reed beds, golden sand, and the sun-bleached beached ship ahead.

Motion (8s): open on a lotus snapping fully open right in front of the camera, its white-and-pink petals flaring to the brightest, most saturated color in frame (the hook), then Odysseus wades toward the ship as a milk-white vignette creeps in and drains the color out of everything except the ship itself.
Camera stays close behind the shoulder, subtle micro-shake on steps.

Look: sun-drenched Aegean island at golden hour — turquoise shallows shading into lapis blue, white foam, golden sand, white-and-pink lotus that looks faintly lit from within, green lily pads, sun-bleached wood. COOL BLUE shadows (never black), turquoise bounce off the water, soft bloom, warm color grade, rising milk-white haze. Original characters and world only — no logos, no brand marks, no real game titles, no on-screen text beyond the game HUD.
```

## Kabul kriteri **[P]**

- [ ] İlk 1 saniyede hook var
- [ ] HUD dikey güvenli alanda — üst/alt kenara yapışmamış
- [ ] 9:16 kadrajda gökyüzü ve su birlikte okunuyor
- [ ] Pus yükselirken gemi okunur kalmış
- [ ] Trailer'dan kesilebilirdi ise **neden üretildiği** registry/csv notuna yazıldı
- [ ] Marka izi yok, HUD dışında yazı yok **[K]**
- [ ] `assets.csv` satırı yazıldı **[A]**
