# Prompt anatomisi — ortak iskelet (Lotus Adası)

> **Tasarım otoritesi:** oynanış, karakter ve HUD konusunda `docs/design/` kazanır (`game-concept.md`, `gdd-lotus-collection.md`, `gdd-memory-system.md`, `tuning.md`). Görsel dil konusunda `docs/art/art-bible.md` kazanır. Çelişki görürsen üretme, sahip'e sor.

> Bu klasördeki her şablon bu iskeleti izler. İskelet **kaynak makaledeki çalışan prompt'tan** çıkarılmıştır:
> <https://x.com/zeuuss_01/article/2085112087605342552> — bölüm *"Higgsfield MCP in action - the real workflow"*.
> Higgsfield **video ve durağan görsel** üretir; 3D mesh üretmez (`docs/art/pipeline.md` §2).
> Palet ve ışık: `docs/art/art-bible.md` §2–§4.

## Kurallar

1. **Model adı sabitlenmez. [K]** *"the agent picks the right one per shot"* — prompt `Pick the best model for …` der. Makalede sayılan modeller: Sora 2, Veo 3.1, Kling 3.0, Seedance 2.0, GPT Image 2, Nano Banana Pro, Soul 2.0. **Gemini hattında** açılış `Using Gemini, generate…` der; API modeli `gemini-2.5-flash-image` veya `gemini-3-pro-image` (native image `generateContent`, `responseModalities: IMAGE`).
2. **Negatifler ayrı blok değil, cümle içindedir. [K]** `NOT photoreal`, `no logos`.
3. **IP satırı her prompt'un sonunda zorunlu. [K]** *Odysseia* kamu malı ama tasarım orijinal; mevcut hiçbir uyarlamaya atıf yok.
4. **Prompt gövdesi İngilizce**, dokümanların açıklaması Türkçe.
5. Çıktı `pipeline.md` §8 kabul kapısından geçer; **`public/assets/assets.csv` satırı yazılmadan hiçbir dosya kabul edilmez** (§7).

## Sekiz blok sırası [K]

| # | Blok | İçerik |
|---|---|---|
| 1 | Açılış direktifi | Higgsfield: `Using Higgsfield, generate this as a <video/image> — …` · Gemini: `Using Gemini, generate this as an image — <en-boy>, high quality.` + stil + `NOT photoreal` |
| 2 | Çekim / kamera | plan tipi, kamera konumu ve hareketi |
| 3 | Renk ve bakış | doygunluk, ışık renkleri, shading, bloom |
| 4 | Karakter | `(fully original design)` + figür tarifi |
| 5 | HUD | köşe köşe (yalnız gameplay çekimlerinde) |
| 6 | Setting | mekân envanteri |
| 7 | Motion / beat | zaman kodlu (`0–3s — …`) + sonda kamera davranışı (yalnız videoda) |
| 8 | Look + IP | estetik özeti + orijinallik güvencesi |

---

## Bu projenin sabit blokları

Aşağıdaki bloklar tüm şablonlarda **birebir** kullanılır. Değiştirmek isteyen önce `art-bible.md`'i değiştirir.

### STYLE (blok 1'in stil kısmı)

```text
Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D look — soft-shaded, rounded, colorful, NOT photoreal).
```

### CHARACTER (blok 4)

**Oyuncu Doryseus'tur** (orijinal tasarım — Homeros'un Odysseus'u değil, isim değişikliği sahip kararı 2026-08-14; `docs/design/game-concept.md` §4.3). Tayfa değil.

```text
Player character (fully original design, no resemblance to any existing game or film character): Doryseus — a lean weathered Bronze Age captain, a simple stylized figure with a small head and a readable shoulder line, sun-worn off-white linen tunic with a faded ochre band, a leather belt and sandals, short dark beard, a plain cloth satchel at his hip holding white-and-pink lotus blossoms. Calm, deliberate, unhurried movement — a man used to command.
```

### HUD (blok 5, yalnız gameplay çekimlerinde)

**Unutuşun göstergesi YOKTUR** — `docs/design/gdd-memory-system.md` §10: ölçek ekranın kendisidir (süt beyazı vinyet). HUD'a unutma barı koymak tasarımı çürütür.

```text
Detailed gameplay HUD (clean, cartoon-crisp, thin gold line-work on sun-bleached pale wood): top-left a small satchel icon with four slots showing how many lotus blossoms are carried, top-right a delivery tally counting toward twelve, a slim sun-arc indicator tracking the sun's descent, and a compass arrow pointing toward the ship. No health bar, no enemy markers, no minimap.
```

### SETTING (blok 6)

```text
Setting: the shore of the Lotus-Eaters' island at golden hour — ankle-deep turquoise shallows dotted with clusters of white-and-pink lotus blossoms on broad green lily pads, reed beds at the water's edge, a strip of golden sand, and a long sun-bleached wooden ship beached at the shoreline with its sail furled. Olive trees and dark cypresses behind, hazy blue-grey hills on the horizon.
```

### LOOK + IP (blok 8)

```text
Look: sun-drenched Aegean island at golden hour — turquoise shallows shading into lapis blue, white foam lines, golden sand, white-and-pink lotus blossoms that look faintly lit from within, broad green lily pads, sun-bleached wood, distant hazy blue-grey hills, olive and cypress silhouettes. High sky light plus a warm low sun, COOL BLUE shadows (never black), turquoise bounce light coming up off the water. Soft bloom, warm color grade, light blue-white haze in the distance, soft-shaded stylized surfaces with low surface noise. Original characters and world only — no logos, no brand marks, no real game titles, no on-screen text beyond the game HUD.
```

### FORGETTING (yalnız video ve anlatı çekimlerinde)

Oyunun kalbi bu etkidir (`art-bible.md` §4, `docs/design/gdd-memory-system.md` §9). Sıra önemli: **ışık azalmaz, bilgi azalır.**

```text
Forgetting effect: as the sequence progresses a soft MILK-WHITE vignette creeps in from the edges (never black, never darkening), color saturation drains away, and the distant haze crawls closer until the horizon and then the ship are swallowed. Only at the very end do edges go slightly soft. The scene becomes MORE beautiful and LESS readable at the same time — the island never looks frightening.
```

---

## Kaynaktaki örnek (referans, değiştirilmez)

Makalenin verdiği trailer prompt'unun açılışı — iskeletin kanıtı:

```text
Using Higgsfield, generate this as a video — 16:9, ~12 seconds, high quality. Pick the best model for stylized-cartoon next-gen game graphics (bright, glossy stylized 3D-platformer look — soft-shaded, rounded, colorful, NOT photoreal).

Third-person open-world platformer gameplay capture, over-the-shoulder camera trailing the player character. HYPER-VIVID saturated color […]
[karakter / HUD / setting / motion beat'leri]
Look: […] Original characters and world only — no logos, no brand marks, no real game titles, no on-screen text beyond the game HUD.
```

Bizim farkımız: makalenin örneği aydınlık orman platformeri, bizimki **Ege kıyısı, altın saat, lotus toplama + unutma**.
