# yeni-oyun — Lotophagoi

**Lotophagoi / Lotus Adası** — Vite + TypeScript + Three.js (Odysseia IX).

```
npm install
npm run dev
```

http://localhost:5173/ · WASD yürü · fare kamera · **E** topla / teslim / ikram · **R** yeniden başlat (kazanınca / gün batınca)

## Telefon / canlı link

Repo **gizli (private)** olduğu için GitHub Pages ayarı çoğu hesapta görünmez veya çalışmaz.  
Telefondan oynamak için en kolay yol: **Netlify** (repo gizli kalabilir).

### Netlify — önerilen (telefondan 3 dk)

1. Telefonda tarayıcıda aç: **https://app.netlify.com/start**
2. **Sign up with GitHub** → GitHub ile giriş
3. **Import from Git** → **yeni-oyun** reposunu seç
4. Ayarlar otomatik gelir (`netlify.toml`):
   - Build: `npm run build`
   - Publish: `dist`
5. **Deploy** → bitince sana bir link verir, örn. `https://something-random.netlify.app`
6. Site settings → **Change site name** → `lotophagoi` gibi bir isim → **https://lotophagoi.netlify.app**

Bundan sonra `master`’a her push’ta oyun otomatik güncellenir.

### GitHub Pages — yalnızca repo public ise

Repo **public** yaparsan:

1. **https://github.com/dorukhandori/yeni-oyun**
2. Üstte **Settings** (dişli) — mobilde bazen **⋯** menüsünde
3. Sol menü **Code and automation** → **Pages**
4. **Source:** GitHub Actions → Save
5. **Actions** → Deploy GitHub Pages → Re-run

Adres: **https://dorukhandori.github.io/yeni-oyun/**

### Evde hızlı test

Bilgisayarda `npm run dev` → aynı Wi‑Fi’de telefondan `http://[bilgisayar-IP]:5173`

`variants/cave-farm/` ayrı Glowsprig prototipidir; ana oyun Lotophagoi.
