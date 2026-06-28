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

async function loadPublicFieldSettings() {
  try {
    const response = await fetch(`/api/public-fields?t=${Date.now()}`, {
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    const firstField = result?.fields?.[0];

    if (!response.ok || !result?.ok || !firstField) return null;

    return {
      ...DEFAULT_FIELD_SETTINGS,
      ...firstField,
    } as FieldSettings;
  } catch {
    return null;
  }
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
