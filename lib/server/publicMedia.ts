import { createHash } from "node:crypto";
import type { FieldSettings } from "@/lib/fieldConfig";

/**
 * Field logos/backgrounds saved from /admin/settings are stored as base64
 * data URLs. Embedding them in public JSON/HTML made pages several MB, so
 * public responses get a small, cacheable URL instead; /api/field-media serves
 * the bytes. The content hash in ?v= changes whenever the image changes.
 */

export type MediaSource = "r" | "f"; // r = field_requests row, f = fields row
export type MediaKind = "logo" | "background";

export function publicMediaUrl(value: string, source: MediaSource, id: string | null | undefined, kind: MediaKind) {
  if (!value || !value.startsWith("data:") || !id) return value;
  const version = createHash("sha1").update(value).digest("hex").slice(0, 12);
  return `/api/field-media/${source}/${encodeURIComponent(id)}/${kind}?v=${version}`;
}

export function withPublicMedia<T extends Pick<FieldSettings, "logoUrl" | "backgroundUrl">>(
  settings: T,
  source: MediaSource,
  id: string | null | undefined,
): T {
  return {
    ...settings,
    logoUrl: publicMediaUrl(settings.logoUrl, source, id, "logo"),
    backgroundUrl: publicMediaUrl(settings.backgroundUrl, source, id, "background"),
  };
}
