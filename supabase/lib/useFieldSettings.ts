"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_FIELD_SETTINGS,
  FIELD_SETTINGS_STORAGE_KEY,
  FieldSettings,
} from "@/lib/fieldConfig";
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

async function loadPublicFieldSettings(fieldId?: string | null) {
  try {
    const params = new URLSearchParams({ t: String(Date.now()) });
    const cleanFieldId = fieldId?.trim();
    if (cleanFieldId) params.set("field_id", cleanFieldId);

    const response = await fetch(`/api/public-fields?${params.toString()}`, {
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);

    const field = cleanFieldId ? result?.field : result?.fields?.[0];

    if (!response.ok || !result?.ok || !field) return null;

    return {
      ...DEFAULT_FIELD_SETTINGS,
      ...field,
    } as FieldSettings;
  } catch {
    return null;
  }
}

export function useFieldSettings(fieldId?: string | null) {
  const [settings, setSettings] = useState<FieldSettings>(DEFAULT_FIELD_SETTINGS);

  useEffect(() => {
    let mounted = true;
    const cleanFieldId = fieldId?.trim() || "";

    async function loadSettings() {
      // Public game pages must never use localStorage or the logged-in organizer settings.
      // They must always load branding/prices/contacts from the game.field_id.
      if (cleanFieldId) {
        const publicSettings = await loadPublicFieldSettings(cleanFieldId);
        if (mounted) {
          setSettings(publicSettings || DEFAULT_FIELD_SETTINGS);
        }
        return;
      }

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
  }, [fieldId]);

  return settings;
}
