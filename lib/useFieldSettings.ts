"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_FIELD_SETTINGS,
  FIELD_SETTINGS_STORAGE_KEY,
  FieldSettings,
} from "@/lib/fieldConfig";

export function readFieldSettings(): FieldSettings {
  if (typeof window === "undefined") return DEFAULT_FIELD_SETTINGS;

  try {
    const saved = window.localStorage.getItem(FIELD_SETTINGS_STORAGE_KEY);
    if (!saved) return DEFAULT_FIELD_SETTINGS;
    return { ...DEFAULT_FIELD_SETTINGS, ...(JSON.parse(saved) as Partial<FieldSettings>) };
  } catch {
    return DEFAULT_FIELD_SETTINGS;
  }
}

export function useFieldSettings() {
  const [settings, setSettings] = useState<FieldSettings>(DEFAULT_FIELD_SETTINGS);

  useEffect(() => {
    setSettings(readFieldSettings());
  }, []);

  return settings;
}
