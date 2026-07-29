import { DEFAULT_FIELD_SETTINGS, FieldSettings } from "@/lib/fieldConfig";

export type FieldSettingsRow = {
  field_name?: string | null;
  city?: string | null;
  phone?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  message?: string | null;
  public_slug?: string | null;
  public_region?: string | null;
  public_settlement?: string | null;
  public_location?: string | null;
  public_description?: string | null;
  logo_url?: string | null;
  logo_fit?: "contain" | "cover" | null;
  logo_scale?: number | null;
  logo_x?: number | null;
  logo_y?: number | null;
  background_url?: string | null;
  own_price?: string | null;
  rental_price?: string | null;
  contact_phone?: string | null;
};

export function createFieldSlug(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "field"
  );
}

export function rowToFieldSettings(row?: FieldSettingsRow | null): FieldSettings {
  if (!row) return DEFAULT_FIELD_SETTINGS;

  const name = row.field_name?.trim() || DEFAULT_FIELD_SETTINGS.name;
  const settlement = row.public_settlement?.trim() || row.city?.trim() || DEFAULT_FIELD_SETTINGS.settlement;
  const location =
    row.public_location?.trim() ||
    row.city?.trim() ||
    DEFAULT_FIELD_SETTINGS.location;

  return {
    ...DEFAULT_FIELD_SETTINGS,
    name,
    slug: row.public_slug?.trim() || createFieldSlug(name),
    region: row.public_region?.trim() || DEFAULT_FIELD_SETTINGS.region,
    settlement,
    location,
    description:
      row.public_description?.trim() ||
      row.message?.trim() ||
      DEFAULT_FIELD_SETTINGS.description,
    logoUrl: row.logo_url || DEFAULT_FIELD_SETTINGS.logoUrl,
    logoFit: row.logo_fit === "cover" ? "cover" : "contain",
    logoScale: Number(row.logo_scale || DEFAULT_FIELD_SETTINGS.logoScale),
    logoX: Number(row.logo_x || DEFAULT_FIELD_SETTINGS.logoX),
    logoY: Number(row.logo_y || DEFAULT_FIELD_SETTINGS.logoY),
    backgroundUrl: row.background_url || DEFAULT_FIELD_SETTINGS.backgroundUrl,
    ownPrice: row.own_price || DEFAULT_FIELD_SETTINGS.ownPrice,
    rentalPrice: row.rental_price || DEFAULT_FIELD_SETTINGS.rentalPrice,
    phone: row.contact_phone || row.phone || DEFAULT_FIELD_SETTINGS.phone,
    facebook: row.facebook || DEFAULT_FIELD_SETTINGS.facebook,
    instagram: row.instagram || DEFAULT_FIELD_SETTINGS.instagram,
    tiktok: row.tiktok || DEFAULT_FIELD_SETTINGS.tiktok,
  };
}

export function settingsToUpdatePayload(settings: FieldSettings) {
  return {
    field_name: settings.name,
    public_slug: createFieldSlug(settings.slug || settings.name),
    public_region: settings.region,
    public_settlement: settings.settlement,
    public_location: settings.location,
    public_description: settings.description,
    logo_url: settings.logoUrl,
    logo_fit: settings.logoFit,
    logo_scale: settings.logoScale,
    logo_x: settings.logoX,
    logo_y: settings.logoY,
    background_url: settings.backgroundUrl,
    own_price: settings.ownPrice,
    rental_price: settings.rentalPrice,
    contact_phone: settings.phone,
    phone: settings.phone,
    facebook: settings.facebook,
    instagram: settings.instagram,
    tiktok: settings.tiktok,
  };
}
