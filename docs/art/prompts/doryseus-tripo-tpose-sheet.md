# Doryseus — Tripo-ready T-pose turnaround (LOT-75)

> Anatomi: `_anatomy.md`. Palet: `art-bible.md` §2. Mesh: `pipeline.md` §5.1.
> Eski A-pose / 3/4 / çantalı still (ASSET-041..044, ASSET-081) **bu hatta gitmez.**
> Bu sayfa önce tasarımı kilitler. Sahip onayından sonra dört ayrı ortografik PNG kırpılır / yeniden üretilir ve Tripo `multiview-to-model` + Smart Mesh + auto-rig'e gider.

## Neden eski gövde değil

Kilitli textured mesh non-manifold (~12k kenar), Mixamo auto-rigger ve Bone Heat düşüyor, Tripo `rig`+`retarget` kalçayı patlatıyor. Videodaki çalışan hat: stüdyo T-pose, kollar gövdeden ayrı, basit topoloji, sonra *onların* auto-rig'i.

## Tasarım kilitleri (oyun + Tripo)

- Hâlâ **Doryseus**: Bronz Çağı kaptan, zırh/silah yok, keten tunic `#c8b49a`, soluk okr bant, sandalet, kısa sakal. Stylized, **NOT photoreal**.
- **T-pose**, A-pose değil: kollar yatay, avuçlar yere, bacaklar hafif açık, ayaklar düz.
- **Kollar gövdeden ayrı**: kısa kollu veya kolsuz tunic — kol-gövde birleşmesi yasak (eski fail).
- **Çanta / lotus yok** bu mesh kaynağında. Oyun zaten kalçada sprite taşıyor; çanta Tripo'da ele/kalçaya yapışıyor.
- Eller **eldiven/mızrak yumruk**: açık parmak yok.
- Düz stüdyo `#aea49a`, zemin/ufuk/yazı yok.

## Prompt — Gemini (16:9 turnaround sheet)

```text
Using Gemini, generate this as an image — 16:9 landscape, high quality, character design turnaround sheet for image-to-3D rigging. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal, NOT photographic).

Four orthographic full-body views of the SAME character in one frame, evenly spaced left to right on a perfectly flat even studio backdrop painted #aea49a warm beige: FRONT, RIGHT PROFILE, BACK, LEFT PROFILE. Identical proportions, identical costume, identical scale, identical T-pose in every view. Feet sit on an invisible ground line. No floor plane, no horizon, no second character, no labels, no arrows, no grid, no text, no watermark, no HUD.

T-pose (critical for auto-rig): standing straight, chin level, legs straight and slightly apart, feet flat and facing forward in the front view. Both arms held STRAIGHT OUT HORIZONTAL from the shoulders, parallel to the ground, elbows locked, palms facing DOWN, fingers closed into simple mitten-like fists. A clear empty gap of air between each upper arm and the torso — the arms must not touch the tunic. No A-pose, no bent elbows, no crossed legs.

Character (fully original design, no resemblance to any existing game or film character): Doryseus — a lean weathered Bronze Age Aegean sailor-captain, stylized-cartoon game hero, readable silhouette, slightly small head, clear shoulder line, sun-tanned skin, short dark hair, short dark beard, weathered forearms. Costume: a simple sleeveless sun-worn off-white linen tunic (#c8b49a) with a faded ochre band at the hem, a thin leather belt, leather sandals. No cloak, no satchel, no lotus, no jewellery, no armour, no weapon, no helmet, no cape. The tunic is a clean simple volume that does not fuse with the arms.

Look: stylized-cartoon game character, soft-shaded rounded forms, clean flat colors, cool blue shadows never black. Palette of off-white linen / faded ochre / leather brown / sun-tanned skin only. Original character only — no logos, no brand marks, no real game titles, no text.
```
