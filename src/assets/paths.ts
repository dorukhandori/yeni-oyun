/**
 * Base-aware URL for anything shipped from `public/`.
 *
 * Deployment matters here: `vite.config.ts` sets `base` to `/yeni-oyun/` for
 * the GitHub Pages build (`npm run build:pages`) and `/` everywhere else, so a
 * hardcoded `/assets/...` string would 404 on Pages. Always route runtime
 * asset URLs through this.
 */
export function assetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL;
  const clean = relativePath.replace(/^\//, "");
  return `${base}${clean}`;
}
