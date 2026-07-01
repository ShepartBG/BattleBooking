export function isUrlLocation(value: string) {
  const nextValue = (value || "").trim();
  return /^https?:\/\//i.test(nextValue) || /^maps\.app\.goo\.gl\//i.test(nextValue) || /^goo\.gl\//i.test(nextValue);
}

export function normalizeLocationUrl(value: string) {
  const nextValue = (value || "").trim();
  if (!nextValue) return "";
  if (/^https?:\/\//i.test(nextValue)) return nextValue;
  return `https://${nextValue}`;
}

export function shortLocationLabel(value: string) {
  const nextValue = (value || "").trim();
  if (!nextValue) return "Локацията ще бъде добавена";
  return isUrlLocation(nextValue) ? "Виж локация" : nextValue;
}
