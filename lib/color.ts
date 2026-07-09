/** Small hex-color helpers so each client's brand_color drives the
 * --industry CSS token set (amber for taxi, blue for city-bites, etc.)
 * without hardcoding a palette per client. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function industryVars(brandColor: string): React.CSSProperties {
  return {
    ["--industry" as string]: brandColor,
    ["--industry2" as string]: lighten(brandColor, 0.35),
    ["--industry-bg" as string]: rgba(brandColor, 0.08),
    ["--industry-border" as string]: rgba(brandColor, 0.2),
  };
}
