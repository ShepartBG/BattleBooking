export function isUrlLocation(value?: string | null) {
  const text = String(value || "").trim().toLowerCase();
  return (
    text.startsWith("http://") ||
    text.startsWith("https://") ||
    text.includes("maps.app.goo.gl") ||
    text.includes("google.com/maps") ||
    text.includes("goo.gl/maps")
  );
}

export function normalizeLocationUrl(value: string) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("http://") || text.startsWith("https://")) return text;
  return `https://${text}`;
}

export function shortLocationLabel(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return "Локация";
  if (isUrlLocation(text)) return "Виж локация";
  return text;
}
