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

export function useFieldSettings() {
  const [settings, setSettings] = useState<FieldSettings>(DEFAULT_FIELD_SETTINGS);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const localSettings = readFieldSettings();
      if (mounted) setSettings(localSettings);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const response = await fetch("/api/field-settings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => null);

      if (!mounted || !response.ok || !result?.ok) return;

      setSettings({
        ...DEFAULT_FIELD_SETTINGS,
        ...(result.settings as Partial<FieldSettings>),
      });
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return settings;
}
