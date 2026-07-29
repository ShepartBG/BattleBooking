import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createFieldSlug, rowToFieldSettings } from "@/lib/fieldSettings";
import type { FieldSettingsRow } from "@/lib/fieldSettings";
import { resolveRealFieldId } from "@/lib/fieldIdentity";
import { getPublicGamesMinDate, isGameStillPublic } from "@/lib/gameVisibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicFieldRow = FieldSettingsRow & {
  id: string;
  field_id?: string | null;
  field_name?: string | null;
  city?: string | null;
  message?: string | null;
  status?: string | null;
  owner_email?: string | null;
  owner_user_id?: string | null;
  organizer_key?: string | null;
  email?: string | null;
};

type SupabaseLike = any;

function getPublicSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY липсва.");
  }

  try {
    return { client: getSupabaseAdmin(), canResolveFieldId: true };
  } catch {
    return {
      client: createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
      canResolveFieldId: false,
    };
  }
}

async function toPublicField(
  supabaseClient: SupabaseLike,
  row: PublicFieldRow,
  canResolveFieldId: boolean,
) {
  const settings = rowToFieldSettings(row);
  const realFieldId = canResolveFieldId ? await resolveRealFieldId(supabaseClient, row) : row.field_id || row.id;

  return {
    id: realFieldId || row.field_id || row.id,
    status: row.status || "active",
    name: settings.name,
    slug: settings.slug || createFieldSlug(settings.name),
    region: settings.region,
    settlement: settings.settlement,
    location: settings.location,
    description: settings.description,
    logoUrl: settings.logoUrl,
    logoFit: settings.logoFit,
    logoScale: settings.logoScale,
    logoX: settings.logoX,
    logoY: settings.logoY,
    backgroundUrl: settings.backgroundUrl,
    backgroundX: Number((row as any).background_x ?? 50),
    backgroundY: Number((row as any).background_y ?? 50),
    ownerEmail: String((row as any).owner_email || (row as any).email || ""),
    ownerUserId: String((row as any).owner_user_id || ""),
    organizerKey: String((row as any).organizer_key || ""),
    ownPrice: settings.ownPrice,
    rentalPrice: settings.rentalPrice,
    phone: settings.phone,
    facebook: settings.facebook,
    instagram: settings.instagram,
    tiktok: settings.tiktok,
  };
}

async function loadFieldRequestRows(client: SupabaseLike) {
  return client
    .from("field_requests")
    .select(
      "id,field_id,email,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
    )
    .eq("status", "active")
    .order("field_name", { ascending: true });
}

async function loadFieldsRows(client: SupabaseLike) {
  const direct = await client
    .from("fields")
    .select("id,field_name,city,phone,contact_phone,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,background_x,background_y,owner_email,owner_user_id,own_price:public_own_price,rental_price:public_rental_price,facebook,instagram,tiktok")
    .order("field_name", { ascending: true });

  // On public pages the anon client can legitimately receive zero rows because
  // fields is protected by RLS. Use a SECURITY DEFINER RPC that returns only
  // public profile columns and a non-reversible organizer grouping key.
  if (!direct.error && Array.isArray(direct.data) && direct.data.length > 0) {
    return direct;
  }

  const rpc = await client.rpc("get_public_field_directory");
  if (!rpc.error && Array.isArray(rpc.data)) {
    return { data: rpc.data, error: null };
  }

  return direct;
}

async function loadGallery(client: SupabaseLike, fieldId?: string | null) {
  if (!fieldId) return [];
  const { data, error } = await client.from("field_images").select("id,image_url,caption,sort_order,position_x,position_y").eq("field_id", fieldId).order("sort_order");
  return error || !Array.isArray(data) ? [] : data;
}

async function loadPublicGamesForField(client: SupabaseLike, fieldId?: string | null) {
  if (!fieldId) return [];

  const { data, error } = await client
    .from("games")
    .select("id,title,game_date,game_time,location,max_rental_sets,status,description,field_id")
    .eq("field_id", fieldId)
    .in("status", ["active", "postponed"])
    .gte("game_date", getPublicGamesMinDate())
    .order("game_date", { ascending: true })
    .limit(20);

  if (error || !Array.isArray(data)) return [];

  return data.filter(isGameStillPublic).slice(0, 6);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSlug = (searchParams.get("slug") || "").trim();

    let slug = rawSlug;
    try {
      slug = decodeURIComponent(rawSlug);
    } catch {
      slug = rawSlug;
    }
    const fieldId = (searchParams.get("field_id") || "").trim();
    const includeGames = searchParams.get("include_games") === "1";

    const { client, canResolveFieldId } = getPublicSupabase();
    let rows: PublicFieldRow[] = [];

    const requestResult = await loadFieldRequestRows(client);

    if (!requestResult.error && Array.isArray(requestResult.data)) {
      rows = requestResult.data as PublicFieldRow[];
    }

    const fieldsResult = await loadFieldsRows(client);
    if (!fieldsResult.error && Array.isArray(fieldsResult.data)) {
      const extraRows = (fieldsResult.data as PublicFieldRow[]).map((field) => ({ ...field, field_id: field.id, status: "active" }));
      const fieldsById = new Map(extraRows.map((row) => [String(row.field_id || row.id), row]));

      // The original approved field normally comes from field_requests. Enrich it
      // with the safe organizer_key returned by the public directory, otherwise
      // it cannot be grouped with newly created fields hidden behind RLS.
      rows = rows.map((row) => {
        const matchingField = fieldsById.get(String(row.field_id || row.id));
        return matchingField
          ? {
              ...row,
              organizer_key: (matchingField as any).organizer_key,
              owner_email: (row as any).owner_email || (matchingField as any).owner_email,
              owner_user_id: (row as any).owner_user_id || (matchingField as any).owner_user_id,
            }
          : row;
      });

      const seen = new Set(rows.map((row) => String(row.field_id || row.id)));
      rows = [...rows, ...extraRows.filter((row) => !seen.has(String(row.field_id || row.id)))];
    }

    if (slug) {
      const normalizeSlug = (value: string) => {
        try {
          return decodeURIComponent(value).trim().toLocaleLowerCase("bg-BG");
        } catch {
          return value.trim().toLocaleLowerCase("bg-BG");
        }
      };

      const requestedSlug = normalizeSlug(slug);
      const matchedRow = rows.find((row) => {
        const settings = rowToFieldSettings(row);
        return (
          normalizeSlug(settings.slug) === requestedSlug ||
          normalizeSlug(createFieldSlug(settings.name)) === requestedSlug
        );
      });

      if (!matchedRow) {
        return NextResponse.json(
          { ok: false, message: "Не намерих активно игрище с този адрес." },
          { status: 404 },
        );
      }

      const field = await toPublicField(client, matchedRow, canResolveFieldId);
      const games = includeGames ? await loadPublicGamesForField(client, field.id) : undefined;
      const images = includeGames ? await loadGallery(client, field.id) : undefined;

      // Resolve the organizer from both schemas used by BattleBooking:
      // - the original approved field stores the account in field_requests.email;
      // - extra fields store it in fields.owner_email.
      // Some older rows have a blank fields.owner_email, so we also resolve the
      // owner through field_requests.field_id instead of relying on one column.
      const ownerEmails = new Set<string>();
      const ownerUserIds = new Set<string>();
      const organizerKeys = new Set<string>();
      const addOwnerEmail = (value: unknown) => {
        const email = String(value || "").trim().toLowerCase();
        if (email) ownerEmails.add(email);
      };

      const addOwnerUserId = (value: unknown) => {
        const id = String(value || "").trim();
        if (id) ownerUserIds.add(id);
      };

      const addOrganizerKey = (value: unknown) => {
        const key = String(value || "").trim();
        if (key) organizerKeys.add(key);
      };

      addOwnerEmail((matchedRow as any).owner_email);
      addOwnerEmail((matchedRow as any).email);
      addOwnerEmail(field.ownerEmail);
      addOwnerUserId((matchedRow as any).owner_user_id);
      addOwnerUserId((field as any).ownerUserId);
      addOrganizerKey((matchedRow as any).organizer_key);
      addOrganizerKey((field as any).organizerKey);

      if (field.id) {
        const [{ data: requestOwners }, { data: fieldOwner }] = await Promise.all([
          client
            .from("field_requests")
            .select("email")
            .eq("field_id", field.id),
          client
            .from("fields")
            .select("owner_email,owner_user_id")
            .eq("id", field.id)
            .maybeSingle(),
        ]);

        if (Array.isArray(requestOwners)) {
          requestOwners.forEach((item: any) => addOwnerEmail(item?.email));
        }
        addOwnerEmail((fieldOwner as any)?.owner_email);
        addOwnerUserId((fieldOwner as any)?.owner_user_id);
      }

      const organizerRows = ownerEmails.size || ownerUserIds.size || organizerKeys.size
        ? rows.filter((row: any) => {
            const rowEmails = [row.owner_email, row.email]
              .map((value) => String(value || "").trim().toLowerCase())
              .filter(Boolean);
            const rowOwnerUserId = String(row.owner_user_id || "").trim();
            const rowOrganizerKey = String(row.organizer_key || "").trim();
            return (rowOrganizerKey && organizerKeys.has(rowOrganizerKey)) ||
              (rowOwnerUserId && ownerUserIds.has(rowOwnerUserId)) ||
              rowEmails.some((email) => ownerEmails.has(email));
          })
        : [matchedRow];

      // Always keep the currently opened field, even if it is an old row with
      // incomplete owner metadata.
      if (!organizerRows.some((row: any) => String(row.field_id || row.id) === String(field.id))) {
        organizerRows.unshift(matchedRow);
      }

      const organizerFields = await Promise.all(
        organizerRows.map((row) => toPublicField(client, row, canResolveFieldId)),
      );

      const uniqueOrganizerFields = Array.from(
        new Map(organizerFields.map((item) => [String(item.id), item])).values(),
      );

      const otherFields = uniqueOrganizerFields.filter(
        (item) => String(item.id) !== String(field.id),
      );

      return NextResponse.json(
        includeGames
          ? { ok: true, field, games, images, otherFields, organizerFields: uniqueOrganizerFields }
          : { ok: true, field, otherFields, organizerFields: uniqueOrganizerFields },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }



    const fields = await Promise.all(
      rows.map((row) => toPublicField(client, row, canResolveFieldId)),
    );

    if (fieldId) {
      const field = fields.find((item) => item.id === fieldId);

      if (!field) {
        return NextResponse.json(
          { ok: false, message: "Не намерих активно игрище за тази игра." },
          { status: 404 },
        );
      }

      const games = includeGames ? await loadPublicGamesForField(client, field.id) : undefined;

            const images = includeGames ? await loadGallery(client, field.id) : undefined;

return NextResponse.json(
        includeGames ? { ok: true, field, games, images } : { ok: true, field },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return NextResponse.json(
      { ok: true, fields },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Неочаквана грешка." },
      { status: 500 },
    );
  }
}
