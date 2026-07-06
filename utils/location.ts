export function isUrlLocation(value?: string | null) {
  if (!value) return false;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed) || /maps\.app\.goo\.gl|google\.com\/maps/i.test(trimmed);
}

export function normalizeLocationUrl(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function shortLocationLabel(value?: string | null) {
  if (!value) return "Локация";
  const trimmed = value.trim();
  if (!isUrlLocation(trimmed)) return trimmed;
  try {
    const url = new URL(normalizeLocationUrl(trimmed));
    if (url.hostname.includes("maps.app.goo.gl")) return "Google Maps";
    if (url.hostname.includes("google")) return "Google Maps";
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Отвори локация";
  }
}
