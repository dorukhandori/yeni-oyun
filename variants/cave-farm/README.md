# Glowsprig — Kristal Mağara Çiftliği (Three.js 3D dilim)

Referans kare: karanlık mağara, tavandan sarkan emissive mor kristaller, karakterin
elinde turuncu fener, tahta iskele yolu, turkuaz su, sol üst 4 kalp + sağ üst altın madalyon.

Bu klasör kendi kendine yeten bir Vite girişidir (kök `src/` başka bir oyuna ayrıldığı için
buraya park edildi).

## Çalıştır

```bash
npm run dev
# sonra: http://localhost:5173/variants/cave-farm/index.html
```

Tip kontrolü (yalnızca bu dilim):

```bash
npx tsc --noEmit --strict --target ES2020 --module ESNext --moduleResolution bundler \
  --skipLibCheck variants/cave-farm/src/main.ts
```

## Kontroller

| Tuş | İş |
|---|---|
| `W A S D` | Kamera-relative hareket |
| Fare sürükle / tıkla (pointer lock) | Kamera döndür |
| `← →` / `↑ ↓` | Kamera yaw / pitch (klavye yedeği) |
| `1 2 3 4` | Çapa · Tohum · Su · Hasat |
| `Tab` / fare tekeri | Araç değiştir |
| `E` veya `Space` | Kullan (parsel) / tezgâhta sat |
| `B` | Tezgâhta tohum al (4 altın) |

## Döngü

Çapala → ek → sula → 3 büyüme aşaması (her aşama tekrar sulama ister) → parlayan
spirit-mote hasadı → tezgâhta sat → tohum al.

## Mimari

```
src/main.ts            bootstrap
src/game.ts            60 Hz sabit adım döngüsü, hareket, etkileşim
src/constants.ts       tüm tuning + palet
src/farm/world.ts      ASCII mağara haritası → hücre ızgarası
src/farm/crops.ts      büyüme + araç kuralları (saf mantık)
src/render/stage.ts    renderer, fog, ışıklar, EffectComposer + UnrealBloomPass
src/render/cameraRig.ts omuz-arkası takip kamerası (kaya içine girmez, shake)
src/world/cave.ts      kaya kabuğu, tavan, sarkıtlar, iskele, kristaller, tezgâh, motes
src/world/water.ts     animasyonlu jade su yüzeyi
src/world/creature.ts  low-poly peri + fener (flicker, kanat çırpma)
src/world/plots.ts     3D parsel + mahsul mesh'leri, hedef halkası
src/systems/input.ts   klavye + fare/pointer lock + dokunma
src/ui/hud.ts|css      DOM HUD (kalpler, madalyon, araç barı, prompt)
```
