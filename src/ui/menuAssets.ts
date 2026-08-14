/** Procedural SVG menu art — art-bible palette, no external assets yet. */

export const MENU_PALETTE = {
  sky: "#d7e4ea",
  skyDeep: "#8ec9d4",
  seaShallow: "#3fc8c0",
  seaDeep: "#1f6fa8",
  foam: "#fbf7ef",
  sand: "#e8c98a",
  parchment: "#e6e2d4",
  ink: "#2c3338",
  gold: "#c99a3c",
  lotusRipe: "#f78fae",
  lotusHeart: "#fff4e2",
  shipWood: "#c8b49a",
  shipSail: "#efe6d2",
  caveCrystal: "#b48cff",
  caveDark: "#2a1840",
} as const;

/** Title emblem — lotus over waves. */
export function lotusEmblemSvg(): string {
  const c = MENU_PALETTE;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
    <ellipse cx="60" cy="88" rx="42" ry="8" fill="${c.seaShallow}" opacity="0.35"/>
    <path d="M60 72c-18-8-28 2-28 14 0 8 12 12 28 12s28-4 28-12c0-12-10-22-28-14z" fill="${c.lotusRipe}" opacity="0.9"/>
    <path d="M60 58c-6 14-2 26 0 30 2-4 6-16 0-30z" fill="${c.lotusHeart}"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7]
      .map((i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = 60 + Math.cos(a) * 22;
        const y = 68 + Math.sin(a) * 14;
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="10" ry="16" fill="${c.lotusRipe}" opacity="0.85" transform="rotate(${(a * 180) / Math.PI} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
      })
      .join("")}
    <circle cx="60" cy="64" r="6" fill="${c.lotusHeart}"/>
  </svg>`;
}

/** Beached ship silhouette for title deco. */
export function shipSilhouetteSvg(): string {
  const c = MENU_PALETTE;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" fill="none">
    <path d="M20 58 L180 58 L165 48 L35 48 Z" fill="${c.shipWood}" opacity="0.85"/>
    <path d="M95 48 L95 18 L108 48 Z" fill="${c.shipSail}" opacity="0.9"/>
    <rect x="88" y="48" width="4" height="12" fill="${c.shipWood}"/>
    <path d="M0 62 Q100 54 200 62 L200 80 L0 80 Z" fill="${c.seaDeep}" opacity="0.5"/>
  </svg>`;
}

/** Island card thumbnail — lotus lagoon. */
export function islandLotusThumbSvg(): string {
  const c = MENU_PALETTE;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 120" fill="none">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c.sky}"/>
        <stop offset="55%" stop-color="${c.seaShallow}"/>
        <stop offset="100%" stop-color="${c.seaDeep}"/>
      </linearGradient>
    </defs>
    <rect width="280" height="120" fill="url(#lg)"/>
    <ellipse cx="140" cy="95" rx="120" ry="18" fill="${c.sand}" opacity="0.7"/>
    ${[
      [80, 78],
      [120, 72],
      [160, 76],
      [200, 70],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="8" fill="${c.lotusRipe}" opacity="0.9"/><circle cx="${x}" cy="${y}" r="3" fill="${c.lotusHeart}"/>`,
      )
      .join("")}
    <path d="M40 100 Q140 88 240 100" stroke="${c.foam}" stroke-width="2" opacity="0.6"/>
  </svg>`;
}

/** Island card — crystal cave (locked). */
export function islandCaveThumbSvg(): string {
  const c = MENU_PALETTE;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 120" fill="none">
    <rect width="280" height="120" fill="${c.caveDark}"/>
    <path d="M0 80 Q70 40 140 55 T280 75 L280 120 L0 120 Z" fill="#1a1028"/>
    ${[
      [60, 45],
      [100, 35],
      [140, 50],
      [180, 38],
      [220, 48],
    ]
      .map(
        ([x, y]) =>
          `<polygon points="${x},${y + 20} ${x - 8},${y + 32} ${x + 8},${y + 32}" fill="${c.caveCrystal}" opacity="0.75"/>`,
      )
      .join("")}
  </svg>`;
}

export function svgDataUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
