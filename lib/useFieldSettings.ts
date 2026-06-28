"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_FIELD_SETTINGS,
  FIELD_SETTINGS_STORAGE_KEY,
  FieldSettings,
} from "@/lib/fieldConfig";
import { rowToFieldSettings } from "@/lib/fieldSettings";
import { supabase } from "@/lib/supabase";

export function readFieldSettings(): FieldSettings {
  if (typeof window === "undefined") return DEFAULT_FIELD_SETTINGS;

  try {
    const saved = window.localStorage.getItem(FIELD_SETTINGS_STORAGE_KEY);
    if (!saved) return DEFAULT_FIELD_SETTINGS;
    return {
      ...DEFAULT_FIELD_SETTINGS,
      ...(JSON.parse(saved) as Partial<FieldSettings>),
    };
  } catch {
    return DEFAULT_FIELD_SETTINGS;
  }
}

const PUBLIC_FIELD_COLUMNS =
  "id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone";

async function loadPublicFieldSettings() {
  const { data, error } = await supabase
    .from("field_requests")
    .select(PUBLIC_FIELD_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return rowToFieldSettings(data);
}

export function useFieldSettings() {
  const [settings, setSettings] = useState<FieldSettings>(DEFAULT_FIELD_SETTINGS);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const localSettings = readFieldSettings();
      if (mounted) setSettings(localSettings);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        const response = await fetch("/api/field-settings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const result = await response.json().catch(() => null);

        if (mounted && response.ok && result?.ok) {
          setSettings({
            ...DEFAULT_FIELD_SETTINGS,
            ...(result.settings as Partial<FieldSettings>),
          });
          return;
        }
      }

      const publicSettings = await loadPublicFieldSettings();
      if (mounted && publicSettings) {
        setSettings({ ...DEFAULT_FIELD_SETTINGS, ...publicSettings });
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return settings;
}
