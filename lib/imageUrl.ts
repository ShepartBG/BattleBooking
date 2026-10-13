/**
 * Routes images through Next/Vercel image optimization (resize + WebP/AVIF +
 * CDN cache). Works for plain <img> tags and CSS backgrounds alike.
 *
 * Only sources allowed in next.config.ts `images` are rewritten (local files,
 * /api/field-media and Supabase public storage); anything else is returned
 * unchanged so a foreign URL never turns into a broken image.
 */

// Must match Next's default imageSizes + deviceSizes, otherwise /_next/image returns 400.
const ALLOWED_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host;
  } catch {
    return "";
  }
})();

function canOptimize(src: string) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:") || /\.svg(\?|$)/i.test(src)) return false;
  if (src.startsWith("/_next/image")) return false;
  if (src.startsWith("/")) return !src.startsWith("//");
  try {
    const url = new URL(src);
    return Boolean(SUPABASE_HOST) && url.host === SUPABASE_HOST && url.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

/** `width` is the largest CSS width the image is shown at; retina is accounted for here. */
export function optimizedImage(src: string | null | undefined, width: number, quality = 75): string {
  const value = String(src || "").trim();
  if (!canOptimize(value)) return value;
  // Small images (logos) are doubled for retina; large photos only get a modest bump.
  const target = Math.ceil(width <= 400 ? width * 2 : width * 1.25);
  const w = ALLOWED_WIDTHS.find((allowed) => allowed >= target) ?? ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
  return `/_next/image?url=${encodeURIComponent(value)}&w=${w}&q=${quality}`;
}
