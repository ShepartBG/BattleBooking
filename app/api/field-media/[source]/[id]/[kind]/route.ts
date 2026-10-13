import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Serves field logos/backgrounds that are stored as data URLs (see lib/server/publicMedia.ts).
// URLs carry a content hash (?v=), so responses are cached for a year at the CDN and browser.

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const TABLES = { r: "field_requests", f: "fields" } as const;
const COLUMNS = { logo: "logo_url", background: "background_url" } as const;

type Params = { source: string; id: string; kind: string };

export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { source, id, kind } = await params;
  const table = TABLES[source as keyof typeof TABLES];
  const column = COLUMNS[kind as keyof typeof COLUMNS];
  if (!table || !column || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  let query = getSupabaseAdmin().from(table).select(column).eq("id", id);
  if (table === "field_requests") query = query.eq("status", "active"); // only public profiles
  const { data, error } = await query.maybeSingle();
  const value = String((data as Record<string, unknown> | null)?.[column] || "");
  if (error || !value) return NextResponse.json({ ok: false }, { status: 404 });

  if (/^https?:\/\//i.test(value)) return NextResponse.redirect(value, 308);

  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match || !ALLOWED_MIME.has(match[1].toLowerCase())) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
